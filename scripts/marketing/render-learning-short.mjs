import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

// Actual lesson content with a transparent capture backdrop for compositing.
// The temporary screenshot style never changes game state or production CSS.
const root = resolve(import.meta.dirname, "../..");
const shorts = JSON.parse(await readFile(resolve(root, "docs/marketing/learning-shorts.json"), "utf8"));
const short = shorts.find(short => short.id === (process.argv[2] ?? "hearts-pass-three"));
assert(short && process.argv.length <= 3, "Choose a short id from docs/marketing/learning-shorts.json");
const output = resolve(root, "release/marketing", short.id);
const filename = `barbu-${short.id}.mp4`;
const capturePath = `${short.game} > Learn > Try cards: ${short.topic}`;
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const lines = text => escape(text).replaceAll("\n", "<br>");
const baseURL = process.env.BARBU_CAPTURE_URL ?? "http://localhost:1420";
assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname));
const width = 1080, height = 1920, fps = 30;
const background = "#102b22";
const isolatedBackdrop = { omitBackground: true, style: `
  html, body { background: transparent !important; }
  .action-row { visibility: hidden !important; }
  .full-hand-cards .card { box-shadow: none !important; }
` };
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const sourceStatus = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
const dataImage = async path => `data:image/png;base64,${(await readFile(path)).toString("base64")}`;
const logo = await dataImage(resolve(root, "src-tauri/icons/128x128@2x.png"));
const hookCard = await dataImage(resolve(root, `public/cards/cards/${short.hookCard}.png`));
const ffmpeg = args => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const probe = path => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { encoding: "utf8" }));
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const timings = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 3,
    recordVideo: { dir: resolve(output, "source"), size: { width: 780, height: 1120 } } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(baseURL);
  await page.evaluate(() => localStorage.setItem("barbu.practiceSeed.v1", "12"));
  await page.reload();
  await page.getByRole("button", { name: `Open ${short.game}`, exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: `Try cards: ${short.topic}`, exact: true }).click();
  await expect(page.locator("h1")).toHaveText(short.heading);
  await expect.poll(() => page.locator("img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  const hand = page.getByLabel(short.handLabel, { exact: true });
  await expect(hand.locator(".card-face")).toHaveCount(short.handCount);
  await expect(page.getByRole("button", { name: short.checkLabel, exact: true })).toBeInViewport();
  const handBox = await hand.boundingBox();
  const captureHand = async name => page.screenshot({ ...isolatedBackdrop, path: resolve(output, `${name}.png`), clip: {
    x: handBox.x - 4, y: handBox.y - 4, width: handBox.width + 8, height: handBox.height + 8
  } });
  const started = Date.now();
  await page.screenshot({ path: resolve(output, "lesson-before.png") });
  await captureHand("hand-0");
  const choices = short.choiceFromHand ? hand : page.getByLabel("Gin choices", { exact: true });
  if (!short.choiceFromHand) await choices.screenshot({ ...isolatedBackdrop, path: resolve(output, "choices-0.png") });
  await page.waitForTimeout(5000);
  for (const [index, card] of short.choices.entries()) {
    await choices.getByRole("button", { name: card, exact: true }).click();
    await expect(choices.getByRole("button", { pressed: true })).toHaveCount(index + 1);
    await page.waitForTimeout(200);
    await captureHand(`hand-${index + 1}`);
    if (!short.choiceFromHand) await choices.screenshot({ ...isolatedBackdrop, path: resolve(output, `choices-${index + 1}.png`) });
    timings.push({ card, seconds: (Date.now() - started) / 1000 });
    await page.waitForTimeout(750);
  }
  await page.getByRole("button", { name: short.checkLabel, exact: true }).click();
  for (const text of short.feedbackContains) await expect(page.locator(".coach-feedback")).toContainText(text);
  await expect(page.getByRole("button", { name: short.nextLabel, exact: true })).toBeInViewport();
  await page.screenshot({ path: resolve(output, "lesson-after.png") });
  await page.locator(".coach-feedback").screenshot({ ...isolatedBackdrop, path: resolve(output, "feedback.png") });
  await page.waitForTimeout(4000);
  const video = page.video();
  await context.close();
  const raw = await video.path();
  assert.deepEqual(errors, [], "Browser capture must be error-free");

  const assets = {};
  const captureFiles = ["hand-0", ...short.choices.map((_, index) => `hand-${index + 1}`), "feedback",
    ...(!short.choiceFromHand ? ["choices-0", "choices-1"] : [])];
  for (const file of captureFiles) {
    const path = resolve(output, `${file}.png`);
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) transparent++;
      if (data[i] === 255) opaque++;
    }
    assert(transparent > info.width * info.height * 0.05 && opaque > 0, `${file}: missing content or transparent backdrop`);
    assets[file] = await dataImage(path);
  }
  const handImage = index => `<img class="hand" src="${assets[`hand-${index}`]}" alt="Actual lesson hand">` +
    (!short.choiceFromHand ? `<img class="choice-capture" src="${assets[`choices-${index}`]}" alt="Actual lesson choices">` : "");
  const stages = [
    { id: "hook", duration: 3, html: `<h1>${lines(short.hook)}<br><em>${lines(short.hookAccent)}</em></h1><img class="queen" src="${hookCard}" alt="Card from the exercise"><p class="bottom">${lines(short.hookBottom)}</p>` },
    { id: "question", duration: 3, html: `<h1>${lines(short.question)}</h1><p class="context">${lines(short.context)}</p>${handImage(0)}<p class="bottom">${lines(short.questionBottom)}</p>` },
    ...[3, 2, 1].map(count => ({ id: `count-${count}`, duration: 1, html: `<h1>${lines(short.question)}</h1><p class="context">${lines(short.context)}</p>${handImage(0)}<div class="count">${count}</div><p class="bottom small">${lines(short.countPrompt)}</p>` })),
    ...short.choices.map((_, index) => ({ id: `select-${index + 1}`, duration: 3.6 / short.choices.length, html: `<h1>${lines(short.selectionTitle)}<br><em>${lines(short.selectionAccent)}</em></h1><p class="context">${lines(short.selectionContext)}</p>${handImage(index + 1)}${short.choiceFromHand ? `<p class="selected">${index + 1} / ${short.choices.length} selected</p>` : ""}<p class="bottom small">${lines(short.selectionBottom)}</p>` })),
    { id: "feedback", duration: 6.4, html: `<h1>${lines(short.answerTitle)}<br><em>${lines(short.answerAccent)}</em></h1><img class="feedback" src="${assets.feedback}" alt="Actual lesson feedback"><p class="bottom small">${lines(short.answerBottom)}</p>` },
    { id: "outro", duration: 5, html: `<img class="outro-logo" src="${logo}" alt="Barbu"><h1 class="outro-title">Barbu</h1><p class="tagline">Learn here.<br>Play together.</p><p class="cta">Free on Google Play</p><p class="store-name">Search: Barbu: Learn Card Games</p><p class="bottom small">Learn a game.<br>Join a real table.</p>` }
  ];
  const art = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  let elapsed = 0;
  for (const [index, stage] of stages.entries()) {
    await art.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; } body { margin: 0; width: 1080px; height: 1920px; background: ${background}; color: #fafbf7; font-family: Arial, sans-serif; letter-spacing: 0; }
      .brand { position: absolute; left: 78px; top: 142px; display: flex; align-items: center; gap: 18px; font-size: 38px; }
      .brand img { width: 72px; height: 72px; border-radius: 50%; } .brand span { color: #bccfc3; font-size: 26px; margin-left: 18px; }
      h1 { position: absolute; left: 78px; top: 278px; width: 840px; margin: 0; font-size: 76px; line-height: 1.12; font-weight: 750; }
      em { color: #efd281; font-style: normal; } p { margin: 0; }
      .queen { position: absolute; width: 358px; height: 520px; object-fit: contain; top: 610px; left: 321px; transform: rotate(-5deg); filter: drop-shadow(0 18px 18px #0006); }
      .context { position: absolute; left: 78px; top: 518px; width: 840px; font-size: 36px; color: #efd281; }
      .hand { position: absolute; left: 66px; top: 704px; width: 864px; height: auto; }
      .bottom { position: absolute; left: 78px; top: 1376px; width: 840px; font-size: 48px; line-height: 1.25; }
      .small { font-size: 36px; color: #d2dfd6; }
      .count { position: absolute; left: 78px; top: ${short.choiceFromHand ? 1120 : 1200}px; font-size: 96px; font-weight: 700; color: #efd281; }
      .choice-capture { position: absolute; left: 66px; top: 1040px; width: 864px; height: auto; }
      .selected { position: absolute; left: 78px; top: 1150px; font-size: 48px; font-weight: 700; color: #efd281; }
      .feedback { position: absolute; left: 78px; top: 786px; width: 840px; height: auto; }
      .outro-logo { position: absolute; left: 78px; top: 360px; width: 230px; height: 230px; border-radius: 50%; }
      .outro-title { top: 644px; font-family: Georgia, serif; font-size: 108px; }
      .tagline { position: absolute; left: 78px; top: 836px; font-size: 70px; line-height: 1.13; }
      .cta { position: absolute; left: 78px; top: 1122px; font-size: 49px; font-weight: 700; color: #efd281; }
      .store-name { position: absolute; left: 78px; top: 1202px; font-size: 30px; }
      footer { position: absolute; left: 78px; top: 1570px; font-size: 24px; color: #a9c2b3; }
      .progress { position: absolute; top: 1640px; left: 78px; height: 4px; width: ${840 * (index + 1) / stages.length}px; background: #efd281; }
    </style></head><body><div class="brand"><img src="${logo}" alt=""><strong>Barbu</strong><span>${escape(short.game.toUpperCase())} / ${short.number}</span></div>${stage.html}<footer>${stage.id === "outro" ? "Single-player practice. Real-world play." : "Actual lesson & card art · Edited for this video"}</footer><div class="progress"></div></body></html>`);
    await expect.poll(() => art.locator("img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    // Validate all editorial blocks, including image crops, against each other and safe margins.
    const boxes = await art.locator("body > :not(.progress)").evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      return { label: element.className || element.tagName, x: box.x, y: box.y, right: box.right, bottom: box.bottom };
    }));
    for (const box of boxes) assert(box.x >= 60 && box.right <= 940 && box.y >= 130 && box.bottom <= 1630, `${stage.id}: unsafe ${box.label}`);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert(!(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y), `${stage.id}: ${a.label} overlaps ${b.label}`);
    }
    const frame = resolve(output, `${stage.id}.png`);
    await art.screenshot({ path: frame });
    stage.start = elapsed;
    elapsed += stage.duration;
    stage.end = elapsed;
    ffmpeg(["-loop", "1", "-framerate", String(fps), "-i", frame, "-t", String(stage.duration),
      "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-an", resolve(output, `${stage.id}.mp4`)]);
  }
  const list = resolve(output, "clips.txt");
  await writeFile(list, stages.map(stage => `file '${stage.id}.mp4'`).join("\n") + "\n");
  const final = resolve(output, filename);
  ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", final]);
  const metadata = probe(final);
  const stream = metadata.streams.find(stream => stream.codec_type === "video");
  assert(stream.width === width && stream.height === height && stream.codec_name === "h264");
  assert(Math.abs(Number(metadata.format.duration) - elapsed) < 0.1);
  assert(!metadata.streams.some(stream => stream.codec_type === "audio"));
  ffmpeg(["-i", final, "-f", "null", "-"]);
  for (const [name, seconds] of [["opening", 1], ["question", 4], ["selection", 11], ["feedback", 15], ["ending", 22]]) {
    ffmpeg(["-ss", String(seconds), "-i", final, "-frames:v", "1", resolve(output, `preview-${name}.png`)]);
  }
  await writeFile(resolve(output, "capture.json"), JSON.stringify({ revision, sourceStatus, capturedAt: new Date().toISOString(),
    baseURL, capturePath, seed: 12, handBox, timings, raw, short,
    audio: "silent", generatedVideo: false, editedLessonCapture: true, transparentCaptureBackdrop: true,
    background, published: false, pageErrors: errors,
    stages: stages.map(({ id, start, end }) => ({ id, start, end })),
    format: { width, height, fps, durationSeconds: elapsed, bytes: Number(metadata.format.size) },
    destination: "https://play.google.com/store/apps/details?id=com.martin.barbu"
  }, null, 2) + "\n");
  const previewVersion = Date.now();
  await writeFile(resolve(output, "preview.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Barbu | ${escape(short.title)}</title><style>
* { box-sizing:border-box; }
body { margin:0; background:${background}; color:#fafbf7; font-family:system-ui,sans-serif; }
.screen { height:100svh; display:grid; place-items:center; }
video { display:block; width:min(100vw,56.25svh); height:auto; aspect-ratio:9/16; object-fit:contain; background:${background}; }
main { max-width:720px; margin:auto; padding:24px; } h1 { font-size:24px; } p { line-height:1.5; }
a { color:#efd281; } nav { display:flex; flex-wrap:wrap; gap:24px; margin:24px 0; }
</style></head><body><section class="screen" aria-label="Video preview">
<video controls playsinline preload="metadata" poster="hook.png?v=${previewVersion}" aria-label="24-second silent ${escape(short.game)} promotional draft"><source src="${filename}?v=${previewVersion}" type="video/mp4"></video>
</section><main><h1>${escape(short.title)}</h1>
<p>24-second silent draft. Real lesson captures, enlarged card art and editorial captions. Nothing has been published.</p>
<nav><a href="${filename}" download>Download MP4</a><a href="https://play.google.com/store/apps/details?id=com.martin.barbu">Barbu on Google Play</a></nav>
<h2>Draft caption</h2><p>${escape(short.caption)}</p>
<h2>Other drafts</h2><nav>${shorts.filter(item => item.id !== short.id).map(item => `<a href="../${item.id}/preview.html">${escape(item.title)}</a>`).join("")}</nav>
</main></body></html>`);
  console.log(`Exported ${final} (${elapsed}s, ${metadata.format.size} bytes)`);
} finally {
  await browser.close();
}
