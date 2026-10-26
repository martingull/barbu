import { expect, test, type Page } from "@playwright/test";

const saveKey = "barbu.savedHeartsRun.v1";
async function check(page: Page, card: string) {
  await page.locator(".drill-hand").getByRole("button", { name: card, exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}
async function learn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}

async function boardGeometry(page: Page) {
  return page.locator(".play-board-region").evaluate(board => {
    const box = board.getBoundingClientRect();
    return [box.y, box.width, box.height, ...Array.from(board.querySelectorAll(".cardholder")).flatMap(holder => {
      const slot = holder.getBoundingClientRect();
      return [slot.x, slot.y, slot.width, slot.height];
    })];
  });
}
async function expectStableBoard(page: Page, baseline: number[]) {
  await expect.poll(async () => Math.max(...(await boardGeometry(page)).map((value, i) => Math.abs(value - baseline[i])))).toBeLessThanOrEqual(1);
}

test("the last missed answer adds a bounded follow-up before completing the introduction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try Hearts", exact: true }).click();
  for (const card of ["3 C", "K C", "J D", "3 C"]) {
    await check(page, card);
    await page.getByRole("button", { name: "Next decision", exact: true }).click();
  }
  await check(page, "A D");
  await expect(page.getByLabel("Drill decision")).toContainText("You take 13 points");
  await expect(page.getByRole("button", { name: "Finish introduction", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await check(page, "A C");
  await page.getByRole("button", { name: "Finish introduction", exact: true }).click();
  await expect(page.getByLabel("Introduction result")).toContainText("4 of 6 decisions");
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  await expect(page.getByLabel("Your Hearts passing hand")).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBeNull();
  await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
});

test("a missed answer gets a different example; winner questions do not add cards", async ({ page }, info) => {
  await learn(page);
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  await check(page, "Q S");
  await expect(page.getByLabel("Drill decision")).toContainText("Follow the suit of 9♣");
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Follow suit again");
  await expect(page.locator(".contract-status")).toContainText("Decision 2 of 6");
  await check(page, "3 D");
  await page.getByRole("button", { name: "Next decision", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Who wins the trick?");
  await expect(page.locator(".drill-hand .legal")).toHaveCount(4);
  const table = page.getByLabel("Drill card table", { exact: true });
  const before = await table.innerHTML();
  await check(page, "K C");
  expect(await table.innerHTML()).toBe(before);
  await page.screenshot({ path: info.outputPath("winner-feedback.png") });
  for (const card of ["J D", "3 C", "2 D"]) {
    await page.getByRole("button", { name: "Next decision", exact: true }).click();
    await check(page, card);
  }
  await page.getByRole("button", { name: "Finish topic", exact: true }).click();
  const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!));
  expect(evidence.skills["hearts-object"]).toMatchObject({ attempts: 1, total: 6, correct: 5 });
  await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  await page.getByRole("button", { name: "Read lesson: Object of Hearts", exact: true }).click();
  await expect(page.getByRole("button", { name: "See example", exact: true })).toBeVisible();
});

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`guided hand fits ${size.width}x${size.height} and never changes a saved match`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize(size);
    await learn(page);
    await page.getByRole("tab", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
    await page.getByLabel("Your Hearts passing hand").getByRole("button").first().click();
    const saved = await page.evaluate(key => localStorage.getItem(key), saveKey);
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pass cards", exact: true })).toBeInViewport();
    await expect(page.getByLabel("Your Hearts passing hand").locator('[aria-pressed="true"]')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("guided-passing.png") });
    for (let i = 0; i < 3; i++) await page.getByLabel("Your Hearts passing hand").getByRole("button").nth(i).click();
    await page.getByRole("button", { name: "Pass cards", exact: true }).click();
    await expect(page.getByLabel("Your Hearts hand")).toBeVisible();
    const baseline = await boardGeometry(page);
    for (let trick = 0; trick < 13; trick++) {
      const hand = page.getByLabel("Your Hearts hand");
      const actions = page.locator(".table-play-panel .action-row");
      await expect(page.getByLabel("Hearts hand decision")).toContainText("Rule:");
      await expect(page.getByLabel("Hearts hand decision")).toContainText("Tactic:");
      await expect(actions.getByRole("button", { name: "Play card", exact: true })).toBeInViewport({ ratio: 1 });
      await expectStableBoard(page, baseline);
      const handBox = (await hand.boundingBox())!, actionBox = (await actions.boundingBox())!;
      expect(actionBox.y - (handBox.y + handBox.height)).toBeGreaterThanOrEqual(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (trick === 0 || trick === 6) await page.screenshot({ path: info.outputPath(`guided-trick-${trick + 1}.png`) });
      await hand.locator(".legal").first().click();
      await page.getByRole("button", { name: "Play card", exact: true }).click();
      if (trick < 12) {
        await expectStableBoard(page, baseline);
        await expect(page.getByLabel("Trick winner explained")).toContainText("the highest card in");
        await expect(page.getByLabel("Hearts hand decision")).toContainText(/points|point/);
        await expect(page.getByLabel("Hearts hand decision")).toContainText(/leads? next/);
        await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeInViewport({ ratio: 1 });
        const panel = (await page.getByLabel("Hearts hand decision").boundingBox())!;
        const board = (await page.getByLabel("Hearts hand table", { exact: true }).boundingBox())!;
        expect(panel.y).toBeGreaterThanOrEqual(board.y + board.height - 1);
        if (trick === 0 || trick === 6) await page.screenshot({ path: info.outputPath(`guided-review-${trick + 1}.png`) });
        if (trick === 0) {
          const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
          await guidance.locator(".explanation").evaluate(element => { element.textContent = element.textContent!.repeat(12); });
          await expectStableBoard(page, baseline);
          expect(await guidance.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
          await guidance.focus();
          await page.keyboard.press("End");
          await expect.poll(() => guidance.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
          await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeInViewport({ ratio: 1 });
        }
        await page.getByRole("button", { name: "Next trick", exact: true }).click();
        expect(await page.getByRole("region", { name: "Turn guidance", exact: true }).evaluate(el => el.scrollTop)).toBe(0);
      }
    }
    await expect(page.getByRole("heading", { name: "Guided hand complete", exact: true })).toBeVisible();
    await expect(page.locator(".table-play-panel .action-row button")).toHaveText(["Replay", "Back to Learn"]);
    await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
    await page.getByText("Last trick explained", { exact: true }).click();
    await expect(page.locator(".guided-final-trick")).toContainText("the highest card in");
    const points = await page.getByLabel("This hand breakdown").locator(".hearts-hand-breakdown-row:not(.header) strong:last-child").allTextContents();
    expect([26, 78]).toContain(points.reduce((sum, value) => sum + Number(value), 0));
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(saved);
    await page.screenshot({ path: info.outputPath("guided-result.png") });
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
    await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
    await page.getByRole("tab", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
    await expect(page.getByLabel("Your Hearts passing hand").locator('[aria-pressed="true"]')).toHaveCount(1);
    const resumed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey);
    // Resuming legitimately refreshes the save timestamp, but not the game.
    expect({ ...resumed, savedAt: undefined }).toEqual({ ...JSON.parse(saved!), savedAt: undefined });
  });
}

test("opening exercise states its objective and explains legal tactical alternatives", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await learn(page);
  await page.getByRole("button", { name: /^Opening trick rules\b/ }).click();
  let sawTactic = false;
  for (let i = 0; i < 3; i++) {
    const baseline = await boardGeometry(page);
    await expect(page.getByLabel("Drill decision")).toContainText("Goal:");
    const ace = page.locator(".drill-hand").getByRole("button", { name: "A C", exact: true });
    if (await ace.count()) {
      sawTactic = true;
      await ace.click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.getByLabel("Drill decision")).toContainText("not a rules mistake");
      await expect(page.getByLabel("Drill decision")).toContainText("0 points");
      await page.screenshot({ path: info.outputPath("legal-tactic-feedback.png") });
    } else {
      await page.locator(".drill-hand .legal").first().click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
    }
    await expectStableBoard(page, baseline);
    await expect(page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
  }
  expect(sawTactic).toBe(true);
  await expect(page.getByLabel("Learning summary")).toContainText("Playing low is a tactic, not a rule");
  await page.screenshot({ path: info.outputPath("opening-takeaway.png"), fullPage: true });
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBeNull();
});

test("guided board adapts to a resized viewport but not the next explanation", async ({ page }, info) => {
  await learn(page);
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByLabel("Your Hearts passing hand").getByRole("button").nth(i).click();
  await page.getByRole("button", { name: "Pass cards", exact: true }).click();
  const heights: number[] = [];
  for (const size of [{ width: 320, height: 568 }, { width: 393, height: 805 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(size);
    await expect(page.getByRole("button", { name: "Play card", exact: true })).toBeInViewport({ ratio: 1 });
    const baseline = await boardGeometry(page);
    heights.push(baseline[2]);
    await page.screenshot({ path: info.outputPath(`stable-board-${size.width}-decision.png`) });
    await page.getByLabel("Your Hearts hand").locator(".legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    await expectStableBoard(page, baseline);
    await page.screenshot({ path: info.outputPath(`stable-board-${size.width}-review.png`) });
    await page.getByRole("button", { name: "Next trick", exact: true }).click();
    await expectStableBoard(page, baseline);
  }
  expect(heights[1]).toBeGreaterThan(heights[0]);
  expect(heights[2]).toBeGreaterThan(heights[1]);
});
