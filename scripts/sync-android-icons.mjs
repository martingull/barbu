import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const sourceDir = resolve("src-tauri/icons/android");
const targetDir = resolve("src-tauri/gen/android/app/src/main/res");

if (!existsSync(sourceDir)) {
  throw new Error(`Android icon source directory is missing: ${sourceDir}`);
}

if (!existsSync(targetDir)) {
  console.log("Android generated resources are missing; run Tauri Android init/dev once, then sync icons.");
  process.exit(0);
}

cpSync(sourceDir, targetDir, { recursive: true, force: true });
console.log("Synced Barbu Android launcher icons.");
