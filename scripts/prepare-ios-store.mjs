import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apple = resolve(root, "src-tauri/gen/apple");
const buildNumber = process.argv[2];
if (!/^[1-9][0-9]{0,3}$/.test(buildNumber ?? "")) {
  throw new Error("Supply an unused App Store build number (1-9999).");
}

const config = JSON.parse(readFileSync(resolve(root, "src-tauri/tauri.conf.json"), "utf8"));
const notices = readFileSync(resolve(root, "public/THIRD_PARTY_LICENSES.txt"), "utf8");
for (const lockfile of ["Cargo.lock", "package-lock.json"]) {
  const hash = createHash("sha256").update(readFileSync(resolve(root, lockfile))).digest("hex");
  if (!notices.includes(`${lockfile} SHA256: ${hash}`)) {
    throw new Error("Dependency notices are stale. Run node scripts/generate-ios-notices.mjs before release.");
  }
}
// Keep Tauri's generated project as the template, including its Rust build phase.
const project = JSON.parse(execFileSync("ruby", [
  "-rjson", "-ryaml", "-e", "puts JSON.generate(YAML.load_file(ARGV[0]))",
  resolve(apple, "project.yml"),
], { encoding: "utf8" }));
const targets = Object.values(project.targets).filter(
  (target) => target.platform === "iOS" && target.type === "application",
);
if (targets.length !== 1) throw new Error("Expected one generated iOS application target.");
const target = targets[0];
// Existing debug/release archives must be linked, not copied as app resources.
for (const source of target.sources) {
  if (source.path === "Externals") source.buildPhase = "none";
}
target.settings.base.TARGETED_DEVICE_FAMILY = "1";
target.settings.base.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
target.info.properties.CFBundleShortVersionString = config.version;
target.info.properties.CFBundleVersion = buildNumber;

const manifest = resolve(apple, "PrivacyInfo.xcprivacy");
copyFileSync(resolve(root, "src-tauri/ios/PrivacyInfo.xcprivacy"), manifest);
target.sources.push({ path: "PrivacyInfo.xcprivacy", buildPhase: "resources" });
execFileSync("plutil", ["-lint", manifest], { stdio: "inherit" });
const spec = resolve(apple, "project.appstore.json");
writeFileSync(spec, JSON.stringify(project, null, 2) + "\n");
execFileSync("xcodegen", ["generate", "--spec", spec, "--project", apple], { stdio: "inherit" });

const iconDir = resolve(apple, "Assets.xcassets/AppIcon.appiconset");
const icons = JSON.parse(readFileSync(resolve(iconDir, "Contents.json"), "utf8"));
for (const filename of new Set(icons.images.map((icon) => icon.filename).filter(Boolean))) {
  const path = resolve(iconDir, filename);
  const pixels = await sharp(path).flatten({ background: "#ffffff" }).png().toBuffer();
  writeFileSync(path, pixels);
}

writeFileSync(resolve(apple, "appstore-config.json"), JSON.stringify({
  bundle: { iOS: { bundleVersion: buildNumber } },
}, null, 2) + "\n");
console.log(`Prepared iPhone-only Barbu ${config.version} (${buildNumber}) for App Store distribution.`);
