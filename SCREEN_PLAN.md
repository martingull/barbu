# Barbu Screen Plan

This document describes the intended product layout before the UI is redesigned. It should keep learning, practice, full-game play, reference, and future features from drifting into one mixed screen.

The current visual direction can remain casino-inspired: green table surface, compact cards, restrained gold/cream accents, and a serious game-room feel. The plan is about information architecture first, not a decorative redesign.

## Visual System

The app should feel like a compact card table: dark casino green as the dominant surface, cream as a deliberate action color, and soft red/gold accents for labels and scoring. Avoid letting screens drift back to pale document cards unless the element is literally a playing card.

Use color roles consistently:

- **Dark casino green**: default screen background, panels, supporting action cards, reference cards, score panels, and table surfaces.
- **Cream**: primary current action, selected mode tab, enabled main play/check/continue buttons, and important progress markers. Use it enough that it feels like the app's action color, but do not use it for every card.
- **Soft red**: warnings, penalties, planned/future labels, and secondary status emphasis.
- **Muted green/gray**: disabled or inactive states.
- **White card faces**: physical playing cards only.

On hub screens, cream should normally mean "do this next" or "this mode is selected." Supporting destinations such as reference, contract maps, and future-feature placeholders should usually stay dark green unless they are the single primary action for that screen.

## Product Areas

The app should separate these concerns:

- **Game family catalog**: shared foundations for related games.
- **Learning**: structured progression for a beginner.
- **Practice**: quick repeatable decisions outside the lesson path.
- **Playing**: full hands and Play Barbu sessions.
- **Reference**: Parlett-style rule structure and variants.
- **Meta features**: progress, monetization, multiplayer, accounts, and future character presentation.
- **Perfect/card sense**: short skill trainers for transferable counting, memory, and table-reading habits.

When a feature is added, it should have one primary home. Cross-links are allowed, but the feature should not become another button scattered across every screen.

## Game Family Model

Barbu is the first playable game, not the product boundary. The app should grow from shared game families rather than isolated one-off games. The product priority is still to make Barbu feel good first: clear learning, reliable full-hand play, useful practice, and a coherent local game loop.

The Hearts family is the first expansion area because many games share:

- Four-player trick-taking structure.
- A standard 52-card pack.
- Follow-suit legality.
- Trick winner resolution.
- Avoidance scoring.
- Hearts, queens, and other penalty-card concepts.
- Table positions and clockwise play.

Barbu should therefore be implemented as the first complete curriculum and play mode on top of reusable Hearts-family and trick-taking foundations. Later Hearts-family games should reuse as much of this as possible: table layout, legality engine, card rendering, trick feedback, generated practice primitives, and reference structure.

Whist and Bridge are important later families because they are popular classic card games. They may reuse card and trick-taking primitives, but they should get their own family-level concepts when partnerships, bidding, declarer play, or other rules make the Hearts-family model too narrow. They should not pull attention away from making Barbu strong first.

Design implication:

- The catalog should expose game families and core games.
- The Barbu Table should remain specific to Barbu.
- Shared Hearts-family concepts should not be hardcoded as Barbu-only UI or copy.
- Variants should remain attached to their parent core game.
- New games should be added through family-aware data and reusable rules where practical, not by cloning the whole Barbu interface.
- Bridge, Whist, Gin Rummy, Canasta, and Solitaire should stay visible as future product direction, but not become active implementation work until Barbu has a stable learning, practice, and play loop. Barbu, Hearts, and Solitaire are intended as the free starter catalog.
- Catalog order should show free starter tables first: Hearts, Barbu, and Solitaire. Paid packs and paid future games should follow.
- Monetization should support both individual pack purchases and one subscription that unlocks the full catalog. UI can label packs before entitlement plumbing exists, but access decisions should later be centralized.

## Screen Map

### Catalog / Welcome

Purpose: choose the game family or core game.

Current role:

- Shows free starter tables first: Hearts, Barbu, and Solitaire.
- Shows Card Counting after the free starters as the first ready paid skill pack.
- Shows future paid games such as Whist, Bridge, Gin Rummy, and Canasta.
- Keeps varieties under their parent game instead of showing them as separate first-screen tables.
- Signals that Barbu belongs to a broader Hearts-family catalog.

Future role:

- Resume the most relevant learning or play activity.
- Browse Hearts-family games that share trick-taking and avoidance foundations.
- Introduce paid packs or locked families without mixing entitlements into game logic.
- Keep the first screen useful, not a marketing landing page.

Should not contain:

- Detailed Barbu contract controls.
- Full rule prose.
- Multiplayer setup.

### Barbu Table

Purpose: the hub for Barbu.

Current role:

- Groups actions by intent through three primary tabs: Learn, Practice, and Play.
- Continues the learning path.
- Starts quick drills.
- Starts Play Barbu as the multi-contract local game session.
- Shows Continue Play Barbu when an unfinished local run exists.
- Opens contract-hand practice through a chooser.
- Opens reference from Learn as secondary support.
- Opens the Barbu contract roster as a drill-down from Learn instead of showing the full contract list on the hub.

Near-term direction:

- Keep the Learning Path high in the Learn tab; this is the beginner's primary route.
- Keep Play Barbu as the main play entry.
- Keep individual contract hands behind the practice chooser as the contract list grows.
- Keep the contract roster as a separate map for jumping into a specific contract lesson.

Should not contain:

- Other Hearts-family games as if they were Barbu contracts.
- Deep lesson content.
- A long full contract roster competing with the learning path.
- Play Barbu result details.
- Multiplayer room setup.

### Learning Path

Purpose: teach one game through short, ordered steps.

Current model:

1. Concept
2. Example
3. Guided play
4. Practice
5. Review

Design rule:

- The learner should mostly play cards, not read rules.
- Explanations should be short and tied to the current decision.
- Reference material should be available but secondary.

Future role:

- Support multiple lesson nodes per contract.
- Track review due state and weakest concepts.
- Let Barbu act as coach through short reactions, not long lectures.
- Keep Domino lesson states on a layout surface, not the trick-taking table.

### Quick Drill

Purpose: quick mixed-contract practice.

Current role:

- Seven generated or fallback decisions across the playable contract roster.
- Immediate outcome feedback.
- Result and review links.

Future role:

- Become the fast practice mode, like a daily drill.
- Add deeper Hearts Trumps and Domino scenario variety.
- Vary scenarios independently from the learning path.
- Use recent mistakes to choose focused drills.

Should not contain:

- Full-hand progression.
- Full Barbu settlement scoring.
- Long reference explanations.

### Full-Hand Contract Table

Purpose: play one contract hand at a time.

Current role:

- No Hearts, No Queens, King of Hearts, No Last Two, No Tricks, Hearts Trumps, and Domino.
- Shared table surface.
- Local contract value tracking for avoidance and positive-trick contracts.
- Domino uses the same active-game shell with a layout grid instead of a trick table.
- Compact result panel.

Future role:

- Better opponent policy.
- Keep improving opponent policy, especially table-aware endgame choices and trump timing.
- Stronger trick-by-trick tactical feedback.
- More contracts.
- Optional contract replay from review or Play Barbu.

Should not contain:

- Learning path step management.
- Mixed drill history.
- Full game settlement beyond the current hand.

### Play Barbu

Purpose: play a sequence of full-hand contracts as the early version of a full Barbu game.

Current role:

- Runs through playable full-hand contracts as one local session.
- Saves unfinished local runs so the player can continue a Play Barbu session from the Play tab.
- Shows a compact contract intro before each hand.
- Tracks running score totals for You, Barbu, Left, and Right.
- Shows a session summary with leader, player place, and contracts remaining.
- Shows a scorecard with signed cells, contract rows, four-player columns, current/completed/pending states, and totals.
- Ends with four-player placement, best and weakest contracts, focused replay, and the same scorecard.

Near-term direction:

- Keep this as the main play mode.
- Add the remaining contracts.
- Add full Barbu settlement scoring and the remaining contract surfaces when coverage is broad enough.
- Clarify whether contract order remains fixed, chosen, or dealer-driven.
- Feed weakest-contract replay into the broader review loop.

Should not contain:

- Lesson concepts.
- Generated drill review.
- Multiplayer.

### Reference

Purpose: structured rules and variants.

Current role:

- Parlett baseline.
- Object, players, cards, deal, play, scoring, contracts, and documented varieties.
- Contract roadmap showing core playable contracts, teaching coverage, and later variants.

Future role:

- Add references for more games.
- Link from lessons and play screens.
- Distinguish core rules from variants clearly.
- Keep app teaching modes separate from rule varieties.

Should not contain:

- Main learning flow.
- Practice results.
- Character dialogue unless it clarifies a rule.

### Perfect / Card Sense

Purpose: train skills that make the player stronger across 52-card games.

Current role:

- Starts a Card Counting pack.
- Offers Count Trumps as the first minigame: reveal completed tricks one at a time, hide the cards, then ask how many trumps remain.
- Offers Track Court Cards as the second minigame: show played cards, count visible jacks, queens, and kings, and answer how many remain.

Near-term direction:

- Add danger-card memory as a separate exercise.
- Tie Perfect exercises back to Barbu, Hearts-family games, Whist, and Bridge.
- Keep each exercise short and interactive, not a rules article.

### Barbu Character Layer

Purpose: product identity and coaching presence.

Character concept:

- Barbu is the King of Cards.
- He teaches many card games because he is the king.
- His visual identity should present him as a King of Hearts.
- He is a bearded king-like opponent and coach.

Near-term role:

- Short text moments only.
- Set the contract.
- React to clean play or mistakes.
- Give one-sentence correction.

Later role:

- Character portrait or simple animated state.
- Small emotional reactions after decisions.
- Stronger presence in Play Barbu results and lesson milestones.

Design constraints:

- Barbu should clarify the game, not distract from it.
- Do not copy Duolingo characters, art direction, animation style, or wording.
- Do not start with animation before the screen roles are stable.

### Multiplayer

Purpose: future social or online play.

Status: out of scope for now.

Future home:

- Separate play area or room setup.
- Not mixed into learning drills or local Play Barbu.

Dependencies before serious work:

- Stable local rules.
- Full scoring.
- Account or guest identity decision.
- Network/session model.

## Navigation Principles

- One primary action per screen.
- Group secondary actions by intent, not by implementation detail.
- Keep table screens compact and no-scroll where practical.
- Prefer returning to the Barbu Table over adding many deep back paths.
- Keep reference one tap away, but never make reference the main lesson.
- Do not expose internal distinctions like browser fallback versus Rust hand unless debugging.

## Visual Direction

Keep:

- Casino/table inspiration.
- Dense, touch-friendly controls.
- Serious card-room tone.
- Compact results and summaries.

Avoid:

- Marketing-page heroes.
- Decorative cards inside cards.
- One-off table layouts per contract.
- Long text blocks inside play states.
- Large character art before the character role is defined.

## Implementation Notes

- Shared game-table screens should continue using a generic table surface.
- Rules, scoring, generated practice, and reusable hand state should stay in Rust where practical.
- Svelte should handle screen composition, interaction, and short learner-facing copy.
- Future screen refactors should first group existing actions by intent before changing visual style.
