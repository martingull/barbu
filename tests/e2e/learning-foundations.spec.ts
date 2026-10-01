import { expect, test, type Page } from "@playwright/test";

async function openLearn(page: Page, game: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const boxes = await page.locator(".table-play-panel > *").evaluateAll(elements => elements
    .map(element => element.getBoundingClientRect()).filter(box => box.height > 0).map(box => ({ top: box.top, bottom: box.bottom })));
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
  const next = page.getByRole("button", { name: /^(Next decision|Finish topic)$/ });
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  await expect.poll(() => page.locator("img.card-face").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`Bridge contracts stay visible before every answer at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openLearn(page, "Bridge");
    await page.locator('[data-skill="bridge-contracts"] .exercise-shortcut').click();
    for (const [i, contract] of [
      { name: "1 Hearts", symbol: "1♥", trump: "♥ is trump", answer: 7 },
      { name: "3 No Trump", symbol: "3NT", trump: "No trump suit", answer: 9 },
      { name: "4 Spades", symbol: "4♠", trump: "♠ is trump", answer: 10 }
    ].entries()) {
      const summary = page.getByRole("region", { name: "Contract to read", exact: true });
      await expect(summary.getByText(contract.name, { exact: true })).toBeInViewport();
      await expect(summary).toContainText(contract.trump);
      await expect(page.getByText(`In ${contract.symbol}, how many tricks must declarer and dummy win together?`, { exact: true })).toBeInViewport();
      await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeDisabled();
      await page.screenshot({ path: info.outputPath(`bridge-contract-${i}-question.png`), fullPage: true });
      await page.getByRole("button", { name: `${contract.answer} tricks`, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(summary.getByText(contract.name, { exact: true })).toBeInViewport();
      await expect(page.locator(".outcome")).toHaveText("Good");
      await checkLayout(page);
      await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    await expect(page.getByLabel("Learning summary")).toContainText("3 of 3 decisions");
  });

  test(`Bridge declarer shows both relevant hands before choosing at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openLearn(page, "Bridge");
    await page.locator('[data-skill="bridge-declarer"] .exercise-shortcut').click();
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const prompt = await page.getByLabel("Drill decision", { exact: true }).innerText();
      const choice = prompt.includes("extra tricks") ? "K D" : prompt.includes("Try your queen") ? "Q C" : "4 H";
      seen.add(choice);
      await expect(page.getByLabel("North dummy (excerpt)", { exact: true })).toBeInViewport();
      const dummy = page.getByLabel("Reference cards", { exact: true });
      await expect(dummy.getByRole("button")).toHaveCount(0);
      await expect(dummy.locator("img.card-face")).toHaveCount(choice === "K D" ? 5 : 3);
      const active = page.getByLabel("South declarer: choose a card", { exact: true });
      await expect(active.locator("img.card-face")).toHaveCount(4);
      await expect.poll(() => page.locator("img.card-face").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await expect(active).toBeInViewport();
      await page.screenshot({ path: info.outputPath(`bridge-declarer-${choice.replace(" ", "")}-question.png`), fullPage: true });
      await active.getByRole("button", { name: choice, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".outcome")).toHaveText("Good");
      await checkLayout(page);
      await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    expect(seen.size).toBe(3);
  });

  test(`Gin counting leads to separate knock and gin topics at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openLearn(page, "Gin Rummy");
    await page.locator('[data-skill="gin-deadwood"] .exercise-shortcut').click();
    await expect(page.getByLabel("Your Gin Rummy exercise hand").getByRole("button")).toHaveCount(0);
    for (const [i, points] of [2, 10, 31].entries()) {
      await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: `${points} points`, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.getByRole("region", { name: "Deadwood breakdown" })).toContainText(`Deadwood: ${points} points`);
      await checkLayout(page);
      if (i === 0) await page.screenshot({ path: info.outputPath("gin-deadwood-feedback.png"), fullPage: true });
      await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    await expect(page.getByLabel("Learning summary")).toContainText("3 of 3 decisions");
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
    await page.locator('[data-skill="gin-knock"] .exercise-shortcut').click();
    await page.getByRole("button", { name: "Knock", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.locator(".explanation")).toContainText("not a guaranteed win");
    await checkLayout(page);
    await page.screenshot({ path: info.outputPath("gin-knock-feedback.png"), fullPage: true });
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await page.locator('[data-skill="gin-gin"] .exercise-shortcut').click();
    await page.getByLabel("Your Gin Rummy exercise hand").getByRole("button", { name: "K S", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.getByRole("region", { name: "Deadwood breakdown" })).toContainText("Deadwood: 0 points");
    await checkLayout(page);
    await page.screenshot({ path: info.outputPath("gin-finish-feedback.png"), fullPage: true });
  });

  test(`Bridge dummy plays at North and then hands control back to South at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openLearn(page, "Bridge");
    await page.locator('[data-skill="bridge-dummy"] .exercise-shortcut').click();
    for (const [i, choice] of ["2 H", "2 C", "A D"].entries()) {
      const active = page.getByLabel(i === 2 ? "South declarer: choose a card" : "North dummy: choose a card", { exact: true });
      await expect(page.getByLabel("Reference cards").getByRole("button")).toHaveCount(0);
      await active.getByRole("button", { name: choice, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      const slot = page.locator(i === 2 ? ".you-slot" : ".tutor-slot");
      await expect(slot.locator("img")).toHaveAttribute("alt", ["2♥", "2♣", "A♦"][i]);
      await expect(page.locator(".outcome")).toHaveText("Good");
      await checkLayout(page);
      await page.screenshot({ path: info.outputPath(`bridge-dummy-${i}.png`), fullPage: true });
      await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toEqual({ "bridge-dummy": true });
  });
}

test("legacy completion keeps old topics while exposing new foundations", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("barbu.courseProgress.v1", JSON.stringify({
    "gin-melds": true, "gin-draw": true, "gin-knock": true,
    "bridge-bidding": true, "bridge-dummy": true, "bridge-declarer": true, "bridge-defense": true
  })));
  await openLearn(page, "Gin Rummy");
  await expect(page.getByLabel("Gin Rummy course progress")).toContainText("3 / 5 complete");
  await page.getByRole("button", { name: "Continue learning", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Count deadwood", exact: true })).toBeVisible();
  await openLearn(page, "Bridge");
  await expect(page.getByLabel("Bridge course progress")).toContainText("4 / 5 complete");
  await page.getByRole("button", { name: "Continue learning", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Read the contract", exact: true })).toBeVisible();
});
