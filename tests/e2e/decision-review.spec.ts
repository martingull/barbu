import { expect, test, type Page, type Locator } from "@playwright/test";

async function openExercise(page: Page, game: string, topic: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator(`[data-skill="${topic}"] .exercise-shortcut`).click();
}
async function finishDrill(page: Page) {
  for (let i = 0; i < 12; i++) {
    await page.locator(".drill-hand .hand-card").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    const done = page.getByRole("button", { name: "Finish topic", exact: true });
    if (await done.isVisible()) { await done.click(); return i + 1; }
    await page.getByRole("button", { name: /^(Next decision|Try another example)$/ }).click();
  }
  throw Error("Exercise did not finish");
}
async function openReview(page: Page, index = 0) {
  await page.getByText("Review decisions", { exact: true }).click();
  await page.locator(".decision-review > summary").nth(index).click();
  return page.getByRole("region", { name: `Decision ${index + 1} review`, exact: true });
}
async function checkImages(region: Locator) {
  await expect.poll(() => region.locator("img").evaluateAll(images => images.every(image =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

for (const [game, topic] of [["Hearts", "hearts-avoid"], ["Whist", "whist-follow-suit"], ["Spades", "spades-follow-suit"], ["Bridge", "bridge-declarer"], ["Barbu", "meet-contract"]]) {
  test(`${game} decision review retains the hand and explanation without replaying or changing progress`, async ({ page }, info) => {
    await openExercise(page, game, topic);
    const handImages = await page.locator(".drill-hand img").evaluateAll(images => images.map(img => img.getAttribute("src")).sort());
    const referenceImages = await page.locator(".reference-hand img").evaluateAll(images => images.map(img => img.getAttribute("src")).sort());
    const referenceLabel = await page.locator(".reference-hand").count() ? await page.locator(".reference-hand").getAttribute("aria-label") : null;
    await page.locator(".drill-hand .hand-card").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    const explanation = await page.locator(".explanation").textContent();
    await page.getByRole("button", { name: "Finish session", exact: true }).click();
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    const review = await openReview(page);
    await expect(review.locator(".review-explanation")).toContainText(explanation!);
    const hand = review.locator(".review-group").last();
    expect(await hand.locator("img").evaluateAll(images => images.map(img => img.getAttribute("src")).sort())).toEqual(handImages);
    if (referenceLabel) expect(await review.getByRole("group", { name: referenceLabel, exact: true }).locator("img")
      .evaluateAll(images => images.map(img => img.getAttribute("src")).sort())).toEqual(referenceImages);
    await expect(review.getByRole("button")).toHaveCount(0);
    for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
      await page.setViewportSize(viewport);
      await checkImages(review);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${game}-review-${viewport.width}.png`), fullPage: true });
    }
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    const count = await finishDrill(page);
    await page.getByText("Review decisions", { exact: true }).click();
    await expect(page.locator(".decision-review")).toHaveCount(count);
    const history = await page.evaluate(() => localStorage.getItem("barbu.playHistory.v1"));
    expect(history).not.toContain("selectedCardIds");
    expect(history).not.toContain("explanation");
  });
}

test("Hearts pass review preserves all three selected cards for each original hand", async ({ page }) => {
  await openExercise(page, "Hearts", "hearts-pass");
  const hands: string[][] = [];
  const choices: string[][] = [];
  for (let i = 0; i < 6; i++) {
    const hand = page.getByLabel("Your Hearts pass practice hand");
    hands.push(await hand.locator("img").evaluateAll(images => images.map(img => img.getAttribute("src")!)));
    for (let c = 0; c < 3; c++) await hand.getByRole("button").nth(c).click();
    choices.push(await hand.locator('[aria-pressed="true"] img').evaluateAll(images => images.map(img => img.getAttribute("src")!)));
    await page.getByRole("button", { name: "Check pass", exact: true }).click();
    const finish = page.getByRole("button", { name: "Finish topic", exact: true });
    if (await finish.isVisible()) { await finish.click(); break; }
    await page.getByRole("button", { name: /^(Next pass|Try another example)$/ }).click();
  }
  await page.getByText("Review decisions", { exact: true }).click();
  await expect(page.locator(".decision-review")).toHaveCount(hands.length);
  for (let i = 0; i < hands.length; i++) {
    await page.locator(".decision-review > summary").nth(i).click();
    const review = page.getByRole("region", { name: `Decision ${i + 1} review`, exact: true });
    expect(await review.locator("img").evaluateAll(images => images.map(img => img.getAttribute("src")))).toEqual(hands[i]);
    expect(await review.locator(".chosen img").evaluateAll(images => images.map(img => img.getAttribute("src")))).toEqual(choices[i]);
  }
});

test("winner and follow-up reviews keep separate four-card positions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  await page.getByLabel("Your drill hand").getByRole("button", { name: "3 C", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Next decision", exact: true }).click();
  await page.getByLabel("Which card won?", { exact: true }).getByRole("button", { name: "9 C", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await finishDrill(page);
  const winner = await openReview(page, 1);
  await expect(winner.locator("img")).toHaveCount(4);
  await expect(winner.getByRole("heading", { name: "Who wins the trick?", exact: true })).toBeVisible();
  await expect(winner.locator(".review-explanation")).toContainText("K♣ wins");
  await page.locator(".decision-review > summary").nth(2).click();
  const followUp = page.getByRole("region", { name: "Decision 3 review", exact: true });
  await expect(followUp.locator("img")).toHaveCount(4);
  await expect(followUp.getByRole("heading", { name: "Find another winner", exact: true })).toBeVisible();
  await expect(followUp.getByRole("img", { name: "J♠", exact: true })).toBeVisible();
});

test("authored Barbu lessons use the same decision review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByLabel("Your hand", { exact: true }).locator(".legal").first().click();
    await page.getByRole("button", { name: "Play selected", exact: true }).click();
    await page.getByRole("button", { name: i === 2 ? "Finish lesson" : "Next trick", exact: true }).click();
  }
  const review = await openReview(page);
  await expect(page.locator(".decision-review")).toHaveCount(3);
  await expect(review.getByRole("group", { name: "Your hand before your choice", exact: true })).toBeVisible();
  await checkImages(review);
});

for (const [game, topic, choices, explanation] of [
  ["Gin Rummy", "gin-knock", ["Go gin", "Go gin", "Go gin", "Go gin", "Go gin", "Go gin"], "Gin needs zero deadwood"],
  ["Bridge", "bridge-bidding", ["Pass", "1NT", "1♠"], ""],
  ["Bridge", "bridge-contracts", ["7 tricks", "9 tricks", "10 tricks"], "Six base tricks"],
] as const) {
  test(`${game} ${topic} retains custom decision context`, async ({ page }, info) => {
    await openExercise(page, game, topic);
    let firstFeedback = "";
    for (let i = 0; i < choices.length; i++) {
      await page.getByRole("button", { name: choices[i], exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      if (!i) firstFeedback = (await page.locator(".explanation").textContent())!;
      await page.getByRole("button", { name: game === "Gin Rummy" && i % 2 === 0 ? "Try another example" : i === choices.length - 1 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    const review = await openReview(page);
    await expect(review.locator(".review-explanation")).toContainText(firstFeedback);
    if (explanation) await expect(review.locator(".review-explanation")).toContainText(explanation);
    if (topic !== "bridge-contracts") {
      await expect(review.locator("img")).toHaveCount(game === "Bridge" ? 13 : 10);
      await checkImages(review);
    } else await expect(review).toContainText("7");
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${topic}-review.png`), fullPage: true });
  });
}
