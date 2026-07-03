# Barbu Feature Map

This document controls product growth. It is a place to decide what belongs in the app now, what comes next, what is deliberately later, and what should not be built yet.

Use [SCREEN_PLAN.md](./SCREEN_PLAN.md) for screen ownership, navigation boundaries, game-family catalog structure, and UI separation between learning, practice, full-game play, reference, and future multiplayer.

## Product North Star

Barbu is an iPhone-first learning app for classic card games. The first playable path is Barbu in the Hearts family: the player sits at Barbu's table against Barbu, the King of Cards, learns one decision at a time, and gradually moves from guided tricks to confident play. Barbu teaches many card games because he is the King of Cards; his visual identity should present him as a King of Hearts.

Barbu is the first complete curriculum, not the app boundary. The product should grow through reusable game-family foundations, starting with Hearts-family overlap such as follow-suit trick taking, contract scoring, penalty cards, reward tricks, and clockwise table play.

Whist is the next intended free starter after Hearts and Barbu because it can reuse the shared trick-taking foundations while introducing partnerships and trump tracking. Bridge is an important later family, but it should wait until Barbu, Hearts, and Whist have a strong learning, practice, and play loop.

David Parlett's *The Penguin Book of Card Games* is the baseline reference for how supported games are played and described. Product variants are allowed only when they are deliberate and documented.

The app should feel like a real tutor:

- Short sessions.
- Clear next step.
- Immediate feedback.
- Rules explained through decisions.
- Reference material available when needed, not used as the main experience.

The default loop is: play first, get fast feedback, read a tiny explanation, repeat, then consult reference only when useful. Duolingo and strong chess tutor apps are the feel benchmark: active, progressive, lightly playful, and built around doing rather than reading.

The broader ambition is to make players stronger with a 52-card deck, not only to teach individual rule sets. Barbu should train transferable card skills: suit counting, danger-card memory, void inference, trump awareness, safe exits, table-strength reading, and knowing when to win or duck. Learning explains games; practice builds card sense; Play modes should feel like trying to beat the table.

The intended monetization model is free starter tables first, then paid packs with limited free usage. A paid pack should allow a small number of free usage units per time window, such as a three-hour window, before asking the player to buy that pack or subscribe to unlock the full catalog. Entitlement and usage-meter checks should stay centralized when implemented; do not scatter subscription or payment logic through game screens.

## Current Feature Set

- Game catalog ordered with free starter tables first: Hearts, Barbu, and Whist, followed by paid packs/future paid games such as Card Counting, Solitaire, Bridge, Gin Rummy, and Canasta.
- Game catalog metadata now comes from a shared table/catalog factory, including free starter versus metered pack access metadata, so future game additions do not start as hardcoded home-screen branches.
- Learn tab shell metadata now comes from the shared table/catalog factory: each active game declares its path title, progress label, continue summary, complete summary, and reference summary before screen-specific content is added.
- Table tab intro metadata now comes from the shared table/catalog factory: Learn, Practice, Play, and Perfect each declare their heading copy in one place before game-specific controls render underneath.
- Hearts Learn path metadata now comes from the shared table/catalog factory, so lesson order, progress labels, and continuation behavior have one source of truth before more games add their own paths.
- Hearts Learn coverage now includes break-hearts legality and moon-defense tactics, reusing the existing practice drills as path steps instead of creating separate implementations.
- Barbu Learn path metadata now comes from the shared table/catalog factory, so the first curriculum uses the same scalable pattern as Hearts.
- Hearts Practice entry metadata now comes from the shared table/catalog factory, so practice buttons, tab metadata, and action keys stay aligned as more games add practice sets.
- Barbu Practice entry metadata now comes from the shared table/catalog factory for Quick Drill, fixed drills, and Domino full-hand practice.
- Hearts table with the shared Learn, Practice, Play, and Perfect structure; Play opens with pass-three-left and then a local multi-hand Hearts match to 50 points with 2C opening, first-trick penalty restrictions, hearts-broken lead restrictions, and shoot-the-moon scoring, while Practice covers avoiding hearts and the queen-danger pattern.
- Hearts Passing Drill v1 teaches the beginner pass-three-left habit: identify Queen of Spades, high hearts, and dangerous high spades before hand play begins.
- Hearts Practice Scenario Pool v1 adds a small authored pool behind Hearts Quick Drill, varying avoid-hearts, queen-danger, break-hearts, moon-defense, and score-reading decisions without expanding the Learn path.
- Hearts opponent policy v1 has started: local opponents avoid Queen of Spades wins when possible, dump Queen of Spades before hearts when void, dump Queen of Spades safely under higher spades, lead from short safe suits to create pressure, and lead hearts once hearts are broken.
- Black Lady opponent policy now pressures the player on clean tricks: opponents can take a cheap non-penalty winner from the player to regain lead control, while still ducking tricks already loaded with hearts or QS unless moon defense requires intervention.
- Phone play surfaces now suppress double-tap zoom, tap highlights, text selection, and iOS callouts on card/button controls so selecting a card does not break game flow.
- Hearts trick feedback now calls out queen-of-spades danger, hearts moving, and opponent-loaded tricks so harder hands feel explainable rather than random.
- Barbu table with grouped Learn, Practice, Play, and Reference entry points, including a contract-hand practice chooser.
- Five-step training path: concept, example, guided trick, practice, review.
- Quick Drill mode as a generated practice loop: one decision at a time, immediate feedback, optional next decision, and a compact session result.
- Quick Drill result loop with next-repetition guidance, focused replay, recent rhythm, and local attempt history after the learner finishes a generated session.
- No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, and Hearts Trumps full-hand skeletons with deterministic local deals, legal-card play, contract-aware auto opponents, hand scoring, and short per-trick feedback.
- Generic trick-taking hand engine for deal, turn order, follow-suit legality, trick completion, and hand completion, with No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, and Hearts Trumps as the first contract adapters.
- Opponent policy v2 baseline for avoidance contracts: auto seats now duck clean tricks with the highest safe card instead of winning avoidable tricks without a reason.
- Domino playable hand v1 with deterministic local deals, configurable opening-rank state currently defaulted to fixed-seven starts, adjacent suit building, legal pass handling, four-player order-out scoring, Practice full-hand entry instead of a one-card fixed drill, and Play Barbu roster support.
- Domino clarity pass adds an in-hand order-out point counter and move reasoning for opening sevens, extending lanes, blocked cards, and follow-up cards.
- Shared table-play surface for quick drills, Play Barbu, and full-hand contracts so active games keep one compact mobile layout.
- Play Barbu v1 with a local sequence through playable full-hand contracts, four-player contract values, per-contract score rows, and a compact game-complete summary.
- Local Play Barbu save/resume for unfinished runs, with a Continue Play Barbu action on the Play tab.
- Play Barbu contract intro before each hand, where Barbu sets the next contract and the current game score stays visible.
- Four-player Play Barbu score tracking for You, Barbu, Left, and Right.
- Play Barbu settlement summary with four-player placement, best contract, weakest contract, and focused replay.
- Play Barbu scorecard with signed score cells, contract rows, four-player columns, current/completed/pending states, and totals.
- Play Barbu session summary with current leader, player place, and contracts remaining before each hand.
- Play Barbu session framing with contract sequence roles, surface cues for trick-taking versus Domino layout, and a compact winner/strongest/weakest end summary.
- Local full-hand contract value tracking with contract-specific point values for the currently playable contracts. Full settlement rules are a later feature.
- Shared frontend contract score model that separates avoidance, reward, and layout contracts for labels, run-score direction, and contract totals.
- Compact full-hand result panel with contract result, Barbu/player penalty split, key tricks, replay, and next-contract actions.
- Full-hand tactical feedback v1 with structured trick tags for followed suit, void discards, moved danger cards, No Last Two setup/final tricks, trump wins, and overtrumps.
- Training path practice step connected to Quick Drill completion.
- Review step with latest Quick Drill score, weakest-contract advice, recent attempts, and replay actions.
- Perfect mode Card Counting pack started with Count Trumps, Trump Memory Hand, Track Court Cards, and Danger Cards minigames.
- Reason-based review advice that turns recent practice tags into one short next-step correction.
- Local Quick Drill result history with contract-level summaries and focused replay for the weakest contract.
- Local course progress for the playable Barbu path.
- Continue action for the next unfinished step.
- Completed-course state with review and reset actions.
- Shared learner-facing outcome model: good, risky, penalty/reward, and illegal, with separate reason tags for review and future tutor explanations.
- Shared course content flow for No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino with concept, example, guided play, and review screens.
- Domino learning examples and guided placement use a layout surface instead of the trick-taking card table.
- Shared card table renderer for course examples and guided play.
- Barbu reference screen with Parlett baseline, play direction, core contracts, scoring, and documented varieties.
- Guided trick table for authored Barbu lessons.
- Authored lessons for No Hearts, No Queens, and King of Hearts.
- Structured outcome metadata for authored guided card choices.
- Compact outcome labels for guided decisions.
- Generated No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino Quick Drill set via Rust/Tauri, with multiple local scenario patterns for avoidance, trumps, and Domino layout decisions.
- Generated practice quality pass started with safe-dump scenarios for No Hearts, No Queens, King of Hearts, and No Tricks that teach when a void player can unload danger under a locked winner.
- Practice Scenario Pool v1 expands Quick Drill from a fixed generated roster into a larger deterministic pool, so mixed practice and weak-contract replays can draw from several scenario shapes.
- Quick Drill has short-term pattern memory, so recent scenario shapes are avoided before falling back to the full pool.
- Practice Template Model v1 has started with a Rust-side template roster that maps playable contracts to generator functions before a broader scenario-template DSL is justified.
- Browser generated fallback for Quick Drill when Tauri is unavailable.
- Playwright smoke tests for catalog, Barbu table, lesson flow, generated fallback, and course-complete behavior.
- Focused active-table stability checks cover iPhone no-scroll, safe-area controls, pinned bottom actions, thumb-card spacing, and feedback/card collision checks across Quick Drill, Play Barbu, Hearts, Domino, and Perfect table games.

## MVP Feature List

The MVP is an iPhone-first local card tutor and practice app. It should prove that the player can learn, practice, and play real card decisions on a phone without accounts, servers, multiplayer, or monetization plumbing.

Must ship:

1. Free starter catalog
   - Hearts, Barbu, and Whist visible first.
   - Barbu and Hearts are active; Whist may remain a clearly labeled starter placeholder until the shared trick-taking loop is stable enough to support it.
   - Paid/future packs such as Solitaire, Bridge, Gin Rummy, Canasta, and Card Counting can stay visible as roadmap signals only.

2. Barbu
   - Learn path for the core contracts.
   - Quick Drill mixed practice.
   - Play Barbu local run with save/resume, current playable contract roster, four-player scoring, contract intros, and end summary.
   - Full-hand contract practice for No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino.
   - Reference page documenting the core game, contracts, current simplifications, and varieties.

3. Hearts
   - Hearts must be a real free starter game, not only a placeholder.
   - MVP Hearts starts with pass-three-left, then a local multi-hand Hearts match on the shared trick-taking table.
   - MVP scoring: hearts are penalty cards and the queen of spades is the main danger card.
   - Current Hearts rules should include the Wikipedia-style 2C opening convention where the holder of 2C leads it to the first trick, no first-trick penalty dump when avoidable, no heart leads until hearts are broken, and shoot-the-moon match scoring. Source note: https://en.wikipedia.org/wiki/Hearts_(card_game)#Minor_rule_variants.
   - The current match target is 50 points for mobile testing; rotating pass directions and fuller scoring options remain later Hearts v2 items unless added deliberately.
   - Hearts Practice can reuse Hearts-family avoidance drills while Hearts-specific drills grow.
   - Hearts Learn/Reference should explain the current MVP boundary clearly.

4. Card Sense / Perfect
   - Keep the current memory mini-games small and tied to real play.
   - Prioritize trumps, court cards, and danger-card tracking because they transfer to Barbu, Hearts, Whist, and Bridge.

5. Mobile quality
   - Active table screens should be stable on the physical iPhone.
   - No accidental active-game page scroll.
   - Bottom actions stay pinned and reachable.
   - Thumb cards stay visible.
   - Safe areas are respected after route changes.

Not MVP:

- Accounts, cloud sync, or backend.
- Multiplayer.
- Subscription or StoreKit implementation.
- Full Hearts variants.
- Full Bridge, Whist, Gin Rummy, Canasta, or Solitaire implementations.
- Barbu character animation.
- Advanced AI opponent strategy beyond useful local training behavior.

## MVP Rounding-Off Roadmap

This section is the short list for getting from the current app to something that can be tested seriously on an iPhone. Prefer finishing these items before adding new game families, new monetization surfaces, or larger visual systems.

1. Stabilize the active phone table
   - Keep Quick Drill, full-hand practice, Play Barbu, Hearts, Domino, and Perfect mini-games on stable iPhone layouts.
   - Prevent active-game scrolling, safe-area collisions, shifting score boxes, and thumb-card/action collisions.
   - Keep the shared table surface consistent across Barbu practice, Barbu play, Hearts play, and realistic mini-games.
   - Current gate: `task ui:test:tables` runs the focused iPhone table-stability suite.

2. Finish Barbu v1 play
   - Keep the current playable roster: No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino.
   - Tighten full-hand feedback so the player understands why a trick was good, risky, or costly.
   - Improve local opponent policy only where bad table behavior damages the feel of the hand.
   - Decide whether v1 Play Barbu stays fixed-order or adds a simple contract-choice step.
   - Defer full historical/Parlett settlement details unless they block a believable local session.

3. Finish Hearts v1 play
   - Keep Hearts as the second active free starter game.
   - Maintain the current v1 rules: pass three left, 2C opening, first-trick penalty restrictions, hearts-broken lead restrictions, hearts plus queen-of-spades scoring.
   - Add only the Hearts-specific practice needed to support the play mode: passing, queen danger, safe heart avoidance, and basic score reading.
   - Defer rotating pass direction, shooting the moon, and long match scoring unless the single-hand loop feels incomplete without them.

4. Keep Perfect small but useful
   - Treat Perfect as card-sense training, not a second game catalog.
   - Keep Count Trumps, Trump Memory Hand, Track Court Cards, and Danger Cards if they remain tied to real table play.
   - Stop adding mini-games until each active one has clear feedback and a reason to return.

5. Product shell and launch readiness
   - Keep the catalog free-first: Hearts, Barbu, Whist, then paid/future packs.
   - Whist may remain a polished placeholder for MVP if Barbu and Hearts feel good, but it should be the next game implementation target before Solitaire.
   - Make app icon, launch screen, iPhone safe areas, and local Tauri/iOS packaging reliable.
   - Add a short manual smoke checklist for physical iPhone testing before each TestFlight-style build.

6. Documentation and verification gate
   - Keep README, FEATURES, SCREEN_PLAN, and AGENTS aligned with the MVP scope.
   - Every completed feature should include a "Try it yourself" path.
   - Before calling the MVP ready, run core Rust tests, UI tests on phone profiles, Tauri check, and at least one physical-device smoke pass.

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
| No Last Two | Core | Playable | Guided course, generated practice, full-hand, and run support exist. |
| No Tricks | Core | Playable | Guided course, generated practice, full-hand, and run support exist. |
| Hearts Trumps | Core | Playable | Hearts are fixed as trumps for v1; guided course, generated practice, full-hand, and run support exist. |
| Domino | Core | Playable | Opening-rank state exists but the app currently defaults to fixed-seven layout v1; chooser/declarer-selected starting rank is later. |

## Near-Term Roadmap

These are the next product increments that keep the app coherent.

1. Hearts MVP v1
   - Hearts is now an active starter table with pass-three-left and a local multi-hand match using the shared trick-taking engine and table surface.
   - Current MVP scoring covers hearts plus the queen of spades.
   - Current MVP legality covers the Wikipedia-style holder-of-2C opening, first-trick penalty restrictions, and hearts-broken lead restrictions.
   - Shooting the moon is active: if one seat captures all 26 hand points, that seat scores 0 and every other seat scores 26 for that hand.
   - Hearts opponent policy now treats Queen of Spades as the main danger card in void discards and spade-following decisions, uses short-suit/heart-broken leads so passive zero-point play is harder, and has moon awareness so seats avoid feeding a moon candidate or deliberately take loaded tricks to stop one. Trick feedback also calls out an active moon threat before the hand ends.
   - Hearts match v1 tracks cumulative table scores until someone reaches 50, then shows the winner, your place, and your best/worst hand.
   - Hearts Passing Drill v1 teaches the first pass-three-left heuristic.
   - Hearts Learn now gives a Barbu-like path through object, queen danger, avoiding hearts, passing, score reading, and reference.
   - Hearts Practice covers pass-three, avoid-hearts, queen-danger, break-hearts, stop-the-moon, and score-a-hand entry points.
   - Hearts micro-drills now teach early heart lead restrictions, moon defense, and Queen of Spades score reading.
   - Next: move the Hearts micro-drills into Rust-backed generated scenario families so they can vary like Barbu practice.

2. Drill Loop v2
   - Quick Drill now generates a continuing practice loop instead of a fixed seven-exercise roster.
   - Result screen now shows next repetition, focus contract, and recent rhythm after the learner finishes the session.
   - Use stored reason tags to refine replay recommendations and review timing.
   - Next: improve review timing and focused replay selection after more real play.
   - Keep explanations to one sentence unless the player asks for more.

3. Generated Practice Expansion v2
   - Hearts Trumps and Domino now rotate through multiple scenario families.
   - No Hearts, No Queens, King of Hearts, and No Tricks now include void-discard quality scenarios focused on unloading safely when another player already controls the trick.
   - Quick Drill now samples from a larger deterministic scenario pool and avoids immediate repeats when possible.
   - Short-term practice memory now avoids recently seen scenario patterns when the filtered pool has alternatives.
   - Practice Template Model v1 should continue gradually by extracting repeated table/hand construction patterns only after two or three more scenario families prove the shape.
   - Add more scenario families for each supported contract as testing reveals repetition.
   - Keep commands thin and deterministic.
   - Add Rust tests for every drill generator.
   - Current generated baseline covers the playable roster; remaining work is breadth and balancing rather than first coverage.

4. Contract Score Model v2
   - Move point-value definitions into shared content/core metadata instead of duplicating them across UI and scoring code.
   - Frontend score metadata now separates avoidance, reward, and layout contracts for labels and run-score direction.
   - Next: move the same model into Rust/content so hand scoring, generated practice, and UI labels share one source.
   - Next: fold Domino's order-out score table into the same shared model.

5. Core Game And Variety Model v2
   - Move catalog metadata toward content-backed data as more games are added.
   - Keep core rules separate from rule/scoring/table-custom variations.
   - Let varieties link to their parent core game instead of becoming separate top-level products.

6. Full-Hand Play v2
   - Continue adding Barbu contracts on top of the generic hand engine.
   - Improve Domino from configurable-start-rank fixed-seven v1 to the baseline Barbu chooser/declarer shape once contract selection is modeled.
   - Add full Barbu settlement scoring across contracts once the playable contracts are broader.
   - Continue expanding opponent policy beyond the first v2 baseline with endgame timing, trump preservation, and clearer table-strength decisions.
   - Continue strengthening tactical feedback after each completed trick, especially when the player had a better legal alternative.
   - Decide when full hands should enter the learning path instead of living as separate practice.

7. Play Barbu Flow v2
   - Keep contract intros short and score-aware.
   - Keep local resume reliable for unfinished runs before adding accounts or cloud sync.
   - Clarify fixed order versus chosen/dealer-driven contract order before full settlement scoring.
   - Make Barbu feel like the contract setter without adding long dialogue.

8. Play Barbu Settlement v2
   - Refine placement copy once full Barbu settlement scoring is implemented.
   - Compare best and worst contracts relative to table strength, not only raw event count.
   - Connect focused replay back into review history.

9. Progress Model v2
   - Store completion by lesson node, not only path step.
   - Track attempts, last result, and review due state.
   - Keep Play Barbu run resume local and simple until sync or accounts are justified.
   - Keep it local until the app needs sync or accounts.

10. Card Sense Training v1
   - Started in the catalog and Perfect mode with a Card Counting pack.
   - Count Trumps reveals all thirteen tricks in segments, hides the segment, then asks either how many hearts appeared or whether a specific heart appeared.
   - Trump Memory Hand is a separate realistic table exercise: deal a hand, make the player play tricks, then ask either how many trumps were played or whether a specific trump card appeared.
   - Track Court Cards is the third active exercise and uses the realistic table surface for high-card memory.
   - Danger Cards is the fourth active exercise and tracks Barbu-specific danger cards: queens and the king of hearts.
   - Add short mini-games for serious 52-card-deck skills and practical card-counting habits: Suit Count, Danger Card Tracker, Trump Count, Void Finder, High Card Memory, and Safe Exit Trainer.
   - Next: connect card-counting exercises back to Play Barbu feedback and focused replay.
   - Trump Memory Hand now starts sharing table-aware trump behavior with the core game: opponents can overtrump a player's low trump when void in the led suit and able to beat it. Continue extending this only where it improves the skill being trained.
   - Specific future Whist idea: bake a tracking mini-game into Whist or a Whist variety where the player follows remaining trumps and court cards during play.
   - Keep each mini-game tied to real play, with one-sentence feedback explaining how the skill helps in Barbu, Hearts-family games, Whist, Bridge, or other classic card games.
   - Do not let these become disconnected brain-training toys; every exercise should make the player better at reading a table.

11. Local Opponent Policy v3
   - Improve Barbu and table seats as training opponents before any real multiplayer work.
   - Focus on believable card-player habits: avoid obvious penalties, count endgame danger, preserve exits, use trumps sensibly, and pursue reward tricks when the contract asks for it.
   - Initial explicit overtrump behavior exists in Hearts Trumps and realistic Trump Count: when a seat is void in the led suit and a trump is already winning, it can play the lowest trump that beats it. Continue refining when seats should discard or conserve trumps according to the contract goal.
   - No Queens now has an explicit avoidance-policy slice in the shared Rust contract-policy layer: avoid queen leads, duck queen-loaded tricks when possible, dump queens when void, and shed a queen under a locked winner instead of wasting another safe high card.
   - Great card games are often played against real people, but better local opponents are the right bridge from solo learning to real table play.

12. Reference Layer v1
   - Add structured reference pages for the next supported games using Parlett as the baseline source.
   - Continue expanding object, players, cards, deal, play, scoring, variants, and tactical ideas.
   - Link reference sections from lessons without making rules pages the main flow.

## Later Roadmap

- Barbu opponent behavior and table persona.
- Real-person play or multiplayer once local play, scoring, and opponent behavior are strong.
- Card-sense mini-game expansion beyond the first training set.
- More Barbu contracts beyond the current playable roster.
- Hearts-family expansion.
- Whist-family expansion after Barbu is stable.
- Bridge-family expansion after Barbu is stable.
- Entitlements and paid packs.
- iOS simulator smoke tests.
- StoreKit sandbox tests.
- Individual pack purchases and an all-access subscription.

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
