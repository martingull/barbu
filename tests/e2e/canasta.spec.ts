import { expect, test, type Page } from "@playwright/test";
import { createCanastaSession, transitionCanastaSession, type CanastaSession } from "../../src/domain/canastaSession";
import { advanceCanastaOpponents, canastaObservation, chooseCanastaAction, suggestedCanastaMelds } from "../../src/domain/canastaPolicy";
import { canastaSaveKey, restoreCanastaSession, saveCanastaSession } from "../../src/persistence/canastaSave";
import { canastaExercises, answerCanastaExercise } from "../../src/lessons/canasta/exercises";
import { formatCardLabel } from "../../src/presentation/cardDisplay";
import { isCatalogGameAvailable } from "../../src/games/tableFactory";

test.skip(!isCatalogGameAvailable("canasta"), "Canasta is paused and hidden from the player catalog.");

const label = (card: { rank: string; suit: "C" | "D" | "H" | "S"; id: string }) => `${formatCardLabel(card)}, pack ${Number(card.id[0]) + 1}`;
async function saved(page: Page) { return restoreCanastaSession(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), canastaSaveKey)); }
async function usableHeight(page: Page) {
  return page.evaluate(() => innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--app-safe-area-bottom")) || 0));
}
async function seed(page: Page, session = advanceCanastaOpponents(createCanastaSession(3))) {
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: canastaSaveKey, value: saveCanastaSession(session, new Date().toISOString()) });
  await page.reload();
  await page.getByRole("button", { name: "Continue Canasta", exact: true }).click();
}
async function move(page: Page, session: CanastaSession) {
  const action = chooseCanastaAction(canastaObservation(session));
  if (action.type === "draw") await page.getByRole("button", { name: /^(Draw stock|End hand)$/, exact: true }).last().click();
  else if (action.type === "expose") {
    await page.getByLabel("Your Canasta hand", { exact: true }).getByRole("button", { name: label(session.hand.hands[0].find(card => card.id === action.cardId)!), exact: true }).click();
    await page.getByRole("button", { name: "Expose three", exact: true }).click();
  } else if (action.type === "discard") {
    await page.getByLabel("Your Canasta hand", { exact: true }).getByRole("button", { name: label(session.hand.hands[0].find(card => card.id === action.cardId)!), exact: true }).click();
    await page.getByRole("button", { name: /^(Discard|Go out)$/, exact: true }).click();
  } else if (action.type === "meld" || action.type === "pickup") {
    await page.getByRole("button", { name: action.type === "meld" ? "Meld cards" : "Take pile", exact: true }).click();
    if (action.type === "meld" || !session.hand.sides[0].opened) await page.getByRole("button", { name: "Suggest groups", exact: true }).click();
    await page.getByRole("button", { name: action.type === "meld" ? "Confirm melds" : "Confirm pickup", exact: true }).click();
  } else if (action.type === "special") await page.getByRole("button", { name: /^Declare / }).click();
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
  test(`Canasta play and resume at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await seed(page);
    const board = page.locator(".canasta-table"), hand = page.getByLabel("Your Canasta hand", { exact: true });
    const original = (await board.boundingBox())!;
    await expect(hand.getByRole("button")).toHaveCount(13);
    for (let i = 0; i < 8; i++) await move(page, await saved(page));
    expect((await board.boundingBox())!.height).toBeCloseTo(original.height, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const handBox = (await hand.locator("..").boundingBox())!, boardBox = (await board.boundingBox())!;
    expect(await page.locator(".meld-area").evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(38);
    const meldBox = (await page.locator(".meld-area").boundingBox())!;
    expect(meldBox.y + meldBox.height).toBeLessThanOrEqual(boardBox.y + boardBox.height);
    expect(handBox.y).toBeGreaterThanOrEqual(boardBox.y + boardBox.height);
    const controls = (await page.locator(".action-row").boundingBox())!;
    expect(controls.y).toBeGreaterThanOrEqual(handBox.y + handBox.height);
    expect(controls.y + controls.height).toBeLessThanOrEqual(await usableHeight(page));
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: info.outputPath("canasta-play.png"), fullPage: true });
    const before = await saved(page); await page.reload();
    await page.getByRole("button", { name: "Continue Canasta", exact: true }).click();
    expect(await saved(page)).toEqual(before); expect(errors).toEqual([]);
  });
}

test("Canasta stages melds without changing the match until confirmed", async ({ page }, info) => {
  let session = createCanastaSession(3), steps = 0;
  while (steps++ < 800 && session.hand.phase !== "complete") {
    if (session.hand.turn === 0 && session.hand.phase === "play" && suggestedCanastaMelds(canastaObservation(session)).length) break;
    session = transitionCanastaSession(session, chooseCanastaAction(canastaObservation(session)));
  }
  expect(session.hand.phase).toBe("play"); expect(session.hand.turn).toBe(0);
  await page.setViewportSize({ width: 360, height: 740 }); await seed(page, session);
  await page.getByRole("button", { name: "Meld cards", exact: true }).click();
  await page.getByRole("button", { name: "Suggest groups", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm melds", exact: true })).toBeEnabled();
  expect(await saved(page)).toEqual(session);
  await page.screenshot({ path: info.outputPath("canasta-melds.png"), fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await saved(page)).toEqual(session);
  await page.getByRole("button", { name: "Meld cards", exact: true }).click();
  await page.getByRole("button", { name: "Suggest groups", exact: true }).click();
  await page.getByRole("button", { name: "Confirm melds", exact: true }).click();
  expect((await saved(page)).hand.sides[0].melds.length).toBeGreaterThan(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Canasta crowded hands scroll without shifting the board or controls", async ({ page }, info) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport); await page.goto("/");
    await page.evaluate(async () => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { mount } = await load("/node_modules/svelte/src/index-client.js");
      const { default: View } = await load("/src/features/canasta/CanastaHandView.svelte");
      const { createCanastaSession } = await load("/src/domain/canastaSession.ts");
      const { canastaDeck } = await load("/src/domain/canastaRules.ts");
      const session = createCanastaSession(3), deck = canastaDeck(0);
      session.hand.hands = [deck.filter((card: any) => card.rank !== "3").slice(0, 48), [], [], []];
      const used = new Set(session.hand.hands[0].map((card: any) => card.id));
      session.hand.stock = deck.filter((card: any) => !used.has(card.id));
      session.hand.phase = "play";
      const target = document.createElement("main"); target.className = "app-shell fixed-play-screen";
      document.getElementById("app")!.replaceChildren(target);
      window.scrollTo(0, 0);
      mount(View, { target, props: { session, error: "", onAction: () => false, onBack: () => {}, onNext: () => {}, onReplay: () => {}, onNew: () => {} } });
    });
    const hand = page.getByLabel("Your Canasta hand", { exact: true }), scroll = hand.locator("..");
    await expect(hand.getByRole("button")).toHaveCount(48);
    await expect(hand).toHaveCSS("display", "grid");
    await expect.poll(() => scroll.evaluate(element => element.clientHeight)).toBeLessThanOrEqual(164);
    await expect.poll(() => hand.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await scroll.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    const before = (await page.locator(".canasta-table").boundingBox())!, controls = (await page.locator(".action-row").boundingBox())!;
    await hand.getByRole("button").last().click();
    expect(await scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect((await page.locator(".canasta-table").boundingBox())!.height).toBeCloseTo(before.height, 1);
    expect((await page.locator(".action-row").boundingBox())!.y).toBeCloseTo(controls.y, 1);
    expect(controls.y + controls.height).toBeLessThanOrEqual(await usableHeight(page));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => hand.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: info.outputPath(`canasta-48-cards-${viewport.width}.png`), fullPage: true });
  }
});

test("Canasta teaches twelve decisions without changing a saved match", async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 740 }); await seed(page);
  const before = await saved(page);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const [topic, steps] of Object.entries(canastaExercises)) {
    await page.getByRole("button", { name: /^(Start learning|Continue learning)$/ }).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index], answers = topic === "discard" ? step.session.hand.hands[0].map(card => card.id) : ["yes", "no"];
      const correct = answers.find(answer => answerCanastaExercise(topic, step, answer).good)!;
      if (topic === "discard") await page.getByLabel("Canasta exercise hand", { exact: true }).getByRole("button", { name: label(step.session.hand.hands[0].find(card => card.id === correct)!), exact: true }).click();
      else await page.getByLabel("Canasta choices").getByRole("button").nth(correct === "yes" ? 0 : 1).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".outcome")).toHaveText("Good");
      if (!index) await page.screenshot({ path: info.outputPath(`canasta-${topic}.png`), fullPage: true });
      await page.getByRole("button", { name: index === 2 ? "Finish practice" : "Next decision", exact: true }).click();
    }
    await page.getByRole("button", { name: "Finish Canasta", exact: true }).click();
  }
  await expect(page.getByLabel("Canasta course progress")).toContainText("4 / 4 complete");
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: /^Reference/ }).click();
  await expect(page.getByRole("heading", { name: "Canasta reference", exact: true })).toBeVisible();
  await expect(page.getByLabel("Variants and varieties")).toContainText("Modern American");
});

test("Canasta hand completion scores once and advances", async ({ page }, info) => {
  let session = createCanastaSession(2), count = 0;
  while (session.hand.phase !== "complete" && count++ < 1000) session = transitionCanastaSession(session, chooseCanastaAction(canastaObservation(session)));
  await seed(page, session);
  await expect(page.getByLabel("Canasta hand scoring")).toBeVisible();
  await page.screenshot({ path: info.outputPath("canasta-result.png"), fullPage: true });
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  expect((await saved(page)).handNumber).toBe(2); expect((await saved(page)).scores).toEqual(session.scores);
});
