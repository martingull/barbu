import { expect, test, type Page } from "@playwright/test";

async function openCounting(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
}

test("Counting has one learning screen with each activity once and no artificial lesson progress", async ({ page }, info) => {
  const preserved = { "hearts-object": true, "gin-settlement": true };
  await page.addInitScript(progress => localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(progress)), preserved);
  await page.setViewportSize({ width: 360, height: 740 });
  await openCounting(page);
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Learn", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Memory skills", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Warm up", exact: true }).getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Practise in a hand", exact: true }).getByRole("button")).toHaveCount(4);
  for (const name of ["Count trumps", "Heart memory hand", "Three amigos memory", "Danger cards", "Whist memory hand"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${name}\\b`) })).toHaveCount(1);
  }
  await expect(page.getByRole("button", { name: /Start lesson|Continue lesson|Go to Play|Reset lessons/ })).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  const activityRows = page.locator(".activity-topic");
  await expect(activityRows).toHaveCount(5);
  for (const row of await activityRows.all()) {
    const layout = await row.evaluate(button => {
      const symbol = button.querySelector(".activity-symbol")!.getBoundingClientRect();
      const copy = button.querySelector("span:last-child")!.getBoundingClientRect();
      return { height: button.getBoundingClientRect().height, symbolWidth: symbol.width,
        gap: copy.x - symbol.right, overflow: button.scrollWidth - button.clientWidth };
    });
    expect(layout.height).toBeGreaterThanOrEqual(44);
    expect(layout.symbolWidth).toBe(32);
    expect(layout.gap).toBeGreaterThanOrEqual(8);
    expect(layout.overflow).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: info.outputPath("counting-one-learning-screen.png"), fullPage: true, scale: "css" });
  await page.reload();
  await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toEqual(preserved);
});

async function checkLayout(page: Page) {
  const surface = page.locator(".counting-surface.flow-play");
  await expect(surface).toBeVisible();
  const geometry = await surface.evaluate(element => {
    const box = (selector: string) => element.querySelector(selector)?.getBoundingClientRect();
    const board = box(".play-board-region");
    const panel = box(".table-play-panel")!;
    const actions = box(".action-row")!;
    const hand = box(".full-hand-cards");
    const prompt = box(".memory-prompt");
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      boardOverlap: board ? board.bottom - panel.top : 0,
      handOverlap: hand ? hand.bottom - actions.top : 0,
      promptOverlap: prompt ? prompt.bottom - actions.top : 0
    };
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.boardOverlap).toBeLessThanOrEqual(1);
  expect(geometry.handOverlap).toBeLessThanOrEqual(1);
  expect(geometry.promptOverlap).toBeLessThanOrEqual(1);
  await surface.locator(".action-row button").last().scrollIntoViewIfNeeded();
  await expect(surface.locator(".action-row button").last()).toBeInViewport();
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 1024, height: 768 }]) {
  test(`Counting uses shared layout at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openCounting(page);
    const room = (await page.locator(".table-room").boundingBox())!;
    const learn = (await page.getByRole("region", { name: "Learn", exact: true }).boundingBox())!;
    expect(Math.abs(room.width - learn.width)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("counting-menu.png"), fullPage: true, scale: "css" });
    for (const name of ["Heart memory hand", "Three amigos memory", "Danger cards", "Whist memory hand", "Count trumps"]) {
      await page.getByRole("button", { name: new RegExp(name) }).click();
      await checkLayout(page);
      if (name === "Whist memory hand") {
        for (let trick = 0; trick < 3; trick++) {
          await page.locator(".full-hand-card.legal").first().click();
          await page.getByRole("button", { name: "Play card", exact: true }).click();
          if (trick < 2) await page.getByRole("button", { name: "Next trick", exact: true }).click();
        }
        await expect(page.getByLabel("Memory question")).toBeVisible();
        await expect(page.locator(".play-board-region, .memory-review")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Check memory", exact: true })).toBeDisabled();
        await page.locator(".memory-options button").first().click();
        await expect(page.locator('.memory-options button[aria-pressed="true"]')).toHaveCount(1);
        await page.getByRole("button", { name: "Check memory", exact: true }).click();
        await expect(page.locator(".memory-review")).toBeAttached();
        await checkLayout(page);
      }
      await page.screenshot({ path: info.outputPath(`${name.replaceAll(" ", "-")}.png`), fullPage: true });
      await page.getByRole("button", { name: "Table", exact: true }).first().click();
      await expect(page.getByRole("region", { name: "Learn", exact: true })).toBeVisible();
      await expect(page.getByRole("tab")).toHaveCount(0);
    }
  });
}

test("Warm-up replay resets answers and counts without changing the deal", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openCounting(page);
  await page.getByRole("button", { name: /Count trumps/ }).click();
  const first = await page.getByLabel("Trump trick reveal").getByRole("img").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
  expect(first).toHaveLength(4);
  for (let segment = 0; segment < 3; segment++) {
    while (await page.getByRole("button", { name: "Next trick", exact: true }).count()) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
    await page.getByRole("button", { name: "Answer memory", exact: true }).click();
    await expect(page.locator(".play-board-region, .memory-review")).toHaveCount(0);
    await page.locator(".memory-options button").first().click();
    await page.getByRole("button", { name: "Check memory", exact: true }).click();
    await checkLayout(page);
    await page.getByRole("button", { name: segment === 2 ? "Review round" : "Continue", exact: true }).click();
  }
  await expect(page.getByLabel("Count trumps intermission")).toBeVisible();
  await expect(page.locator(".counting-surface .table-play-panel")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".counting-surface .action-row")).toHaveCSS("border-top-width", "0px");
  await page.screenshot({ path: info.outputPath("warm-up-result.png"), fullPage: true });
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.locator(".contract-status")).toContainText("0 of 0");
  expect(await page.getByLabel("Trump trick reveal").getByRole("img").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(first);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await expect(page.getByRole("region", { name: "Learn", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Count trumps/ })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Memory hands work with storage disabled", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage unavailable"); } });
  });
  await openCounting(page);
  await page.getByRole("button", { name: /Heart memory hand/ }).click();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
