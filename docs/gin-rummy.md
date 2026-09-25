# Gin Rummy

## Rules and sources

Gin is the first draw-and-discard table, not a trick-taking variant. Parlett's
family framework is our starting point. We consulted his public
[Gin history](https://www.parlettgames.uk/histocs/ginrummy.html), not a verified
page of The Penguin Book of Card Games. Detailed play and the classic 20/10
scoring profile follow [Pagat](https://www.pagat.com/rummy/ginrummy.html).

Two players receive ten cards from a single standard pack. Non-dealer may take
or pass the opening upcard; dealer may then take or pass it. After two passes,
non-dealer draws stock. Subsequent turns draw one and discard one. A taken
upcard cannot be returned that turn. Aces are low; pictures count ten.

Sets use three or four matching ranks; runs use three or more consecutive
cards of one suit. A card cannot serve two melds. Knock with at most ten
unmatched points after discarding. Defenders can meld and lay off onto the
knocker's exposed melds. Equal or lower defending deadwood undercuts.

Gin adds 20; an undercut adds 10; otherwise score the deadwood difference.
No layoffs against gin. At two stock cards, a non-knocking discard draws the
hand without scoring. Winner deals next; drawn hands retain their dealer.
First to 100 ends the game. Add 20 per hand won and a 100 game bonus, doubled
if the loser never scored. These bonuses do not advance the 100-point target.

## Implementation

- `domain/deck.ts` extracts the existing deterministic shuffle unchanged.
- `domain/rummyMelds.ts` enumerates valid sets/runs. The existing open-source
  [javascript-lp-solver](https://github.com/JWally/jsLPSolver) 1.0.3 (Unlicense)
  solves the non-overlapping maximum-value selection. Defender melds and
  chained layoffs share one optimization; separate greedy choices are unsafe.
- `ginRummySession.ts` owns opening offers, turns, hand scoring, game completion
  and replay. It never imports UI or storage.
- `ginRummyPolicy.ts` sees only its own cards, the upcard and public pickups.
  No hidden opponent hand or stock order is passed to its decision function.
- `ginRummySave.ts` uses the shared save-store factory. Version-1 saves keep
  explicit actions, replayed and validated to rebuild state and score summaries.
  They preserve results across reloads and do not re-run a changed AI policy.
- The feature composes `savedSessionFeature`, `GameLearning`, `TablePlaySurface`
  and `CardChoiceHand`. Learn has three topics with three authored decisions
  each. Exercises use the same meld engine and never modify match saves.

## Deliberate boundaries

This is a local classic-Gin table, not certified tournament play. Meld declarations
and defensive layoffs are automatically optimized; players cannot choose a
different equally good declaration to restrict layoffs. The deterministic AI
reduces deadwood, preserves nearby cards and avoids feeding known pickups. It
knocks whenever eligible rather than conducting expert probabilistic search.
Oklahoma Gin, Big Gin, Hollywood scoring, 25-point bonuses, multiplayer, gambling
and tournament settlement are not implemented. Final points are informational;
there are no wagers. Physical iOS/Android checks are required before release.
