export function insertLearningFollowUp<T>(steps: readonly T[], index: number, correct: boolean, followUp?: T): T[] {
  if (correct || !followUp || index < 0 || index >= steps.length) return [...steps];
  return [...steps.slice(0, index + 1), followUp, ...steps.slice(index + 1)];
}
