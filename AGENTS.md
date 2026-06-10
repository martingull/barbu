# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Barbu is an iPhone-first card-game app for learning, practicing, and exploring classic card games. The first curriculum is Barbu in the Hearts family of card games, with room to expand to more games later.

This is intended as a real App Store product, not a throwaway learning project. Code changes should keep maintainability, automated verification, product polish, and eventual monetization in mind.

The app should teach games as structured knowledge and guided play, not as static rule pages. Favor a progression like:

1. Concepts
2. Examples
3. Guided tricks or hands
4. Practice
5. Review

Use Parlett-style organization as inspiration, but write original explanations and app copy.

## Stack

- Rust workspace for deterministic game logic.
- `crates/barbu-core` for cards, rules, scoring, lesson primitives, generated practice, and tests.
- Tauri 2 app shell under `src-tauri`.
- Svelte + TypeScript frontend under `src`.
- Structured local game content under `content`.

Keep game logic independent of the UI. The frontend may present and explain rules, but rule validation, scoring, trick resolution, and reusable lesson state should live in Rust where practical.

## Architecture

- Put reusable card and rules code in `crates/barbu-core`.
- Put generated practice logic in Rust, not in the Svelte component layer.
- Keep Tauri command handlers thin; they should adapt app requests to core APIs.
- Keep Svelte components focused on presentation and interaction.
- Treat `content/` as structured source material for lessons and game metadata.
- Do not hardcode large rule prose into UI components when it belongs in content or core lesson data.
- Do not scatter future premium/entitlement checks across components. Keep monetization access decisions centralized when that layer is added.

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

Use `Taskfile.yml` as the canonical command surface. Run focused checks after changes:

```sh
task core:test
task build
task tauri:check
task verify
```

For UI-only changes, `npm run build` is usually the minimum. For rules or scoring changes, run the core Rust tests.

Generated drills require the Tauri runtime. Browser-only localhost can test authored lessons and frontend rendering, but Rust-backed commands need `task tauri:dev`.

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
- Browser interaction tests for authored lesson flows.
- Tauri command tests for generated scenarios.
- iOS simulator smoke tests before TestFlight.
- StoreKit sandbox tests once paid features are introduced.
