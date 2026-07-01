# Barbu

An iPhone-first card-game app for learning, practicing, and exploring classic card games. The first curriculum is Barbu in the Hearts family, with room to expand into related Hearts-family games first, then other families later.

The product concept is that the player learns by sitting down against Barbu, the King of Cards, who introduces games, sets contracts, reacts to play, and raises the difficulty over time. Barbu should function as a coach and opponent: enough personality to give the app identity, but never at the expense of clear rules, fast practice, and accurate feedback. His visual identity should eventually show him as a King of Hearts while still positioning him as the tutor for many card games.

The long-term goal is broader than teaching rules. Barbu should help people become better 52-card-deck players: stronger at following suit, counting suits and danger cards, reading voids, remembering played cards, preserving exits, using trumps, and judging table strength. Lessons explain games, practice builds card sense, and Play modes should eventually feel like trying to beat a real table.

This is intended as a real mobile app-store product, not a throwaway experiment. The first distribution barrier is Apple App Store and Google Play readiness, so product decisions should prioritize mobile usability, automated verification, and future monetization from the start.

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
src-tauri/           Tauri mobile app shell
src/                 Svelte app UI and authored lesson data
content/             Structured game and lesson content
```

## Current Product Shape

- A catalog/welcome screen that treats Barbu as the first playable core game in a broader card-game curriculum, with Hearts as the second active starter table and placeholders for Solitaire, Whist, Bridge, Gin Rummy, and Canasta.
- The intended free starter catalog is Barbu, Hearts, and Solitaire; the other catalog entries can become later packs once the first game loop is strong.
- The catalog stays focused on core games; varieties and teaching modes stay attached to their parent game screens.
- A Hearts table with the same Learn, Practice, Play, and Perfect structure; Play starts with pass-three-left and then moves into a local Hearts hand with 2C opening, first-trick penalty restrictions, hearts-broken lead restrictions, and queen-danger scoring, while Practice trains hearts and queen-danger patterns on the shared trick-taking surface.
- A Barbu table screen with grouped Learn, Practice, Play, and Reference entry points, a contract-hand practice chooser, and a five-step training path.
- Quick Drill mode with seven quick mixed-contract decisions across the playable contract roster, immediate feedback, and a compact result; Tauri builds use Rust-generated scenarios, while browser runs use a local generated fallback.
- No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, and Hearts Trumps full-hand skeletons with deterministic local deals, legal-card play, contract-aware auto opponents, hand scoring, and short per-trick feedback.
- Domino playable hand v1 with deterministic local deals, configurable opening-rank state currently defaulted to fixed-seven starts, adjacent suit building, legal pass handling, four-player order-out scoring, and Play Barbu roster support.
- Generic trick-taking hand engine for full-hand deal, turn order, follow-suit legality, trick completion, and hand completion, with No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, and Hearts Trumps as the first contract adapters.
- Shared table-play surface for Quick Drill, Play Barbu, and full-hand contracts so active games use one compact mobile layout instead of contract-specific screens.
- Play Barbu v1 starts a local sequence through the playable full-hand contracts, tracks four-player scores, and ends with a compact score summary.
- Play Barbu contract intro before each hand so Barbu sets the next contract, shows the target, and keeps the current run score visible.
- Play Barbu score tracking now follows all four seats: You, Barbu, Left, and Right.
- Play Barbu settlement now ranks the four seats, names the player's best and weakest contract, and offers a focused replay.
- Play Barbu scorecard shows contract rows, four-player columns, current-contract highlight, pending rows, and totals.
- Compact full-hand result panel with contract result, Barbu/player penalty split, key tricks, replay, and next-contract actions.
- The training path practice step launches Quick Drill and marks the path step complete after a finished drill.
- Review step with latest Quick Drill score, weakest-contract advice, recent attempts, and replay actions.
- Reason-based review advice that turns recent practice tags into one short next-step correction.
- Local Quick Drill result history with contract-level summaries and focused replay for the weakest contract.
- Local course progress, a continue action, and compact outcome labels for guided card decisions.
- Shared learner-facing outcome model: good, risky, penalty, and illegal, with separate reason tags for review and future tutor explanations.
- Shared course content flow for No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino with concept, example, guided play, and review screens.
- Domino learning states use a layout surface instead of the trick-taking card table.
- Shared card table renderer for course examples and guided play.
- Barbu reference screen grounded in the Parlett baseline, with core contracts kept separate from documented varieties of play.
- Contract roadmap in the Barbu reference that distinguishes core playable contracts, app teaching coverage, and future varieties.
- Fixed authored Barbu lessons for No Hearts, No Queens, and King of Hearts.
- Structured outcome metadata for authored guided card choices.
- Generated No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino drills from Rust using deterministic seeds.
- Rule validation, trick winners, full-hand state, contract value tracking, Domino layout state, and generated-practice outcomes live in `barbu-core`.
- Full Barbu settlement scoring is not implemented yet; current full-hand play tracks local contract values for the hand being practiced.
- The Svelte app renders authored or generated scenarios and should avoid duplicating rules where Rust can provide them.
- Barbu is the first Hearts-family core game, not the app boundary. The lesson/catalog structure should be able to grow toward related Hearts-family games first, then popular families such as Whist and Bridge after Barbu has a stable learning, practice, and play loop.
- Frontend game tables should be registered through `src/tableFactory.ts` so new ready games follow the shared `Learn`, `Practice`, `Play`, and `Perfect` structure, declare their reference id, and name their key actions before custom UI is added.

## MVP Scope

The MVP is a local iPhone-first card tutor with two active starter games:

- **Barbu**: the main curriculum and play mode.
- **Hearts**: the familiar free starter game that proves the shared Hearts-family engine can support more than Barbu.

MVP Hearts should be real but intentionally small: pass three cards left, then play a local Hearts hand on the shared trick-taking table, scoring hearts plus the queen of spades. The current MVP rule target includes 2C opening, first-trick penalty restrictions, and no heart leads until hearts are broken. Rotating pass directions, shooting the moon, and fuller match scoring are Hearts v2 unless deliberately added later.

Solitaire can remain visible as a free starter placeholder until Barbu and Hearts feel stable. Whist, Bridge, Gin Rummy, Canasta, and Card Counting can remain visible as future packs or skill areas, but should not distract from getting Barbu and Hearts playable on the phone.

## Long-Term Card Skill Direction

Great card games are usually best against real people, but the app should first make local solo play and local opponents good enough to train real table habits. Barbu should become a place to practice transferable card skills and practical card-counting habits, not only a library of rules.

Future training modes may include card-sense mini-games:

- Suit Count: track how many cards in a suit remain.
- Danger Card Tracker: remember whether queens, KH, aces, or trumps are still live.
- Trump Count: count remaining trumps in trump contracts and future Whist/Bridge play.
- Void Finder: infer which seats are void in a suit from previous tricks.
- High Card Memory: identify the highest remaining card in a suit.
- Safe Exit Trainer: choose a card that avoids taking control later.

One specific later idea is a Whist-focused tracking mini-game, either inside Whist itself or a documented Whist variety, where the player practices following remaining trumps and court cards as the hand develops.

These should stay connected to real play. A mini-game should make the player better at Barbu, Hearts-family games, Whist, Bridge, or another real 52-card-deck game, not become abstract brain training.

Realistic mini-games should also inherit believable table behavior from the core game. For example, Trump Memory Hand teaches against opponents who use the first slice of sensible trump behavior: if a player trumps with a low heart and the next seat is void in the led suit, that seat can overtrump with the lowest winning trump instead of only discarding mechanically.

## First Commands

```sh
npm install
task verify
task dev
```

`task dev` runs the browser version for fast local iteration. Generated drills require the Tauri runtime, so use `task tauri:dev` when testing Rust-backed app commands.

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
- Playwright browser smoke tests for the catalog, Barbu table, lesson flow, generated-practice fallback, and no-scroll table behavior on an iPhone XR viewport.
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
