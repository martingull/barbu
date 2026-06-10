# Barbu

An iPhone-first card-game app for learning, practicing, and exploring classic card games. The first curriculum is Barbu in the Hearts family, with room to expand to more games later.

The product concept is that the player learns by sitting down against Barbu, a King of Cards figure who introduces games, sets contracts, reacts to play, and raises the difficulty over time. Barbu should function as a coach and opponent: enough personality to give the app identity, but never at the expense of clear rules, fast practice, and accurate feedback.

This is intended as a real App Store product, not a throwaway experiment. The codebase should keep product quality, automated verification, and future monetization in mind from the start.

## Learning Model

Barbu combines two complementary teaching layers:

- A Parlett-style reference layer for structured game knowledge: object, players, cards, deal, play, scoring, variants, and tactical ideas.
- A hybrid practice layer inspired by strong mobile chess tutors: short concepts, puzzle-sized decisions, guided tricks, generated drills, immediate feedback, and visible progression.

The intended loop is:

1. Concepts
2. Examples
3. Guided tricks or hands
4. Practice
5. Review

The app should borrow learning patterns from chess tutor apps at the level of structure: named coach/opponent, level-like progression, quick correction, and repeated practice. It should not copy proprietary visual design, wording, characters, or lesson content.

## Stack

- Rust workspace for deterministic card and rules logic.
- Tauri 2 app shell for iOS now and Android later.
- Svelte + TypeScript frontend for the teaching interface.
- Structured local content under `content/`.

The app shell is intentionally separate from `barbu-core` so rules can be tested without mobile tooling.

## Project Layout

```text
crates/barbu-core/   Card model, trick-taking rules, scoring, lesson primitives
src-tauri/           Tauri mobile/desktop shell
src/                 Svelte app UI and authored lesson data
content/             Structured game and lesson content
```

## Current Product Shape

- A catalog/welcome screen that treats Barbu as the first table in a broader card-game curriculum.
- A Barbu table screen with contract entry points and a five-step training path.
- Local course progress, a continue action, and compact outcome labels for guided card decisions.
- Fixed authored Barbu lessons for No Hearts, No Queens, and King of Hearts.
- Generated No Hearts follow-suit drills from Rust using deterministic seeds.
- Rule validation, trick winners, scoring, and generated-practice outcomes live in `barbu-core`.
- The Svelte app renders authored or generated scenarios and should avoid duplicating rules where Rust can provide them.
- Barbu is the first Hearts-family game, not the app boundary. The lesson/catalog structure should be able to grow toward other Hearts variants first, then other families such as Whist or Bridge later.

## First Commands

```sh
npm install
task verify
task dev
```

`task dev` runs the browser version. Generated drills require the Tauri runtime, so use `task tauri:dev` when testing Rust-backed app commands.

For iOS simulator/device work, install the Tauri mobile prerequisites and use:

```sh
task ios:dev
```

## Verification

Use the Taskfile as the canonical command surface:

```sh
task core:test
task ui:test
task build
task tauri:check
task verify
```

Current automated coverage:

- Rust unit tests for cards, trick-taking, scoring, fixed guided tricks, and generated follow-suit drills.
- Frontend production build.
- Playwright browser smoke tests for the catalog, Barbu table, lesson flow, and generated-practice fallback on iPhone XR and desktop Chrome.
- Tauri app crate check.

Next testing layers to add:

- Tauri command tests for generated practice scenarios.
- iOS simulator smoke tests before TestFlight.
- StoreKit sandbox tests once monetization is introduced.

## App Store And Monetization

The app should be designed for App Store publication. Monetization should be planned but not mixed into rules logic.

Likely direction:

- Free starter experience: a small set of fixed lessons and drills.
- Paid expansion: additional game families, full Barbu practice, advanced contracts, or curated packs.
- StoreKit integration should be isolated behind an entitlement/access layer when introduced.

Do not hardcode premium gates throughout UI components. Keep access decisions centralized so the app can support paid download, one-time unlocks, or subscriptions later.
