# Content

Content is split by responsibility, not duplicated into one JSON file per game.

- [games/barbu.json](games/barbu.json) holds structured Barbu reference material.
- [barbu-practice.json](barbu-practice.json) and
  [hearts-practice.json](hearts-practice.json) supply generated-exercise templates.
- [hearts-follow-ups.json](hearts-follow-ups.json) supplies reinforcement decisions.

The generators and evaluators live in [src/domain](../src/domain/), sharing rules
with full play on browser and native builds. Templates are not a second engine.

Authored courses, short exercises and learning adapters live under
[src/lessons](../src/lessons/) in per-game folders. The thin course catalog is
[courses.ts](../src/lessons/courses.ts). Do not maintain a second JSON copy here.

Player-facing references are assembled in
[referenceCatalog.ts](../src/games/referenceCatalog.ts), with separate Gin Rummy
and Canasta reference modules. Catalog collections and Learn/Play metadata belong
in [src/games](../src/games/). A reference or registered definition alone does not
make a game available: planned entries, including Canasta, are hidden.

Use family metadata for classification and keep varieties attached to the core
game. Record rule sources and deliberate limitations in `docs/<game>.md`; use
original learner-facing explanations without internal development roadmaps.
See [game architecture](../docs/game-architecture.md) before adding content.
