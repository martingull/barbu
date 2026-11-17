import type { CanastaScoreItem } from "../../domain/canastaRules";
import { canastaSeatNames, type CanastaResult } from "../../domain/canastaSession";
import type { CanastaMeldChange } from "../../domain/canastaMeldPreview";

const ranks: Record<string, string> = { "4": "fours", "5": "fives", "6": "sixes", "7": "sevens", "8": "eights",
  "9": "nines", "10": "tens", J: "jacks", Q: "queens", K: "kings", A: "aces" };
export const canastaRiskLabel = (rank: string) => rank === "Wild" ? "Unfinished wild meld"
  : rank === "A" ? "Unfinished natural aces" : "Unfinished sevens";

export function canastaMeldChangeText(changes: CanastaMeldChange[]) {
  return changes.map(change => {
    const name = change.rank === "Wild" ? "Wilds" : ranks[change.rank][0].toUpperCase() + ranks[change.rank].slice(1);
    if (change.completed) return `${name} reached 7/7: a canasta with a ${change.bonus}-point end-of-hand bonus.${change.penaltyBefore
      ? ` This removes the possible ${change.penaltyBefore}-point unfinished-meld penalty.` : ""}`;
    return `${name} now have ${change.after}/7 cards and need ${7 - change.after} more.${change.penaltyAfter
      ? ` A ${change.penaltyAfter}-point penalty applies if this meld is unfinished when the hand ends.` : " No unfinished-meld penalty applies to this group."}`;
  }).join(" ");
}

export function canastaScoreItemLabel(item: CanastaScoreItem, team: number) {
  switch (item.reason) {
    case "canasta": return item.rank === "Wild" ? item.jokers === 0 ? "All-twos canasta"
      : item.jokers === 4 ? "Wild canasta (four jokers)" : "Wild canasta"
      : `${item.pure ? "Natural" : "Mixed"} ${ranks[item.rank]} canasta`;
    case "going_out": return "Going out";
    case "unfinished_meld": return canastaRiskLabel(item.rank);
    case "held_danger": return `${canastaSeatNames[item.handIndex * 2 + team]}: ${item.count} ${ranks[item.rank]} held`;
    case "threes": return `${item.colour === "red" ? "Red" : "Black"} threes (${item.count} exposed; ${item.canastas === 0 ? "no canasta" : item.canastas === 1 ? "one canasta: no score" : "2+ canastas"})`;
    case "melded_cards": return item.canastas ? "Melded card values" : "Melded cards (no canasta)";
    case "held_cards": return "Cards left with both partners";
    case "special_hand": return `${item.name} (special hand)`;
  }
}

export function canastaScoreRows(result: CanastaResult) {
  type Row = { label: string; category: CanastaScoreItem["category"]; values: [number | null, number | null] };
  const rows = new Map<string, Row>();
  result.scoreItems.forEach((items, team) => {
    for (const item of items) {
      const label = canastaScoreItemLabel(item, team);
      const row: Row = rows.get(label) ?? { label, category: item.category, values: [null, null] };
      row.values[team] = (row.values[team] ?? 0) + item.points;
      rows.set(label, row);
    }
  });
  const order: CanastaScoreItem["category"][] = ["bonuses", "melds", "threes", "penalties", "inHand"];
  return [...rows.values()].sort((left, right) => order.indexOf(left.category) - order.indexOf(right.category));
}
