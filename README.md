# Barbu

An iPhone-first card-game app for learning, practicing, and exploring classic card games.

The project is structured around guided play, generated practice, and a curriculum moving from Hearts towards Bridge. It uses a Rust core for rules and deterministic generation, and a Svelte frontend bundled with Tauri.

## Quick Start

```sh
# Install dependencies
npm install

# Run tests and verify the build
task verify

# Run browser dev server for fast UI iteration
task dev

# Run Tauri dev server for Rust-backed testing
task tauri:dev
```

## Documentation

- **[FEATURES.md](./FEATURES.md)**: Product control document (roadmap, current features, non-goals).
- **[SCREEN_PLAN.md](./SCREEN_PLAN.md)**: UI boundaries, catalog structure, and navigation architecture.
- **[AGENTS.md](./AGENTS.md)**: Technical guidelines for AI agents working in this repository.
- **[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)**: Dependency licenses and attribution.

## License

This repository is proprietary and all rights are reserved. See [LICENSE](./LICENSE).
