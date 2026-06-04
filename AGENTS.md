# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Barbu is an iPhone-first card-game learning app. The first curriculum is Barbu in the Hearts family of card games, with room to expand to more games later.

The app should teach games as structured knowledge and guided play, not as static rule pages. Favor a progression like:

1. Concepts
2. Examples
3. Guided tricks or hands
4. Practice
5. Review

Use Parlett-style organization as inspiration, but write original explanations and app copy.

## Stack

- Rust workspace for deterministic game logic.
- `crates/barbu-core` for cards, rules, scoring, lesson primitives, and tests.
- Tauri 2 app shell under `src-tauri`.
- Svelte + TypeScript frontend under `src`.
- Structured local game content under `content`.

Keep game logic independent of the UI. The frontend may present and explain rules, but rule validation, scoring, trick resolution, and reusable lesson state should live in Rust where practical.

## Architecture

- Put reusable card and rules code in `crates/barbu-core`.
- Keep Tauri command handlers thin; they should adapt app requests to core APIs.
- Keep Svelte components focused on presentation and interaction.
- Treat `content/` as structured source material for lessons and game metadata.
- Do not hardcode large rule prose into UI components when it belongs in content or core lesson data.

## UI Direction

The app is a learning tool, not a marketing site. The first screen should be the usable learning experience.

Prefer clear, compact, touch-friendly layouts:

- game/family navigation
- contract or lesson selection
- guided card table
- concise explanations tied to the current decision
- visible practice feedback

Avoid purely decorative UI and avoid copying book text.

## Verification

Run focused checks after changes:

```sh
cargo test --manifest-path crates/barbu-core/Cargo.toml
npm run build
cargo check -p barbu-app
```

For UI-only changes, `npm run build` is usually the minimum. For rules or scoring changes, run the core Rust tests.

## Generated Files

Do not commit generated output:

- `node_modules/`
- `dist/`
- `target/`
- `src-tauri/gen/schemas/`

These are ignored by `.gitignore`.

## Mobile Notes

This project aims to reduce daily Xcode dependence, but iOS signing, simulator/device builds, and App Store/TestFlight distribution still depend on Apple tooling. Prefer Tauri commands and documented setup steps before editing generated platform files directly.
