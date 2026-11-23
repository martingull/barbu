# Gin Rummy

## Rules and sources

Gin is the first draw-and-discard table, not a trick-taking variant. Parlett's
family framework is our starting point. We consulted his public
[Gin history](https://www.parlettgames.uk/histocs/ginrummy.html), not a verified
page of The Penguin Book of Card Games. Detailed play and the classic 20/10
scoring profile follow [Pagat](https://www.pagat.com/rummy/ginrummy.html).

Two players receive ten cards from a single standard pack. Non-dealer may take
or pass the opening upcard; dealer may then take or pass it. After two passes,
non-dealer draws stock. Subsequent turns draw one and discard one. A taken
upcard cannot be returned that turn. Aces are low; pictures count ten.

Sets use three or four matching ranks; runs use three or more consecutive
cards of one suit. A card cannot serve two melds. Knock with at most ten
unmatched points after discarding. Defenders can meld and lay off onto the
knocker's exposed melds. Equal or lower defending deadwood undercuts.

Gin adds 20; an undercut adds 10; otherwise score the deadwood difference.
No layoffs against gin. At two stock cards, a non-knocking discard draws the
hand without scoring. Winner deals next; drawn hands retain their dealer.
First to 100 ends the game. Add 20 per hand won and a 100 game bonus, doubled
if the loser never scored. These bonuses do not advance the 100-point target.

## Implementation

- `domain/deck.ts` extracts the existing deterministic shuffle unchanged.
- `domain/rummyMelds.ts` enumerates valid sets/runs. The existing open-source
  [javascript-lp-solver](https://github.com/JWally/jsLPSolver) 1.0.3 (Unlicense)
  solves the non-overlapping maximum-value selection. Defender melds and
  chained layoffs share one optimization; separate greedy choices are unsafe.
- `ginRummySession.ts` owns opening offers, turns, hand scoring, game completion
  and replay. It never imports UI or storage.
- `ginRummyPolicy.ts` sees only its own cards, the upcard and public pickups.
  No hidden opponent hand or stock order is passed to its decision function.
- `ginRummySave.ts` uses the shared save-store factory. Version-1 saves keep
  explicit actions, replayed and validated to rebuild state and score summaries.
  They preserve results across reloads and do not re-run a changed AI policy.
- The feature composes `savedSessionFeature`, `GameLearning`, `TablePlaySurface`
  and `CardChoiceHand`. Learn has seven topics with three authored decisions
  each: melds, deadwood, draw choices, a linked turn, knocking, gin, and layoffs/undercuts. Counting and finishing
  topics fade hints across the three decisions. Feedback shows melds and the
  unmatched-card total using the same meld engine as Play. Custom decisions
  feed the shared result summary and never modify match saves. Existing topic
  progress remains valid; new topics begin incomplete.

All seven topics use the shared worked/supported/independent sequence, bounded
reinforcement and read-only decision review. `domain/learningSession.ts` owns
checked-answer locking and progression; game-specific grading stays with Gin.
Every topic reserves the shared guidance area so feedback does not move the
cards or actions. Checked hands are read-only; answer buttons remain visible
with the original selection locked. Longer feedback scrolls within that area.
The separate guided hand reuses the normal session and table with automatic
public-information coaching and a recap of actual decisions and settlement.
It preserves the deal on replay and writes neither match saves nor course
completion. See [game architecture](game-architecture.md) for shared contracts.

Browser coverage follows a new player from the first lesson into guidance,
independent Play and a saved-hand reload. It also checks card/action geometry
before and after incorrect answers and reinforcement in every topic, alongside
the existing full-path, knock/gin, settlement and guided-hand checks.

Complete a turn (`gin-turn`) links three decisions: draw, discard, then count
the ten cards kept. Its authored position starts after the opening offers;
`createGinLearningTurn` conserves a full pack, and normal `transitionGinSession`
actions supply the next position. The stock card stays hidden until drawn, and
a taken upcard cannot be immediately discarded. `advanceGinLearningSession`
adapts the shared lesson controller, carrying the actual draw/discard forward,
including after a fresh reinforcement position. Reviews retain only the cards
visible for each decision. Existing six-topic progress and match saves are
unchanged; the new topic begins incomplete.

The settlement topic exposes both ten-card hands after a knock. Its three
decisions select a layoff card, score a lower-deadwood undercut, and score an
equal-deadwood undercut. Three distinct companions reinforce missed decisions.
Answers and score breakdowns call `scoreGinHand`, exactly as Play does; review
preserves both exposed hands. The new `gin-settlement` key does not reset the
five earlier completions or any match save. This teaches settlement, not optimal
knock timing or a prediction from hidden cards. The classic 10-point undercut agreement was rechecked
against the linked Pagat rules on 2026-11-19.

## Deliberate boundaries

This is a local classic-Gin table, not certified tournament play. Meld declarations
and defensive layoffs are automatically optimized; players cannot choose a
different equally good declaration to restrict layoffs. The deterministic AI
reduces deadwood, preserves nearby cards and avoids feeding known pickups. It
knocks whenever eligible rather than conducting expert probabilistic search.
Oklahoma Gin, Big Gin, Hollywood scoring, 25-point bonuses, multiplayer, gambling
and tournament settlement are not implemented. Final points are informational;
there are no wagers. Physical iOS/Android checks are required before release.
