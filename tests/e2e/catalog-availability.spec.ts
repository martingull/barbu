import { expect, test } from "@playwright/test";
import { createCanastaSession } from "../../src/domain/canastaSession";
import { canastaSaveKey, saveCanastaSession } from "../../src/persistence/canastaSave";

test("paused Canasta stays hidden even with an existing saved game", async ({ page }) => {
  const saved = saveCanastaSession(createCanastaSession(3), "2026-09-29T10:00:00Z");
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), {
    key: canastaSaveKey, saved
  });
  await page.goto("/");
  await expect(page.locator(".catalog-game")).toHaveCount(7);
  await expect(page.locator(".catalog-home")).not.toContainText("Canasta");
  await expect(page.getByRole("button", { name: "Continue Canasta", exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), canastaSaveKey)).toEqual(saved);
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Gin Rummy", exact: true })).toBeVisible();
});
