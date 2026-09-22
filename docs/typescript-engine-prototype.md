# TypeScript Engine Migration

Branch: `prototype/typescript-game-engine`.

The [shared club-game architecture](game-architecture.md) remains the product
requirement. Reuse factories, shared mechanics and presentation, with explicit
game-specific rules and opponent policy. This is not a mobile-shell migration.

## Current Runtime Ownership

| Area | Implementation |
| --- | --- |
| Hearts, Whist, Spades and Bridge full play, opponents, sessions and saves | TypeScript on browser and native builds |
| Hearts and Barbu generated practice | Shared TypeScript generators/evaluation and structured content |
| Whist and Spades authored Learn and Practice | Shared TypeScript content and policy |
| Barbu six trick-taking full hands and opponents | Shared TypeScript hand factory, rules and policy |
| Barbu seven-contract run and saves | TypeScript session and save adapter using shared factories |
| Domino full hands | Shared TypeScript layout engine and save validation |
| Bridge auction, duplicate scoring and authored practice | Shared TypeScript domain and content; native duplicate removed |
| Packaging and native integrations | Tauri/Rust shell |

There is no hosted gameplay backend. TypeScript runs locally in the browser or
phone WebView; Rust runs locally inside the native build. Migrated sessions keep
Svelte focused on presentation and action dispatch, including Barbu's seven-contract run.

## Shared Boundaries

- `src/domain/handEngine.ts`: start/transition interface, factory and selection
  registry. All trick-taking contracts are migrated. Hearts adds passing.
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
- `src/domain/barbuPractice.ts`: seeded rank/suit generation and decision evaluation
  from `content/barbu-practice.json`; shares points and placement rules with
  TypeScript hand play through `barbuRules.ts` and `dominoRules.ts`.
- `src/persistence/`: game-specific save validation and restoration on top of
  shared hand validation and storage factories.

Transitions do not mutate their inputs or call UI, storage or Tauri APIs.
Settlement and the next deal occur in one event to prevent double scoring.
Practice and memory exercises do not overwrite a saved match.
Table factories, catalog registration and presentation remain unchanged.

## Deduplication Completed

The Rust Hearts, Whist and Spades full-hand implementations, opponent policies,
Whist settlement, ruleset registration and Hearts passing commands are removed.
Barbu's six trick-taking engines, contract policies and ruleset dispatcher are
also removed, along with the generic native hand commands and DTOs. Domino's
native engine, command adapters and browser fallback have now been removed too.

Hearts native practice generators, evaluators, commands, passing DTO, and Svelte
fallback pools are removed too. All six topics retain three scripted decisions,
and passing retains both danger-card and long-suit patterns. Quick drill selects
one decision per explicit topic, no longer depending on inconsistent ID prefixes.
Barbu practice (including No Hearts, Hearts Trumps and Domino decisions) is now
TypeScript too. No full-hand gameplay still uses native commands.

The redundant frontend command-name table and the `browserHandFallback.ts`
re-export wrapper are removed. Consumers use the domain module directly.
Pure Hearts/Whist/Spades/Bridge policy, scoring and deal audits now run once in
`tests/domain` rather than once per browser viewport.

## Saves And Golden Fixtures

Existing keys and version-1 schemas remain:
`barbu.savedWhistRun.v1`, `barbu.savedHeartsRun.v1`, `barbu.savedSpadesRun.v1` and
`barbu.savedBridgeRun.v1`. Barbu retains `barbu.savedPlayRun.v1`.
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
Generic native hand commands have since been removed too. No second production
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

## Barbu Practice Migration

`content/barbu-practice.json` preserves the four existing patterns for each of
the seven contracts. Ordered random draws, dependent suits and Domino lane
ranks retain the native 64-bit generator. Pools still contain 28 decisions;
Quick drill chooses one per contract and focused practice uses all four patterns.
This is not a replacement with a smaller fixed authored pool, nor a new curriculum.

`tests/fixtures/barbu-native-practice.json` was captured from native Tauri DTOs
at `0aa6451` on 2026-09-21 before removing `practice.rs` and its command adapters.
It retains readable seed-0 outputs for all 28 patterns, plus SHA-256 checks of
eight complete seeded pools and eight standalone follow-suit scenarios, including
large safe-integer seeds. Hash input is recursively key-sorted JSON excluding
explanations. Do not regenerate expected results from TypeScript.
Copy is compared separately across the 28 readable scenarios, with two explicit
corrections: off-suit discards no longer claim to follow suit, and losing on-suit
plays in Hearts Trumps no longer claim the player is void.

The native generator, browser generator mirror, practice DTOs and commands are
removed. An unused Svelte generated-lesson route and its Tauri-required error
state were also deleted. Domino practice uses the shared custom-table slot so
its progress row does not fall behind the bottom controls.

No save schema or opponent policy changes were included in the practice migration.

## Barbu Trick-Hand Migration

All six trick contracts now register through `createHandEngine` and share the
same TypeScript implementation on browser and native builds. `barbuPolicy.ts`
owns contract-specific choices using only the acting hand and public play;
`barbuRules.ts` supplies the same points used by generated practice. Native
rank/suit policy tie-breaking is preserved independently of display ordering.
This changes tied choices in the former browser fallback to match native play.

`barbuHandSave.ts` reuses standard trick-hand validation, checks Barbu scores and
winners, and rebuilds derived fields. Old native routing flags no longer select
a different engine. Review state remains intact. Replay recovers the actual deal
instead of redealing from a seed, and clears the replayed contract's run result.
New run hands are saved immediately, before the first card is selected.
Completed-hand prompts now use the final score rather than the previous trick's
cached total.

`tests/fixtures/barbu-native-hands.json` was captured from native commands before
deleting `hand.rs`, `contract_policy.rs`, `ruleset.rs` and their Tauri adapters.
It stores 18 compact initial/final hands (three seeds per contract), the 13 player
choices for each, and SHA-256 digests of all intermediate states. The test-only
decoder/projection lives in `tests/fixtures/barbuHandFixture.ts`. Hashes cover
remaining cards, legal choices, turns, trick winners, scores, outcomes and tags,
excluding copy, IDs and display ordering. Do not regenerate from TypeScript.

The subsequent session migration below moves seven-contract progression and save
orchestration out of Svelte; it is separate from the hand-engine migration.
The fixed-order training-run product limitation remains unchanged.

## Domino Hand Migration

`dominoHand.ts` owns immutable start, placement, pass and replay transitions.
It shares placement legality with practice while retaining its own lane state,
not forcing Domino into a trick-taking model. `dominoPolicy.ts` preserves the
native lexicographic priorities, replacing the browser's weighted approximation.
The existing policy still consults the next player's hidden hand; this migration
does not claim public-information-only or expert opponents.

`dominoSave.ts` validates all 52 cards, contiguous lanes, finish order and original
ownership, then rebuilds cached legality, scores and prompts. New saves carry
`initialHands`. Legacy native and browser IDs recover their respective original
deals, so replay preserves the actual cards despite their different shuffles.
The old browser shuffle remains only for save compatibility, not parallel play.
Unknown or corrupt deals are rejected. The version-1 save key is unchanged.
Final prompts now use the final score instead of the previous cached score.

`tests/fixtures/domino-hands.json` freezes 12 native hands from `fdaf35e` before
deletion: seeds 0, 1, 8 and 42 at starting ranks 7, 9 and A. Compact initial,
mid-hand and final snapshots plus SHA-256 projections check every transition.
Three old browser saves verify restore and replay compatibility. Do not regenerate
expected values from the new engine. Separate property checks finish 96 deals.

Domino now uses the shared flow table layout. Feedback sits after the suit lanes
and before the hand instead of overlapping lanes through fixed viewport offsets.
Browser checks cover restore, reload, pass, completion, replay and layout in both
browser and simulated-native runtimes. Physical-device upgrade testing remains.

## Barbu Session Migration

`barbuSession.ts` owns the fixed-order run, deterministic per-contract seeds,
review gates, result recording, replay and advancement. Trick contracts reuse
`transitionReviewedHand`; Domino retains its lane engine. The last card records
one result per contract. Replay removes only the current result and retains the
deal. A finished seven-contract session rejects further gameplay events; New game
creates a fresh session. This does not add dealer-selected contracts or doubling.

`barbuSave.ts` reuses the storage factory and both hand validators. Version-1 saves
retain their key and routing metadata for compatibility, but the flags no longer
choose an engine. Restoration repairs derived hand caches and missing active-hand
completion results, rejects duplicate/malformed results and mismatched contracts,
and preserves review and intro phases. Practice does not overwrite the run.
Svelte now holds one session reference, dispatches actions and handles presentation.
Failed writes leave play available, report an error and retry on the next action.
The same eight seeded sessions are tested through every save/restore transition;
existing frozen hand fixtures provide compatibility evidence without new large
snapshot files.

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
invoke Rust. Barbu practice tests cover all four decisions per focused contract
and the mixed seven-contract drill in browser and simulated-native modes.
Each Hearts practice topic completes all three decisions in both modes. Native
gameplay adapters are removed; remaining Rust tests cover legacy shared helpers.

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

Barbu practice migration verification on 2026-09-21: all 73 domain tests,
69 remaining core tests, two native adapter tests, production build and native
check passed. All 84 new practice browser checks passed across six phone profiles.
The broader table/lesson suite had 410 passes, 30 project-specific skips and four
initial-page-load timeouts in the WebKit Hearts Trumps hand check. Isolated reruns
of that check passed on all six profiles with the original timeout. Screenshots
confirmed the corrected Domino progress placement on Galaxy S9. No physical-device
build or installation was performed for this pass.

Barbu trick-hand migration verification on 2026-09-21: all 82 domain tests,
16 remaining core tests, one native Domino adapter test, production build and
native check passed. Native fixtures match all 234 player transitions across
18 hands, including actual-deal replay. All 156 migration/table browser checks
and 30 card-counting/memory checks passed across six phone profiles. These
include mock-native runs that reject gameplay command calls, saved review/resume,
and complete seven-contract runs. S9 review and iPhone 16 active-hand screenshots
were inspected. The existing large-bundle build warning remains. No physical
device build, installation or store upload was performed for this pass.

Domino migration verification on 2026-09-21: all 90 domain tests, 11 remaining
Rust helper tests, production build and native check passed. The native test
target builds but contains no command tests now that gameplay adapters are gone.
All 90 focused browser checks passed across six phone profiles, including full
seven-contract runs and simulated-native save upgrades. Layout checks also resize
to 320x568 and desktop width. An initial run caught obsolete 24px Domino spacing
assertions; these now enforce the shared 8px flow spacing alongside lane/message/
hand/control collision checks. S9, XR and iPhone 16 screenshots were inspected.
The existing large-bundle warning remains. No physical build or install was done.

Barbu session migration verification on 2026-09-22: all 95 domain tests, 11 Rust
helper tests, production build and native check passed. The initial broad S9 run
passed 95 browser tests. The six-profile migration/completion suite passed 232
checks with two S9 timeouts during a long runtime pause; both passed in isolation
with unchanged limits. All six complete seven-contract browser runs then passed.
Coverage includes storage-failure recovery and practice/save isolation. iPhone 16
review screenshots were inspected. No physical build, installation or store
upload was performed; the existing large-bundle warning remains.

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
For Barbu, use Practice > Quick drill or one of the fixed contract drills. The
same generator now runs in browser and installed builds, including Domino decisions.
Also use Barbu > Play > Play Barbu > Start hand, reload and Continue Play Barbu,
then finish a hand and Replay. The same cards should return, with that attempt's
score removed from the run total. All six trick-taking contracts use TypeScript.
For Domino, use Barbu > Practice > Full hand practice > Domino. Place legal cards
or Pass until the hand ends, then Replay: the original deal should return. In a
Play Barbu run, reload mid-Domino and Continue Play Barbu to resume the same lanes.
Browser mode now exercises the same Hearts practice logic as the installed build;
it is still not a physical-device packaging test.

## Next Migration Work

1. Audit remaining legacy Rust helpers/catalog metadata and remove unused code;
   retain regression fixtures rather than permanent parallel engines. Verify
   installed-save upgrades on physical iPhone and Android builds before release.
2. Evaluate another mobile shell separately, only if it brings a clear benefit.

Rust remains required for the Tauri shell, not gameplay engines. Full-hand and
practice engines and gameplay sessions are TypeScript, with domain/persistence
boundaries shared across the catalog. Remaining Rust cleanup and physical-device
upgrade testing are not implied by browser verification.
