# Bridge Table

## Rules And Agreements

The rules baseline is contract partnership Bridge. The standard board schedule
follows [Laws of Duplicate Bridge, Law 2](https://www.ebu.co.uk/documents/laws-and-ethics/laws/law-book-2017-ebu.pdf#page=27).
Board number, not deal seed, determines dealer and vulnerability. Passed-out
boards record zero points and advance without clearing previous results.
Existing saved boards keep their original conditions until the next deal.

Bridge offers two named teaching profiles. The selector applies to new boards,
guided boards and bidding lessons; it does not change a saved board's agreements.
All four seats use the same selected profile. Existing saves without a system
field remain Barbu Natural. The existing free Bridge access is unchanged.

### Barbu Natural

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

### Acol Foundation

This beginner profile starts from the [Standard English Acol Foundation Level
system file (2019)](https://www.bridgewebs.com/castlegc/ACOL.pdf), not from a claim
that every Acol club uses the same agreements. Explanations and hands are original.

- Balanced 1NT 12-14; otherwise open a four-card or longer suit with 12+ HCP.
  Longest suit first; prefer hearts with equal four-card majors. For 4-4-4-1,
  singleton C opens H, singleton D opens C, otherwise open D.
- Balanced responses without a four-card major: pass 0-10, invite 11-12 with
  2NT, game 13-19 with 3NT. The simplified opener accepts invitations with 14.
- Constructive Stayman after uncontested 1NT: 2C with 11+ and a four-card
  major; replies 2D without a major, 2H with hearts (possibly spades too),
  otherwise 2S. Responder invites or bids game with a fit, otherwise notrump.
  A game-forcing major continuation after a 2D reply gets three-card support
  or 3NT. Doubles and suit intervention switch off these Stayman sequences.
- Natural weak 2D/H/S takeouts over 1NT promise five cards; no transfers.
- After a one-level new-suit response, balanced rebids show 15-16 at 1NT,
  17-18 at 2NT, 19 at 3NT, unless supporting partner's major. Subsequent
  invitations use this rebid range, not the weak opening range.
- Balanced four-card major-support hands use simple HCP raises: 6-9 to two,
  10-12 to three, 13+ to game. Shape evaluation is not taught by these examples.
- 2NT opens 20-22 balanced; strong 2C uses 23+ and the existing simplified
  2D waiting route. Weak two openings in D/H/S use 6-10 and six cards.

This is a bounded teaching profile, not the full published system. In particular,
Rule of 20 openings, weak Stayman, transfers, positive responses to strong 2C,
quantitative slam bidding and complete competitive continuations are not included.
The shared natural fallback is still heuristic, not an expert bidding search.
Agree the system with a real partner before transferring these habits to a club.

## Implementation

`src/domain/bridgeSystems.ts` defines the named agreements and their thresholds.
`bridgeBidding.ts` applies them to each seat's own hand and the public auction.
Contextual display explanations live in `features/bridge/bridgeBidExplanation.ts`.
All are shared by browser and installed builds. `src/domain/bridgeAuction.ts` owns legal
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

Authored short exercises live under `src/lessons/bridge/`, not in the screen.
Each topic has three decisions; defense exercises remain defensive. Legal cards
are checked separately from tactical grades, and scripts must contain four unique
seats in clockwise order with no duplicated cards.
The seven-topic path starts with reading contracts and controlling dummy,
before opening bids, responding to 1NT, supporting partner's major, declarer tactics and defense. Dummy has its own three
reduced-hand positions, not a replay of declarer tactics. The shared drill view
supports an explicit playing seat and a read-only reference hand; selected dummy
cards render at North, and South's cards remain separate. Contract targets use
the auction engine's bid metadata. Bidding choices start unselected. Existing
progress keys and match saves are retained.

`src/lessons/bridge/learning.ts` adapts the seven topics into worked, supported
and independent decisions, with twenty-one base positions and twenty-one distinct
reinforcement positions. Shared feedback and decision review preserve the
original visible information. Contract/bidding questions use the shared learning
session controller rather than maintaining a separate completion model.

Learn also offers an unsaved guided board using the normal auction and hand
engine. Coaching is always visible and uses public information; the recap reviews
actual tricks. Replay preserves the original auction/deal, and guided play never
overwrites a match save or awards lesson completion. When South declares, the
learner controls South and North dummy. When North declares, North plays
automatically and the learner chooses South dummy's cards: this is a training
convention, not the club rule that dummy makes independent decisions.

The `bridge-responding` lesson adds three full-hand choices after North's 1NT
and East's pass: pass with 7 HCP, invite with 9, and bid 3NT with 10. Fresh
reinforcement hands use 6, 8 and 12 HCP. These balanced hands have no four-card
major, keeping Stayman and transfers outside the question. Feedback explains
combined strength, invitations and the nine-trick game target. All choices are
checked against the live auction policy. Existing completion keys remain intact;
the new lesson receives its own key.

This is Barbu Natural (15-17 1NT), not Acol. The lesson explicitly describes the
current opener's simplified invitation policy: pass with 15-16, accept with 17.
The 25-point game guide is not a guarantee of tricks or a universal system rule.
Supplementary teaching reference: [ACBL School Bridge Lesson Series, responding
to 1NT](https://web2.acbl.org/documentlibrary/teachers/SBLSTeacherManual.pdf).
Lesson wording and examples are original.

The `bridge-support` lesson teaches uncontested responses to partner's one-level
major opening with balanced, three-card support hands. Three decisions use 6, 10
and 13 HCP; distinct companions use 9, 12 and 14 HCP and switch majors. Feedback
explains the eight-card fit, simple raise, direct invitation and ten-trick game
target. Answers match the existing auction policy, not a second bidding evaluator.
Existing progress and saved boards are unchanged. Learn's opening-bid lesson, Play's
entry and both normal/guided auctions identify Barbu Natural as neither Acol nor
complete SAYC. Different club agreements can assign different meanings to raises.

Other responses to suit openings, competitive auctions, multi-trick planning and interactive duplicate
score explanation remain curriculum gaps, not completed lessons.

Acol uses the same learning template with nine topics: the four common
contract/cardplay topics plus Acol openings, responding, support, notrump rebids
and Stayman. Each has three base decisions and three bounded fresh companions
(27 + 27 overall). The five Acol bidding pools live in `lessons/bridge/acol.ts`;
their answers are checked against the actual auction policy at all four seats.
`bridgeDefinitionFor` and `bridgeCoursesFor` adapt metadata, not a second game
implementation. `GameLearning` accepts a course catalog and optional settings
snippet without importing any game. Only contract/dummy/declarer/defense completion
is shared between profiles; `bridge-acol-*` bidding progress stays separate from
the existing `bridge-*` keys. The selected preference is stored independently at
`barbu.bridgeBiddingSystem.v1`; the saved board keeps its own `biddingSystem`.

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
