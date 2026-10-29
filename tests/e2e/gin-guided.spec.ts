import { test, expect, type Page } from "@playwright/test";
import { createGinGuidedSession, transitionGinGuidedSession } from "../../src/domain/ginRummyLearning";
import { chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import { createGinSession } from "../../src/domain/ginRummySession";
import { ginSaveKey, saveGinSession } from "../../src/persistence/ginRummySave";

async function learn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`guided Gin completes, replays and preserves saves at ${size.width}x${size.height}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const saved = JSON.stringify(saveGinSession(createGinSession(9), "2026-10-29"));
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
      localStorage.setItem("barbu.practiceSeed.v1", "1");
      (window as any).completions = [];
      window.addEventListener("barbu:game-completed", event => (window as any).completions.push(event));
    }, { key: ginSaveKey, saved });
    await learn(page);
    await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
    const board = page.locator(".gin-table");
    const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
    const hand = page.getByLabel("Your Gin Rummy hand", { exact: true });
    const actions = page.getByLabel("Gin turn actions");
    const baseline = (await board.boundingBox())!;
    const opening = await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
    async function fits() {
      const bounds = (await board.boundingBox())!;
      expect(Math.abs(bounds.height - baseline.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds.y - baseline.y)).toBeLessThanOrEqual(1);
      const feedback = (await guidance.boundingBox())!, cards = (await hand.boundingBox())!, buttons = (await actions.boundingBox())!;
      expect(feedback.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
      expect(cards.y).toBeGreaterThanOrEqual(feedback.y + feedback.height);
      expect(buttons.y).toBeGreaterThanOrEqual(cards.y + cards.height);
      expect(buttons.y + buttons.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    let state = createGinGuidedSession(1), count = 0;
    while (state.session.hand.phase !== "complete" && count++ < 100) {
      await expect(guidance).toContainText("Rule:");
      await expect(guidance).toContainText("Tactic:");
      await fits();
      if (count === 1) await page.screenshot({ path: info.outputPath("gin-guided-opening.png") });
      const action = chooseGinAction(ginObservation(state.session));
      if (action.type === "next") throw Error("Unexpected next hand");
      if (action.type === "pass") await actions.getByRole("button", { name: "Pass upcard", exact: true }).click();
      else if (action.type === "draw") await actions.getByRole("button", { name: action.source === "stock" ? "Draw stock" : "Take upcard", exact: true }).click();
      else {
        const card = state.session.hand.hands[0].find(card => card.id === action.cardId)!;
        await hand.getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
        await expect(guidance).toContainText("Discarding");
        await fits();
        if (count < 5) await page.screenshot({ path: info.outputPath("gin-guided-discard.png") });
        await actions.getByRole("button", { name: action.knock ? /^(Knock|Go gin)$/ : "Discard", exact: true }).click();
      }
      state = transitionGinGuidedSession(state, action);
      if (state.review) {
        await expect(guidance).toContainText(/You (passed|drew|took|discarded)/);
        await expect(board.getByRole("button", { name: "Draw stock", exact: true })).toBeDisabled();
        await expect(hand.getByRole("button")).toHaveCount(0);
        await fits();
        if (count === 1 || count === 3) await page.screenshot({ path: info.outputPath(`gin-guided-review-${count}.png`) });
        await actions.getByRole("button", { name: "Continue", exact: true }).click();
        state = transitionGinGuidedSession(state, { type: "continue" });
      }
    }
    expect(state.session.hand.phase).toBe("complete");
    await expect(page.getByRole("heading", { name: "Guided hand complete", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Your hand in review", exact: true })).toContainText("Deadwood:");
    await expect(page.locator(".table-play-panel .action-row button")).toHaveText(["Replay", "Play without guidance"]);
    await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("gin-guided-complete.png"), fullPage: true });
    if (size.width === 360) {
      await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
      await expect(page.getByRole("tab", { name: "Play", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: "Continue Gin Rummy", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
    } else if (size.width === 820) {
      await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      expect(await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
      await expect(guidance).toContainText("Rule:");
      await page.getByRole("button", { name: "Table", exact: true }).first().click();
    }
    await expect(page.getByLabel("Gin Rummy course progress")).toContainText("0 / 5 complete");
    expect(await page.evaluate(key => localStorage.getItem(key), ginSaveKey)).toBe(saved);
    expect(await page.evaluate(() => (window as any).completions)).toEqual([]);
    expect(errors).toEqual([]);
  });
}
