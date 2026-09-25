# Content

Structured game content is organized by playable table ID, not by card-game family.

- `games/barbu.json` describes the Barbu table.
- Future game references should follow the same pattern, for example `games/hearts.json` or `games/bridge.json`.

Use the `family` field inside each file for broader families such as Hearts, Whist, or Bridge.

`barbu-practice.json` and `hearts-practice.json` are the templates consumed by the
TypeScript generators in `src/domain/`. Authored courses and short exercises live
under `src/lessons/<game>/`, using the shared course and drill types; the course
catalog is `src/lessons/courses.ts`. Do not maintain a second copy here.
The current reference catalog lives in `src/games/referenceCatalog.ts`.
