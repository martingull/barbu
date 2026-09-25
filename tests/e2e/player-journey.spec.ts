import { expect, test, type Page } from "@playwright/test";

async function home(page: Page) {
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
}

async function finishIntroduction(page: Page) {
  const titles = ["Follow suit", "Avoid a heart", "Move the queen"];
  for (let decision = 0; decision < 3; decision++) {
    await expect(page.locator("h1")).toHaveText(titles[decision]);
    await expect(page.locator(".contract-status")).toContainText(`Decision ${decision + 1} of 3`);
    await page.locator(".drill-hand .hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Finish session", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: decision === 2 ? "Finish introduction" : "Next decision", exact: true }).click();
  }
  await expect(page.getByLabel("Introduction result", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Introduction complete.");
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
  test(`catalog and introduction fit ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Barbu", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try Hearts", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Open Hearts", exact: true })).toBeInViewport();
    await expect(page.getByLabel("Games", { exact: true }).getByRole("button")).toHaveCount(5);
    await expect(page.getByRole("region", { name: "Card Skills" }).getByRole("button")).toHaveCount(1);
    await expect(page.getByLabel("Saved games")).toHaveCount(0);
    await expect(page.locator(".catalog-home")).not.toContainText(/Ready|Bridge Path|Pack/);
    const images = page.locator(".catalog-home img");
    await expect.poll(() => images.evaluateAll(items => items.every(item => (item as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const logo = page.locator(".brand-logo");
    await expect(logo).toHaveAttribute("src", /128x128.*\.png/);
    const logoBox = (await logo.boundingBox())!;
    const titleBox = (await page.getByRole("heading", { name: "Barbu", exact: true }).boundingBox())!;
    expect(logoBox.width).toBe(56);
    expect(logoBox.height).toBe(56);
    expect(titleBox.x - (logoBox.x + logoBox.width)).toBeGreaterThanOrEqual(12);
    const wordmarkBox = (await page.locator(".brand-wordmark").boundingBox())!;
    expect(Math.abs(logoBox.y + logoBox.height / 2 - wordmarkBox.y - wordmarkBox.height / 2)).toBeLessThanOrEqual(1);
    for (const title of ["Hearts", "Whist", "Spades", "Bridge", "Barbu", "Card Counting I"]) {
      const game = page.getByRole("button", { name: `Open ${title}`, exact: true });
      await expect(game.locator("img")).toHaveCount(title === "Barbu" ? 3 : 1);
      await expect(game).toHaveCSS("background-color", "rgb(40, 83, 66)");
      const artBox = (await game.locator(".table-mark, .game-art").boundingBox())!;
      const copyBox = (await game.locator(".game-copy").boundingBox())!;
      expect(artBox.x - (copyBox.x + copyBox.width)).toBeGreaterThanOrEqual(12);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("catalog.png"), fullPage: true });

    await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
    await expect(page.getByLabel("Your drill hand")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Follow suit", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "See example" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath("introduction.png"), fullPage: true });
    await finishIntroduction(page);
    await expect(page.getByRole("button", { name: "Play Hearts", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Learn Hearts", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("introduction-result.png"), fullPage: true });
    await page.getByRole("button", { name: "Learn Hearts", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Learn", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
    await page.getByRole("button", { name: "Games", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Try Hearts", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Try a game")).toContainText("Hearts introduction complete");
    await page.screenshot({ path: info.outputPath("introduction-completed-home.png"), fullPage: true });
    await page.getByRole("button", { name: "Learn Hearts", exact: true }).click();
    await expect(page.getByLabel("Your drill hand")).toHaveCount(0);
    await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
  });
}

test("introduction never overwrites a saved match and is consumed after leaving", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const key = "barbu.savedHeartsRun.v1";
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await page.getByLabel("Your Hearts passing hand").getByRole("button").first().click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  await home(page);
  await expect(page.getByRole("button", { name: "Continue Hearts", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
  await finishIntroduction(page);
  await expect(page.getByRole("button", { name: "Play Hearts", exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(saved);
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await expect(page.getByLabel("Your Hearts passing hand").locator('[aria-pressed="true"]')).toHaveCount(1);
  await home(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "Continue Hearts", exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("returning-player.png"), fullPage: true });
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(restored.heartsPassingHand).toEqual(saved.heartsPassingHand);
  expect(restored.heartsPassSelectedCardIds).toEqual(saved.heartsPassSelectedCardIds);
  expect(errors).toEqual([]);
});

test("all saved games can be resumed directly and the latest appears first", async ({ page }, info) => {
  await page.goto("/");
  for (const title of ["Hearts", "Whist", "Spades", "Bridge", "Barbu"]) {
    await page.getByRole("button", { name: `Open ${title}`, exact: true }).click();
    await page.getByRole("button", { name: `Play ${title}`, exact: true }).click();
    await home(page);
    await expect(page.locator(".continue-game")).toHaveAccessibleName(`Continue ${title}`);
  }
  await page.reload();
  await expect(page.locator(".continue-game")).toHaveAccessibleName("Continue Barbu");
  await page.screenshot({ path: info.outputPath("multiple-saves.png"), fullPage: true });
  for (const title of ["Hearts", "Whist", "Spades", "Bridge", "Barbu"]) {
    await page.locator(".continue-section summary").click();
    await page.getByRole("button", { name: `Continue ${title}`, exact: true }).click();
    await expect(page.getByRole("tab", { name: "Play", exact: true })).toHaveCount(0);
    await home(page);
    await expect(page.locator(".continue-game")).toHaveAccessibleName(`Continue ${title}`);
  }
});

test("new player can start play after introduction with unavailable storage", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Unavailable"); } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
  await finishIntroduction(page);
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await expect(page.getByLabel("Your Hearts passing hand")).toBeVisible();
  await home(page);
  await expect(page.getByRole("button", { name: "Continue Hearts", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try Hearts", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Learn Hearts", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("leaving an introduction early does not complete it or block another attempt", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
  await page.getByLabel("Your drill hand").getByRole("button", { name: "Q S", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByLabel("Drill decision").locator(".outcome")).toHaveText("Illegal");
  await expect(page.getByRole("button", { name: "Finish session", exact: true })).toHaveCount(0);
  await home(page);
  await page.reload();
  await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
  await finishIntroduction(page);
  await expect(page.getByRole("button", { name: "Learn Hearts", exact: true })).toBeVisible();
});

test("invalid saves do not add broken continue actions", async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ["Hearts", "Whist", "Spades", "Bridge"]) localStorage.setItem(`barbu.saved${name}Run.v1`, '{"version":1}');
    localStorage.setItem("barbu.savedPlayRun.v1", "invalid");
  });
  await page.goto("/");
  await expect(page.getByLabel("Saved games")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Bridge", exact: true })).toBeEnabled();
});
