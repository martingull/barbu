import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "../..");
const output = resolve(root, "release/marketing/store-trailer");
const storyboard = JSON.parse(await readFile(resolve(root, "docs/marketing/store-trailer.json"), "utf8"));
const { stages, background, durationSeconds, music } = storyboard;
const baseURL = process.env.BARBU_CAPTURE_URL ?? "http://localhost:1420";
assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname));
assert(Number.isFinite(durationSeconds) && durationSeconds > 0);
assert(stages.every(stage => Number.isFinite(stage.duration) && stage.duration > 0.2));
assert.equal(stages.reduce((total, stage) => total + stage.duration, 0), durationSeconds);
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const sourceStatus = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const dataImage = async path => `data:image/png;base64,${(await readFile(path)).toString("base64")}`;
const ffmpeg = args => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const logo = await dataImage(resolve(root, "src-tauri/icons/128x128@2x.png"));
await mkdir(output, { recursive: true });
const musicPath = resolve(output, "source-music.ogg");
assert(music.license === "CC0-1.0" && new URL(music.sourceURL).origin === "https://upload.wikimedia.org");
assert(Number.isFinite(music.startSeconds) && music.startSeconds >= 0);
assert(Number.isFinite(music.loudnessLUFS) && music.loudnessLUFS >= -35 && music.loudnessLUFS <= -14);
for (const fade of [music.fadeInSeconds, music.fadeOutSeconds]) assert(Number.isFinite(fade) && fade > 0 && fade < durationSeconds / 2);
let musicBytes;
try {
  musicBytes = await readFile(musicPath);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  const response = await fetch(music.sourceURL, { signal: AbortSignal.timeout(60_000) });
  assert(response.ok, `Music download failed: ${response.status}`);
  musicBytes = Buffer.from(await response.arrayBuffer());
}
assert.equal(createHash("sha256").update(musicBytes).digest("hex"), music.sha256, "Music differs from the reviewed recording");
await writeFile(musicPath, musicBytes);
const musicInfo = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-of", "json", musicPath], { encoding: "utf8" }));
assert(Number(musicInfo.format.duration) >= music.startSeconds + durationSeconds, "Recording is too short for this edit");

const browser = await chromium.launch();
const errors = [], captures = [];
const context = await browser.newContext({ viewport: { width: 360, height: 560 }, deviceScaleFactor: 3,
  recordVideo: { dir: resolve(output, "source"), size: { width: 720, height: 1120 } } });
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
page.on("requestfailed", request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
try {
  async function open(game) {
    await page.goto(baseURL);
    await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
  }
  async function capture(id) {
    const stage = stages.find(stage => stage.id === id);
    assert(stage, `Unknown capture: ${id}`);
    assert.deepEqual(page.viewportSize(), { width: 360, height: stage.layout === "full-screen" ? 640 : 560 });
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: horizontal overflow`);
    if (stage.layout === "full-screen") {
      const slots = await page.locator(".cardholder").evaluateAll(elements => elements.map(element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }));
      assert.equal(slots.length, 4);
      for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        const horizontal = Math.max(a.x - b.x - b.width, b.x - a.x - a.width);
        const vertical = Math.max(a.y - b.y - b.height, b.y - a.y - a.height);
        assert(Math.max(horizontal, vertical) >= 9, `${id}: table slots are cramped`);
      }
      await expect(page.locator(".table-play-panel .action-row")).toBeInViewport({ ratio: 1 });
    }
    // Only the outer backdrop changes for the edit. All controls, cards, copy and scores remain genuine.
    await page.screenshot({ path: resolve(output, `${id}-ui.png`),
      style: `html, body { background: ${background} !important; }` });
    const target = page.locator(stage.focus);
    await expect(target).toHaveCount(1);
    await expect(target).toBeInViewport({ ratio: 1 });
    const bounds = await target.boundingBox();
    assert(bounds && bounds.width > 0 && bounds.height > 0, `${id}: empty focus target`);
    const viewport = page.viewportSize();
    const left = Math.max(2, bounds.x - 4), top = Math.max(2, bounds.y - 4);
    const right = Math.min(viewport.width - 2, bounds.x + bounds.width + 4);
    const bottom = Math.min(viewport.height - 2, bounds.y + bounds.height + 4);
    const focus = { x: left * 3, y: top * 3, width: (right - left) * 3, height: (bottom - top) * 3 };
    captures.push({ id, viewport: page.viewportSize(), heading: await page.locator("h1").allTextContents(),
      focus, visibleText: await page.locator("body").innerText() });
    console.log(`Captured ${id}`);
  }
  await page.goto(baseURL);
  await page.evaluate(() => localStorage.setItem("barbu.practiceSeed.v1", "12"));
  await page.reload();
  await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Follow suit");
  await expect(page.locator(".drill-hand .card-face")).toHaveCount(3);
  await capture("hearts-question");
  await page.locator(".drill-hand").getByRole("button", { name: "3 C", exact: true }).click();
  await expect(page.locator(".drill-hand [aria-pressed=true]")).toHaveCount(1);
  await capture("hearts-choice");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".outcome")).toHaveText("Good");
  await capture("hearts-answer");

  await open("Hearts");
  await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
  await page.getByRole("heading", { name: "Learning path", exact: true })
    .evaluate(element => element.scrollIntoView({ block: "start" }));
  await capture("learn-path");
  // Let the real responsive layout use the entire portrait frame for the denser full hand.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  const pass = page.getByLabel("Your Hearts passing hand");
  for (let index = 0; index < 3; index++) await pass.getByRole("button").nth(index).click();
  await page.getByRole("button", { name: "Pass cards", exact: true }).click();
  await expect(page.getByLabel("Your Hearts hand")).toBeVisible();
  await expect(page.getByLabel("Hearts hand decision")).toContainText("Rule:");
  await capture("hearts-play");
  await page.getByLabel("Your Hearts hand").locator(".legal").first().click();
  await capture("hearts-play-selected");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByLabel("Trick winner explained")).toContainText("the highest card in");
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeInViewport();
  await capture("hearts-trick");

  await page.setViewportSize({ width: 360, height: 560 });
  await open("Gin Rummy");
  await page.getByRole("button", { name: "Try cards: Sets and runs", exact: true }).click();
  const gin = page.getByLabel("Your Gin Rummy exercise hand", { exact: true });
  await expect(gin.locator(".card-face")).toHaveCount(11);
  await capture("gin-hand");
  await gin.getByRole("button", { name: "K S", exact: true }).click();
  await expect(gin.getByRole("button", { pressed: true })).toHaveCount(1);
  await capture("gin-discard");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".coach-feedback")).toContainText("Deadwood: 2 points");
  await expect(page.locator(".outcome")).toHaveText("Good");
  await capture("gin-answer");

  await page.goto(baseURL);
  await page.locator(".catalog-group").first().evaluate(element => element.scrollIntoView({ block: "start" }));
  await capture("catalog-first");
  await page.locator('[data-collection="partners-tricks"]').evaluate(element => element.scrollIntoView({ block: "start" }));
  await expect(page.getByRole("button", { name: "Open Bridge", exact: true })).toBeInViewport();
  await capture("catalog-partners");
  const video = page.video();
  await context.close();
  const rawRecording = await video.path();
  assert.deepEqual(errors, []);

  const art = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  let elapsed = 0;
  for (const stage of stages) {
    const outro = stage.id === "outro";
    const fullScreen = stage.layout === "full-screen";
    const ui = outro ? "" : await dataImage(resolve(output, `${stage.id}-ui.png`));
    const focus = captures.find(capture => capture.id === stage.id)?.focus;
    await art.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; } body { margin: 0; width: 1080px; height: 1920px; background: ${background}; color: #fafbf7; font-family: Arial, sans-serif; letter-spacing: 0; }
      header { height: 240px; padding: 35px 48px 22px; }
      .brand { display: flex; align-items: center; gap: 14px; font-size: 28px; color: #efd281; }
      .brand img { width: 56px; height: 56px; border-radius: 50%; }
      h1 { font-size: 62px; line-height: 1.08; margin: 23px 0 0; }
      .ui { display: block; width: 1080px; height: auto; }
      .footage { position: relative; overflow: hidden; }
      .spotlight { position: absolute; border: 4px solid #efd281; border-radius: 14px;
        box-shadow: 0 0 0 2400px rgba(16,43,34,.72); pointer-events: none; }
      .ending { position: absolute; inset: 0; padding: 350px 80px 0; text-align: center; }
      .ending img { width: 260px; height: 260px; border-radius: 50%; }
      .ending h1 { font-family: Georgia, serif; font-size: 124px; margin: 45px 0 20px; }
      .ending h2 { font-size: 60px; margin: 0; font-weight: 500; color: #efd281; }
      .tagline { font-size: 76px; line-height: 1.16; margin: 100px 0 0; }
      .detail { font-size: 32px; line-height: 1.5; color: #c1d4c8; margin: 70px 0 0; }
    </style></head><body>${outro
      ? `<main class="ending"><img src="${logo}" alt="Barbu"><h1>Barbu</h1><h2>Learn Card Games</h2><p class="tagline">Learn here.<br>Play together.</p><p class="detail">Practise solo.<br>Bring your skills to a real table.</p></main>`
      : `${fullScreen ? "" : `<header><div class="brand"><img src="${logo}" alt=""><strong>Barbu</strong></div><h1>${escape(stage.heading)}</h1></header>`}<div class="footage"><img class="ui" src="${ui}" alt="Actual Barbu interface"><div class="spotlight" aria-hidden="true" style="left:${focus.x}px;top:${focus.y}px;width:${focus.width}px;height:${focus.height}px"></div></div>`}
    </body></html>`);
    await expect.poll(() => art.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    assert(await art.evaluate(() => document.documentElement.scrollWidth === 1080 && document.documentElement.scrollHeight === 1920));
    if (!outro && !fullScreen) {
      const bounds = await art.locator("h1").boundingBox();
      assert(bounds.y + bounds.height <= 218, `${stage.id}: heading collides with footage`);
      assert(await art.locator("h1").evaluate(element => element.scrollWidth <= element.clientWidth));
    }
    if (!outro) {
      const bounds = await art.locator(".ui").boundingBox();
      assert.equal(bounds.y, fullScreen ? 0 : 240);
      assert.equal(bounds.height, fullScreen ? 1920 : 1680);
      assert.equal(bounds.y + bounds.height, 1920);
      const highlight = await art.locator(".spotlight").boundingBox();
      assert(highlight.x >= bounds.x && highlight.y >= bounds.y);
      assert(highlight.x + highlight.width <= bounds.x + bounds.width);
      assert(highlight.y + highlight.height <= bounds.y + bounds.height);
    }
    await art.screenshot({ path: resolve(output, `${stage.id}.png`) });
    stage.start = elapsed;
    elapsed += stage.duration;
    stage.end = elapsed;
  }

  // Short dissolves join chapters; decision/selection/result changes retain the real UI's instant transitions.
  const chapterStarts = new Set(["learn-path", "hearts-play", "gin-hand", "catalog-first", "outro"]);
  const frames = [];
  for (const [index, stage] of stages.entries()) {
    const transition = index > 0 && chapterStarts.has(stage.id);
    if (transition) {
      for (let frame = 1; frame <= 6; frame++) {
        const opacity = frame / 6;
        const opaque = await sharp(resolve(output, `${stage.id}.png`)).removeAlpha().png().toBuffer();
        const foreground = await sharp(opaque).ensureAlpha(opacity).png().toBuffer();
        const file = `${stage.id}-dissolve-${frame}.png`;
        await sharp(resolve(output, `${stages[index - 1].id}.png`)).composite([{ input: foreground }]).png().toFile(resolve(output, file));
        frames.push({ file, duration: 1 / 30 });
      }
    }
    frames.push({ file: `${stage.id}.png`, duration: stage.duration - (transition ? 0.2 : 0) });
  }
  const list = resolve(output, "frames.txt");
  await writeFile(list, frames.map(frame => `file '${frame.file}'\nduration ${frame.duration.toFixed(8)}`).join("\n") + `\nfile 'outro.png'\n`);
  const filename = "barbu-store-trailer.mp4", final = resolve(output, filename);
  const silentFilename = "barbu-store-trailer-silent.mp4";
  const silent = resolve(output, silentFilename);
  ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-t", String(durationSeconds), "-r", "30", "-c:v", "libx264", "-preset", "fast",
    "-crf", "18", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", silent]);
  const audioFilter = `atrim=start=${music.startSeconds}:duration=${durationSeconds},asetpts=PTS-STARTPTS,` +
    `loudnorm=I=${music.loudnessLUFS}:TP=-3:LRA=11,` +
    `afade=t=in:st=0:d=${music.fadeInSeconds},afade=t=out:st=${durationSeconds - music.fadeOutSeconds}:d=${music.fadeOutSeconds}`;
  ffmpeg(["-i", silent, "-i", musicPath, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
    "-af", audioFilter, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", String(durationSeconds),
    "-metadata", `comment=Music: ${music.title}; ${music.performer}; ${music.license}; ${music.sourcePage}`,
    "-movflags", "+faststart", final]);
  const metadata = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", final], { encoding: "utf8" }));
  const stream = metadata.streams.find(stream => stream.codec_type === "video");
  assert(stream.width === 1080 && stream.height === 1920 && stream.codec_name === "h264" && stream.avg_frame_rate === "30/1");
  assert.equal(Number(stream.nb_frames), durationSeconds * 30);
  assert(Math.abs(Number(metadata.format.duration) - durationSeconds) < 0.05);
  const audioStream = metadata.streams.find(stream => stream.codec_type === "audio");
  assert(audioStream?.codec_name === "aac" && audioStream.channels === 2 && audioStream.sample_rate === "48000");
  assert(Math.abs(Number(audioStream.duration) - durationSeconds) < 0.05);
  ffmpeg(["-i", final, "-f", "null", "-"]);
  for (const stage of stages) {
    ffmpeg(["-ss", String(stage.start + stage.duration / 2), "-i", final, "-frames:v", "1", resolve(output, `preview-${stage.id}.png`)]);
  }
  await writeFile(resolve(output, "capture.json"), JSON.stringify({ revision, sourceStatus, capturedAt: new Date().toISOString(),
    baseURL, rawRecording, storyboard, captures, pageErrors: errors, published: false,
    audio: { ...music, sourceFile: musicPath, filter: audioFilter, silentAlternative: silentFilename },
    edits: "Real UI states, editorial headings and spotlights, chapter dissolves, uniform outer backdrop; no gameplay or feedback invented. Spotlights are video annotations, not in-game effects.",
    format: { width: 1080, height: 1920, fps: 30, seconds: durationSeconds, bytes: Number(metadata.format.size) }
  }, null, 2) + "\n");
  await writeFile(resolve(output, "preview.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1"><title>Barbu | Store trailer draft</title><style>
    *{box-sizing:border-box}body{margin:0;background:${background};color:#fafbf7;font-family:system-ui,sans-serif}
    .screen{height:100svh;display:grid;place-items:center}video{display:block;width:min(100vw,56.25svh);height:auto;aspect-ratio:9/16;background:${background}}
    main{max-width:720px;margin:auto;padding:24px}h1{font-size:26px}p{line-height:1.5}a{color:#efd281}
    </style></head><body><section class="screen" aria-label="Store trailer preview"><video controls playsinline preload="metadata"
    poster="hearts-question.png" aria-label="${durationSeconds}-second Barbu store trailer with Beethoven piano music"><source src="${filename}?v=${Date.now()}" type="video/mp4"></video></section>
    <main><h1>Barbu: Learn Card Games</h1><p>${durationSeconds}-second store-trailer draft with quiet piano music. Actual Hearts and Gin Rummy lessons, guided play, and the game catalog. Nothing has been uploaded.</p>
    <p><a href="${filename}" download>Download MP4 with music</a> · <a href="${silentFilename}" download>Download silent version</a></p>
    <p>Music: ${escape(music.title)} by ${escape(music.composer)}, performed by ${escape(music.performer)}.
    <a href="${music.sourcePage}">Source recording</a> · <a href="${music.licenseURL}">${music.license}</a>. Excerpt, loudness adjustment and fades.</p>
    <p>Real interface captures, edited with headings, focus highlights and short dissolves. Highlights are video annotations, not in-game effects. No third-party video footage.</p>
    <p>After approval: upload to YouTube as public or unlisted, allow embedding, disable monetization, and add the video URL to the Play listing.</p></main></body></html>`);
  console.log(`Exported ${final} (${metadata.format.size} bytes)`);
} finally {
  await browser.close();
}
