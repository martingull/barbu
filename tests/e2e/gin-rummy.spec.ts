import { expect, test, type Page } from "@playwright/test";
import { createGinSession, ginComplete, transitionGinSession, type GinSession } from "../../src/domain/ginRummySession";
import { chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import { ginSaveKey, restoreGinSession, saveGinSession } from "../../src/persistence/ginRummySave";
import { ginExercises, ginExerciseAnswer } from "../../src/lessons/gin-rummy/exercises";

async function saved(page: Page) {
  return restoreGinSession(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), ginSaveKey));
}
async function seed(page: Page, session = createGinSession(1)) {
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: ginSaveKey, value: saveGinSession(session, new Date().toISOString()) });
  await page.reload();
  await page.getByRole("button", { name: "Continue Gin Rummy", exact: true }).click();
}
async function move(page: Page, session: GinSession) {
  const action = chooseGinAction(ginObservation(session));
  if (action.type === "pass") await page.getByRole("button", { name: "Pass upcard", exact: true }).click();
  else if (action.type === "draw") await page.getByRole("button", { name: action.source === "stock" ? "Draw stock" : "Take upcard", exact: true }).last().click();
  else if (action.type === "discard") {
    const card = session.hand.hands[0].find(card => card.id === action.cardId)!;
    await page.getByLabel("Your Gin Rummy hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
    await page.getByRole("button", { name: action.knock ? /^(Knock|Go gin)$/ : "Discard", exact: true }).click();
  }
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
  test(`Gin play fits ${viewport.width}x${viewport.height} and restores the hand`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await seed(page);
    const hand = page.getByLabel("Your Gin Rummy hand", { exact: true });
    await expect(hand.getByRole("button")).toHaveCount(10);
    const board = page.locator(".gin-table");
    const original = (await board.boundingBox())!;
    await page.getByRole("button", { name: "Take upcard", exact: true }).click();
    await expect(hand.getByRole("button")).toHaveCount(11);
    const picked = (await saved(page)).hand.blockedDiscard;
    const pickedCard = (await saved(page)).hand.hands[0].find(card => card.id === picked)!;
    await hand.getByRole("button", { name: `${pickedCard.rank} ${pickedCard.suit}`, exact: true }).click();
    await expect(page.getByRole("button", { name: "Discard", exact: true })).toBeDisabled();
    await hand.locator("button.legal").first().click();
    await expect(page.getByRole("button", { name: "Discard", exact: true })).toBeEnabled();
    const after = (await board.boundingBox())!;
    expect(Math.abs(original.height - after.height)).toBeLessThanOrEqual(1);
    const handBox = (await hand.boundingBox())!;
    expect(handBox.y - (after.y + after.height)).toBeGreaterThanOrEqual(8);
    const opponent = (await board.locator(".opponent").boundingBox())!;
    const message = (await board.locator(".last-action").boundingBox())!;
    expect(opponent.y - after.y).toBeGreaterThanOrEqual(6);
    expect(after.y + after.height - message.y - message.height).toBeGreaterThanOrEqual(6);
    const controls = (await page.locator(".action-row").boundingBox())!;
    expect(controls.y + controls.height).toBeLessThanOrEqual(viewport.height);
    for (const label of ["Discard", "Knock"]) await expect(page.getByRole("button", { name: label, exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: info.outputPath("gin-discard.png"), fullPage: true });
    const before = await saved(page);
    await page.reload();
    await page.getByRole("button", { name: "Continue Gin Rummy", exact: true }).click();
    expect((await saved(page)).hand).toEqual(before.hand);
    await move(page, await saved(page));
    await expect(hand.getByRole("button")).toHaveCount(10);
    expect(errors).toEqual([]);
  });
}

test("Gin completes a played hand and advances once without stale points", async ({ page }, info) => {
  await seed(page);
  let session = await saved(page), count = 0;
  while (session.hand.phase !== "complete" && count++ < 100) { await move(page, session); session = await saved(page); }
  expect(session.hand.phase).toBe("complete");
  await expect(page.getByLabel("Barbu's melds", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("gin-result.png"), fullPage: true });
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  expect((await saved(page)).handNumber).toBe(2);
  expect((await saved(page)).scores).toEqual(session.scores);
});

test("Gin game completion is announced and survives reload", async ({ page }) => {
  let session = createGinSession(1), count = 0;
  while (!ginComplete(session) && count++ < 2000) session = transitionGinSession(session,
    session.hand.phase === "complete" ? { type: "next", seed: count } : chooseGinAction(ginObservation(session)));
  expect(ginComplete(session)).toBe(true);
  await page.addInitScript(() => { (window as any).ginCompletions = []; window.addEventListener("barbu:game-completed", event => (window as any).ginCompletions.push((event as CustomEvent).detail)); });
  await seed(page, session);
  await expect(page.getByRole("button", { name: "New game", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).ginCompletions)).toHaveLength(1);
  await page.getByRole("button", { name: "Replay hand", exact: true }).click();
  expect(ginComplete(await saved(page))).toBe(false);
  await expect(page.getByLabel("Your Gin Rummy hand", { exact: true })).toBeVisible();
});

test("Gin teaches nine decisions and persists progress separately from play", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page);
  const before = await saved(page);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const [topic, steps] of Object.entries(ginExercises)) {
    await page.getByRole("button", { name: /^(Start learning|Continue learning)$/ }).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const choices = topic === "melds" ? step.hand.map(card => card.id) : topic === "draw" ? ["stock", "upcard"] : ["continue", "knock", "gin"];
      const correct = choices.find(choice => ginExerciseAnswer(topic, step, choice).good)!;
      await expect(page.locator(".contract-status")).toContainText(`Decision ${index + 1} of 3`);
      if (topic === "melds") {
        const card = step.hand.find(card => card.id === correct)!;
        await page.getByLabel("Your Gin Rummy exercise hand").getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
      } else await page.getByRole("button", { name: ({ stock: "Draw stock", upcard: "Take upcard", continue: "Keep playing", knock: "Knock", gin: "Go gin" } as Record<string, string>)[correct], exact: true }).click();
      await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeInViewport();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".outcome")).toHaveText("Good");
      if (index === 0) await page.screenshot({ path: info.outputPath(`gin-${topic}.png`), fullPage: true });
      await page.getByRole("button", { name: index === 2 ? "Finish practice" : "Next decision", exact: true }).click();
    }
    await page.getByRole("button", { name: "Finish Gin Rummy", exact: true }).click();
  }
  await expect(page.getByLabel("Gin Rummy course progress")).toContainText("3 / 3 complete");
  expect(await saved(page)).toEqual(before);
  await page.reload();
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Gin Rummy course progress")).toContainText("3 / 3 complete");
  await page.getByRole("button", { name: /^Reference/ }).click();
  await expect(page.getByRole("heading", { name: "Gin Rummy reference", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Gin Rummy table", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gin Rummy table", exact: true })).toBeVisible();
});

test("Gin starts and remains usable when storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw Error("Unavailable"); } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await page.getByRole("button", { name: "Play Gin Rummy", exact: true }).click();
  await expect(page.getByLabel("Your Gin Rummy hand", { exact: true }).getByRole("button")).toHaveCount(10);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Continue Gin Rummy", exact: true }).click();
  await expect(page.getByLabel("Your Gin Rummy hand", { exact: true })).toBeVisible();
});

test("Gin lesson distinguishes an illegal declaration from a risky decision", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Try cards: Knock and gin", exact: true }).click();
  await page.getByRole("button", { name: "Go gin", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".outcome")).toHaveText("Illegal");
  await expect(page.locator(".explanation")).toContainText("Gin needs zero deadwood");
});
