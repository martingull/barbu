import type { GameReference } from "./referenceCatalog";

export const cribbageReference: GameReference = {
  id: "cribbage", title: "Cribbage", family: "Adding games", baselineLabel: "Six-card",
  baseline: "Two-player six-card Cribbage; Parlett family framework, cross-checked with Pagat",
  overview: "A race to 121 with two kinds of scoring: combinations made while playing cards, then combinations counted in the kept hands and dealer's crib.",
  sections: [
    { id: "object", title: "Object", body: "Be first to reach 121 points. Score immediately during play and when counting hands. Reaching 121 ends the game at once; later hands or the crib are not counted for the result." },
    { id: "players", title: "Players", body: "You play against Barbu. The first dealer is selected from the deal seed; the deal then alternates. This table automates shuffling, cutting, calling go and scoring. There is no trump suit and no requirement to follow suit." },
    { id: "cards", title: "Cards", body: "Use a standard 52-card pack. Aces count one; 2 to 10 their number; jacks, queens and kings ten. For runs, ranks remain distinct and ace is low: 10-J-Q is a run, Q-K-A is not. A ten and a king do not make a pair." },
    { id: "deal", title: "Deal and crib", body: "Deal six each. Each player lays two face down into the dealer's four-card crib, retaining four. Then expose a separate starter from the undealt pack. A jack starter immediately scores two for the dealer, called heels. The starter is used in counting later, not added to the running count." },
    { id: "play", title: "Pegging", body: "Non-dealer plays first. Play alternately, adding card values to a running count no greater than 31. Making 15 or 31 scores two. Matching the previous rank scores two; three consecutive equal ranks score six and four score twelve. The most recent three or more cards of consecutive ranks score their length, even if played out of order. Intervening duplicate or unrelated ranks break a run. Suits do not matter." },
    { id: "go", title: "Go and last card", body: "If you cannot play without passing 31, say go; the other player continues while able. If neither can continue below 31, the last player scores one. Exactly 31 scores two instead, never an extra one. Reset the count to zero; the opponent of the last player leads if they have cards. If only one player has cards, that player continues. The final card of the whole pegging scores one unless it makes 31. Automatic go is explained in the play log." },
    { id: "show", title: "Count the hands", body: "After pegging, count the original four kept cards with the starter. Count non-dealer first, dealer second, then dealer's crib. Each distinct group adding to fifteen scores two. Every pair scores two. Count the longest runs and their multiplicities. A hand of four in one suit scores four, or five if the starter matches. A jack held in the starter's suit scores one, called nobs. Unlike a hand, a crib flush requires all five cards in one suit." },
    { id: "tactics", title: "Tactical ideas", body: "Protect combinations in your four kept cards while considering whose crib receives your discards. Fives, pairs and neighbouring ranks can help a crib. During pegging, look for points now but consider replies that make fifteen, 31, pairs or runs. Low cards can remain playable late in a count. Opponent and guided suggestions use a public-information heuristic, not expert search." }
  ], contracts: [], variants: [
    { id: "table", title: "This table", note: "Two players to 121, with automatic counting and no muggins for missed points. Play one game at a time; skunk margins are not a separate match settlement. First dealer and starter are generated rather than physically cut." },
    { id: "other", title: "Other tables", note: "Five-card Cribbage, games to 61, partnerships, match points and muggins require different agreements. They are not selected here." }
  ]
};
