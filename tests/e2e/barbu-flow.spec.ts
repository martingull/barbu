import { expect, test } from "@playwright/test";

test("catalog opens Barbu's table", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Choose a table" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Barbu/ })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });

  await page.getByRole("button", { name: /Barbu/ }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue: Meet the contract/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^1 Concept Meet the contract/ })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-table.png"), fullPage: true });
});

test("guided lesson accepts a legal card play", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /^No Hearts Avoid heart penalties/ }).click();

  await expect(page.getByRole("heading", { name: "Barbu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow clubs without taking the heart" })).toBeVisible();

  await page.getByRole("button", { name: "2 C" }).click();
  await expect(page.getByRole("button", { name: "Play selected" })).toBeEnabled();
  await page.getByRole("button", { name: "Play selected" }).click();

  await expect(page.getByText("Penalty avoided")).toBeVisible();
  await expect(page.getByText("Right wins with AC and takes 1 heart penalty from Left's 4H.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next trick" })).toBeVisible();
});

test("finishing a lesson advances course progress", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue: Meet the contract/ }).click();

  await page.getByRole("button", { name: "2 C" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Next trick" }).click();

  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByText("1 / 4 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue: Spot the danger/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Meet the contract/ })).toContainText("Complete");
});

test("training path can start generated practice shell", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Generated drill/ }).click();

  await expect(page.getByRole("heading", { name: "Generated practice" })).toBeVisible();
  await expect(
    page.getByText("Generated drills need the Tauri runtime. Use the fixed lesson here, or run the app with Tauri.")
  ).toBeVisible();
});
