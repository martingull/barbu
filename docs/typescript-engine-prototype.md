# TypeScript Engine Migration

Branch: `prototype/typescript-game-engine`.

The [shared club-game architecture](game-architecture.md) remains the product
requirement. Reuse factories, shared mechanics and presentation, with explicit
game-specific rules and opponent policy. This is not a mobile-shell migration.

## Current Runtime Ownership

| Area | Implementation |
| --- | --- |
| Hearts and Whist full play, opponents, sessions and saves | TypeScript on browser and native builds |
| Hearts generated practice | Rust generators on native builds; existing browser fallback |
| Whist authored Learn and Practice | Shared TypeScript content and policy |
| Barbu and Spades full play | Existing native commands and TypeScript fallback |
| Bridge | Existing TypeScript hand play plus native/fallback bidding helpers |
| Packaging and native integrations | Tauri/Rust shell |

There is no hosted gameplay backend. TypeScript runs locally in the browser or
phone WebView; Rust runs locally inside the native build. Svelte only presents
the domain state and dispatches actions.

## Shared Boundaries

- `src/domain/handEngine.ts`: start/transition interface, factory and selection
  registry. Only Hearts and Whist are explicitly migrated. Hearts adds passing.
- `src/domain/trickTakingHand.ts`: shared hand mechanics and the existing
  TypeScript implementations. Historical Browser-prefixed names remain; they
  do not mean a second implementation exists for migrated games.
- `src/domain/heartsSession.ts` and `whistSession.ts`: passing/dealer rotation,
  scores, match completion, replay and hand history outside Svelte.
- `src/domain/reviewedHand.ts`: shared play/review gates.
- `src/persistence/`: game-specific save validation and restoration on top of
  shared hand validation and storage factories.

Transitions do not mutate their inputs or call UI, storage or Tauri APIs.
Settlement and the next deal occur in one event to prevent double scoring.
Practice and memory exercises do not overwrite a saved match.
Table factories, catalog registration and presentation remain unchanged.

## Deduplication Completed

The Rust Hearts and Whist full-hand implementations, opponent policies,
Whist settlement, ruleset registration and Hearts passing commands are removed.
The remaining generic native commands explicitly reject migrated games rather
than silently choosing another ruleset. Spades retains its needed partnership
and trump mechanics without misleading Whist-specific helper names.

The native practice generators do not depend on these removed engines, so no
practice pool was replaced or reduced. Migrating generated practice remains
explicitly separate work, including its evaluation rules and browser fallback.

The redundant frontend command-name table and the `browserHandFallback.ts`
re-export wrapper are removed. Consumers use the domain module directly.
Pure Hearts/Whist policy, scoring and deal audits now run once in
`tests/domain` rather than once per browser viewport.

## Saves And Golden Fixtures

Existing keys and version-1 schemas remain:
`barbu.savedWhistRun.v1` and `barbu.savedHeartsRun.v1`.
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

Policy and scoring golden fixtures remain too. They are regression cases,
not proof of expert opponent strength or exhaustive policy equivalence.
Failed storage writes report an error while keeping the current session playable;
in-memory progress cannot survive a reload until saving succeeds.

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
runtime presence and verify that Hearts/Whist full play never invoke Rust.
Native adapter tests reject migrated games and complete the remaining contracts;
native Hearts practice is checked separately.

Whist was installed on iPhone 16 on 2026-09-21 and the user confirmed it works.
The subsequent Hearts build was installed, but its automatic launch was blocked
by the screen lock. This deduplication change still needs a fresh device build
and physical smoke check before release. No store package has been published.

Try browser mode: Hearts or Whist > Play, play cards, reload, then Continue.
Replay should preserve the deal; Next hand should settle it only once.
Also check Hearts > Practice. Browser testing is not a native-generator or
physical-device test.

## Next Migration Work

1. Migrate generated Hearts practice and its evaluation without reducing variety,
   then remove its native/fallback duplication.
2. Migrate Spades, then Bridge, one at a time using these shared boundaries.
3. Remove each obsolete engine and dispatch route after verifying its replacement;
   retain regression fixtures rather than permanent parallel engines.
4. Evaluate another mobile shell separately, only if it brings a clear benefit.

Rust remains required for the current shell, practice and unmigrated games.
The full-play cleanup is complete for Hearts and Whist, not for the whole catalog.
