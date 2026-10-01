import type { Meld } from "../domain/rummyMelds";
import { rummyRank } from "../domain/rummyMelds";
import { formatCardLabel, formatCardList } from "./cardDisplay";

export function formatRummyMeld(meld: Meld) {
  return meld.kind === "run"
    ? [...meld.cards].sort((a, b) => rummyRank(a) - rummyRank(b)).map(formatCardLabel).join(", ")
    : formatCardList(meld.cards);
}
