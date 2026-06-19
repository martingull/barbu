import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function expectNoPageScroll(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) <= window.innerHeight + 1)
    )
    .toBe(true);
}

async function startContractHand(page: Page, contract: string) {
  await page.getByRole("button", { name: "Contract hands" }).click();
  await page.getByLabel("Contract hand choices").getByRole("button", { name: new RegExp(`^${contract}\\b`) }).click();
}

async function playFullHandDecision(page: Page) {
  await page.locator(".full-hand-card.legal").first().dblclick();

  const nextTrick = page.getByRole("button", { name: "Next trick", exact: true });
  try {
    await nextTrick.waitFor({ state: "visible", timeout: 500 });
    await nextTrick.click();
  } catch {
    // The last card of the hand goes straight to the result panel.
  }
}

test("catalog opens Barbu's table", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Choose a table" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Core games" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Barbu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hearts planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Whist planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bridge planned" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Varieties of play" })).toHaveCount(0);
  await expect(page.getByText("Barbu Learning Table")).toHaveCount(0);

  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });

  await page.getByRole("button", { name: "Open Barbu" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Meet the contract/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^1 Concept Meet the contract/ })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Play Barbu" })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Contract hands" })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Reference" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-table.png"), fullPage: true });
});

test("contract hand chooser opens isolated practice without page scroll", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "Contract hands" }).click();

  await expect(page.getByRole("heading", { name: "Contract hands" })).toBeVisible();
  await expect(page.getByLabel("Contract hand choices").getByRole("button", { name: /^No Hearts\b/ })).toBeVisible();
  await expect(page.getByLabel("Contract hand choices").getByRole("button", { name: /^No Queens\b/ })).toBeVisible();
  await expect(page.getByLabel("Contract hand choices").getByRole("button", { name: /^King of Hearts\b/ })).toBeVisible();
  await expect(page.getByLabel("Contract hand choices").getByRole("button", { name: /^No Last Two\b/ })).toBeVisible();
  await expect(page.getByLabel("Contract hand choices").getByRole("button", { name: /^No Tricks\b/ })).toBeVisible();
  await expect(page.getByLabel("Contract hand choices").getByRole("button", { name: /^Positive Tricks\b/ })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("contract-hand-chooser.png"), fullPage: true });
});

test("guided lesson accepts a legal card play", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /^No Hearts Avoid heart penalties/ }).click();
  await page.getByRole("button", { name: "See example" }).click();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await expect(page.getByRole("heading", { name: "Barbu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow clubs without taking the heart" })).toBeVisible();

  await page.getByRole("button", { name: "2 C" }).click();
  await expect(page.getByRole("button", { name: "Play selected" })).toBeEnabled();
  await page.getByRole("button", { name: "Play selected" }).click();

  await expect(page.getByText("Good")).toBeVisible();
  await expect(page.getByText("Left wins with AC and takes 1 heart penalty from Right's 4H.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next trick" })).toBeVisible();
});

test("No Hearts example shows clockwise order after Tutor leads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Meet the contract/ }).click();
  await page.getByRole("button", { name: "See example" }).click();

  const sequence = page.getByLabel("No Hearts trick sequence");

  await expect(page.getByRole("heading", { name: "Tutor leads clubs. Right discards a heart into that trick." })).toBeVisible();
  await expect(sequence).toContainText("Tutor plays 9C");
  await expect(sequence).toContainText("Right has no club and discards 4H");
  await expect(sequence).toContainText("You still have clubs, so you must follow clubs");
  await expect(sequence).not.toContainText("Left has no club and discards 4H");
});

test("Barbu reference exposes baseline rules and varieties", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "Reference" }).click();

  await expect(page.getByRole("heading", { name: "Barbu reference" })).toBeVisible();
  await expect(page.getByText("David Parlett, The Penguin Book of Card Games")).toBeVisible();
  await expect(page.getByText("Tutor -> Right -> You -> Left when Tutor leads")).toBeVisible();
  await expect(page.getByText("Follow the led suit when you can")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Barbu contracts" })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("No Hearts", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("No Queens", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("King of Hearts", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference")).toContainText("20 penalty points");
  await expect(page.getByLabel("Contract reference").getByText("No Last Two", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("No Tricks", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("Positive Tricks", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contract status" })).toBeVisible();
  await expect(page.getByLabel("Contract roadmap")).toContainText("Core candidate");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Positive Tricks");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Domino");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Not built");
  await expect(page.getByRole("heading", { name: "Documented variations" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-reference.png"), fullPage: true });
});

test("Quick drill gives five mixed-contract decisions and a result", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "Quick drill" }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByText("No Hearts").first()).toBeVisible();
  await expect(page.getByText("Decision 1 of 5")).toBeVisible();
  await expectNoPageScroll(page);

  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Good|Penalty|Risky/)).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Next table" }).click();

  await expect(page.getByText("No Queens").first()).toBeVisible();
  await expect(page.getByText("Decision 2 of 5")).toBeVisible();
  await expectNoPageScroll(page);
  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Good|Penalty|Risky/)).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Next table" }).click();

  await expect(page.getByText("King of Hearts").first()).toBeVisible();
  await expect(page.getByText("Decision 3 of 5")).toBeVisible();
  await expectNoPageScroll(page);
  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Good|Penalty|Risky/)).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Next table" }).click();

  await expect(page.getByText("No Last Two").first()).toBeVisible();
  await expect(page.getByText("Decision 4 of 5")).toBeVisible();
  await expectNoPageScroll(page);
  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Good|Penalty|Risky/)).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Next table" }).click();

  await expect(page.getByText("No Tricks").first()).toBeVisible();
  await expect(page.getByText("Decision 5 of 5")).toBeVisible();
  await expectNoPageScroll(page);
  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText(/Good|Penalty|Risky/)).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Finish drill" }).click();

  await expect(page.getByRole("heading", { name: "Drill complete" })).toBeVisible();
  await expect(page.getByText(/\/ 5 clean decisions/)).toBeVisible();
  const storedAttempt = await page.evaluate(() => {
    const history = JSON.parse(localStorage.getItem("barbu.playHistory.v1") ?? "[]");
    return history[0];
  });
  const storedReasons = storedAttempt.results.map((result: { reason: string }) => result.reason);
  expect(storedReasons).toHaveLength(5);
  expect(
    storedReasons.every((reason: string) =>
      ["avoided_penalty", "void_discard", "captured_penalty", "won_clean_trick", "followed_suit"].includes(reason)
    )
  ).toBe(true);
  await expect(page.getByLabel("Contract results").getByText("No Hearts")).toBeVisible();
  await expect(page.getByLabel("Contract results").getByText("No Queens")).toBeVisible();
  await expect(page.getByLabel("Contract results").getByText("King of Hearts")).toBeVisible();
  await expect(page.getByLabel("Contract results").getByText("No Last Two")).toBeVisible();
  await expect(page.getByLabel("Contract results").getByText("No Tricks")).toBeVisible();
  await expect(page.getByLabel("Recent quick drill attempts")).toContainText("/ 5 clean");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  const replayButton = page.getByRole("button", {
    name: /Replay (No Hearts|No Queens|King of Hearts|No Last Two|No Tricks)/
  });
  await expect(replayButton).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue path" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("play-barbu-result.png"), fullPage: true });

  await replayButton.click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByText("Decision 1 of 1")).toBeVisible();
  await expect(page.locator(".contract-status").filter({ hasText: /No Hearts|No Queens|King of Hearts|No Last Two|No Tricks/ })).toBeVisible();
  await expectNoPageScroll(page);
});

test("active game tables share one compact surface", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "Quick drill" }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.locator(".table-play-surface")).toBeVisible();
  const playBarbuTable = await page.getByLabel("Drill card table").boundingBox();
  expect(playBarbuTable).not.toBeNull();
  await expectNoPageScroll(page);

  await page.locator(".table-play-topbar").getByRole("button", { name: "Table" }).click();
  await startContractHand(page, "No Hearts");

  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expect(page.locator(".table-play-surface")).toBeVisible();
  const noHeartsTable = await page.getByLabel("No Hearts hand table").boundingBox();
  expect(noHeartsTable).not.toBeNull();
  await expectNoPageScroll(page);

  expect(Math.round(noHeartsTable?.height ?? 0)).toBe(Math.round(playBarbuTable?.height ?? -1));
});

test("Play Barbu advances full-hand contracts with a running total", async ({ page }) => {
  const contracts = ["No Hearts", "No Queens", "King of Hearts", "No Last Two", "No Tricks", "Positive Tricks"];

  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "Play Barbu" }).click();

  for (const [index, contract] of contracts.entries()) {
    await expect(page.getByRole("heading", { name: contract })).toBeVisible();
    await expect(page.getByText(`Contract ${index + 1} of ${contracts.length}`)).toBeVisible();
    await expect(page.getByLabel("Play Barbu contract intro")).toContainText("Barbu sets the contract");
    await expect(page.getByLabel("Play Barbu session summary")).toContainText("Leader");
    await expect(page.getByLabel("Play Barbu session summary")).toContainText("Your place");
    await expect(page.getByLabel("Play Barbu session summary")).toContainText("Remaining");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText("Contract");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText("You");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText("Barbu");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText("Left");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText("Right");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText(contract);
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText(index === 0 ? "Now" : "Complete");
    await expect(page.getByLabel("Play Barbu scorecard")).toContainText("Total");
    await expectNoPageScroll(page);
    await page.getByRole("button", { name: "Start hand" }).click();

    await expect(page.getByRole("heading", { name: `${contract} hand` })).toBeVisible();
    await expect(page.getByText(`Contract ${index + 1} of ${contracts.length}`)).toBeVisible();
    await expect(page.getByLabel(`${contract} hand score`)).toContainText("Your score");
    await expect(page.getByLabel(`${contract} hand score`)).toContainText("Barbu score");
    await expect(page.getByLabel(`${contract} hand score`)).toContainText("Left score");
    await expect(page.getByLabel(`${contract} hand score`)).toContainText("Right score");
    await expectNoPageScroll(page);

    for (let decision = 0; decision < 13; decision += 1) {
      await playFullHandDecision(page);
    }

    if (index < contracts.length - 1) {
      await expect(page.getByRole("button", { name: "Next contract" })).toBeVisible();
      await expectNoPageScroll(page);
      await page.getByRole("button", { name: "Next contract" }).click();
    }
  }

  await expect(page.getByRole("heading", { name: /You won the game|You tied for 1st|You finished/ })).toBeVisible();
  await expect(page.getByLabel("Play Barbu score")).toContainText("You");
  await expect(page.getByLabel("Play Barbu score")).toContainText("Barbu");
  await expect(page.getByLabel("Play Barbu score")).toContainText("Left");
  await expect(page.getByLabel("Play Barbu score")).toContainText("Right");
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Your place");
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Best contract");
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Practice next");
  await expect(page.getByLabel("Play Barbu results")).toContainText("No Hearts");
  await expect(page.getByLabel("Play Barbu results")).toContainText("No Tricks");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Positive Tricks");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Complete");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Total");
  await expect(page.getByRole("button", { name: "Replay weakest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Replay weakest" }).click();
  await expect(page.getByRole("heading", { name: /No Hearts hand|No Queens hand|King of Hearts hand|No Last Two hand|No Tricks hand|Positive Tricks hand/ })).toBeVisible();
});

test("No Hearts hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "No Hearts");

  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("No Hearts hand score")).toContainText("Your penalty");
  await expect(page.getByLabel("No Hearts hand table")).toBeVisible();
  await expectNoPageScroll(page);

  await page.locator(".full-hand-card.legal").first().dblclick();
  await expect(page.getByLabel("No Hearts hand decision")).toContainText("Left's card is on the table");
  await expect(page.getByLabel("No Hearts hand table").locator(".table-card")).toHaveCount(4);
  await expect(page.locator(".table-play-panel p.outcome").filter({ hasText: /(won the trick|won a clean trick)/ })).toBeVisible();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();

  for (let decision = 1; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Clean hand|Damage limited|Barbu caught you/ })).toBeVisible();
  await expect(page.getByLabel("No Hearts hand score")).toContainText("30 / 30");
  await expect(page.getByLabel("No Hearts result summary")).toContainText("Barbu took");
  await expect(page.getByLabel("No Hearts key tricks")).toContainText("Best escape");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("no-hearts-hand.png"), fullPage: true });
});

test("No Queens hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "No Queens");

  await expect(page.getByRole("heading", { name: "No Queens hand" })).toBeVisible();
  await expect(page.getByLabel("No Queens hand score")).toContainText("points in play");
  await expect(page.getByLabel("No Queens hand table")).toBeVisible();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Clean hand|Damage limited|Barbu caught you/ })).toBeVisible();
  await expect(page.getByLabel("No Queens hand score")).toContainText("24 / 24");
  await expect(page.getByLabel("No Queens result summary")).toContainText("Barbu took");
  await expect(page.getByLabel("No Queens key tricks")).toContainText("Costliest trick");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("no-queens-hand.png"), fullPage: true });
});

test("King of Hearts hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "King of Hearts");

  await expect(page.getByRole("heading", { name: "King of Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("King of Hearts hand score")).toContainText("points in play");
  await expect(page.getByLabel("King of Hearts hand table")).toBeVisible();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Clean hand|Damage limited|Barbu caught you/ })).toBeVisible();
  await expect(page.getByLabel("King of Hearts hand score")).toContainText("20 / 20");
  await expect(page.getByLabel("King of Hearts result summary")).toContainText("You took");
  await expect(page.getByLabel("King of Hearts key tricks")).toContainText("Best escape");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("king-of-hearts-hand.png"), fullPage: true });
});

test("No Last Two hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "No Last Two");

  await expect(page.getByRole("heading", { name: "No Last Two hand" })).toBeVisible();
  await expect(page.getByLabel("No Last Two hand score")).toContainText("points in play");
  await expect(page.getByLabel("No Last Two hand table")).toBeVisible();
  const activeTable = await page.getByLabel("No Last Two hand table").boundingBox();
  expect(activeTable).not.toBeNull();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Clean hand|Damage limited|Barbu caught you/ })).toBeVisible();
  await expect(page.getByLabel("No Last Two hand score")).toContainText("30 / 30");
  await expect(page.getByLabel("No Last Two result summary")).toContainText("Barbu took");
  await expect(page.getByLabel("No Last Two key tricks")).toContainText("Costliest trick");
  const resultTable = await page.getByLabel("No Last Two hand table").boundingBox();
  expect(resultTable).not.toBeNull();
  expect(Math.round(resultTable?.height ?? 0)).toBe(Math.round(activeTable?.height ?? -1));
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("no-last-two-hand.png"), fullPage: true });
});

test("No Tricks hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "No Tricks");

  await expect(page.getByRole("heading", { name: "No Tricks hand" })).toBeVisible();
  await expect(page.getByLabel("No Tricks hand score")).toContainText("points in play");
  await expect(page.getByLabel("No Tricks hand table")).toBeVisible();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Clean hand|Damage limited|Barbu caught you/ })).toBeVisible();
  await expect(page.getByLabel("No Tricks hand score")).toContainText("26 / 26");
  await expect(page.getByLabel("No Tricks result summary")).toContainText("Barbu took");
  await expect(page.getByLabel("No Tricks key tricks")).toContainText("Costliest trick");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("no-tricks-hand.png"), fullPage: true });
});

test("Positive Tricks hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "Positive Tricks");

  await expect(page.getByRole("heading", { name: "Positive Tricks hand" })).toBeVisible();
  await expect(page.getByLabel("Positive Tricks hand score")).toContainText("points in play");
  await expect(page.getByLabel("Positive Tricks hand table")).toBeVisible();
  await expectNoPageScroll(page);

  await page.locator(".full-hand-card.legal").first().dblclick();
  await expect(page.getByLabel("Positive Tricks hand decision")).toContainText(/banked|chance to overtake/);
  await expect(page.locator(".table-play-panel p.outcome.warning")).toHaveCount(0);
  await page.getByRole("button", { name: "Next trick", exact: true }).click();

  for (let decision = 1; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Strong trick count|Keep fighting for tricks/ })).toBeVisible();
  await expect(page.getByLabel("Positive Tricks hand score")).toContainText("65 / 65");
  await expect(page.getByLabel("Positive Tricks result summary")).toContainText("You won");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("positive-tricks-hand.png"), fullPage: true });
});

test("finishing a lesson advances course progress", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Meet the contract/ }).click();

  await expect(page.getByRole("heading", { name: "Meet the contract" })).toBeVisible();
  await expect(page.getByText("hearts are cargo you do not want to collect")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Tutor leads clubs/ })).toBeVisible();
  await expect(page.getByLabel("No Hearts trick sequence")).toContainText("Tutor plays 9C");
  await expect(page.getByLabel("No Hearts trick sequence")).toContainText("Right has no club");
  await expect(page.getByLabel("No Hearts trick sequence")).toContainText("You still have clubs");
  await expect(page.getByLabel("No Hearts example table")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("no-hearts-example.png"), fullPage: true });
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await page.getByRole("button", { name: "2 C" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Next trick" }).click();

  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("locate the trick winner before worrying about the heart")).toBeVisible();
  await page.getByRole("button", { name: "Finish No Hearts" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByText("1 / 5 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Spot the danger/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Meet the contract/ })).toContainText("Complete");
});

test("No Queens course has concept example play and review", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("barbu.courseProgress.v1", JSON.stringify({ "meet-contract": true }));
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Spot the danger/ }).click();

  await expect(page.getByRole("heading", { name: "Spot the danger" })).toBeVisible();
  await expect(page.getByText("queens are only dangerous when they land in a trick you win")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Tutor leads diamonds/ })).toBeVisible();
  await expect(page.getByLabel("No Queens trick sequence")).toContainText("Tutor plays 8D");
  await expect(page.getByLabel("No Queens trick sequence")).toContainText("Right follows diamonds");
  await expect(page.getByLabel("No Queens trick sequence")).toContainText("You must follow diamonds");
  await expect(page.getByLabel("No Queens example table")).toBeVisible();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await page.getByRole("button", { name: "3 D" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Next trick" }).click();

  await page.getByRole("button", { name: "K C" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("No Queens rewards patience")).toBeVisible();
  await page.getByRole("button", { name: "Finish No Queens" }).click();

  await expect(page.getByText("2 / 5 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Play the trick/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Spot the danger/ })).toContainText("Complete");
});

test("King of Hearts course has concept example play and review", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "barbu.courseProgress.v1",
      JSON.stringify({ "meet-contract": true, "spot-danger": true })
    );
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Play the trick/ }).click();

  await expect(page.getByRole("heading", { name: "Avoid the king" })).toBeVisible();
  await expect(page.getByText("one card carries the danger")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("king-of-hearts-concept.png"), fullPage: true });
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Tutor leads hearts/ })).toBeVisible();
  await expect(page.getByLabel("King of Hearts trick sequence")).toContainText("Tutor plays 10H");
  await expect(page.getByLabel("King of Hearts trick sequence")).toContainText("Right follows with KH");
  await expect(page.getByLabel("King of Hearts example table")).toBeVisible();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await page.getByRole("button", { name: "2 H" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Next trick" }).click();

  await page.getByRole("button", { name: "K H" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("locate KH, then ask who wins this trick")).toBeVisible();
  await page.getByRole("button", { name: "Finish King of Hearts" }).click();

  await expect(page.getByText("3 / 5 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Practice table/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play the trick/ })).toContainText("Complete");
});

test("No Last Two course has concept example play and review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /^No Last Two/ }).click();

  await expect(page.getByRole("heading", { name: "Avoid the final tricks" })).toBeVisible();
  await expect(page.getByText("the danger appears late")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Trick 12 starts with spades/ })).toBeVisible();
  await expect(page.getByLabel("No Last Two trick sequence")).toContainText("This is trick 12");
  await expect(page.getByLabel("No Last Two trick sequence")).toContainText("Tutor overtakes with JS");
  await expect(page.getByLabel("No Last Two example table")).toBeVisible();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await page.getByRole("button", { name: "2 S" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Next trick" }).click();

  await page.getByRole("button", { name: "A C" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("No Last Two is a timing contract")).toBeVisible();
  await page.getByRole("button", { name: "Finish No Last Two" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^No Last Two/ })).toContainText("Complete");
});

test("No Tricks course has concept example play and review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /^No Tricks/ }).click();

  await expect(page.getByRole("heading", { name: "Avoid every trick" })).toBeVisible();
  await expect(page.getByText("control is the thing you avoid")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Tutor leads clubs/ })).toBeVisible();
  await expect(page.getByLabel("No Tricks trick sequence")).toContainText("Tutor plays 9C");
  await expect(page.getByLabel("No Tricks trick sequence")).toContainText("Right plays KC");
  await expect(page.getByLabel("No Tricks example table")).toBeVisible();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await page.getByRole("button", { name: "2 C" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Next trick" }).click();

  await page.getByRole("button", { name: "K D" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("No Tricks turns every win into a cost")).toBeVisible();
  await page.getByRole("button", { name: "Finish No Tricks" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^No Tricks/ })).toContainText("Complete");
});

test("training path practice step starts quick drill and marks completion", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "barbu.courseProgress.v1",
      JSON.stringify({
        "meet-contract": true,
        "spot-danger": true,
        "play-trick": true
      })
    );
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Practice table/ }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();

  for (const buttonName of ["Next table", "Next table", "Next table", "Next table", "Finish drill"]) {
    await page.locator(".hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: buttonName }).click();
  }

  await expect(page.getByRole("heading", { name: "Drill complete" })).toBeVisible();
  await page.getByRole("button", { name: "Continue path" }).click();

  await expect(page.getByRole("heading", { name: "Review the hand" })).toBeVisible();
  await expect(page.getByLabel("Review contract results")).toContainText("No Hearts");
  await expect(page.getByLabel("Review contract results")).toContainText("No Tricks");
  await expect(page.getByLabel("Review recent attempts")).toContainText("/ 5 clean");
  await expect(
    page.getByText(/You (avoided the penalty card|used a void turn to discard|captured a penalty|won a clean trick)/)
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Replay (No Hearts|No Queens|King of Hearts|No Last Two|No Tricks)/ })).toBeVisible();
  await page.getByRole("button", { name: "Finish review" }).click();

  await expect(page.getByText("5 / 5 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Review the hand/ })).toContainText("Complete");
});

test("completed course does not loop back to the first lesson", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "barbu.courseProgress.v1",
      JSON.stringify({
        "meet-contract": true,
        "spot-danger": true,
        "play-trick": true,
        "generated-drill": true,
        review: true
      })
    );
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();

  await expect(page.getByText("5 / 5 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review results" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset path" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Meet the contract/ })).toHaveCount(0);
});
