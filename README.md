# Barbu

An iPhone-first collection for learning and playing classic card games, with Android builds and a browser development runtime.

The active catalog contains Hearts, Barbu (including Domino), Whist, Spades, Bridge, Gin Rummy and Card Counting I. Each table uses shared **Learn | Play** navigation; short exercises and guided hands belong inside Learn. Canasta is a paused, hidden prototype, not a released game.

All gameplay runs locally in TypeScript, shared by browser and installed builds. Svelte owns presentation and interaction; Tauri packages the native application. Rust handles startup and native external-link openers, not rules or scoring. Saves and learning progress are local; there is no gameplay server, account system or active payment layer.

## Quick Start

For browser development, install a current Node.js LTS compatible with the locked dependencies and [Task](https://taskfile.dev/). Rust, Xcode and the Android SDK are not needed for browser gameplay.

```sh
npm ci
task dev
```

Open http://127.0.0.1:1420. Vite requires that port to be free. Browser mode uses the same rules and lessons as native builds, but does not verify native sharing, external links, safe areas or packaging.

For native development, install Rust and the relevant platform toolchain first. Use the [iOS](docs/app-store-release.md) or [Android](docs/google-play-release.md) runbook for device and store builds. `task tauri:dev` starts the desktop shell, not a phone build.

```sh
task tauri:dev
```

## Verification

```sh
npx playwright install chromium webkit # Once, and after browser dependency upgrades
task domain:test                       # Type-check and test gameplay
task build                             # Build the frontend
task ui:test                           # Browser interaction/layout tests
task play:test                         # Offline release-tool safeguards
task tauri:check                       # Native shell; requires Rust/toolchain
task verify                            # All of the above
```

The [Taskfile](Taskfile.yml) is the canonical command surface. Browser tests start or reuse the server on port 1420. Test installed builds on physical devices before release, including saved-game upgrades and native integrations.

## Documentation

- **[FEATURES.md](./FEATURES.md)**: Product control document (roadmap, current features, non-goals).
- **[SCREEN_PLAN.md](./SCREEN_PLAN.md)**: UI boundaries, catalog structure, and navigation architecture.
- **[AGENTS.md](./AGENTS.md)**: Technical guidelines for AI agents working in this repository.
- **[Game architecture](docs/game-architecture.md)**: Source ownership, shared factories and the new-game checklist.
- **[Content](content/README.md)**: Lesson, reference and generated-exercise sources.
- **[Documentation index](docs/README.md)**: Game rules, release runbooks, public pages and historical audits.
- **[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)**: Dependency licenses and attribution.
- **[Google Play releases](./docs/google-play-release.md)**: Android packaging, API workflow and dated release evidence.
- **[App Store releases](docs/app-store-release.md)**: iPhone packaging, review and dated submission evidence.

## License

This repository is proprietary and all rights are reserved. See [LICENSE](./LICENSE).
