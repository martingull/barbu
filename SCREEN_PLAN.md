# Barbu Screen Plan

This document describes the intended product layout before the UI is redesigned. It should keep learning, practice, full-game play, reference, and future features from drifting into one mixed screen.

The current visual direction can remain casino-inspired: green table surface, compact cards, restrained gold/cream accents, and a serious game-room feel. The plan is about information architecture first, not a decorative redesign.

## Product Areas

The app should separate these concerns:

- **Game family catalog**: shared foundations for related games.
- **Learning**: structured progression for a beginner.
- **Practice**: quick repeatable decisions outside the lesson path.
- **Playing**: full hands and Barbu runs.
- **Reference**: Parlett-style rule structure and variants.
- **Meta features**: progress, monetization, multiplayer, accounts, and future character presentation.

When a feature is added, it should have one primary home. Cross-links are allowed, but the feature should not become another button scattered across every screen.

## Game Family Model

Barbu is the first playable game, not the product boundary. The app should grow from shared game families rather than isolated one-off games. The product priority is still to make Barbu feel good first: clear learning, reliable full-hand play, useful practice, and a coherent run/game loop.

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
- Bridge and Whist should stay visible as future product direction, but not become active implementation work until Barbu has a stable learning, practice, and play loop.

## Screen Map

### Catalog / Welcome

Purpose: choose the game family, core game, or current learning/play destination.

Current role:

- Shows Barbu as the first playable core game.
- Shows future core games such as Hearts, Whist, and Bridge.
- Keeps varieties under their parent game.
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

- Continue the learning path.
- Start Play Barbu.
- Start Barbu run.
- Open individual full-hand contracts.
- Open reference.

Near-term direction:

- Group actions by intent:
  - Learn
  - Practice
  - Play
  - Reference
- Make Barbu run the main play entry once it feels stable.
- Move individual contract hands into a clear practice/play subgroup instead of a long undifferentiated button row.

Should not contain:

- Other Hearts-family games as if they were Barbu contracts.
- Deep lesson content.
- Run result details.
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

### Play Barbu

Purpose: quick mixed-contract practice.

Current role:

- Three generated or fallback decisions.
- Immediate outcome feedback.
- Result and review links.

Future role:

- Become the fast practice mode, like a daily drill.
- Vary scenarios independently from the learning path.
- Use recent mistakes to choose focused drills.

Should not contain:

- Full-hand progression.
- Full Barbu settlement scoring.
- Long reference explanations.

### Full-Hand Contract Table

Purpose: play one contract hand at a time.

Current role:

- No Hearts, No Queens, King of Hearts, No Last Two, and No Tricks.
- Shared table surface.
- Local contract penalty tracking.
- Compact result panel.

Future role:

- Better opponent policy.
- Stronger trick-by-trick tactical feedback.
- More contracts.
- Optional contract replay from review or Barbu run.

Should not contain:

- Learning path step management.
- Mixed drill history.
- Full run settlement beyond the current hand.

### Barbu Run

Purpose: play a sequence of full-hand contracts as the early version of a full Barbu game.

Current role:

- Runs through playable full-hand contracts.
- Tracks running player penalty total.
- Ends with a compact run summary.

Near-term direction:

- Make this the main play mode.
- Add the remaining contracts.
- Add full Barbu settlement scoring when contract coverage is broad enough.
- Clarify whether contract order is fixed, chosen, or dealer-driven.

Should not contain:

- Lesson concepts.
- Generated drill review.
- Multiplayer.

### Reference

Purpose: structured rules and variants.

Current role:

- Parlett baseline.
- Object, players, cards, deal, play, scoring, contracts, and documented varieties.

Future role:

- Add references for more games.
- Link from lessons and play screens.
- Distinguish core rules from variants clearly.

Should not contain:

- Main learning flow.
- Practice results.
- Character dialogue unless it clarifies a rule.

### Barbu Character Layer

Purpose: product identity and coaching presence.

Character concept:

- Barbu is the King of Cards.
- He is a bearded king-like opponent and coach.
- His suit identity is undecided.

Near-term role:

- Short text moments only.
- Set the contract.
- React to clean play or mistakes.
- Give one-sentence correction.

Later role:

- Character portrait or simple animated state.
- Small emotional reactions after decisions.
- Stronger presence in run results and lesson milestones.

Design constraints:

- Barbu should clarify the game, not distract from it.
- Do not copy Duolingo characters, art direction, animation style, or wording.
- Do not start with animation before the screen roles are stable.

### Multiplayer

Purpose: future social or online play.

Status: out of scope for now.

Future home:

- Separate play area or room setup.
- Not mixed into learning drills or local Barbu run.

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
