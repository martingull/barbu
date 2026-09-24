import { expect, test } from "@playwright/test";

test("Hearts match survives Card Counting, a lesson and a reload", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const key = "barbu.savedHeartsRun.v1";
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  const cards = page.getByLabel("Your Hearts passing hand").getByRole("button");
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await page.getByRole("button", { name: "Pass cards", exact: true }).click();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
  await page.getByRole("button", { name: /Heart memory hand/ }).click();
  await expect(page.getByLabel("Your Hearts hand")).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator('[data-skill="hearts-object"] .lesson-topic').click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.locator(".drill-hand .hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByRole("button", { name: i === 2 ? "Review session" : "Next decision", exact: true }).click();
  }
  await page.getByRole("button", { name: "Finish Hearts", exact: true }).click();
  await expect(page.getByLabel("Hearts course progress")).toContainText("1 / 7 complete");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(saved);
  await page.reload();
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Hearts course progress")).toContainText("1 / 7 complete");
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await expect(page.getByLabel("Your Hearts hand").getByRole("button")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "Play card", exact: true })).toBeDisabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).fullHand, key)).toEqual(saved.fullHand);
  await page.screenshot({ path: info.outputPath("hearts-resumed.png"), fullPage: true });
  expect(errors).toEqual([]);
});
