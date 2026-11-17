import { expect, test } from "@playwright/test";
import { createCanastaSession } from "../../src/domain/canastaSession";
import { canastaSaveKey, saveCanastaSession } from "../../src/persistence/canastaSave";

test.skip(process.env.VITE_CANASTA_PREVIEW !== "1" && process.env.BARBU_PACKAGED_PREVIEW !== "1", "Run a Canasta preview configuration.");

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`Canasta meld-risk learning preserves earlier progress and saved play at ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const saved = JSON.stringify(saveCanastaSession(createCanastaSession(9), "2026-11-17T12:00:00Z"));
    const progress = Object.fromEntries(["values", "melds", "opening", "pile", "discard", "finish", "score"].map(topic => [`canasta-${topic}`, true]));
    await page.goto("/");
    await page.evaluate(({ saved, progress, key }) => {
      localStorage.setItem(key, saved); localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(progress));
    }, { saved, progress, key: canastaSaveKey });
    await page.reload();
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await expect(page.getByLabel("Canasta course progress")).toContainText("7 / 8 complete");
    await expect(page.getByLabel("Continue learning")).toContainText("Manage meld risk");
    await page.getByRole("button", { name: "Continue lesson", exact: true }).click();
    const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
    const hand = page.getByLabel("Canasta exercise hand", { exact: true });
    const publicCards = page.getByRole("region", { name: "Canasta public position", exact: true });
    await expect(page.getByText("Worked example", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("Both moves are legal");
    await expect(publicCards.getByLabel("Meld queens", { exact: true }).locator("img")).toHaveCount(3);
    await expect(publicCards.getByLabel("Start wild meld", { exact: true }).locator("img")).toHaveCount(3);
    const before = { feedback: (await guidance.boundingBox())!, hand: (await hand.boundingBox())! };
    async function stable() {
      expect((await guidance.boundingBox())!.height).toBeCloseTo(before.feedback.height, 0);
      expect((await hand.boundingBox())!.y).toBeCloseTo(before.hand.y, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const buttons = (await page.locator(".canasta-exercise > .table-play-panel > .action-row").boundingBox())!;
      expect(buttons.y + buttons.height).toBeLessThanOrEqual(size.height);
    }
    await page.getByRole("button", { name: "Start wild meld", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(guidance.locator(".outcome")).toHaveText("Risky");
    await expect(guidance).toContainText("wild meld is legal");
    await expect(guidance).toContainText("2000-point penalty");
    await expect(page.getByRole("button", { name: "Start wild meld", exact: true })).toBeDisabled();
    await stable();
    await page.screenshot({ path: info.outputPath(`canasta-risk-feedback-${size.width}.png`) });
    await page.getByRole("button", { name: "Try another example", exact: true }).click();
    await expect(page.getByText("Another example", { exact: true })).toBeVisible();
    await expect(guidance).toContainText("Both moves are legal");
    await stable();
    await page.getByRole("button", { name: "Meld kings", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(guidance).toContainText("2500");
    await page.getByRole("button", { name: "Next decision", exact: true }).click();
    await expect(page.getByText("With guidance", { exact: true })).toBeVisible();
    await expect(publicCards.getByLabel("7 meld (6/7)", { exact: true }).locator("img")).toHaveCount(6);
    await stable();
    await page.getByRole("button", { name: "Finish sevens", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(guidance.locator(".outcome")).toHaveText("Good");
    await expect(guidance).toContainText("removes its possible 2500-point");
    await page.getByRole("button", { name: "Next decision", exact: true }).click();
    await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
    await expect(guidance).not.toContainText("Worked example");
    await expect(publicCards.getByLabel("J meld (5/7)", { exact: true }).locator("img")).toHaveCount(5);
    await stable();
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: info.outputPath(`canasta-risk-independent-${size.width}.png`) });
    await page.getByRole("button", { name: "Finish jacks", exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(guidance).toContainText("300-point end-of-hand bonus");
    await page.getByRole("button", { name: "Finish topic", exact: true }).click();
    await expect(page.getByText("3 of 4 decisions matched the lesson's goal.", { exact: true })).toBeVisible();
    await page.getByText("Review decisions", { exact: true }).click();
    const review = page.getByRole("list", { name: "Decision results" }).locator(".decision-review").first();
    await review.locator("summary").click();
    await expect(review.getByRole("region", { name: "Visible meld consequences", exact: true })).toBeVisible();
    await expect(review.getByRole("group", { name: "Your hand", exact: true }).locator(".chosen")).toHaveCount(3);
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
    await expect(page.getByLabel("Canasta course progress")).toContainText("8 / 8 complete");
    expect(await page.evaluate(key => localStorage.getItem(key), canastaSaveKey)).toBe(saved);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!));
    for (const key of Object.keys(progress)) expect(after[key]).toBe(true);
    expect(after["canasta-risk"]).toBe(true);
    expect(errors).toEqual([]);
  });
}
