import { expect, test, type Page } from "@playwright/test";
import { euchreTopics } from "../../src/games/euchre";
import { euchreLearningSteps, euchreExerciseChoices } from "../../src/lessons/euchre/exercises";
import { euchreRecommendedChoice } from "../../src/domain/euchreLearning";
import { euchreSaveKey, restoreEuchreSession } from "../../src/persistence/euchreSave";
import { euchreComplete, euchrePosition } from "../../src/domain/euchreSession";
import { chooseEuchreAction } from "../../src/domain/euchrePolicy";
import { euchreSuitNames } from "../../src/presentation/euchreDisplay";
import { suitSymbol } from "../../src/presentation/cardDisplay";

const learn = "/?preview=euchre&tab=learn&seed=1";
async function choose(page: Page, step: ReturnType<typeof euchreLearningSteps>[number], answer = euchreRecommendedChoice(step)) {
  const choices = euchreExerciseChoices(step), label = choices.find(choice => choice.id === answer)!.label;
  if (step.kind === "call" || step.kind === "score") await page.getByLabel("Euchre answer choices", { exact: true }).getByRole("button", { name: label, exact: true }).click();
  else {
    const card = step.hand.find(card => card.id === answer)!;
    await page.getByLabel("Your Euchre exercise hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
  }
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}
async function expectFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const actions = page.locator(".table-play-panel > .action-row");
  await expect(actions.getByRole("button").last()).toBeInViewport({ ratio: 1 });
  const hand = page.locator(".table-play-panel .full-hand-cards");
  if (await hand.count()) {
    const h = await hand.boundingBox(), a = await actions.boundingBox();
    expect(h!.y + h!.height).toBeLessThanOrEqual(a!.y + 1);
  }
}

test("Euchre completes all six topics, records review and hands off to Play", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 320, height: 568 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(learn);
  for (const topic of euchreTopics) {
    await page.locator(`[data-skill="${topic.id}"] .lesson-topic`).click();
    for (const [index, step] of euchreLearningSteps(topic.action).entries()) {
      await expect(page.getByLabel("Euchre exercise", { exact: true })).toBeVisible();
      await expectFits(page);
      const board = await page.locator(".play-board-region").count() ? await page.locator(".play-board-region").boundingBox() : null;
      await choose(page, step);
      await expect(page.locator(".coach-feedback")).toContainText("Good");
      if (board) expect(Math.abs((await page.locator(".play-board-region").boundingBox())!.height - board.height)).toBeLessThanOrEqual(1);
      await expectFits(page);
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1") ?? "{}"));
    expect(progress[topic.id]).toBe(true);
    await page.getByText("Review decisions", { exact: true }).click();
    await page.locator(".decision-review summary").first().click();
    await expect(page.getByText("Your choice", { exact: false }).first()).toBeVisible();
    await page.goto(learn);
  }
  await expect(page.getByText("Learning path complete", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Euchre progress", { exact: true })).toContainText("6 / 6 complete");
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Play Euchre", exact: true }).click();
  await expect(page.getByLabel("Your Euchre hand", { exact: true }).locator(".hand-card")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("Euchre calling lessons contain the upcard and keep guidance beside the position", async ({ page }, info) => {
  test.setTimeout(60000);
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 440, height: 960 }, { width: 1366, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(learn);
    await page.locator('[data-skill="euchre-second"] .lesson-topic').click();
    const facts = page.getByLabel("Euchre exercise position", { exact: true });
    await expect(facts).toContainText("Not chosen");
    const card = (await facts.locator(".upcard img").boundingBox())!;
    const frame = (await facts.locator(".upcard").boundingBox())!;
    const details = (await facts.locator("dl").boundingBox())!;
    const position = (await facts.boundingBox())!;
    const guidance = (await page.getByLabel("Turn guidance", { exact: true }).boundingBox())!;
    expect(card.x + card.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    expect(card.y + card.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
    expect(card.x + card.width + 8).toBeLessThanOrEqual(details.x);
    expect(guidance.y - position.y - position.height).toBeLessThanOrEqual(12);
    await expectFits(page);
    const hand = (await page.getByLabel("Your Euchre exercise hand", { exact: true }).boundingBox())!;
    await choose(page, euchreLearningSteps("second")[0]);
    expect((await page.getByLabel("Your Euchre exercise hand", { exact: true }).boundingBox())!.y).toBeCloseTo(hand.y, 0);
    await expectFits(page);
    await page.screenshot({ path: info.outputPath(`calling-layout-${viewport.width}.png`) });
  }
});

test("a wrong Euchre decision adds a different companion and leaves progress incomplete until finished", async ({ page }) => {
  await page.goto(learn);
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  const first = euchreLearningSteps("bowers")[0];
  await choose(page, first, "AH");
  await expect(page.locator(".coach-feedback")).toContainText("Risky");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1") ?? "{}")["euchre-bowers"])).not.toBe(true);
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.locator("header h1")).toHaveText("The other red trump");
  await choose(page, first.followUp!);
  await page.getByRole("button", { name: "Next decision", exact: true }).click();
  await page.locator("header").getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.getByLabel("Euchre progress", { exact: true })).toContainText("0 / 6 complete");
});

test("Euchre rules and lesson explanation use the common reference and course surfaces", async ({ page }) => {
  await page.goto(learn);
  await page.getByRole("button", { name: /^Game rules/ }).click();
  await expect(page.getByRole("heading", { name: "Euchre rules", exact: true })).toBeVisible();
  await expect(page.getByText("Captured cards have no individual point values.", { exact: false })).toBeVisible();
  await page.locator("header").getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Read lesson: Meet the bowers", exact: true }).click();
  await expect(page.getByLabel("Euchre course content", { exact: true })).toContainText("Two jacks lead the trump suit.");
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await expect(page.locator(".learning-example-hand img")).toHaveCount(5);
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  await expect(page.getByLabel("Your Euchre exercise hand", { exact: true }).getByRole("button")).toHaveCount(5);
});

test("guided Euchre explains every decision, keeps the board stable and does not change the match save", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?preview=euchre&seed=1");
  const saved = await page.evaluate(key => localStorage.getItem(key), euchreSaveKey);
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  await expect(page.getByLabel("Turn guidance", { exact: true })).toContainText("Rule:");
  await page.getByRole("button", { name: "Order up", exact: true }).click();
  const board = await page.locator(".play-board-region").boundingBox();
  for (let trick = 0; trick < 5; trick++) {
    await expect(page.getByLabel("Turn guidance", { exact: true })).toContainText("Tactic:");
    await expectFits(page);
    await page.getByLabel("Your Euchre hand", { exact: true }).locator("button.legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    if (trick < 4) {
      await expect(page.getByLabel("Turn guidance", { exact: true })).toContainText("wins with");
      expect(Math.abs((await page.locator(".play-board-region").boundingBox())!.height - board!.height)).toBeLessThanOrEqual(1);
      await expectFits(page);
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }
  await expect(page.getByText("Guided hand complete", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Your hand in review", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), euchreSaveKey)).toBe(saved);
  await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Play", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Continue Euchre", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).events, euchreSaveKey)).toEqual(JSON.parse(saved!).events);
});

test("Euchre calling format is a keyboard-accessible Partner / Alone selector", async ({ page }) => {
  await page.goto("/?preview=euchre&seed=1");
  const alone = page.getByRole("radio", { name: "Go alone", exact: true });
  await expect(page.getByRole("radio", { name: "With partner", exact: true })).toBeChecked();
  await alone.check();
  await expect(alone).toBeChecked();
  await alone.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "With partner", exact: true })).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(alone).toBeChecked();
  await page.getByRole("button", { name: "Order up", exact: true }).click();
  await expect(page.getByText("South called ♣ alone. Makers need 3 tricks.", { exact: true })).toBeVisible();
  await expect(page.locator(".tutor-slot")).toContainText("Sits out");
});

test("an independent Euchre match ends at ten, emits completion and keeps its settled score on refresh", async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    (window as any).euchreCompleted = [];
    window.addEventListener("barbu:game-completed", event => (window as any).euchreCompleted.push((event as CustomEvent).detail));
  });
  await page.goto("/?preview=euchre&seed=1");
  await expect(page.getByRole("button", { name: "Order up", exact: true })).toBeVisible();
  let finished = false;
  for (let decision = 0; decision < 350; decision++) {
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), euchreSaveKey);
    const session = restoreEuchreSession(saved);
    if (euchreComplete(session)) { finished = true; break; }
    const hand = session.hand;
    if (["complete", "passed_out"].includes(hand.phase)) {
      await page.getByRole("button", { name: "Next hand", exact: true }).click();
    } else if (hand.phase === "review") await page.getByRole("button", { name: "Next trick", exact: true }).click();
    else {
      const action = chooseEuchreAction(euchrePosition(hand, 2));
      if (action.type === "pass") await page.getByRole("button", { name: "Pass", exact: true }).click();
      else if (action.type === "call") {
        if (action.alone) await page.getByRole("radio", { name: "Go alone", exact: true }).check();
        if (hand.round === 2) await page.getByRole("button", { name: `Call ${euchreSuitNames[action.trump]}`, exact: true }).click();
        await page.getByLabel("Euchre turn actions").getByRole("button", { name: hand.round === 1 ? "Order up" : `Call ${suitSymbol(action.trump)}`, exact: true }).click();
      } else if (action.type === "discard" || action.type === "play-card") {
        const card = hand.hands[2].find(card => card.id === action.cardId)!;
        await page.getByLabel("Your Euchre hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
        await page.getByRole("button", { name: action.type === "discard" ? "Discard" : "Play card", exact: true }).click();
      }
    }
  }
  expect(finished).toBe(true);
  await expect(page.getByLabel("Euchre game complete", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).euchreCompleted)).toHaveLength(1);
  const score = await page.getByLabel("Euchre score calculation").textContent();
  await page.reload();
  await expect(page.getByLabel("Euchre score calculation")).toHaveText(score!);
  await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New game", exact: true })).toBeVisible();
});

test("Euchre uses verified Premium access and preserves the match while access is unavailable", async ({ page }) => {
  test.skip(process.env.BARBU_PACKAGED_PREVIEW === "1", "Internal iOS does not use purchase access.");
  await page.addInitScript(() => {
    const w = window as any;
    w.isTauri = true; w.euchrePremium = true; w.euchreBillingCalls = [];
    w.__TAURI_INTERNALS__ = { invoke: async (_command: string, args: { operation: string }) => {
      w.euchreBillingCalls.push(args.operation);
      if (args.operation === "availability") return { available: true, purchasesEnabled: true };
      if (args.operation === "offers") return { offers: [] };
      return { customer: { verification: "verified", entitlement: "premium", active: w.euchrePremium,
        checkedAt: Date.now(), expiresAt: w.euchrePremium ? Date.now() + 600000 : null, willRenew: w.euchrePremium } };
    } };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Euchre", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Play Euchre", exact: true }).click();
  await expect(page.getByLabel("Your Euchre hand", { exact: true })).toBeVisible();
  const saved = await page.evaluate(key => localStorage.getItem(key), euchreSaveKey);
  await page.evaluate(() => { (window as any).euchrePremium = false; window.dispatchEvent(new Event("focus")); });
  await expect(page.getByLabel("Barbu Premium", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), euchreSaveKey)).toBe(saved);
  await page.evaluate(() => { (window as any).euchrePremium = true; window.dispatchEvent(new Event("focus")); });
  await expect(page.getByLabel("Your Euchre hand", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), euchreSaveKey)).toBe(saved);
  expect(await page.evaluate(() => (window as any).euchreBillingCalls.includes("purchase"))).toBe(false);
});
