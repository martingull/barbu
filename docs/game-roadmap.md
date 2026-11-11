# Game Expansion Shortlist

Rebuilt November 11, 2026. This replaces our unrecorded discussion, not a
recovered historical list. Martin approved the eight-game shortlist below.
The order remains a planning guide, not a release commitment. No dates are
promised. Exact rules profiles still need confirmation before implementation.

## Selection Principles

Support learning games people can take to a real social or club table. Balance
familiar games with approachable discoveries and different game families.
Small hands can suit short lessons and phone screens, but do not imply simple
rules or cheap implementation. Organise discovery by family; historical context
can enrich lessons without becoming the required navigation order.

Use Parlett as the starting reference, with Pagat and relevant club rules to
choose and document a specific playable profile. Popularity and regional reach
are not yet quantified; this is a product shortlist, not market-size research.

## Proposed Order

| Order | Game and initial profile | Why it belongs | Status / main work |
| --- | --- | --- | --- |
| 1 | Canasta, Modern American, four-player partnerships | Adds partnership meld-building beyond Gin Rummy. | Agreed candidate. Resume the paused prototype only after rules, learning and mobile-layout audits. |
| 2 | Euchre, four-player North American partnership profile | Five-card hands and compact trump decisions offer an approachable partnership game. | Agreed candidate. Specify bowers, trump selection, going alone and table agreements. |
| 3 | Schnapsen, two players | Twenty-card deck and five-card hands provide compact decisions with substantial depth. | Agreed candidate. Teach card points, marriages, stock closure and changing follow-suit obligations. |
| 4 | Cribbage, two-player six-card game | Adds a distinct scoring family and a strong reason for interactive teaching. | Agreed candidate. Needs crib selection, pegging, hand scoring and a readable scoring display. |
| 5 | Oh Hell!, initially four players | Exact bidding offers a different objective from Spades and variable hand sizes. | Agreed candidate. Choose one deal sequence, scoring system and dealer-bid restriction explicitly. |
| 6 | Scopa, initially two players | Adds table capture rather than another trick-taking or rummy game. | Agreed candidate. Needs capture selection, scoring and a clear mapping for our card artwork. |
| 7 | Skitgubbe, initially three players | Adds a Scandinavian two-phase collection and shedding game. | Agreed candidate. Confirm the regional profile and support larger second-phase hands. |
| 8 | Skat, three active players | A deeper German club-game destination for experienced learners. | Agreed candidate, later. Auction, contracts, scoring and opponent quality deserve a substantial dedicated pass. |

Canasta stays the next substantial expansion. Euchre and Schnapsen are the
recommended smaller-hand additions; this is not a claim that Schnapsen is easy
to master. Cribbage and Scopa broaden the catalog's mechanics. Skat should not
be treated as a quick implementation merely because it uses a reduced deck.

## Skitgubbe Rules Scope

Included before Skat in the proposed order. Pagat's Swedish three-player
profile has two phases: collect cards through tricks,
then shed them by beating plays; the last player holding cards loses.
This adds a Scandinavian social game and a distinct teaching opportunity:
choices in the collection phase shape the shedding phase.

Confirm the intended household/regional rules before implementation. Norwegian
Mattis is related, not an interchangeable label for an identical ruleset.
Start from one named profile rather than combining variants. The initial
three-card hands do not imply small hands throughout: phase two needs a layout
that can handle accumulated cards, and its beating rules need their own domain
transitions rather than being forced into the standard trick-hand engine.

## Scope and Release Gate

Gin Rummy is already implemented and is not a future addition. Solitaire and
Card Counting II remain older catalog placeholders; they are not prioritised
by this shortlist. Do not reveal planned entries in the player-facing catalog.

Each addition must include the shared Learn path, decision feedback, guided
play, complete saved games, documented rules, and domain/browser/mobile checks.
Reuse the [game architecture](game-architecture.md) and existing factories;
extend shared mechanics only when the new game's needs justify it. Do not
trade teaching quality or opponent correctness for a larger game count.

## Rules References

Public pages checked November 11, 2026. These identify candidate profiles, not
completed implementation specifications or permission to copy their prose.

- [Canasta](https://www.pagat.com/rummy/canasta.html), plus our [prototype profile](canasta.md).
- [Euchre](https://www.pagat.com/euchre/euchre.html).
- [Schnapsen](https://www.pagat.com/marriage/schnaps.html).
- [Six-card Cribbage](https://www.pagat.com/adders/crib6.html).
- [Oh Hell!](https://www.pagat.com/exact/ohhell.html).
- [Scopa](https://www.pagat.com/fishing/scopa.html).
- [Skat](https://www.pagat.com/schafkopf/skat.html).
- [Skitgubbe and related games](https://www.pagat.com/beating/skitgubbe.html).
