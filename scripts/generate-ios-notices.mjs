import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const licenseName = /^(licen[sc]e|copying|notice|copyright|unlicense)([._-]|$)/i;
const texts = new Map();
const upstreamCache = new Map();

function localNotices(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && licenseName.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => readFileSync(join(directory, entry.name), "utf8").trim());
}

function download(url) {
  return execFileSync("curl", ["--fail", "--silent", "--show-error", "--location", "--max-time", "30", url],
    { encoding: "utf8", maxBuffer: 5e6 });
}

function upstreamNotices(repositoryUrl, revision) {
  const repository = repositoryUrl?.replace(/^git\+/, "").replace(/\/+$/, "").replace(/\.git$/, "");
  if (!repository?.startsWith("https://github.com/") || !revision) throw new Error(`Review missing notices: ${repositoryUrl}`);
  const path = repository.slice("https://github.com/".length);
  const key = `${path}/${revision}`;
  if (!upstreamCache.has(key)) {
    // Some published crates omit workspace-level licenses; use their exact source revision.
    const entries = JSON.parse(download(`https://api.github.com/repos/${path}/contents?ref=${revision}`));
    const files = entries.filter(entry => entry.type === "file" && licenseName.test(entry.name));
    upstreamCache.set(key, files.sort((a, b) => a.name.localeCompare(b.name))
      .map(entry => download(entry.download_url).trim()));
  }
  return upstreamCache.get(key);
}

function entry(name, version, license, source, notices) {
  if (!license || !notices.length) throw new Error(`Review missing license text: ${name}@${version}`);
  const references = notices.map(text => {
    const key = createHash("sha256").update(text).digest("hex").slice(0, 16);
    texts.set(key, text);
    return key;
  });
  return `${name}@${version}\nLicense: ${license}\nSource: ${source}\nLicense texts: ${references.join(", ")}\n`;
}

const metadata = JSON.parse(execFileSync("cargo", ["metadata", "--locked", "--offline",
  "--format-version", "1", "--filter-platform", "aarch64-apple-ios"], { cwd: root, maxBuffer: 20e6 }));
const resolved = new Set(metadata.resolve.nodes.map(node => node.id));
const entries = [];
for (const pkg of metadata.packages.filter(pkg => pkg.source && resolved.has(pkg.id))) {
  const local = localNotices(dirname(pkg.manifest_path));
  const revision = local.length ? null : JSON.parse(readFileSync(join(dirname(pkg.manifest_path), ".cargo_vcs_info.json"), "utf8")).git.sha1;
  let notices = local.length ? local : upstreamNotices(pkg.repository, revision);
  if (!notices.length && pkg.name === "selectors" && pkg.license === "MPL-2.0") {
    // Stylo declares MPL in source headers rather than shipping a separate license file.
    const cssparser = metadata.packages.find(pkg => pkg.name === "cssparser" && pkg.license === "MPL-2.0");
    notices = [readFileSync(join(dirname(pkg.manifest_path), "lib.rs"), "utf8").split("\n\n")[0],
      readFileSync(join(dirname(cssparser.manifest_path), "LICENSE"), "utf8").trim()];
  }
  entries.push(entry(pkg.name, pkg.version, pkg.license,
    `https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download`,
    notices));
}
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev || pkg.optional) continue;
  const name = path.replace(/^node_modules\//, "");
  let notices = localNotices(join(root, path));
  if (!notices.length) {
    const published = JSON.parse(download(`https://registry.npmjs.org/${encodeURIComponent(name)}/${pkg.version}`));
    if (pkg.license === "MIT" &&
        ["is-reference@3.0.3", "locate-character@3.0.0"].includes(`${name}@${pkg.version}`)) {
      // These releases declare MIT in their README but omit the packaged license file.
      const terms = readFileSync(join(root, "node_modules/svelte/LICENSE.md"), "utf8");
      const grant = terms.indexOf("Permission is hereby granted");
      if (grant < 0) throw new Error("Could not locate the standard MIT terms.");
      notices = [`${name}: MIT, as declared in the package README.\nAuthor: ${published.author.name}\n\n${terms.slice(grant).trim()}`];
    } else {
      notices = upstreamNotices(published.repository.url, published.gitHead);
    }
  }
  entries.push(entry(name, pkg.version, pkg.license, pkg.resolved, notices));
}

const header = `Barbu - Third-Party Software Notices

Generated from Cargo.lock and package-lock.json by scripts/generate-ios-notices.mjs.
Cargo.lock SHA256: ${createHash("sha256").update(readFileSync(join(root, "Cargo.lock"))).digest("hex")}
package-lock.json SHA256: ${createHash("sha256").update(readFileSync(join(root, "package-lock.json"))).digest("hex")}
Scope: the resolved iOS Rust graph (including build tools) and non-development npm dependencies.
This is a conservative inventory, not a claim that every listed package is linked into the executable.

The upstream packages are used without source modifications. Their original licenses apply.
Source downloads for the exact versions, including MPL-2.0 components, are listed below.
Barbu's proprietary terms do not limit your rights under these third-party licenses.

`;
writeFileSync(join(root, "public/THIRD_PARTY_LICENSES.txt"), header + entries.join("\n") +
  "\nFULL LICENSE AND NOTICE TEXTS\n\n" +
  [...texts].map(([key, text]) => `===== ${key} =====\n${text}\n`).join("\n"));
console.log(`Wrote ${entries.length} package notices and ${texts.size} distinct license/notice texts.`);
