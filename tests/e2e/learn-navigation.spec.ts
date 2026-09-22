import { expect, test, type Page } from "@playwright/test";
import { bridgeCourses } from "../../src/lessons/bridgeCourses";

async function expectLearningLayout(page: Page) {
  const surface = page.locator(".table-play-surface.flow-play");
  await expect(surface).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const panel = await surface.locator(".table-play-panel").boundingBox();
  const blocks = await surface.locator(".table-play-panel > *").evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect()).filter(box => box.height > 0 && box.width > 0)
      .map(box => ({ top: box.top, bottom: box.bottom })));
  for (let index = 1; index < blocks.length; index++) {
    expect(blocks[index].top).toBeGreaterThanOrEqual(blocks[index - 1].bottom - 1);
  }
  const boardRegion = surface.locator(".play-board-region");
  const board = await boardRegion.count() ? await boardRegion.boundingBox() : null;
  if (board) expect(board.y + board.height).toBeLessThanOrEqual(panel!.y);
  const hand = surface.locator(".full-hand-cards");
  if (await hand.count()) {
    const cards = await hand.boundingBox();
    const actions = await surface.locator(".action-row").boundingBox();
    expect(cards!.y + cards!.height + 4).toBeLessThanOrEqual(actions!.y);
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  }
}

test("every table shares Learn and Play and keeps exercises inside Learn", async ({ page }, info) => {
  for (const [game, exercise] of [
    ["Barbu", "No Hearts"], ["Hearts", "Pass three"], ["Whist", "Follow suit"],
    ["Spades", "Follow suit"], ["Bridge", "Opening bids"], ["Card Counting I", "Count trumps"]
  ]) {
    await page.goto("/");
    await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
    await expect(page.getByRole("tab")).toHaveText(["Learn", "Play"]);
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await expect(page.getByLabel("Continue learning")).toBeVisible();
    await expect(page.getByRole("button", { name: /Quick drill/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Guided lessons", exact: true })).toHaveCount(0);
    const expectedSkills: Record<string, number> = { Barbu: 7, Hearts: 8, Whist: 7, Spades: 5, Bridge: 4, "Card Counting I": 5 };
    await expect(page.locator(".learn-skill")).toHaveCount(expectedSkills[game]);
    const skillIds = await page.locator(".learn-skill").evaluateAll(rows => rows.map(row => row.getAttribute("data-skill")));
    expect(new Set(skillIds).size).toBe(skillIds.length);
    await page.getByRole("button", { name: game === "Card Counting I" ? new RegExp(`^${exercise}\\b`) : `Try cards: ${exercise}`, exact: game !== "Card Counting I" }).click();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expectLearningLayout(page);
    await page.screenshot({ path: info.outputPath(`${game}-exercise.png`), fullPage: true });
    await page.locator("header").getByRole("button", { name: "Table", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Learn", exact: true })).toHaveAttribute("aria-selected", "true");
  }
});

test("Hearts breaking lesson stays ordered, fits small screens and replays the same skill", async ({ page }, info) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.screenshot({ path: info.outputPath(`learn-menu-${viewport.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Try cards: Break hearts", exact: true }).click();
    for (const [index, id] of ["2 H", "K H", "6 D"].entries()) {
      await expectLearningLayout(page);
      if (index === 1) {
        await expect(page.locator(".drill-hand .hand-card.legal")).toHaveCount(1);
        await expect(page.locator(".drill-hand .hand-card.illegal")).toHaveCount(2);
      }
      await page.getByLabel("Your drill hand").getByRole("button", { name: id, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.getByLabel("Drill decision")).toContainText("Good");
      await expect(page.getByLabel("Drill decision")).toContainText([
        "This lead breaks hearts", "only because they have no hearts", "Hearts are allowed, not required"
      ][index]);
      await expectLearningLayout(page);
      await page.screenshot({ path: info.outputPath(`hearts-breaking-${viewport.width}-${index}.png`), fullPage: true });
      await page.getByRole("button", { name: index === 2 ? "Review session" : "Next decision", exact: true }).click();
    }
    await page.getByRole("button", { name: "Practice Hearts again", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Only hearts remain", exact: true })).toBeVisible();
    await expect(page.getByLabel("Drill progress")).toContainText("0 / 3");
  }
});

test("legacy Barbu review flags do not add skills or reset completed lessons", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("barbu.courseProgress.v1", JSON.stringify({
    "meet-contract": true, "generated-drill": true, review: true
  })));
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Barbu course progress")).toContainText("1 / 7 complete");
  await expect(page.locator('[data-skill="meet-contract"]')).toContainText("Complete");
  await expect(page.locator('[data-skill="generated-drill"], [data-skill="review"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Continue learning", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Spot the danger", exact: true })).toBeVisible();
});

test("Barbu review does not offer a replay of another game's exercise", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("barbu.playHistory.v1", JSON.stringify([
    { id: "hearts-latest", completedAt: new Date().toISOString(), results: [
      { contract: "Hearts", cardLabel: "KH", outcome: "good", reason: "followed_suit", clean: true }
    ] },
    { id: "barbu-earlier", completedAt: new Date().toISOString(), results: [
      { contract: "No Hearts", cardLabel: "4C", outcome: "good", reason: "avoided_penalty", clean: true }
    ] }
  ])));
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: /^Review results/ }).click();
  await expect(page.getByLabel("Review contract results")).toContainText("No Hearts");
  await expect(page.getByRole("button", { name: "Replay Hearts", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Replay No Hearts", exact: true }).first().click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 4");
});

test("Bridge guided topics use the common lesson loop and preserve progress on reload", async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const [index, course] of bridgeCourses.entries()) {
    await page.getByLabel("Continue learning").getByRole("button").click();
    await expect(page.getByRole("heading", { name: course.title, exact: true })).toBeVisible();
    await expectLearningLayout(page);
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await expect(page.getByLabel(course.example.ariaLabel)).toBeVisible();
    await expectLearningLayout(page);
    await page.screenshot({ path: info.outputPath(`${course.id}-example.png`), fullPage: true });
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    for (let decision = 0; decision < 3; decision++) {
      if (index === 0) {
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
      } else {
        await page.locator(".drill-hand .hand-card.legal").first().click();
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
      }
      await expectLearningLayout(page);
      await page.screenshot({ path: info.outputPath(`${course.id}-${decision}-feedback.png`), fullPage: true });
      await page.getByRole("button", { name: /^(Next decision|Finish practice|Review session)$/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Finish Bridge", exact: true }).click();
    await expect(page.getByLabel("Bridge course progress")).toContainText(`${index + 1} / 4 complete`);
  }
  await page.reload();
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Bridge course progress")).toContainText("4 / 4 complete");
  await page.getByRole("button", { name: "Review lessons", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Opening bids", exact: true })).toBeVisible();
});

test("existing progress survives the merged menu and short hands stay beside actions", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("barbu.courseProgress.v1", JSON.stringify({ "hearts-object": true, "bridge-bidding": true }));
  });
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await expect(page.getByLabel("Hearts course progress")).toContainText("1 / 7 complete");
    await expect(page.getByRole("button", { name: "Continue learning", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Try cards: Avoid hearts", exact: true }).click();
    await expectLearningLayout(page);
    const hand = await page.locator(".drill-hand").boundingBox();
    const actions = await page.locator(".action-row").boundingBox();
    expect(actions!.y - hand!.y - hand!.height).toBeLessThan(16);
    await page.screenshot({ path: info.outputPath(`learn-${viewport.width}.png`), fullPage: true });
  }
});
