import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name !== "iphone-16") {
    return;
  }

  await page.addInitScript(() => {
    const applySafeArea = () => {
      document.documentElement.style.setProperty("--app-safe-area-top", "47px");
      document.documentElement.style.setProperty("--app-safe-area-bottom", "34px");
    };

    applySafeArea();
    document.addEventListener("DOMContentLoaded", applySafeArea, { once: true });
  });
});

async function safeAreaBottom(page: Page) {
  return page.evaluate(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--app-safe-area-bottom").trim();
    return Number.parseFloat(value) || 0;
  });
}

async function safeAreaTop(page: Page) {
  return page.evaluate(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--app-safe-area-top").trim();
    return Number.parseFloat(value) || 0;
  });
}

async function expectControlBelowSafeArea(page: Page, selector: string) {
  const control = page.locator(selector).first();
  await expect(control).toBeVisible();
  await expect
    .poll(async () => {
      const box = await control.boundingBox();
      if (!box) {
        return false;
      }

      const expectedTop = await safeAreaTop(page);
      return box.y >= expectedTop - 1;
    })
    .toBe(true);
}

async function expectNoPageScroll(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) <= window.innerHeight + 1)
    )
    .toBe(true);
}

async function expectGameplayActionRowPinned(page: Page) {
  const row = page.locator(".table-play-surface .action-row").last();
  await expect(row).toBeVisible();
  await expect(row).toHaveCSS("position", "fixed");
  await expect
    .poll(async () => {
      const box = await row.boundingBox();
      if (!box) {
        return false;
      }

      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const bottomGap = viewportHeight - (box.y + box.height);
      const expectedBottomGap = await safeAreaBottom(page);
      return bottomGap >= expectedBottomGap - 1 && bottomGap <= expectedBottomGap + 18;
    })
    .toBe(true);
}

async function expectHandNearActionRow(page: Page, handSelector: string) {
  const hand = page.locator(handSelector).last();
  const row = page.locator(".table-play-surface .action-row").last();
  await expect(hand).toBeVisible();
  await expect(row).toBeVisible();
  await expect
    .poll(async () => {
      const handBox = await hand.boundingBox();
      const rowBox = await row.boundingBox();
      if (!handBox || !rowBox) {
        return false;
      }

      const gap = rowBox.y - (handBox.y + handBox.height);
      return gap >= 0 && gap <= 28;
    })
    .toBe(true);
}

async function expectFeedbackAboveHand(page: Page, handSelector: string) {
  const hand = page.locator(handSelector).last();
  const feedbackItems = page.locator(
    ".table-play-surface.compact-play .table-play-panel .result, .table-play-surface.compact-play .table-play-panel .outcome, .table-play-surface.compact-play .table-play-panel .explanation"
  );
  await expect(hand).toBeVisible();
  await expect
    .poll(async () => {
      const handBox = await hand.boundingBox();
      if (!handBox) {
        return false;
      }

      let feedbackBottom = 0;
      const count = await feedbackItems.count();
      for (let index = 0; index < count; index += 1) {
        const box = await feedbackItems.nth(index).boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          feedbackBottom = Math.max(feedbackBottom, box.y + box.height);
        }
      }

      return feedbackBottom > 0 && feedbackBottom <= handBox.y - 8;
    })
    .toBe(true);
}

async function gotoWithPracticeSeed(page: Page, seed: number) {
  await page.goto("/");
  await page.evaluate((nextSeed) => {
    localStorage.setItem("barbu.practiceSeed.v1", String(nextSeed));
  }, seed);
  await page.reload();
}

async function expectTableSlotsSeparated(page: Page) {
  await expect
    .poll(async () => {
      const tutor = await page.locator(".card-table .tutor-slot .cardholder").boundingBox();
      const you = await page.locator(".card-table .you-slot .cardholder").boundingBox();
      if (!tutor || !you) {
        return false;
      }

      return tutor.y + tutor.height <= you.y;
    })
    .toBe(true);
}

async function openBarbuTab(page: Page, tab: "Learn" | "Practice" | "Play" | "Perfect") {
  await page.getByRole("tab", { name: tab }).click();
  await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
}

async function openBarbuContracts(page: Page) {
  await page.getByRole("button", { name: /Barbu contracts/ }).click();
  await expect(page.getByRole("heading", { name: "Barbu contracts" })).toBeVisible();
}

async function gotoWithCourseProgress(page: Page, progress: Record<string, boolean>) {
  await page.goto("/");
  await page.evaluate((seededProgress) => {
    localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(seededProgress));
  }, progress);
  await page.reload();
}

async function startContractLesson(page: Page, contract: string) {
  await openBarbuContracts(page);
  await page.getByRole("button", { name: new RegExp(`^${contract}\\b`) }).click();
}

async function startContractHand(page: Page, contract: string) {
  await openBarbuTab(page, "Practice");
  if (contract === "Domino") {
    await page.getByLabel("Full hand practice").getByRole("button", { name: /^Domino\b/ }).click();
    return;
  }

  await page.getByLabel("Fixed contract drills").getByRole("button", { name: new RegExp(`^${contract}\\b`) }).click();
}

async function checkDrillAnswer(page: Page) {
  const checkAnswer = page.getByRole("button", { name: "Check answer" });
  await expect(checkAnswer).toBeEnabled();
  await checkAnswer.tap();
}

async function continueDrillFromCheckedAnswer(page: Page, name: "Next decision" | "Review session" | "Finish session") {
  const action = page.getByRole("button", { name });
  await expect(action).toBeEnabled();
  await action.tap();
}

async function completeQuickDrillDecision(page: Page) {
  await page.locator(".drill-hand .hand-card.legal").first().tap();
  await checkDrillAnswer(page);
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

async function passThreeHeartsCards(page: Page) {
  const passingHand = page.getByLabel("Your Hearts passing hand");
  await passingHand.locator("button").nth(0).click();
  await passingHand.locator("button").nth(1).click();
  await passingHand.locator("button").nth(2).click();
  await expect(page.getByLabel("Hearts pass summary")).toContainText("3 / 3");
  await page.getByRole("button", { name: "Pass cards" }).click();
}

async function playDominoDecision(page: Page) {
  const handRegion = page.getByRole("region", { name: "Domino hand", exact: true });
  const previousState = await handRegion.innerText();
  const placeCard = page.getByRole("button", { name: "Place card" });
  const legalCard = page.locator(".domino-cards .full-hand-card.legal").first();

  if (await placeCard.isEnabled()) {
    await legalCard.click();
    await placeCard.click();
    await expect.poll(async () => (await handRegion.innerText()) !== previousState).toBe(true);
    return;
  }

  if ((await legalCard.count()) > 0) {
    await legalCard.click();
    await placeCard.click();
    await expect.poll(async () => (await handRegion.innerText()) !== previousState).toBe(true);
    return;
  }

  await page.getByRole("button", { name: "Pass" }).click();
  await expect.poll(async () => (await handRegion.innerText()) !== previousState).toBe(true);
}

async function playDominoHand(page: Page) {
  for (let decision = 0; decision < 60; decision += 1) {
    if ((await page.getByRole("button", { name: "Next contract" }).count()) > 0) {
      return;
    }
    if ((await page.getByRole("button", { name: "New game" }).count()) > 0) {
      return;
    }
    if ((await page.getByRole("heading", { name: /You went out first|You finished|Domino complete/ }).count()) > 0) {
      return;
    }

    await playDominoDecision(page);
  }

  throw new Error("Domino hand did not finish");
}

test("catalog opens Barbu's table", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Choose a table" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Core games" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Hearts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Barbu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Card Counting" })).toContainText("Pack");
  await expect(page.getByRole("button", { name: "Open Card Counting" })).toContainText("4 minigames");
  await expect(page.getByRole("button", { name: "Solitaire planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Whist planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bridge planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gin Rummy planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Canasta planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Whist planned" })).toContainText("Free");
  await expect(page.getByRole("button", { name: "Solitaire planned" })).toContainText("Pack");
  await expect(page.getByRole("heading", { name: "Varieties of play" })).toHaveCount(0);
  await expect(page.getByText("Barbu Learning Table")).toHaveCount(0);
  await expect
    .poll(async () =>
      page.locator(".game-card strong").evaluateAll((items) => items.slice(0, 4).map((item) => item.textContent?.trim()))
    )
    .toEqual(["Hearts", "Barbu", "Whist", "Card Counting"]);

  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });

  await page.getByRole("button", { name: "Open Barbu" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Play Barbu" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Perfect" })).toBeVisible();

  await openBarbuTab(page, "Learn");
  await expect(page.getByRole("button", { name: /Continue with Meet the contract/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^1 Concept Meet the contract/ })).toBeVisible();
  await expect(page.getByLabel("Barbu course progress")).toContainText("0 / 9 complete");
  await expect(page.getByLabel("Barbu lesson path")).toContainText("Meet the contract");
  await expect(page.getByLabel("Barbu lesson path")).toContainText("Learn the Barbu table");
  await expect(page.getByRole("button", { name: /Barbu contracts/ })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Reference" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-learn.png"), fullPage: true });

  await openBarbuContracts(page);
  await expect(page.getByLabel("Core Barbu contracts")).toContainText("No Hearts");
  await page.screenshot({ path: testInfo.outputPath("barbu-contracts.png"), fullPage: true });
  await page.getByRole("button", { name: "Table" }).click();

  await openBarbuTab(page, "Practice");
  await expect(page.getByRole("heading", { name: "Sharpen one decision at a time." })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Contract hands" })).toHaveCount(0);
  await expect(page.getByLabel("Fixed contract drills")).toContainText("No Hearts");
  await expect(page.getByLabel("Fixed contract drills")).not.toContainText("Domino");
  await expect(page.getByLabel("Full hand practice")).toContainText("Domino");
  await page.screenshot({ path: testInfo.outputPath("barbu-practice.png"), fullPage: true });

  await openBarbuTab(page, "Play");
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Play Barbu" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("barbu-play.png"), fullPage: true });

  await openBarbuTab(page, "Perfect");
  await expect(page.getByRole("heading", { name: "Train the skills behind strong card play." })).toBeVisible();
  await expect(page.getByLabel("Card counting pack")).toContainText("Know what is still out.");
  await expect(page.getByLabel("Perfect mode skills")).toContainText("Count trumps");
  await expect(page.getByLabel("Perfect mode skills")).toContainText("Trump memory hand");
  await expect(page.getByLabel("Perfect mode skills")).toContainText("Track court cards");
  await expect(page.getByLabel("Perfect mode skills")).toContainText("Danger cards");
  await page.screenshot({ path: testInfo.outputPath("barbu-perfect.png"), fullPage: true });

  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("button", { name: "Open Card Counting" }).click();
  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Perfect" })).toHaveAttribute("aria-selected", "true");

  await page.screenshot({ path: testInfo.outputPath("barbu-table.png"), fullPage: true });
});

test("Hearts table reuses the shared avoid-hearts drill", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();

  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Play Hearts" })).toBeVisible();

  await page.getByRole("tab", { name: "Learn" }).click();
  await expect(page.getByLabel("Hearts learn actions")).toContainText("Continue with Object of Hearts");
  await expect(page.getByLabel("Hearts learn actions")).toContainText("Reference");
  await expect(page.getByLabel("Hearts learn actions")).not.toContainText("Hearts scorecard");
  await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Learn the Hearts table");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Object of Hearts");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Queen of Spades");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Pass three");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Break hearts");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Stop the moon");
  await expect(page.getByLabel("Hearts lesson path")).toContainText("Score a hand");

  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Hearts table actions").getByRole("button", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Pass three");
  await expect(page.getByLabel("Hearts practice drills")).toContainText("First trick");
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Avoid hearts");
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Queen danger");
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Break hearts");
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Stop the moon");
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Score a hand");
  await page.screenshot({ path: testInfo.outputPath("hearts-practice.png"), fullPage: true });

  await page.getByLabel("Hearts table actions").getByRole("button", { name: "Quick drill" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Hearts");
  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Avoid hearts" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Follow clubs without taking the heart");

  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts learn start advances through learning stages instead of play loop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Learn" }).click();

  await page.getByLabel("Hearts learn actions").getByRole("button", { name: /Continue with Object of Hearts/ }).click();
  await expect(page.getByRole("heading", { name: "Object of Hearts" })).toBeVisible();
  await expect(page.getByLabel("Hearts object lesson content")).toContainText("low score wins");
  await expect(page.getByRole("heading", { name: "Pass cards" })).toHaveCount(0);

  await page.getByRole("button", { name: "Next lesson" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Queen of Spades");
  await expect(page.getByLabel("Drill decision")).not.toContainText("No Queens");

  await page.getByRole("button", { name: "2 S" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Review session" }).click();
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue Hearts path" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Continue Hearts path" }).first().click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Follow clubs without taking the heart");
  await expect(page.getByLabel("Drill decision")).not.toContainText("Queen of Spades");
});

test("Hearts passing drill teaches the danger-card pass", async ({ page }, testInfo) => {
  if (testInfo.project.name === "iphone-16") {
    await page.setViewportSize({ width: 393, height: 740 });
  }

  await gotoWithPracticeSeed(page, 12);
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Pass three" }).click();

  await expect(page.getByRole("heading", { name: "Pass three" })).toBeVisible();
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Queen of Spades");
  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "A H" }).click();
  await page.getByRole("button", { name: "K H" }).click();
  await expect(page.getByLabel("Hearts pass practice summary")).toContainText("3 / 3");
  await page.getByRole("button", { name: "Check pass" }).click();

  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Good pass");
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Recommended: QS, AH, KH");
  await expect(page.getByRole("button", { name: "Next pass" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toHaveCount(0);
  await expectFeedbackAboveHand(page, ".hearts-pass-cards");
  await expectHandNearActionRow(page, ".hearts-pass-cards");
  await expectNoPageScroll(page);
  await page.screenshot({ path: testInfo.outputPath("hearts-pass-practice.png"), fullPage: true });

  await page.getByRole("button", { name: "Next pass" }).click();
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Build a long suit");
  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "A H" }).click();
  await page.getByRole("button", { name: "K H" }).click();
  await page.getByRole("button", { name: "Check pass" }).click();
  await expect(page.getByRole("button", { name: "Complete exercise" })).toBeVisible();
});

test("Hearts passing drill can preserve a long suit", async ({ page }) => {
  await gotoWithPracticeSeed(page, 11);
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Pass three" }).click();

  await expect(page.getByRole("heading", { name: "Pass three" })).toBeVisible();
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Build a long suit");
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("long club run");
  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "A H" }).click();
  await page.getByRole("button", { name: "K H" }).click();
  await page.getByRole("button", { name: "Check pass" }).click();

  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Good pass");
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Recommended: QS, AH, KH");
  await expect(page.getByRole("button", { name: "Next pass" })).toBeVisible();
});

test("Hearts pass lesson completes and advances to rule lesson", async ({ page }) => {
  await gotoWithPracticeSeed(page, 12);
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByLabel("Hearts lesson path").getByRole("button", { name: /Pass three/ }).click();

  await expect(page.getByRole("heading", { name: "Pass three" })).toBeVisible();
  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "A H" }).click();
  await page.getByRole("button", { name: "K H" }).click();
  await page.getByRole("button", { name: "Check pass" }).click();
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Good pass");
  await expect(page.getByRole("button", { name: "Next pass" })).toBeVisible();

  await page.getByRole("button", { name: "Next pass" }).click();
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Build a long suit");
  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "A H" }).click();
  await page.getByRole("button", { name: "K H" }).click();
  await page.getByRole("button", { name: "Check pass" }).click();
  await expect(page.getByRole("button", { name: "Continue Hearts path" })).toBeVisible();

  await page.getByRole("button", { name: "Continue Hearts path" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Can you lead a heart?");
});

test("Hearts micro drills teach broken hearts moon defense and score reading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "First trick" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Follow clubs first");
  await page.getByRole("button", { name: "3 C" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText("3C is good");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Break hearts" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Can you lead a heart?");
  await page.getByRole("button", { name: "2 H" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Illegal");
  await expect(page.getByLabel("Drill decision")).toContainText("not legal yet");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Stop the moon" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Break the moon threat");
  await page.getByRole("button", { name: "A C" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText("moon defense");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Queen danger" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Duck the Queen of Spades");
  await expect(page.getByLabel("Drill decision")).not.toContainText("No Queens");
  await page.getByRole("button", { name: "2 S" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText("Queen of Spades");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Score a hand" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Find the 13-point card");
  await page.getByRole("button", { name: "Q S" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText("13-point danger card");
});

test("Hearts practice result returns to the Hearts table", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Avoid hearts" }).click();

  await completeQuickDrillDecision(page);
  await continueDrillFromCheckedAnswer(page, "Review session");

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Hearts practice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue path" })).toHaveCount(0);

  await page.getByRole("button", { name: "Back to Hearts practice" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts reference explains the MVP rule boundary", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();

  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByLabel("Hearts learn actions").getByRole("button", { name: "Rules Reference" }).click();

  await expect(page.getByRole("heading", { name: "Hearts reference" })).toBeVisible();
  await expect(page.getByLabel("Hearts overview")).toContainText("Queen of Spades");
  await expect(page.getByLabel("Hearts overview")).toContainText("woman of spades");
  await expect(page.getByLabel("Contract reference")).toContainText("Hearts rules");
  await expect(page.getByLabel("Contract reference")).toContainText("queen of spades is 13");
  await expect(page.getByLabel("Contract reference")).toContainText("shooting the moon");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Pass three left");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Hearts v1");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Hearts v2");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Playable");
  await expect(page.getByLabel("Variants and varieties")).toContainText("MVP Boundary");
  await page.screenshot({ path: testInfo.outputPath("hearts-reference.png"), fullPage: true });

  await page.getByRole("button", { name: "Back to Hearts table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts play starts with a pass-left phase before the hand", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();

  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  const playPanel = page.getByRole("tabpanel", { name: "Play" });
  await expect(playPanel).toContainText("QS at 13");
  await expect(playPanel).toContainText("shoot-the-moon scoring");
  await page.getByRole("button", { name: "Play Hearts" }).click();

  await expect(page.getByRole("heading", { name: "Pass cards" })).toBeVisible();
  await expect(page.getByLabel("Hearts pass summary")).toContainText("You pass");
  await expect(page.getByLabel("Hearts pass summary")).toContainText("Left");
  await expect(page.getByLabel("Hearts pass cards")).toContainText("Choose exactly three cards");
  await page.screenshot({ path: testInfo.outputPath("hearts-passing.png"), fullPage: true });
  await passThreeHeartsCards(page);

  await expect(page.getByRole("heading", { name: "Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts hand score")).toContainText("Your penalty");
  await expect(page.getByLabel("Hearts hand score")).toContainText("26");
  await expect(page.getByLabel("Hearts table score")).toContainText("Your penalty");
  await expect(page.getByLabel("Hearts table score")).toContainText("Barbu penalty");
  await expect(page.getByLabel("Hearts table score")).toContainText("Left penalty");
  await expect(page.getByLabel("Hearts table score")).toContainText("Right penalty");
  await expect(page.getByLabel("Hearts hand table")).toBeVisible();
  await expect(page.getByLabel("Your Hearts hand")).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await expect(page.locator(".full-hand-card").first()).toHaveCSS("touch-action", "manipulation");
  await page.screenshot({ path: testInfo.outputPath("hearts-hand.png"), fullPage: true });

  await page.getByLabel("Hearts full hand").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts next hand carries score and starts with passing again", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("button", { name: "Play Hearts" }).click();
  await passThreeHeartsCards(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("button", { name: "Next hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts final scorecard")).toContainText("Low score leads");
  await expect(page.getByLabel("Hearts final scorecard")).toContainText("Target 50");
  await expect(page.getByLabel("Hearts final scorecard")).toContainText("Hand 1");
  await expect(page.getByLabel("This hand breakdown")).toContainText("Tricks");
  await expect(page.getByLabel("This hand breakdown")).toContainText("Points");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("hearts-scoreboard.png"), fullPage: true });
  await page.getByRole("button", { name: "Next hand" }).click();

  await expect(page.getByRole("heading", { name: "Pass cards" })).toBeVisible();
  await passThreeHeartsCards(page);
  await expect(page.getByRole("heading", { name: "Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts table score")).toContainText(/[1-9]\d*/);
});

test("Perfect mode starts card-counting minigames", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Perfect");
  await page.getByLabel("Perfect mode skills").getByRole("button", { name: "Count trumps" }).click();

  await expect(page.getByRole("heading", { name: "Count trumps" })).toBeVisible();
  await expect(page.getByLabel("Count trumps trainer")).toContainText("Hearts are trumps");
  await expect(page.getByLabel("Trump trick reveal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next trick" })).toBeVisible();

  const answerTrumpCountCheckpoint = async (isFinal: boolean, seenTrumpsInSegment: number) => {
    await expect(page.getByLabel("Trump memory prompt")).toContainText("Cards hidden");
    const countAnswers = page.getByLabel("Trump count answers").getByRole("button");
    if ((await countAnswers.count()) > 0) {
      await page.getByLabel("Trump count answers").getByRole("button", {
        name: String(seenTrumpsInSegment),
        exact: true
      }).click();
    } else {
      await expect(page.getByLabel(/Target trump card/)).toBeVisible();
      await page.getByLabel("Trump specific answers").getByRole("button").first().click();
    }
    await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
    await page.getByRole("button", { name: "Check memory" }).click();
    await expect(page.getByLabel("Trump count review")).toContainText("hearts appeared");
    await expect(page.getByRole("button", { name: isFinal ? "Next round" : "Continue" })).toBeVisible();
    await expectNoPageScroll(page);
    await expectGameplayActionRowPinned(page);
  };

  const countCheckpoints = [4, 8, 13];
  let countCheckpointIndex = 0;
  let seenTrumpsInSegment = 0;
  for (let trick = 1; trick <= 13; trick += 1) {
    await expect(page.getByLabel("Count trumps trainer")).toContainText(`Trick ${trick} of 13`);
    seenTrumpsInSegment += await page.locator(".trump-memory-card.trump").count();
    const isCheckpoint = countCheckpoints[countCheckpointIndex] === trick;
    await page.getByRole("button", { name: isCheckpoint ? "Answer memory" : "Next trick" }).click();

    if (isCheckpoint) {
      const isFinalCheckpoint = countCheckpointIndex === countCheckpoints.length - 1;
      await answerTrumpCountCheckpoint(isFinalCheckpoint, seenTrumpsInSegment);
      if (countCheckpointIndex === 0) {
        await page.screenshot({ path: testInfo.outputPath("perfect-count-trumps.png"), fullPage: true });
      }
      countCheckpointIndex += 1;
      seenTrumpsInSegment = 0;
      if (!isFinalCheckpoint) {
        await page.getByRole("button", { name: "Continue" }).click();
      }
    }
  }

  expect(countCheckpointIndex).toBe(3);

  await page.getByLabel("Count trumps", { exact: true }).getByRole("button", { name: "Table" }).click();
  await page.getByLabel("Perfect mode skills").getByRole("button", { name: "Trump memory hand" }).click();
  await expect(page.getByLabel("Realistic trump table")).toBeVisible();
  await expect(page.getByLabel("Trump memory hand trainer")).toContainText("Trick 1 of 13");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".realistic-trump-hand");
  await expectFeedbackAboveHand(page, ".realistic-trump-hand");
  await page.screenshot({ path: testInfo.outputPath("perfect-count-trumps-realistic-play.png"), fullPage: true });

  const answerRealisticTrumpCheck = async () => {
    await expect(page.getByLabel("Realistic trump challenge")).toContainText(/How many hearts|Has this trump card/);
    const realisticCountAnswers = page.getByLabel("Realistic trump count answers").getByRole("button");
    if ((await realisticCountAnswers.count()) > 0) {
      await realisticCountAnswers.first().click();
    } else {
      await expect(page.getByLabel(/Target trump card/)).toBeVisible();
      await page.getByLabel("Realistic trump specific answers").getByRole("button").first().click();
    }
    await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
    await page.getByRole("button", { name: "Check memory" }).click();
    await expect(page.getByLabel("Realistic trump count review")).toContainText("hearts appeared");
  };

  let memoryChecks = 0;
  for (let trick = 1; trick <= 13; trick += 1) {
    await page.locator(".realistic-trump-hand .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    const isCheckpoint = [3, 7, 11].includes(trick);
    const nextAction = page.getByRole("button", {
      name: trick === 13 ? "Finish hand" : isCheckpoint ? "Answer memory" : "Next trick",
      exact: true
    });
    await expect(nextAction).toBeVisible();
    await nextAction.click();

    if (isCheckpoint) {
      await answerRealisticTrumpCheck();
      memoryChecks += 1;
      if (trick === 3) {
        await page.screenshot({ path: testInfo.outputPath("perfect-count-trumps-realistic.png"), fullPage: true });
      }
      await page.getByRole("button", { name: "Continue hand" }).click();
    }
  }

  expect(memoryChecks).toBe(3);
  await expect(page.getByLabel("Realistic trump challenge")).toContainText("You played the full hand");
  await expect(page.getByRole("button", { name: "Next hand" })).toBeVisible();

  await page.getByLabel("Trump memory hand", { exact: true }).getByRole("button", { name: "Table" }).click();
  await page.getByLabel("Perfect mode skills").getByRole("button", { name: "Track court cards" }).click();

  await expect(page.getByRole("heading", { name: "Track court cards" })).toBeVisible();
  await expect(page.getByLabel("Track court cards trainer")).toContainText("Jacks, queens, kings");
  await expect(page.getByLabel("Court card memory table")).toBeVisible();
  await expect(page.getByLabel("Court card memory status")).toContainText("Memory run");
  await expect(page.getByLabel("Court card memory status")).not.toContainText("Court cards seen");
  await expect(page.getByLabel("Court card memory challenge")).toContainText(/Lead|Follow|void/);
  await expect(page.getByRole("button", { name: "Play card" })).toBeDisabled();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".realistic-trump-hand");
  await expectFeedbackAboveHand(page, ".realistic-trump-hand");

  for (let trick = 1; trick <= 3; trick += 1) {
    await page.locator(".realistic-trump-hand .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    await page.getByRole("button", { name: trick === 3 ? "Answer memory" : "Next trick", exact: true }).click();
  }

  await expect(page.getByLabel("Court card memory challenge")).toContainText("Answer from memory");
  const courtCountAnswers = page.getByLabel("Court card count answers").getByRole("button");
  if ((await courtCountAnswers.count()) > 0) {
    await courtCountAnswers.first().click();
  } else {
    await expect(page.getByLabel(/Target court card/)).toBeVisible();
    await page.getByLabel("Court card specific answers").getByRole("button").first().click();
  }
  await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
  await page.getByRole("button", { name: "Check memory" }).click();

  await expect(page.getByLabel("Court card memory review")).toContainText("court cards appeared");
  await expect(page.getByRole("button", { name: "Continue hand" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("perfect-track-court-cards.png"), fullPage: true });

  await page.getByLabel("Track court cards", { exact: true }).getByRole("button", { name: "Table" }).click();
  await page.getByLabel("Perfect mode skills").getByRole("button", { name: "Danger cards" }).click();

  await expect(page.getByRole("heading", { name: "Danger cards" })).toBeVisible();
  await expect(page.getByLabel("Danger cards trainer")).toContainText("Queens and KH");
  await expect(page.getByLabel("Danger card memory table")).toBeVisible();
  await expect(page.getByLabel("Danger card memory status")).toContainText("Memory run");
  await expect(page.getByLabel("Danger card memory status")).not.toContainText("Danger cards seen");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".realistic-trump-hand");
  await expectFeedbackAboveHand(page, ".realistic-trump-hand");

  for (let trick = 1; trick <= 3; trick += 1) {
    await page.locator(".realistic-trump-hand .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    await page.getByRole("button", { name: trick === 3 ? "Answer memory" : "Next trick", exact: true }).click();
  }

  await expect(page.getByLabel("Danger card memory challenge")).toContainText("Answer from memory");
  const dangerCountAnswers = page.getByLabel("Danger card count answers").getByRole("button");
  if ((await dangerCountAnswers.count()) > 0) {
    await dangerCountAnswers.first().click();
  } else {
    await expect(page.getByLabel(/Target danger card/)).toBeVisible();
    await page.getByLabel("Danger card specific answers").getByRole("button").first().click();
  }
  await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
  await page.getByRole("button", { name: "Check memory" }).click();

  await expect(page.getByLabel("Danger card memory review")).toContainText("danger cards appeared");
  await expect(page.getByRole("button", { name: "Continue hand" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("perfect-danger-cards.png"), fullPage: true });
});

test("Trump memory hand starts from Perfect as a realistic table game", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("barbu.practiceSeed.v1", "1");
  });
  await page.reload();

  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Perfect");
  await page.getByLabel("Perfect mode skills").getByRole("button", { name: "Trump memory hand" }).click();

  await expect(page.getByRole("heading", { name: "Trump memory hand" })).toBeVisible();
  await expect(page.getByLabel("Realistic trump table")).toBeVisible();
  await expect(page.getByLabel("Realistic trump challenge")).toContainText(/Lead the trick|Follow|void/);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".realistic-trump-hand");
  await expectFeedbackAboveHand(page, ".realistic-trump-hand");

  await page.locator(".realistic-trump-hand .full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card" }).click();

  await expect(page.getByLabel("Realistic trump table").locator(".table-card")).toHaveCount(4);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
});

test("practice tab keeps contract hands hidden while fixed drills are public", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");

  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Contract hands" })).toHaveCount(0);
  await expect(page.getByLabel("Fixed contract drills").getByRole("button", { name: /^No Hearts\b/ })).toBeVisible();
  await expect(page.getByLabel("Fixed contract drills").getByRole("button", { name: /^Domino\b/ })).toHaveCount(0);
  await expect(page.getByLabel("Full hand practice").getByRole("button", { name: /^Domino\b/ })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("practice-fixed-drills.png"), fullPage: true });
});

test("practice tab starts a full Domino hand on the play table", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByLabel("Full hand practice").getByRole("button", { name: /^Domino\b/ }).click();

  await expect(page.getByRole("heading", { name: "Domino hand" })).toBeVisible();
  await expect(page.getByLabel("Domino hand score")).toContainText("Cards left");
  await expect(page.getByLabel("Domino hand score")).toContainText("Next out");
  await expect(page.getByLabel("Domino hand score")).toContainText("Order");
  await expect(page.getByLabel("Domino layout")).toBeVisible();
  await expect(page.getByLabel("Your Domino hand")).toBeVisible();
  await expect(page.getByRole("button", { name: "Place card" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".domino-cards");
  await expectFeedbackAboveHand(page, ".domino-cards");

  await page.screenshot({ path: testInfo.outputPath("practice-domino-full-hand.png"), fullPage: true });
});

test("quick drill is a fixed iPhone screen without page scroll", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByRole("button", { name: "Quick drill" }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByText("Decision 1 of 7")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check answer" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  const firstLegalCard = page.locator(".drill-hand .hand-card.legal").first();
  await firstLegalCard.tap();
  await expect(firstLegalCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".drill-hand .hand-card.selected")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Check answer" })).toBeEnabled();
  await expectGameplayActionRowPinned(page);

  await page.screenshot({ path: testInfo.outputPath("quick-drill-fixed-screen.png"), fullPage: true });
});

test("practice tab starts a fixed contract drill", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByLabel("Fixed contract drills").getByRole("button", { name: /^No Hearts\b/ }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.locator("header").getByText("No Hearts", { exact: true })).toBeVisible();
  await expect(page.getByText("Decision 1 of 1")).toBeVisible();
  await completeQuickDrillDecision(page);
  await expect(page.getByRole("button", { name: "Review session" })).toBeVisible();
});

test("quick drill finishes after one decision per Barbu contract", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByRole("button", { name: "Quick drill" }).click();

  for (let decision = 1; decision <= 7; decision += 1) {
    await expect(page.getByText(`Decision ${decision} of 7`)).toBeVisible();
    await completeQuickDrillDecision(page);

    if (decision < 7) {
      await continueDrillFromCheckedAnswer(page, "Next decision");
    } else {
      await expect(page.getByRole("button", { name: "Review session" })).toBeVisible();
      await page.getByRole("button", { name: "Review session" }).tap();
    }
  }

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByText("7 clean decisions").or(page.getByText(/\/ 7 clean decisions/))).toBeVisible();
  await expect(page.getByText("Weakest contract")).toBeVisible();
});

test("completed standalone quick drill can repair an out-of-order practice table step", async ({ page }) => {
  await gotoWithCourseProgress(page, {
    "meet-contract": true,
    "spot-danger": true,
    "play-trick": true,
    "contract-no-last-two": true,
    "contract-no-tricks": true,
    "contract-hearts-trumps": true,
    "contract-domino": true,
    review: true
  });

  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByRole("button", { name: "Quick drill" }).click();

  for (let decision = 1; decision <= 7; decision += 1) {
    await expect(page.getByText(`Decision ${decision} of 7`)).toBeVisible();
    await completeQuickDrillDecision(page);
    await continueDrillFromCheckedAnswer(page, decision === 7 ? "Review session" : "Next decision");
  }

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await page.getByRole("button", { name: "Mark Practice table complete" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByText("9 / 9 complete")).toBeVisible();
});

test("guided lesson accepts a legal card play", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractLesson(page, "No Hearts");
  await page.getByRole("button", { name: "See example" }).click();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await expect(page.getByRole("heading", { name: "Barbu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow clubs without taking the heart" })).toBeVisible();
  await expect(page.getByLabel("Guided Barbu lessons")).toHaveCount(0);
  await expect(page.getByLabel("Learning mode")).toHaveCount(0);

  await page.getByRole("button", { name: "2 C" }).click();
  await expect(page.getByRole("button", { name: "Play selected" })).toBeEnabled();
  await page.getByRole("button", { name: "Play selected" }).click();

  await expect(page.getByText("Good")).toBeVisible();
  await expect(page.getByText("Left wins with AC and takes 1 heart penalty from Right's 4H.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next trick" })).toBeVisible();
});

test("No Hearts example shows clockwise order after Barbu leads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Meet the contract/ }).click();
  await page.getByRole("button", { name: "See example" }).click();

  const sequence = page.getByLabel("No Hearts trick sequence");

  await expect(page.getByRole("heading", { name: "Barbu leads clubs. Right discards a heart into that trick." })).toBeVisible();
  await expect(sequence).toContainText("Barbu plays 9C");
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
  await expect(page.getByText("Barbu -> Right -> You -> Left when Barbu leads")).toBeVisible();
  await expect(page.getByText("Follow the led suit when you can")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Barbu contracts" })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("No Hearts", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("No Queens", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("King of Hearts", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("Domino", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference")).toContainText("20 penalty points");
  await expect(page.getByLabel("Contract reference").getByText("No Last Two", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("No Tricks", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contract reference").getByText("Hearts Trumps", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contract status" })).toBeVisible();
  await expect(page.getByLabel("Contract roadmap")).toContainText("Core");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Hearts Trumps");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Domino");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Playable");
  await expect(page.getByRole("heading", { name: "Documented variations" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-reference.png"), fullPage: true });
});

test("Quick drill runs as a generated learning loop", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByRole("button", { name: "Quick drill" }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByText("Decision 1")).toBeVisible();

  for (let index = 0; index < 5; index += 1) {
    if ((await page.getByLabel("Domino drill layout").count()) > 0) {
      await expect(page.getByLabel("Domino drill layout")).toBeVisible();
      await expect(page.getByLabel("Drill card table")).toHaveCount(0);
    }
    await expectNoPageScroll(page);
    await page.locator(".hand-card.legal").first().click();
    await checkDrillAnswer(page);
    await expect(page.getByText(/Good|Penalty|Risky/)).toBeVisible();
    await expectNoPageScroll(page);
    await continueDrillFromCheckedAnswer(page, index === 4 ? "Finish session" : "Next decision");
  }

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
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
  await expect(page.getByLabel("Contract results")).toBeVisible();
  await expect(page.getByLabel("Next drill step")).toContainText("Next repetition");
  await expect(page.getByLabel("Next drill step")).toContainText("Weakest contract");
  await expect(page.getByLabel("Next drill step")).toContainText("Recent rhythm");
  await expect(page.getByLabel("Recent quick drill attempts")).toContainText("/ 5 clean");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  const replayButton = page.getByRole("button", {
    name: /Replay (No Hearts|No Queens|King of Hearts|No Last Two|No Tricks|Hearts Trumps|Domino)/
  });
  await expect(replayButton).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue path" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("play-barbu-result.png"), fullPage: true });

  await replayButton.click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByText("Decision 1")).toBeVisible();
  await expect(page.locator(".contract-status").filter({ hasText: /No Hearts|No Queens|King of Hearts|No Last Two|No Tricks|Hearts Trumps|Domino/ })).toBeVisible();
  await expectNoPageScroll(page);
});

test("active game tables share one compact surface", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await expectControlBelowSafeArea(page, ".table-topbar .back-button");
  await openBarbuTab(page, "Practice");
  await page.getByRole("button", { name: "Quick drill" }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expectControlBelowSafeArea(page, ".table-play-topbar .back-button");
  await expect(page.locator(".table-play-surface")).toBeVisible();
  const playBarbuTable = await page.getByLabel("Drill card table").boundingBox();
  expect(playBarbuTable).not.toBeNull();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".drill-hand");

  await page.locator(".table-play-topbar").getByRole("button", { name: "Table" }).click();
  await expectControlBelowSafeArea(page, ".table-topbar .back-button");
  await openBarbuTab(page, "Play");
  await page.getByRole("button", { name: "Play Barbu" }).click();
  await expectControlBelowSafeArea(page, ".run-intro-topbar .back-button");
  await page.screenshot({ path: testInfo.outputPath("play-barbu-contract-intro.png"), fullPage: true });
  await page.getByRole("button", { name: "Start hand" }).click();

  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expectControlBelowSafeArea(page, ".table-play-topbar .back-button");
  await expect(page.locator(".table-play-surface")).toBeVisible();
  await expect(page.getByLabel("Current hand")).toBeVisible();
  await expect(page.getByLabel("Table scores")).toBeVisible();
  await expect(page.locator(".summary-row-label", { hasText: "Current hand" })).toBeVisible();
  await expect(page.locator(".summary-row-label", { hasText: "Table scores" })).toBeVisible();
  await expect(page.locator(".card-table .cardholder")).toHaveCount(4);
  await expectTableSlotsSeparated(page);
  const noHeartsTable = await page.getByLabel("No Hearts hand table").boundingBox();
  expect(noHeartsTable).not.toBeNull();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  expect(Math.abs((noHeartsTable?.width ?? 0) - (playBarbuTable?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((noHeartsTable?.height ?? 0) - (playBarbuTable?.height ?? 0))).toBeLessThanOrEqual(1);
  const initialNoHeartsHand = await page.locator(".full-hand-cards .full-hand-card").evaluateAll((cards) =>
    cards.map((card) => card.getAttribute("aria-label"))
  );
  await page.screenshot({ path: testInfo.outputPath("play-barbu-active-hand.png"), fullPage: true });

  const handBeforeSelect = await page.locator(".full-hand-cards").last().boundingBox();
  expect(handBeforeSelect).not.toBeNull();
  const firstLegalFullHandCard = page.locator(".full-hand-card.legal").first();
  const cardBeforeSelect = await firstLegalFullHandCard.boundingBox();
  expect(cardBeforeSelect).not.toBeNull();
  await firstLegalFullHandCard.click();
  const handAfterSelect = await page.locator(".full-hand-cards").last().boundingBox();
  const selectedCardAfterSelect = await page.locator(".full-hand-card.selected").first().boundingBox();
  expect(handAfterSelect).not.toBeNull();
  expect(selectedCardAfterSelect).not.toBeNull();
  expect(Math.abs((handAfterSelect?.y ?? 0) - (handBeforeSelect?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((handAfterSelect?.height ?? 0) - (handBeforeSelect?.height ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((selectedCardAfterSelect?.width ?? 0) - (cardBeforeSelect?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((selectedCardAfterSelect?.height ?? 0) - (cardBeforeSelect?.height ?? 0))).toBeLessThanOrEqual(1);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await page.getByRole("button", { name: "Play card" }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await expect(page.locator(".card-table .cardholder")).toHaveCount(4);
  await expectTableSlotsSeparated(page);
  const reviewingNoHeartsTable = await page.getByLabel("No Hearts hand table").boundingBox();
  expect(reviewingNoHeartsTable).not.toBeNull();
  expect(Math.abs((reviewingNoHeartsTable?.y ?? 0) - (noHeartsTable?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((reviewingNoHeartsTable?.height ?? 0) - (noHeartsTable?.height ?? 0))).toBeLessThanOrEqual(1);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  for (let decision = 1; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByLabel("No Hearts hand table")).toBeVisible();
  const replayNoHeartsTable = await page.getByLabel("No Hearts hand table").boundingBox();
  expect(replayNoHeartsTable).not.toBeNull();
  expect(Math.abs((replayNoHeartsTable?.y ?? 0) - (noHeartsTable?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((replayNoHeartsTable?.height ?? 0) - (noHeartsTable?.height ?? 0))).toBeLessThanOrEqual(1);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("play-barbu-replay-hand.png"), fullPage: true });

  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expect
    .poll(async () =>
      page.locator(".full-hand-cards .full-hand-card").evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label"))
      )
    )
    .toEqual(initialNoHeartsHand);
  for (let decision = 0; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }
  await expect(page.getByRole("button", { name: "Next contract" })).toBeVisible();

  await page.getByRole("button", { name: "Next contract" }).click();
  await expect(page.getByRole("heading", { name: "No Queens" })).toBeVisible();
  await page.getByRole("button", { name: "Start hand" }).click();
  await expect(page.getByRole("heading", { name: "No Queens hand" })).toBeVisible();
  await expect(page.getByLabel("No Queens hand table")).toBeVisible();
  await expectTableSlotsSeparated(page);
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("play-barbu-second-hand.png"), fullPage: true });

  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card" }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Queens hand" })).toBeVisible();
  await expectTableSlotsSeparated(page);
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(12);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("play-barbu-no-queens-after-first-trick.png"), fullPage: true });
});

test("Play Barbu can resume a saved local run", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Play");
  await page.getByRole("button", { name: "Play Barbu" }).click();
  await page.getByRole("button", { name: "Start hand" }).click();

  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("barbu.savedPlayRun.v1"))).not.toBeNull();

  await page.reload();
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Play");
  await expect(page.getByRole("button", { name: "Continue Play Barbu" })).toBeVisible();
  await expect(page.getByText("No Hearts, trick 1")).toBeVisible();

  await page.getByRole("button", { name: "Continue Play Barbu" }).click();
  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await expectNoPageScroll(page);
});

test("Play Barbu advances full-hand contracts with a running total", async ({ page }) => {
  const contracts = ["No Hearts", "No Queens", "King of Hearts", "No Last Two", "No Tricks", "Hearts Trumps", "Domino"];

  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Play");
  await page.getByRole("button", { name: "Play Barbu" }).click();

  for (const [index, contract] of contracts.entries()) {
    await expect(page.getByRole("heading", { name: contract })).toBeVisible();
    await expect(page.getByText(`Contract ${index + 1} of ${contracts.length}`)).toBeVisible();
    await expect(page.getByLabel("Play Barbu contract intro")).toContainText("Barbu sets the contract");
    await expect(page.getByLabel(`${contract} role`)).toContainText("Role");
    await expect(page.getByLabel(`${contract} role`)).toContainText("Surface");
    await expect(page.getByLabel(`${contract} role`)).toContainText(contract === "Domino" ? "Domino layout" : /Trick|Trump/);
    await expect(page.getByLabel("Play Barbu contract sequence")).toContainText(contract);
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

    if (contract === "Domino") {
      await expect(page.getByLabel("Domino layout")).toBeVisible();
      await playDominoHand(page);
    } else {
      for (let decision = 0; decision < 13; decision += 1) {
        await playFullHandDecision(page);
      }
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
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Winner");
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Your place");
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Strongest");
  await expect(page.getByLabel("Play Barbu settlement")).toContainText("Weakest");
  await expect(page.getByLabel("Play Barbu results")).toContainText("No Hearts");
  await expect(page.getByLabel("Play Barbu results")).toContainText("No Tricks");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Hearts Trumps");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Domino");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Complete");
  await expect(page.getByLabel("Play Barbu results")).toContainText("Total");
  await expect(page.getByRole("button", { name: "Replay weakest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await expectNoPageScroll(page);
  await page.getByRole("button", { name: "Replay weakest" }).click();
  await expect(page.getByRole("heading", { name: /No Hearts hand|No Queens hand|King of Hearts hand|No Last Two hand|No Tricks hand|Hearts Trumps hand|Domino hand/ })).toBeVisible();
});

test.skip("No Hearts hand plays through thirteen tricks", async ({ page }, testInfo) => {
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

test.skip("No Queens hand plays through thirteen tricks", async ({ page }, testInfo) => {
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

test.skip("King of Hearts hand plays through thirteen tricks", async ({ page }, testInfo) => {
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

test.skip("No Last Two hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "No Last Two");

  await expect(page.getByRole("heading", { name: "No Last Two hand" })).toBeVisible();
  await expect(page.getByLabel("No Last Two hand score")).toContainText("points in play");
  await expect(page.getByLabel("No Last Two hand score")).toContainText("Setup trick");
  await expect(page.getByLabel("No Last Two hand score")).toContainText("0 points");
  await expect(page.getByLabel("No Last Two hand table")).toBeVisible();
  const activeTable = await page.getByLabel("No Last Two hand table").boundingBox();
  expect(activeTable).not.toBeNull();
  await expectNoPageScroll(page);

  await page.locator(".full-hand-card.legal").first().dblclick();
  await expect(page.getByLabel("No Last Two hand decision")).toContainText("setup trick");
  await page.getByRole("button", { name: "Next trick", exact: true }).click();

  for (let decision = 1; decision < 13; decision += 1) {
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

test.skip("No Tricks hand plays through thirteen tricks", async ({ page }, testInfo) => {
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

test.skip("Hearts Trumps hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "Hearts Trumps");

  await expect(page.getByRole("heading", { name: "Hearts Trumps hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts Trumps hand score")).toContainText("points available");
  await expect(page.getByLabel("Hearts Trumps hand table")).toBeVisible();
  await expectNoPageScroll(page);

  await page.locator(".full-hand-card.legal").first().dblclick();
  await expect(page.getByLabel("Hearts Trumps hand decision")).toContainText(/banked|chance to overtake/);
  await expect(page.locator(".table-play-panel p.outcome.warning")).toHaveCount(0);
  await page.getByRole("button", { name: "Next trick", exact: true }).click();

  for (let decision = 1; decision < 13; decision += 1) {
    await playFullHandDecision(page);
  }

  await expect(page.getByRole("heading", { name: /Strong trick count|Keep fighting for tricks/ })).toBeVisible();
  await expect(page.getByLabel("Hearts Trumps hand score")).toContainText("65 / 65");
  await expect(page.getByLabel("Hearts Trumps result summary")).toContainText("You won");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("positive-tricks-hand.png"), fullPage: true });
});

test.skip("Domino hand plays through the layout contract", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractHand(page, "Domino");

  await expect(page.getByRole("heading", { name: "Domino hand" })).toBeVisible();
  await expect(page.getByLabel("Domino hand score")).toContainText("Cards left");
  await expect(page.getByLabel("Domino hand score")).toContainText("Next out");
  await expect(page.getByLabel("Domino hand score")).toContainText("Order");
  await expect(page.getByLabel("Domino hand decision")).toContainText(/Open a closed suit|extend an open suit|blocked/);
  await expect(page.getByLabel("Domino layout")).toBeVisible();
  await expect(page.getByLabel("Your Domino hand")).toBeVisible();
  await expectNoPageScroll(page);

  const dominoRegion = page.getByRole("region", { name: "Domino hand", exact: true });
  const stateBeforeDoubleTap = await dominoRegion.innerText();
  const firstLegalDominoCard = page.locator(".domino-cards .full-hand-card.legal").first();
  await expect.poll(async () => page.locator(".domino-cards .full-hand-card.legal").count()).toBeGreaterThan(0);
  await firstLegalDominoCard.tap();
  await firstLegalDominoCard.tap();
  await expect.poll(async () => (await dominoRegion.innerText()) !== stateBeforeDoubleTap).toBe(true);

  await playDominoHand(page);

  await expect(page.getByRole("heading", { name: /You went out first|You finished|Domino complete/ })).toBeVisible();
  await expect(page.getByLabel("Domino result summary")).toContainText("You");
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try another" })).toBeVisible();
  await expectNoPageScroll(page);

  await page.screenshot({ path: testInfo.outputPath("domino-hand.png"), fullPage: true });
});

test("finishing a lesson advances course progress", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Meet the contract/ }).click();

  await expect(page.getByRole("heading", { name: "Meet the contract" })).toBeVisible();
  await expect(page.getByText("hearts are cargo you do not want to collect")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Barbu leads clubs/ })).toBeVisible();
  await expect(page.getByLabel("No Hearts trick sequence")).toContainText("Barbu plays 9C");
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
  await expect(page.getByText("1 / 9 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Spot the danger/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Meet the contract/ })).toContainText("Complete");
});

test("No Queens course has concept example play and review", async ({ page }) => {
  await gotoWithCourseProgress(page, { "meet-contract": true });

  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Spot the danger/ }).click();

  await expect(page.getByRole("heading", { name: "Spot the danger" })).toBeVisible();
  await expect(page.getByText("queens are only dangerous when they land in a trick you win")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Barbu leads diamonds/ })).toBeVisible();
  await expect(page.getByLabel("No Queens trick sequence")).toContainText("Barbu plays 8D");
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

  await expect(page.getByText("2 / 9 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Play the trick/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Spot the danger/ })).toContainText("Complete");
});

test("King of Hearts course has concept example play and review", async ({ page }, testInfo) => {
  await gotoWithCourseProgress(page, {
    "meet-contract": true,
    "spot-danger": true
  });

  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Play the trick/ }).click();

  await expect(page.getByRole("heading", { name: "Avoid the king" })).toBeVisible();
  await expect(page.getByText("one card carries the danger")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("king-of-hearts-concept.png"), fullPage: true });
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Barbu leads hearts/ })).toBeVisible();
  await expect(page.getByLabel("King of Hearts trick sequence")).toContainText("Barbu plays 10H");
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

  await expect(page.getByText("3 / 9 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Avoid the final tricks/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play the trick/ })).toContainText("Complete");
});

test("No Last Two course has concept example play and review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractLesson(page, "No Last Two");

  await expect(page.getByRole("heading", { name: "Avoid the final tricks" })).toBeVisible();
  await expect(page.getByText("the danger appears late")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Trick 12 starts with spades/ })).toBeVisible();
  await expect(page.getByLabel("No Last Two trick sequence")).toContainText("This is trick 12");
  await expect(page.getByLabel("No Last Two trick sequence")).toContainText("Barbu overtakes with JS");
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
  await openBarbuContracts(page);
  await expect(page.getByRole("button", { name: /^No Last Two/ })).toContainText("Complete");
});

test("No Tricks course has concept example play and review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractLesson(page, "No Tricks");

  await expect(page.getByRole("heading", { name: "Avoid every trick" })).toBeVisible();
  await expect(page.getByText("control is the thing you avoid")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Barbu leads clubs/ })).toBeVisible();
  await expect(page.getByLabel("No Tricks trick sequence")).toContainText("Barbu plays 9C");
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
  await openBarbuContracts(page);
  await expect(page.getByRole("button", { name: /^No Tricks/ })).toContainText("Complete");
});

test("Hearts Trumps course has concept example play and review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractLesson(page, "Hearts Trumps");

  await expect(page.getByRole("heading", { name: "Use trumps" })).toBeVisible();
  await expect(page.getByText("hearts can beat the led suit")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /Barbu leads clubs/ })).toBeVisible();
  await expect(page.getByLabel("Hearts Trumps trick sequence")).toContainText("5H can trump");
  await expect(page.getByLabel("Hearts Trumps example table")).toBeVisible();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await page.getByRole("button", { name: "5 H" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Hearts Trumps flips the usual Barbu habit")).toBeVisible();
  await page.getByRole("button", { name: "Finish Hearts Trumps" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await openBarbuContracts(page);
  await expect(page.getByRole("button", { name: /^Hearts Trumps/ })).toContainText("Complete");
});

test("Domino course uses a layout example and guided placement", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await startContractLesson(page, "Domino");

  await expect(page.getByRole("heading", { name: "Build Domino" })).toBeVisible();
  await expect(page.getByText("Domino is a layout, not a trick")).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();

  await expect(page.getByRole("heading", { name: /spade lane is open/ })).toBeVisible();
  await expect(page.getByLabel("Domino trick sequence")).toContainText("Spades show 6S 7S 8S");
  await expect(page.getByLabel("Domino example layout")).toBeVisible();
  await page.getByRole("button", { name: "Play guided trick" }).click();

  await expect(page.getByLabel("Domino lesson layout")).toBeVisible();
  await expect(page.getByLabel("Card table")).toHaveCount(0);
  await page.getByRole("button", { name: "5 S" }).click();
  await page.getByRole("button", { name: "Play selected" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Domino asks what fits the layout")).toBeVisible();
  await page.getByRole("button", { name: "Finish Domino" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await openBarbuContracts(page);
  await expect(page.getByRole("button", { name: /^Domino/ })).toContainText("Complete");
});

test("training path practice step starts quick drill and marks completion", async ({ page }) => {
  await gotoWithCourseProgress(page, {
    "meet-contract": true,
    "spot-danger": true,
    "play-trick": true,
    "contract-no-last-two": true,
    "contract-no-tricks": true,
    "contract-hearts-trumps": true,
    "contract-domino": true
  });

  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: /Continue with Practice table/ }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();

  for (let decision = 1; decision <= 7; decision += 1) {
    await expect(page.getByText(`Decision ${decision} of 7`)).toBeVisible();
    await completeQuickDrillDecision(page);
    await continueDrillFromCheckedAnswer(page, decision === 7 ? "Review session" : "Next decision");
  }

  await expect(page.getByRole("heading", { name: "Review the hand" })).toBeVisible();
  await expect(page.getByLabel("Review focus")).toBeVisible();
  await expect(page.getByLabel("Review contract results")).toBeVisible();
  await expect(page.getByLabel("Review recent attempts")).toContainText("/ 7 clean");
  await expect(
    page.getByLabel("Review focus").getByText(
      /You (avoided the penalty card|used a void turn to discard|captured a penalty|won a clean trick|won a late trick|lost the late trick|followed suit well)/
    )
  ).toBeVisible();
  await expect(
    page.getByLabel("Review focus").getByRole("button", {
      name: /Replay (No Hearts|No Queens|King of Hearts|No Last Two|No Tricks|Hearts Trumps|Domino)/
    })
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish review" }).click();

  await expect(page.getByText("9 / 9 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /Review the hand/ })).toContainText("Complete");
});

test("completed course does not loop back to the first lesson", async ({ page }) => {
  await gotoWithCourseProgress(page, {
    "meet-contract": true,
    "spot-danger": true,
    "play-trick": true,
    "contract-no-last-two": true,
    "contract-no-tricks": true,
    "contract-hearts-trumps": true,
    "contract-domino": true,
    "generated-drill": true,
    review: true
  });

  await page.getByRole("button", { name: /Barbu/ }).click();

  await expect(page.getByText("9 / 9 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review results" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset path" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Meet the contract/ })).toHaveCount(0);

  await openBarbuTab(page, "Perfect");
  await expect(page.getByRole("tab", { name: "Perfect" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("button", { name: /Open Barbu/ }).click();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Review results" }).click();
  await page.getByRole("button", { name: "Finish review" }).click();
  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
});
