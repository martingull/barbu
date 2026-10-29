import { expect, test, type Page } from "@playwright/test";
import { createBridgeSession, transitionBridgeSession } from "../../src/domain/bridgeSession";
import { bridgeAuctionStatus, bridgeFinalizeContract } from "../../src/domain/bridgeAuction";
import { saveBridgeSession, bridgeSaveKey } from "../../src/persistence/bridgeSave";
import { bridgeChoiceSteps, bridgeLearningSteps } from "../../src/lessons/bridge/learning";

function seedFor(role: "You" | "Right" | "Tutor" | "Left" | "passed") {
  for (let seed = 1; seed < 200; seed++) {
    let session = createBridgeSession(seed);
    for (let calls = 0; calls < 40 && !bridgeAuctionStatus(session.auctionCalls, 0).complete; calls++)
      session = transitionBridgeSession(session, { type: "make-call" });
    if (role === "passed" ? bridgeAuctionStatus(session.auctionCalls, 0).passedOut
      : bridgeFinalizeContract(session.auctionCalls, session.fullHand)?.declarer === role) return seed;
  }
  throw Error(`No test deal for ${role}`);
}
async function learn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
async function auction(page: Page) {
  for (let i = 0; i < 40; i++) {
    const call = page.getByRole("button", { name: "Make call", exact: true });
    if (!await call.isVisible()) return;
    await call.click();
  }
  throw Error("Auction did not complete");
}
for (const { width, height, role } of [
  { width: 320, height: 568, role: "You" }, { width: 360, height: 740, role: "Right" },
  { width: 820, height: 1180, role: "Tutor" }, { width: 1365, height: 900, role: "Left" }
] as const) {
  test(`guided Bridge ${role} fits and completes at ${width}x${height}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const saved = JSON.stringify(saveBridgeSession(createBridgeSession(8), "2026-10-29"));
    await page.addInitScript(({ seed, key, saved }) => {
      localStorage.setItem("barbu.practiceSeed.v1", String(seed)); localStorage.setItem(key, saved);
    }, { seed: seedFor(role), key: bridgeSaveKey, saved });
    await learn(page);
    await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
    const opening = await page.getByLabel("Your Bridge auction hand").getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
    await auction(page);
    await page.screenshot({ path: info.outputPath("bridge-guided-auction.png"), fullPage: true });
    await page.getByRole("button", { name: "Start play", exact: true }).click();
    const board = page.locator(".play-board-region");
    const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
    await expect(guidance).toContainText("Rule:");
    // The card-size action settles after the surface is mounted.
    await page.waitForTimeout(200);
    const baseline = (await board.boundingBox())!;
    async function fits() {
      await expect.poll(async () => Math.abs((await board.boundingBox())!.height - baseline.height)).toBeLessThanOrEqual(1);
      const box = (await board.boundingBox())!;
      expect(Math.abs(box.y - baseline.y)).toBeLessThanOrEqual(1);
      expect((await guidance.boundingBox())!.y).toBeGreaterThanOrEqual(box.y + box.height);
      await expect(page.locator(".table-play-panel .action-row")).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const images = page.locator(".play-board-region img, .bridge-thumb-hand img");
      expect(await images.evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    }
    await fits();
    await page.screenshot({ path: info.outputPath("bridge-guided-deal.png") });
    let decisions = 0;
    for (; decisions < 45; decisions++) {
      if (await page.getByRole("heading", { name: "Guided board complete", exact: true }).isVisible()) break;
      const next = page.getByRole("button", { name: "Next trick", exact: true });
      if (await next.isVisible()) {
        await expect(page.getByLabel("Trick winner explained")).toContainText("highest");
        await fits();
        if (decisions < 3) await page.screenshot({ path: info.outputPath("bridge-guided-trick.png") });
        await next.click();
      } else {
        await expect(guidance).toContainText("Tactic:");
        await fits();
        await page.locator(".bridge-thumb-hand .legal").first().click();
        await page.getByRole("button", { name: "Play card", exact: true }).click();
      }
    }
    expect(decisions).toBeLessThan(45);
    const counts = await page.getByLabel("Bridge contract breakdown").locator(".active strong").allTextContents();
    expect(Number(counts[1]) + Number(counts[2])).toBe(13);
    const recap = page.getByRole("region", { name: "Your hand in review", exact: true });
    await recap.locator("summary").first().click();
    await expect(recap.locator("details[open] img")).toHaveCount(4);
    await expect(recap.locator("details[open]")).toContainText("North");
    await expect(page.getByRole("button", { name: "Next board", exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("bridge-guided-result.png"), fullPage: true });
    await page.getByRole("button", { name: "Replay", exact: true }).click();
    expect(await page.getByLabel("Your Bridge auction hand").getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await expect(page.getByLabel("Bridge course progress")).toContainText("0 / 5 complete");
    expect(await page.evaluate(key => localStorage.getItem(key), bridgeSaveKey)).toBe(saved);
    expect(errors).toEqual([]);
  });
}

test("passed-out guided auction has working replay and independent play exits", async ({ page }) => {
  await page.addInitScript(seed => localStorage.setItem("barbu.practiceSeed.v1", String(seed)), seedFor("passed"));
  await learn(page);
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  await auction(page);
  await expect(page.getByText("All four players passed.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Make call", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await auction(page);
  await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Bridge", exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), bridgeSaveKey)).toBeNull();
});

test("Bridge choice lessons record follow-ups, lock answers and preserve the five progress keys", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await learn(page);
  for (const topic of ["contracts", "bidding"] as const) {
    const steps = bridgeChoiceSteps(topic);
    await page.locator(`[data-skill="bridge-${topic}"] .lesson-topic`).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    await expect(page.getByRole("region", { name: "Turn guidance" })).toContainText("Worked example");
    const choices = page.getByRole("group", { name: topic === "contracts" ? "Trick targets" : "Bridge bidding choices", exact: true });
    await choices.getByRole("button", { name: steps[0].options.find(option => option.id !== steps[0].correct)!.label, exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(choices.getByRole("button").first()).toBeDisabled();
    await page.getByRole("button", { name: "Try another example", exact: true }).click();
    for (const [index, step] of [steps[0].followUp!, steps[1], steps[2]].entries()) {
      await choices.getByRole("button", { name: step.options.find(option => option.id === step.correct)!.label, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true })).toBeInViewport({ ratio: 1 });
      if (index === 1) await page.screenshot({ path: info.outputPath(`bridge-${topic}-feedback.png`) });
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!));
    expect(evidence.skills[`bridge-${topic}`]).toMatchObject({ total: 4, correct: 3, attempts: 1 });
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  }
  for (const topic of ["dummy", "declarer", "defense"] as const) {
    await page.locator(`[data-skill="bridge-${topic}"] .lesson-topic`).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    for (const [index, step] of bridgeLearningSteps(topic).entries()) {
      const card = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
      await page.getByLabel(step.handLabel ?? "Your drill hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.getByLabel("Bridge decision breakdown")).toBeAttached();
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  }
  await expect(page.getByLabel("Bridge course progress")).toContainText("5 / 5 complete");
});
