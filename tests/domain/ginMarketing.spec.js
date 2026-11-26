import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ginTopics } from "../../src/games/ginRummy";
import { ginLearningSteps, ginExerciseChoices, ginExerciseAnswer, ginFeedbackBreakdown, ginSettlementResult } from "../../src/lessons/gin-rummy/exercises";
import { formatCardLabel } from "../../src/presentation/cardDisplay";
import { learningSeriesStages } from "../../scripts/marketing/learning-series.mjs";

const read = name => JSON.parse(readFileSync(new URL(`../../docs/marketing/${name}`, import.meta.url), "utf8"));
const campaign = read("gin-series-shorts.json"), lessons = read("learning-shorts.json");
const episodes = campaign.shorts.map(item => ({ ...lessons.find(lesson => lesson.id === item.lessonId), ...item }));
const selection = (action, step, label) => ginExerciseChoices(action, step).find(choice => choice.label === label ||
  step.hand.some(card => `${card.rank} ${card.suit}` === label && choice.id === card.id));

for (const episode of episodes) test(`Gin Short ${episode.number} captures a real, correctly answered lesson`, () => {
  const topic = ginTopics.find(topic => topic.title === episode.topic);
  expect(topic).toBeTruthy();
  const steps = ginLearningSteps(topic.action);
  for (const [index, lead] of (episode.leadIn ?? []).entries()) {
    expect(steps[index].title).toBe(lead.heading);
    const choice = selection(topic.action, steps[index], lead.choice);
    expect(choice).toBeTruthy();
    expect(ginExerciseAnswer(topic.action, steps[index], choice.id).good).toBe(true);
  }
  const step = steps[episode.leadIn?.length ?? 0];
  expect(step.title).toBe(episode.heading);
  expect(step.hand).toHaveLength(episode.handCount);
  const choice = selection(topic.action, step, episode.choices[0]);
  expect(choice).toBeTruthy();
  const answer = ginExerciseAnswer(topic.action, step, choice.id);
  expect(answer.good).toBe(true);
  const feedback = `Good. ${answer.text}\n${ginFeedbackBreakdown(topic.action, step, choice.id).rows.map(row => `${row.label}: ${row.value}`).join("\n")}`;
  for (const phrase of episode.feedbackContains) expect(feedback).toContain(phrase);
  for (const focus of episode.focusCards) {
    const hand = focus.handLabel.startsWith("Your") ? step.hand : step.settlement.opponentHand;
    const card = hand.find(card => formatCardLabel(card) === focus.card);
    expect(card).toBeTruthy();
    const rank = { A: "ace", J: "jack", Q: "queen", K: "king" }[card.rank] ?? card.rank;
    expect(focus.artwork).toBe(`${rank}_of_${{ C: "clubs", D: "diamonds", H: "hearts", S: "spades" }[card.suit]}.png`);
  }
});

test("Gin series keeps the first hand consistent and labels the undercut as a new deal", () => {
  const discard = ginLearningSteps("melds")[0].hand.filter(card => card.id !== "KS");
  expect(discard).toEqual(ginLearningSteps("knock")[0].hand);
  const result = ginSettlementResult(ginLearningSteps("settlement")[1]);
  expect(result).toMatchObject({ kind: "undercut", winner: 1, points: 16 });
  expect(result.layouts.map(layout => layout.deadwood.map(card => card.id))).toEqual([["8C"], ["2H"]]);
  expect(result.layouts.map(layout => layout.layoffs)).toEqual([[], []]);
  expect(episodes[2].context).toContain("new deal");
  expect(episodes[2].answerBottom).toContain("Classic");
});

test("series teaches before the profile-link invitation and gives each episode a concrete next lesson", () => {
  expect(episodes).toHaveLength(3);
  expect(new Set(episodes.map(episode => episode.id)).size).toBe(3);
  for (const episode of episodes) {
    const stages = learningSeriesStages(episode, campaign.pacing, {
      handImage: index => `<img class="hand" src="hand-${index}.png">`,
      focusImages: episode.focusCards.map(focus => `cards/${focus.artwork}`)
    });
    expect(stages.map(stage => stage.id)).toEqual(["hook", "question", "select-1", "feedback", "outro"]);
    expect(stages[0].duration).toBe(3);
    expect(stages[0].html).toContain(episode.joke.heading.replaceAll("\n", "<br>"));
    expect(stages[1].duration).toBe(8);
    expect(stages.reduce((sum, stage) => sum + stage.duration, 0)).toBe(31);
    expect(stages.slice(0, -1).every(stage => !stage.html.includes("Google Play"))).toBe(true);
    expect(stages.at(-1).html).toContain("Tap our channel → Google Play");
    expect(stages.at(-1).html).toContain(episode.startLesson);
    expect(episode.caption).toContain("no subscription needed");
    expect(episode.conversationPrompt).toContain("our channel");
    expect(episode.caption).not.toMatch(/click.*(?:description|comment)|search.*Play Store/i);
  }
});
