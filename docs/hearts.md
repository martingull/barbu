# Hearts Table Baseline

Barbu's Hearts table uses four-player Black Lady with independent seats, not
partnerships. Each player receives 13 cards. Passing rotates left, right,
across, then hold. The holder of 2C opens with that card. Players follow suit
when possible; the highest card of the led suit wins, with no trumps.

The first trick disallows penalty discards when a nonpenalty alternative exists.
Hearts cannot be led until a heart has been played, unless only hearts remain.
An all-heart lead also breaks hearts. Followers must still follow hearts when
able; a player with no hearts may discard another suit. Once hearts are broken,
the next leader may choose any suit, not necessarily hearts.
The queen of spades alone does not break hearts. Each heart scores one penalty
point and the queen of spades scores 13. Taking all 26 scores zero for that
player and 26 for each opponent. After a complete hand, reaching 100 or more
ends the match; the lowest score wins, with joint winners on a tie.

This is the documented 2C-opening product variant, rather than an assertion
that every club uses the same conventions. Bonus jacks, locked danger spades,
alternative moon settlements, and other house rules are not active.

## Computer Play

`HeartsPosition` contains only the acting player's hand, legal cards, and public
trick history. It does not expose other concealed hands or distinguish a human
opponent from a computer opponent. Publicly demonstrated voids and played high
cards inform leads and danger management.

The policy ducks loaded tricks where possible, disposes of high cards safely in
fourth seat, avoids exposing high spades while the queen is outside its hand,
and discards the queen against any opponent. Passing considers suit length,
unprotected high spades, high hearts, and opportunities to create a void instead
of automatically discarding low hearts.

Moon defense starts when one player has captured all penalties so far, totalling
at least eight points. A computer player pursues its own possible moon only with
at least two controlling hearts or at least 20 captured points. These thresholds
are teaching heuristics, not rules or evidence of expert strength. Authored
passing exercises retain their scenario-specific recommendations.

## Passing Practice

Pass three contains three full-hand decisions: remove exposed high spades,
preserve low exits, and create a diamond void. Each gives a defensive objective
and explains the selected pass. The low-exits hand also accepts passing the queen
with both diamonds as an alternative to passing the queen and high hearts.
Other legal passes are labelled risky for the exercise's plan, not illegal or
universally wrong. Incoming cards can refill a void or change the hand's risks.
These replace the two legacy exercises that both required QS, KH and AH.

## Remaining Strength Gaps

- Match-score-aware decisions, including late-match risk and leader targeting.
- Pass-direction-sensitive planning and memory of cards passed to another seat.
- Stronger inference about unseen cards and lookahead over plausible deals.
- More deliberate moon planning and tactical review by experienced club players.

The rules support a complete local match, but the deterministic opponents should
not yet be described as expert or validated club-strength players.

## Implementation And Verification

- Shared browser/native gameplay: `src/domain/heartsPolicy.ts`, `src/domain/handEngine.ts`,
  and `src/domain/trickTakingHand.ts` on the TypeScript prototype branch.
- The duplicate Rust full-hand engine and opponent policy have been removed.
- Match progression: `src/domain/heartsSession.ts`; legacy save compatibility:
  `src/persistence/heartsSave.ts`. Replay restarts the actual post-pass deal.
- Practice uses shared TypeScript domain logic and structured content on browser and native builds.
- Shared tactical and passing cases: `tests/fixtures/hearts-*.json`.
- Tactical cases rotate through every seat to catch seat-dependent behavior.
- Domain tests audit 256 complete deals, covering every
  pass direction, legality, trick winners, and conservation of cards and points.
- Existing match tests cover the 100-point boundary, moon scoring, ties, saves,
  and completion announcements.

Legacy native saves use a different shuffle. Frozen native-save snapshots test
continuation and replay without retaining the old Rust engine.
Run `task domain:test`, `task ui:test`,
`task build`, and `task tauri:check`.
Browser coverage does not replace a signed physical-device smoke test.
