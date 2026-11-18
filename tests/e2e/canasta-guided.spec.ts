import { test, expect } from "@playwright/test";
import { createCanastaGuidedSession, transitionCanastaGuidedSession } from "../../src/domain/canastaLearning";
import { chooseCanastaAction, canastaObservation } from "../../src/domain/canastaPolicy";
import { createCanastaSession } from "../../src/domain/canastaSession";
import { canastaSaveKey, saveCanastaSession } from "../../src/persistence/canastaSave";
import { formatCardLabel } from "../../src/presentation/cardDisplay";
import { compareCanastaCardsForDisplay, sortCardsForDisplay } from "../../src/presentation/cardOrdering";
import { canastaMeldChangeText } from "../../src/features/canasta/canastaScorePresentation";

test.skip(process.env.VITE_CANASTA_PREVIEW !== "1" && process.env.BARBU_PACKAGED_PREVIEW !== "1", "Run a Canasta preview configuration.");

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`guided Canasta finishes and preserves saves at ${size.width}x${size.height}`, async ({ page }, info) => {
    test.setTimeout(150000);
    await page.setViewportSize(size);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const saved = JSON.stringify(saveCanastaSession(createCanastaSession(9), "2026-11-16"));
    await page.addInitScript(({ key, saved }) => {
      localStorage.setItem(key, saved);
      localStorage.setItem("barbu.practiceSeed.v1", "3");
      (window as any).completions = [];
      window.addEventListener("barbu:game-completed", event => (window as any).completions.push(event));
    }, { key: canastaSaveKey, saved });
    await page.goto("/");
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    const entry = page.getByRole("region", { name: "Play with guidance", exact: true });
    await expect(entry).toContainText("Complete two seven-card canastas before going out.");
    await expect(entry).toContainText("advice before each move and an explanation afterwards");
    await expect(entry).toContainText("Your saved game is unchanged.");
    if (size.width === 360) await page.screenshot({ path: info.outputPath("canasta-guided-entry.png"), fullPage: true });
    await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
    const board = page.locator(".canasta-table"), hand = page.getByLabel("Your Canasta hand", { exact: true });
    const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
    const actions = page.locator(".table-play-panel > .action-row");
    const baseline = (await board.boundingBox())!;
    await expect(guidance.locator(".result")).toHaveText("Rule: The discard pile is empty.");
    await expect(guidance).toContainText("Tactic: Choose Draw stock instead.");
    await expect(actions.getByRole("button", { name: "Draw stock", exact: true })).toBeEnabled();
    await expect(actions.getByRole("button", { name: "Take pile", exact: true })).toBeDisabled();
    const opening = await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
    async function fits() {
      const bounds = (await board.boundingBox())!, feedback = (await guidance.boundingBox())!;
      const cards = (await hand.locator("..").boundingBox())!, buttons = (await actions.boundingBox())!;
      expect(bounds.height).toBeCloseTo(baseline.height, 0);
      expect(feedback.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
      expect(cards.y).toBeGreaterThanOrEqual(feedback.y + feedback.height);
      expect(buttons.y).toBeGreaterThanOrEqual(cards.y + cards.height);
      expect(buttons.y + buttons.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    let state = createCanastaGuidedSession(3), count = 0;
    while (state.session.hand.phase !== "complete" && count++ < 200) {
      await expect(guidance).toContainText("Rule:");
      await expect(guidance).toContainText("Tactic:");
      await fits();
      if (count === 1) await page.screenshot({ path: info.outputPath("canasta-guided-opening.png") });
      const action = chooseCanastaAction(canastaObservation(state.session));
      if (action.type === "next") throw Error("Unexpected next hand");
      if (action.type === "draw") await actions.getByRole("button", { name: /^(Draw stock|End hand)$/ }).click();
      else if (action.type === "discard" || action.type === "expose") {
        const card = state.session.hand.hands[0].find(card => card.id === action.cardId)!;
        await hand.getByRole("button", { name: `${formatCardLabel(card)}, pack ${Number(card.id[0]) + 1}`, exact: true }).click();
        await actions.getByRole("button", { name: action.type === "expose" ? "Expose three" : /^(Discard|Go out)$/, exact: true }).click();
      } else if (action.type === "meld" || action.type === "pickup") {
        await actions.getByRole("button", { name: action.type === "meld" ? "Meld cards" : "Take pile", exact: true }).click();
        await expect(page.getByRole("dialog").locator(".guided-instruction")).toContainText(action.type === "pickup" && state.session.hand.sides[0].opened
          ? "Your natural pair is included automatically" : "Check the staged groups before confirming");
        if (action.type === "meld" || !state.session.hand.sides[0].opened) await page.getByRole("button", { name: "Suggest groups", exact: true }).click();
        await page.getByRole("button", { name: action.type === "meld" ? "Confirm melds" : "Confirm pickup", exact: true }).click();
      } else await actions.getByRole("button", { name: /^Declare / }).click();
      state = transitionCanastaGuidedSession(state, action);
      if (state.review) {
        await expect(hand.getByRole("button")).toHaveCount(0);
        expect(await hand.locator("img").evaluateAll(images => images.map(image => image.getAttribute("alt")))).toEqual(sortCardsForDisplay(state.session.hand.hands[0], compareCanastaCardsForDisplay).map(formatCardLabel));
        await expect(board.getByRole("button", { name: "Draw stock", exact: true })).toBeDisabled();
        await expect(guidance.locator(".result")).toContainText("Next: Continue");
        await expect(guidance).toContainText("Your move:");
        if (action.type === "draw") await expect(guidance).toContainText("Drawing does not end your turn.");
        if (state.review.meldChanges.length) await expect(guidance).toContainText(canastaMeldChangeText(state.review.meldChanges));
        await fits();
        if (count === 1 || action.type === "meld") await page.screenshot({ path: info.outputPath(`canasta-guided-review-${action.type}.png`) });
        const feedbackHeight = (await guidance.boundingBox())!.height;
        await guidance.evaluate(element => { element.scrollTop = element.scrollHeight; });
        expect((await guidance.boundingBox())!.height).toBe(feedbackHeight);
        expect((await board.boundingBox())!.height).toBeCloseTo(baseline.height, 0);
        await actions.getByRole("button", { name: "Continue", exact: true }).click();
        state = transitionCanastaGuidedSession(state, { type: "continue" });
        await expect.poll(() => guidance.evaluate(element => element.scrollTop)).toBe(0);
      }
    }
    expect(state.session.hand.phase).toBe("complete");
    await expect(page.getByRole("heading", { name: "Guided hand complete", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Your Canasta decisions", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("canasta-guided-result.png"), fullPage: true });
    await page.getByRole("button", { name: "Replay", exact: true }).click();
    expect(await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await expect(page.getByLabel("Canasta course progress")).toContainText("0 / 8 complete");
    expect(await page.evaluate(key => localStorage.getItem(key), canastaSaveKey)).toBe(saved);
    expect(await page.evaluate(() => (window as any).completions)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("a missed Canasta lesson adds one example and records review evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator('[data-skill="canasta-melds"] .lesson-topic').click();
  await expect(page.getByText("Worked example", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep cards", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Keep cards", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.getByText("Another example", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Meld", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Next decision", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Keep cards", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByRole("button", { name: i ? "Finish topic" : "Next decision", exact: true }).click();
  }
  await expect(page.getByText("3 of 4 decisions matched the lesson's goal.", { exact: true })).toBeVisible();
  await page.getByText("Review decisions", { exact: true }).click();
  await page.getByRole("list", { name: "Decision results" }).locator("summary").first().click();
  await expect(page.getByText("Match the rank", { exact: false }).first()).toBeVisible();
});
