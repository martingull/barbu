import type { MemoryQuestion, MemoryExercise } from "../../domain/cardCountingQuestions";
import type { MemoryHandSession } from "../../domain/cardCountingSession";
import { isCourtCard } from "../../domain/cardCountingQuestions";
import { partnershipTrickCounts } from "../../domain/trickTakingScore";
import { heartsScoredSeatPenalties } from "../../domain/heartsSession";
import { seatPenaltiesForTricks } from "../../domain/trickTakingScore";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeatLabel, formatPointCount } from "../../presentation/scorePresentation";
const suitNames = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
export const memoryPresentation = {
  "heart-memory": { title: "Heart memory hand", game: "Black Lady", target: "Target heart card", count: "Heart count answer options", specific: "Heart card answer options", seen: "Hearts seen so far" },
  "high-card-memory": { title: "Three amigos memory", game: "Whist", target: "Target high card", count: "High card count answers", specific: "High card answer options", seen: "High cards seen so far" },
  "danger-count": { title: "Danger cards", game: "No Queens", target: "Target queen", count: "Danger card count answers", specific: "Danger card specific answers", seen: "Queens seen so far" },
  "whist-memory": { title: "Whist memory hand", game: "Whist", target: "Target whist card", count: "Whist count answer options", specific: "Whist card answer options", seen: "Trumps seen so far" }
} satisfies Record<MemoryExercise, { title: string; game: string; target: string; count: string; specific: string; seen: string }>;

export function memoryQuestionHeading(
  question: MemoryQuestion,
  isDanger = false,
  isHighCard = false
) {
  if (question.kind === "count") {
    return isDanger ? "How many queens appeared?" : isHighCard ? "How many high cards appeared?" : "How many hearts appeared?";
  }
  if (question.kind === "specific") {
    return isDanger ? "Did this queen appear?" : isHighCard ? "Did this high card appear?" : "Did this heart appear?";
  }
  if (question.kind === "trump_count") {
    return "How many trumps appeared?";
  }
  if (question.kind === "void_spotter") {
    return "Who is void?";
  }
  if (question.kind === "boss_card") {
    return "Is this the boss card?";
  }

  return "Did this trump appear?";
}


export function memoryAnswerText(
  question: MemoryQuestion,
  isDanger = false,
  isHighCard = false
) {
  if (question.kind === "count") {
    return isDanger
      ? `${question.answer} queens have been played so far.`
      : isHighCard
        ? `${question.answer} high cards have been played so far.`
        : realisticTrumpQuestionAnswerText(question);
  }
  if (question.kind === "specific") {
    if (isHighCard) {
      return question.answer
        ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
        : `No. ${formatCardLabel(question.targetCard)} was not played.`;
    }

    return isDanger
      ? question.answer
        ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
        : `No. ${formatCardLabel(question.targetCard)} was not played.`
      : realisticTrumpQuestionAnswerText(question);
  }
  if (question.kind === "trump_count") {
    return `${question.answer} ${suitNames[question.trumpSuit].toLowerCase()} trumps have been played so far.`;
  }
  if (question.kind === "void_spotter") {
    return `${scoreSeatLabel(question.answer)} is void in ${suitNames[question.targetSuit].toLowerCase()}.`;
  }
  if (question.kind === "boss_card") {
    return question.answer
      ? `Yes. ${formatCardLabel(question.targetCard)} is the boss card.`
      : `No. ${formatCardLabel(question.targetCard)} is not the boss card.`;
  }

  return question.answer
    ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
    : `No. ${formatCardLabel(question.targetCard)} was not played.`;
}


function realisticTrumpQuestionAnswerText(question: Extract<MemoryQuestion, { kind: "count" | "specific" }>) {
  if (question.kind === "count") {
    return `${question.answer} hearts have been played so far.`;
  }

  return question.answer
    ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
    : `No. ${formatCardLabel(question.targetCard)} was not played.`;
}


export function memoryReviewCards(session: MemoryHandSession) {
  const cards = session.fullHand.completedTricks.flatMap(trick => trick.cards.map(play => play.card));
  if (session.exercise === "high-card-memory") return cards.filter(isCourtCard);
  if (session.exercise === "danger-count") return cards.filter(card => card.rank === "Q");
  const suit = session.exercise === "whist-memory" ? session.fullHand.whistTurnedTrump!.suit : "H";
  return cards.filter(card => card.suit === suit);
}

export function memoryResult(session: MemoryHandSession) {
  const sharp = session.clean === session.attempts && session.attempts > 0;
  const partnership = session.fullHand.contract === "Whist";
  const danger = session.exercise === "danger-count";
  const penalties = seatPenaltiesForTricks(session.fullHand.completedTricks);
  const score = partnership ? partnershipTrickCounts(session.fullHand.completedTricks).playerSide
    : danger ? penalties.You : heartsScoredSeatPenalties(penalties).You;
  const titles = {
    "heart-memory": sharp ? "Sharp heart memory" : "Heart memory hand complete",
    "high-card-memory": sharp ? "High cards remembered" : "High card hand complete",
    "danger-count": sharp ? "Clean queen memory" : "Danger cards hand complete",
    "whist-memory": sharp ? "Sharp Whist memory" : "Whist memory hand complete"
  };
  return { title: titles[session.exercise],
    summary: sharp ? "You finished the hand and answered every memory check correctly."
      : "Hand complete. Review the cards you missed, then try another hand.",
    scoreLabel: partnership ? "Your side" : danger ? "Queen penalty" : "Hearts score",
    score: partnership ? `${score} ${score === 1 ? "trick" : "tricks"}` : formatPointCount(score)
  };
}
