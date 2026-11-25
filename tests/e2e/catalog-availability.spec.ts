import { expect, test } from "@playwright/test";
import { createCanastaSession } from "../../src/domain/canastaSession";
import { canastaSaveKey, saveCanastaSession } from "../../src/persistence/canastaSave";
import { createEuchreSession } from "../../src/domain/euchreSession";
import { euchreSaveKey, saveEuchreSession } from "../../src/persistence/euchreSave";
import { createCribbageSession } from "../../src/domain/cribbage";
import { cribbageSaveKey, saveCribbageSession } from "../../src/persistence/cribbageSave";

test("internal games stay hidden in public builds without deleting saved games", async ({ page }) => {
  const date = "2026-11-24T10:00:00Z";
  const saves = [
    [canastaSaveKey, saveCanastaSession(createCanastaSession(3), date)],
    [euchreSaveKey, saveEuchreSession(createEuchreSession(3), date)],
    [cribbageSaveKey, saveCribbageSession(createCribbageSession(3), date)]
  ] as const;
  await page.addInitScript(saves => {
    for (const [key, saved] of saves) localStorage.setItem(key, JSON.stringify(saved));
  }, saves);
  await page.goto("/");
  await expect(page.locator(".catalog-game")).toHaveCount(8);
  for (const game of ["Canasta", "Euchre", "Cribbage"]) {
    await expect(page.locator(".catalog-home")).not.toContainText(game);
    await expect(page.getByRole("button", { name: `Continue ${game}`, exact: true })).toHaveCount(0);
  }
  for (const [key, saved] of saves) expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(saved);
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Gin Rummy", exact: true })).toBeVisible();
});
