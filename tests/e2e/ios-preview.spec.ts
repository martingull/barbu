import { expect, test } from "@playwright/test";

test.skip(process.env.BARBU_PACKAGED_PREVIEW !== "1", "Requires the packaged internal iOS build.");

test("internal testers can open all Premium games without purchases or a preview URL", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const game of ["Canasta", "Euchre", "Cribbage"]) {
    await page.goto("/");
    await expect(page.locator(".catalog-game")).toHaveCount(10);
    const open = page.getByRole("button", { name: `Open ${game}`, exact: true });
    await expect(open).toContainText("Internal preview");
    await expect(page.getByRole("button", { name: "Premium", exact: true })).toHaveCount(0);
    await open.click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toBeVisible();
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: info.outputPath(`${game.toLowerCase()}-internal-learn.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
