import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

export const packageName = "com.martin.barbu";
export const testingTrack = "alpha";
const serviceAccount = "barbu-release@plenary-magpie-170009.iam.gserviceaccount.com";
const apiRoot = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const appPath = `/applications/${packageName}`;
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const sourcePaths = ["src", "src-tauri", "public", "content", "package.json", "package-lock.json", "Cargo.toml", "Cargo.lock", "vite.config.ts"];

export function sourceFingerprint() {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...sourcePaths], { encoding: "utf8" })
    .split("\0").filter(file => file && existsSync(file));
  return sha256(JSON.stringify([...new Set(files)].sort().map(file => [file, sha256(readFileSync(file))])));
}

async function jsonRequest(url, options) {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(120_000), ...options });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`Google API returned non-JSON content (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Google API ${options.method ?? "GET"} ${new URL(url).pathname} HTTP ${response.status}: ${data.error?.message ?? response.statusText}`);
  return data;
}

export async function authenticate() {
  // Tokens stay in memory; never print them or create a service-account key.
  const userToken = execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
  const result = await jsonRequest(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`, {
    method: "POST", headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/androidpublisher"], lifetime: "3600s" })
  });
  assert(result.accessToken, "Google did not return an access token.");
  return result.accessToken;
}

export function createClient(token) {
  return async (path, { method = "GET", body, media } = {}) => {
    const root = media ? apiRoot.replace("/androidpublisher/v3", "/upload/androidpublisher/v3") : apiRoot;
    return jsonRequest(root + appPath + path, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": media ? "application/octet-stream" : "application/json" },
      body: media ?? (body === undefined ? undefined : JSON.stringify(body))
    });
  };
}

export async function inspect(client) {
  const edit = await client("/edits", { method: "POST", body: {} });
  try {
    const { tracks = [] } = await client(`/edits/${edit.id}/tracks`);
    const { bundles = [] } = await client(`/edits/${edit.id}/bundles`);
    const releaseStates = [];
    for (const track of tracks) {
      const result = await client(`/tracks/${encodeURIComponent(track.track)}/releases`);
      releaseStates.push({ track: track.track, releases: result.releases ?? [] });
    }
    const codes = [0, ...bundles.map(bundle => Number(bundle.versionCode)),
      ...tracks.flatMap(track => (track.releases ?? []).flatMap(release => (release.versionCodes ?? []).map(Number))),
      ...releaseStates.flatMap(track => track.releases.flatMap(release => (release.activeArtifacts ?? []).map(artifact => Number(artifact.versionCode))))];
    return { packageName, highestVisibleVersionCode: Math.max(...codes), tracks, releaseStates, bundles };
  } finally {
    await client(`/edits/${edit.id}`, { method: "DELETE" });
  }
}

export function validateCandidate(record, bytes, config, fingerprint, notes) {
  assert.equal(record.package, packageName, "Wrong package in verification record.");
  assert.equal(config.identifier, packageName, "Wrong package in Tauri configuration.");
  assert.equal(record.versionName, config.version, "Bundle version differs from current configuration.");
  assert.equal(record.versionCode, config.bundle.android.versionCode, "Bundle code differs from current configuration.");
  assert(Number.isSafeInteger(record.versionCode) && record.versionCode > 0, "Invalid version code.");
  assert.equal(record.sha256, sha256(bytes), "Bundle checksum differs from verification record.");
  assert.equal(record.bytes, bytes.length, "Bundle size differs from verification record.");
  assert.equal(typeof record.sourceFingerprint, "string", "Missing production-source fingerprint. Rebuild and verify it.");
  assert.equal(record.sourceFingerprint, fingerprint, "Production source changed since packaging. Rebuild and verify it.");
  for (const key of ["signatureVerified", "bundletoolValidation", "matchingR8Mapping"]) {
    assert.equal(record[key], true, `Missing successful package check: ${key}`);
  }
  assert.equal(record.bundleNativeAlignment, "PAGE_ALIGNMENT_16K", "Missing 16 KB bundle alignment check.");
  assert(notes.trim() && [...notes.trim()].length <= 500, "Release notes must contain 1-500 characters.");
}

export function planUpload(snapshot, record, notes, name, replaceUnsent) {
  const track = snapshot.tracks.find(item => item.track === testingTrack);
  assert(track, "Existing closed-testing track alpha was not found. No track will be created.");
  assert((track.releases ?? []).length <= 1, "Multiple active test releases need manual review.");
  assert((track.releases ?? []).every(release => release.status === "completed"), "Existing test release is unfinished; resolve it in Play Console first.");
  assert(record.versionCode > snapshot.highestVisibleVersionCode, `Version code must exceed ${snapshot.highestVisibleVersionCode}.`);
  const pending = snapshot.releaseStates.flatMap(item => item.releases.map(release => ({ ...release, track: item.track })))
    .filter(release => release.releaseLifecycleState !== "RELEASE_LIFECYCLE_STATE_PUBLISHED");
  if (replaceUnsent) {
    assert.equal(pending.length, 1, "Replacement requires exactly one pending release.");
    assert.equal(pending[0].track, testingTrack, "Only an unsent closed-test release can be replaced.");
    assert.equal(pending[0].releaseLifecycleState, "RELEASE_LIFECYCLE_STATE_NOT_SENT_FOR_REVIEW", "Only a release not sent for review can be replaced.");
    assert.deepEqual(pending[0].activeArtifacts?.map(artifact => String(artifact.versionCode)), [replaceUnsent], "Pending release does not match --replace-unsent.");
    pending.pop();
  }
  assert.equal(pending.length, 0, "Pending or unknown release state; resolve it in Play Console before another submission.");
  return releasePlan(record, notes, name, replaceUnsent);
}

function releasePlan(record, notes, name, replaceUnsent) {
  assert(name.trim().length > 0 && name.length <= 50, "Release name must contain 1-50 characters.");
  return { packageName, track: testingTrack, sha256: record.sha256, bytes: record.bytes, replaceUnsent,
    release: { name, versionCodes: [String(record.versionCode)], status: "completed",
      releaseNotes: [{ language: "en-GB", text: notes.trim() }] } };
}

export async function submitUpload(client, plan, bytes, log = console.log) {
  assert.equal(plan.packageName, packageName);
  assert.equal(plan.track, testingTrack, "Only the existing closed-testing track is supported.");
  assert.equal(sha256(bytes), plan.sha256, "Bundle changed after the preview.");
  const edit = await client("/edits", { method: "POST", body: {} });
  let committed = false;
  let uploadStarted = false;
  try {
    // Check again inside the upload transaction so the earlier preview cannot hide a newer release.
    const { bundles = [] } = await client(`/edits/${edit.id}/bundles`);
    assert(bundles.every(bundle => Number(bundle.versionCode) < Number(plan.release.versionCodes[0])), "Version code is no longer unused; refresh status.");
    const track = await client(`/edits/${edit.id}/tracks/${testingTrack}`);
    assert((track.releases ?? []).length <= 1 && (track.releases ?? []).every(release => release.status === "completed"), "Testing track changed; inspect it before proceeding.");
    const tracks = await client(`/edits/${edit.id}/tracks`);
    const releaseStates = [];
    for (const current of tracks.tracks ?? []) {
      const state = await client(`/tracks/${encodeURIComponent(current.track)}/releases`);
      releaseStates.push({ track: current.track, releases: state.releases ?? [] });
    }
    planUpload({ tracks: tracks.tracks ?? [], releaseStates, highestVisibleVersionCode: Math.max(0, ...bundles.map(bundle => Number(bundle.versionCode))) },
      { versionCode: Number(plan.release.versionCodes[0]), sha256: plan.sha256, bytes: plan.bytes }, plan.release.releaseNotes[0].text, plan.release.name, plan.replaceUnsent);
    log(JSON.stringify({ mode: "submit-closed-testing", ...plan }, null, 2));
    log(`Uploading ${plan.bytes} bytes to ${testingTrack}; edit ${edit.id}.`);
    uploadStarted = true;
    const uploaded = await client(`/edits/${edit.id}/bundles?uploadType=media`, { method: "POST", media: bytes });
    assert.equal(String(uploaded.versionCode), plan.release.versionCodes[0], "Google returned an unexpected version code.");
    assert.equal(uploaded.sha256, plan.sha256, "Google returned an unexpected checksum.");
    await client(`/edits/${edit.id}/tracks/${testingTrack}`, { method: "PUT", body: { track: testingTrack, releases: [plan.release] } });
    await client(`/edits/${edit.id}:validate`, { method: "POST" });
    log("Bundle validated. Submitting closed-test changes; an existing review will not be cancelled.");
    await client(`/edits/${edit.id}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`, { method: "POST" });
    committed = true;
    log("Closed-test edit committed. Run task play:status to check review/publishing state; this is not a production launch.");
  } finally {
    if (!committed) {
      try { await client(`/edits/${edit.id}`, { method: "DELETE" }); }
      catch { log(`Could not confirm cleanup of edit ${edit.id}. Check Play Console before retrying.`); }
      log(uploadStarted
        ? "Submission did not complete cleanly. Do not retry blindly: check status and consumed version codes first."
        : "Pre-upload checks failed. No bundle upload or release update was attempted.");
    }
  }
}

export async function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    bundle: { type: "string" }, verification: { type: "string" }, notes: { type: "string" }, name: { type: "string" },
    "replace-unsent": { type: "string" }, submit: { type: "boolean", default: false }, json: { type: "boolean", default: false }
  } });
  const command = positionals[0];
  assert(positionals.length === 1 && ["status", "upload", "fingerprint"].includes(command), "Usage: google-play.mjs status [--json] | fingerprint | upload --bundle PATH --verification PATH --notes PATH --name NAME [--replace-unsent CODE] [--submit]");
  if (command === "fingerprint") {
    assert(args.length === 1, "Fingerprint accepts no options.");
    console.log(sourceFingerprint());
    return;
  }
  if (command === "status") {
    assert(!values.submit && !values.bundle && !values.verification && !values.notes && !values.name && !values["replace-unsent"], "Status does not accept upload options.");
    const snapshot = await inspect(createClient(await authenticate()));
    if (values.json) console.log(JSON.stringify(snapshot, null, 2));
    else {
      console.log(`${packageName}: highest visible version code ${snapshot.highestVisibleVersionCode}`);
      for (const track of snapshot.releaseStates) {
        if (!track.releases.length) console.log(`${track.track}: no releases`);
        for (const release of track.releases) console.log(`${track.track}: ${release.releaseName} [${(release.activeArtifacts ?? []).map(item => item.versionCode).join(", ")}] ${release.releaseLifecycleState.replace("RELEASE_LIFECYCLE_STATE_", "")}`);
      }
    }
    return;
  }
  assert(values.bundle && values.verification && values.notes && values.name, "Upload needs --bundle, --verification, --notes and --name. Without --submit it only previews.");
  const bytes = readFileSync(values.bundle);
  const record = JSON.parse(readFileSync(values.verification, "utf8"));
  const notes = readFileSync(values.notes, "utf8");
  const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  validateCandidate(record, bytes, config, sourceFingerprint(), notes);
  assert(record.sourceInputs && Object.keys(record.sourceInputs).length, "Missing build-input verification.");
  for (const [file, hash] of Object.entries(record.sourceInputs)) assert.equal(sha256(readFileSync(file)), hash, `Build input changed: ${file}`);
  const client = createClient(await authenticate());
  if (values.submit) {
    await submitUpload(client, releasePlan(record, notes, values.name, values["replace-unsent"]), bytes);
  } else {
    const plan = planUpload(await inspect(client), record, notes, values.name, values["replace-unsent"]);
    console.log(JSON.stringify({ mode: "preview-only", ...plan }, null, 2));
    console.log("Preview only. No bundle uploaded and no changes committed. Add --submit only after approving this release.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
