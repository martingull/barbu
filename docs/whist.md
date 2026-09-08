# Whist Table Baseline

Barbu's Whist table models classic four-player partnership Whist, not Bid Whist
or a whist drive. Partners sit opposite, play proceeds clockwise, each seat has
13 cards, and the dealer's last card sets trump. Follow suit when possible;
otherwise any card is legal. Highest trump wins, otherwise highest led suit.

Each trick above six scores one point. A game ends at five or more points.
The session selector offers a single game or best-of-three games (a rubber).
Game points reset between games; two game wins end the rubber. Honours and
traditional rubber stake settlement are not scored. Clubs using drive movements,
fixed numbers of deals, scheduled trumps, or honours need separate named formats.

## Computer Play

The acting hand, public trick history, and the exposed dealer card are the only
inputs to `WhistPosition`. No other concealed hand is passed to the policy.
The policy develops long suits, leads fourth highest from broken length and the
top of touching honour sequences, returns partner's suits including trumps when
useful, recognizes public voids and promoted winners, and conserves winners when
discarding. Second-, third-, and fourth-hand choices have distinct policies.

These are deterministic teaching heuristics, not an expert solver. They do not
perform probabilistic deal sampling, deep lookahead, advanced signal inference,
or full entry/endplay planning. Club-player review and a broader tactical corpus
remain necessary before making claims about opponent strength.

## Implementation And Verification

- Rust policy and settlement: `crates/barbu-core/src/whist.rs`.
- Browser policy mirror: `src/whistPolicy.ts`; session mirror: `src/whistScoring.ts`.
- Table metadata and learning path: `src/games/whist.ts` and the shared table factory.
- Authored decisions: `src/whistLessons.ts`; concepts and examples: `src/courseContent.ts`.
  Learn covers the same clockwise deal/play, exposed trump, five-point games,
  honours-off scoring and optional rubber as Play. Tests check all 18 authored
  decisions against the public-information policy and complete all seven lessons.
- Common tactical and scoring fixtures: `tests/fixtures/whist-*.json`.
- Rust integration tests run the fixtures and 128 full deals. Browser tests run
  the same fixtures, 64 full deals, hidden-hand independence, resume, game
  boundaries, and responsive layout checks.
- Tauri DTO tests check explicit dealer selection and old save compatibility.

The deal seed and dealer are independent on subsequent hands. Existing native
hand IDs retain enough information to recover the turned card without changing
the shared trick-taking state. New browser saves retain both public fields.
Version-1 saves without a session mode resume as a single game. Replaying a hand
does not settle it or rotate the dealer. Continuing settles once and advances
the dealer clockwise, including between rubber games.

Rust and browser shuffle algorithms are distinct. Identical policy positions,
not identical numeric seeds, are the cross-runtime comparison boundary.

Run `task core:test`, `task ui:test`, `task build`, `task tauri:check`, and
`cargo test -p barbu-app whist_tests`. Browser testing does not replace a signed
device build and physical-device smoke test.

## Rules And Conventions

The repository's starting reference remains David Parlett's *The Penguin Book
of Card Games*. Online cross-checks for this pass:

- [Pagat: Whist](https://www.pagat.com/whist/whist.html), classic deal, exposed
  trump, five-point game, and format distinctions.
- [Brian Furniss: Whist tips](https://www.simonlucasbridgesupplies.co.uk/blog/how-to-play-whist-complete-guide-with-tips-and-tricks/),
  practical partnership conventions. These are guidelines, not legal-play rules.
