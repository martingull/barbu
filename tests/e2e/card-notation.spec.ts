import { expect, test, type Page } from "@playwright/test";
import { heartsDef } from "../../src/games/hearts";
import { formatCardText } from "../../src/presentation/cardDisplay";

async function noRawCardCodes(page: Page) {
  expect(await page.locator("body").innerText()).not.toMatch(/\b(10|[2-9JQKA])[CDHS]\b/);
}

test("Hearts uses suit symbols in Play, every lesson example, and decision reviews", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Play a Hearts match.");
  await noRawCardCodes(page);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const step of heartsDef.learnSteps) {
    await page.locator(`[data-skill="${step.id}"] ${step.decisionFirst ? ".exercise-shortcut" : ".lesson-topic"}`).click();
    await noRawCardCodes(page);
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await noRawCardCodes(page);
    if (step.id === "hearts-pass") {
      await expect(page.getByLabel("Hearts trick sequence")).toContainText("Move Q♠, K♠ and A♠ together.");
      await page.screenshot({ path: info.outputPath("hearts-pass-symbols.png") });
    }
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
  }
  await page.locator('[data-skill="hearts-queen"] .exercise-shortcut').click();
  for (let i = 0; i < 3; i++) {
    await page.locator(".drill-hand .hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await noRawCardCodes(page);
    await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
  }
  await page.getByText("Review decisions", { exact: true }).click();
  const labels = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.playHistory.v1")!)[0].results.map((r: { cardLabel: string }) => r.cardLabel));
  await expect(page.getByLabel("Decision results").locator("strong")).toHaveText(labels.map(formatCardText));
  await noRawCardCodes(page);
  await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  await page.getByRole("button", { name: /^Reference/ }).click();
  await noRawCardCodes(page);
});
