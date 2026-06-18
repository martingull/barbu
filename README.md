# Barbu

An iPhone-first card-game app for learning, practicing, and exploring classic card games. The first curriculum is Barbu in the Hearts family, with room to expand into related Hearts-family games first, then other families later.

The product concept is that the player learns by sitting down against Barbu, a King of Cards figure who introduces games, sets contracts, reacts to play, and raises the difficulty over time. Barbu should function as a coach and opponent: enough personality to give the app identity, but never at the expense of clear rules, fast practice, and accurate feedback.

This is intended as a real App Store product, not a throwaway experiment. The codebase should keep product quality, automated verification, and future monetization in mind from the start.

## Learning Model

Barbu combines two complementary teaching layers:

- A reference layer grounded in David Parlett's *The Penguin Book of Card Games*: object, players, cards, deal, play, scoring, variants, and tactical ideas.
- A hybrid practice layer inspired by strong mobile chess tutors: short concepts, puzzle-sized decisions, guided tricks, generated drills, immediate feedback, and visible progression.

The intended loop is:

1. Concepts
2. Examples
3. Guided tricks or hands
4. Practice
5. Review

The app should borrow learning patterns from chess tutor apps at the level of structure: named coach/opponent, level-like progression, quick correction, and repeated practice. It should not copy proprietary visual design, wording, characters, or lesson content.

Parlett is the baseline for rules and descriptions, but app copy must be original and adapted for interactive learning rather than copied from the book.

The main experience should still be learn-by-doing: play first, get fast feedback, read a tiny explanation, repeat, and open reference material only when needed. The desired feel is closer to Duolingo or a strong chess tutor than to a rules encyclopedia.

Use [FEATURES.md](./FEATURES.md) as the product control document for current scope, near-term roadmap, non-goals, and parked ideas. Use [SCREEN_PLAN.md](./SCREEN_PLAN.md) to keep game-family catalog, learning, practice, full-game play, reference, and future multiplayer/UI work separated.

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

- A catalog/welcome screen that treats Barbu as the first playable core game in a broader card-game curriculum.
- Core games and varieties of play are separated in the catalog so teaching variants and later rule variations stay attached to their parent game.
- A Barbu table screen with grouped Learn, Practice, Play, and Reference entry points, a contract-hand practice chooser, and a five-step training path.
- Play Barbu mode with three quick mixed-contract decisions, immediate feedback, and a compact result; Tauri builds use Rust-generated scenarios, while browser runs use a local generated fallback.
- No Hearts, No Queens, King of Hearts, No Last Two, and No Tricks full-hand skeletons with deterministic local deals, legal-card play, simple tactical auto opponents, hand scoring, and short per-trick feedback.
- Generic trick-taking hand engine for full-hand deal, turn order, follow-suit legality, trick completion, and hand completion, with No Hearts, No Queens, King of Hearts, No Last Two, and No Tricks as the first contract adapters.
- Shared table-play surface for Play Barbu and full-hand contracts so active games use one compact mobile layout instead of contract-specific screens.
- Barbu run v1 starts a local sequence through the playable full-hand contracts, tracks a running player penalty total, and ends with a compact run summary.
- Compact full-hand result panel with contract result, Barbu/player penalty split, key tricks, replay, and next-contract actions.
- The training path practice step launches Play Barbu and marks the path step complete after a finished table.
- Review step with latest Play Barbu score, weakest-contract advice, recent attempts, and replay actions.
- Reason-based review advice that turns recent practice tags into one short next-step correction.
- Local Play Barbu result history with contract-level summaries and focused replay for the weakest contract.
- Local course progress, a continue action, and compact outcome labels for guided card decisions.
- Shared learner-facing outcome model: good, risky, penalty, and illegal, with separate reason tags for review and future tutor explanations.
- Shared course content flow for No Hearts, No Queens, and King of Hearts with concept, example, guided play, and review screens.
- Shared card table renderer for course examples and guided play.
- Barbu reference screen grounded in the Parlett baseline, with core contracts kept separate from documented varieties of play.
- Fixed authored Barbu lessons for No Hearts, No Queens, and King of Hearts.
- Structured outcome metadata for authored guided card choices.
- Generated No Hearts, No Queens, and King of Hearts drills from Rust using deterministic seeds and multiple local scenario patterns per contract.
- Rule validation, trick winners, full-hand state, contract penalty tracking, and generated-practice outcomes live in `barbu-core`.
- Full Barbu settlement scoring is not implemented yet; current full-hand play tracks the local contract penalty for the hand being practiced.
- The Svelte app renders authored or generated scenarios and should avoid duplicating rules where Rust can provide them.
- Barbu is the first Hearts-family core game, not the app boundary. The lesson/catalog structure should be able to grow toward related Hearts-family games first, then popular families such as Whist and Bridge after Barbu has a stable learning, practice, and play loop.

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
