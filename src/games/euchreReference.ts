import type { GameReference } from "./referenceCatalog";

export const euchreReference: GameReference = {
  id: "euchre", title: "Euchre", family: "Euchre", baselineLabel: "North American",
  baseline: "Parlett family framework; North American profile cross-checked with Pagat and Bicycle",
  overview: "A five-trick partnership game. The side choosing trump promises at least three tricks; the defenders try to stop it. Captured cards have no individual point values.",
  sections: [
    { id: "object", title: "Object", body: "Choose trump only when your side can reasonably expect three of five tricks. Makers score for making their call or sweeping all five; defenders score by euchring the makers. First partnership to 10 points wins." },
    { id: "players", title: "Players", body: "Four players in fixed opposite partnerships: South (you) with North, East with West. Deal, calling and play rotate clockwise. You choose only South's cards and calls." },
    { id: "cards", title: "Cards and bowers", body: "Use 24 cards: 9, 10, jack, queen, king and ace in each suit, no joker. Trump ranks right bower (trump jack), left bower (the jack of the other suit of the same colour), ace, king, queen, ten, nine. The left bower belongs to trump for every play rule. Non-trump suits rank ace, king, queen, jack, ten, nine, with one jack moved into trump." },
    { id: "deal", title: "Deal and call", body: "Deal five each in packets of three then two, starting left of dealer; expose the next card and leave three concealed. Starting left of dealer, each player may order up the exposed suit or pass. An order ends calling. Dealer picks up the card and discards one face down, keeping five. Dealer's partner may order up without being forced alone. After four passes, each player may name any other suit or pass. A second-round call does not give dealer the upcard. After eight passes, no points are scored and the next player deals." },
    { id: "play", title: "Play", body: "The player left of dealer leads, skipping a sitting-out partner. Follow the effective led suit if possible; otherwise play any card. The left bower follows trump, never its printed suit. There is no compulsory trumping or overtrumping. Highest trump wins, or highest card of the led suit if no trump was played. Winner leads next. Play all five tricks before settling the score." },
    { id: "alone", title: "Going alone", body: "Only the caller may announce a lone hand, at the same time as choosing trump. Their partner sits out and keeps their cards concealed. The other three players play every trick. If the sitting-out partner is dealer, dealer still completes the pickup and private discard before sitting out." },
    { id: "scoring", title: "Scoring", body: "Makers taking three or four tricks score 1. All five with partner scores 2; all five alone scores 4. A lone maker taking only three or four still scores 1. If makers take fewer than three, defenders score 2, including against a lone caller. Points go to one side only. Dealer rotates after each hand. Settle the whole hand, then stop when a side has at least 10." },
    { id: "tactics", title: "Tactical ideas", body: "Count bowers, trump length and outside aces before calling. Consider the dealer's known pickup. Preserve control and consider a void when discarding. Do not waste a winner on a secure partner trick; use already-played cards to judge remaining strength. A call is a risk judgement, not a guaranteed trick count. Opponents make heuristic decisions from their own hand and public cards." }
  ],
  contracts: [],
  variants: [
    { id: "profile", title: "North American table", note: "This table uses a 24-card pack, a 10-point game and a redeal after eight passes. It does not force the dealer to choose trump. Agree on these conventions before joining another table." },
    { id: "other-tables", title: "Other tables", note: "British games may use a joker (Benny), different opening leads or defender-alone rules. Stick the dealer, 32-card packs, partner exchanges, defender-alone and rubber scoring are not used here." }
  ]
};
