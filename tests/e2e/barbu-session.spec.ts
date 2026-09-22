import { expect, test, type Page } from "@playwright/test";

const key = "barbu.savedPlayRun.v1";
async function openPlay(page: Page) {
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}
async function returnToTable(page: Page) {
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
}

test("Barbu resumes an intro and practice cannot overwrite the saved session", async ({ page }) => {
  await page.goto("/");
  await openPlay(page);
  await page.getByRole("button", { name: "Play Barbu", exact: true }).click();
  const intro = await page.evaluate(key => localStorage.getItem(key), key);
  await page.reload();
  await openPlay(page);
  await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Hearts", exact: true })).toBeVisible();
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!).seed).toBe(JSON.parse(intro!).seed);
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  const saved = await page.evaluate(key => localStorage.getItem(key), key);
  await returnToTable(page);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: /^Try cards: Domino\b/ }).click();
  const place = page.getByRole("button", { name: "Place card", exact: true });
  if (await place.isEnabled()) await place.click();
  else await page.getByRole("button", { name: "Pass", exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
  await returnToTable(page);
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Hearts hand", exact: true })).toBeVisible();
  const resumed = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!);
  expect(resumed.fullHand).toEqual(JSON.parse(saved!).fullHand);
});

test("Barbu keeps playing and retries saving after storage writes fail", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(key => {
    const setItem = Storage.prototype.setItem;
    Object.assign(window, { restoreStorage: () => { Storage.prototype.setItem = setItem; } });
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error("Storage blocked");
      setItem.call(this, name, value);
    };
  }, key);
  await openPlay(page);
  await page.getByRole("button", { name: "Play Barbu", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Progress could not be saved on this device.");
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  await expect(page.getByText("Progress could not be saved on this device.", { exact: true })).toBeVisible();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  await expect(page.getByText("Progress could not be saved on this device.", { exact: true })).toHaveCount(0);
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!);
  expect(saved.fullHand.completedTricks).toHaveLength(1);
  expect(saved.fullHandReviewTrickCount).toBe(0);
  expect(errors).toEqual([]);
});
