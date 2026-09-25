import { expect, test, type Page } from "@playwright/test";
import { generateBarbuPracticeSet } from "../../src/domain/barbuPractice";
import { barbuTrickContracts } from "../../src/domain/barbuRules";
import { formatCardText } from "../../src/presentation/cardDisplay";
import type { GeneratedPracticeScenario } from "../../src/domain/types";

async function openPractice(page: Page, native: boolean) {
  await page.addInitScript(native => {
    localStorage.setItem("barbu.practiceSeed.v1", "42");
    Object.assign(window, { nativeCommands: [] as string[] });
    if (native) Object.assign(window, { isTauri: true, __TAURI_INTERNALS__: { invoke: async (command: string) => {
      (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
      throw Error(`Unexpected native command: ${command}`);
    } } });
  }, native);
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}

async function checkDecision(page: Page, pool: GeneratedPracticeScenario[]) {
  const decision = page.getByLabel("Drill decision");
  const text = await decision.textContent();
  const scenario = pool.find(s => text?.includes(formatCardText(s.prompt)));
  expect(scenario).toBeDefined();
  const hand = page.getByLabel("Your drill hand");
  for (const card of scenario!.playerHand) {
    const button = hand.getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true });
    await expect(button).toHaveClass(scenario!.legalCardIds.includes(card.id) ? /\blegal\b/ : /\billegal\b/);
  }
  const choice = scenario!.outcomes.find(o => o.outcomeKind === "good") ?? scenario!.outcomes.find(o => o.isLegal)!;
  await hand.getByRole("button", { name: `${choice.cardId.slice(0, -1)} ${choice.cardId.at(-1)}`, exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  const label = choice.outcomeKind[0].toUpperCase() + choice.outcomeKind.slice(1);
  await expect(decision).toContainText(label);
  return scenario!;
}

for (const native of [false, true]) {
  for (const contract of barbuTrickContracts) {
    test(`Barbu ${contract} practice completes four patterns in ${native ? "native" : "browser"} mode`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await openPractice(page, native);
      await page.getByRole("button", { name: new RegExp(`^Try cards: ${contract}\\b`) }).click();
      const seen = new Set<string>();
      for (let i = 0; i < 4; i++) {
        await expect(page.getByLabel("Drill progress")).toContainText(`${i} / 4`);
        const scenario = await checkDecision(page, generateBarbuPracticeSet(42, contract).scenarios);
        expect(seen.has(scenario.id)).toBe(false);
        seen.add(scenario.id);
        if (i === 0 && contract === "Hearts Trumps") await page.screenshot({ path: info.outputPath("barbu-trump-practice.png"), fullPage: true });
        await page.getByRole("button", { name: i === 3 ? "Review session" : "Next decision", exact: true }).click();
      }
      await expect(page.getByRole("heading", { name: "Session complete", exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`Barbu mixed practice includes Domino and persists review in ${native ? "native" : "browser"} mode`, async ({ page }, info) => {
    await openPractice(page, native);
    await page.getByRole("button", { name: /^Review results/ }).click();
  await page.getByRole("button", { name: "Mixed contract review", exact: true }).click();
    const contracts: string[] = [];
    for (let i = 0; i < 7; i++) {
      const scenario = await checkDecision(page, generateBarbuPracticeSet(42).scenarios);
      contracts.push(scenario.contract);
      if (scenario.contract === "Domino") {
        const layout = page.getByLabel("Domino drill layout");
        await expect(layout).toBeVisible();
        const progress = await page.getByLabel("Drill progress").boundingBox();
        const board = await layout.boundingBox();
        const hand = await page.getByLabel("Your drill hand").boundingBox();
        expect(progress!.y + progress!.height).toBeLessThanOrEqual(board!.y);
        expect(board!.y + board!.height).toBeLessThanOrEqual(hand!.y);
        await page.screenshot({ path: info.outputPath("barbu-domino-practice.png"), fullPage: true });
      }
      await page.getByRole("button", { name: i === 6 ? "Review session" : "Next decision", exact: true }).click();
    }
    expect(contracts).toEqual([...barbuTrickContracts, "Domino"]);
    await expect(page.getByRole("heading", { name: "Session complete", exact: true })).toBeVisible();
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.playHistory.v1")!));
    expect(history[0].results.map((r: { contract: string }) => r.contract)).toEqual(contracts);
    expect(await page.evaluate(() => localStorage.getItem("barbu.practiceSeed.v1"))).toBe("43");
    expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
  });
}
