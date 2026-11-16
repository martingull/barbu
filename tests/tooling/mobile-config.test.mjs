import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const manifest = fileURLToPath(new URL("../../src-tauri/android/AndroidManifest.xml", import.meta.url));
const plist = fileURLToPath(new URL("../../src-tauri/Info.ios.plist", import.meta.url));
const androidAttribute = (element, attribute) => execFileSync("xmllint", [
  "--xpath", `string(${element}/@*[local-name()='${attribute}' and namespace-uri()='http://schemas.android.com/apk/res/android'])`, manifest,
], { encoding: "utf8" }).trim();

test("Android requests upright portrait and declares the game category", () => {
  assert.equal(androidAttribute("/manifest/application/activity", "screenOrientation"), "portrait");
  assert.equal(androidAttribute("/manifest/application", "appCategory"), "game");
  assert.equal(androidAttribute("/manifest/application/activity", "launchMode"), "singleTop");
  assert.equal(execFileSync("xmllint", ["--xpath", "count(/manifest/application/activity)", manifest], { encoding: "utf8" }).trim(), "1");
});

test("iOS orientation overrides exclude landscape for phones and compatibility mode", () => {
  for (const key of ["UISupportedInterfaceOrientations", "UISupportedInterfaceOrientations~ipad"]) {
    const array = `/plist/dict/key[.='${key}']/following-sibling::*[1]`;
    assert.equal(execFileSync("xmllint", ["--xpath", `count(${array}/string)`, plist], { encoding: "utf8" }).trim(), "1");
    assert.equal(execFileSync("xmllint", ["--xpath", `string(${array}/string)`, plist], { encoding: "utf8" }).trim(), "UIInterfaceOrientationPortrait");
  }
});

test("Canasta preview has separate assets and internal-only distribution", () => {
  const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const normal = read("../../src-tauri/tauri.conf.json");
  const preview = read("../../src-tauri/tauri.canasta-preview.conf.json");
  assert.equal(normal.build.beforeBuildCommand, "npm run build");
  assert.equal(normal.build.frontendDist, "../dist");
  assert.equal(preview.build.beforeBuildCommand, "npm run build:ios-canasta-preview-assets");
  assert.equal(preview.build.frontendDist, "../dist-canasta-preview");
  assert.equal(preview.plugins["barbu-purchases"].purchasesEnabled, false);
  const options = fileURLToPath(new URL("../../src-tauri/ios/ExportOptions.canasta-preview.plist", import.meta.url));
  assert.equal(execFileSync("xmllint", ["--xpath",
    "name(/plist/dict/key[.='testFlightInternalTestingOnly']/following-sibling::*[1])", options,
  ], { encoding: "utf8" }).trim(), "true");
});
