import { expect, test } from "@playwright/test";
import { bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { bridgeCallLabel, bridgeAuctionStatus } from "../../src/domain/bridgeAuction";
import { createBridgeSession, transitionBridgeSession } from "../../src/domain/bridgeSession";
import { saveBridgeSession, bridgeSaveKey } from "../../src/persistence/bridgeSave";

test("Acol lessons use shared learning, separate bidding progress, and retain old boards", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const prior = { "bridge-bidding": true, "bridge-responding": true, "bridge-support": true, "bridge-dummy": true };
  const saved = JSON.stringify(saveBridgeSession(createBridgeSession(8), "2026-11-21"));
  await page.addInitScript(({ prior, saved, key }) => {
    if (!localStorage.getItem("barbu.courseProgress.v1")) localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(prior));
    if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
  }, { prior, saved, key: bridgeSaveKey });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("button", { name: "Acol Foundation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Acol Foundation", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Saved board: Barbu Natural", { exact: true })).toBeVisible();
  await page.getByText("Partnership agreements", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Bridge bidding system" })).toContainText("12-14");
  await page.screenshot({ path: info.outputPath("acol-agreements.png"), fullPage: true });
  await page.getByText("Partnership agreements", { exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Bridge course progress")).toContainText("1 / 9 complete");
  await page.screenshot({ path: info.outputPath("acol-learn.png"), fullPage: true });
  for (const topic of ["bidding", "responding", "support", "rebidding", "stayman"] as const) {
    await page.locator(`[data-skill="bridge-acol-${topic}"] .lesson-topic`).click();
    await expect(page.locator(".learning-copy-surface")).toContainText("Acol Foundation");
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await expect(page.getByLabel("Acol bidding example hand excerpt").locator("img")).toHaveCount(4);
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    const base = bridgeChoiceSteps(topic, "acol-foundation");
    const steps = topic === "stayman" ? [base[0], base[0].followUp!, base[1], base[2]] : base;
    for (const [index, step] of steps.entries()) {
      await expect(page.getByLabel("Bridge bidding estimate")).toContainText(step.context);
      const hand = page.getByLabel("Your Bridge bidding practice hand");
      await expect(hand.locator("img")).toHaveCount(13);
      await expect.poll(() => hand.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      const answer = topic === "stayman" && index === 0 ? "Pass" : step.correct;
      await page.getByLabel("Bridge bidding choices").getByRole("button", { name: bridgeCallLabel(answer), exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      const next = page.getByRole("button", { name: topic === "stayman" && index === 0 ? "Try another example" : index === steps.length - 1 ? "Finish topic" : "Next decision", exact: true });
      await expect(next).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (index === 0) await page.screenshot({ path: info.outputPath(`acol-${topic}-feedback.png`), fullPage: true });
      await next.click();
    }
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  }
  await expect(page.getByLabel("Bridge course progress")).toContainText("6 / 9 complete");
  await page.getByRole("button", { name: "Barbu Natural", exact: true }).click();
  await expect(page.getByLabel("Bridge course progress")).toContainText("4 / 7 complete");
  await page.getByRole("button", { name: "Acol Foundation", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await expect(page.getByRole("button", { name: "Acol Foundation", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(key => localStorage.getItem(key), bridgeSaveKey)).toBe(saved);
  await page.getByRole("button", { name: "Continue Bridge", exact: true }).click();
  await expect(page.getByLabel("Bridge bidding agreement")).toContainText("Barbu Natural");
  const resumed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), bridgeSaveKey);
  expect({ ...resumed, savedAt: "2026-11-21" }).toEqual(JSON.parse(saved));
  expect(errors).toEqual([]);
});

test("Acol guided and independent boards use the same selected agreements", async ({ page }, info) => {
  // Choose a non-passed-out board, independent of the local seed preference.
  let seed = 1;
  for (; seed < 100; seed++) {
    let session = createBridgeSession(seed, 1, "acol-foundation");
    for (let turns = 0; !bridgeAuctionStatus(session.auctionCalls, 0).complete && turns < 40; turns++)
      session = transitionBridgeSession(session, { type: "make-call" });
    if (!bridgeAuctionStatus(session.auctionCalls, 0).passedOut) break;
  }
  await page.addInitScript(seed => localStorage.setItem("barbu.practiceSeed.v1", String(seed)), seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("button", { name: "Acol Foundation", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  await expect(page.getByLabel("Bridge bidding agreement")).toContainText("Acol Foundation");
  await expect(page.getByLabel("Bridge bidding agreement")).toContainText("12-14");
  for (let turns = 0; turns < 40; turns++) {
    const makeCall = page.getByRole("button", { name: "Make call", exact: true });
    if (!await makeCall.isVisible()) break;
    await makeCall.click();
  }
  await page.screenshot({ path: info.outputPath("acol-auction.png"), fullPage: true });
  await page.getByRole("button", { name: "Start play", exact: true }).click();
  await expect(page.getByRole("region", { name: "Turn guidance", exact: true })).toContainText("Rule:");
  await page.locator(".bridge-thumb-hand .legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.locator(".play-board-region")).toBeVisible();
  await page.screenshot({ path: info.outputPath("acol-guided-play.png") });
  expect(await page.evaluate(key => localStorage.getItem(key), bridgeSaveKey)).toBeNull();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Play Bridge", exact: true }).click();
  await expect(page.getByLabel("Bridge bidding agreement")).toContainText("Acol Foundation");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).biddingSystem, bridgeSaveKey)).toBe("acol-foundation");
});
