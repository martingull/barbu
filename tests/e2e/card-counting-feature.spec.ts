import { expect, test, type Page } from "@playwright/test";

async function openCounting(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
}

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
      await expect(page.getByRole("tab", { name: "Play", exact: true })).toHaveAttribute("aria-selected", "true");
    }
  });
}

test("Warm-up replay resets answers and counts without changing the deal", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openCounting(page);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
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
  await expect(page.getByRole("tab", { name: "Learn", exact: true })).toHaveAttribute("aria-selected", "true");
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
