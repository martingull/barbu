# Barbu

An iPhone-first card-game teaching app using Barbu and the Hearts family as the first curriculum.

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
src/                 Svelte learning UI
content/             Structured game and lesson content
```

## First Commands

```sh
cargo test --manifest-path crates/barbu-core/Cargo.toml
npm install
npm run dev
npm run tauri:dev
```

For iOS simulator/device work, install the Tauri mobile prerequisites and use:

```sh
npm run tauri:ios
```
