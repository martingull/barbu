import snapshot from "./hearts-native-practice.json" with { type: "json" };
import type { Card, GeneratedDrillSet, HeartsPassScenario, Seat, TableCard } from "../../src/lessonTypes";

const pattern = (id: string) => id.replace(/-\d+$/, "");
const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Card["suit"] });
const table = (plays: string[][]): TableCard[] => plays.map(([seat, id]) => ({ seat: seat as Seat, card: card(id) }));

// Decode captured data only. Never call the engine to construct expected outcomes.
export const nativeHeartsPractice = {
  sets: snapshot.sets.map(({ scenarioIds, ...set }) => ({
    ...set,
    scenarios: scenarioIds.map(id => {
      const scenario = snapshot.scenarios.find(s => s.id === pattern(id))!;
      return { ...scenario, id, playerHand: scenario.playerHand.map(card),
        tableBeforeChoice: table(scenario.tableBeforeChoice), tableAfterChoice: table(scenario.tableAfterChoice),
        outcomes: scenario.outcomes.map(outcome => ({ ...outcome,
          completedTrick: outcome.completedTrick === null ? null : table(outcome.completedTrick)
        })) };
    })
  })) as GeneratedDrillSet[],
  passes: snapshot.passCases.map(id => {
    const pass = snapshot.passes.find(p => p.id === pattern(id))!;
    return { ...pass, id, playerHand: pass.playerHand.map(card), recommendedPass: pass.recommendedPass.map(card) };
  }) as HeartsPassScenario[]
};
