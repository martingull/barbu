# Shared Club-Game Architecture

## Product Commitment

Barbu is a growing catalog of club-quality card games, not a collection of
independently implemented screens. Templates, factories, shared presentation,
and consistent domain boundaries must make each additional game easier to add
and maintain. This commitment survives a change of language or mobile shell.

David Parlett's *The Penguin Book of Card Games* is the starting reference for
rules, terminology, and game families. For each game, record the chosen variant,
source details available to us, intentional departures, and simplifications in
`docs/<game>.md`. Do not invent book citations or assume all clubs use one ruleset.
Write original teaching material. Learn (including exercises) and Play must agree on the
chosen rules, scoring, and table conventions.

## Implementation Pattern

| Responsibility | Existing reference | Expectation |
| --- | --- | --- |
| Catalog and table metadata | `src/tableFactory.ts`, `src/games/whist.ts` | Use the factory and per-game definitions, not copied table markup. |
| Registration | `src/gameRegistry.ts`, `src/games/index.ts` | Register metadata through the existing registry. |
| Presentation | `GameTableShell`, `LearnPanel`, `CourseLesson`, `PlayTabPanel`, `TablePlaySurface`, `CardChoiceHand` | Reuse Learn/Play navigation, cards, selection, feedback, and responsive layout. |
| Hand rules and actions | `src/domain/handEngine.ts` | Keep deterministic transitions independent of UI, storage, and Tauri. |
| Match progression | `src/domain/whistSession.ts` | Own settlement, dealer rotation, replay, completion, and review state outside Svelte. |
| Persistence | `src/persistence/whistSave.ts` | Validate and restore saves through an adapter; preserve compatibility or explicitly migrate it. |
| Learning content | `content/`, `src/lessons/`, per-game lesson modules | Use structured content and the same rules as full play. |

Whist, Hearts, Spades and Bridge now use these TypeScript domain boundaries. They share the
hand-engine factory and registry, reviewed-hand transitions, storage factory,
standard trick-hand save validation, and seat-score primitives. Game-specific
session transitions and settlement remain explicit.
The Hearts, Whist and Spades Rust full-play implementations are removed. Their legacy
native saves are frozen compatibility fixtures, not a reason to retain a second
engine. Hearts practice uses `src/domain/heartsPractice.ts` with structured templates
in `content/hearts-practice.json`. Its legality and points reuse full-play rules;
frozen native outputs verify all 18 decisions and both passing patterns.
Spades uses the same hand, review and save factories, with bidding and settlement
in domain modules and its twelve authored decisions in `src/spadesLessons.ts`.
Bridge adds auction and duplicate-scoring domain modules, a board session, and a
version-1 save adapter. Its native auction/scoring mirror is removed. Replay
restores the actual deal and contract; Next board commits one result, including
a zero-point passed-out board. Its authored decisions live in `src/bridgePractice.ts`.
Barbu generated practice now follows the same domain/content split in
`src/domain/barbuPractice.ts` and `content/barbu-practice.json`. Four seeded
patterns per contract retain dynamic rank/suit choices. Scoring and Domino
placement share TypeScript play primitives. Barbu's six trick-taking contracts now
use the hand factory too, with a separate `barbuPolicy.ts` and a `barbuHandSave.ts`
compatibility boundary. Their Rust engine and generic native hand commands are
removed. Domino now uses `dominoHand.ts`, `dominoPolicy.ts` and `dominoSave.ts`,
sharing the start/transition pattern but retaining its own layout state and
placement rules. Native fixtures verify deal and policy compatibility; the
Rust engine and browser fallback are removed. `barbuSession.ts` owns the fixed-order
seven-contract progression, result recording, review and replay; `barbuSave.ts`
validates and restores the existing version-1 run through the save-store factory.
Svelte dispatches events and presents the resulting session, just as for Whist.
The unused `barbu-core` crate and `current_game` metadata command are removed.
Rust now owns only Tauri startup and the native privacy-policy opener. Future
game rules belong in the shared TypeScript domain, not new native command routes.
The metadata registry remains separate from engine selection. These references
do not imply that every game can be added using configuration alone.

Share deck, deal, turn-order, legality, and trick mechanics where appropriate.
Keep each game's objectives, opponent policy, bidding, scoring, and variants
explicit. Hearts avoidance must not inherit Whist's trick-winning strategy.
Rummy-family games should reuse cards and presentation where useful, not be
forced into a trick-taking state model.

Extract shared behavior when another real game needs it. Prefer composition and
small interfaces over a universal engine full of game-name conditionals. Do not
replace copy-pasted screens with copy-pasted session or save implementations.

## New-Game And Migration Checklist

1. Document the object, players, cards, deal, turn order, legal actions, scoring,
   ending conditions, selected variant, and remaining club-play limitations.
2. Identify the game family and existing mechanics to reuse. State which domain
   runtime owns it; keep browser and native behavior consistent and testable.
3. Add a definition under `src/games/`, register it, and add catalog metadata.
   Keep incomplete games marked as planned rather than exposing unfinished play.
4. Implement or adapt the hand and session boundaries. Keep rules and settlement
   out of `App.svelte`; wire only the required presentation and user actions.
5. Add save validation, resume, replay, and compatibility tests. Ensure advancing
   a completed hand cannot score it twice, and practice cannot overwrite a match.
6. Add guided lessons and topic exercises to the shared Learn panel. Use
   `CourseLesson` for concept/example/review and `TablePlaySurface` with
   `flowLayout` for decisions. Keep course-progress keys stable. Preserve
   generated practice behavior during migration rather than silently replacing it.
7. Test legality, conservation where applicable, scoring, completion, and opponent
   information limits. Add native/TypeScript comparison fixtures during migration.
8. Exercise catalog, Learn topics and guided lessons, Play, save/resume, and completion in browser
   tests. Check small-screen layouts and a physical-device upgrade before release.
9. Record what is migrated, what remains native, and which limitations remain.
   Remove legacy implementations and dispatch routes after their replacements
   are verified. Keep golden fixtures; do not maintain two production engines.

See [the prototype record](typescript-engine-prototype.md) for the migration's current
scope and verification commands. Use this checklist as a review gate for future
games, not as a requirement to build speculative abstractions in advance.
