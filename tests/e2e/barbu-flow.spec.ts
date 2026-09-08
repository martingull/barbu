import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { chooseBrowserOpponentCardForState } from "../../src/browserHandFallback";
import type { Card, FullHandState } from "../../src/lessonTypes";
import { whistOddProgress } from "../../src/whistScoring";

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

const compactLayoutViewports = [
  { name: "narrow-320", width: 320, height: 568 },
  { name: "se-height", width: 375, height: 568 },
  { name: "s9-short", width: 360, height: 640 },
  { name: "s9", width: 360, height: 740 },
  { name: "wide-phone", width: 430, height: 740 },
  { name: "intermediate-browser", width: 600, height: 740 }
] as const;

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
  await expect
    .poll(async () => {
      const box = await row.boundingBox();
      if (!box) {
        return false;
      }

      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const bottomGap = viewportHeight - (box.y + box.height);
      const expectedBottomGap = Math.max(16, await safeAreaBottom(page));
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

function testCard(rank: string, suit: Card["suit"]): Card {
  return { id: `${rank}${suit}`, rank, suit, label: `${rank}${suit}` };
}

async function expectNoVerticalCollision(page: Page, upperSelector: string, lowerSelector: string, minimumGap = 8) {
  const upperItems = page.locator(upperSelector);
  const lower = page.locator(lowerSelector).last();
  await expect(lower).toBeVisible();
  await expect
    .poll(async () => {
      const lowerBox = await lower.boundingBox();
      if (!lowerBox) {
        return false;
      }

      let upperBottom = 0;
      const count = await upperItems.count();
      for (let index = 0; index < count; index += 1) {
        const box = await upperItems.nth(index).boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          upperBottom = Math.max(upperBottom, box.y + box.height);
        }
      }

      return upperBottom > 0 && upperBottom <= lowerBox.y - minimumGap;
    })
    .toBe(true);
}

async function expectFeedbackAboveHand(page: Page, handSelector: string) {
  await expectNoVerticalCollision(
    page,
    ".table-play-surface.compact-play .table-play-panel .result, .table-play-surface.compact-play .table-play-panel .outcome, .table-play-surface.compact-play .table-play-panel .explanation",
    handSelector
  );
}

async function expectFeedbackClearOfHand(page: Page, handSelector: string) {
  await expectNoVerticalCollision(
    page,
    ".table-play-surface.compact-play .table-play-panel .result, .table-play-surface.compact-play .table-play-panel .outcome, .table-play-surface.compact-play .table-play-panel .explanation",
    handSelector,
    24
  );
}

async function expectCompactPlayStack(
  page: Page,
  handSelector: string,
  options: {
    feedbackGap?: number;
    tableSelector?: string;
  } = {}
) {
  const { feedbackGap = 8, tableSelector = ".card-table" } = options;

  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, handSelector);
  await expectNoVerticalCollision(page, tableSelector, handSelector, 0);
  const feedback = page.locator(".table-play-panel :is(.result, .outcome, .explanation)");
  for (const message of await feedback.all()) {
    if (await message.isVisible()) {
      const tableBox = await page.locator(tableSelector).last().boundingBox();
      const messageBox = await message.boundingBox();
      expect(messageBox!.y).toBeGreaterThanOrEqual(tableBox!.y + tableBox!.height + 7);
      expect(await message.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
    }
  }
  await expectNoVerticalCollision(
    page,
    ".table-play-surface.compact-play .table-play-panel .result, .table-play-surface.compact-play .table-play-panel .outcome, .table-play-surface.compact-play .table-play-panel .explanation",
    handSelector,
    feedbackGap
  );
  await expectNoVerticalCollision(page, tableSelector, ".table-play-surface .action-row", 0);
  await expectNoVerticalCollision(
    page,
    ".table-play-surface.compact-play .table-play-panel .result, .table-play-surface.compact-play .table-play-panel .outcome, .table-play-surface.compact-play .table-play-panel .explanation",
    ".table-play-surface .action-row",
    feedbackGap
  );
}

async function expectHandCardsDoNotOverlap(page: Page, handSelector: string, maxRows = 2) {
  const cards = page.locator(`${handSelector} .full-hand-card`);
  await expect(cards.first()).toBeVisible();
  await expect
    .poll(async () =>
      cards.evaluateAll((nodes, expectedMaxRows) => {
        const rects = nodes
          .map((node) => node.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => ({
            top: Math.round(rect.top),
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left
          }));

        const rowCount = new Set(rects.map((rect) => rect.top)).size;
        const hasCollision = rects.some((first, firstIndex) =>
          rects.slice(firstIndex + 1).some((second) => {
            const horizontal = Math.min(first.right, second.right) - Math.max(first.left, second.left);
            const vertical = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
            return horizontal > 1 && vertical > 1;
          })
        );

        return rects.length > 0 && rowCount <= expectedMaxRows && !hasCollision;
      }, maxRows)
    )
    .toBe(true);
}

async function gotoWithPracticeSeed(page: Page, seed: number) {
  await page.goto("/");
  await page.evaluate((nextSeed) => {
    localStorage.setItem("barbu.practiceSeed.v1", String(nextSeed));
  }, seed);
  await page.reload();
}

async function gotoFreshPracticeSeed(page: Page, seed: number) {
  await page.goto("/");
  await page.evaluate((nextSeed) => {
    localStorage.clear();
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

async function expectTableCardholdersDoNotOverlap(page: Page) {
  const holders = page.locator(".card-table .cardholder");
  await expect(holders.first()).toBeVisible();
  await expect
    .poll(async () =>
      holders.evaluateAll((nodes) => {
        const rects = nodes
          .map((node) => node.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => ({
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left
          }));

        return !rects.some((first, firstIndex) =>
          rects.slice(firstIndex + 1).some((second) => {
            const horizontal = Math.min(first.right, second.right) - Math.max(first.left, second.left);
            const vertical = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
            return horizontal > 1 && vertical > 1;
          })
        );
      })
    )
    .toBe(true);
}

async function expectTableCardLabelsBelowCards(page: Page) {
  const holders = page.locator(".card-table .cardholder");
  await expect(holders.first()).toBeVisible();
  await expect
    .poll(async () =>
      holders.evaluateAll((nodes) =>
        nodes
          .filter((holder) => holder.querySelector(".table-card"))
          .every((holder) => {
            const card = holder.querySelector(".table-card")?.getBoundingClientRect();
            const label = holder.querySelector(".cardholder-label")?.getBoundingClientRect();
            return Boolean(card && label && label.top >= card.bottom - 0.5);
          })
      )
    )
    .toBe(true);
}

async function expectBridgeTableHandsUseSevenCardRows(page: Page) {
  const hands = page.locator(".bridge-table-hand, .bridge-thumb-hand");
  await expect(hands.first()).toBeVisible();
  await expect
    .poll(async () =>
      hands.evaluateAll((nodes) =>
        nodes.every((hand) => {
          const handBox = hand.getBoundingClientRect();
          const facesFillCards = [...hand.querySelectorAll(".hand-card")].every((card) => {
            const face = card.querySelector(".card-face");
            const box = card.getBoundingClientRect();
            return face && Math.abs(face.getBoundingClientRect().width - box.width) <= 1
              && Math.abs(box.height - box.width * 1.4) <= 1
              && box.top >= handBox.top - 1 && box.bottom <= handBox.bottom + 1;
          });
          const cards = [...hand.querySelectorAll(".hand-card")]
            .map((card) => card.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => ({
              top: Math.round(rect.top),
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left
            }));

          if (cards.length === 0) {
            return true;
          }

          const rowSizes = [...new Set(cards.map((card) => card.top))].map(
            (top) => cards.filter((card) => card.top === top).length
          );
          const hasCollision = cards.some((first, firstIndex) =>
            cards.slice(firstIndex + 1).some((second) => {
              const horizontal = Math.min(first.right, second.right) - Math.max(first.left, second.left);
              const vertical = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
              return horizontal > 1 && vertical > 1;
            })
          );

          return facesFillCards && rowSizes.length <= 2 && rowSizes[0] <= 7 && (cards.length <= 7 || rowSizes[0] === 7) && !hasCollision;
        })
      )
    )
    .toBe(true);
}

async function expectBridgeTrickSlotsDoNotOverlap(page: Page) {
  const slots = page.locator(".bridge-felt .cardholder");
  const minGap = 4;
  await expect(slots.first()).toBeVisible();
  await expect
    .poll(async () =>
      slots.evaluateAll((nodes, requiredGap) => {
        const rects = nodes
          .map((slot) => slot.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => ({
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left
          }));

        return !rects.some((first, firstIndex) =>
          rects.slice(firstIndex + 1).some((second) => {
            const horizontal = Math.min(first.right, second.right) - Math.max(first.left, second.left);
            const vertical = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
            const horizontalGap = Math.max(second.left - first.right, first.left - second.right, 0);
            const verticalGap = Math.max(second.top - first.bottom, first.top - second.bottom, 0);
            return (
              (horizontal > 1 && vertical > 1) ||
              (horizontal > 1 && verticalGap < requiredGap) ||
              (vertical > 1 && horizontalGap < requiredGap)
            );
          })
        );
      }, minGap)
    )
    .toBe(true);
}

async function expectElementsDoNotOverlap(page: Page, firstSelector: string, secondSelector: string) {
  const first = page.locator(firstSelector).first();
  const second = page.locator(secondSelector).last();
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect
    .poll(async () => {
      const firstBox = await first.boundingBox();
      const secondBox = await second.boundingBox();
      if (!firstBox || !secondBox) {
        return false;
      }

      const horizontal = Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) - Math.max(firstBox.x, secondBox.x);
      const vertical = Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height) - Math.max(firstBox.y, secondBox.y);
      return horizontal <= 1 || vertical <= 1;
    })
    .toBe(true);
}

async function openBarbuTab(page: Page, tab: "Learn" | "Practice" | "Play") {
  await page.getByRole("tab", { name: tab }).click();
  await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
}

async function openBarbuContracts(page: Page) {
  await openBarbuTab(page, "Learn");
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

async function startSavedPlayBarbuContractHand(page: Page, contract: string) {
  await page.goto("/");
  await page.evaluate((pendingContract) => {
    localStorage.setItem(
      "barbu.savedPlayRun.v1",
      JSON.stringify({
        version: 1,
        seed: 7,
        view: "runContractIntro",
        pendingContract,
        results: [],
        fullHand: null,
        dominoHand: null,
        fullHandReviewTrickCount: 0,
        usingBrowserFullHand: false,
        usingBrowserDomino: false,
        savedAt: new Date().toISOString()
      })
    );
  }, contract);
  await page.reload();
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Play");
  await page.getByRole("button", { name: "Continue Play Barbu" }).click();
  await expect(page.getByRole("heading", { name: contract })).toBeVisible();
  await page.getByRole("button", { name: "Start hand" }).click();
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
  const goodCard = page.locator(".drill-hand .hand-card.legal.good").first();
  if (await goodCard.isVisible().catch(() => false)) {
    await goodCard.tap();
  } else {
    await page.locator(".drill-hand .hand-card.legal").first().tap();
  }
  await checkDrillAnswer(page);
}

async function completeHeartsFirstTrickDecision(page: Page) {
  for (const cardName of ["3 C", "8 D", "4 C"]) {
    const card = page.locator(".drill-hand").getByRole("button", { name: cardName });
    if (await card.isVisible().catch(() => false)) {
      await card.tap();
      await checkDrillAnswer(page);
      return;
    }
  }

  throw new Error("No known good Hearts first-trick card was visible.");
}

async function completeVisibleDrillSession(page: Page) {
  for (let decision = 0; decision < 10; decision += 1) {
    await completeQuickDrillDecision(page);

    const reviewSession = page.getByRole("button", { name: "Review session" });
    if (await reviewSession.isVisible()) {
      await expect(reviewSession).toBeEnabled();
      await reviewSession.tap();
      return;
    }

    await continueDrillFromCheckedAnswer(page, "Next decision");
  }

  throw new Error("Drill session did not finish within 10 decisions");
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

async function completeFullHand(page: Page, finalActionName: string) {
  for (let decision = 0; decision < 14; decision += 1) {
    if (await page.getByRole("button", { name: finalActionName }).isVisible()) {
      return;
    }

    await playFullHandDecision(page);
  }

  throw new Error(`Full hand did not finish with ${finalActionName}`);
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
    await expectFeedbackClearOfHand(page, ".domino-cards");
    await placeCard.click();
    await expect.poll(async () => (await handRegion.innerText()) !== previousState).toBe(true);
    return;
  }

  if ((await legalCard.count()) > 0) {
    await legalCard.click();
    await expectFeedbackClearOfHand(page, ".domino-cards");
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
  await expect(page.getByRole("heading", { name: "The Bridge Path" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Club Games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Skill Packs & Solitaire" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Hearts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Barbu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Card Counting I" })).toContainText("Pack");
  await expect(page.getByRole("button", { name: "Open Card Counting I" })).toContainText("4 minigames");
  await expect(page.getByRole("button", { name: "Card Counting II planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Card Counting II planned" })).toContainText("Pack");
  await expect(page.getByRole("button", { name: "Card Counting II planned" })).toContainText("Bridge-oriented");
  await expect(page.getByRole("button", { name: "Solitaire planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open Whist/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open Spades/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open Bridge/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gin Rummy planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Canasta planned" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open Whist/ })).toContainText("Free");
  await expect(page.getByRole("button", { name: /Open Spades/ })).toContainText("Free");
  await expect(page.getByRole("button", { name: "Solitaire planned" })).toContainText("Pack");
  await expect(page.getByRole("heading", { name: "Varieties of play" })).toHaveCount(0);
  await expect(page.getByText("Barbu Learning Table")).toHaveCount(0);
  await expect
    .poll(async () =>
      page.locator(".game-card strong").evaluateAll((items) => items.slice(0, 5).map((item) => item.textContent?.trim()))
    )
    .toEqual(["Hearts", "Whist", "Spades", "Bridge", "Barbu"]);

  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });

  await page.getByRole("button", { name: /Open Whist/ }).click();
  await expect(page.getByRole("heading", { name: "Whist table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Learn" }).click();
  await expect(page.getByLabel("Whist lesson path")).toContainText("Win tricks together");
  await expect(page.getByLabel("Whist lesson path")).toContainText("Opening leads");
  await expect(page.getByLabel("Whist lesson path")).toContainText("Invite a suit");
  await expect(page.getByLabel("Whist lesson path")).toContainText("Count odd tricks");
  await expect(page.getByLabel("Whist learn actions").getByRole("button", { name: "Rules Reference" })).toBeVisible();
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByRole("heading", { name: "Repeat one Whist habit." })).toBeVisible();
  await expect(page.getByLabel("Whist practice drills")).toContainText("Opening lead");
  await expect(page.getByLabel("Whist practice drills")).toContainText("Follow suit");
  await expect(page.getByLabel("Whist practice drills")).toContainText("Trump or discard");
  await expect(page.getByLabel("Whist practice drills")).toContainText("Third hand high");
  await expect(page.getByLabel("Whist practice drills")).toContainText("Return partner's suit");
  await expect(page.getByLabel("Whist practice drills")).toContainText("Count odd tricks");
  await page.getByRole("button", { name: "Games" }).click();

  await page.getByRole("button", { name: /Open Spades/ }).click();
  await expect(page.getByRole("heading", { name: "Spades table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Learn" }).click();
  await expect(page.getByLabel("Spades lesson path")).toContainText("Spades always trump");
  await expect(page.getByLabel("Spades learn actions").getByRole("button", { name: "Rules Reference" })).toBeVisible();
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByRole("tabpanel", { name: "Practice" })).toContainText("Practice one Spades habit.");
  await expect(page.getByLabel("Spades practice drills")).toContainText("Follow suit");
  await expect(page.getByLabel("Spades practice drills")).toContainText("Trump or discard");
  await page.getByRole("button", { name: "Games" }).click();

  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await expect(page.getByRole("heading", { name: "Bridge table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Learn" }).click();
  await expect(page.getByLabel("Bridge lesson path")).toContainText("Declarer play");
  await expect(page.getByLabel("Bridge lesson path")).toContainText("The Dummy");
  await expect(page.getByLabel("Bridge learn actions").getByRole("button", { name: "Rules Reference" })).toBeVisible();
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByRole("tabpanel", { name: "Practice" })).toContainText("Practice one Bridge habit.");
  await expect(page.getByLabel("Bridge practice drills")).toContainText("Declarer play");
  await expect(page.getByLabel("Bridge practice drills")).toContainText("Defense");
  await page.getByRole("button", { name: "Games" }).click();

  await page.getByRole("button", { name: "Open Barbu" }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Barbu table actions").getByRole("button", { name: "Play Barbu" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toBeVisible();

  await openBarbuTab(page, "Learn");
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

  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("button", { name: "Open Card Counting I" }).click();
  await expect(page.getByRole("heading", { name: "Card Counting I" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Card Counting I exercises")).toContainText("Count trumps");
  await expect(page.getByLabel("Card Counting I exercises")).toContainText("Heart memory hand");
  await expect(page.getByLabel("Card Counting I exercises")).toContainText("Three amigos memory");
  await expect(page.getByLabel("Card Counting I exercises")).toContainText("Danger cards");
  await page.getByRole("tab", { name: "Learn" }).click();
  await expect(page.getByLabel("Card Counting I learning path")).toContainText("Count one suit");
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Count trumps" }).click();
  await expect(page.getByRole("heading", { name: "Count trumps" })).toBeVisible();
  await page.getByLabel("Count trumps", { exact: true }).getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Card Counting I" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("card-counting-table.png"), fullPage: true });
});

test("Whist practice starts playable partnership drills", async ({ page }) => {
  await gotoWithPracticeSeed(page, 4);
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Practice" }).click();

  await page.getByLabel("Whist practice drills").getByRole("button", { name: "Opening lead" }).click();
  await expect(page.getByRole("heading", { name: "Whist hand" })).toBeVisible();
  await expect(page.getByLabel("Whist full hand")).toContainText("trumps");
  await expect(page.getByLabel("Whist hand decision")).toContainText("Lead 1 of 3");
  await expect(page.getByLabel("Whist hand decision")).toContainText("Show Barbu spades");
  await expect(page.getByLabel("Whist hand score")).toContainText("Lead");
  await expect(page.getByLabel("Whist hand score")).toContainText("1 / 3");
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  const whistOpeningLeadCardLabels = await page
    .getByLabel("Your Whist hand")
    .locator(".full-hand-card")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("aria-label")));
  expect(whistOpeningLeadCardLabels).toEqual(["2 S", "5 S", "8 S", "10 S", "Q S", "3 H", "7 H", "J H", "6 D", "9 D", "A D", "4 C", "K C"]);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("barbu.savedWhistRun.v1"))).toBeNull();

  await page.getByLabel("Your Whist hand").getByRole("button", { name: "5 S" }).click();
  await page.getByRole("button", { name: "Play card" }).click();
  await expect(page.getByRole("button", { name: "Next lead", exact: true })).toBeVisible();
  await expect(page.getByLabel("Whist hand decision")).toContainText("fourth highest");

  await page.getByRole("button", { name: "Next lead", exact: true }).click();
  await expect(page.getByLabel("Whist hand score")).toContainText("2 / 3");
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card" }).click();
  await expect(page.getByRole("button", { name: "Next lead", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Next lead", exact: true }).click();
  await expect(page.getByLabel("Whist hand score")).toContainText("3 / 3");
  await expect(page.getByLabel("Whist hand decision")).toContainText("Show Barbu clubs");
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await page.getByLabel("Your Whist hand").getByRole("button", { name: "A C" }).click();
  await page.getByRole("button", { name: "Play card" }).click();
  await expect(page.getByRole("button", { name: "Finish session", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish session", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Whist table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");

  await page.getByLabel("Whist practice drills").getByRole("button", { name: "Follow suit" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: follow suit" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Whist");
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Follow partner's led suit|Second hand follows low|Cover when it wins/);

  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Practice Whist again" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Whist practice" }).click();
  await expect(page.getByRole("heading", { name: "Whist table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");

  await page.getByLabel("Whist practice drills").getByRole("button", { name: "Trump or discard" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: trump or discard" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Whist");
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Cut with trump|Discard when partner is winning|Overtrump the opponent/);
  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Whist table", exact: true })).toBeVisible();

  await page.getByLabel("Whist practice drills").getByRole("button", { name: "Third hand high" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: third hand high" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText(/Support partner's lead|Do not overpay|Allow for fourth hand/);
  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();

  await page.getByLabel("Whist practice drills").getByRole("button", { name: "Return partner's suit" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: return partner's suit" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText(/Lead partner's suit back|Return without overcommitting|Return the plain suit/);
  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();

  await page.getByLabel("Whist practice drills").getByRole("button", { name: "Count odd tricks" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: count odd tricks" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText(/Win the first odd trick|Protect the next odd trick|Add another odd trick/);
});

test("Whist learn path opens matching practice decisions", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 4);
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Learn" }).click();

  await page.getByRole("button", { name: /^1 Concept Win tricks together/ }).click();
  await expect(page.getByRole("heading", { name: "Win tricks together" })).toBeVisible();
  await expect(page.getByLabel("Whist course content")).toContainText("Whist is partnership trick-taking");
  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByRole("heading", { name: "Left leads clubs. Barbu is your partner across the table." })).toBeVisible();
  await expect(page.getByLabel("Whist trick sequence")).toContainText("Barbu plays KC");
  await expect(page.getByLabel("Whist partnership example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();

  await expect(page.getByRole("heading", { name: "Whist practice: follow suit" })).toBeVisible();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Follow partner's led suit|Second hand follows low|Cover when it wins/);
  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Whist starts with partnership awareness")).toBeVisible();
  await page.getByRole("button", { name: "Finish Whist" }).click();

  await page.getByRole("button", { name: /^2 Rule Follow suit/ }).click();
  await expect(page.getByRole("heading", { name: "Follow suit" })).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Whist follow suit example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: follow suit" })).toBeVisible();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Follow partner's led suit|Second hand follows low|Cover when it wins/);

  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Following suit keeps the table readable")).toBeVisible();
  await page.getByRole("button", { name: "Finish Whist" }).click();

  await page.getByRole("button", { name: /^3 Example Trump wins/ }).click();
  await expect(page.getByRole("heading", { name: "Trump wins" })).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Whist trump example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
  await expect(page.getByRole("heading", { name: "Whist practice: trump or discard" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText(/Cut with trump|Discard when partner is winning|Overtrump the opponent/);

  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();
  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByRole("button", { name: /Opening leads/ }).click();
  await expect(page.getByRole("heading", { name: "Opening leads" })).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Whist opening lead example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
  await expect(page.getByRole("heading", { name: "Whist lesson: opening leads" })).toBeVisible();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Lead your long suit|Lead from strength|Do not open trump casually/);
  await expectFeedbackAboveHand(page, ".drill-hand");
  await page.screenshot({ path: testInfo.outputPath("whist-opening-leads-learn.png"), fullPage: true });
});

test("Whist play starts a partnership trump hand", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 8);
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();

  await expect(page.getByRole("tabpanel", { name: "Play" })).toContainText("odd-trick scoring");
  await page.getByRole("button", { name: "Play Whist" }).click();

  await expect(page.getByRole("heading", { name: "Whist hand" })).toBeVisible();
  await expect(page.getByLabel("Whist full hand")).toContainText("Trump:");
  await expect(page.getByLabel("Whist hand score")).toContainText("Your side");
  await expect(page.getByLabel("Whist hand score")).toContainText("Opponents");
  await expect(page.getByLabel("Whist hand score")).toContainText("To odd");
  await expect(page.getByLabel("Whist match score")).toContainText("Game to 5");
  await expect(page.getByLabel("Whist match score")).toContainText("You + Barbu");
  await expect(page.getByLabel("Whist match score")).toContainText("Left + Right");
  await expect(page.getByLabel("Whist hand table")).toBeVisible();
  await expect(page.getByLabel("Your Whist hand")).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await page.screenshot({ path: testInfo.outputPath("whist-hand.png"), fullPage: true });

  await playFullHandDecision(page);
  await expect(page.getByRole("heading", { name: /Whist hand|Read the table/ })).toBeVisible();
});

test("Spades play starts a bid-scored partnership hand", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 8);
  await page.getByRole("button", { name: /Open Spades/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();

  await expect(page.getByRole("tabpanel", { name: "Play" })).toContainText("spades always trump");
  await expect(page.getByRole("tabpanel", { name: "Play" })).toContainText("Individual bids");
  const playSpadesBtn = page.getByRole("button", { name: "Play Spades" });
  await expect(playSpadesBtn).toBeEnabled();

  await playSpadesBtn.click();

  await expect(page.getByRole("heading", { name: "Spades hand" })).toBeVisible();
  await expect(page.getByLabel("Spades hand", { exact: true })).toContainText("Trump");
  await expect(page.getByLabel("Spades hand", { exact: true })).toContainText("Spades");
  await expect(page.getByLabel("Spades hand score")).toContainText("Your side");
  await expect(page.getByLabel("Spades hand score")).toContainText("Opponents");
  await expect(page.getByLabel("Spades hand score")).toContainText("Bid");
  await expect(page.getByLabel("Spades match score")).toContainText("You + Barbu");
  await expect(page.getByLabel("Spades match score")).toContainText("Bags");
  await expect(page.getByLabel("Spades hand table")).toBeVisible();
  await expect(page.getByLabel("Your Spades hand")).toBeVisible();
  const spadesFullHand = page.getByLabel("Spades full hand");
  await expect(spadesFullHand.getByRole("button", { name: "Table" })).toBeVisible();
  await expect(spadesFullHand.getByRole("button", { name: "Adjust bid" })).toBeVisible();
  await expect(spadesFullHand.getByRole("button", { name: "Start hand" })).toBeVisible();
  await expect(spadesFullHand.getByRole("button", { name: "Play card" })).not.toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await page.screenshot({ path: testInfo.outputPath("spades-hand.png"), fullPage: true });

  await spadesFullHand.getByRole("button", { name: "Adjust bid" }).click();
  await expect(page.getByText("Set your bid for this hand")).toBeVisible();
  await expect(page.getByLabel("Decrease You bid")).toBeVisible();
  await expect(page.getByLabel("Increase You bid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Increase Barbu bid" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Decrease Left bid" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Increase Right bid" })).toHaveCount(0);
  await expect(page.getByText("Auto")).toHaveCount(3);
  await expect(page.locator(".spades-bid-summary")).toContainText("You + Barbu");
  await expect(page.locator(".spades-bid-summary")).toContainText("Left + Right");
  await expect(spadesFullHand.getByRole("button", { name: "Show cards" })).toBeVisible();

  await spadesFullHand.getByRole("button", { name: "Show cards" }).click();
  await expect(page.getByLabel("Your Spades hand")).toBeVisible();
  await expect(spadesFullHand.getByRole("button", { name: "Adjust bid" })).toBeVisible();

  await spadesFullHand.getByRole("button", { name: "Start hand" }).click();
  await expect(spadesFullHand.getByRole("button", { name: "Play card" })).toBeVisible();
  await playFullHandDecision(page);
  await expect(page.getByRole("heading", { name: /Spades hand|Read the table/ })).toBeVisible();
});

test("Spades bid controls estimate the table and only let the player adjust", async ({ page }) => {
  await gotoWithPracticeSeed(page, 8);
  await page.getByRole("button", { name: /Open Spades/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();

  const playSpadesBtn = page.getByRole("button", { name: "Play Spades" });
  await playSpadesBtn.click();
  await expect(page.getByLabel("Your Spades hand")).toBeVisible();
  const spadesFullHand = page.getByLabel("Spades full hand");
  await spadesFullHand.getByRole("button", { name: "Adjust bid" }).click();

  const bidValue = (seatIndex: number) => page.locator(".play-spades-bids .spades-bid-value").nth(seatIndex);
  const youBidDown = page.getByRole("button", { name: "Decrease You bid" });
  const youBidUp = page.getByRole("button", { name: "Increase You bid" });
  const bidSummary = page.locator(".spades-bid-summary");

  const readBid = async (seatIndex: number): Promise<number> => {
    const text = await bidValue(seatIndex).textContent();
    return Number((text ?? "0").trim());
  };

  const setBid = async (seatIndex: number, target: number, down: Locator, up: Locator) => {
    let current = await readBid(seatIndex);
    while (current < target) {
      await up.click();
      current += 1;
    }
    while (current > target) {
      await down.click();
      current -= 1;
    }
  };

  const readTotal = async (): Promise<number> => {
    const totalText = (await bidSummary.textContent()) ?? "";
    const match = totalText.match(/Table total\s*(\d+)/);
    return Number(match?.[1] ?? 0);
  };

  const readTeamBids = async () => ({
    playerSide: (await readBid(0)) + (await readBid(1)),
    opponentSide: (await readBid(2)) + (await readBid(3))
  });

  const expectSummaryMatchesBids = async () => {
    const bids = await readTeamBids();
    await expect(page.getByLabel("Spades hand score")).toContainText(`${bids.playerSide}-${bids.opponentSide}`);
    await expect(bidSummary).toContainText(`You + Barbu ${bids.playerSide}`);
    await expect(bidSummary).toContainText(`Left + Right ${bids.opponentSide}`);
    await expect(await readTotal()).toBe(bids.playerSide + bids.opponentSide);
  };

  await page.screenshot({ path: "test-results/spades-bid-controls-initial.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Increase Barbu bid" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Decrease Left bid" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Increase Right bid" })).toHaveCount(0);
  await expect(page.getByText("Auto")).toHaveCount(3);
  await expectSummaryMatchesBids();

  await setBid(0, 0, youBidDown, youBidUp);
  await expect(page.getByLabel("You bid 0")).toBeVisible();
  await expect(page.getByText("You nil")).toBeVisible();
  await expectSummaryMatchesBids();
  await expect(page.getByRole("status")).not.toBeVisible();
  await expect(spadesFullHand.getByRole("button", { name: "Start hand" })).toBeEnabled();
  await page.screenshot({ path: "test-results/spades-bid-controls-you-nil.png", fullPage: true });

  await expect(youBidDown).toBeDisabled();

  await setBid(0, 2, youBidDown, youBidUp);
  await expect(page.getByLabel("You bid 2")).toBeVisible();
  await expectSummaryMatchesBids();
  await expect(page.getByRole("status")).not.toBeVisible();
  await expect(spadesFullHand.getByRole("button", { name: "Start hand" })).toBeEnabled();

  await setBid(0, 7, youBidDown, youBidUp);
  await expectSummaryMatchesBids();
  await expect(spadesFullHand.getByRole("button", { name: "Start hand" })).toBeEnabled();
  await page.screenshot({ path: "test-results/spades-bid-controls-player-only-valid.png", fullPage: true });

  await spadesFullHand.getByRole("button", { name: "Show cards" }).click();
  await expect(page.getByLabel("Your Spades hand")).toBeVisible();
  await spadesFullHand.getByRole("button", { name: "Adjust bid" }).click();
  await expect(page.getByLabel("You bid 7")).toBeVisible();
  await expectSummaryMatchesBids();
});

test("Bridge play starts from a rotating auction into a scored contract hand", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 12);
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();

  await expect(page.getByRole("tabpanel", { name: "Play" })).toContainText("basic natural auction");
  await page.getByRole("button", { name: "Play Bridge" }).click();

  await expect(page.getByRole("heading", { name: "Bridge auction" })).toBeVisible();
  await expect(page.getByLabel("Bridge bidding box")).toContainText(/Choose your call|Auction complete/);
  await expect(page.getByLabel("Bridge hand estimate")).toContainText("Vuln.");
  await expect(page.getByLabel("Bridge bidding box")).toContainText("Auction");
  await expect(page.getByLabel("Bridge bids").getByRole("button", { name: "1NT" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".bridge-auction-metrics > div")].every(
          (tile) => tile.scrollWidth <= tile.clientWidth && tile.scrollHeight <= tile.clientHeight
        )
      )
    )
    .toBe(true);
  for (let callIndex = 0; callIndex < 4 && (await page.getByRole("button", { name: "Start play" }).count()) === 0; callIndex += 1) {
    await page.getByRole("button", { name: "Make call" }).click();
  }
  await page.getByRole("button", { name: "Start play" }).click();

  await expect(page.getByRole("heading", { name: "Bridge hand" })).toBeVisible();
  await expect(page.getByLabel("Bridge hand score")).toContainText("Target");
  await expect(page.getByLabel("Bridge hand score")).toContainText("Declarer");
  await expect(page.getByLabel("Bridge hand score")).toContainText("Defense");
  await expect(page.getByLabel("Bridge score")).toContainText("NS");
  await expect(page.getByLabel("Bridge score")).toContainText("EW");
  await expect(page.getByLabel("Bridge hand table")).toBeVisible();
  await expect(page.getByLabel("Bridge hand table")).toContainText("North");
  await expect(page.getByLabel("Bridge hand table")).toContainText("East");
  await expect(page.getByLabel("Bridge hand table")).toContainText("South");
  await expect(page.getByLabel("Bridge hand table")).toContainText("West");
  await expect(page.getByLabel("Bridge hand table")).not.toContainText(/\bLeft\b|\bRight\b/);
  await expect(page.getByLabel("Visible dummy cards")).toBeVisible();
  await expect(page.getByLabel("Current trick")).toBeVisible();
  await expectBridgeTableHandsUseSevenCardRows(page);
  await expectBridgeTrickSlotsDoNotOverlap(page);
  if ((await page.getByLabel("Dummy hidden").count()) > 0) {
    await expect(page.locator(".bridge-thumb-hand .full-hand-card.legal").first()).toBeVisible();
    await page.locator(".bridge-thumb-hand .full-hand-card.legal").first().dblclick();
  }
  await expect(page.getByLabel("Dummy hand", { exact: true })).toBeVisible();
  if ((await page.getByRole("button", { name: "Next trick" }).count()) > 0) {
    await page.getByRole("button", { name: "Next trick" }).click();
  }
  await expect(page.locator(".bridge-thumb-hand .full-hand-card.legal").first()).toBeVisible();
  await expectBridgeTableHandsUseSevenCardRows(page);
  await expectBridgeTrickSlotsDoNotOverlap(page);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("bridge-hand.png"), fullPage: true });

  const bridgeThumbCardBox = await page.locator(".bridge-thumb-hand .full-hand-card.legal").first().boundingBox();
  expect(bridgeThumbCardBox).not.toBeNull();
  await page.locator(".bridge-thumb-hand .full-hand-card.legal").first().dblclick();
  await expect(page.getByRole("heading", { name: /Bridge hand|Read the table/ })).toBeVisible();
  const bridgeTrickCards = await page.locator(".bridge-felt .table-card").count();
  expect(bridgeTrickCards).toBeGreaterThan(0);
  const bridgeTableCardBox = await page.locator(".bridge-felt .table-card").first().boundingBox();
  const bridgeDummyCardBox = await page.locator(".bridge-seat-north .full-hand-card").first().boundingBox();
  expect(bridgeTableCardBox).not.toBeNull();
  expect(bridgeDummyCardBox).not.toBeNull();
  expect(Math.abs((bridgeTableCardBox?.width ?? 0) - (bridgeThumbCardBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((bridgeDummyCardBox?.width ?? 0) - (bridgeThumbCardBox?.width ?? 0))).toBeLessThanOrEqual(1);
  await expectBridgeTableHandsUseSevenCardRows(page);
  await expectBridgeTrickSlotsDoNotOverlap(page);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("bridge-after-dummy-play.png"), fullPage: true });
});

test("Bridge compact play keeps table hands readable on short screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "galaxy-s9", "Viewport matrix for older phone and narrow browser sizes.");

  for (const viewport of compactLayoutViewports) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoWithPracticeSeed(page, 12);
      await page.getByRole("button", { name: /Open Bridge/ }).click();
      await page.getByRole("tab", { name: "Play" }).click();
      await page.getByRole("button", { name: "Play Bridge" }).click();

      for (let callIndex = 0; callIndex < 4 && (await page.getByRole("button", { name: "Start play" }).count()) === 0; callIndex += 1) {
        await page.getByRole("button", { name: "Make call" }).click({ force: true });
      }
      await page.getByRole("button", { name: "Start play" }).click({ force: true });

      await expect(page.getByRole("heading", { name: "Bridge hand" })).toBeVisible();
      await expect(page.getByLabel("Bridge hand table")).toBeVisible();
      await expectBridgeTableHandsUseSevenCardRows(page);
      await expectBridgeTrickSlotsDoNotOverlap(page);
      await expectElementsDoNotOverlap(page, ".bridge-play-summary", ".bridge-table");
      await expectElementsDoNotOverlap(page, ".bridge-seat-north", ".bridge-felt");
      await expectElementsDoNotOverlap(page, ".bridge-table", ".table-play-panel .result, .table-play-panel .outcome");
      await expectElementsDoNotOverlap(page, ".table-play-panel .result, .table-play-panel .outcome", ".bridge-thumb-hand");
      await expectElementsDoNotOverlap(page, ".table-play-panel .result, .table-play-panel .outcome", ".action-row");
      await expectCompactPlayStack(page, ".bridge-thumb-hand", { feedbackGap: 0, tableSelector: ".bridge-table" });

      const legalCard = page.locator(".bridge-thumb-hand .full-hand-card.legal").first();
      if ((await legalCard.count()) > 0) {
        await legalCard.dblclick({ force: true });
        await expect(page.getByLabel("Dummy hand", { exact: true })).toBeVisible();
        await expect(page.locator(".bridge-dummy-turn-feedback .lesson-heading")).toBeHidden();
        await expectBridgeTableHandsUseSevenCardRows(page);
        await expectBridgeTrickSlotsDoNotOverlap(page);
        await expectTableCardLabelsBelowCards(page);
        await expectElementsDoNotOverlap(page, ".bridge-table", ".table-play-panel .result, .table-play-panel .outcome");
        if ((await page.locator(".bridge-thumb-hand").count()) > 0) {
          await expectElementsDoNotOverlap(page, ".table-play-panel .result, .table-play-panel .outcome", ".bridge-thumb-hand");
        }
        await expectNoPageScroll(page);
        await expectGameplayActionRowPinned(page);
      }

      await page.screenshot({ path: testInfo.outputPath(`bridge-compact-${viewport.name}.png`), fullPage: true });
    });
  }
});

test("shared compact play stack fits Barbu, Whist, and Spades on constrained screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "galaxy-s9", "Viewport matrix for older phone and narrow browser sizes.");

  const games: {
    name: string;
    handSelector: string;
    start: () => Promise<void>;
  }[] = [
    {
      name: "barbu",
      handSelector: ".full-hand-cards",
      start: async () => {
        await page.getByRole("button", { name: /Barbu/ }).click();
        await openBarbuTab(page, "Play");
        await page.getByRole("button", { name: "Play Barbu" }).click();
        await page.getByRole("button", { name: "Start hand" }).click({ force: true });
        await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
      }
    },
    {
      name: "whist",
      handSelector: ".full-hand-cards",
      start: async () => {
        await page.getByRole("button", { name: /Open Whist/ }).click();
        await page.getByRole("tab", { name: "Play" }).click();
        await page.getByRole("button", { name: "Play Whist" }).click();
        await expect(page.getByRole("heading", { name: "Whist hand" })).toBeVisible();
      }
    },
    {
      name: "spades",
      handSelector: ".full-hand-cards",
      start: async () => {
        await page.getByRole("button", { name: /Open Spades/ }).click();
        await page.getByRole("tab", { name: "Play" }).click();
        await page.getByRole("button", { name: "Play Spades" }).click();
        await expect(page.getByRole("heading", { name: "Spades hand" })).toBeVisible();
      }
    }
  ];

  for (const game of games) {
    for (const viewport of compactLayoutViewports) {
      await test.step(`${game.name}-${viewport.name}`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await gotoFreshPracticeSeed(page, 8);
        await game.start();

        await expect(page.locator(".table-play-surface.compact-play")).toBeVisible();
        await expect(page.locator(".card-table .cardholder")).toHaveCount(4);
        await expectTableSlotsSeparated(page);
        await expectTableCardholdersDoNotOverlap(page);
        await expectCompactPlayStack(page, game.handSelector);
        await expectHandCardsDoNotOverlap(page, game.handSelector);
      });
    }
  }
});

test("shared play keeps wrapped feedback below the board when the viewport changes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "galaxy-s9", "Live resize and enlarged text regression.");
  await gotoFreshPracticeSeed(page, 8);
  await page.getByRole("button", { name: "Open Whist", exact: true }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();

  for (const viewport of [...compactLayoutViewports, { name: "desktop", width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expectCompactPlayStack(page, ".full-hand-cards");
    await expectHandCardsDoNotOverlap(page, ".full-hand-cards");
  }

  await page.setViewportSize({ width: 360, height: 740 });
  await page.addStyleTag({ content: ":root { font-size: 20px; }" });
  await page.locator(".table-play-panel .result").evaluate((node) => {
    node.textContent = "Hearts were led. Follow suit if you can. Choose a legal card from your hand, then play it to continue the trick with your partnership.";
  });
  await expectCompactPlayStack(page, ".full-hand-cards");
  await expectTableCardholdersDoNotOverlap(page);
  await page.screenshot({ path: testInfo.outputPath("wrapped-feedback-large-text.png"), fullPage: true });
});

test("Bridge defender void discard preserves high side-suit cards", () => {
  const northHand = [testCard("2", "H"), testCard("K", "H"), testCard("3", "C"), testCard("4", "S")];
  const state: FullHandState = {
    id: "bridge-void-discard-preserve-king",
    contract: "Bridge",
    hands: [
      northHand,
      [testCard("10", "D"), testCard("5", "C")],
      [testCard("8", "C"), testCard("9", "S")],
      [testCard("2", "D"), testCard("7", "C")]
    ],
    currentPlayerIndex: 0,
    currentPlayer: "Tutor",
    currentTrick: [
      { seat: "Left", card: testCard("2", "D") },
      { seat: "Right", card: testCard("10", "D") }
    ],
    completedTricks: [],
    playerHand: [],
    legalCardIds: [],
    playerPenalty: 0,
    totalPenalty: 0,
    cardsRemaining: 10,
    trickNumber: 1,
    status: "in_progress",
    prompt: "",
    trumpSuit: "D",
    bridgeAuction: [
      { seat: "Right", call: "1D" },
      { seat: "You", call: "Pass" },
      { seat: "Left", call: "Pass" },
      { seat: "Tutor", call: "Pass" }
    ],
    bridgeContract: {
      level: 1,
      strain: "D",
      label: "1 Diamonds",
      declarer: "Right",
      dummy: "Left",
      target: 7,
      vulnerability: "None",
      declarerSide: "EW",
      dealer: "Right",
      openingLeader: "Left"
    },
    bridgeDealer: "Right",
    bridgeVulnerability: "None"
  };

  expect(chooseBrowserOpponentCardForState(state)?.id).toBe("2H");
});

test("Bridge table hand rows do not shift after cards are played", async ({ page }) => {
  await gotoWithPracticeSeed(page, 12);
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play Bridge" }).click();

  await expect(page.getByRole("heading", { name: "Bridge auction" })).toBeVisible();
  for (let callIndex = 0; callIndex < 4 && (await page.getByRole("button", { name: "Start play" }).count()) === 0; callIndex += 1) {
    await page.getByRole("button", { name: "Make call" }).click();
  }
  await page.getByRole("button", { name: "Start play" }).click();

  await expect(page.getByRole("heading", { name: "Bridge hand" })).toBeVisible();
  const initialTableBox = await page.getByLabel("Bridge hand table").boundingBox();
  const initialThumbBox = await page.locator(".bridge-thumb-hand").boundingBox();
  expect(initialTableBox).not.toBeNull();
  expect(initialThumbBox).not.toBeNull();

  if ((await page.getByLabel("Dummy hidden").count()) > 0) {
    await page.locator(".bridge-thumb-hand .full-hand-card.legal").first().dblclick();
  }
  await expect(page.getByLabel("Dummy hand", { exact: true })).toBeVisible();
  if (await page.getByRole("button", { name: "Next trick" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Next trick" }).click();
  }
  await expect(page.locator(".bridge-thumb-hand")).toBeVisible();
  const revealedTableBox = await page.getByLabel("Bridge hand table").boundingBox();
  const revealedThumbBox = await page.locator(".bridge-thumb-hand").boundingBox();
  expect(revealedTableBox).not.toBeNull();
  expect(revealedThumbBox).not.toBeNull();
  expect(Math.abs(Math.round(revealedTableBox!.height) - Math.round(initialTableBox!.height))).toBeLessThanOrEqual(1);
  expect(Math.abs(Math.round(revealedThumbBox!.y) - Math.round(initialThumbBox!.y))).toBeLessThanOrEqual(1);

  if (await page.getByRole("button", { name: "Next trick" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Next trick" }).click();
  }

  for (let playIndex = 0; playIndex < 24; playIndex += 1) {
    if (await page.getByRole("button", { name: "Next trick" }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Next trick" }).click();
    }

    const thumbCards = await page.locator(".bridge-thumb-hand .hand-card").count();
    if (thumbCards <= 7) {
      break;
    }

    const card = page.locator(".bridge-thumb-hand .full-hand-card.legal").first();
    await expect(card).toBeVisible();
    await card.dblclick();
  }

  const finalThumbCount = await page.locator(".bridge-thumb-hand .hand-card").count();
  expect(finalThumbCount).toBeLessThanOrEqual(7);

  const finalThumbBox = await page.locator(".bridge-thumb-hand").boundingBox();
  expect(finalThumbBox).not.toBeNull();
  expect(Math.round(finalThumbBox!.height)).toBe(Math.round(initialThumbBox!.height));
  expect(Math.round(finalThumbBox!.y)).toBe(Math.round(initialThumbBox!.y));
});

test("Bridge practice starts three short scripted decisions", async ({ page }) => {
  await gotoWithPracticeSeed(page, 5);
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Practice" }).click();

  await expect(page.getByLabel("Bridge practice drills")).toContainText("Opening bids");
  await page.getByLabel("Bridge practice drills").getByRole("button", { name: "Declarer play" }).click();

  await expect(page.getByRole("heading", { name: "Bridge practice: declarer play" })).toBeVisible();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Try the finesse|Force out the ace|Break defender communication/);

  await completeVisibleDrillSession(page);

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Practice Bridge again" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Bridge practice" }).click();
  await expect(page.getByRole("heading", { name: "Bridge table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Bridge bidding practice teaches the basic natural openings", async ({ page }) => {
  await gotoWithPracticeSeed(page, 9);
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByLabel("Bridge practice drills").getByRole("button", { name: "Opening bids" }).click();

  await expect(page.getByRole("heading", { name: "Bridge bidding" })).toBeVisible();
  await expect(page.getByLabel("Bridge bidding estimate")).toContainText("2-3-4-4");
  await expect(page.getByLabel("Your Bridge bidding practice hand").getByRole("button")).toHaveCount(13);
  await expect(page.getByLabel("Your Bridge bidding practice hand").getByRole("button").nth(0)).toHaveAttribute("aria-label", "7 S");
  await expect(page.getByLabel("Your Bridge bidding practice hand").getByRole("button").nth(2)).toHaveAttribute("aria-label", "2 H");
  await expect(page.getByLabel("Your Bridge bidding practice hand").getByRole("button").nth(5)).toHaveAttribute("aria-label", "5 D");
  await expect(page.getByLabel("Your Bridge bidding practice hand").getByRole("button").nth(9)).toHaveAttribute("aria-label", "3 C");
  for (const expected of ["Pass", "1NT", "1♠"]) {
    await page.getByLabel("Bridge bidding choices").getByRole("button", { name: expected }).click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByLabel("Bridge bidding exercise")).toContainText("Good");
    await page.getByRole("button", { name: /Next decision|Finish practice/ }).click();
  }

  await expect(page.getByRole("heading", { name: "Bridge table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Whist play can resume a saved local match", async ({ page }) => {
  await gotoWithPracticeSeed(page, 8);
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play Whist" }).click();

  await expect(page.getByRole("heading", { name: "Whist hand" })).toBeVisible();
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("barbu.savedWhistRun.v1"))).not.toBeNull();

  await page.getByLabel("Whist full hand").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Whist table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Continue Whist" })).toBeVisible();
  await expect(page.getByText("Hand 1, trick 1, game 0 - 0")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Continue Whist" })).toBeVisible();

  await page.getByRole("button", { name: "Continue Whist" }).click();
  await expect(page.getByRole("heading", { name: "Whist hand" })).toBeVisible();
  await expect(page.locator(".full-hand-cards .full-hand-card")).toHaveCount(13);
  await expectNoPageScroll(page);
});

test("Spades play can resume a saved local match", async ({ page }) => {
  await gotoWithPracticeSeed(page, 15);
  await page.getByRole("button", { name: /Open Spades/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play Spades" }).click();

  await expect(page.getByRole("heading", { name: "Spades hand" })).toBeVisible();
  await expect(page.getByLabel("Your Spades hand")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("barbu.savedSpadesRun.v1"))).not.toBeNull();

  await page.getByLabel("Spades full hand").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Spades table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Continue Spades" })).toBeVisible();
  await expect(page.getByText(/Hand 1, bid \d+-\d+, match 0 - 0/)).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Open Spades/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Continue Spades" })).toBeVisible();

  await page.getByRole("button", { name: "Continue Spades" }).click();
  await expect(page.getByRole("heading", { name: "Spades hand" })).toBeVisible();
  await expect(page.getByLabel("Your Spades hand")).toBeVisible();
  await expect(page.getByLabel("Spades full hand").getByRole("button", { name: "Adjust bid" })).toBeVisible();
  await expectNoPageScroll(page);
});

test("Bridge play can resume a saved local board", async ({ page }) => {
  await gotoWithPracticeSeed(page, 12);
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play Bridge" }).click();

  await expect(page.getByRole("heading", { name: "Bridge auction" })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("barbu.savedBridgeRun.v1"))).not.toBeNull();

  await page.getByLabel("Bridge bidding box").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Bridge table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Continue Bridge" })).toBeVisible();
  await expect(page.getByText(/Board 1, auction in progress/)).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Continue Bridge" })).toBeVisible();

  await page.getByRole("button", { name: "Continue Bridge" }).click();
  await expect(page.getByRole("heading", { name: "Bridge auction" })).toBeVisible();
  await expect(page.getByLabel("Bridge bidding box")).toContainText("Auction");
});

test("Bridge passed-out auction can deal again", async ({ page }) => {
  await gotoWithPracticeSeed(page, 31);
  await page.evaluate(() => {
    const card = (rank: string, suit: "C" | "D" | "H" | "S") => ({ id: `${rank}${suit}`, rank, suit, label: `${rank}${suit}` });
    const southHand = [
      card("3", "C"),
      card("5", "C"),
      card("10", "C"),
      card("Q", "C"),
      card("5", "D"),
      card("7", "D"),
      card("Q", "D"),
      card("A", "D"),
      card("7", "S"),
      card("9", "S"),
      card("2", "H"),
      card("3", "H"),
      card("10", "H")
    ];
    const fullHand = {
      id: "bridge-passed-out-regression",
      contract: "Bridge",
      hands: [[], [], southHand, []],
      currentPlayerIndex: 2,
      currentPlayer: "You",
      currentTrick: [],
      completedTricks: [],
      playerHand: southHand,
      legalCardIds: [],
      playerPenalty: 0,
      totalPenalty: 0,
      cardsRemaining: 52,
      trickNumber: 1,
      status: "in_progress",
      prompt: "The auction was passed out.",
      trumpSuit: undefined,
      bridgeAuction: [
        { seat: "Right", call: "Pass" },
        { seat: "You", call: "Pass" },
        { seat: "Left", call: "Pass" },
        { seat: "Tutor", call: "Pass" }
      ],
      bridgeDealer: "Right",
      bridgeVulnerability: "NS"
    };

    localStorage.setItem(
      "barbu.savedBridgeRun.v1",
      JSON.stringify({
        version: 1,
        view: "bridgeAuction",
        scores: { ns: 0, ew: 0 },
        results: [],
        fullHand,
        auctionCalls: fullHand.bridgeAuction,
        selectedCall: "Pass",
        fullHandReviewTrickCount: 0,
        usingBrowserFullHand: true,
        savedAt: "2026-07-31T00:00:00.000Z"
      })
    );
  });

  await page.reload();
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Continue Bridge" }).click();

  await expect(page.getByRole("heading", { name: "Bridge auction" })).toBeVisible();
  await expect(page.getByLabel("Bridge bidding box")).toContainText("Auction complete");
  await expect(page.getByLabel("Bridge auction history")).toContainText("Pass");
  await expect(page.getByRole("button", { name: "Deal again" })).toBeEnabled();
  await page.getByRole("button", { name: "Deal again" }).click();
  await expect(page.getByRole("heading", { name: "Bridge auction" })).toBeVisible();
  await expect(page.getByLabel("Bridge bidding box")).toContainText(/Choose your call|Auction in progress|Auction complete/);
});

test("Bridge table does not duplicate the South dummy hand", async ({ page }) => {
  await gotoWithPracticeSeed(page, 21);
  await page.evaluate(() => {
    const card = (rank: string, suit: "C" | "D" | "H" | "S") => ({ id: `${rank}${suit}`, rank, suit, label: `${rank}${suit}` });
    const southHand = [
      card("4", "C"),
      card("7", "C"),
      card("10", "C"),
      card("Q", "C"),
      card("2", "D"),
      card("5", "D"),
      card("9", "D"),
      card("K", "D"),
      card("3", "H"),
      card("8", "H"),
      card("J", "H"),
      card("6", "S"),
      card("A", "S")
    ];
    const fullHand = {
      id: "bridge-south-dummy-regression",
      contract: "Bridge",
      hands: [
        [card("A", "C"), card("K", "C"), card("2", "C"), card("3", "C"), card("4", "D"), card("6", "D"), card("8", "D"), card("10", "D"), card("2", "H"), card("4", "H"), card("6", "H"), card("8", "S"), card("10", "S")],
        [card("5", "C"), card("6", "C"), card("8", "C"), card("9", "C"), card("J", "D"), card("Q", "D"), card("A", "D"), card("5", "H"), card("7", "H"), card("9", "H"), card("Q", "H"), card("2", "S"), card("3", "S")],
        southHand,
        [card("J", "C"), card("3", "D"), card("7", "D"), card("10", "H"), card("K", "H"), card("A", "H"), card("4", "S"), card("5", "S"), card("7", "S"), card("9", "S"), card("J", "S"), card("Q", "S"), card("K", "S")]
      ],
      currentPlayerIndex: 2,
      currentPlayer: "You",
      currentTrick: [],
      completedTricks: [
        {
          cards: [
            { seat: "Right", card: card("5", "C") },
            { seat: "You", card: card("4", "C") },
            { seat: "Left", card: card("J", "C") },
            { seat: "Tutor", card: card("A", "C") }
          ],
          winner: "Tutor",
          winnerIndex: 0,
          penalty: 0,
          outcome: "stayed_clear",
          tacticalTags: ["partner_trick"]
        }
      ],
      playerHand: southHand,
      legalCardIds: ["4C", "7C", "10C", "QC"],
      playerPenalty: 0,
      totalPenalty: 0,
      cardsRemaining: 52,
      trickNumber: 2,
      status: "in_progress",
      prompt: "Dummy is on lead. Choose from South's exposed hand and plan the 4 Clubs winners.",
      trumpSuit: "C",
      dummySeat: "You",
      dummyHand: southHand,
      dummyLegalCardIds: ["4C", "7C", "10C", "QC"],
      bridgeAuction: [
        { seat: "Tutor", call: "4C" },
        { seat: "Right", call: "Pass" },
        { seat: "You", call: "Pass" },
        { seat: "Left", call: "Pass" }
      ],
      bridgeContract: {
        level: 4,
        strain: "C",
        label: "4 Clubs",
        declarer: "Tutor",
        dummy: "You",
        target: 10,
        vulnerability: "None",
        declarerSide: "NS",
        dealer: "Tutor",
        openingLeader: "Right"
      },
      bridgeDealer: "Tutor",
      bridgeVulnerability: "None"
    };

    localStorage.setItem(
      "barbu.savedBridgeRun.v1",
      JSON.stringify({
        version: 1,
        view: "fullHand",
        scores: { ns: 0, ew: 0 },
        results: [],
        fullHand,
        auctionCalls: fullHand.bridgeAuction,
        selectedCall: "Pass",
        fullHandReviewTrickCount: 0,
        usingBrowserFullHand: true,
        savedAt: "2026-07-28T00:00:00.000Z"
      })
    );
  });

  await page.reload();
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Continue Bridge" }).click();

  await expect(page.getByRole("heading", { name: "Bridge hand" })).toBeVisible();
  await expect(page.getByLabel("Bridge hand table")).toContainText("Declarer");
  await expect(page.getByLabel("Bridge hand table")).toContainText("Dummy");
  await expect(page.getByLabel("Current trick")).toContainText("North");
  await expect(page.getByLabel("Current trick")).toContainText("South");
  await expect(page.locator(".bridge-seat-label")).toHaveText(["North Declarer"]);
  await expect(page.locator(".bridge-felt .cardholder-label > span")).toHaveText(["North", "West", "East", "South"]);
  await expect(page.locator(".bridge-felt .cardholder-label > small")).toHaveText(["Decl.", "Def.", "Def.", "Dummy"]);
  await expect(page.getByLabel("Current hand")).not.toContainText("Score");
  await expect(page.getByLabel("Bridge score")).toContainText("Score");
  await expect(page.getByLabel("North hand hidden")).toBeVisible();
  await expect(page.getByLabel("Dummy hand", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("South dummy hand")).toBeVisible();
  await expect(page.locator(".bridge-thumb-hand .hand-card")).toHaveCount(13);
  await expect(page.locator(".bridge-dummy-action-hand .hand-card")).toHaveCount(0);
});

test("Bridge exposed dummy row names the actual dummy seat", async ({ page }) => {
  await gotoWithPracticeSeed(page, 22);
  await page.evaluate(() => {
    const card = (rank: string, suit: "C" | "D" | "H" | "S") => ({ id: `${rank}${suit}`, rank, suit, label: `${rank}${suit}` });
    const eastDummyHand = [
      card("2", "C"),
      card("4", "C"),
      card("6", "C"),
      card("8", "C"),
      card("10", "C"),
      card("2", "D"),
      card("4", "D"),
      card("6", "D"),
      card("8", "D"),
      card("2", "H"),
      card("4", "H"),
      card("2", "S"),
      card("4", "S")
    ];
    const southHand = [
      card("3", "C"),
      card("5", "C"),
      card("7", "C"),
      card("9", "C"),
      card("J", "C"),
      card("3", "D"),
      card("5", "D"),
      card("7", "D"),
      card("9", "D"),
      card("3", "H"),
      card("5", "H"),
      card("3", "S"),
      card("5", "S")
    ];
    const fullHand = {
      id: "bridge-east-dummy-label-regression",
      contract: "Bridge",
      hands: [
        [card("A", "C"), card("K", "C"), card("Q", "C"), card("A", "D"), card("K", "D"), card("Q", "D"), card("A", "H"), card("K", "H"), card("Q", "H"), card("A", "S"), card("K", "S"), card("Q", "S"), card("J", "S")],
        eastDummyHand,
        southHand,
        [card("10", "D"), card("J", "D"), card("10", "H"), card("J", "H"), card("6", "H"), card("7", "H"), card("8", "H"), card("9", "H"), card("6", "S"), card("7", "S"), card("8", "S"), card("9", "S"), card("10", "S")]
      ],
      currentPlayerIndex: 2,
      currentPlayer: "You",
      currentTrick: [{ seat: "Left", card: card("10", "D") }],
      completedTricks: [],
      playerHand: southHand,
      legalCardIds: ["3D", "5D", "7D", "9D"],
      playerPenalty: 0,
      totalPenalty: 0,
      cardsRemaining: 51,
      trickNumber: 1,
      status: "in_progress",
      prompt: "Diamonds were led. You are defending 1 Diamonds; follow suit if you can.",
      trumpSuit: "D",
      dummySeat: "Right",
      dummyHand: eastDummyHand,
      dummyLegalCardIds: [],
      bridgeAuction: [
        { seat: "Left", call: "1D" },
        { seat: "Tutor", call: "Pass" },
        { seat: "Right", call: "Pass" },
        { seat: "You", call: "Pass" }
      ],
      bridgeContract: {
        level: 1,
        strain: "D",
        label: "1 Diamonds",
        declarer: "Left",
        dummy: "Right",
        target: 7,
        vulnerability: "None",
        declarerSide: "EW",
        dealer: "Left",
        openingLeader: "Tutor"
      },
      bridgeDealer: "Left",
      bridgeVulnerability: "None"
    };

    localStorage.setItem(
      "barbu.savedBridgeRun.v1",
      JSON.stringify({
        version: 1,
        view: "fullHand",
        scores: { ns: 0, ew: 0 },
        results: [],
        fullHand,
        auctionCalls: fullHand.bridgeAuction,
        selectedCall: "Pass",
        fullHandReviewTrickCount: 0,
        usingBrowserFullHand: true,
        savedAt: "2026-08-12T00:00:00.000Z"
      })
    );
  });

  await page.reload();
  await page.getByRole("button", { name: /Open Bridge/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Continue Bridge" }).click();

  await expect(page.getByRole("heading", { name: "Bridge hand" })).toBeVisible();
  await expect(page.locator(".bridge-seat-label").first()).toHaveText("East Dummy");
  await expect(page.getByLabel("Dummy hand", { exact: true })).toBeVisible();
  await expect(page.locator(".bridge-felt .cardholder-label > span")).toHaveText(["North", "West", "East", "South"]);
  await expect(page.locator(".bridge-felt .cardholder-label > small")).toHaveText(["Def.", "Decl.", "Dummy", "Def."]);
});

test("Spades practice starts three scripted decisions per topic", async ({ page }) => {
  await gotoWithPracticeSeed(page, 6);
  await page.getByRole("button", { name: /Open Spades/ }).click();
  await page.getByRole("tab", { name: "Practice" }).click();

  await page.getByLabel("Spades practice drills").getByRole("button", { name: "Trump or discard" }).click();
  await expect(page.getByRole("heading", { name: "Spades practice: trump or discard" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Spades");
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Cut with the low spade|Discard when partner is winning|Overtrump the opponent/);

  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Practice Spades again" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Spades practice" }).click();
  await expect(page.getByRole("heading", { name: "Spades table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Whist completed hand score fits the phone screen", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 8);
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
  await page.getByRole("button", { name: "Play Whist" }).click();

  await completeFullHand(page, "Next hand");

  await expect(page.getByRole("heading", { name: /Your partnership won|Opponents won the hand|Whist hand tied/ })).toBeVisible();
  const resultPanel = page.getByRole("region", { name: "Whist hand decision" });
  await expect(resultPanel.getByLabel("Whist hand score")).toContainText("Game");
  await expect(resultPanel.getByLabel("Whist partnership breakdown")).toContainText("You + Barbu");
  await expect(resultPanel.getByLabel("Whist partnership breakdown")).toContainText("Left + Right");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("whist-hand-result.png"), fullPage: true });
});

test("Whist odd score starts on the seventh partnership trick", () => {
  expect(whistOddProgress({ playerSide: 6, opponentSide: 6 })).toMatchObject({
    label: "To odd",
    value: "1 each",
    playerSideOddTricks: 0,
    opponentSideOddTricks: 0
  });

  expect(whistOddProgress({ playerSide: 7, opponentSide: 6 })).toMatchObject({
    label: "Odd score",
    value: "1 - 0",
    playerSideOddTricks: 1,
    opponentSideOddTricks: 0
  });

  expect(whistOddProgress({ playerSide: 5, opponentSide: 8 })).toMatchObject({
    label: "Odd score",
    value: "0 - 2",
    playerSideOddTricks: 0,
    opponentSideOddTricks: 2
  });
});

test("Hearts table reuses the shared avoid-hearts drill", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();

  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Play Hearts" })).toBeVisible();

  await page.getByRole("tab", { name: "Learn" }).click();
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
  await expect(page.getByLabel("Hearts practice drills")).toContainText("Queen of Spades danger");
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
  await expect(page.getByLabel("Drill decision")).toContainText("Hearts");
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(
    /Duck the heart point|Discard without adding points|Follow low in hearts/
  );

  await page.getByLabel("Drill decision").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts learn start advances through learning stages instead of play loop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Learn" }).click();

  await page.getByLabel("Hearts lesson path").getByRole("button", { name: /Object of Hearts/ }).click();
  await expect(page.getByRole("heading", { name: "Object of Hearts" })).toBeVisible();
  await expect(page.getByLabel("Hearts course content")).toContainText("trick-avoidance game");
  await expect(page.getByRole("heading", { name: "Pass cards" })).toHaveCount(0);

  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Hearts object example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Hearts");
  await expect(page.getByText("Decision 1 of 3")).toBeVisible();

  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Hearts starts with locating the penalty and the winner.")).toBeVisible();

  await page.getByRole("button", { name: "Finish Hearts" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hearts course progress")).toContainText("1 / 7 complete");

  await page.getByLabel("Hearts lesson path").getByRole("button", { name: /^2 Example Queen of Spades/ }).click();
  await expect(page.getByRole("heading", { name: "Queen of Spades" })).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Queen of Spades example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Queen of Spades");
  await expect(page.getByLabel("Drill decision")).not.toContainText("No Queens");
});

test("Spades learn path opens course content before scripted practice", async ({ page }) => {
  await gotoWithPracticeSeed(page, 8);
  await page.getByRole("button", { name: /Open Spades/ }).click();
  await page.getByRole("tab", { name: "Learn" }).click();

  await expect(page.getByLabel("Spades course progress")).toContainText("0 / 5 complete");
  await expect(page.getByLabel("Spades learn actions").getByRole("button", { name: /Lesson Win your books/ })).toBeVisible();

  await page.getByLabel("Spades lesson path").getByRole("button", { name: /Win your books/ }).click();
  await expect(page.getByRole("heading", { name: "Win your books" })).toBeVisible();
  await expect(page.getByLabel("Spades course content")).toContainText("partnership trick-taking");
  await expect(page.getByRole("heading", { name: "Spades hand" })).toHaveCount(0);

  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Spades object example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
  await expect(page.getByRole("heading", { name: "Spades practice: follow suit" })).toBeVisible();
  await expect(page.getByLabel("Drill decision")).toContainText("Spades");
  await expect(page.getByText("Decision 1 of 3")).toBeVisible();

  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("The bid gives every Spades hand its plan.")).toBeVisible();
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
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Recommended: Q♠, K♥, A♥");
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
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Recommended: Q♠, K♥, A♥");
  await expect(page.getByRole("button", { name: "Next pass" })).toBeVisible();
});

test("Hearts pass lesson completes and advances to rule lesson", async ({ page }) => {
  await gotoWithPracticeSeed(page, 12);
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByLabel("Hearts lesson path").getByRole("button", { name: /Pass three/ }).click();

  await expect(page.getByRole("heading", { name: "Pass three" })).toBeVisible();
  await page.getByRole("button", { name: "See example" }).click();
  await expect(page.getByLabel("Pass three example table")).toBeVisible();
  await page.getByRole("button", { name: "Practice decision" }).click();
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
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Passing shapes the hand before the first trick.")).toBeVisible();
  await page.getByRole("button", { name: "Finish Hearts" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hearts course progress")).toContainText("1 / 7 complete");
});

test("Hearts micro drills teach broken hearts moon defense and score reading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "First trick" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText(/first trick/i);
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await completeHeartsFirstTrickDecision(page);
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Break hearts" }).click();
  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Can you lead a heart\?|Only hearts remain|Hearts are open/);
  await completeQuickDrillDecision(page);
  await expect(page.getByLabel("Drill decision")).toContainText(/Good|Risky|Illegal/);
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Stop the moon" }).click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(
    /Break the moon threat|Take Queen of Spades away|Take one point now/
  );
  // Click the highest club to take the trick
  await page.locator(".drill-hand .hand-card.legal").last().tap();
  await checkDrillAnswer(page);
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText("moon defense");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Queen of Spades danger" }).click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText("Queen of Spades");
  await expect(page.getByLabel("Drill decision")).not.toContainText("No Queens");
  await expect(page.locator(".card-table .cardholder.active.occupied")).toHaveCount(2);
  const qsBtn = page.getByRole("button", { name: "Q S" });
  if (await qsBtn.count() > 0) {
    const promptText = await page.getByLabel("Drill decision").textContent();
    if (promptText && /chance to move|Dump Queen of Spades safely|Barbu is already winning/.test(promptText)) {
      await qsBtn.click();
      await checkDrillAnswer(page);
    } else {
      await completeQuickDrillDecision(page);
    }
  } else {
    await completeQuickDrillDecision(page);
  }
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText("Queen of Spades");
  await page.getByRole("button", { name: "Table" }).first().click();

  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Score a hand" }).click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3 played");
  await expect(page.getByLabel("Drill decision")).toContainText(/Find the 13-point card|Find the one-point card|Find the clean card/);
  const scoreHandText = await page.getByLabel("Drill decision").textContent();
  if (scoreHandText?.includes("13-point card")) {
    await page.getByRole("button", { name: "Q S" }).click();
  } else if (scoreHandText?.includes("one-point card")) {
    await page.getByRole("button", { name: "7 H" }).click();
  } else {
    await page.getByRole("button", { name: "5 D" }).click();
  }
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Good");
  await expect(page.getByLabel("Drill decision")).toContainText(/13-point danger card|7♥ is good|clean card/);
});

test("Hearts practice result returns to the Hearts table", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByLabel("Hearts practice drills").getByRole("button", { name: "Avoid hearts" }).click();

  await completeVisibleDrillSession(page);

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Hearts practice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue path" })).toHaveCount(0);

  await page.getByRole("button", { name: "Back to Hearts practice" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts reference explains the Black Lady rule boundary", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();

  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByLabel("Hearts learn actions").getByRole("button", { name: "Rules Reference" }).click();

  await expect(page.getByRole("heading", { name: "Hearts reference" })).toBeVisible();
  await expect(page.getByLabel("Hearts overview")).toContainText("Black Lady");
  await expect(page.getByLabel("Hearts overview")).toContainText(/queen of spades/i);
  await expect(page.getByLabel("Contract reference")).toContainText("Hearts rules");
  await expect(page.getByLabel("Contract reference")).toContainText("queen of spades is 13");
  await expect(page.getByLabel("Contract reference")).toContainText("shooting the moon");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Rotating pass");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Core");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Playable");
  await expect(page.getByLabel("Variants and varieties")).toContainText("House-Rule Boundary");
  await page.screenshot({ path: testInfo.outputPath("hearts-reference.png"), fullPage: true });

  await page.getByRole("button", { name: "Back to Hearts table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
});

test("Whist reference reflects the classic partnership table", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Open Whist/ }).click();

  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByLabel("Whist learn actions").getByRole("button", { name: "Rules Reference" }).click();

  await expect(page.getByRole("heading", { name: "Whist reference" })).toBeVisible();
  await expect(page.getByLabel("Whist overview")).toContainText("classic four-player partnership trick-taking game");
  await expect(page.getByLabel("Whist reference sections")).toContainText("Learning Path");
  await expect(page.getByLabel("Whist reference sections")).toContainText("Playable local match with resume");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Learning path");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Playable hand");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Table habits");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Playable");
  await page.screenshot({ path: testInfo.outputPath("whist-reference.png"), fullPage: true });

  await page.getByRole("button", { name: "Back to Whist table" }).click();
  await expect(page.getByRole("heading", { name: "Whist table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
});

test("Spades reference reflects the finished partnership table", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Open Spades/ }).click();

  await page.getByRole("tab", { name: "Learn" }).click();
  await page.getByLabel("Spades learn actions").getByRole("button", { name: "Rules Reference" }).click();

  await expect(page.getByRole("heading", { name: "Spades reference" })).toBeVisible();
  await expect(page.getByLabel("Spades overview")).toContainText("nil and bags");
  await expect(page.getByLabel("Spades reference sections")).toContainText("Deal And Bid");
  await expect(page.getByLabel("Spades reference sections")).toContainText("Bidding Heuristic");
  await expect(page.getByLabel("Spades reference sections")).toContainText("App Learning Path");
  await expect(page.getByLabel("Contract reference")).toContainText("nil scores +100 or -100");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Learning path");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Local match resume");
  await expect(page.getByLabel("Contract roadmap")).toContainText("Playable");
  await expect(page.getByLabel("Variants and varieties")).toContainText("Blind nil");
  await page.screenshot({ path: testInfo.outputPath("spades-reference.png"), fullPage: true });

  await page.getByRole("button", { name: "Back to Spades table" }).click();
  await expect(page.getByRole("heading", { name: "Spades table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts play starts with a rotating pass phase before the hand", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();

  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  const playPanel = page.getByRole("tabpanel", { name: "Play" });
  await expect(playPanel).toContainText("Queen of Spades at 13");
  await expect(playPanel).toContainText("shoot-the-moon scoring");
  await page.getByRole("button", { name: "Play Hearts" }).click();

  await expect(page.getByRole("heading", { name: "Pass cards" })).toBeVisible();
  await expect(page.getByLabel("Hearts pass summary")).toContainText("You pass");
  await expect(page.getByLabel("Hearts pass summary")).toContainText("Left");
  await expect(page.getByLabel("Hearts pass cards")).toContainText("Choose exactly three cards");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".hearts-pass-cards");
  await expectFeedbackAboveHand(page, ".hearts-pass-cards");
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
  await expectTableSlotsSeparated(page);
  await expectTableCardholdersDoNotOverlap(page);
  await expectTableCardLabelsBelowCards(page);
  await expect(page.getByLabel("Your Hearts hand")).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await expectHandCardsDoNotOverlap(page, ".full-hand-cards");
  await expect(page.locator(".full-hand-card").first()).toHaveCSS("touch-action", "manipulation");
  await page.screenshot({ path: testInfo.outputPath("hearts-hand.png"), fullPage: true });

  await page.getByLabel("Hearts full hand").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Hearts table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
});

test("Hearts compact play avoids card table collisions on short screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "galaxy-s9", "Viewport matrix for older phone and narrow browser sizes.");

  for (const viewport of compactLayoutViewports) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem("barbu.practiceSeed.v1", "2");
      });
      await page.reload();
      await page.getByRole("button", { name: "Open Hearts" }).click();
      await page.getByRole("button", { name: "Play Hearts" }).click();
      await passThreeHeartsCards(page);

      await expect(page.locator(".card-table .cardholder").first()).toBeVisible();
      await expectTableSlotsSeparated(page);
      await expectTableCardholdersDoNotOverlap(page);
      await expectElementsDoNotOverlap(page, ".card-table", ".full-hand-cards");
      await expectCompactPlayStack(page, ".full-hand-cards");
      await expectHandCardsDoNotOverlap(page, ".full-hand-cards");
      await expect
        .poll(async () =>
          page.locator(".card-table.compass-table").evaluate((table) =>
            getComputedStyle(table).getPropertyValue("--table-card-face-width").includes("clamp(")
          )
        )
        .toBe(true);

      const legalCard = page.locator(".full-hand-cards .full-hand-card.legal").first();
      if ((await legalCard.count()) > 0) {
        await legalCard.click();
        const playAction = page.getByRole("button", { name: /Play card|Continue/ }).first();
        if ((await playAction.count()) > 0) {
          await playAction.click();
        }
        if ((await page.locator(".card-table .table-card").count()) > 0) {
          await expectTableCardLabelsBelowCards(page);
        }
      }

      await page.screenshot({ path: testInfo.outputPath(`hearts-compact-${viewport.name}.png`), fullPage: true });
    });
  }
});

test("Hearts play can resume a saved local hand", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts" }).click();
  await page.getByRole("button", { name: "Play Hearts" }).click();

  await expect(page.getByRole("heading", { name: "Pass cards" })).toBeVisible();
  await page.getByLabel("Your Hearts passing hand").locator("button").nth(0).click();
  await expect(page.getByLabel("Hearts pass summary")).toContainText("1 / 3");
  await page.getByLabel("Hearts pass cards").getByRole("button", { name: "Table" }).click();

  await expect(page.getByRole("heading", { name: "Hearts table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Continue Hearts" })).toBeVisible();
  await expect(page.getByText("Hand 1, pass left, 1 of 3 selected")).toBeVisible();

  await page.getByRole("button", { name: "Continue Hearts" }).click();
  await expect(page.getByRole("heading", { name: "Pass cards" })).toBeVisible();
  await expect(page.getByLabel("Hearts pass summary")).toContainText("1 / 3");
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
  await expect(page.getByLabel("Hearts final scorecard")).toContainText("Target 100");
  await expect(page.getByLabel("Hearts final scorecard")).toContainText("Hand 1");
  await expect(page.getByLabel("This hand breakdown")).toContainText("Tricks");
  await expect(page.getByLabel("This hand breakdown")).toContainText("Points");
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("hearts-scoreboard.png"), fullPage: true });
  await page.getByRole("button", { name: "Next hand" }).click();

  await expect(page.getByRole("heading", { name: "Pass cards" })).toBeVisible();
  await expect(page.getByLabel("Hearts pass summary")).toContainText("Right");
  await passThreeHeartsCards(page);
  await expect(page.getByRole("heading", { name: "Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts table score")).toContainText(/[1-9]\d*/);
});

test("Card Counting I starts card-counting minigames", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Card Counting I" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Count trumps" }).click();

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
    await expect(page.getByRole("button", { name: isFinal ? "Review round" : "Continue" })).toBeVisible();
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
  await page.getByRole("button", { name: "Review round" }).click();
  await expect(page.getByLabel("Count trumps intermission")).toContainText(/Warm-up complete|Clean warm-up/);
  await expect(page.getByLabel("Count trumps trainer").getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByLabel("Count trumps trainer").getByRole("button", { name: "Next hand" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  await page.getByLabel("Count trumps", { exact: true }).getByRole("button", { name: "Table" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Heart memory hand" }).click();
  await expect(page.getByLabel("Hearts hand table")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heart memory hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts hand decision")).toContainText(/Lead|Follow|void|Choose/);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");
  await page.screenshot({ path: testInfo.outputPath("perfect-count-trumps-realistic-play.png"), fullPage: true });

  const answerRealisticTrumpCheck = async () => {
    await expect(page.getByLabel("Hearts hand decision")).toContainText(/How many hearts|Did this heart/);
    const realisticCountAnswers = page.getByLabel("Heart count answer options").getByRole("button");
    if ((await realisticCountAnswers.count()) > 0) {
      await realisticCountAnswers.first().click();
    } else {
      await expect(page.getByLabel(/Target heart card/)).toBeVisible();
      await expectNoVerticalCollision(page, ".trump-specific-check", ".table-play-surface .action-row", 24);
      await page.getByLabel("Heart card answer options").getByRole("button").first().click();
    }
    await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
    await page.getByRole("button", { name: "Check memory" }).click();
    await expect(page.getByLabel("Hearts hand decision")).toContainText(/hearts have been played|was played|was not played|Correct/);
  };

  let memoryChecks = 0;
  for (let trick = 1; trick <= 13; trick += 1) {
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    const isCheckpoint = [3, 7, 11].includes(trick);

    if (isCheckpoint) {
      await answerRealisticTrumpCheck();
      memoryChecks += 1;
      if (trick === 3) {
        await page.screenshot({ path: testInfo.outputPath("perfect-count-trumps-realistic.png"), fullPage: true });
      }
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    } else if (trick < 13) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }

  expect(memoryChecks).toBe(3);
  if ((await page.getByRole("button", { name: "Finish hand" }).count()) > 0) {
    await page.getByRole("button", { name: "Finish hand" }).click();
  }
  await expect(page.getByLabel("Heart memory hand intermission")).toContainText(/Heart memory hand complete|Sharp heart memory/);
  await expect(page.getByLabel("Heart memory hand intermission")).toContainText("Hearts score");
  await expect(page.getByLabel("Heart memory hand intermission")).toContainText(/\d+ points|1 point/);
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next hand" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  await page.getByLabel("Hearts full hand").getByRole("button", { name: "Table" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Three amigos memory" }).click();

  await expect(page.getByRole("heading", { name: "Three amigos memory" })).toBeVisible();
  await expect(page.getByLabel("Whist full hand")).toBeVisible();
  await expect(page.getByLabel("Whist hand table")).toBeVisible();
  await expect(page.getByLabel("Whist hand score")).toContainText("Your side");
  await expect(page.getByLabel("Whist hand decision")).toContainText(/Lead|Follow|void|Choose/);
  await expect(page.getByRole("button", { name: "Play card" })).toBeDisabled();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");

  for (let trick = 1; trick <= 3; trick += 1) {
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    if (trick < 3) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }

  await expect(page.getByLabel("Whist hand decision")).toContainText(/How many high cards|Did this high card/);
  const highCardCountAnswers = page.getByLabel("High card count answers").getByRole("button");
  if ((await highCardCountAnswers.count()) > 0) {
    await highCardCountAnswers.first().click();
  } else {
    await expect(page.getByLabel(/Target high card/)).toBeVisible();
    await page.getByLabel("High card answer options").getByRole("button").first().click();
  }
  await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
  await page.getByRole("button", { name: "Check memory" }).click();

  await expect(page.getByLabel("Whist hand decision")).toContainText(/high cards have been played|was played|was not played|Correct/);
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await expectNoVerticalCollision(
    page,
    ".table-play-panel .trump-count-options, .table-play-panel .trump-specific-check, .table-play-panel .trump-count-review",
    ".table-play-surface .action-row",
    16
  );
  await page.screenshot({ path: testInfo.outputPath("perfect-high-card-memory.png"), fullPage: true });

  await page.getByLabel("Whist full hand").getByRole("button", { name: "Table" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Danger cards" }).click();

  await expect(page.getByRole("heading", { name: "Danger cards" })).toBeVisible();
  await expect(page.getByLabel("No Queens full hand")).toBeVisible();
  await expect(page.getByLabel("No Queens hand table")).toBeVisible();
  await expect(page.getByLabel("No Queens hand score")).toContainText("Your penalty");
  await expect(page.getByLabel("No Queens hand decision")).toContainText(/Lead|Follow|void|Choose/);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");

  for (let trick = 1; trick <= 3; trick += 1) {
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    if (trick < 3) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }

  await expect(page.getByLabel("No Queens hand decision")).toContainText(/How many queens|Has this queen/);
  const dangerCountAnswers = page.getByLabel("Danger card count answers").getByRole("button");
  if ((await dangerCountAnswers.count()) > 0) {
    await dangerCountAnswers.first().click();
  } else {
    await expect(page.getByLabel(/Target queen/)).toBeVisible();
    await page.getByLabel("Danger card specific answers").getByRole("button").first().click();
  }
  await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
  await page.getByRole("button", { name: "Check memory" }).click();

  await expect(page.getByLabel("No Queens hand decision")).toContainText(/Correct|queens have been played|was played|was not played/);
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("perfect-danger-cards.png"), fullPage: true });

  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  for (let trick = 4; trick <= 13; trick += 1) {
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await expect(page.getByRole("button", { name: "Play card" })).toBeEnabled();
    await page.getByRole("button", { name: "Play card" }).click();
    const isCheckpoint = [7, 11].includes(trick);

    if (isCheckpoint) {
      const checkpointDangerAnswers = page.getByLabel("Danger card count answers").getByRole("button");
      if ((await checkpointDangerAnswers.count()) > 0) {
        await checkpointDangerAnswers.first().click();
      } else {
        await expect(page.getByLabel(/Target queen/)).toBeVisible();
        await page.getByLabel("Danger card specific answers").getByRole("button").first().click();
      }
      await page.getByRole("button", { name: "Check memory" }).click();
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    } else if (trick < 13) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }

  await expect(page.getByLabel("Danger cards intermission")).toContainText(/Clean queen memory|Danger cards hand complete/);
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next hand" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  await page.getByLabel("No Queens full hand").getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("heading", { name: "Card Counting I" })).toBeVisible();
});

test("Heart memory hand starts from Card Counting I as a realistic table game", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("barbu.practiceSeed.v1", "1");
  });
  await page.reload();

  await page.getByRole("button", { name: "Open Card Counting I" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Heart memory hand" }).click();

  await expect(page.getByRole("heading", { name: "Heart memory hand" })).toBeVisible();
  await expect(page.getByLabel("Hearts hand table")).toBeVisible();
  await expect(page.getByLabel("Hearts hand decision")).toContainText(/Lead|Follow|void|Choose/);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");
  await expectFeedbackAboveHand(page, ".full-hand-cards");

  await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card" }).click();

  await expect(page.getByLabel("Hearts hand table").locator(".table-card")).toHaveCount(4);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
});

test("Whist memory hand separates trick review from memory questions", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("barbu.practiceSeed.v1", "3");
  });
  await page.reload();

  await page.getByRole("button", { name: "Open Card Counting I" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Whist memory hand" }).click();

  await expect(page.getByRole("heading", { name: "Whist memory hand" })).toBeVisible();
  await expect(page.getByLabel("Whist full hand")).toContainText("Trump");
  await expect(page.getByLabel("Whist hand decision")).toContainText(/Lead|Follow|void|Choose/);
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".full-hand-cards");

  await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card" }).click();
  await expect(page.getByLabel("Whist hand decision")).toContainText(/Check whether|won the trick|held the trick|won with trump/);
  await expect(page.getByLabel("Whist hand decision")).not.toContainText(/Has the .* been played|How many .* have been played|Who is officially out/);
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  for (let trick = 2; trick <= 3; trick += 1) {
    await page.getByRole("button", { name: "Next trick", exact: true }).click();
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await page.getByRole("button", { name: "Play card" }).click();
  }

  await expect(page.getByLabel("Whist hand decision")).toContainText(/How many|Did this|Is this|Who is officially out/);
  const answerGroups = [
    page.getByLabel("Whist count answer options").getByRole("button"),
    page.getByLabel("Void spotter options").getByRole("button"),
    page.getByLabel("Whist card answer options").getByRole("button")
  ];
  const visibleAnswerCounts = await Promise.all(answerGroups.map((group) => group.count()));
  expect(visibleAnswerCounts.some((count) => count > 0)).toBe(true);

  const visibleGroupIndex = visibleAnswerCounts.findIndex((count) => count > 0);
  await answerGroups[visibleGroupIndex].first().click();
  await expect(page.getByRole("button", { name: "Check memory" })).toBeEnabled();
  await expectNoVerticalCollision(page, ".table-play-panel .trump-count-options, .table-play-panel .trump-specific-check", ".table-play-surface .action-row", 16);
  await page.screenshot({ path: testInfo.outputPath("perfect-whist-memory-question.png"), fullPage: true });
});

test("Whist memory card review stays inside the fixed phone screen", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 1);

  await page.getByRole("button", { name: "Open Card Counting I" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Whist memory hand" }).click();

  let foundCardQuestion = false;

  for (let trick = 1; trick <= 10; trick += 1) {
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await page.getByRole("button", { name: "Play card" }).click();

    if (![3, 7, 10].includes(trick)) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
      continue;
    }

    await expect(page.getByLabel("Whist hand decision")).toContainText(/How many|Did this|Is this|Who is officially out/);
    const whistCardAnswers = page.getByLabel("Whist card answer options").getByRole("button");

    if ((await whistCardAnswers.count()) > 0) {
      await page.getByLabel("Whist card answer options").getByRole("button", { name: "No" }).click();
      await page.getByRole("button", { name: "Check memory" }).click();
      await expect(page.getByLabel("Whist hand decision")).toContainText(/Correct|was played|was not played|boss card/);
      const reviewedCards = page.locator(".table-play-panel .trump-review-cards .card-face");
      const reviewedCardCount = await reviewedCards.count();

      if (reviewedCardCount === 0) {
        await page.getByRole("button", { name: "Next trick", exact: true }).click();
        continue;
      }

      foundCardQuestion = true;
      await expect(page.getByLabel("Whist hand score")).not.toContainText("Match to");
      await expectNoVerticalCollision(
        page,
        ".table-play-panel .trump-specific-check, .table-play-panel .outcome, .table-play-panel .trump-review-cards",
        ".table-play-surface .action-row",
        16
      );
      await expectNoPageScroll(page);
      await expectGameplayActionRowPinned(page);
      await page.screenshot({ path: testInfo.outputPath(`perfect-whist-memory-no-answer-${trick}.png`), fullPage: true });
      break;
    }

    const countAnswers = page.getByLabel("Whist count answer options").getByRole("button");
    if ((await countAnswers.count()) > 0) {
      await countAnswers.first().click();
    } else {
      await page.getByLabel("Void spotter options").getByRole("button").first().click();
    }

    await page.getByRole("button", { name: "Check memory" }).click();
    await page.getByRole("button", { name: "Next trick", exact: true }).click();
  }

  expect(foundCardQuestion).toBe(true);
});

test("Whist memory finish screen keeps the next hand action reachable", async ({ page }, testInfo) => {
  await gotoWithPracticeSeed(page, 1);

  await page.getByRole("button", { name: "Open Card Counting I" }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: "Whist memory hand" }).click();

  for (let trick = 1; trick <= 13; trick += 1) {
    await page.locator(".full-hand-cards .full-hand-card.legal").first().click();
    await page.getByRole("button", { name: "Play card" }).click();

    if ((await page.getByRole("button", { name: "Check memory" }).count()) > 0) {
      const countAnswers = page.getByLabel("Whist count answer options").getByRole("button");
      const cardAnswers = page.getByLabel("Whist card answer options").getByRole("button");
      const voidAnswers = page.getByLabel("Void spotter options").getByRole("button");

      if ((await countAnswers.count()) > 0) {
        await countAnswers.first().click();
      } else if ((await cardAnswers.count()) > 0) {
        await cardAnswers.first().click();
      } else {
        await voidAnswers.first().click();
      }

      await page.getByRole("button", { name: "Check memory" }).click();
    }

    if (trick < 13) {
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }

  if ((await page.getByRole("button", { name: "Finish hand" }).count()) > 0) {
    await page.getByRole("button", { name: "Finish hand" }).click();
  }

  await expect(page.getByLabel("Whist memory hand intermission")).toContainText(/Whist memory hand complete|Sharp Whist memory/);
  await expect(page.getByLabel("Whist full hand").getByRole("button", { name: "Table" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next hand" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await page.screenshot({ path: testInfo.outputPath("perfect-whist-memory-finish.png"), fullPage: true });
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
  await expectFeedbackAboveHand(page, ".drill-hand");

  const firstLegalCard = page.locator(".drill-hand .hand-card.legal").first();
  await firstLegalCard.tap();
  await expect(firstLegalCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".drill-hand .hand-card.selected")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Check answer" })).toBeEnabled();
  await expectGameplayActionRowPinned(page);

  await page.screenshot({ path: testInfo.outputPath("quick-drill-fixed-screen.png"), fullPage: true });
});

test("practice tab starts a fixed contract drill pool", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Practice");
  await page.getByLabel("Fixed contract drills").getByRole("button", { name: /^No Last Two\b/ }).click();

  await expect(page.getByRole("heading", { name: "Quick drill" })).toBeVisible();
  await expect(page.locator("header").getByText("No Last Two", { exact: true })).toBeVisible();

  for (let decision = 1; decision <= 4; decision += 1) {
    await expect(page.getByText(`Decision ${decision} of 4`)).toBeVisible();
    await completeQuickDrillDecision(page);

    if (decision < 4) {
      await continueDrillFromCheckedAnswer(page, "Next decision");
    } else {
      await expect(page.getByRole("button", { name: "Review session" })).toBeVisible();
    }
  }
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
  await page.getByRole("tab", { name: "Learn" }).click();
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
  await expect(page.getByText("Left wins with A♣ and takes 2 heart penalty points from Right's 4♥.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next trick" })).toBeVisible();
});

test("No Hearts example shows clockwise order after Barbu leads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Learn");
  await page.getByRole("button", { name: /^1 Concept Meet the contract/ }).click();
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
  await openBarbuTab(page, "Learn");
  await page.getByLabel("Barbu table actions").getByRole("button", { name: "Reference" }).click();

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
  await expect(page.getByRole("button", { name: "Back to Barbu practice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue path" })).toHaveCount(0);

  await page.screenshot({ path: testInfo.outputPath("play-barbu-result.png"), fullPage: true });

  await page.getByRole("button", { name: "Back to Barbu practice" }).click();
  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Quick drill" }).click();
  await completeVisibleDrillSession(page);
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();

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
  await expectFeedbackAboveHand(page, ".drill-hand");

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
  await expectCompactPlayStack(page, ".full-hand-cards");
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
  await expectTableSlotsSeparated(page);
  await expectNoVerticalCollision(page, ".card-table", ".table-play-panel", 6);
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
    if (contract === "Domino") {
      await expect(page.getByLabel("Play Barbu contract sequence").locator(".layout")).toHaveCSS("border-style", "solid");
    }
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

const barbuTrickContractSmokeCases = [
  "No Hearts",
  "No Queens",
  "King of Hearts",
  "No Last Two",
  "No Tricks",
  "Hearts Trumps"
] as const;

for (const contract of barbuTrickContractSmokeCases) {
  test(`${contract} full-hand contract smoke`, async ({ page }, testInfo) => {
    await startSavedPlayBarbuContractHand(page, contract);

    await expect(page.getByRole("heading", { name: `${contract} hand` })).toBeVisible();
    await expect(page.getByLabel(`${contract} hand score`)).toBeVisible();
    await expect(page.getByLabel(`${contract} hand table`)).toBeVisible();
    await expect(page.getByLabel(`${contract} hand decision`)).toBeVisible();
    await expect(page.getByLabel(`Your ${contract} hand`)).toBeVisible();
    await expect(page.locator(".full-hand-card.legal").first()).toBeVisible();
    await expectNoPageScroll(page);
    await expectGameplayActionRowPinned(page);
    await expectHandNearActionRow(page, ".full-hand-cards");
    await expectFeedbackAboveHand(page, ".full-hand-cards");

    const activeTable = await page.getByLabel(`${contract} hand table`).boundingBox();
    expect(activeTable).not.toBeNull();

    for (let decision = 0; decision < 13; decision += 1) {
      await playFullHandDecision(page);
    }

    await expect(page.getByLabel(`${contract} result summary`)).toBeVisible();
    await expect(page.getByLabel(`${contract} key tricks`)).toBeVisible();
    const resultTable = await page.getByLabel(`${contract} hand table`).boundingBox();
    expect(resultTable).not.toBeNull();
    await expectTableSlotsSeparated(page);
    await expectNoVerticalCollision(page, ".card-table", ".table-play-panel", 6);
    await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next contract" })).toBeVisible();
    await expectNoPageScroll(page);
    await expectGameplayActionRowPinned(page);

    await page.screenshot({ path: testInfo.outputPath(`${contract.toLowerCase().replaceAll(" ", "-")}-hand.png`), fullPage: true });
  });
}

test("Domino full-hand contract smoke", async ({ page }, testInfo) => {
  await startSavedPlayBarbuContractHand(page, "Domino");

  await expect(page.getByRole("heading", { name: "Domino hand" })).toBeVisible();
  await expect(page.getByLabel("Domino hand score")).toContainText("Cards left");
  await expect(page.getByLabel("Domino hand score")).toContainText("Next out");
  await expect(page.getByLabel("Domino hand score")).toContainText("Order");
  await expect(page.getByLabel("Domino hand decision")).toContainText(/Play a 7|extend a suit|blocked/);
  await expect(page.getByLabel("Domino layout")).toBeVisible();
  await expect(page.getByLabel("Your Domino hand")).toBeVisible();
  await expect(page.locator(".domino-cards .full-hand-card.legal").first()).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);
  await expectHandNearActionRow(page, ".domino-cards");

  const dominoRegion = page.getByRole("region", { name: "Domino hand", exact: true });
  const stateBeforeDoubleTap = await dominoRegion.innerText();
  const firstLegalDominoCard = page.locator(".domino-cards .full-hand-card.legal").first();
  await firstLegalDominoCard.tap();
  await expect(page.locator(".domino-cards .full-hand-card.selected")).toHaveCount(1);
  await expectFeedbackAboveHand(page, ".domino-cards");
  await page.screenshot({ path: testInfo.outputPath("domino-hand-selected.png"), fullPage: true });
  await firstLegalDominoCard.tap();
  await expect.poll(async () => (await dominoRegion.innerText()) !== stateBeforeDoubleTap).toBe(true);

  await playDominoHand(page);

  await expect(page.getByRole("heading", { name: /You went out first|You finished|Domino complete/ })).toBeVisible();
  await expect(page.getByLabel("Domino result summary")).toContainText("You");
  await expect(page.getByLabel("Domino result details")).toBeVisible();
  await expect(page.getByLabel("Domino layout")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next contract" })).toBeVisible();
  await expectNoPageScroll(page);
  await expectGameplayActionRowPinned(page);

  await page.screenshot({ path: testInfo.outputPath("domino-hand.png"), fullPage: true });
});

test("finishing a lesson advances course progress", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Learn");
  await page.getByRole("button", { name: /^1 Concept Meet the contract/ }).click();

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
  await expect(page.getByRole("button", { name: /^2 Example Spot the danger/ })).toContainText("Next");
  await expect(page.getByRole("button", { name: /Meet the contract/ })).toContainText("Complete");
});

test("No Queens course has concept example play and review", async ({ page }) => {
  await gotoWithCourseProgress(page, { "meet-contract": true });

  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Learn");
  await page.getByRole("button", { name: /^2 Example Spot the danger/ }).click();

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
  await expect(page.getByRole("button", { name: /^3 Guided trick Play the trick/ })).toContainText("Next");
  await expect(page.getByRole("button", { name: /Spot the danger/ })).toContainText("Complete");
});

test("King of Hearts course has concept example play and review", async ({ page }, testInfo) => {
  await gotoWithCourseProgress(page, {
    "meet-contract": true,
    "spot-danger": true
  });

  await page.getByRole("button", { name: /Barbu/ }).click();
  await openBarbuTab(page, "Learn");
  await page.getByRole("button", { name: /^3 Guided trick Play the trick/ }).click();

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
  await expect(page.getByRole("button", { name: /^4 Contract Avoid the final tricks/ })).toContainText("Next");
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
  await openBarbuTab(page, "Learn");
  await page.getByRole("button", { name: /^8 Practice Practice table/ }).click();

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
  await openBarbuTab(page, "Learn");

  await expect(page.getByText("9 / 9 complete")).toBeVisible();
  await expect(page.getByRole("button", { name: /^9 Review Review the hand/ })).toContainText("Complete");
  await expect(page.getByRole("button", { name: /^1 Concept Meet the contract/ })).toContainText("Complete");

  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("button", { name: /Open Barbu/ }).click();
  await openBarbuTab(page, "Learn");
  await page.getByRole("button", { name: /^9 Review Review the hand/ }).click();
  await page.getByRole("button", { name: "Finish review" }).click();
  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Learn" })).toHaveAttribute("aria-selected", "true");
});
