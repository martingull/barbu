# Spades Table Baseline

Four players form fixed partnerships: You and Barbu against Left and Right.
Use a standard 52-card pack, aces high, with spades always trump. Deal thirteen
cards each clockwise. The first dealer is seed-selected; subsequent dealers
rotate clockwise independently of shuffle or lesson seeds. The seat to dealer's
left opens. Follow suit when able. A void player may discard or trump. Spades
cannot be led before being broken unless the leader holds only spades. Highest
spade wins; otherwise highest card of the led suit wins. The winner leads next.

This is a deliberate partnership baseline informed by
[Pagat's Spades rules](https://www.pagat.com/auctionwhist/spades.html), within
Parlett's Whist-family organization, not a claim that every club uses these rules.
Club players should confirm nil, bags, bidding and match-target conventions.

## Bidding And Scoring

The player sees all thirteen cards before locking their own bid, including nil.
All other seats bid from their own hands using the same deterministic starter
estimate: side-suit aces, protected side-suit kings, high spades and extra spade
length. Nil is considered separately. This is a teaching heuristic, not a
guarantee of tricks. The three automated bids are displayed together rather
than announced through a sequential club auction.

Positive bids combine into a partnership target. Made contracts score ten per
bid book plus one per excess book (a bag); set contracts lose ten per bid book.
Nil scores +100 for no tricks and -100 otherwise, independently of the contract.
Failed-nil tricks do not fulfil the partner's bid. They count as one-point bags
even if the partner is set. Every ten accumulated bags costs 100 points; the
remainder carries forward.

Examples for You and Barbu:

- Bid 3 + 2, win 4 + 2: +50 contract and one bag = +51.
- Bid nil + 4, win 1 + 3: -40 contract, -100 nil and one bag = -139.
- Bid 2 + 2, win 3 + 3 with nine bags carried in: +40 + 2 - 100 = -58;
  one bag carries forward.

Score the entire hand before checking the 500-point target. The higher score
wins; tied scores at or above 500 require another hand. Blind nil, jokers,
deuces-high packs and alternative bag/failed-nil conventions are not included.

## Learning And Computer Play

Nine topics each have three worked/supported/independent decisions and one fresh
companion per missed decision: foundations, following suit, trumping, legal leads,
bidding, personal nil, bags, hand scoring, and nil/set settlement. There are
27 base decisions plus 27 bounded follow-ups. Foundations ask for the winning seat, partnership
and next leader. Bid questions show thirteen actual cards and use the same
estimate as Play. Scoring questions call the live scorer, including ordinary set
contracts and successful nil with both made and missed partner bids. All six
existing lesson keys remain. New topics use `spades-leading`, `spades-nil` and
`spades-settlement`; no prior learning evidence or match saves are reset.

Lead questions use `legalSpadesCards`, also used by normal hands. They cover
unbroken spades, an earlier trump breaking spades, and holding only spades.
These are hand-only selection questions with no empty board, not completed tricks: no scripted future cards
are displayed or included in review. All legal alternatives are credited when
the prompt asks only for permission, rather than a specific tactical plan.
Nil decisions cover shedding the higher loser, discarding a dangerous ace and
leaving partner's needed winner ahead after personal nil fails. Existing tactical
prompts explicitly state when neither partner bid nil or a protected nil is intact.

Guided hands use the normal session without writing a match save. Public bids
and trick history inform coaching and opponents. Nil-specific ducking, covering
and attacking stop once the nil bidder has won a trick; protecting an intact
partner nil takes priority over avoiding bags. Failed-nil tricks do not advance
the displayed or coached partnership contract. The policy remains a deterministic
heuristic, not an expert solver or a model of every club signalling convention.

## Boundaries And Compatibility

- `spadesBidding.ts`: one estimate shared by Play and bidding exercises.
- `spadesScoring.ts`: contract books, nil, bag penalties and match completion.
- `spadesRules.ts`: shared lead/follow legality and detection of broken spades.
- `trickTakingHand.ts`: shared hand mechanics, Spades legality and policy.
- `spadesSession.ts`: bid locking, review, settlement and dealer rotation.
- `features/spades`: shared table/learning surfaces and presentation adapters.
- `lessons/spades`: courses, tactical decisions and numeric/foundation questions.

The version-1 save key, stored deals and settled result history remain unchanged.
Loading does not recompute historical totals. Unsettled hands use the corrected
scorer, and continuing settles exactly once. Dealer metadata survives replay;
older hand IDs recover dealer from the first recorded lead. Frozen native
fixtures verify saved history and actual-deal recovery, not permanent parity
with superseded nil tactics. No Rust gameplay implementation is retained.

Run `task domain:test`, focused Spades browser tests and `task build`. Browser
mode uses the same engine as native builds; installation, native integrations
and physical-screen testing still require a device build.
