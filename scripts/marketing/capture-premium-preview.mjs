import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

// Browser scene selection only; never simulate checkout or label these native captures.
const baseURL = new URL(process.argv[2] ?? "http://127.0.0.1:1422");
assert(["127.0.0.1", "localhost"].includes(baseURL.hostname), "Use a local Canasta development preview.");
const output = resolve("release/google-play/premium-launch-preview");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 393, height: 805 }, deviceScaleFactor: 3 });
  const errors = [];
  const files = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("barbu.practiceSeed.v1", "3"));
  async function capture(file, scene) {
    await expect.poll(() => page.locator("img").evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scene}: horizontal overflow`);
    assert.deepEqual(errors, [], "Browser errors during capture");
    await page.screenshot({ path: resolve(output, file) });
    const bytes = await readFile(resolve(output, file));
    files.push({ file, scene, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
  }
  async function openCanasta(tab) {
    await page.goto(baseURL.href);
    const entry = page.getByRole("button", { name: "Open Canasta", exact: true });
    await expect(entry).toContainText("Internal preview");
    await entry.click();
    await page.getByRole("tab", { name: tab, exact: true }).click();
  }

  await openCanasta("Learn");
  await expect(page.getByLabel("Canasta course progress")).toContainText("0 / 8 complete");
  await capture("01-canasta-learn.draft.png", "Canasta Learn entry");
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await expect(page.getByLabel("Canasta example", { exact: true }).locator("img")).toHaveCount(7);
  await capture("02-canasta-card-values.draft.png", "Card points before opening requirements");

  await openCanasta("Learn");
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  const actions = page.locator(".table-play-panel > .action-row");
  await actions.getByRole("button", { name: "Draw stock", exact: true }).click();
  await expect(page.getByRole("region", { name: "Turn guidance", exact: true })).toContainText("Your move:");
  await capture("03-canasta-guided.draft.png", "Guided draw and explanation");

  await openCanasta("Play");
  await page.getByRole("button", { name: "Play Canasta", exact: true }).click();
  await expect(page.getByLabel("Your Canasta hand", { exact: true }).getByRole("button")).toHaveCount(13);
  await capture("04-canasta-play.draft.png", "Independent Canasta hand");
  await writeFile(resolve(output, "manifest.draft.json"), JSON.stringify({
    status: "browser-drafts-not-for-store-upload", capturedAt: new Date().toISOString(),
    source: baseURL.origin, viewport: page.viewportSize(), deviceScaleFactor: 3,
    note: "Development preview, not the Play-installed release. No real purchases or entitlement verification.", files
  }, null, 2) + "\n");
  console.log(`Prepared ${files.length} browser-only drafts in ${output}`);
} finally {
  await browser.close();
}
