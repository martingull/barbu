import { cribbageQuestionAnswer, cribbageQuestionCount, cribbageQuestionChoices, type CribbageQuestion } from "../../domain/cribbageLearning";
import { cribbageCards, cribbageScoreParts, countCribbagePeg, cribbageValue } from "../../domain/cribbage";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";
import { formatCardLabel } from "../../presentation/cardDisplay";

export type CribbageExerciseStep = { title: string; question: CribbageQuestion; teaching: Teaching; followUp?: CribbageExerciseStep };
const counts: [string[], string][] = [
  [["5C", "5D", "6H", "7S"], "8C"], [["AC", "2D", "3S", "4H"], "5S"], [["JC", "5D", "8S", "9H"], "KC"],
  [["2H", "4H", "7H", "9H"], "KS"], [["3C", "3D", "4H", "5S"], "6H"], [["5H", "5D", "5C", "JS"], "5S"]
];
const cribs: [string[], string][] = [
  [["2H", "4H", "7H", "9H"], "KS"], [["2C", "4C", "7C", "9C"], "KC"], [["JC", "5D", "8S", "9H"], "KC"],
  [["3D", "4D", "6D", "9D"], "AS"], [["AC", "2C", "6C", "8C"], "10C"], [["3H", "3D", "4S", "5C"], "9S"]
];
const discards = [
  ["5C", "5D", "6H", "7S", "KC", "2D"], ["AC", "2D", "3S", "4H", "KH", "9C"], ["5H", "10D", "JC", "QS", "2C", "8D"],
  ["3C", "3D", "4H", "5S", "KC", "9H"], ["4C", "5D", "6S", "6H", "AS", "QD"], ["5C", "5S", "10H", "JD", "AC", "9D"]
];
const pegging: CribbageQuestion[] = [
  { kind: "peg", run: ["10C"], card: "5H" }, { kind: "peg", run: ["7D"], card: "7H" }, { kind: "peg", run: ["4D", "2H"], card: "3S" },
  { kind: "peg", run: ["8C"], card: "7H" }, { kind: "peg", run: ["3C", "3D"], card: "3H" }, { kind: "peg", run: ["6C", "4D"], card: "5S" }
];
const endings: CribbageQuestion[] = [
  { kind: "peg", run: ["10C", "9D", "7H"], card: "5S", last: true },
  { kind: "peg", run: ["KC", "9D", "8H"], card: "3S", last: true },
  { kind: "peg", run: ["KC", "QD", "8H"], card: "2S", last: true },
  { kind: "peg", run: ["QC", "9D", "8H"], card: "4S", last: true },
  { kind: "peg", run: ["10C", "8D", "7H"], card: "4S", last: true },
  { kind: "peg", run: ["10C", "9D", "8H"], card: "AS", last: true }
];
function questions(action: string): CribbageQuestion[] {
  switch (action) {
    case "values": return ["AC", "QH", "7D", "JS", "10C", "2S"].map(id => ({ kind: "value", hand: [id] }));
    case "discard": return discards.map((hand, index) => ({ kind: "discard", hand, ownCrib: index % 2 === 0 }));
    case "pegging": return pegging;
    case "go": return endings;
    case "hand": return counts.map(([hand, starter]) => ({ kind: "count", hand, starter, crib: false }));
    case "crib": return cribs.map(([hand, starter]) => ({ kind: "count", hand, starter, crib: true }));
    default: throw Error("Unknown Cribbage lesson.");
  }
}
export function cribbagePrompt(question: CribbageQuestion): string {
  switch (question.kind) {
    case "value": return "What does this card add to the running count?";
    case "discard": return `Choose a suggested discard plan. ${question.ownCrib ? "You deal: the crib scores for you." : "Barbu deals: the crib scores for Barbu."}`;
    case "count": return `How many points does this ${question.crib ? "crib" : "hand"} score with the separate starter?`;
    case "peg": return question.last ? "Neither player can add another card after yours. How many points does your final play earn, including go or last card?" : "How many points does your card earn? The count above is not your score.";
  }
}
export function cribbageAnswerLabel(id: string, question?: CribbageQuestion): string {
  return id.includes(",") ? cribbageCards(id.split(",")).map(formatCardLabel).join(" + ")
    : question?.kind === "peg" ? `${id} point${id === "1" ? "" : "s"}` : id;
}
export function cribbagePegArithmetic(question: CribbageQuestion): FeedbackBreakdown | undefined {
  if (question.kind !== "peg") return undefined;
  const before = question.run.reduce((sum, card) => sum + cribbageValue(card), 0);
  const score = countCribbagePeg(question.run, question.card);
  return { label: "Running count arithmetic", rows: [
    { label: "Already played", value: question.run.length > 1 ? `${question.run.map(cribbageValue).join(" + ")} = ${before}` : String(before) },
    { label: "Add your card", value: `${before} + ${cribbageValue(question.card)} = ${score.total}` }
  ] };
}
export function cribbageExplanation(question: CribbageQuestion): string {
  const answer = cribbageQuestionAnswer(question);
  const count = cribbageQuestionCount(question);
  if (count) return `${count.total} points: ${cribbageScoreParts(count)}. ${question.kind === "count" && question.crib ? "A crib flush requires all five cards, including the starter." : "The starter joins the four kept cards for counting."}`;
  if (question.kind === "value") return `${answer}. Aces count one, number cards their number, and jacks, queens and kings ten. Suits do not restrict pegging.`;
  if (question.kind === "discard") return `Suggested: ${cribbageAnswerLabel(answer)}. Balance the expected kept-hand score across unseen starters with ${question.ownCrib ? "helping your own crib" : "avoiding gifts to Barbu's crib"}. This is a heuristic recommendation, not a uniquely legal or guaranteed best discard.`;
  if (question.kind === "peg") {
    const score = countCribbagePeg(question.run, question.card);
    const additions = [...question.run, question.card].map(cribbageValue).join(" + ");
    const reasons = score.why.map(reason => {
      if (reason === "fifteen") return "The count reached exactly 15, which earns 2 points.";
      if (reason === "thirty-one") return "The count reached exactly 31, which earns 2 points, with no extra last-card point.";
      if (reason === "a pair") return `The last two cards are both ${cribbageCards([question.card])[0].rank}: a pair earns 2 points. Suits do not matter.`;
      if (reason === "three alike") return "The last three cards share a rank: their three pairs earn 6 points.";
      if (reason === "four alike") return "The last four cards share a rank: their six pairs earn 12 points.";
      return `The most recent cards make ${reason}: neighbouring ranks with no gaps, like 2, 3, 4. A run earns 1 point per card, even when played out of rank order.`;
    });
    if (!reasons.length) reasons.push("This play makes no fifteen, 31, pair or run, so the combination score is 0.");
    if (question.last && score.total !== 31) reasons.push("Neither player can continue: add 1 for go or last card.");
    const arithmetic = `${additions} = ${score.total}. That is the running count, not your score.`;
    return `${arithmetic} ${reasons.join(" ")} You earn ${answer} point${answer === "1" ? "" : "s"}.${question.last ? " The next count starts at zero." : ""}`;
  }
  return "";
}
export function cribbageLearningSteps(action: string): CribbageExerciseStep[] {
  const pool = questions(action);
  const make = (question: CribbageQuestion, index: number, followUp = false): CribbageExerciseStep => ({
    title: action === "go" ? "Finish a count" : action === "discard" ? "Choose the crib cards" : action === "values" ? "Card values" : action === "pegging" ? "Score a play" : action === "crib" ? "Count the crib" : "Count a hand",
    question, teaching: { stage: followUp ? "reinforcement" : teachingStages[index], guidance: index === 0 && !followUp
      ? action === "pegging" ? "Pegging means earning points as cards are played. Making exactly fifteen earns 2 points: 10 + 5 = 15, so add 2 to your score, not 15." : cribbageExplanation(question)
      : question.kind === "peg" ? index === 1 && !followUp && action === "pegging"
        ? "First add the card values for the running count. Then check the last two ranks: a pair earns 2 points even if the count is not 15."
        : "Add the values for the count, then look at the most recent cards. A run means at least three neighbouring ranks with no gaps, like 2, 3, 4, and earns 1 point per card even if played out of order. Do not answer with the count."
      : "Keep the running count separate from points scored. Count each combination once; remember who owns the crib." }
  });
  return pool.slice(0, 3).map((question, index) => ({ ...make(question, index), followUp: make(pool[index + 3], index, true) }));
}
export { cribbageQuestionAnswer, cribbageQuestionChoices };
