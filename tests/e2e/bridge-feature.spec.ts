import { expect, test } from "@playwright/test";

test("Bridge auction and active hand survive other games and bidding lessons", async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const key = "barbu.savedBridgeRun.v1";
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  const leave = async () => {
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await page.getByRole("button", { name: "Games", exact: true }).click();
  };
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("button", { name: "Play Bridge", exact: true }).click();
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  const auction = await saved();
  await leave();
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await page.locator(".full-hand-card").first().click();
  await leave();
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator('[data-skill="bridge-bidding"] .lesson-topic').click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByRole("button", { name: i === 2 ? "Finish practice" : "Next decision", exact: true }).click();
  }
  await page.getByRole("button", { name: "Finish Bridge", exact: true }).click();
  expect(await saved()).toEqual(auction);
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Bridge", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pass", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("button", { name: "Start play", exact: true }).isVisible()) break;
    const dealAgain = page.getByRole("button", { name: "Deal again", exact: true });
    if (await dealAgain.isVisible()) await dealAgain.click();
    else await page.getByRole("button", { name: "Make call", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start play", exact: true }).click();
  await page.locator(".bridge-thumb-hand .legal").first().dblclick();
  const playing = await saved();
  await leave();
  await page.getByRole("button", { name: "Open Spades", exact: true }).click();
  await page.getByRole("button", { name: "Play Spades", exact: true }).click();
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  await leave();
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("button", { name: "Continue Bridge", exact: true }).click();
  expect((await saved()).fullHand).toEqual(playing.fullHand);
  expect((await saved()).fullHandReviewTrickCount).toBe(playing.fullHandReviewTrickCount);
  await page.screenshot({ path: info.outputPath("bridge-resumed-play.png"), fullPage: true });
  expect(errors).toEqual([]);
});
