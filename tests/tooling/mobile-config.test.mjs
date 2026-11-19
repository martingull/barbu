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

test("Android portrait orientation does not require portrait-capable hardware", () => {
  const feature = "/manifest/uses-feature[@*[local-name()='name']='android.hardware.screen.portrait']";
  assert.equal(execFileSync("xmllint", ["--xpath", `count(${feature})`, manifest], { encoding: "utf8" }).trim(), "1");
  assert.equal(androidAttribute(feature, "required"), "false");
});

test("Android keeps the phone launcher without advertising TV or Wear OS", () => {
  const absent = [
    "/manifest/uses-feature[@*[local-name()='name']='android.software.leanback']",
    "/manifest/uses-feature[@*[local-name()='name']='android.software.leanback_only']",
    "/manifest/uses-feature[@*[local-name()='name']='android.hardware.type.television']",
    "/manifest/uses-feature[@*[local-name()='name']='android.hardware.type.watch']",
    "/manifest/application//category[@*[local-name()='name']='android.intent.category.LEANBACK_LAUNCHER']",
    "/manifest/application//meta-data[@*[local-name()='name']='com.google.android.wearable.standalone']",
    "/manifest/application/uses-library[@*[local-name()='name']='com.google.android.wearable']",
  ];
  for (const element of absent) {
    assert.equal(execFileSync("xmllint", ["--xpath", `count(${element})`, manifest], { encoding: "utf8" }).trim(), "0", element);
  }
  assert.equal(androidAttribute("/manifest/application/activity/intent-filter/category", "name"), "android.intent.category.LAUNCHER");
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
