# Hearts Table Baseline

Barbu's Hearts table uses four-player Black Lady with independent seats, not
partnerships. Each player receives 13 cards. Passing rotates left, right,
across, then hold. The holder of 2C opens with that card. Players follow suit
when possible; the highest card of the led suit wins, with no trumps.

The first trick disallows penalty discards when a nonpenalty alternative exists.
Hearts cannot be led until a heart has been discarded, unless only hearts remain.
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

## Remaining Strength Gaps

- Match-score-aware decisions, including late-match risk and leader targeting.
- Pass-direction-sensitive planning and memory of cards passed to another seat.
- Stronger inference about unseen cards and lookahead over plausible deals.
- More deliberate moon planning and tactical review by experienced club players.

The rules support a complete local match, but the deterministic opponents should
not yet be described as expert or validated club-strength players.

## Implementation And Verification

- Native policy: `crates/barbu-core/src/hearts.rs`; integration: `hand.rs`.
- Browser mirror: `src/heartsPolicy.ts`; integration: `browserHandFallback.ts`.
- Shared tactical and passing cases: `tests/fixtures/hearts-*.json`.
- Tactical cases rotate through every seat to catch seat-dependent behavior.
- Rust audits 512 complete deals and browser tests audit 256, covering every
  pass direction, legality, trick winners, and conservation of cards and points.
- Existing match tests cover the 100-point boundary, moon scoring, ties, saves,
  and completion announcements.

Rust and browser shuffles differ. Identical positions in shared fixtures, not
identical numeric deal seeds, are the cross-runtime policy comparison boundary.
Run `task core:test`, `task ui:test`, `task build`, and `task tauri:check`.
Browser coverage does not replace a signed physical-device smoke test.
