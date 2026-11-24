# Cribbage

## Profile

Two-player, six-card Cribbage to 121. The adding-game family follows the
Parlett framework; no edition or page citation has been verified. Rules were
cross-checked against [Pagat's six-card rules](https://www.pagat.com/adders/crib6.html).
The [American Cribbage Congress rules](https://www.cribbage.org/NewSite/rules/)
are a further tournament reference, not a claim of tournament certification.

The seed chooses whether You or Barbu has the first deal; dealer then alternates.
Both discard two to the dealer's crib. The separate starter, heels, pegging,
automatic go/reset, last card, ordered hand/crib counting and immediate finish
at 121 are active. Scores are computed, not declared by the player. No muggins,
five-card game, partnership play or multi-game/skunk settlement is implemented.

## Boundaries

- `domain/cribbage.ts` is the sole adapter to pinned
  `@johnmorrisdotca/toranpu@2.17.0` (MIT, zero transitive dependencies).
  It reuses the library's rules, counting and legal computer moves rather than
  introducing a second scoring implementation. Every counting review stops
  before the next deal becomes playable. The score advances in counting order.
- Computer discard estimates average over unseen starters and approximate the
  crib contribution; pegging values immediate combinations and avoids some
  dangerous counts. Only own cards and public running cards inform choices.
  This is a heuristic opponent, not expert tournament play.
- `persistence/cribbageSave.ts` stores the seed and validated actions, not trusted
  hand snapshots. Restore recomputes legality, scores and current review.
- `features/cribbage` composes the saved-session, Learn, card, feedback and play
  surfaces. Guided deals use separate in-memory state and never overwrite a match.
- Six topics each have three staged decisions and three distinct bounded
  reinforcements. Scoring examples use the same counter as Play. Discard advice
  is labelled as a heuristic, not the only legal choice.
- Learn and each exercise offer a compact points sheet separating pegging,
  hand/crib counting and starter bonuses. Counted hands and cribs show their
  actual fifteens, pairs, repeated runs, flush and nobs points with calculations
  and a total; lesson feedback and decision review use the same presentation data.

## Availability And Testing

Cribbage is assigned to the existing Premium entitlement and appears in configured
Premium builds or the development preview. Public builds without billing hide it.
It has not been packaged or uploaded to a store in this change. Browser
development preview: `http://localhost:1420/?preview=cribbage&tab=learn`.
Use `tab=play` to deal immediately. `seed=42` selects a deterministic initial game
when there is no saved match. Do not claim a paid release or native verification.

Run `task domain:test`, `task ui:test`, and `task build`. Domain tests cover
combinations, end conditions, ordered review, replay and lesson answers; browser
tests exercise Learn, independent and guided play on compact phone viewports.
