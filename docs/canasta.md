# Modern American Canasta

## Release Status

Paused and hidden from players. The catalog marks Canasta as `Planned`, so it
cannot be opened or resumed from the home screen. Existing saves are retained.
The implementation and domain tests remain; UI tests skip while it is hidden.
To revisit it, change its catalog status to `Ready`, restore its free-starter
policy entry, and run the full verification below before shipping it.

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
  The policy receives only its cards, public melds/discards, scores and stock
  count. Hidden hands, bonus packet contents, stock values and shuffle seed are
  removed before making a decision. It is a heuristic opponent, not expert search.
- `persistence/canastaSave.ts`: version-1 action-log replay validation. Summaries
  are recomputed; invalid saves are rejected. Other games' saves are untouched.
- `features/canasta/`: composes the saved-session controller, shared table shell,
  card artwork, learning flow and result/completion event. Meld edits stay local
  until confirmed. No rule implementation lives in Svelte.
- `lessons/canasta/`: four courses, each with three short decisions evaluated
  through the same session engine as Play. Exercises never write the match save.

Existing jokers in `public/cards/PNG-cards-1.3/` are used rather than introducing
new artwork. Shared card display keeps the existing suit ordering, with jokers at
the end. Each duplicate is independently selectable by its pack-specific ID.
Standard single-deck shuffle outputs and all existing save identifiers are kept.

## Boundaries And Verification

Local play only, with one computer partner and two opponents. Optional partner
permission dialogue, verbal/table signals, expert search and CLA-specific special
hands are not included. Suggestions are legal candidate groups, not a claim of
optimal strategy. Invalid attempts do not incur physical-table procedural penalties.
Manual card exposure beyond the rules is not simulated.

The hand area scrolls independently when a pile pickup creates many rows; neither
card count nor selection changes board geometry. On short viewports the hand
window becomes shorter without scaling the cards below their readable grid size.
The meld list also scrolls within the board. Large text and very short viewports
can still use normal page scrolling instead of overlapping controls.

Focused commands:

```sh
npm run test:domain -- tests/domain/canasta.spec.ts
npm run test:e2e -- tests/e2e/canasta.spec.ts --project=galaxy-s9 --project=iphone-xr
npm run build
```

Verify complete matches, 108-card conservation, hidden-information independence,
initial meld and pickup edge cases, target completion, exact replay/resume,
blocked storage, twelve learning decisions, narrow-screen layout and a 48-card
hand. Physical-device testing is required before including this game in a store
release; browser coverage does not replace that check.
