import { expect, test } from "@playwright/test";
import { startMemoryHand, transitionMemoryHand, memoryHandQuestion } from "../../src/domain/cardCountingSession";
import { scoreSeatLabel } from "../../src/presentation/scorePresentation";

function multipleVoidSeed() {
  for (let seed = 0; seed < 64; seed++) {
    let state = startMemoryHand("whist-memory", seed);
    for (let trick = 0; trick < 11; trick++) {
      state = transitionMemoryHand(state, { type: "play-card", cardId: state.fullHand.legalCardIds[0] });
      const question = memoryHandQuestion(state);
      if (question?.kind === "void_spotter" && question.answers.length > 1) return seed;
      if (question) state = transitionMemoryHand(transitionMemoryHand(state, { type: "answer", answer: question.answer }), { type: "check" });
      state = transitionMemoryHand(state, { type: "next" });
    }
  }
  throw Error("Expected a real multi-seat void checkpoint.");
}

test("Whist memory accepts a different correct void seat and highlights all valid answers", async ({ page }, info) => {
  const seed = multipleVoidSeed();
  await page.addInitScript(seed => localStorage.setItem("barbu.practiceSeed.v1", String(seed)), seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
  await page.getByLabel("Card Counting I exercises").getByRole("button", { name: /^Whist memory hand/ }).click();
  let state = startMemoryHand("whist-memory", seed);
  for (let trick = 0; trick < 11; trick++) {
    const id = state.fullHand.legalCardIds[0];
    await page.getByLabel("Your Whist hand", { exact: true }).getByRole("button", { name: `${id.slice(0, -1)} ${id.at(-1)}`, exact: true }).click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    state = transitionMemoryHand(state, { type: "play-card", cardId: id });
    const question = memoryHandQuestion(state);
    if (question) {
      const alternative = question.kind === "void_spotter" ? question.answers.find(answer => answer !== question.answer) : undefined;
      const answer = alternative ?? question.answer;
      const label = typeof answer === "boolean" ? answer ? "Yes" : "No" : typeof answer === "number" ? String(answer) : scoreSeatLabel(answer);
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.getByRole("button", { name: "Check memory", exact: true }).click();
      state = transitionMemoryHand(transitionMemoryHand(state, { type: "answer", answer }), { type: "check" });
      await expect(page.locator(".memory-prompt .outcome")).toHaveText("Correct. Memory held.");
      if (alternative && question.kind === "void_spotter") {
        for (const seat of question.answers) await expect(page.getByLabel("Void spotter options").getByRole("button", { name: scoreSeatLabel(seat), exact: true })).toHaveClass(/correct/);
        await expect(page.locator(".memory-prompt .wrong")).toHaveCount(0);
        await expect(page.getByLabel("Whist hand score")).toContainText(`${state.clean} / ${state.attempts}`);
        await page.screenshot({ path: info.outputPath("all-valid-void-answers.png"), scale: "css" });
        return;
      }
    }
    await page.getByRole("button", { name: "Next trick", exact: true }).click();
    state = transitionMemoryHand(state, { type: "next" });
  }
  throw Error("The multi-seat checkpoint was not reached.");
});
