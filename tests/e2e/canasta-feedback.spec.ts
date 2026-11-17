import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.VITE_CANASTA_PREVIEW !== "1" || process.env.BARBU_PACKAGED_PREVIEW === "1", "Component positions use the Vite preview; packaged flows are covered separately.");

async function mountPosition(page: Page, ids: string, result = false, pickup = false) {
  await page.goto("/");
  await page.evaluate(async ({ ids, result, pickup }) => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { mount } = await load("/node_modules/svelte/src/index-client.js");
    const { default: View } = await load("/src/features/canasta/CanastaHandView.svelte");
    const { createCanastaSession, transitionCanastaSession } = await load("/src/domain/canastaSession.ts");
    const { canastaDeck } = await load("/src/domain/canastaRules.ts");
    const deck = canastaDeck(0), cards = (text: string) => text.split(" ").filter(Boolean).map(id => deck.find((card: any) => card.id === id));
    let session = createCanastaSession(3);
    session.hand.hands = [cards(ids), [], [], []];
    session.hand.sides = [0, 1].map(() => ({ opened: true, melds: [], threes: [] }));
    session.hand.phase = pickup || result ? "draw" : "play";
    session.hand.discards = cards(pickup ? "0-AH" : "1-6S");
    if (result) {
      session.hand.stock = [];
      session.hand.hands[2] = cards("0-AC 0-AD 0-AH");
      session.hand.sides[0].melds = [
        { rank: "4", cards: deck.filter((card: any) => card.rank === "4").slice(0, 7) },
        { rank: "7", cards: cards("0-7C 0-7D 0-7H") }
      ];
      session.hand.sides[0].threes = cards("0-3C 0-3H");
      session.hand.sides[1].melds = [{ rank: "Q", cards: deck.filter((card: any) => card.rank === "Q").slice(0, 5).concat(cards("0-2C 0-2D")) }];
      session = transitionCanastaSession(session, { type: "draw" });
    }
    (window as any).feedbackPosition = JSON.stringify(session);
    (window as any).feedbackActions = [];
    const target = document.createElement("main"); target.className = "app-shell fixed-play-screen";
    document.getElementById("app")!.replaceChildren(target);
    window.scrollTo(0, 0);
    mount(View, { target, props: { session, error: "", onAction: (action: any) => { (window as any).feedbackActions.push(action); return true; },
      onBack: () => {}, onNext: () => {}, onReplay: () => {}, onNew: () => {} } });
  }, { ids, result, pickup });
}

async function stage(page: Page, labels: string[]) {
  const hand = page.getByLabel("Cards for melding", { exact: true });
  for (const label of labels) await hand.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: /^Stage \d+ cards$/ }).click();
}

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`Canasta meld-risk warnings stay advisory and fit at ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await mountPosition(page, "0-AC 0-AD 0-AH 0-7C 0-7D 0-7H 0-2C 0-JR 0-JB 0-4C 0-5C");
    const before = (await page.locator(".canasta-table").boundingBox())!;
    await page.getByRole("button", { name: "Meld cards", exact: true }).click();
    const confirm = page.getByRole("button", { name: "Confirm melds", exact: true });
    await expect(confirm).toBeDisabled();
    const warningHeight = (await page.locator(".validation").boundingBox())!.height;
    await stage(page, ["A♣, pack 1", "A♦, pack 1", "A♥, pack 1"]);
    const risks = page.getByRole("list", { name: "Meld risks", exact: true });
    await expect(risks).toContainText("Unfinished natural aces (3/7): -2500");
    await expect(confirm).toBeEnabled();
    await page.getByRole("button", { name: "Remove A group", exact: true }).click();
    await expect(risks).toHaveCount(0);
    await stage(page, ["A♣, pack 1", "A♦, pack 1", "A♥, pack 1"]);
    await stage(page, ["7♣, pack 1", "7♦, pack 1", "7♥, pack 1"]);
    await stage(page, ["2♣, pack 1", "Red joker, pack 1", "Black joker, pack 1"]);
    await expect(risks).toContainText("Unfinished sevens (3/7): -2500");
    await expect(risks).toContainText("Unfinished wild meld (3/7): -2000");
    await expect(page.getByRole("region", { name: "Meld validation" })).toContainText("If the hand ends before completion");
    await expect(risks.getByRole("listitem")).toHaveCount(3);
    const validationBox = (await page.locator(".validation").boundingBox())!;
    const lastRisk = (await risks.getByRole("listitem").last().boundingBox())!;
    expect(lastRisk.y + lastRisk.height).toBeLessThanOrEqual(validationBox.y + validationBox.height);
    await expect(confirm).toBeEnabled();
    expect((await page.locator(".validation").boundingBox())!.height).toBeCloseTo(warningHeight, 0);
    expect((await page.locator(".canasta-table").boundingBox())!.height).toBeCloseTo(before.height, 0);
    await confirm.scrollIntoViewIfNeeded();
    const button = (await confirm.boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => (window as any).feedbackActions)).toEqual([]);
    await page.screenshot({ path: info.outputPath(`canasta-meld-risks-${size.width}.png`), fullPage: true });
    await confirm.click();
    expect(await page.evaluate(() => (window as any).feedbackActions[0].groups.map((group: any) => group.rank))).toEqual(["A", "7", "Wild"]);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`Canasta score explains actual bonuses and penalties at ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await mountPosition(page, "0-KC", true);
    const table = page.getByRole("table", { name: "Canasta hand scoring", exact: true });
    for (const [label, us, them] of [
      ["Natural fours canasta", "+500", "-"], ["Mixed queens canasta", "-", "+300"],
      ["Unfinished sevens", "-2500", "-"], ["Barbu: 3 aces held", "-1500", "-"],
      ["Red threes (1 exposed; one canasta: no score)", "0", "-"],
      ["Cards left with both partners", "-70", "0"], ["Total", "-3520", "+390"]
    ]) {
      const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: label, exact: true }) });
      await expect(row.getByRole("cell")).toHaveText([us, them]);
    }
    await expect(page.getByText("Barbu: 3 aces held", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Next hand", exact: true }).scrollIntoViewIfNeeded();
    const button = (await page.getByRole("button", { name: "Next hand", exact: true }).boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({ path: info.outputPath(`canasta-score-reasons-${size.width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("Canasta warns for automatic pickup melds and clears warnings when a canasta is completed", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mountPosition(page, "0-AC 0-AD 0-4C 0-5C", false, true);
  await page.getByRole("button", { name: "Take pile", exact: true }).click();
  await expect(page.getByRole("list", { name: "Meld risks" })).toContainText("Unfinished natural aces (3/7): -2500");
  await expect(page.getByRole("button", { name: "Confirm pickup", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await mountPosition(page, "0-AC 0-AD 0-AH 0-AS 1-AC 1-AD 1-AH 0-4C 0-5C");
  await page.getByRole("button", { name: "Meld cards", exact: true }).click();
  await stage(page, ["A♣, pack 1", "A♦, pack 1", "A♥, pack 1"]);
  await expect(page.getByRole("list", { name: "Meld risks" })).toHaveCount(1);
  await stage(page, ["A♠, pack 1", "A♣, pack 2", "A♦, pack 2", "A♥, pack 2"]);
  await expect(page.getByRole("list", { name: "Meld risks" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirm melds", exact: true })).toBeEnabled();
});
