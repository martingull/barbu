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
| 1 | Canasta, Modern American, four-player partnerships | Adds partnership meld-building beyond Gin Rummy. | Eight shared learning topics and guided hand; Android billing closed test `1000010` is published. Combined `1.0.8` / `1000012` candidate is signed and verified locally, not uploaded. Paid production awaits [launch acceptance](premium-launch.md). |
| 2 | Euchre, four-player North American partnership profile | Five-card hands and compact trump decisions offer an approachable partnership game. | Selected November 23. [Learn, guided hands, full games, public-information opponents and saves](euchre.md) implemented through the shared architecture and existing Premium entitlement. Native verification and a new release candidate remain outstanding; not released. |
| 3 | Schnapsen, two players | Twenty-card deck and five-card hands provide compact decisions with substantial depth. | Agreed candidate. Teach card points, marriages, stock closure and changing follow-suit obligations. |
| 4 | Cribbage, two-player six-card game | Adds a distinct scoring family and a strong reason for interactive teaching. | [Initial playable implementation](cribbage.md): game to 121, crib discards, pegging, ordered counting review, saving, six shared Learn topics and an unsaved guided deal. Browser-tested; native checks and a store build remain outstanding. |
| 5 | Oh Hell!, initially four players | Exact bidding offers a different objective from Spades and variable hand sizes. | Agreed candidate. Choose one deal sequence, scoring system and dealer-bid restriction explicitly. |
| 6 | Scopa, initially two players | Adds table capture rather than another trick-taking or rummy game. | Agreed candidate. Needs capture selection, scoring and a clear mapping for our card artwork. |
| 7 | Skitgubbe, initially three players | Adds a Scandinavian two-phase collection and shedding game. | Agreed candidate. Confirm the regional profile and support larger second-phase hands. |
| 8 | Skat, three active players | A deeper German club-game destination for experienced learners. | Agreed candidate, later. Auction, contracts, scoring and opponent quality deserve a substantial dedicated pass. |

Canasta stays the next substantial expansion. Euchre and Schnapsen are the
recommended smaller-hand additions; this is not a claim that Schnapsen is easy
to master. Cribbage and Scopa broaden the catalog's mechanics. Skat should not
be treated as a quick implementation merely because it uses a reduced deck.

## French-Game Expansion

Added November 23, 2026 after Martin requested a French store listing and more
French card games. This is an additional catalog direction, not evidence of
French-language demand or a cancellation of the approved shortlist above.
Martin selected Belote as a free game on November 25. Its [Classic profile](belote.md)
is implemented in source with the shared learning and play structure; native
acceptance and a new store package remain outstanding. Store localisation does
not translate lessons.

| Proposed sequence | Game | Fit and additional work |
| --- | --- | --- |
| First | Classic four-player Belote | Free source implementation: taking, trump ranks/values, compulsory plays, protected belote/rebelote, exact scoring, litige and matches to 1,000. Seven Learn topics and a guided deal; mobile release acceptance remains. |
| Then | Coinche | A Belote-family extension with contract bidding and coinche/surcoinche. Share reviewed Belote mechanics, not a second copied engine; choose one named profile rather than merging local variants. |
| Later | French Tarot, initially four players | A substantial club-game destination, but requires a 78-card deck including cavaliers, 21 trumps and the Excuse, 18-card hands, a chien, different scoring and new artwork/layout verification. Not a quick 52-card reskin. |

Belote is the recommended first implementation within this later French track;
Tarot remains an alternative. The observed country changes alone do not
tell us which game Algerian or French players want. Ask local players about
their preferred games and rules before claiming regional compatibility.

### Belote Preparation

Start from Parlett's treatment in the available edition, then reconcile it with
Pagat and the selected French club/federation profile. No edition/page reference
has yet been verified. Confirm declarations, scoring, match target, dealing
convention and all-pass handling explicitly; do not silently combine sources.
Pagat includes declaration rules that may differ from other club profiles.

Build the same complete learning journey as the existing games: rules reference,
short decisions with feedback and review, an unsaved guided hand, independent
saved Play, scoring and match completion. Suggested teaching topics are card
rank/value, taking or passing, following suit, trumping/overtrumping, partnership
play, belote/rebelote and scoring. Tactical advice must use public information.

Reuse the registry/table factory, shared Learn and feedback surfaces, card
components, saved-session plumbing and central access policy. The existing
13-card trick-hand validation and follow-suit-only legality are not sufficient.
Review deck-size, direction, rank and legality extension points before choosing
small shared hooks or a separate Belote hand model. Keep rules, taking, policy,
scoring and deterministic transitions in TypeScript domain code, never Svelte
or Rust. Test existing games if shared engine contracts change.

Do not infer Premium classification from French localisation. Confirm access
before exposing a new table, and do not invent a billing product for each game.
Release only after domain, save/replay, lesson progression, guided-hand and
small-phone/browser/native checks satisfy the [shared checklist](game-architecture.md).

References checked November 23, 2026:

- [Pagat: Belote](https://www.pagat.com/jass/belote.html), including its separate Coinche section.
- [Fédération Française de Belote: Coinche](https://www.ffbelote.org/regles-coinche/), a profile to compare rather than silently combine with Pagat.
- [Pagat: French Tarot](https://www.pagat.com/tarot/frtarot.html), including its account of club/tournament play.

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
