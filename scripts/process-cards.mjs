#!/usr/bin/env node
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const rootDir = process.cwd();
const sourceDir = path.resolve(rootDir, process.env.CARD_SOURCE_DIR ?? "public/cards/cards");
const outputDir = path.resolve(rootDir, process.env.CARD_OUTPUT_DIR ?? "public/cards/cards");
const tempDir = path.resolve(rootDir, process.env.CARD_TEMP_DIR ?? "public/cards/.cards-tmp");
const width = Number(process.env.CARD_WIDTH ?? 500);
const height = Number(process.env.CARD_HEIGHT ?? 726);
const radius = Number(process.env.CARD_RADIUS ?? 22);

function roundedMask() {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  );
}

function cardSort(a, b) {
  return a.localeCompare(b, "en");
}

async function main() {
  const entries = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => entry.name)
    .sort(cardSort);

  if (entries.length === 0) {
    throw new Error(`No PNG card files found in ${sourceDir}`);
  }

  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const mask = roundedMask();

  for (const entry of entries) {
    const inputPath = path.join(sourceDir, entry);
    const outputPath = path.join(tempDir, entry);

    await sharp(inputPath)
      .resize(width, height, { fit: "fill" })
      .ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
  }

  await rm(outputDir, { recursive: true, force: true });
  await rename(tempDir, outputDir);

  console.log(`Processed ${entries.length} cards`);
  console.log(`Source: ${path.relative(rootDir, sourceDir)}`);
  console.log(`Output: ${path.relative(rootDir, outputDir)}`);
  console.log(`Size: ${width}x${height}, radius ${radius}px`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
