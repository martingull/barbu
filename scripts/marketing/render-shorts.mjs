import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Capture actual lesson interactions in an isolated browser, then add editorial
// titles outside the gameplay. No production UI, game state or phone is modified.
const root = resolve(import.meta.dirname, "../..");
const output = resolve(root, "release/marketing/shorts");
const baseURL = process.env.BARBU_CAPTURE_URL ?? "http://localhost:1420";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
  throw Error("Use a local Barbu server for captures.");
}
const shorts = JSON.parse(await readFile(resolve(root, "docs/marketing/shorts.json"), "utf8"));
const logo = `data:image/png;base64,${(await readFile(resolve(root, "src-tauri/icons/128x128@2x.png"))).toString("base64")}`;
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const sourceStatus = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const lines = text => escape(text).replaceAll("\n", "<br>");
const wait = milliseconds => new Promise(done => setTimeout(done, milliseconds));
function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}
function probe(file) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const short of shorts) {
    const directory = resolve(output, short.id);
    await mkdir(directory, { recursive: true });
    const height = short.game === "Hearts" ? 560 : 440;
    const y = short.game === "Hearts" ? 380 : 500;
    const context = await browser.newContext({ viewport: { width: 390, height },
      deviceScaleFactor: 2, recordVideo: { dir: directory, size: { width: 390, height } } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(baseURL);
    if (short.game === "Hearts") {
      await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
      await page.getByLabel("Your drill hand").getByRole("button", { name: "3 C", exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await page.getByRole("button", { name: "Next decision", exact: true }).click();
      await expect(page.locator("h1")).toHaveText("Avoid a heart");
    } else {
      await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await page.getByRole("button", { name: "Try cards: Sets and runs", exact: true }).click();
      await expect(page.locator("h1")).toHaveText("Keep your three combinations");
    }
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeInViewport();
    await page.screenshot({ path: resolve(directory, "lesson-before.png") });
    const started = Date.now();
    await wait(6000);
    const hand = page.getByLabel(short.game === "Hearts" ? "Your drill hand" : "Your Gin Rummy exercise hand", { exact: true });
    await hand.getByRole("button", { name: short.choice, exact: true }).click();
    const selected = (Date.now() - started) / 1000;
    await page.screenshot({ path: resolve(directory, "lesson-selected.png") });
    await wait(1500);
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.locator("main")).toContainText(short.expectedFeedback);
    const reveal = (Date.now() - started) / 1000;
    await page.screenshot({ path: resolve(directory, "lesson-after.png") });
    await wait(Math.max(0, 14500 - (Date.now() - started)));
    const captured = (Date.now() - started) / 1000;
    const video = page.video();
    await context.close();
    const raw = await video.path();
    if (errors.length) throw Error(errors.join("\n"));
    const offset = Math.max(0, Number(probe(raw).format.duration) - captured);

    const art = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    for (const stage of ["question", "answer", "outro"]) {
      const outro = stage === "outro";
      await art.setContent(`<!doctype html><html><head><style>
        * { box-sizing: border-box; } body { margin: 0; background: #101e18; color: #f8faf5; font-family: Arial, sans-serif; letter-spacing: 0; }
        .brand { position: absolute; top: 104px; left: 90px; display: flex; align-items: center; gap: 18px; }
        .brand img { width: 66px; height: 66px; border-radius: 50%; } .brand strong { font-family: Georgia, serif; font-size: 42px; }
        .brand span { margin-left: 16px; font-size: 24px; color: #bbcfbf; }
        h1 { position: absolute; top: 195px; left: 90px; margin: 0; font-size: 64px; line-height: 1.08; width: 810px; }
        .caption { position: absolute; top: 1530px; left: 90px; width: 810px; font-size: 39px; line-height: 1.24; font-weight: 700; color: ${stage === "answer" ? "#e7c87b" : "#f8faf5"}; }
        .note { position: absolute; top: 1670px; left: 90px; color: #bbcfbf; font-size: 23px; }
        .outro { position: absolute; top: 440px; left: 90px; width: 810px; }
        .outro img { width: 180px; height: 180px; border-radius: 50%; } .outro h2 { font-family: Georgia, serif; font-size: 96px; margin: 32px 0 8px; }
        .outro p { font-size: 45px; line-height: 1.25; margin: 0 0 50px; }
        .outro .cta { color: #e7c87b; font-weight: 700; font-size: 57px; }
        .outro small { display: block; font-size: 27px; color: #bbcfbf; margin-top: 32px; }
      </style></head><body>
        <div class="brand"><img src="${logo}" alt=""><strong>Barbu</strong><span>${escape(short.game)} / 01</span></div>
        ${outro ? `<div class="outro"><img src="${logo}" alt=""><h2>Barbu</h2><p>The king of cards</p><p>Learn a game.<br>Take a seat.</p><div class="cta">Follow for launch.</div><small>Development preview</small></div>`
          : `<h1>${lines(short.hook)}</h1><div class="caption">${lines(short[stage])}</div><div class="note">Actual guided exercise · Development preview</div>`}
      </body></html>`);
      await art.screenshot({ path: resolve(directory, `${stage}.png`) });
    }
    await art.close();
    const encoding = ["-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30", "-an"];
    const lesson = resolve(directory, "lesson.mp4");
    // Playwright video uses CSS pixels. Preserve crisp device-pixel screenshots
    // during the static holds, leaving the real recording visible at transitions.
    ffmpeg(["-ss", String(offset), "-i", raw,
      "-loop", "1", "-i", resolve(directory, "question.png"),
      "-loop", "1", "-i", resolve(directory, "answer.png"),
      ...["before", "selected", "after"].flatMap(state => ["-loop", "1", "-i", resolve(directory, `lesson-${state}.png`)]),
      "-filter_complex", `[0:v]scale=780:${height * 2}:flags=lanczos,setpts=PTS-STARTPTS[v];` +
        `[v][3:v]overlay=enable='lt(t,5.9)'[v1];` +
        `[v1][4:v]overlay=enable='between(t,${(selected + 0.2).toFixed(2)},${(reveal - 0.1).toFixed(2)})'[v2];` +
        `[v2][5:v]overlay=enable='gte(t,${(reveal + 0.2).toFixed(2)})'[v3];` +
        `[1:v][2:v]overlay=enable='gte(t,${reveal.toFixed(2)})'[bg];[bg][v3]overlay=90:${y}:shortest=1[out]`,
      "-map", "[out]", "-t", "14", ...encoding, lesson]);
    const ending = resolve(directory, "ending.mp4");
    ffmpeg(["-loop", "1", "-i", resolve(directory, "outro.png"), "-t", "4", ...encoding, ending]);
    const final = resolve(output, `${short.id}.mp4`);
    ffmpeg(["-i", lesson, "-i", ending, "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[out]",
      "-map", "[out]", ...encoding, "-movflags", "+faststart", final]);
    const metadata = probe(final);
    const stream = metadata.streams.find(stream => stream.codec_type === "video");
    if (stream.width !== 1080 || stream.height !== 1920 || stream.codec_name !== "h264" || Math.abs(Number(metadata.format.duration) - 18) > 0.1) {
      throw Error(`Unexpected export format: ${final}`);
    }
    for (const [label, time] of [["opening", 2], ["reveal", 10], ["ending", 16]]) {
      ffmpeg(["-ss", String(time), "-i", final, "-frames:v", "1", resolve(directory, `preview-${label}.png`)]);
    }
    await writeFile(resolve(directory, "capture.json"), JSON.stringify({
      id: short.id, revision, sourceStatus, capturedAt: new Date().toISOString(), baseURL,
      capturePath: short.capturePath, viewport: { width: 390, height },
      audio: "silent", generatedVideo: false, published: false,
      format: { width: 1080, height: 1920, fps: 30, durationSeconds: 18 },
      bytes: Number(metadata.format.size), pageErrors: errors
    }, null, 2) + "\n");
    console.log(`Exported ${final}`);
  }
} finally {
  await browser.close();
}
