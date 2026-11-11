import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

// Actual lesson content with a transparent capture backdrop for compositing.
// The temporary screenshot style never changes game state or production CSS.
const root = resolve(import.meta.dirname, "../..");
const { values, positionals } = parseArgs({ options: { campaign: { type: "string" } }, allowPositionals: true });
assert(positionals.length <= 1, "Provide one short id");
const campaigns = { christmas: "christmas-shorts.json", "table-talk": "table-talk-shorts.json" };
assert(!values.campaign || Object.hasOwn(campaigns, values.campaign), "Supported campaigns: christmas, table-talk");
const lessons = JSON.parse(await readFile(resolve(root, "docs/marketing/learning-shorts.json"), "utf8"));
const campaign = values.campaign
  ? JSON.parse(await readFile(resolve(root, "docs/marketing", campaigns[values.campaign]), "utf8")) : null;
const tableTalk = campaign?.format === "table-talk";
const shorts = campaign ? campaign.shorts.map(item => {
  const lesson = lessons.find(lesson => lesson.id === item.lessonId);
  assert(lesson, `Unknown campaign lesson: ${item.lessonId}`);
  return { ...lesson, ...item };
}) : lessons;
const short = shorts.find(short => short.id === (positionals[0] ?? shorts[0].id));
assert(short, "Choose a short id from the selected campaign or learning-shorts.json");
const pacing = { hook: 3, question: 3, selection: 3.6, feedback: 6.4, outro: 5, ...campaign?.pacing };
assert(Object.values(pacing).every(value => Number.isFinite(value) && value > 0));
const output = resolve(root, "release/marketing", short.id);
const filename = `barbu-${short.id}.mp4`;
const silentFilename = `barbu-${short.id}-silent.mp4`;
const music = campaign?.music;
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
  .card { transition: none !important; box-shadow: none !important; }
` };
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const sourceStatus = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
const dataImage = async path => `data:image/png;base64,${(await readFile(path)).toString("base64")}`;
const logo = await dataImage(resolve(root, "src-tauri/icons/128x128@2x.png"));
const backdrop = campaign?.backgroundImage ? await dataImage(resolve(root, campaign.backgroundImage)) : null;
const hookCard = await dataImage(resolve(root, `public/cards/cards/${short.hookCard}.png`));
const ffmpeg = args => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const probe = path => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { encoding: "utf8" }));
await mkdir(output, { recursive: true });
const musicPath = resolve(output, "source-music.ogg");
if (music) {
  assert.equal(new URL(music.sourceURL).origin, "https://upload.wikimedia.org");
  assert(["CC-BY-3.0", "PD-author", "CC0-1.0"].includes(music.license), "Use a reviewed recording with documented reuse rights");
  assert(music.credit && music.licenseURL && music.sourcePage);
  assert(Number.isFinite(music.startSeconds) && music.startSeconds >= 0);
  assert(Number.isFinite(music.loudnessLUFS) && music.loudnessLUFS >= -35 && music.loudnessLUFS <= -14);
  let bytes;
  try { bytes = await readFile(musicPath); } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const response = await fetch(music.sourceURL, { signal: AbortSignal.timeout(60_000) });
    assert(response.ok, `Music download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  assert.equal(createHash("sha256").update(bytes).digest("hex"), music.sha256, "Music differs from the reviewed recording");
  await writeFile(musicPath, bytes);
}

const browser = await chromium.launch();
const errors = [];
const timings = [];
try {
  // Give the shared responsive hand room to use readable cards in the video crop.
  const captureHeight = tableTalk ? 850 : 560;
  const context = await browser.newContext({ viewport: { width: 390, height: captureHeight }, deviceScaleFactor: 3,
    recordVideo: { dir: resolve(output, "source"), size: { width: 780, height: captureHeight * 2 } } });
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
  if (tableTalk) {
    const cardBox = await hand.locator(".card-face").first().boundingBox();
    assert(cardBox.width * 864 / (handBox.width + 8) >= 100, "Video cards must remain at least 100px wide");
  }
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
  const stages = tableTalk ? [
    { id: "question", duration: pacing.question, html: `<h1>${lines(short.question)}</h1><p class="context">${lines(short.context)}</p>${handImage(0)}<p class="bottom small">${lines(short.questionBottom)}</p>` },
    ...short.choices.map((_, index) => ({ id: `select-${index + 1}`, duration: pacing.selection / short.choices.length, html: `<h1>${lines(short.selectionTitle)}<br><em>${lines(short.selectionAccent)}</em></h1><p class="context">${lines(short.selectionContext)}</p>${handImage(index + 1)}<p class="bottom small">${lines(short.selectionBottom)}</p>` })),
    { id: "feedback", duration: pacing.feedback, html: `<h1>${lines(short.answerTitle)}</h1><p class="context">${lines(short.answerContext ?? short.selectionContext)}</p>${handImage(short.choices.length)}<p class="bottom small">${lines(short.answerBottom)}</p>` },
    { id: "caveat", duration: short.caveat.duration, html: `<h1>${lines(short.caveat.heading)}</h1><p class="context">${lines(short.caveat.context)}</p>${handImage(0)}<p class="bottom small">${lines(short.caveat.explanation)}</p>` },
    { id: "outro", duration: pacing.outro, html: `<h1>${lines(short.discussion.heading)}</h1><p class="context">${lines(short.discussion.context)}</p>${handImage(0)}<p class="bottom">${lines(short.discussion.question)}</p>` }
  ] : [
    { id: "hook", duration: pacing.hook, html: `<h1>${lines(short.hook)}<br><em>${lines(short.hookAccent)}</em></h1><img class="queen" src="${hookCard}" alt="Card from the exercise"><p class="bottom">${lines(short.hookBottom)}</p>` },
    { id: "question", duration: pacing.question, html: `<h1>${lines(short.question)}</h1><p class="context">${lines(short.context)}</p>${handImage(0)}<p class="bottom">${lines(short.questionBottom)}</p>` },
    ...[3, 2, 1].map(count => ({ id: `count-${count}`, duration: 1, html: `<h1>${lines(short.question)}</h1><p class="context">${lines(short.context)}</p>${handImage(0)}<div class="count">${count}</div><p class="bottom small">${lines(short.countPrompt)}</p>` })),
    ...short.choices.map((_, index) => ({ id: `select-${index + 1}`, duration: pacing.selection / short.choices.length, html: `<h1>${lines(short.selectionTitle)}<br><em>${lines(short.selectionAccent)}</em></h1><p class="context">${lines(short.selectionContext)}</p>${handImage(index + 1)}${short.choiceFromHand ? `<p class="selected">${index + 1} / ${short.choices.length} selected</p>` : ""}<p class="bottom small">${lines(short.selectionBottom)}</p>` })),
    { id: "feedback", duration: pacing.feedback, html: `<h1>${lines(short.answerTitle)}<br><em>${lines(short.answerAccent)}</em></h1><img class="feedback" src="${assets.feedback}" alt="Actual lesson feedback"><p class="bottom small">${lines(short.answerBottom)}</p>` },
    { id: "outro", duration: pacing.outro, html: `<img class="outro-logo" src="${logo}" alt="Barbu"><h1 class="outro-title">Barbu</h1><p class="tagline">${lines(short.tagline ?? "Learn here.\nPlay together.")}</p><p class="cta">Free on Google Play</p><p class="store-name">Search: Barbu: Learn Card Games</p><p class="bottom small">${lines(short.outroBottom ?? "Learn a game.\nJoin a real table.")}</p>` }
  ];
  if (tableTalk) {
    assert(short.choiceFromHand, "Table-talk currently expects a hand-selection lesson");
    assert(stages.every(stage => stage.html.includes('class="hand"')), "Keep the cards visible throughout table-talk");
    assert(!stages.some(stage => /Google Play|class="cta"|outro-logo/.test(stage.html)), "Table-talk must not contain a download pitch");
  }
  assert(stages.every(stage => Number.isFinite(stage.duration) && stage.duration > 0));
  const art = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  let elapsed = 0;
  for (const [index, stage] of stages.entries()) {
    await art.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; } body { margin: 0; width: 1080px; height: 1920px; background: ${background}; ${backdrop ? `background-image: url('${backdrop}'); background-size: cover;` : ""} color: #fafbf7; font-family: Arial, sans-serif; letter-spacing: 0; }
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
      ${tableTalk ? ".brand { font-size: 30px; } .brand img { width: 52px; height: 52px; } .brand span { font-size: 28px; } .hand { top: 660px; } .bottom { top: 1170px; } .small { font-size: 40px; }" : ""}
    </style></head><body><div class="brand"><img src="${logo}" alt=""><strong>Barbu</strong><span>${escape(tableTalk ? campaign.brandLabel : `${short.game.toUpperCase()} / ${campaign?.brandLabel ?? short.number}`)}</span></div>${stage.html}<footer>${stage.id === "outro" && !tableTalk ? "Single-player practice. Real-world play." : "Actual lesson & card art · Edited for this video"}</footer><div class="progress"></div></body></html>`);
    await expect.poll(() => art.locator("img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    assert(await art.locator("h1,p,.brand").evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth)), `${stage.id}: text overflows`);
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
  const silent = music ? resolve(output, silentFilename) : final;
  ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", silent]);
  let audioFilter;
  if (music) {
    assert(Number(probe(musicPath).format.duration) >= music.startSeconds + elapsed, "Music excerpt is too short");
    for (const fade of [music.fadeInSeconds, music.fadeOutSeconds]) assert(Number.isFinite(fade) && fade > 0 && fade < elapsed / 2);
    audioFilter = `atrim=start=${music.startSeconds}:duration=${elapsed},asetpts=PTS-STARTPTS,` +
      `loudnorm=I=${music.loudnessLUFS}:TP=-3:LRA=11,` +
      `afade=t=in:st=0:d=${music.fadeInSeconds},afade=t=out:st=${elapsed - music.fadeOutSeconds}:d=${music.fadeOutSeconds}`;
    ffmpeg(["-i", silent, "-i", musicPath, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
      "-af", audioFilter, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", String(elapsed),
      "-map_metadata", "-1", "-map_metadata:s:a", "-1",
      "-metadata", `comment=${music.title}; ${music.performer}; ${music.license}. Full credit in accompanying caption.`, "-movflags", "+faststart", final]);
  }
  const metadata = probe(final);
  const stream = metadata.streams.find(stream => stream.codec_type === "video");
  assert(stream.width === width && stream.height === height && stream.codec_name === "h264");
  assert.equal(stream.avg_frame_rate, "30/1");
  assert.equal(Number(stream.nb_frames), Math.round(elapsed * fps));
  assert(Math.abs(Number(metadata.format.duration) - elapsed) < 0.1);
  const audio = metadata.streams.find(stream => stream.codec_type === "audio");
  if (music) {
    assert(audio?.codec_name === "aac" && audio.channels === 2 && audio.sample_rate === "48000");
    assert(Math.abs(Number(audio.duration) - elapsed) < 0.05);
  } else assert(!audio);
  ffmpeg(["-i", final, "-f", "null", "-"]);
  for (const [name, id] of [["opening", stages[0].id], ["question", "question"], ["selection", `select-${short.choices.length}`], ["feedback", "feedback"], ...(tableTalk ? [["caveat", "caveat"]] : []), ["ending", "outro"]]) {
    const stage = stages.find(stage => stage.id === id);
    const seconds = (stage.start + stage.end) / 2;
    ffmpeg(["-ss", String(seconds), "-i", final, "-frames:v", "1", resolve(output, `preview-${name}.png`)]);
  }
  await writeFile(resolve(output, "capture.json"), JSON.stringify({ revision, sourceStatus, capturedAt: new Date().toISOString(),
    baseURL, capturePath, seed: 12, handBox, timings, raw, short, campaign,
    audio: music ? { ...music, sourceFile: musicPath, filter: audioFilter, silentAlternative: silentFilename } : "silent", generatedVideo: false, editedLessonCapture: true, transparentCaptureBackdrop: true,
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
main { max-width:720px; margin:auto; padding:24px; overflow-wrap:anywhere; } h1 { font-size:24px; } p { line-height:1.5; }
a { color:#efd281; } nav { display:flex; flex-wrap:wrap; gap:24px; margin:24px 0; }
</style></head><body><section class="screen" aria-label="Video preview">
<video controls playsinline preload="metadata" poster="${stages[0].id}.png?v=${previewVersion}" aria-label="${elapsed}-second ${escape(short.game)} ${tableTalk ? "card dilemma" : "promotional"} draft${music ? ` with ${escape(music.title)}` : ", silent"}"><source src="${filename}?v=${previewVersion}" type="video/mp4"></video>
</section><main><h1>${escape(short.title)}</h1>
<p>${elapsed}-second ${music ? `draft with quiet background music: ${escape(music.title)}` : "silent draft"}. Real lesson captures, enlarged card art and editorial captions.${backdrop ? " AI-generated festive backdrop; gameplay is real." : ""} This render has not been published.</p>
<nav><a href="${filename}" download>Download MP4</a>${tableTalk ? "" : '<a href="https://play.google.com/store/apps/details?id=com.martin.barbu">Barbu on Google Play</a>'}</nav>
${music ? `<p><a href="${silentFilename}" download>Download silent version</a></p><h2>Music credit</h2><p>${escape(music.credit)}</p>` : ""}
<h2>Draft caption</h2><p>${escape(short.caption)}${music ? `<br><br>${escape(music.credit)}` : ""}</p>
${short.conversationPrompt ? `<h2>Discussion starter</h2><p>${escape(short.conversationPrompt)}</p>` : ""}
${shorts.length > 1 ? `<h2>Other drafts</h2><nav>${shorts.filter(item => item.id !== short.id).map(item => `<a href="../${item.id}/preview.html">${escape(item.title)}</a>`).join("")}</nav>` : ""}
</main></body></html>`);
  console.log(`Exported ${final} (${elapsed}s, ${metadata.format.size} bytes)`);
} finally {
  await browser.close();
}
