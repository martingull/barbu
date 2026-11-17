# Modern American Canasta

## Release Status

Development preview; still hidden in production builds. Start it with
`VITE_CANASTA_PREVIEW=1 npm run dev -- --port 1421` and open Canasta in the
catalog. The flag only works in Vite development mode. Default browser sessions
and release builds retain the seven-game catalog; existing Canasta saves are retained.

A separate [internal iPhone preview](app-store-release.md#internal-canasta-preview)
also unlocks Canasta for TestFlight gameplay testing, without granting Premium.
It must be exported as TestFlight internal-only, never as a public store candidate.

Canasta is classified as Premium by the shared catalog access policy. Its
development preview does not grant a purchase or permanent free unlock. The
Android billing integration is under device testing, with purchase verification
still outstanding. Configured native test builds expose Canasta through Premium.
Do not expose it in a public store build before the device/play-quality and
[commercial release gates](premium.md) are satisfied.

## Rules Profile

Barbu's Canasta table uses the **Modern American profile described by Pagat**,
including its rule of five, delayed opening bonuses, and three special-hand
families. It is not Classic Canasta or a claim of certification by the Canasta
League of America (CLA). The reference names the profile and its differences.

Parlett remains the starting point for the rummy-family organization. No claim
is made that a particular Penguin edition describes these modern agreements.
The public rules were checked on 2026-09-29:

- [Pagat: Modern American Canasta](https://www.pagat.com/rummy/canasta.html#american)
- [CLA: Modern American rules](https://canastaleague.org/rules/)
- [Canasta Junction: Modern rules](https://moderncanasta.com/rules/)

These sources differ. In particular, the CLA lists more special hands, awards
3000 for garbage, and differs in some penalty details. Do not silently mix these
agreements. This table uses Pagat's garbage award of 2000 and incomplete-meld
penalties even when a partnership has exactly one canasta.

## Implemented Agreements

- Four seats, clockwise turns and rotating dealer. South (You) and North (Barbu)
  are partners, against West and East. Two packs and four jokers give 108 unique
  physical card identities. Thirteen cards each; discard pile starts empty.
- Twos/jokers wild. Three-to-seven-card rank melds, at most two wilds in a mixed
  meld, natural sevens, natural aces locked pure, mixed aces only in the opening.
  After opening, five natural cards are needed before adding a wild. An unfinished
  wild meld blocks using new wilds elsewhere. Closed natural ranks are dead to
  both partnerships. Each partnership has at most one meld per rank.
- Initial minimum 125/155/180 at scores below 3000/below 5000/5000 and above.
  A natural meld or wild meld is required; natural or wild seven-card splashes
  waive the minimum. Opening groups are validated together and atomically.
- Pickup requires a natural pair in hand matching the top discard, with space
  for the three cards. For an unopened partnership, the opening must qualify
  wholly from hand before the discard is added; the pair may belong to that
  opening. Cards buried in the pile cannot qualify the opening.
  Normal and guided play show definite pickup blockers from the same domain
  pre-check used by the action validator. For example, an existing five-card
  meld plus a natural pair and the discard would make eight cards (maximum
  seven): both pile controls are disabled and the turn explanation shows the
  count. Unopened partnerships can still enter the editor to stage their own
  qualifying opening; absence of an automatic suggestion does not block entry.
- No three discards. Wild discards only when going out or after an all-wild hand
  draws another wild. Empty-pile restrictions on aces, sevens and dead ranks have
  the documented no-alternative exceptions. Melding cannot strand a player
  without a legal discard or required continuing card.
- Threes are exposed/replaced explicitly. Before the partnership opens, one
  three may be retained for a straight. A last-stock three ends play immediately,
  remains in hand and counts five against its holder's partnership.
- Opening reserves four bonus stock cards for the first team, three for the
  second, after discarding. Only the opener receives them, at the next turn.
  No bonus once eight or fewer cards remain. Undrawn bonus packets remain hidden.
- Going out requires two canastas and a final discard. Going out without asking
  partner is legal and is the supported interaction. Exhausted stock still permits
  pile pickups until a player chooses or needs a stock draw.
- Straight (3000), natural pairs (2500), pairs with twos/aces/sevens (2000), and
  garbage (2000). Special hands require 14 cards, a stock draw, and an unopened
  partnership. Special declarers score only the award; opponents score normally.
- Complete canasta bonuses, exposed threes, signed meld values, cards left in
  hand, incomplete meld penalties, per-player ace/seven penalties, and going-out
  bonus are settled once. Target 8500; higher total wins if both reach the target.
  Equal totals at the target are shown as a tied match (explicit digital convention).

## Structure

- `domain/canastaRules.ts`: card identities, meld legality, values and scoring.
- `domain/canastaSession.ts`: deterministic actions, complete hands and matches.
- `domain/canastaPolicy.ts`: bounded deterministic suggestions and computer play.
  The policy receives only its cards, public melds/discards, scores, hand counts and stock
  count. Hidden hands, bonus packet contents, stock values and shuffle seed are
  removed before making a decision. It is a heuristic opponent, not expert search.
- `persistence/canastaSave.ts`: version-1 action-log replay validation. Summaries
  are recomputed; invalid saves are rejected. Other games' saves are untouched.
- `features/canasta/`: composes the saved-session controller, shared table shell,
  card artwork, learning flow and result/completion event. Meld edits stay local
  until confirmed. No rule implementation lives in Svelte.
- `domain/canastaLearning.ts`: one unsaved guided hand using normal transitions
  and opponents. Public-only coaching, checked-move review, observed hand-count
  changes, one-hand completion and exact replay; no lesson progress or storage.
- `lessons/canasta/`: eight courses (card values, melds, opening, meld risk, pile, discard,
  going out, scoring), each with three short decisions and three distinct bounded companions.
  Legality and score questions use the same session/rules as Play. The four
  original progress keys remain; opening, score, card values and meld risk add four new keys.

## Opponent Strategy

The bounded meld search compares legal candidates rather than accepting the first
one. It favors closing canastas and adding to existing groups, and preserves wilds
when they do not complete a canasta. For this conservative heuristic, new pure-ace,
seven and wild melds are suggested only when the move can complete them. Existing
unfinished commitments can still be extended. A pile pickup is declined by the
computer if it would start one of these penalty melds without enough visible cards
to finish it. Manual legal melds and pickups remain available to the player.

Before voluntarily melding down to a final discard, the policy considers public
penalty commitments, the partner's card count, opponents close to going out, low
stock and an estimated match finish. Concealed cards are estimated at ten points
each; their identities and possible ace/seven penalties are not inspected. A
negative own score is not an automatic veto: catching opponents with a worse
public position can justify closing. A player already left with a legal last-card
discard still goes out; the policy avoids committing to that position beforehand.
Two canastas remain a minimum, not a mandatory stopping point or a new maximum.

In a deterministic all-computer comparison of first hands for seeds 0 through 49,
negative partnership-hand scores fell from 46/100 to 20/100, and hands ending by
going out fell from 45/50 to 36/50; the remaining revised hands exhausted the stock.
These are policy diagnostics, not statistics about human clubs or evidence of
expert strength. Rules, point values and action-log replay are unchanged. Existing
saves retain their historical actions; only future computer moves use this policy.

## Shared Learning And Table

`CanastaExercise` uses `learningSession` for immutable answer locking, feedback,
bounded reinforcement and completion. Each topic follows worked, supported,
independent teaching stages. The shared result records all decisions, supplies
read-only position snapshots and score breakdowns, and offers the next lesson,
retry, guided play or ordinary Play. Lessons never overwrite the saved match.
Public/proposed melds are shown alongside the cards needed to answer each question.
These are reduced teaching positions, not simulated full deals.

Manage meld risk compares two legal moves against a stated public goal: avoid a
new unfinished-meld penalty, remove an existing commitment, or complete a canasta
without creating a new commitment. Three worked/supported/independent decisions
have three different bounded reinforcement positions. `canastaMeldDecision` uses
normal transitions and the shared penalty calculation, not the opponent's chosen
move as an answer key. Choosing the riskier legal alternative is Risky, not Illegal.
The comparison is about exposed meld penalties, not a prediction of the eventual
hand score or a claim of globally optimal play. Keeping cards can also be costly.

The course adds only `canasta-risk`, between opening and pile lessons. Completed
older paths become seven of eight complete without resetting prior skills or
saved matches. Both proposed groups, existing public melds, the player's cards
and the selected move are preserved for decision review.

The shared Learn template places Game rules first for all games, with the same
description: Read the rules, scoring and variations.
The reference starts with the value key and a worked 150-point total. The first
lesson, Count card points, opens with a short explanation and a worked example
before its three counting decisions. It distinguishes card values, meld legality,
opening minimums and hand-score bonuses. Other Canasta topics remain decision-first,
and the existing progress ids and match saves are unchanged. Reading rules is
encouraged by placement, not enforced as a gate. The shared template prioritizes
the rules/reference action before any other learning resources.

`CanastaGuidedHand` uses `createGuidedHandFeature`, just like Gin. It composes
`CanastaHandView`, `ExerciseFeedback` and `GuidedHandActions`; no separate game
engine or bespoke learning shell is introduced. Rules and tactical context are
always present. Every accepted action pauses for review; cards and pile actions
are locked until Continue. The final action is retained in a bounded recap even
when it ends the hand. Completion neither advances a match nor awards a lesson.

The shared guided-hand entry explains advice, review and saved-game isolation;
Canasta supplies its partnership/two-canasta goal as table metadata. Turn guidance
names the next action in the current draw, meld or discard phase, explains a
suggested opening's card-point total, and distinguishes a legal starting point
from optimal play. Selected threes, restricted wild discards, the empty pile,
special hands and stock exhaustion get relevant instructions rather than a list
of every restriction. The meld editor explains staging and confirming groups.
Reviews put the next action first, distinguish a three's replacement from the
normal draw, and use actual terminal states rather than promising another turn.
Hand-count facts describe the player's own move, before subsequent opponent turns
or bonus-card delivery. Guidance scrolls within the unchanged reserved feedback
region and returns to the start for each decision; it does not resize the board.
Shared `canastaMeldChanges` facts connect the risk lesson to guided play: advice
describes the visible effect of a proposed meld, and reviews report the actual
group size, remaining cards, conditional unfinished penalty, completed bonus and
removed commitment. These facts are captured before opponents move. Bonuses are
described as end-of-hand amounts, not points already credited. Recaps include an
actual penalty commitment or removal when one occurred; no hint toggles or extra
table controls are added.

The table uses the shared flow surface with a stable feedback region and a
seven-column hand. Stock/pile cards are larger than in the paused prototype.
Completed-hand scores list the actual canasta bonuses, unfinished meld penalties,
per-player ace/seven penalties, red/black threes, melded values and cards left with
both partners. The rows come from the same domain calculation as settlement, not
a second presentation formula. Special-hand winners show only their replacement
award. Signed rows add to the unchanged hand total and are generated again when
old action-log saves are restored.

The meld editor previews legal staged groups and automatic pile-pickup melds using
the public-only observation. It warns about changed, unfinished pure aces, sevens
and wild groups using the same penalty function as scoring. Completing a group or
removing it clears its warning; unrelated old commitments are not repeated. These
are conditional penalties, not charges applied at melding, and confirmation stays
enabled for legal risky moves. Warning text has a reserved scrollable region, so
appearing warnings do not resize the board or move the editor's hand and actions.

Large hands and public melds scroll within their reserved areas. Meld details
can be expanded without resizing the board. On short screens the hand window
shows fewer rows; cards stay selectable by scrolling rather than overlapping
the action row. The meld editor stages changes until confirmation.

Existing jokers in `public/cards/PNG-cards-1.3/` are used rather than introducing
new artwork. Each duplicate is independently selectable by its pack-specific ID.

Canasta uses rank-first presentation: threes, fours through aces, then twos and
jokers. Matching ranks stay adjacent across suits and duplicate packs; suits
and physical pack ids break ties deterministically. The same comparator is
supplied to shared hand, lesson-example and decision-review components, so Play,
guided review, meld selection and Learn use one order. Selection does not regroup
cards, and the seven-column layout is unchanged. Other games retain suit-first
ordering. Sorting copies the display array; deals, turn state and saves are untouched.
Standard single-deck shuffle outputs and all existing save identifiers are kept.

## Boundaries And Verification

Local play only, with one computer partner and two opponents. Optional partner
permission dialogue, verbal/table signals, expert search and CLA-specific special
hands are not included. Suggestions are legal candidate groups, not a claim of
optimal strategy. Invalid attempts do not incur physical-table procedural penalties.
Manual card exposure beyond the rules is not simulated.
The eight topics teach foundations, not a complete advanced Canasta curriculum.
Special-hand construction, partnership strategy, and more nuanced discard choices
still need dedicated lessons and club-player feedback before selling this as an
advanced course. Guidance explains legal possibilities, not optimal strategy.

The hand area scrolls independently when a pile pickup creates many rows; neither
card count nor selection changes board geometry. On short viewports the hand
window becomes shorter without scaling the cards below their readable grid size.
The meld list also scrolls within the board. Large text and very short viewports
can still use normal page scrolling instead of overlapping controls.

Focused commands:

```sh
npm run test:domain -- tests/domain/canasta.spec.ts
npm run test:domain -- tests/domain/canastaPolicy.spec.ts
task domain:test
task ui:test:canasta
npm run build
```

Verify complete matches, 108-card conservation, hidden-information independence,
initial meld and pickup edge cases, target completion, exact replay/resume,
blocked storage, twenty-four base decisions and twenty-four bounded companions,
full guided-hand review/replay, narrow-screen layout and a 48-card
hand. Physical-device testing is required before including this game in a store
release; browser coverage does not replace that check.
