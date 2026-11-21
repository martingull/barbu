import { expect, test } from "@playwright/test";
import { bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { legacyBridgePreference } from "../fixtures/legacyBridgePreference";

test.beforeEach(async ({ page }) => legacyBridgePreference(page));

test("completed Bridge learners discover and finish the new bidding lesson without losing progress", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const prior = Object.fromEntries(["contracts", "dummy", "bidding", "support", "declarer", "defense"].map(topic => [`bridge-${topic}`, true]));
  await page.addInitScript(prior => {
    if (!localStorage.getItem("barbu.courseProgress.v1")) localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(prior));
  }, prior);
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Bridge course progress")).toContainText("6 / 7 complete");
  await page.getByLabel("Continue learning").getByRole("button").click();
  await expect(page.getByRole("heading", { name: "Respond to 1NT", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("responding-concept.png"), fullPage: true });
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await expect(page.getByLabel("Bridge response example").locator("img")).toHaveCount(3);
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  for (const [index, step] of bridgeChoiceSteps("responding").entries()) {
    const hand = page.getByLabel("Your Bridge bidding practice hand");
    await expect(hand.locator("img")).toHaveCount(13);
    await expect.poll(() => hand.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await expect(page.getByLabel("Bridge bidding estimate")).toContainText("North (partner): 1NT. East: Pass.");
    await expect(page.getByLabel("Bridge bidding estimate")).toContainText("Partner: 15-17 HCP");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`responding-${index}-question.png`), fullPage: true });
    await page.getByLabel("Bridge bidding choices").getByRole("button", { name: step.correct, exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.locator(".outcome")).toHaveText("Good");
    await expect(page.getByLabel("Bridge bidding exercise")).toContainText(step.explanations[step.correct]);
    const blocks = await page.locator(".table-play-panel > *").evaluateAll(elements => elements
      .map(element => element.getBoundingClientRect()).filter(box => box.width > 0 && box.height > 0)
      .map(box => ({ top: box.top, bottom: box.bottom })));
    for (let i = 1; i < blocks.length; i++) expect(blocks[i].top).toBeGreaterThanOrEqual(blocks[i - 1].bottom - 1);
    const next = page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true });
    await expect(next).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: info.outputPath(`responding-${index}-feedback.png`), fullPage: true });
    await next.click();
  }
  await expect(page.getByRole("status")).toHaveText("Bridge learning path complete.");
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toMatchObject({ ...prior, "bridge-responding": true });
  expect(errors).toEqual([]);
});
