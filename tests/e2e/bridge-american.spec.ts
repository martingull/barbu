import { expect, test } from "@playwright/test";
import { bridgeDefinitionFor } from "../../src/games/bridge";
import { bridgeChoiceSteps, bridgeLearningSteps, type BridgeChoiceTopic } from "../../src/lessons/bridge/learning";
import { bridgeCoursesFor } from "../../src/lessons/bridge/courses";
import { bridgeCallLabel, normalizeBridgeCall } from "../../src/domain/bridgeAuction";
import { createBridgeSession, transitionBridgeSession } from "../../src/domain/bridgeSession";
import { bridgeSaveKey, saveBridgeSession } from "../../src/persistence/bridgeSave";

const system = "standard-american";
test("the default Standard American path completes ten topics on a compact screen", async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 568 });
  const saved = JSON.stringify(saveBridgeSession(createBridgeSession(8), "legacy"));
  await page.addInitScript(({ key, saved }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
  }, { key: bridgeSaveKey, saved });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await expect(page.getByRole("button", { name: "Standard American Foundation", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Barbu Natural", exact: true })).toHaveCount(0);
  await page.getByText("Partnership agreements", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Bridge bidding system" })).toContainText("not full SAYC");
  await expect(page.getByRole("region", { name: "Bridge bidding system" })).toContainText("Jacoby transfers");
  await page.screenshot({ path: info.outputPath("american-agreements.png"), fullPage: true });
  await page.getByText("Partnership agreements", { exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByRole("region", { name: "Bridge bidding system" })).toHaveCSS("border-bottom-width", "0px");
  await expect(page.getByRole("region", { name: "Learning resources" })).toHaveCSS("border-top-width", "1px");
  const settingsGap = await page.getByRole("region", { name: "Bridge bidding system" }).evaluate(settings => {
    const resources = document.querySelector('.learn-resources')!;
    return resources.getBoundingClientRect().top - settings.lastElementChild!.getBoundingClientRect().bottom;
  });
  expect(settingsGap).toBeGreaterThanOrEqual(12);
  expect(settingsGap).toBeLessThanOrEqual(20);
  await page.screenshot({ path: info.outputPath("american-learn-divider.png"), fullPage: true });
  await expect(page.getByLabel("Bridge course progress")).toContainText("0 / 10 complete");
  const definition = bridgeDefinitionFor(system), courses = bridgeCoursesFor(system);
  for (const [topicIndex, topic] of definition.learnSteps.entries()) {
    await page.locator(`[data-skill="${topic.id}"] .lesson-topic`).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await expect(page.getByLabel(courses[topicIndex].example.ariaLabel)).toBeVisible();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    if (["dummy", "declarer", "defense"].includes(topic.action)) {
      for (const [i, step] of bridgeLearningSteps(topic.action as "dummy" | "declarer" | "defense").entries()) {
        const card = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
        await page.getByLabel(step.handLabel ?? "Your drill hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
      }
    } else {
      for (const [i, step] of bridgeChoiceSteps(topic.action as BridgeChoiceTopic, system).entries()) {
        if (topic.action !== "contracts") {
          const images = page.getByLabel("Your Bridge bidding practice hand").locator("img");
          await expect(images).toHaveCount(13);
          await expect.poll(() => images.evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        }
        await page.getByLabel(topic.action === "contracts" ? "Trick targets" : "Bridge bidding choices").getByRole("button", { name: step.options.find(option => option.id === step.correct)!.label, exact: true }).click();
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        await expect(page.locator(".outcome")).toHaveText("Good");
        const next = page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true });
        await expect(next).toBeInViewport({ ratio: 1 });
        if (i === 0 && ["transfers", "rebidding", "stayman"].includes(topic.action))
          await page.screenshot({ path: info.outputPath(`american-${topic.action}.png`), fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await next.click();
      }
    }
    await expect(page.getByRole("status")).toHaveText(topicIndex === definition.learnSteps.length - 1 ? "Bridge learning path complete." : "Topic complete.");
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  }
  await expect(page.getByLabel("Bridge course progress")).toContainText("10 / 10 complete");
  await page.getByRole("button", { name: "Acol Foundation", exact: true }).click();
  await expect(page.getByLabel("Bridge course progress")).toContainText("4 / 9 complete");
  expect(await page.evaluate(key => localStorage.getItem(key), bridgeSaveKey)).toBe(saved);
  expect(errors).toEqual([]);
});

test("a live Jacoby transfer is accepted by partner and reaches the correct declaring hand", async ({ page }, info) => {
  let seed = 0;
  for (; seed < 5000; seed++) {
    const session = createBridgeSession(seed, 1, system);
    if (session.auctionCalls.map(call => normalizeBridgeCall(call.call)).join() !== "1NT,Pass" || session.selectedCall !== "2D") continue;
    const next = transitionBridgeSession(session, { type: "make-call" });
    if (normalizeBridgeCall(next.auctionCalls[4]?.call) === "2H" && next.selectedCall === "Pass") break;
  }
  expect(seed).toBeLessThan(5000);
  await page.addInitScript(seed => localStorage.setItem("barbu.practiceSeed.v1", String(seed)), seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("button", { name: "Play Bridge", exact: true }).click();
  await expect(page.getByLabel("Bridge bidding agreement")).toContainText("Standard American Foundation");
  await expect(page.getByLabel("Bridge bidding box")).toContainText("Jacoby transfer");
  await page.getByRole("button", { name: "Make call", exact: true }).click();
  await expect(page.getByLabel("Bridge auction history")).toContainText(bridgeCallLabel("2H"));
  await expect(page.getByLabel("Bridge bidding box")).toContainText("Pass after the transfer acceptance");
  await page.screenshot({ path: info.outputPath("american-transfer-auction.png"), fullPage: true });
  await page.getByRole("button", { name: "Make call", exact: true }).click();
  await page.getByRole("button", { name: "Start play", exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), bridgeSaveKey);
  expect(saved.biddingSystem).toBe(system);
  expect(saved.fullHand.bridgeContract).toMatchObject({ strain: "H", declarer: "Tutor", dummy: "You" });
  await page.locator(".bridge-thumb-hand .legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.screenshot({ path: info.outputPath("american-transfer-play.png") });
});
