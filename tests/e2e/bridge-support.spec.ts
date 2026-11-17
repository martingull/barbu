import { expect, test } from "@playwright/test";
import { bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { bridgeCallLabel } from "../../src/domain/bridgeAuction";
import { createBridgeSession } from "../../src/domain/bridgeSession";
import { bridgeSaveKey, saveBridgeSession } from "../../src/persistence/bridgeSave";

test("existing Bridge learners discover major support, reinforce a mistake and preserve their saved board", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const prior = Object.fromEntries(["contracts", "dummy", "bidding", "responding", "declarer", "defense"].map(topic => [`bridge-${topic}`, true]));
  const saved = JSON.stringify(saveBridgeSession(createBridgeSession(8), "2026-11-17"));
  await page.addInitScript(({ prior, saved, key }) => {
    if (!localStorage.getItem("barbu.courseProgress.v1")) localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(prior));
    if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
  }, { prior, saved, key: bridgeSaveKey });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Play", exact: true })).toContainText("Not Acol or complete SAYC");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Bridge course progress")).toContainText("6 / 7 complete");
  await page.getByLabel("Continue learning").getByRole("button").click();
  await expect(page.getByRole("heading", { name: "Support partner's major", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await expect(page.getByLabel("Bridge major support example").locator("img")).toHaveCount(3);
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  const steps = bridgeChoiceSteps("support");
  for (const [index, step] of [steps[0], steps[0].followUp!, steps[1], steps[2]].entries()) {
    await expect(page.getByLabel("Bridge bidding estimate")).toContainText(step.context);
    await expect(page.getByLabel("Your Bridge bidding practice hand").locator("img")).toHaveCount(13);
    await expect.poll(() => page.getByLabel("Your Bridge bidding practice hand").locator("img")
      .evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const choices = page.getByLabel("Bridge bidding choices");
    const answer = index === 0 ? "Pass" : step.correct;
    await choices.getByRole("button", { name: bridgeCallLabel(answer), exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(choices.getByRole("button").first()).toBeDisabled();
    await expect(page.getByLabel("Bridge bidding exercise")).toContainText(step.explanations[answer]);
    await expect(page.locator(".outcome")).toHaveText(index === 0 ? "Risky" : "Good");
    const next = page.getByRole("button", { name: index === 0 ? "Try another example" : index === 3 ? "Finish topic" : "Next decision", exact: true });
    await expect(next).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const boxes = await page.locator(".table-play-panel > *").evaluateAll(elements => elements.map(element => element.getBoundingClientRect())
      .filter(box => box.width > 0 && box.height > 0).map(box => ({ top: box.top, bottom: box.bottom })));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    await page.screenshot({ path: info.outputPath(`major-support-${index}.png`), fullPage: true });
    await next.click();
  }
  await expect(page.getByRole("status")).toHaveText("Bridge learning path complete.");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!).skills["bridge-support"]))
    .toMatchObject({ total: 4, correct: 3, attempts: 1 });
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toEqual({ ...prior, "bridge-support": true });
  expect(await page.evaluate(key => localStorage.getItem(key), bridgeSaveKey)).toBe(saved);
  expect(errors).toEqual([]);
});
