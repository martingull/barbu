import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function expectNoPageScroll(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) <= window.innerHeight + 1)
    )
    .toBe(true);
}

test("catalog opens Barbu's table", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Choose a table" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Core games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Varieties of play" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Barbu/ })).toBeVisible();
  await expect(page.getByText("Barbu Learning Table")).toBeVisible();
  await expect(page.getByText("Variety of Barbu").first()).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });

  await page.getByRole("button", { name: /Barbu/ }).click();

  await expect(page.getByRole("heading", { name: "Barbu's table" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Meet the contract/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^1 Concept Meet the contract/ })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-table.png"), fullPage: true });
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
  await expect(page.getByLabel("Contract reference").getByText("No Hearts")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Documented variations" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("barbu-reference.png"), fullPage: true });
});

test("Play Barbu gives three mixed-contract decisions and a result", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "Play Barbu" }).click();

  await expect(page.getByRole("heading", { name: "Play Barbu" })).toBeVisible();
  await expect(page.getByText("No Hearts").first()).toBeVisible();
  await expect(page.getByText("Decision 1 of 3")).toBeVisible();

  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Good")).toBeVisible();
  await page.getByRole("button", { name: "Next table" }).click();

  await expect(page.getByText("No Queens").first()).toBeVisible();
  await expect(page.getByText("Decision 2 of 3")).toBeVisible();
  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Good")).toBeVisible();
  await page.getByRole("button", { name: "Next table" }).click();

  await expect(page.getByText("King of Hearts").first()).toBeVisible();
  await expect(page.getByText("Decision 3 of 3")).toBeVisible();
  await page.locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Good")).toBeVisible();
  await page.getByRole("button", { name: "Finish game" }).click();

  await expect(page.getByRole("heading", { name: "Game complete" })).toBeVisible();
  await expect(page.getByText("3 / 3 clean decisions")).toBeVisible();
  const storedAttempt = await page.evaluate(() => {
    const history = JSON.parse(localStorage.getItem("barbu.playHistory.v1") ?? "[]");
    return history[0];
  });
  const storedReasons = storedAttempt.results.map((result: { reason: string }) => result.reason);
  expect(storedReasons).toHaveLength(3);
  expect(storedReasons.every((reason: string) => ["avoided_penalty", "void_discard"].includes(reason))).toBe(true);
  await expect(page.getByLabel("Contract results").getByText("No Hearts")).toBeVisible();
  await expect(page.getByLabel("Contract results").getByText("No Queens")).toBeVisible();
  await expect(page.getByLabel("Contract results").getByText("King of Hearts")).toBeVisible();
  await expect(page.getByLabel("Recent Play Barbu attempts")).toContainText("3 / 3 clean");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay No Hearts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue path" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("play-barbu-result.png"), fullPage: true });

  await page.getByRole("button", { name: "Replay No Hearts" }).click();
  await expect(page.getByRole("heading", { name: "Play Barbu" })).toBeVisible();
  await expect(page.getByText("Decision 1 of 1")).toBeVisible();
  await expect(page.getByText("No Hearts").first()).toBeVisible();
});

test("No Hearts hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "No Hearts hand" }).click();

  await expect(page.getByRole("heading", { name: "No Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("No Hearts hand score")).toContainText("Your score");
  await expect(page.getByLabel("No Hearts hand table")).toBeVisible();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await page.locator(".full-hand-card.legal").first().dblclick();

    if (decision === 0) {
      await expect(page.locator(".full-hand-panel p.outcome").filter({ hasText: /(won the trick|won a clean trick)/ })).toBeVisible();
    }
  }

  await expect(page.getByRole("heading", { name: "Hand complete" })).toBeVisible();
  await expect(page.getByLabel("No Hearts hand score")).toContainText("13 / 13");
  await expect(page.getByLabel("Completed No Hearts tricks")).toContainText(/(Avoided|Penalty|Clean win|Clear)/);
  await expect(page.getByRole("button", { name: "New hand" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("no-hearts-hand.png"), fullPage: true });
});

test("No Queens hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "No Queens hand" }).click();

  await expect(page.getByRole("heading", { name: "No Queens hand" })).toBeVisible();
  await expect(page.getByLabel("No Queens hand score")).toContainText("queens played");
  await expect(page.getByLabel("No Queens hand table")).toBeVisible();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await page.locator(".full-hand-card.legal").first().dblclick();
  }

  await expect(page.getByRole("heading", { name: "Hand complete" })).toBeVisible();
  await expect(page.getByLabel("No Queens hand score")).toContainText("4 / 4");
  await expect(page.getByLabel("Completed No Queens tricks")).toContainText(/(Avoided|Penalty|Clean win|Clear)/);
  await expect(page.getByRole("button", { name: "New hand" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("no-queens-hand.png"), fullPage: true });
});

test("King of Hearts hand plays through thirteen tricks", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Barbu/ }).click();
  await page.getByRole("button", { name: "King of Hearts hand" }).click();

  await expect(page.getByRole("heading", { name: "King of Hearts hand" })).toBeVisible();
  await expect(page.getByLabel("King of Hearts hand score")).toContainText("king played");
  await expect(page.getByLabel("King of Hearts hand table")).toBeVisible();
  await expectNoPageScroll(page);

  for (let decision = 0; decision < 13; decision += 1) {
    await page.locator(".full-hand-card.legal").first().dblclick();
  }

  await expect(page.getByRole("heading", { name: "Hand complete" })).toBeVisible();
  await expect(page.getByLabel("King of Hearts hand score")).toContainText("1 / 1");
  await expect(page.getByLabel("Completed King of Hearts tricks")).toContainText(/(Avoided|Penalty|Clean win|Clear)/);
  await expect(page.getByRole("button", { name: "New hand" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("king-of-hearts-hand.png"), fullPage: true });
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

test("training path practice step starts Play Barbu and marks completion", async ({ page }) => {
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

  await expect(page.getByRole("heading", { name: "Play Barbu" })).toBeVisible();

  for (const buttonName of ["Next table", "Next table", "Finish game"]) {
    await page.locator(".hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: buttonName }).click();
  }

  await expect(page.getByRole("heading", { name: "Game complete" })).toBeVisible();
  await page.getByRole("button", { name: "Continue path" }).click();

  await expect(page.getByRole("heading", { name: "Review the hand" })).toBeVisible();
  await expect(page.getByLabel("Review contract results")).toContainText("No Hearts");
  await expect(page.getByLabel("Review recent attempts")).toContainText("3 / 3 clean");
  await expect(page.getByText(/You (avoided the penalty card|used a void turn to discard)/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Replay (No Hearts|No Queens|King of Hearts)/ })).toBeVisible();
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
