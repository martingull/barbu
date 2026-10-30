# Barbu Feature Map

Current product scope, checked against the implementation on October 30, 2026.
This is a working product document, not store copy or proof of release approval.
See [SCREEN_PLAN.md](SCREEN_PLAN.md) for navigation and
[game architecture](docs/game-architecture.md) for implementation boundaries.
Earlier incremental feature lists remain in Git history.

## Product North Star

Help beginners and card-club players learn and enjoy a growing catalog of
traditional games. Barbu, the King of Cards, is the King of Hearts teaching
persona, not a requirement that every game share Barbu's rules or objectives.
The first-use introduction starts with Hearts; players can explore other games
without following a mandatory route to Bridge.

The learning loop is a card decision, immediate feedback, a short explanation,
then another decision or a guided hand. Reference supports that loop instead of
replacing it. Use David Parlett's *The Penguin Book of Card Games* as the starting
reference, document deliberate variants, and write original explanations.

Club quality is an ambition, not a claim of universal club rules or expert
opponents. Keep game-specific limitations explicit.

## Active Catalog

| Collection | Available tables | Play scope |
| --- | --- | --- |
| Hearts & changing contracts | Hearts, Barbu | Black Lady-style Hearts matches; a seven-contract Barbu training session including Domino |
| Partners & tricks | Whist, Spades, Bridge | Partnership Whist, bidding/nil/bags in Spades, natural Bridge auctions into scored boards |
| Rummy games | Gin Rummy | Two-player draw/discard, melds, knock/gin, layoffs and match scoring |
| Card Skills | Card Counting I | Unsaved observation and memory exercises using shared card and hand mechanics |

All visible tables are currently free. Canasta remains a paused prototype;
Canasta, Card Counting II and Solitaire are hidden from the player catalog.
Future pack/Pro metadata is not an entitlement system or a visible paywall.

## Shared Learning Experience

- Each table exposes Learn and Play. Practice is an activity within Learn, not
  a third tab; Pro is hidden.
- Learn separates the next lesson, individual skills, guided hands and reference.
  Topic exercises are attached to skills rather than duplicated in a Quick Drill menu.
- Shared lessons use worked, supported and independent decisions where authored,
  with game-specific evaluation and bounded reinforcement after mistakes.
- Feedback explains the actual choice. Review decisions preserves the visible
  position, selected cards and explanation without revealing hidden hands.
- Completion offers retry and the next lesson together; Play and return-to-Learn
  actions remain secondary. Finishing a path leads onward rather than repeating
  its first lesson. Reset lessons allows an intentional restart.
- Hearts, Gin Rummy, Spades, Whist, Bridge and Barbu have unsaved guided hands
  using their normal engines. Hints and explanations are shown automatically;
  recaps use actual play. Guided hands do not replace saved matches or award
  course completion merely for playing a hand.
- Shared coach portraits use the custom deck identity. Coaching should clarify
  decisions, not obscure cards or become long dialogue.
- Card Counting shares the Learn/Play surfaces but does not have authored course
  completion keys. Do not imply identical curriculum depth across every table.

Content ownership and detailed learning contracts are in
[content/README.md](content/README.md) and [game architecture](docs/game-architecture.md).

## Play Boundaries

- **Hearts:** rotating left/right/across/hold passing; holder of 2C opens with it;
  follow suit, first-trick penalty restrictions and hearts-broken restrictions
  (including an all-hearts hand exception). Hearts and the queen of spades score
  penalties. Shooting the moon gives the shooter zero and others 26; reaching
  100 ends the match, lowest score wins. The 2C opening is a documented product
  convention, not a claim that every club uses it. See [Hearts](docs/hearts.md).
- **Whist:** trump comes from the dealer's last card; dealer-left opens; odd tricks
  above six score. Single-game and rubber modes, dealer rotation, settlement and
  completion are implemented. Opponent partnership habits are heuristics, not
  perfect communication. See [Whist](docs/whist.md).
- **Spades:** see the deal before bidding; only the player's own bid is adjustable.
  Individual bids contribute to partnership targets. Nil, bags, ten-bag penalties
  and match completion are implemented; blind nil is not. Shared bidding logic
  lives in `src/domain/spadesBidding.ts`, settlement in `spadesScoring.ts`.
- **Bridge:** rotating legal auctions, doubles/redoubles, declarer/dummy roles,
  vulnerability, passed-out boards and duplicate contract scoring. Barbu Natural
  is a limited natural bidding system, not SAYC or expert play. Session totals
  are contract points, not matchpoints or IMP comparisons. The South-dummy
  training convention is documented. See [Bridge](docs/bridge.md).
- **Gin Rummy:** classic scoring with automatic meld/layoff selection, not every
  regional rummy variant. See [Gin Rummy](docs/gin-rummy.md).
- **Barbu:** fixed-order training through all seven contracts, not canonical
  dealer-selected contracts, doubling or full historical settlement. Domino
  starts at sevens; its opponent policy still consults the next player's hidden
  hand. Do not claim public-information-only Domino opponents.

### Barbu Contract Values

These are the implemented training-table values, not a fresh source audit.
Full-hand and generated-practice scoring must stay aligned.

| Contract | Implemented scoring |
| --- | --- |
| No Hearts | Ordinary hearts: 2 penalty points; ace: 6 |
| No Queens | Each queen: 6 penalty points |
| King of Hearts | King of hearts: 20 penalty points |
| No Last Two | Trick 12: 10 penalty points; trick 13: 20 |
| No Tricks | Each trick: 2 penalty points |
| Hearts Trumps | Hearts fixed as trump; each trick: +5 |
| Domino | Forced-only passes; order out: +45, +20, +5, -5 |

## Shared Product Foundations

- TypeScript domain rules, policies, lessons and sessions run locally on both
  browser and native builds. Rust is only the Tauri shell/native integrations.
- Shared metadata factories, table components, learning controllers and save
  adapters support expansion without duplicating whole games.
- Saved matches resume independently of lessons. Learning progress and exercise
  history are local; failed persistence must not silently claim a successful save.
- Stable table geometry, readable cards and reachable thumb controls are shared
  layout requirements. Feedback must not move the board between decisions.
- Catalog actions offer Share Barbu and an external Google Maps search for card
  clubs. These are not multiplayer, a club directory or a membership service.
  Sharing currently targets Google Play; verify public listing availability
  before advertising it to people outside the test.

## Next Priorities

1. Release polish: physical-device upgrades, resume, native links/sharing and
   small-screen layout checks. Store approval and rollout state belong in the
   dated [Google Play](docs/google-play-release.md) and
   [App Store](docs/app-store-release.md) runbooks, not inferred from local builds.
2. Learning quality: observe where players stall; improve explanations, independent
   transfer decisions and reinforcement without adding competing entry points.
3. Card Counting: broaden boss-card answers and void-spotting evaluation, then
   connect useful memory skills to real game decisions.
4. Opponent quality: strengthen game-specific policies with reproducible cases,
   including Domino's hidden-information limitation and Barbu endgame choices.
5. Catalog growth: resume additional games only after existing journeys are
   dependable; use the architecture checklist and document each rules profile.

## Later And Non-Goals

Accounts, cloud sync, multiplayer, tournaments, subscriptions, usage meters and
paid packs are not implemented. Monetization remains a future product decision;
centralize access checks if introduced. Do not describe metadata as paid functionality.

Other candidates include spaced review, adaptive difficulty, achievements,
additional varieties, sound/haptics and character animation. They are not release
promises. In-product reference should describe rules and varieties, not completed
development work or upcoming features.

## Feature Intake

Before adding a feature, identify its player benefit, game objective, shared
foundation, domain/UI/content owner, verification plan and next useful card
decision. Keep teaching brief, rules honest and new abstractions justified by
actual reuse. Never copy proprietary teaching text or visual identities.
