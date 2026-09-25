import { typescriptHandEngine } from "./handEngine";
import { transitionReviewedHand, type ReviewedHand } from "./reviewedHand";
import { buildTrumpCountRound, buildTrumpMemoryQuestion, buildCourtMemoryQuestion, buildDangerMemoryQuestion,
  buildWhistMemoryQuestion, heartMemoryCheckpoints, whistMemoryCheckpoints,
  type MemoryAnswer, type MemoryExercise, type MemoryQuestion, type TrumpCountRound } from "./cardCountingQuestions";

export const memoryHandDefinitions = {
  "heart-memory": { contract: "Hearts", offset: 101, checkpoints: heartMemoryCheckpoints },
  "high-card-memory": { contract: "Whist", offset: 17, checkpoints: whistMemoryCheckpoints },
  "danger-count": { contract: "No Queens", offset: 151, checkpoints: heartMemoryCheckpoints },
  "whist-memory": { contract: "Whist", offset: 51, checkpoints: whistMemoryCheckpoints }
} as const;

export type MemoryHandSession = ReviewedHand & {
  exercise: MemoryExercise; seed: number; answer: MemoryAnswer | null; checked: boolean; attempts: number; clean: number;
};
export type MemoryEvent = { type: "answer"; answer: MemoryAnswer } | { type: "check" } | { type: "next" } | { type: "replay" };
export type MemoryHandEvent = MemoryEvent | { type: "play-card"; cardId: string };

export function startMemoryHand(exercise: MemoryExercise, seed: number): MemoryHandSession {
  const definition = memoryHandDefinitions[exercise];
  const fullHand = typescriptHandEngine(definition.contract)!.start({ seed });
  return { exercise, seed, fullHand, fullHandReviewTrickCount: 0, answer: null, checked: false, attempts: 0, clean: 0 };
}

export function memoryHandQuestion(session: MemoryHandSession): MemoryQuestion | null {
  const { exercise, fullHand, fullHandReviewTrickCount } = session;
  const definition = memoryHandDefinitions[exercise];
  if (fullHand.status === "complete" || !definition.checkpoints.includes(fullHandReviewTrickCount)) return null;
  const tricks = fullHand.completedTricks.map(trick => trick.cards);
  const seed = session.seed + definition.offset + tricks.length;
  switch (exercise) {
    case "heart-memory": return buildTrumpMemoryQuestion(tricks, seed);
    case "high-card-memory": return buildCourtMemoryQuestion(tricks, seed);
    case "danger-count": return buildDangerMemoryQuestion(tricks, seed);
    case "whist-memory": return buildWhistMemoryQuestion(tricks, fullHand.whistTurnedTrump!.suit, seed);
  }
}

export function validMemoryAnswer(question: MemoryQuestion, answer: MemoryAnswer) {
  if (question.kind === "count" || question.kind === "trump_count") return typeof answer === "number" && question.options.includes(answer);
  if (question.kind === "void_spotter") return ["Tutor", "Left", "Right"].includes(String(answer));
  return typeof answer === "boolean";
}

export function transitionMemoryHand(session: MemoryHandSession, event: MemoryHandEvent): MemoryHandSession {
  if (event.type === "replay") return startMemoryHand(session.exercise, session.seed);
  if (session.fullHand.status === "complete") return session;
  const question = memoryHandQuestion(session);
  if (event.type === "answer") return !question || session.checked || !validMemoryAnswer(question, event.answer)
    ? session : { ...session, answer: event.answer };
  if (event.type === "check") return !question || session.checked || session.answer === null ? session
    : { ...session, checked: true, attempts: session.attempts + 1, clean: session.clean + Number(session.answer === question.answer) };
  if (event.type === "next" && (!session.fullHandReviewTrickCount || (question && !session.checked))) return session;
  const engine = typescriptHandEngine(session.fullHand.contract)!;
  const next = transitionReviewedHand(session, event.type === "next" ? { type: "next-trick" } : event, engine);
  return next === session ? session : { ...next, answer: null, checked: false };
}

export type CountRoundSession = {
  seed: number; round: TrumpCountRound; trick: number; question: number; stage: "reveal" | "answer" | "complete";
  answer: MemoryAnswer | null; checked: boolean; attempts: number; clean: number;
};

export function startCountRound(seed: number): CountRoundSession {
  return { seed, round: buildTrumpCountRound(seed), trick: 0, question: 0, stage: "reveal", answer: null, checked: false, attempts: 0, clean: 0 };
}

export function transitionCountRound(session: CountRoundSession, event: MemoryEvent): CountRoundSession {
  if (event.type === "replay") return startCountRound(session.seed);
  if (session.stage === "complete") return session;
  const question = session.round.questions[session.question];
  if (event.type === "answer") return session.stage !== "answer" || session.checked || !validMemoryAnswer(question, event.answer)
    ? session : { ...session, answer: event.answer };
  if (event.type === "check") return session.stage !== "answer" || session.checked || session.answer === null ? session
    : { ...session, checked: true, attempts: session.attempts + 1, clean: session.clean + Number(session.answer === question.answer) };
  if (session.stage === "reveal") return session.trick === question.endTrick
    ? { ...session, stage: "answer" } : { ...session, trick: session.trick + 1 };
  if (!session.checked) return session;
  if (session.question === session.round.questions.length - 1) return { ...session, stage: "complete" };
  const index = session.question + 1;
  return { ...session, question: index, trick: session.round.questions[index].startTrick, stage: "reveal", answer: null, checked: false };
}
