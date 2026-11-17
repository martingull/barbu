import { expect, test, type Page } from "@playwright/test";
import { createCanastaSession, transitionCanastaSession, type CanastaSession } from "../../src/domain/canastaSession";
import { advanceCanastaOpponents, canastaObservation, chooseCanastaAction, suggestedCanastaMelds } from "../../src/domain/canastaPolicy";
import { canastaSaveKey, restoreCanastaSession, saveCanastaSession } from "../../src/persistence/canastaSave";
import { canastaExercises, canastaLearningSteps, canastaExerciseChoices, answerCanastaExercise } from "../../src/lessons/canasta/exercises";
import { formatCardLabel } from "../../src/presentation/cardDisplay";
import { compareCanastaCardsForDisplay, sortCardsForDisplay } from "../../src/presentation/cardOrdering";
import { canastaCourses } from "../../src/lessons/canasta/courses";
test.skip(process.env.VITE_CANASTA_PREVIEW !== "1" && process.env.BARBU_PACKAGED_PREVIEW !== "1", "Run a Canasta preview configuration.");

test("Canasta preview opens without purchasing or granting Premium", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open Canasta", exact: true })).toContainText("Internal preview");
  await expect(page.getByRole("button", { name: "Premium", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Learn", exact: true })).toBeVisible();
});

test("Canasta puts rules first and teaches card values before opening points", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("barbu.courseProgress.v1", JSON.stringify({ "canasta-melds": true })));
  for (const size of [{ width: 320, height: 568 }, { width: 393, height: 805 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    const resources = page.getByRole("region", { name: "Learning resources", exact: true });
    await expect(resources).toHaveCount(1);
    await expect(resources.locator("strong")).toHaveText("Game rules");
    await expect(resources.locator("small")).toHaveText("Read the rules, scoring and variations.");
    expect(await page.locator(".learn-panel > section").first().getAttribute("aria-label")).toBe("Learning resources");
    await expect(page.getByLabel("Continue learning")).toContainText("Count card points");
    await expect(page.getByLabel("Canasta course progress")).toContainText("1 / 8 complete");
    await page.screenshot({ path: info.outputPath(`canasta-learn-values-${size.width}.png`), fullPage: true });
    await resources.getByRole("button", { name: /^Game rules/ }).click();
    const sections = page.getByLabel("Canasta rules sections").locator("article");
    await expect(sections.first()).toContainText("Card values");
    await expect(sections.first()).toContainText("150 card points");
    await page.locator('header[aria-label="Canasta rules"]').getByRole("button", { name: "Table", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.getByRole("button", { name: "Continue lesson", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Each card has a point value.", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`canasta-card-values-${size.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "See example", exact: true }).click();
    const example = page.getByLabel("Canasta example", { exact: true });
    await expect(example.locator("img")).toHaveCount(7);
    await expect.poll(() => example.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`canasta-150-example-${size.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    await expect(page.getByRole("button", { name: "30 points", exact: true })).toBeVisible();
  }
});

const label = (card: { rank: string; suit: "C" | "D" | "H" | "S"; id: string }) => `${formatCardLabel(card)}, pack ${Number(card.id[0]) + 1}`;
async function saved(page: Page) { return restoreCanastaSession(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), canastaSaveKey)); }
const ordered = (cards: CanastaSession["hand"]["hands"][number]) => sortCardsForDisplay(cards, compareCanastaCardsForDisplay);
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
    const initial = await saved(page), beforeSelection = ordered(initial.hand.hands[0]).map(label);
    expect(await hand.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(beforeSelection);
    await hand.getByRole("button", { name: beforeSelection[0], exact: true }).click();
    await expect(hand.getByRole("button", { name: beforeSelection[0], exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await hand.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(beforeSelection);
    expect(await saved(page)).toEqual(initial);
    for (let i = 0; i < 8; i++) await move(page, await saved(page));
    const after = await saved(page);
    expect(await hand.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(ordered(after.hand.hands[0]).map(label));
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
  const editorHand = page.getByLabel("Cards for melding", { exact: true });
  expect(await editorHand.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(ordered(session.hand.hands[0]).map(label));
  const firstCard = ordered(session.hand.hands[0])[0];
  await editorHand.getByRole("button", { name: label(firstCard), exact: true }).click();
  await expect(editorHand.getByRole("button", { name: label(firstCard), exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await editorHand.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(ordered(session.hand.hands[0]).map(label));
  await page.getByRole("button", { name: "Suggest groups", exact: true }).click();
  const suggested = suggestedCanastaMelds(canastaObservation(session));
  const stagedIds = new Set(suggested.flatMap(group => group.cardIds));
  expect(await editorHand.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(ordered(session.hand.hands[0].filter(card => !stagedIds.has(card.id))).map(label));
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
  test.skip(process.env.BARBU_PACKAGED_PREVIEW === "1", "Component stress fixture requires the Vite module server; covered by ui:test:canasta.");
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

test("Canasta teaches twenty-four decisions without changing a saved match", async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 740 }); await seed(page);
  const before = await saved(page);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const topic of Object.keys(canastaExercises)) {
    const steps = canastaLearningSteps(topic);
    await page.getByRole("button", { name: /^(Start lesson|Continue lesson)$/ }).click();
    if (topic === "values") {
      await expect(page.getByRole("heading", { name: "Each card has a point value.", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "See example", exact: true }).click();
      await expect(page.getByText(/Together: 30 \+ 120 = 150 card points/)).toBeVisible();
      const example = canastaCourses[0].example.tableCards.map(play => play.card);
      expect(await page.getByLabel("Canasta example", { exact: true }).locator("img").evaluateAll(images => images.map(image => image.getAttribute("alt")))).toEqual(ordered(example).map(formatCardLabel));
      await page.getByRole("button", { name: "Try cards", exact: true }).click();
    }
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index], choices = canastaExerciseChoices(topic, step), answers = choices.map(choice => choice.id);
      const correct = answers.find(answer => answerCanastaExercise(topic, step, answer).good)!;
      if (topic !== "discard") expect(await page.getByLabel("Canasta exercise hand", { exact: true }).locator("img").evaluateAll(images => images.map(image => image.getAttribute("alt")))).toEqual(ordered(step.session.hand.hands[0]).map(formatCardLabel));
      if (topic === "discard") await page.getByLabel("Canasta exercise hand", { exact: true }).getByRole("button", { name: label(step.session.hand.hands[0].find(card => card.id === correct)!), exact: true }).click();
      else await page.getByLabel("Canasta choices").getByRole("button", { name: choices.find(choice => choice.id === correct)!.label, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".outcome")).toHaveText("Good");
      if (!index) await page.screenshot({ path: info.outputPath(`canasta-${topic}.png`), fullPage: true });
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    if (topic === "values") {
      await page.getByText("Review decisions", { exact: true }).click();
      const firstReview = page.getByRole("list", { name: "Decision results" }).locator(".decision-review").first();
      await firstReview.locator("summary").click();
      expect(await firstReview.getByRole("group", { name: "Your hand", exact: true }).locator("img").evaluateAll(images => images.map(image => image.getAttribute("alt")))).toEqual(ordered(steps[0].session.hand.hands[0]).map(formatCardLabel));
    }
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  }
  await expect(page.getByLabel("Canasta course progress")).toContainText("8 / 8 complete");
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: /^Game rules/ }).click();
  await expect(page.getByRole("heading", { name: "Canasta rules", exact: true })).toBeVisible();
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
