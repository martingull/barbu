import { cpSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import "./sync-android-icons.mjs";

const { identifier } = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const source = resolve("src-tauri/android/MainActivity.kt");
const target = resolve("src-tauri/gen/android/app/src/main/java", identifier.replaceAll(".", "/"), "MainActivity.kt");
if (!existsSync(target)) {
  throw new Error("Generate the Android project with Tauri Android init before preparing it.");
}
if (!readFileSync(source, "utf8").startsWith(`package ${identifier}\n`)) {
  throw new Error("Android activity package must match the Tauri identifier.");
}
cpSync(source, target);
console.log("Synced Barbu Android activity and system-bar handling.");
