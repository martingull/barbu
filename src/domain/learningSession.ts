import { insertLearningFollowUp } from "./learningSequence";

export type LearningSession<S, R, V> = {
  steps: S[];
  index: number;
  phase: "answer" | "feedback" | "complete";
  results: R[];
  reviews: V[];
};

export function createLearningSession<S, R, V>(steps: readonly S[]): LearningSession<S, R, V> {
  if (!steps.length) throw Error("A lesson needs at least one decision.");
  return { steps: [...steps], index: 0, phase: "answer", results: [], reviews: [] };
}

// Game adapters validate and evaluate choices; the session only records an accepted answer.
export function checkLearningAnswer<S, R, V>(session: LearningSession<S, R, V>, result: R, review: V): LearningSession<S, R, V> {
  if (session.phase !== "answer") return session;
  return { ...session, phase: "feedback", results: [...session.results, result], reviews: [...session.reviews, review] };
}

export function advanceLearningSession<S extends { followUp?: S }, R extends { clean: boolean }, V>(session: LearningSession<S, R, V>): LearningSession<S, R, V> {
  if (session.phase !== "feedback") return session;
  const followUp = session.steps[session.index].followUp;
  // A companion may not schedule another companion, even if content accidentally supplies one.
  const steps = insertLearningFollowUp(session.steps, session.index, session.results[session.index].clean,
    followUp ? { ...followUp, followUp: undefined } : undefined);
  return session.index === steps.length - 1
    ? { ...session, steps, phase: "complete" }
    : { ...session, steps, index: session.index + 1, phase: "answer" };
}
