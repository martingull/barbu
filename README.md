# Barbu

An iPhone-first card-game app for learning, practicing, and exploring classic card games. The first curriculum is Barbu in the Hearts family, with room to expand to more games later.

This is intended as a real App Store product, not a throwaway experiment. The codebase should keep product quality, automated verification, and future monetization in mind from the start.

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

- Fixed authored No Hearts lesson with two guided tricks.
- Generated No Hearts follow-suit drills from Rust using deterministic seeds.
- Rule validation, trick winners, scoring, and generated-practice outcomes live in `barbu-core`.
- The Svelte app renders authored or generated scenarios and should avoid duplicating rules where Rust can provide them.

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
task build
task tauri:check
task verify
```

Current automated coverage:

- Rust unit tests for cards, trick-taking, scoring, fixed guided tricks, and generated follow-suit drills.
- Frontend production build.
- Tauri app crate check.

Next testing layers to add:

- Browser interaction tests for the guided lesson flow.
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
