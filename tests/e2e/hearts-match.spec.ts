import { expect, test, type Page } from "@playwright/test";
import { startBrowserHeartsHand, playBrowserHeartsCard } from "../../src/browserHandFallback";
import type { FullHandState, Seat } from "../../src/lessonTypes";

const saveKey = "barbu.savedHeartsRun.v1";
const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
const emptyScores = () => ({ Tutor: 0, Right: 0, You: 0, Left: 0 });

function finalDeal(seed = 8) {
  let hand = startBrowserHeartsHand(seed);
  for (let i = 0; i < 12; i++) hand = playBrowserHeartsCard(hand, hand.legalCardIds[0]);
  const complete = playBrowserHeartsCard(hand, hand.legalCardIds[0]);
  const points = emptyScores();
  for (const trick of complete.completedTricks) points[seats[trick.winnerIndex]] += trick.penalty;
  const shooter = seats.find(seat => points[seat] === 26);
  if (shooter) for (const seat of seats) points[seat] = seat === shooter ? 0 : 26;
  const trigger = seats.find(seat => seat !== "You" && points[seat] > 0)!;
  return { hand, complete, points, trigger, shooter };
}

async function resume(page: Page, hand: FullHandState, scores: Record<Seat, number>) {
  await page.addInitScript(({ saveKey, saved }) => localStorage.setItem(saveKey, JSON.stringify(saved)), {
    saveKey,
    saved: { version: 1, view: "fullHand", passDirection: "hold", scores, results: [],
      heartsPassingHand: null, fullHand: hand, heartsPassSelectedCardIds: [], fullHandReviewTrickCount: 0,
      usingBrowserHeartsPass: true, usingBrowserFullHand: true, savedAt: new Date().toISOString() }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
}

for (const target of [99, 100, 101]) {
  test(`Hearts settles an opponent at ${target} after the final card`, async ({ page }, info) => {
    const { hand, points, trigger } = finalDeal();
    const scores = { Tutor: 30, Right: 40, You: 0, Left: 50, [trigger]: target - points[trigger] };
    await resume(page, hand, scores);
    await expect(page.getByRole("button", { name: "New match", exact: true })).toHaveCount(0);
    await page.getByLabel("Your Hearts hand").locator(".hand-card.legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    if (target < 100) {
      await expect(page.getByRole("button", { name: "Next hand", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "New match", exact: true })).toHaveCount(0);
      return;
    }
    await expect(page.getByRole("heading", { name: "You won Hearts", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Hearts match complete", exact: true })).toBeVisible();
    await expect(page.getByLabel("Hearts result summary")).toContainText(`reached ${target} points`);
    await expect(page.getByLabel("Hearts result summary")).toContainText(`You win with ${points.You}`);
    await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New match", exact: true })).toBeVisible();
    await expect(page.getByLabel("Hearts match summary")).toContainText(`Hand 1: ${points.You}`);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), saveKey)).toBeNull();
    await page.screenshot({ path: info.outputPath(`hearts-match-${target}.png`), fullPage: true });
    await page.getByRole("button", { name: "New match", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Pass cards", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).scores, saveKey)).toEqual(emptyScores());
  });
}

test("Hearts completed-match resume shows the final winner immediately", async ({ page }) => {
  const { complete, points, trigger } = finalDeal();
  await resume(page, complete, { Tutor: 30, Right: 40, You: 0, Left: 50, [trigger]: 100 - points[trigger] });
  await expect(page.getByRole("heading", { name: "You won Hearts", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hearts result summary")).toContainText("reached 100 points");
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), saveKey)).toBeNull();
});

test("Hearts identifies the low-score winner when You reach 100", async ({ page }) => {
  const { complete, points } = finalDeal();
  await resume(page, complete, { Tutor: 0, Right: 30, You: 100 - points.You, Left: 40 });
  await expect(page.getByRole("heading", { name: "You finished 4th", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hearts result summary")).toContainText(`You reached 100 points. Barbu wins with ${points.Tutor}`);
  await expect(page.getByRole("button", { name: "New match", exact: true })).toBeVisible();
});

test("Hearts reports tied winners consistently at the match boundary", async ({ page }) => {
  const { complete, points } = finalDeal();
  await resume(page, complete, { Tutor: 30 - points.Tutor, Right: 100 - points.Right, You: 30 - points.You, Left: 40 });
  await expect(page.getByRole("heading", { name: "You tied the match", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hearts result summary")).toContainText("You and Barbu tie with 30");
  await expect(page.getByLabel("Hearts match summary")).toContainText("You and Barbu");
});

test("Hearts applies shooting the moon before checking the match target", async ({ page }) => {
  let deal = finalDeal();
  for (let seed = 0; seed < 256 && !deal.shooter; seed++) deal = finalDeal(seed);
  expect(deal.shooter, "A deterministic moon deal must be available").toBeDefined();
  const scores = emptyScores();
  for (const seat of seats) scores[seat] = seat === "You" ? 0 : 74;
  await resume(page, deal.complete, scores);
  await expect(page.getByRole("button", { name: "New match", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hearts result summary")).toContainText("shot the moon");
  await expect(page.getByLabel("Hearts result summary")).toContainText("reached 100 points");
});
