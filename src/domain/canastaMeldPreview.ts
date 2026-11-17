import { canastaMeldPenalty, canastaTeam, canastaSideScoring, type CanastaSide } from "./canastaRules";
import type { CanastaObservation } from "./canastaPolicy";
import { transitionCanastaSession, type CanastaAction } from "./canastaSession";

export type CanastaMeldRisk = { rank: string; count: number; points: number };
export type CanastaMeldChange = { rank: string; before: number; after: number; penaltyBefore: number; penaltyAfter: number; completed: boolean; bonus: number };
export type CanastaMeldGoal = "avoid_new_penalty" | "remove_penalty" | "complete_without_new_penalty";

export function canastaMeldChanges(before: CanastaSide, after: CanastaSide): CanastaMeldChange[] {
  const bonuses = canastaSideScoring(after, [], false).items.filter(item => item.reason === "canasta");
  return after.melds.flatMap(meld => {
    const previous = before.melds.find(group => group.rank === meld.rank);
    if (meld.cards.length === previous?.cards.length) return [];
    const completed = meld.cards.length === 7;
    return [{ rank: meld.rank, before: previous?.cards.length ?? 0, after: meld.cards.length,
      penaltyBefore: previous ? canastaMeldPenalty(previous) : 0, penaltyAfter: canastaMeldPenalty(meld), completed,
      bonus: completed ? bonuses.find(item => item.reason === "canasta" && item.rank === meld.rank)?.points ?? 0 : 0 }];
  });
}

export function canastaMeldDecision(observation: CanastaObservation, action: Extract<CanastaAction, { type: "meld" }>, goal: CanastaMeldGoal) {
  const side = observation.hand.sides[canastaTeam(observation.hand.turn)];
  const penaltyBefore = side.melds.reduce((sum, meld) => sum + canastaMeldPenalty(meld), 0);
  try {
    const next = transitionCanastaSession(observation, action);
    const changes = canastaMeldChanges(side, next.hand.sides[canastaTeam(observation.hand.turn)]);
    const penaltyAfter = penaltyBefore + changes.reduce((sum, change) => sum + change.penaltyAfter - change.penaltyBefore, 0);
    const noNewPenalty = changes.every(change => change.penaltyAfter <= change.penaltyBefore);
    const correct = goal === "remove_penalty" ? penaltyAfter < penaltyBefore
      : goal === "complete_without_new_penalty" ? noNewPenalty && changes.some(change => change.completed) : noNewPenalty;
    return { legal: true, correct, changes, penaltyBefore, penaltyAfter };
  } catch {
    return { legal: false, correct: false, changes: [] as CanastaMeldChange[], penaltyBefore, penaltyAfter: penaltyBefore };
  }
}

export function canastaMeldPreview(observation: CanastaObservation, action: Extract<CanastaAction, { type: "meld" | "pickup" }>) {
  try {
    const next = transitionCanastaSession(observation, action);
    const ranks = new Set(action.groups.map(group => group.rank));
    if (action.type === "pickup") ranks.add(observation.hand.discards.at(-1)!.rank);
    const risks: CanastaMeldRisk[] = next.hand.sides[canastaTeam(observation.hand.turn)].melds.flatMap(meld => {
      const penalty = canastaMeldPenalty(meld);
      return ranks.has(meld.rank) && penalty ? [{ rank: meld.rank, count: meld.cards.length, points: -penalty }] : [];
    });
    return { error: "", risks };
  } catch (cause) {
    return { error: (cause as Error).message, risks: [] as CanastaMeldRisk[] };
  }
}
