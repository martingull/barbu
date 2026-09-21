# TypeScript Engine Migration

Branch: `prototype/typescript-game-engine`.

The [shared club-game architecture](game-architecture.md) remains the product
requirement. Reuse factories, shared mechanics and presentation, with explicit
game-specific rules and opponent policy. This is not a mobile-shell migration.

## Current Runtime Ownership

| Area | Implementation |
| --- | --- |
| Hearts, Whist, Spades and Bridge full play, opponents, sessions and saves | TypeScript on browser and native builds |
| Hearts generated practice | Shared TypeScript generator/evaluation and structured content |
| Whist and Spades authored Learn and Practice | Shared TypeScript content and policy |
| Barbu full play | Existing native commands and TypeScript fallback |
| Bridge auction, duplicate scoring and authored practice | Shared TypeScript domain and content; native duplicate removed |
| Packaging and native integrations | Tauri/Rust shell |

There is no hosted gameplay backend. TypeScript runs locally in the browser or
phone WebView; Rust runs locally inside the native build. Svelte only presents
the domain state and dispatches actions.

## Shared Boundaries

- `src/domain/handEngine.ts`: start/transition interface, factory and selection
  registry. Hearts, Whist, Spades and Bridge are explicitly migrated. Hearts adds passing.
- `src/domain/trickTakingHand.ts`: shared hand mechanics and the existing
  TypeScript implementations. Historical Browser-prefixed names remain; they
  do not mean a second implementation exists for migrated games.
- `src/domain/heartsSession.ts`, `whistSession.ts`, `spadesSession.ts` and `bridgeSession.ts`: passing, bidding,
  scores, match completion, replay and hand history outside Svelte.
- `src/domain/reviewedHand.ts`: shared play/review gates.
- `src/domain/trickTakingRules.ts` and `heartsRules.ts`: follow-suit, trick winner,
  Hearts first-trick/lead restrictions and card points shared by play and practice.
- `src/domain/heartsPractice.ts`: seeded template selection and decision/pass
  evaluation. `content/hearts-practice.json` owns the scripted cards and prompts.
- `src/persistence/`: game-specific save validation and restoration on top of
  shared hand validation and storage factories.

Transitions do not mutate their inputs or call UI, storage or Tauri APIs.
Settlement and the next deal occur in one event to prevent double scoring.
Practice and memory exercises do not overwrite a saved match.
Table factories, catalog registration and presentation remain unchanged.

## Deduplication Completed

The Rust Hearts, Whist and Spades full-hand implementations, opponent policies,
Whist settlement, ruleset registration and Hearts passing commands are removed.
The remaining generic native commands explicitly reject migrated games rather
than silently choosing another ruleset. Remaining Barbu trump mechanics are kept.

Hearts native practice generators, evaluators, commands, passing DTO, and Svelte
fallback pools are removed too. All six topics retain three scripted decisions,
and passing retains both danger-card and long-suit patterns. Quick drill selects
one decision per explicit topic, no longer depending on inconsistent ID prefixes.
Barbu practice (including No Hearts and Hearts Trumps) remains native-backed.

The redundant frontend command-name table and the `browserHandFallback.ts`
re-export wrapper are removed. Consumers use the domain module directly.
Pure Hearts/Whist/Spades/Bridge policy, scoring and deal audits now run once in
`tests/domain` rather than once per browser viewport.

## Saves And Golden Fixtures

Existing keys and version-1 schemas remain:
`barbu.savedWhistRun.v1`, `barbu.savedHeartsRun.v1`, `barbu.savedSpadesRun.v1` and
`barbu.savedBridgeRun.v1`.
Legacy native saves resume through TypeScript regardless of their old routing
flag. Saves preserve scores, cards, hand IDs, pass selection and trick review.
Whist saves without a session mode default to a single game.

The old native shuffle differs from TypeScript. Replay reconstructs the actual
deal from remaining cards and recorded tricks instead of regenerating from a
seed. Hearts replay starts the same post-pass deal at 2C; it does not repeat
passing or settle the discarded attempt. Missing legacy turned-card metadata
is not invented from a different shuffle.

`tests/fixtures/whist-native-save.json` and `hearts-native-save.json` are frozen
snapshots captured from the former native commands. Their generation tests
passed immediately before removing the native engines on 2026-09-21. Keep these
as compatibility evidence; do not regenerate them from TypeScript to make a
failing compatibility test pass. Earlier engine code is available in git history.
The Hearts fixture covers all three passing directions plus hold.

`tests/fixtures/hearts-native-practice.json` was captured from the native commands
on 2026-09-21 before their removal. It covers three mixed seeds and four passing
seeds. Domain tests compare every card, legal choice, outcome, reason, winner,
point value, and completed trick. Only two misleading illegal-play explanations
intentionally differ: an unbroken-heart lead and a first-trick penalty discard
when a safe discard remains. Do not regenerate this fixture from TypeScript.

The practice fixture stores its 18 distinct scenarios and two passing hands once,
using card IDs instead of repeated card objects. Captured seed-order references
and the test-only `tests/fixtures/heartsPracticeFixture.ts` decoder reconstruct
all original outputs without invoking production rules. This reduced the fixture
from 8,086 lines / 226 KB to 331 lines / 25 KB without losing comparison coverage.

Migration parity is not a teaching-quality check. Pass three currently has two
introductory hands with the same QS/AH/KH recommendation and exact-match grading.
It does not yet teach a range of passing decisions or assess reasonable alternative
passes. A separate curriculum improvement should use distinct decisions and
explanations tied to hand shape and passing context, with behavior-focused tests.

Spades now owns its bidding heuristic in `src/domain/spadesBidding.ts`, settlement
in `src/spadesScoring.ts`, and match transitions in `src/domain/spadesSession.ts`.
Its twelve authored practice decisions moved unchanged to `src/spadesLessons.ts`.
New matches deal all 52 cards before any opening play; Start hand locks the bids
and advances the opening opponents. Only the player's bid is adjustable.
Locked bids are explicit hand metadata, not new data encoded in the hand ID.
Legacy saves preserve already-played opening cards; their session bids are restored
into the hand metadata. Legacy bid IDs remain readable for frozen policy fixtures.
Replay preserves the actual deal and bids, with no settlement or fresh shuffle.

`tests/fixtures/spades-native-hand.json` captures two native hands (including nil),
their thirteen player choices, and completed tricks from the native command tests
before deletion. It stores no repeated full-hand snapshots. Compare cards, winners,
scores and native reason tags; the existing TypeScript feedback adds partnership
tags that native Spades did not supply. Keep these additional tags rather than
weakening browser feedback. These two deals and the nil-policy fixture demonstrate
specific compatibility cases, not exhaustive strategy equivalence.

Policy and scoring golden fixtures remain too. They are regression cases,
not proof of expert opponent strength or exhaustive policy equivalence.
Failed storage writes report an error while keeping the current session playable;
in-memory progress cannot survive a reload until saving succeeds.

## Bridge Migration

Bridge uses the shared hand-engine registry, reviewed-hand transitions and save
store. `bridgeAuction.ts` owns legal calls, contract formation and automatic
auction turns, reusing `src/bridgeBidding.ts` for Barbu Natural. `bridgeScoring.ts`
owns duplicate settlement. `bridgeSession.ts` owns selection, calls, opening
play, replay, review and board advancement. Svelte dispatches those events.
All nine authored Bridge decisions now live in `src/bridgePractice.ts`.
A new practice/play consistency check caught the existing 1NT exercise declaring
16 HCP while its cards held only 14. Replacing its 7C with QC makes the stated
16 HCP and 1NT answer correct without changing its shape or the bidding policy.

The Rust Bridge module, DTOs, exports and four Tauri commands are removed.
Generic native hand commands explicitly reject Bridge too. No second production
auction/scoring engine is retained.

`tests/fixtures/bridge-native-rules.json` was captured from Rust before deletion.
Its 210 compact score rows cover all 2,940 level/strain/vulnerability/modifier/trick
outcomes. Eight auction sequences cover pass-out, first-strain declarer,
doubles, redoubles and overbids, with prefix legality and all four seat rotations.
The existing bidding-policy corpus passed in Rust immediately before removal
and now runs in the domain suite with the production legal-call implementation.

`bridge-legacy-save.json` captures four declaring-seat positions and their next
plays from commit `ff4e750`. Bridge card play was already TypeScript; these are
legacy installed-build save fixtures, not invented Rust hand snapshots. Card
tokens compact the JSON; `bridgeLegacy.ts` only expands tokens, never recalculates
expected results.

Saves retain their key/schema, current cards, auction, conditions and review
phase. Derived legal cards and dummy caches are rebuilt; invalid deals/auctions
are rejected. Historical board conditions are preserved, not replaced by a new
schedule mid-board. Replay now restores the same cards and contract rather than
dealing another board. Next board settles once and advances the numbered schedule;
passed-out boards score zero. Practice cannot overwrite the play session.

This preserves the existing basic bidding/cardplay system and raw duplicate
points. It does not add conventions, expert play, matchpoint or IMP comparisons.
See `docs/bridge.md` for the unchanged strength boundaries.

## Verification And Device Status

Run:

```sh
task domain:test
task core:test
task tauri:test
task build
task ui:test
task tauri:check
```

Domain tests cover golden positions, hidden-hand independence, complete deals,
legality, card conservation, moon scoring, rubber completion, saved native hands,
replay, invalid saves and storage failures. Browser tests simulate native
runtime presence and verify that Hearts/Whist/Spades/Bridge full play and Hearts practice never
invoke Rust. Each Hearts practice topic completes all three decisions in both
browser and simulated-native modes. Native adapter tests reject migrated games
and complete the remaining contracts.

Spades migration verification on 2026-09-21: 51 domain tests, 121 Rust tests,
production build and native check passed. The full six-viewport browser run passed
826 tests with 20 existing skips. After final dispatch cleanup, 40 focused browser
checks passed; the shared three-game layout matrix exhausted its total 30-second
budget. Splitting that matrix into one test per game retained every viewport and
assertion, and all three passed independently. No gameplay layout change was needed.

Bridge migration verification on 2026-09-21: 67 domain tests, 107 remaining Rust
tests, production build and native check passed. The broad six-viewport browser
run had 805 passes, 30 project-specific skips and five failures: four obsolete
auction-less completion fixtures and one catalog-load timeout. After correcting
the fixtures, all 30 migration/completion checks passed. The final Bridge run,
including practice and layout coverage, passed 85 checks with five project-specific
skips across all six viewports. Screenshots were inspected on iPhone XR, iPhone 16
and compact Galaxy S9 layouts. This migration has not yet had a physical-device
build or smoke check.

Whist was installed on iPhone 16 on 2026-09-21 and the user confirmed it works.
The subsequent Hearts build was installed, but its automatic launch was blocked
by the screen lock. This deduplication change still needs a fresh device build
and physical smoke check before release. No store package has been published.

Try browser mode: Hearts, Whist, Spades or Bridge > Play, play cards, reload, then Continue.
For Spades, toggle Adjust bid / Show cards and change your bid before Start hand.
Replay should preserve the deal; Next hand/board should settle it only once.
For Bridge, complete the auction, Start play, and reload during a dummy turn or
trick review. Continue Bridge should restore that exact phase.
Also check Hearts > Practice > each topic, including Pass three and Quick drill.
Browser mode now exercises the same Hearts practice logic as the installed build;
it is still not a physical-device packaging test.

## Next Migration Work

1. Migrate Barbu contracts/generated practice, then Domino. Keep Domino's layout state
   separate from trick-taking hands.
2. Remove each obsolete engine and dispatch route after verifying its replacement;
   retain regression fixtures rather than permanent parallel engines.
3. Evaluate another mobile shell separately, only if it brings a clear benefit.

Rust remains required for the current shell, Barbu practice and unmigrated games.
The gameplay/practice cleanup is complete for Hearts, Whist, Spades and Bridge, not for the whole catalog.
