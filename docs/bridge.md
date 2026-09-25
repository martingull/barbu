# Bridge Table

## Rules And Agreements

The rules baseline is contract partnership Bridge. The standard board schedule
follows [Laws of Duplicate Bridge, Law 2](https://www.ebu.co.uk/documents/laws-and-ethics/laws/law-book-2017-ebu.pdf#page=27).
Board number, not deal seed, determines dealer and vulnerability. Passed-out
boards record zero points and advance without clearing previous results.
Existing saved boards keep their original conditions until the next deal.

Barbu Natural is a deliberately limited natural bidding agreement, not SAYC:

- 13+ HCP one-level openings; five-card majors, better minor, clubs with 3-3 minors.
- Balanced 1NT 15-17, 2NT 20-21. Over 1NT, 2NT invites with 8-9,
  3NT shows 10+, and two of a major is a natural weak sign-off. No transfers.
- Strong 2C at 22+; 2D waiting with any strength. Opener rebids 2NT with
  22-24 balanced, 3NT with 25+ balanced, or a long suit. The strong suit
  continuation aims for game; 2NT may be passed by a very weak responder.
- Weak two openings in D/H/S at 5-11 with six cards.
- Major support raises: 6-9 simple, 10-12 invitational, 13+ game.
- Natural new-suit responses, balanced rebids, support raises, and basic
  invitation acceptance. One-round forcing responses get an opener rebid.
- Low-level takeout doubles require shortness in the opponent suit and support
  for the unbid suits. Natural overcalls require length, and notrump overcalls
  require a stopper. Weak hands advance partner's takeout double.

Not yet supported as a complete bidding system: Stayman, transfers, slam
investigation, negative/responsive doubles, forcing passes, or all competitive
continuations after interference. Manual legal calls remain available, but
computer partners do not understand unimplemented conventions.

## Implementation

`src/domain/bridgeBidding.ts` contains Barbu Natural bidding and contextual explanations,
shared by browser and installed builds. `src/domain/bridgeAuction.ts` owns legal
calls and contract formation; `bridgeScoring.ts` owns duplicate scoring.
`bridgeSession.ts` owns auction/play phases, trick review, replay and board
settlement. `src/persistence/bridgeSave.ts` validates and restores version-1 saves
through the shared save-store factory. The duplicate Rust Bridge module and
Tauri commands are removed.

Frozen native bidding, auction and score fixtures protect compatibility. Tests
rotate bidding fixtures through all seats and reverse card ordering. Legacy
save fixtures protect declarer/dummy play and resume. Replay restores the same
deal and contract without settling it; Next board adds its score once.

Full-hand Bridge currently uses `src/domain/trickTakingHand.ts` on browser and
Tauri. Opponent choices use their own cards, the exposed dummy, and played-card
history. Declarer may additionally use the other declaring hand. Defenders must
not use partner's hidden cards. Tests check information independence, follow-suit
legality, card conservation, and completion across all declarer seats and strains.

Authored short exercises live in `src/lessons/bridge/exercises.ts`, not the screen.
Each topic has three decisions; defense exercises remain defensive. Legal cards
are checked separately from tactical grades, and scripts must contain four unique
seats in clockwise order with no duplicated cards.

## Remaining Strength Boundaries

The table is local practice, not an expert-strength partner or duplicate event.
Cardplay uses sequence and fourth-best leads, basic winner preservation, third-hand
play, public trump memory, and a simple finesse lead. It does not search complete
plans for entries, safety plays, or defensive signalling. Session scores sum raw
contract points; matchpoints and IMPs require comparison results and are a separate
feature. Do not advertise a complete club competition mode yet.

## Verification

Run `task domain:test`, `task build`, `task tauri:check`, and `task ui:test`.
Focused Bridge coverage: `npx playwright test --grep Bridge`.
Browser mode exercises the same practice, auction, scoring and full-hand rules
as installed builds. Frozen native parity runs in the domain tests. A fresh
physical-device build and upgrade smoke test are still required before release.
