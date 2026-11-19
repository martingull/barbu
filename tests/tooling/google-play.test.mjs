import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyBillingConfig, inspect, inspectMonetization, main, packageName, planUpload, submitUpload, validateCandidate } from "../../scripts/google-play.mjs";

const bytes = Buffer.from("signed bundle fixture");
const record = { package: packageName, versionName: "1.0.6", versionCode: 1000007, bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"), sourceFingerprint: "fingerprint",
  signatureVerified: true, bundletoolValidation: true, matchingR8Mapping: true, bundleNativeAlignment: "PAGE_ALIGNMENT_16K",
  optionalPortraitFeature: true, noTvOrWearDeclarations: true };
const config = { identifier: packageName, version: "1.0.6", bundle: { android: { versionCode: 1000007 } } };
const snapshot = () => ({ highestVisibleVersionCode: 1000006,
  tracks: [{ track: "alpha", releases: [{ versionCodes: ["1000006"], status: "completed" }] }, { track: "production" }],
  releaseStates: [{ track: "alpha", releases: [{ releaseLifecycleState: "RELEASE_LIFECYCLE_STATE_PUBLISHED" }] }] });
const plan = () => planUpload(snapshot(), record, "Clearer learning.", "1.0.6 testing");

test("candidate must match verified bytes, source, package, version and package checks", () => {
  validateCandidate(record, bytes, config, "fingerprint", "Notes");
  for (const change of [{ package: "other.app" }, { versionName: "old" }, { versionCode: 1000006 },
    { bytes: 0 }, { sha256: "invalid" }, { sourceFingerprint: "old" }, { signatureVerified: false },
    { bundletoolValidation: false }, { matchingR8Mapping: false }, { bundleNativeAlignment: "PAGE_ALIGNMENT_4K" },
    { optionalPortraitFeature: false }, { optionalPortraitFeature: undefined },
    { noTvOrWearDeclarations: false }, { noTvOrWearDeclarations: undefined }]) {
    assert.throws(() => validateCandidate({ ...record, ...change }, bytes, config, "fingerprint", "Notes"));
  }
  assert.throws(() => validateCandidate(record, bytes, config, "fingerprint", " "));
  assert.throws(() => validateCandidate(record, bytes, config, "fingerprint", "x".repeat(501)));
});

test("billing override cannot alter the release identity or configure other plugins", () => {
  const base = { ...config, plugins: { other: { retained: true }, "barbu-purchases": { androidApiKey: "", purchasesEnabled: false } } };
  const override = { plugins: { "barbu-purchases": { androidApiKey: "goog_public_test_fixture", purchasesEnabled: true } } };
  const effective = applyBillingConfig(base, override);
  assert.equal(base.plugins["barbu-purchases"].purchasesEnabled, false);
  assert.equal(effective.plugins["barbu-purchases"].purchasesEnabled, true);
  assert.deepEqual(effective.plugins.other, base.plugins.other);
  assert.equal(effective.version, base.version);
  assert.equal(effective.bundle.android.versionCode, base.bundle.android.versionCode);
  for (const invalid of [{ ...override, version: "other" }, { ...override, bundle: {} },
    { plugins: { ...override.plugins, other: {} } },
    { plugins: { "barbu-purchases": { androidApiKey: "secret_key", purchasesEnabled: true } } },
    { plugins: { "barbu-purchases": { androidApiKey: "goog_fixture", purchasesEnabled: false } } },
    { plugins: { "barbu-purchases": { ...override.plugins["barbu-purchases"], unexpected: true } } }]) {
    assert.throws(() => applyBillingConfig(base, invalid));
  }
});

test("billing and standard candidates cannot be verified in the wrong mode", () => {
  const billingConfig = { ...config, plugins: { "barbu-purchases": { purchasesEnabled: true } } };
  validateCandidate({ ...record, billingEnabled: true }, bytes, billingConfig, "fingerprint", "Notes");
  assert.throws(() => validateCandidate(record, bytes, billingConfig, "fingerprint", "Notes"), /Billing mode/);
  assert.throws(() => validateCandidate({ ...record, billingEnabled: true }, bytes, config, "fingerprint", "Notes"), /Billing mode/);
});

test("billing fingerprints include the ignored override without changing standard fingerprints", () => {
  const dir = mkdtempSync(join(tmpdir(), "barbu-billing-fingerprint-"));
  try {
    execFileSync("git", ["init", "--quiet", dir]);
    mkdirSync(join(dir, "src-tauri"));
    writeFileSync(join(dir, ".gitignore"), "/src-tauri/tauri.billing.local.json\n");
    writeFileSync(join(dir, "src-tauri/tauri.conf.json"), JSON.stringify(config));
    const file = join(dir, "src-tauri/tauri.billing.local.json");
    const script = `import { sourceFingerprint } from ${JSON.stringify(new URL("../../scripts/google-play.mjs", import.meta.url).href)};
      console.log(JSON.stringify({ standard: sourceFingerprint(), billing: sourceFingerprint(true) }));`;
    const fingerprint = () => JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: dir, encoding: "utf8" }));
    writeFileSync(file, JSON.stringify({ plugins: { "barbu-purchases": { androidApiKey: "goog_fixture", purchasesEnabled: true } } }));
    const first = fingerprint();
    writeFileSync(file, JSON.stringify({ plugins: { "barbu-purchases": { androidApiKey: "goog_changed", purchasesEnabled: true } } }));
    const second = fingerprint();
    assert.notEqual(first.standard, first.billing);
    assert.equal(first.standard, second.standard);
    assert.notEqual(first.billing, second.billing);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("preview only targets existing alpha and requires an unused version code", () => {
  assert.equal(plan().track, "alpha");
  assert.equal(plan().release.releaseNotes[0].language, "en-GB");
  assert.throws(() => planUpload({ ...snapshot(), tracks: [{ track: "production" }] }, record, "Notes", "Name"));
  assert.throws(() => planUpload({ ...snapshot(), highestVisibleVersionCode: 1000007 }, record, "Notes", "Name"));
  const state = snapshot();
  state.tracks[0].releases[0].status = "draft";
  assert.throws(() => planUpload(state, record, "Notes", "Name"));
  state.tracks[0].releases[0].status = "completed";
  state.tracks[0].releases.push(state.tracks[0].releases[0]);
  assert.throws(() => planUpload(state, record, "Notes", "Name"));
});

test("pending reviews and unpublished releases block another submission", () => {
  for (const state of ["IN_REVIEW", "APPROVED_NOT_PUBLISHED", "NOT_APPROVED", "DRAFT", "NOT_SENT_FOR_REVIEW", "UNSPECIFIED"]) {
    const current = snapshot();
    current.releaseStates[0].releases[0].releaseLifecycleState = `RELEASE_LIFECYCLE_STATE_${state}`;
    assert.throws(() => planUpload(current, record, "Notes", "Name"));
  }
});

function mockClient({ failAt, uploaded = { versionCode: 1000007, sha256: record.sha256 }, consumed = false } = {}) {
  const calls = [];
  const client = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (failAt && path.includes(failAt)) throw new Error("Simulated API failure");
    if (path === "/edits") return { id: "inspection" };
    if (options.media) return uploaded;
    if (path.endsWith("/bundles")) return { bundles: [{ versionCode: consumed ? 1000007 : 1000006 }] };
    if (path.endsWith("/tracks")) return { tracks: snapshot().tracks };
    if (path.endsWith("/tracks/alpha")) return snapshot().tracks[0];
    if (path.endsWith("/releases")) return { releases: snapshot().releaseStates[0].releases };
    return {};
  };
  return { client, calls };
}

test("inspection includes review lifecycle and discards its edit without committing", async () => {
  const { client, calls } = mockClient();
  const result = await inspect(client);
  assert.equal(result.highestVisibleVersionCode, 1000006);
  assert.equal(result.releaseStates.length, 2);
  assert.equal(calls.at(-1).method, "DELETE");
  assert(!calls.some(call => call.path.includes(":commit") || call.media || call.method === "PUT"));
});

test("inspection cleanup runs even when a read fails", async () => {
  const { client, calls } = mockClient({ failAt: "/bundles" });
  await assert.rejects(inspect(client));
  assert.equal(calls.at(-1).method, "DELETE");
});

test("submission validates upload hash then updates only alpha and refuses to cancel reviews", async () => {
  const { client, calls } = mockClient();
  await submitUpload(client, plan(), bytes, () => {});
  assert.deepEqual(calls.filter(call => call.method === "PUT").map(call => call.path), ["/edits/inspection/tracks/alpha"]);
  assert.equal(calls.at(-2).path, "/edits/inspection:validate");
  assert.equal(calls.at(-1).path, "/edits/inspection:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW");
  assert(!calls.some(call => call.path.includes("testers") || (call.path.includes("production") && call.method)));
});

test("replacement requires the exact explicitly approved unsent alpha version", () => {
  const current = snapshot();
  current.releaseStates[0].releases = [{ activeArtifacts: [{ versionCode: 1000006 }], releaseLifecycleState: "RELEASE_LIFECYCLE_STATE_NOT_SENT_FOR_REVIEW" }];
  assert.equal(planUpload(current, record, "Notes", "Name", "1000006").replaceUnsent, "1000006");
  assert.throws(() => planUpload(current, record, "Notes", "Name", "1000005"));
  current.releaseStates[0].releases[0].releaseLifecycleState = "RELEASE_LIFECYCLE_STATE_IN_REVIEW";
  assert.throws(() => planUpload(current, record, "Notes", "Name", "1000006"));
  current.releaseStates[0].track = "production";
  current.releaseStates[0].releases[0].releaseLifecycleState = "RELEASE_LIFECYCLE_STATE_NOT_SENT_FOR_REVIEW";
  assert.throws(() => planUpload(current, record, "Notes", "Name", "1000006"));
});

test("production and changed files are rejected before creating an upload edit", async () => {
  const { client, calls } = mockClient();
  await assert.rejects(submitUpload(client, { ...plan(), track: "production" }, bytes));
  await assert.rejects(submitUpload(client, plan(), Buffer.from("changed")));
  assert.equal(calls.length, 0);
});

test("upload mismatch or validation failure never commits and cleans up", async () => {
  for (const options of [{ uploaded: { versionCode: 1000008, sha256: record.sha256 } },
    { uploaded: { versionCode: 1000007, sha256: "wrong" } }, { failAt: ":validate" }, { consumed: true }]) {
    const { client, calls } = mockClient(options);
    await assert.rejects(submitUpload(client, plan(), bytes, () => {}));
    assert.equal(calls.at(-1).method, "DELETE");
    assert(!calls.some(call => call.path.includes(":commit")));
  }
});

test("failed commit is not retried with weaker review protections", async () => {
  const { client, calls } = mockClient({ failAt: ":commit" });
  await assert.rejects(submitUpload(client, plan(), bytes, () => {}));
  assert.equal(calls.filter(call => call.path.includes(":commit")).length, 1);
  assert.equal(calls.at(-1).method, "DELETE");
});

test("release-list quota failure stops before upload and cleans up the edit", async () => {
  const { client, calls } = mockClient({ failAt: "/releases" });
  const messages = [];
  await assert.rejects(submitUpload(client, plan(), bytes, message => messages.push(message)));
  assert(!calls.some(call => call.media || call.method === "PUT" || call.path.includes(":commit")));
  assert.equal(calls.at(-1).method, "DELETE");
  assert(messages.at(-1).includes("No bundle upload"));
});

test("invalid CLI options fail before authentication", async () => {
  for (const args of [["production"], ["status", "--submit"], ["status", "--billing"], ["monetization", "--submit"],
    ["fingerprint", "--billing", "--json"], ["upload"], ["upload", "--track", "production"]]) {
    await assert.rejects(main(args));
  }
});

test("monetization inspection only reads products and follows pagination", async () => {
  const calls = [];
  const result = await inspectMonetization(async (path, options) => {
    assert.equal(options, undefined);
    calls.push(path);
    if (path.startsWith("/oneTimeProducts")) return { oneTimeProducts: [{ productId: "pack" }] };
    if (path.includes("pageToken=")) return { subscriptions: [{ productId: "second", basePlans: [{ basePlanId: "annual", state: "ACTIVE" }] }] };
    return { subscriptions: [{ productId: "premium", basePlans: [{ basePlanId: "monthly", state: "DRAFT" }] }], nextPageToken: "next&token" };
  });
  assert.equal(calls.length, 3);
  assert(calls[1].includes("pageToken=next%26token"));
  assert.equal(result.subscriptions.length, 2);
  assert.equal(result.subscriptions[0].basePlans[0].state, "DRAFT");
  assert.equal(result.subscriptions[1].basePlans[0].state, "ACTIVE");
  assert.deepEqual(result.oneTimeProducts, [{ productId: "pack" }]);
  assert(result.paymentsProfile.startsWith("Not checked"));
});

test("empty products are distinct from API failures or invalid pagination", async () => {
  const empty = await inspectMonetization(async () => ({}));
  assert.deepEqual(empty.subscriptions, []);
  assert.deepEqual(empty.oneTimeProducts, []);
  await assert.rejects(inspectMonetization(async () => { throw new Error("Permission denied"); }), /Permission denied/);
  await assert.rejects(inspectMonetization(async () => ({ nextPageToken: "repeated" })), /repeated/);
  await assert.rejects(inspectMonetization(async () => ({ subscriptions: {} })), /Invalid subscriptions/);
});
