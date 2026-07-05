# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Barbu is an iPhone-first card-game app for learning, practicing, and exploring classic card games. The first curriculum is Barbu in the Hearts family of card games, with room to expand to more games later.

The product concept is that the player learns by sitting down against Barbu, a "King of Cards" figure who introduces games, sets contracts, reacts to play, and gradually raises the difficulty. Treat this persona as a teaching and progression device, not as an excuse to hide rules or make the interface theatrical at the cost of clarity.

Treat Barbu as the first game in a broader card-game catalog, not as the permanent product boundary. Hearts is the second active starter table, using shared Hearts-family and trick-taking foundations rather than a cloned implementation. Favor structures that can later support other Hearts variants, then other families such as Whist and Bridge.

Hearts is the current Hearts-family starter game, in the Black Lady style: rotate the pass left, right, across, and hold, then play local hands with hearts and the queen of spades as penalties until one seat reaches a 100-point target. The current opening convention is intentionally the Wikipedia-style Hearts rule where the holder of 2C leads 2C to the first trick; treat that as a documented product choice rather than a Parlett-derived assumption. Source note: Wikipedia, "Hearts (card game)", Modern rules, Minor rule variants, https://en.wikipedia.org/wiki/Hearts_(card_game)#Minor_rule_variants. Shooting the moon is active as a match scoring rule: all 26 hand points captured by one seat score 0 for that seat and 26 for every other seat. The queen of spades is passable by default; locked danger spades and bonus-jack rules are later house-rule variants unless explicitly requested. Document simplifications clearly instead of hiding them.

Keep the game-object distinction explicit when changing rules or opponent policy. Barbu is a contract trick-taking game: each deal is governed by the selected contract, and contracts may reward taking tricks, avoiding tricks, avoiding specific cards, using trumps, or building the Domino layout. Hearts is a trick-avoidance penalty game: the normal objective is to avoid winning hearts and the queen of spades unless a deliberate shoot-the-moon plan is in progress. Use Black Lady for the game/style label and queen of spades for the card. Do not copy a "win the trick" or "take control" policy from Barbu into Hearts without checking whether it makes sense for a penalty-avoidance game.

This is intended as a real App Store product, not a throwaway learning project. Code changes should keep maintainability, automated verification, product polish, and eventual monetization in mind.

Use David Parlett's *The Penguin Book of Card Games* as the starting rules and description reference for supported games. When the app models a game, its rules, terminology, deal, play direction, scoring, and variants should start from Parlett unless a deliberate product variant is documented.

The app should teach games as structured knowledge and guided play, not as static rule pages. Use a hybrid learning model inspired by strong mobile chess tutors: short explanations, immediate card decisions, feedback tied to the decision, generated drills, and visible progression through mastery levels. Favor a progression like:

1. Concepts
2. Examples
3. Guided tricks or hands
4. Practice
5. Review

Use Parlett's organization as the source structure for the reference layer, but write original explanations and app copy. A game reference should be structured around object, players, cards, deal, play, scoring, variants, and tactical ideas. The guided learning layer should translate that reference material into interactive decisions.

## Learning Experience

The primary learning loop is: play first, get fast feedback, read a tiny explanation, repeat, then use reference material only when needed. The product should feel closer to Duolingo or a strong chess tutor than to a rulebook: active, short, progressive, and lightly playful. Do not let reference pages or technical correctness move the main lesson path away from card decisions.

Keep learner-facing outcome labels simple: `good`, `risky`, `penalty`, and `illegal`. Preserve deeper explanation through structured reason tags such as `followed_suit`, `avoided_penalty`, `captured_penalty`, `won_clean_trick`, `void_discard`, and `off_suit`. The outcome is for fast feedback; the reason tag is for review, explanations, and future AI tutor behavior.

## Stack

- Rust workspace for deterministic game logic.
- `crates/barbu-core` for cards, rules, scoring, lesson primitives, generated practice, and tests.
- Tauri 2 app shell under `src-tauri`.
- Svelte + TypeScript frontend under `src`.
- Structured local game content under `content`.

Keep game logic independent of the UI. The frontend may present and explain rules, but rule validation, scoring, trick resolution, and reusable lesson state should live in Rust where practical.

## Architecture

- Put reusable card and rules code in `crates/barbu-core`.
- Share low-level card-table mechanics across games: deck, deal, turn order, follow-suit legality, trick winner, played-card memory, scoring primitives, and compact table presentation.
- Keep game policy separate by game or contract. Barbu contract policy, Hearts/Black Lady avoidance policy, Domino layout policy, and future Whist/Bridge policies should call shared primitives but make their own decisions about winning, ducking, dumping danger cards, preserving trumps, or taking control.
- When improving opponents, first identify the game objective being optimized. Barbu may need contract-specific reward or avoidance behavior; Hearts normally needs penalty avoidance, queen-of-spades danger management, and moon-defense behavior.
- Put generated practice logic in Rust, not in the Svelte component layer.
- Model the Barbu/King-of-Cards teaching persona as content or lesson metadata where possible, not as scattered hardcoded strings.
- Keep guided lessons in catalog-like modules so more games and families can be added without rewriting the interaction surface.
- Keep Tauri command handlers thin; they should adapt app requests to core APIs.
- Keep Svelte components focused on presentation and interaction.
- Treat `content/` as structured source material for lessons and game metadata.
- Do not hardcode large rule prose into UI components when it belongs in content or core lesson data.
- Do not scatter future premium/entitlement checks across components. Keep monetization access decisions centralized when that layer is added.

## Frontend Table Pattern

Use `src/tableFactory.ts` as the first stop when adding or changing a game table. The factory is the source of truth for:

- catalog entries and free/pack access labels
- the shared `Learn | Practice | Play | Pro` tab metadata
- table title, family, reference id, scorecard direction, and default tab
- learn path step metadata
- practice entry and practice group metadata

`src/App.svelte` should consume that metadata through the shared table shell before adding game-specific behavior. Barbu and Hearts currently demonstrate the intended split:

- render the topbar and tab rail from `gameTableDefinitions` and `tableTabsFor`
- render Learn with `LearnPanel`
- render Practice with `PracticePanel`
- keep Play bodies in `App.svelte` only when they need game-specific state, saved games, or full-hand actions
- keep Pro bodies in `App.svelte` only when they launch paid AI/opponent-play or competitive-play affordances

When starting Whist, do not copy the Barbu or Hearts table markup wholesale. Add Whist metadata to `tableFactory.ts`, then add the smallest route/view glue in `App.svelte`:

1. add the Whist catalog/table id and `gameTableDefinitions.whist`
2. add `whistLearnPathSteps` and `whistPracticeGroups`
3. add active tab state and `openWhistTable`
4. render Whist Learn through `LearnPanel`
5. render Whist Practice through `PracticePanel`
6. add only Whist-specific Play actions that cannot live in factory data
7. add Playwright smoke coverage for catalog navigation, Learn, Practice, Play, and any Pro entry

If a new table needs a visual layout already used by Barbu or Hearts, extract a shared Svelte component or snippet before adding another large inline branch. If the new behavior is game rules, scoring, generated practice, or opponent policy, prefer `crates/barbu-core` or a browser fallback module rather than embedding it in the table UI.

## UI Direction

The app is a learning tool, not a marketing site. The first screen should be the usable learning experience.

Prefer clear, compact, touch-friendly layouts:

- game/family navigation
- a sense of sitting down at Barbu's table
- contract or lesson selection
- guided card table
- concise explanations tied to the current decision
- visible practice feedback

Borrow learning patterns from successful chess tutor apps at the pattern level only: named opponent/coach, level-like progression, puzzle-sized decisions, fast correction, and practice loops. Do not copy proprietary visual design, wording, characters, or lesson content.

Avoid purely decorative UI and avoid copying book text.

## Verification

Use `Taskfile.yml` as the canonical command surface. Run focused checks after changes:

```sh
task core:test
task ui:test
task build
task tauri:check
task verify
```

For UI-only changes, `npm run build` plus `task ui:test` is usually the minimum. For rules or scoring changes, run the core Rust tests.

Rust-backed generated drills and full-hand commands require the Tauri runtime. Browser-only localhost can test authored lessons, frontend rendering, and browser fallback flows; use `task tauri:dev` when verifying Tauri command behavior.

Every implemented feature should end with a short "Try it yourself" note in the final handoff. Include the exact app path or buttons to press, what the user should expect to see, and whether browser dev mode is enough or Tauri/iOS is needed.

## Generated Files

Do not commit generated output:

- `node_modules/`
- `dist/`
- `target/`
- `src-tauri/gen/schemas/`

These are ignored by `.gitignore`.

## Mobile Notes

This project aims to reduce daily Xcode dependence, but iOS signing, simulator/device builds, and App Store/TestFlight distribution still depend on Apple tooling. Prefer Tauri commands and documented setup steps before editing generated platform files directly.

## Testing Direction

Manual game-play testing is useful for feel, but should not be the main safety net.

Preferred automation path:

- Rust unit tests for rules, scoring, generation, and outcome explanations.
- Browser interaction tests for authored lesson flows, including iPhone XR smoke coverage through Playwright.
- Tauri command tests for generated scenarios.
- iOS simulator smoke tests before TestFlight.
- StoreKit sandbox tests once paid features are introduced.
