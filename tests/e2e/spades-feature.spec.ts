import { expect, test } from "@playwright/test";
import { courseCatalog } from "../../src/courseContent";

test("Spades bidding survives other games and every guided lesson", async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const key = "barbu.savedSpadesRun.v1";
  await page.goto("/");
  await page.getByRole("button", { name: "Open Spades", exact: true }).click();
  await page.getByRole("button", { name: "Play Spades", exact: true }).click();
  await page.getByRole("button", { name: "Adjust bid", exact: true }).click();
  await page.getByRole("button", { name: "Increase You bid", exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Open Whist", exact: true }).click();
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Open Spades", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const [index, course] of courseCatalog.filter(course => course.game === "spades").entries()) {
    await page.locator(`[data-skill="${course.pathStepId}"] .lesson-topic`).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.locator(".drill-hand .hand-card.legal").first().click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await page.getByRole("button", { name: i === 2 ? "Review session" : "Next decision", exact: true }).click();
    }
    await page.getByRole("button", { name: "Finish Spades", exact: true }).click();
    await expect(page.getByLabel("Spades course progress")).toContainText(`${index + 1} / 5 complete`);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(saved);
  }
  await page.reload();
  await page.getByRole("button", { name: "Open Spades", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Spades course progress")).toContainText("5 / 5 complete");
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Spades", exact: true }).click();
  await expect(page.getByLabel("Spades bids for this hand")).toBeVisible();
  await expect(page.getByLabel(`You bid ${saved.bids.You}`, { exact: true })).toHaveText(String(saved.bids.You));
  await page.screenshot({ path: info.outputPath("spades-resumed-bids.png"), fullPage: true });
  await page.getByRole("button", { name: "Show cards", exact: true }).click();
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  await page.screenshot({ path: info.outputPath("spades-play.png"), fullPage: true });
  expect(errors).toEqual([]);
});
