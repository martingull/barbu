# Barbu Feature Map

This document controls product growth. It is a place to decide what belongs in the app now, what comes next, what is deliberately later, and what should not be built yet.

Use [SCREEN_PLAN.md](./SCREEN_PLAN.md) for screen ownership, navigation boundaries, game-family catalog structure, and UI separation between learning, practice, full-game play, reference, and future multiplayer.

## Product North Star

Barbu is an iPhone-first learning app for classic card games. The first playable path is Barbu in the Hearts family: the player sits at Barbu's table against Barbu, the King of Cards, learns one decision at a time, and gradually moves from guided tricks to confident play. Barbu teaches many card games because he is the King of Cards; his visual identity should present him as a King of Hearts.

Barbu is the first complete curriculum, not the app boundary. The product should grow through reusable game-family foundations, starting with Hearts-family overlap such as follow-suit trick taking, contract scoring, penalty cards, reward tricks, and clockwise table play.

Whist and Bridge are important future families, but they should wait until Barbu has a strong learning, practice, and play loop. New family work should reuse shared card and trick-taking foundations without weakening the current Barbu experience.

David Parlett's *The Penguin Book of Card Games* is the baseline reference for how supported games are played and described. Product variants are allowed only when they are deliberate and documented.

The app should feel like a real tutor:

- Short sessions.
- Clear next step.
- Immediate feedback.
- Rules explained through decisions.
- Reference material available when needed, not used as the main experience.

The default loop is: play first, get fast feedback, read a tiny explanation, repeat, then consult reference only when useful. Duolingo and strong chess tutor apps are the feel benchmark: active, progressive, lightly playful, and built around doing rather than reading.

## Current Feature Set

- Game catalog with Barbu as the first playable core game and documented varieties kept under their parent game.
- Barbu table with grouped Learn, Practice, Play, and Reference entry points, including a contract-hand practice chooser.
- Five-step training path: concept, example, guided trick, practice, review.
- Quick Drill mode with five quick mixed-contract decisions, immediate feedback, and a compact result.
- No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, and Hearts Trumps full-hand skeletons with deterministic local deals, legal-card play, simple tactical auto opponents, hand scoring, and short per-trick feedback.
- Generic trick-taking hand engine for deal, turn order, follow-suit legality, trick completion, and hand completion, with No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, and Hearts Trumps as the first contract adapters.
- Domino playable hand v1 with deterministic local deals, fixed-seven layout starts, adjacent suit building, legal pass handling, four-player order-out scoring, and Play Barbu roster support.
- Shared table-play surface for quick drills, Play Barbu, and full-hand contracts so active games keep one compact mobile layout.
- Play Barbu v1 with a local sequence through playable full-hand contracts, four-player contract values, per-contract score rows, and a compact game-complete summary.
- Play Barbu contract intro before each hand, where Barbu sets the next contract and the current game score stays visible.
- Four-player Play Barbu score tracking for You, Barbu, Left, and Right.
- Play Barbu settlement summary with four-player placement, best contract, weakest contract, and focused replay.
- Play Barbu scorecard with signed score cells, contract rows, four-player columns, current/completed/pending states, and totals.
- Play Barbu session summary with current leader, player place, and contracts remaining before each hand.
- Local full-hand contract value tracking with contract-specific point values for the currently playable contracts. Full settlement rules are a later feature.
- Compact full-hand result panel with contract result, Barbu/player penalty split, key tricks, replay, and next-contract actions.
- Training path practice step connected to Quick Drill completion.
- Review step with latest Quick Drill score, weakest-contract advice, recent attempts, and replay actions.
- Reason-based review advice that turns recent practice tags into one short next-step correction.
- Local Quick Drill result history with contract-level summaries and focused replay for the weakest contract.
- Local course progress for the playable Barbu path.
- Continue action for the next unfinished step.
- Completed-course state with review and reset actions.
- Shared learner-facing outcome model: good, risky, penalty/reward, and illegal, with separate reason tags for review and future tutor explanations.
- Shared course content flow for No Hearts, No Queens, King of Hearts, No Last Two, and No Tricks with concept, example, guided play, and review screens.
- Shared card table renderer for course examples and guided play.
- Barbu reference screen with Parlett baseline, play direction, core contracts, scoring, and documented varieties.
- Guided trick table for authored Barbu lessons.
- Authored lessons for No Hearts, No Queens, and King of Hearts.
- Structured outcome metadata for authored guided card choices.
- Compact outcome labels for guided decisions.
- Generated No Hearts, No Queens, King of Hearts, No Last Two, and No Tricks Quick Drill set via Rust/Tauri, with multiple local scenario patterns per contract.
- Browser generated fallback for Quick Drill when Tauri is unavailable.
- Playwright smoke tests for catalog, Barbu table, lesson flow, generated fallback, and course-complete behavior.

## Barbu Contract Roadmap

Barbu should be presented as one core game first, then as documented teaching modes and varieties. The user should always be able to tell which rules belong to core Barbu and which screens are app-specific ways to learn or practice it.

Product layers:

- **Core Barbu**: Parlett baseline for object, players, cards, deal, play, contracts, scoring, and full-game settlement.
- **App teaching modes**: guided lessons, quick drills, contract-hand practice, and Play Barbu.
- **Varieties of play**: documented changes to contract order, scoring, deal customs, or beginner simplifications.

Core contract status:

| Contract | Core status | App status | Notes |
| --- | --- | --- | --- |
| No Hearts | Core | Playable | Reference, lesson, generated practice, full hand, and run support exist. |
| No Queens | Core | Playable | Reference, lesson, generated practice, full hand, and run support exist. |
| King of Hearts / Barbu | Core | Playable | The app currently uses "King of Hearts" for beginner clarity. |
| No Last Two | Core | Playable | Guided course, full-hand, and run support exist; generated practice is still later. |
| No Tricks | Core | Playable | Guided course, full-hand, and run support exist; generated practice is still later. |
| Hearts Trumps | Core | Playable | Hearts are fixed as trumps for v1; full-hand and run support exist; generated practice and guided course are still later. |
| Domino | Core | Playable | Fixed-seven layout v1 exists with full hand and run support; chooser/declarer-selected starting rank is later. |

## Near-Term Roadmap

These are the next product increments that keep the app coherent.

1. Drill Loop v2
   - Expand recent-attempt display into a small habit loop.
   - Use stored reason tags to refine replay recommendations and review timing.
   - Keep explanations to one sentence unless the player asks for more.

2. Generated Practice Expansion v2
   - Add more scenario families for each supported contract.
   - Keep commands thin and deterministic.
   - Add Rust tests for every drill generator.
   - Current generated baseline covers the five playable avoidance contracts; Hearts Trumps generated practice is still missing.

3. Contract Score Model v2
   - Move point-value definitions into shared content/core metadata instead of duplicating them across UI and scoring code.
   - Keep avoidance contracts, positive contracts, and future layout contracts explicit in metadata.
   - Make scorecard language use score/value/tricks instead of assuming every contract is a penalty contract.
   - Fold Domino's order-out score table into the same shared model.

4. Core Game And Variety Model v2
   - Move catalog metadata toward content-backed data as more games are added.
   - Keep core rules separate from rule/scoring/table-custom variations.
   - Let varieties link to their parent core game instead of becoming separate top-level products.

5. Full-Hand Play v2
   - Continue adding Barbu contracts on top of the generic hand engine.
   - Improve Domino from fixed-seven v1 to the baseline Barbu chooser/declarer shape once contract selection is modeled.
   - Add full Barbu settlement scoring across contracts once the playable contracts are broader.
   - Expand No Hearts opponent policy with more table-aware decisions.
   - Add stronger tactical feedback after each completed trick.
   - Decide when full hands should enter the learning path instead of living as separate practice.

6. Play Barbu Flow v2
   - Keep contract intros short and score-aware.
   - Clarify fixed order versus chosen/dealer-driven contract order before full settlement scoring.
   - Make Barbu feel like the contract setter without adding long dialogue.

7. Play Barbu Settlement v2
   - Refine placement copy once full Barbu settlement scoring is implemented.
   - Compare best and worst contracts relative to table strength, not only raw event count.
   - Connect focused replay back into review history.

8. Progress Model v2
   - Store completion by lesson node, not only path step.
   - Track attempts, last result, and review due state.
   - Keep it local until the app needs sync or accounts.

8. Reference Layer v1
   - Add structured reference pages for the next supported games using Parlett as the baseline source.
   - Continue expanding object, players, cards, deal, play, scoring, variants, and tactical ideas.
   - Link reference sections from lessons without making rules pages the main flow.

## Later Roadmap

- Full Barbu hand practice.
- Barbu opponent behavior and table persona.
- More Barbu contracts.
- Hearts-family expansion.
- Whist-family expansion after Barbu is stable.
- Bridge-family expansion after Barbu is stable.
- Entitlements and paid packs.
- iOS simulator smoke tests.
- StoreKit sandbox tests.

## Explicit Non-Goals For Now

- No full multiplayer.
- No account system.
- No cloud sync.
- No server backend for progress or practice history.
- No subscription plumbing.
- No large decorative redesign.
- No AI opponent until rules, scoring, and lesson progression are stable.
- No copying wording, characters, art direction, or lesson content from Duolingo, chess apps, or books.

## Design Rules

- The first screen is always the learning experience, not marketing.
- Every new feature should answer: what is the next useful card decision?
- Rules, terminology, and play order should start from Parlett before local assumptions.
- Keep core games distinct from varieties of play; varieties should document what changes from the core game.
- Reference material should support the lesson path, not replace learn-by-doing.
- Add game logic to Rust when it affects legality, scoring, outcomes, generation, or reusable lesson state.
- Keep Svelte focused on presentation and interaction.
- Keep Barbu's voice concise. Personality should clarify, not distract.
- Prefer one strong path over many disconnected screens.

## Feature Intake Checklist

Before adding a feature, answer:

1. Does this help a beginner learn a card game faster?
2. Does it fit the concept, example, guided play, practice, review loop?
3. Does it belong in Rust, content, Tauri, or Svelte?
4. Can it be tested with Rust tests or Playwright?
5. Is it needed before full Barbu hand practice?

If the answer is unclear, put the idea in the parking lot.

## Parking Lot

- Streaks and daily goals.
- Achievements.
- Cosmetic card backs.
- Animated Barbu avatar.
- Sound effects and haptics.
- Leaderboards.
- Social sharing.
- Adaptive difficulty.
- Spaced repetition scheduling.
- Monetized expansion packs.
