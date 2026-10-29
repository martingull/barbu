# Shared Club-Game Architecture

## Product Commitment

Barbu is a growing catalog of club-quality card games, not a collection of
independently implemented screens. Templates, factories, shared presentation,
and consistent domain boundaries must make each additional game easier to add
and maintain. This commitment survives a change of language or mobile shell.

David Parlett's *The Penguin Book of Card Games* is the starting reference for
rules, terminology, and game families. For each game, record the chosen variant,
source details available to us, intentional departures, and simplifications in
`docs/<game>.md`. Do not invent book citations or assume all clubs use one ruleset.
Write original teaching material. Learn (including exercises) and Play must agree on the
chosen rules, scoring, and table conventions.

## Implementation Pattern

### Source Map

```text
src/
  App.svelte          Catalog/reference routing and shared services
  main.ts             Svelte startup and platform setup
  app.d.ts            Environment declarations
  components/         Shared Svelte cards, tables, Learn/Play and result surfaces
  features/           Per-game interaction, views and game-specific display copy
  domain/             Rules, policies, scoring, sessions and shared game types
  persistence/        Save validation and storage adapters
  games/              Table definitions, registry, factory and reference catalog
  lessons/            Shared lesson flow data/adapters and catalogs
    <game>/           Authored courses and exercises for that game
  presentation/       Shared formatting, card ordering and layout measurement
  styles/             Global styling and shared table layout
```

Keep domain imports within `domain/` or structured JSON under `content/`.
Reviewed algorithm dependencies may be explicitly allowlisted: `rummyMelds.ts`
uses `javascript-lp-solver` for non-overlapping meld and layoff selection.
Persistence depends on the domain, never on Svelte or game views. Shared components
and presentation helpers must not import game features; features compose them.
Card Counting deliberately reuses the other games' feedback for its unsaved hands.
`tests/domain/architecture.spec.js` checks these dependency boundaries.

`lessons/courses.ts` assembles per-game courses; it is not a place to accumulate
new game prose. `lessons/courseTypes.ts` owns their shared structure. Generated
exercise templates stay in `content/` and deterministic generators in `domain/`.
Do not duplicate the authored TypeScript courses as JSON merely for symmetry.

Lesson result callbacks receive both the attempt outcome and exercise action so
game content can supply a topic-specific takeaway through the shared result
surface. `DecisionReview` expands each available decision inside Review decisions:
the original prompt, visible card groups, selected cards and the exact explanation.
`lessons/decisionReview.ts` adapts shared drills; custom passing, bidding, contract,
Gin and authored Barbu exercises supply the same presentation data. Keep these
snapshots in the current lesson only, separate from persisted `DrillResult` history
and completion evidence. Review is read-only: it neither replays cards nor awards
progress. Show only the original visible position, not scripted later plays or
concealed hands; winner questions do not duplicate their answer cards as a hand.
Guided Hearts reuses `ExerciseFeedback` for rule/advice and trick review;
its public-card review facts belong in `domain/heartsLearning.ts`. Do not add
game-name branches to shared UI or infer tactical mistakes from penalty totals.
Coached card decisions can opt into `TablePlaySurface.stableFeedback` paired with
`ExerciseFeedback.reserveSpace`. This reserves a viewport-responsive feedback
height plus the hand/action area across turns and reviews. Longer text scrolls
inside a keyboard-accessible guidance region and resets to its start on the next
decision; it must not resize the board. Ordinary Play and results keep their
existing layouts. Browser checks compare board and card-slot geometry throughout
all 13 tricks and after viewport resizing.

Scoring and display copy have separate owners. For example, `domain/whistScoring.ts`
settles the game, while `features/whist/whistPresentation.ts` formats the result.
Partnership trick totals are shared domain calculations in `trickTakingScore.ts`;
Spades and Card Counting must not import Whist presentation to count tricks.

The source-root `ProTabPanel` was unused and removed. Future monetization metadata
remains in the definitions, but there is no active subscription screen. Native
packaging, public assets, release artifacts and compatibility fixtures retain their
existing locations. The stylesheet move preserves CSS rules and load order; a
future stylesheet decomposition must be verified independently of file organization.

| Responsibility | Existing reference | Expectation |
| --- | --- | --- |
| Catalog and table metadata | `src/games/tableFactory.ts`, `src/games/whist.ts` | Use the factory and per-game definitions, not copied table markup. |
| Registration | `src/games/gameRegistry.ts`, `src/games/index.ts` | Register metadata through the existing registry. |
| Presentation | `GameTableShell`, `LearnPanel`, `CourseLesson`, `PlayTabPanel`, `TablePlaySurface`, `CardChoiceHand` | Reuse Learn/Play navigation, cards, selection, feedback, and responsive layout. |
| Feature coordination | `src/features/{whist,hearts,spades,bridge,barbu}/`, `src/features/GameLearning.svelte` | Own game-local Learn/Play interaction and saving; compose existing engines. |
| Hand rules and actions | `src/domain/handEngine.ts` | Keep deterministic transitions independent of UI, storage, and Tauri. |
| Match progression | `src/domain/whistSession.ts` | Own settlement, dealer rotation, replay, completion, and review state outside Svelte. |
| Persistence | `src/persistence/whistSave.ts` | Validate and restore saves through an adapter; preserve compatibility or explicitly migrate it. |
| Learning content | `content/`, `src/lessons/`, per-game lesson modules | Use structured content and the same rules as full play. |

Whist, Hearts, Spades and Bridge now use these TypeScript domain boundaries. They share the
hand-engine factory and registry, reviewed-hand transitions, storage factory,
standard trick-hand save validation, and seat-score primitives. Game-specific
session transitions and settlement remain explicit.
The Hearts, Whist and Spades Rust full-play implementations are removed. Their legacy
native saves are frozen compatibility fixtures, not a reason to retain a second
engine. Hearts practice uses `src/domain/heartsPractice.ts` with structured templates
in `content/hearts-practice.json`. Its legality and points reuse full-play rules;
frozen native outputs verify all 18 decisions and both passing patterns.
Spades uses the same hand, review and save factories, with bidding and settlement
in domain modules and its twelve authored decisions in `src/lessons/spades/exercises.ts`.
Bridge adds auction and duplicate-scoring domain modules, a board session, and a
version-1 save adapter. Its native auction/scoring mirror is removed. Replay
restores the actual deal and contract; Next board commits one result, including
a zero-point passed-out board. Its authored decisions live in `src/lessons/bridge/exercises.ts`.
Barbu generated practice now follows the same domain/content split in
`src/domain/barbuPractice.ts` and `content/barbu-practice.json`. Four seeded
patterns per contract retain dynamic rank/suit choices. Scoring and Domino
placement share TypeScript play primitives. Barbu's six trick-taking contracts now
use the hand factory too, with a separate `barbuPolicy.ts` and a `barbuHandSave.ts`
compatibility boundary. Their Rust engine and generic native hand commands are
removed. Domino now uses `dominoHand.ts`, `dominoPolicy.ts` and `dominoSave.ts`,
sharing the start/transition pattern but retaining its own layout state and
placement rules. Native fixtures verify deal and policy compatibility; the
Rust engine and browser fallback are removed. `barbuSession.ts` owns the fixed-order
seven-contract progression, result recording, review and replay; `barbuSave.ts`
validates and restores the existing version-1 run through the save-store factory.
Svelte dispatches events and presents the resulting session, just as for Whist.
The unused `barbu-core` crate and `current_game` metadata command are removed.
Rust now owns only Tauri startup and the native privacy-policy opener. Future
game rules belong in the shared TypeScript domain, not new native command routes.
The metadata registry remains separate from engine selection. These references
do not imply that every game can be added using configuration alone.

Share deck, deal, turn-order, legality, and trick mechanics where appropriate.
Keep each game's objectives, opponent policy, bidding, scoring, and variants
explicit. Hearts avoidance must not inherit Whist's trick-winning strategy.
Rummy-family games should reuse cards and presentation where useful, not be
forced into a trick-taking state model.

Gin Rummy is the first implemented rummy-family table. It reuses the deterministic
deck, saved-session controller, metadata factory, Learn flow and card surfaces.
Its draw/discard state and scoring live in `ginRummySession.ts`, with public-information
opponent decisions in `ginRummyPolicy.ts`. `features/gin-rummy/` owns only interaction
and rendering. Its version-1 action-log save is replay-validated. Five authored
courses contain fifteen decisions and never write the match save. See
[Gin Rummy](gin-rummy.md) for the classic scoring profile, source notes, automatic
meld/layoff declarations and remaining limitations.

Extract shared behavior when another real game needs it. Prefer composition and
small interfaces over a universal engine full of game-name conditionals. Do not
replace copy-pasted screens with copy-pasted session or save implementations.

## Frontend Isolation

Whist, Hearts, Spades, Bridge and Barbu have isolated frontends under their respective
`src/features/<game>/` directories:

- `WhistGame.svelte` composes the existing table metadata, Learn/Play panels,
  courses and exercises. Its six topic pools use the shared worked/supported/
  independent sequence through `lessons/whist/learning.ts`, with eighteen distinct
  bounded follow-ups and engine-derived legality, winner and odd-trick breakdowns.
  The seven progress keys remain; the introductory course still reuses follow suit.
- `whistFeature.ts` creates an instance-local store for the match, selected card,
  mode, saving and resume. It dispatches existing domain session events rather
  than implementing rules. Storage and the seed source are injected.
- `WhistHandView.svelte` presents a session through `TablePlaySurface` and
  `CardChoiceHand`. Its callbacks belong to either the match controller or the
  shared unsaved guided-hand controller. The separate opening-lead controller
  and duplicate full-deal fixtures are removed: both lesson and Try cards now use
  the same three authored reduced-hand decisions. Lead/return choices identify
  a plan without inventing opponents' responses to an alternative lead suit.
- `HeartsGame.svelte` composes the same Learn template with Hearts passing and
  hand views. `heartsFeature.ts` owns the saved match, pass selection and resume,
  delegating pass rotation and settlement to `heartsSession.ts`.
- `HeartsPassExercise.svelte` owns only its three unsaved passing decisions.
  Match passing uses `HeartsPassing.svelte`; neither duplicates domain rules.
- `GameLearning.svelte` owns the common concept/example/exercise/review flow,
  topic replay and history display. Game definitions supply metadata; each
  feature supplies its exercise loader and any custom decision surface.
  Standard drills, Hearts passing and Gin exercises use `domain/learningSession.ts`
  for answer/feedback/completion transitions, checked-answer locking and bounded
  follow-ups. This controller accepts evaluated results and review snapshots; it
  knows neither cards nor UI/storage. Custom selection and grading stay in the
  game adapter. Retrying creates a fresh session, and leaving early cannot mark
  the session complete. Other custom game exercises retain their current controllers
  until migrated; this is not yet a catalog-wide custom-exercise migration.
- `SpadesGame.svelte` uses that Learn flow for all five courses. The four
  three-decision exercise pools now run in authored worked/supported/independent
  order through `lessons/spades/learning.ts`, with twelve distinct bounded
  reinforcement examples and shared winner/legality breakdowns. Bidding questions
  identify cards rather than playing a fictitious trick. The introductory course
  still reuses the follow-suit activity; the five existing progress keys remain.
  `SpadesHandView.svelte` and `SpadesBids.svelte`
  preserve the deal-first table, bid toggle, player-only adjustment and hand review.
  Its feature controller delegates bid locking, nil, bags and completion to
  `spadesSession.ts`; lessons never write the match save.
- `BridgeGame.svelte` composes `BridgeAuction.svelte`, `BridgeHandView.svelte`
  and the same `GameLearning` flow. Its bidding exercise is an unsaved custom
  decision screen; declarer and defense exercises use the shared drill screen
  with compass labels. The five-topic path adds contract targets and dedicated
  dummy decisions while retaining the four existing progress keys.
  Keep all five topics in authored order: a worked decision, a guided decision,
  then an independent question. Dummy excerpts supply visible information;
  the final declarer position gives both remaining hands and the trick target.
  `DrillStep.tableAfterByCard` supplies choice-specific scripted responses through
  the shared `drillTableCards` helper; other drills retain their default response.
  `bridgeFeature.ts` delegates auction, passed-out boards, replay and settlement
  to `bridgeSession.ts` and preserves the version-1 save. Its active-hand adapter
  lets the shared controller select and play either South's cards or the dummy,
  without duplicating rules or exposing the reference hand as selectable cards.
- `BarbuPlay.svelte` owns contract introductions, trick hands, Domino and session
  results. `barbuFeature.ts` dispatches the existing seven-contract session;
  it does not add dealer-driven contract choice or change settlement.
  `BarbuHandView` and `DominoHandView` also render unsaved learning hands,
  while their saved Play controller remains isolated. Contract introductions
  and pure feedback/score presentation live beside these views.
- `savedSessionFeature.ts` shares saving, resume, navigation and double-tap
  selection across all five games without assuming a trick-taking hand.
  `reviewedMatchFeature.ts` composes it with trick review and next-hand behavior
  for Whist, Hearts, Spades and Bridge. Barbu composes the base directly because
  contract introductions and Domino do not fit the reviewed-match state.
  Passing, bids and Whist session mode remain in the game wrappers. This is an
  interaction helper for their existing session contract, not a universal game
  controller; it does not know rules, scoring, opponent policy or layout.
- `BarbuGame.svelte` composes the same Learn flow with authored guided tricks,
  contract navigation and review history. `barbuLearning.ts` selects existing
  generated scenarios and keeps the version-1 recent-pattern memory. Its four
  patterns per contract and seven-decision mixed review are unchanged.
  Each of the seven authored courses has three separate positions: a worked
  example, a hinted decision and an unassisted decision (21 in total). Guided
  feedback derives the actual winner and points from the gameplay rules, and
  decisions feed the shared result/history surface. Forced legal penalties are
  shown as penalties but count as following the lesson correctly. Selecting a
  legal card does not reveal its explanation until the player commits it.
  `DominoLessonTable` supplies a shared layout for examples and decisions;
  `BarbuPracticeHand` reuses the Play views without writing a saved run.
  Shared Learn extensions are optional entry points, resource actions and
  presentation snippets, not game-specific rules inside `GameLearning`.

`App.svelte` mounts the feature and supplies catalog/reference navigation, the
shared seed source, course progress and exercise history. These are catalog-wide
services, not individual-game hand state. The controllers outlive mounted views so
leaving the game does not discard an in-memory match when storage is unavailable.

`features/catalog/GameCatalog.svelte` presents the home collection, with games
grouped into beginner-facing learning collections, separate from Card Skills.
Collection membership is navigation metadata, not a replacement for each game's
family classification. Planned-only collections remain hidden. Its resume list comes from the feature controllers'
validated saves, ordered by recency; it does not parse storage or change save
schemas. The Hearts introduction enters the shared learning flow directly with
three existing decisions in a fixed sequence: follow suit, avoid a heart, and
discard the queen. It records exercise history and a separate `hearts-introduction`
completion flag in the existing progress store, not course mastery. Completed
introductions lead from home to Learn instead of restarting. Leaving early does
not mark completion, and the introduction never replaces a saved match. The final Play action resumes Hearts
when a match exists. An optional next-game suggestion opens Barbu Learn without
starting or replacing a match; its copy belongs to Hearts introduction metadata.
Catalog metadata stays in `games/tableFactory.ts`.

`DrillScreen.svelte` and `DrillResultScreen.svelte` are shared across games.
Pure decision/review and generated-scenario adapters live under `src/lessons/`.
Keep shared card layout and CSS in the existing components; do not copy them
into each feature or add game-specific viewport calculations.

Learning characters are presentation metadata in `presentation/learningCharacters.ts`.
`CharacterPortrait` displays purpose-made portraits without zooming into playing
cards: the existing Barbu logo and matching Queen/Jack artwork under
`public/characters/`. `LearningCoach` and `ExerciseFeedback` reuse it for
explanations and decision feedback. Barbu is
the default guide, with the Queen of Spades for Hearts and the Jack of Clubs on
the Card Counting menu. These guides do not represent player seats or change
opponent policy. Full-game avatars and character animation are not implemented.

`LearnPanel` shows an open, numbered path and the next unfinished topic; it never
locks other lessons. The next lesson and its Start/Continue lesson action come
first, followed by a separate Play with guidance section when the game supplies
an unsaved guided hand. Progress and the numbered path follow those choices.
`GuidedHandEntry` is shared by the menu, introduction result and lesson result;
it remains available after the path is complete. Saved-match resume belongs to
Play, not Learn. Results group Try again/Next lesson together and route to the
Play tab through Go to Play instead of silently starting or resuming a match.
After a fully finished topic leaves every path step complete, the shared result
acknowledges the game's learning path and promotes Go to Play beside the secondary
retry action. Guided hands remain available where supported. Paused attempts and
standalone extra exercises do not announce path completion; saved matches are
still opened only through Play.
Existing boolean completion in `barbu.courseProgress.v1`
remains navigation progress, not mastery. Completed attempts with decision results
also record their latest correct/total counts and attempt count through
`domain/learningEvidence.ts` and `persistence/learningEvidence.ts`, under the separate
`barbu.learningEvidence.v1` key. Earlier completions remain unscored. Early exits
do not record a full attempt; Hearts passing supplies all three decisions too.
The finished path recommends revisiting a topic whose latest attempt missed its
goal. This is not a spaced-repetition or mastery model. Resetting a game's lessons
clears only its completion flags and evidence, never its saved match or other games.

Hearts' introduction and first topic share five decision-first foundations:
follow suit, identify the winner, assign a heart point, avoid a heart, then avoid
the queen. `lessons/hearts/introduction.ts` authors these reduced positions;
`domain/heartsLearning.ts` evaluates them using the normal Hearts legality and
trick-scoring primitives. Winner questions keep all four cards on the table and
never play the selected answer as a fifth card. Each missed concept adds one
different follow-up through `domain/learningSequence.ts`; both answers count in
the attempt evidence. Follow-ups do not recursively add more questions.
The same bounded sequence is used by Hearts, Gin Rummy, Spades and Whist topics.
`content/hearts-follow-ups.json` pairs fresh positions
with each original pattern, graded by `heartsPractice.ts`; the lesson adapter
attaches them without changing the seeded base generator. Gin pairs authored
hands in `lessons/gin-rummy/exercises.ts` and grades them with the existing meld
solver. A missed goal offers **Try another example**; correct answers keep the
original three-decision route. Legal-but-risky choices remain distinct from
illegal plays. Both attempts appear in decision review and completion evidence;
an early exit does not complete a topic. This is immediate reinforcement, not
adaptive mastery, and does not yet cover every game.
Hearts passing uses the same sequence helper: each of its three defensive plans
has a fresh thirteen-card companion in `content/hearts-practice.json`. Checked
passes become read-only, preserving the original choice in review. A risky pass
offers one companion; a sound alternative advances normally. The passing
evaluator distinguishes legal passes from the lesson's defensive goal, and both
attempts count toward evidence without modifying a saved match.
The shared `decisionFirst` step metadata keeps the written explanation available
through Read lesson without making it a prerequisite for playing cards.

Hearts topic exercises (including passing) and all five Gin topics carry explicit
`Teaching` metadata: worked, supported, independent, with reinforcement for a
missed goal. The five-decision Hearts introduction keeps its existing foundation
sequence. Hearts topic positions use their authored order; passing can vary its
starting plan, but teaching stages are assigned before play and never shuffled.
All existing positions and their paired follow-ups remain available. This does
not change the domain generators or old saved games. Worked examples give a
concrete evaluated choice, supported decisions give a principle, and independent
decisions keep the question but omit advance guidance. Every answer gets feedback.
This is separate from the full guided hand, whose coaching remains always visible.

`lessons/learningPresentation.ts` defines teaching metadata and labelled feedback
rows. `ExerciseFeedback` and `DecisionReview` render the same `FeedbackBreakdown`:
Hearts adapters supply real winners/penalties or a before-receiving pass summary;
Gin supplies meld/deadwood calculations and marks stock draws as unknown. These
are factual breakdowns, not a shared scoring algorithm. No new progress keys,
mastery claims, hint toggles or generic card-game engine are introduced.

Guided play is part of the shared learning platform, alongside short lessons.
Hearts, Gin Rummy, Spades and Whist use `features/guidedHandFeature.ts` for an isolated session,
selection, errors and replay. The adapter supplies normal domain transitions;
the controller has no storage or course-completion dependency. All enter through
`GuidedHandEntry`, use `TablePlaySurface` with reserved `ExerciseFeedback`, and
finish with `GuidedHandActions` (Replay, Play without guidance, Back to Learn).
New guided games should supply game-specific coaching and review facts, not clone
the lifecycle or add a second rules engine. Other games have not yet adopted this
guided-hand flow; do not expose a guided entry until its adapter is implemented.

`HeartsGuidedHand` offers an optional unsaved 13-trick hand after the introduction
and from Learn. It composes the existing passing/hand views and normal
`heartsSession` transitions, with contextual coaching instead of a separate engine.
Passing, every card decision and every trick review show guidance automatically;
there are no hint or explanation toggles during guided play.
Help stays inside the reserved feedback region, so it cannot resize the board.
The result selects up to three distinct, actual tricks (Q♠, heart points and an
off-suit discard where one occurred), using `heartsLearningRecap` without hidden
cards or tactical grading. Replay repeats the deal; Play without guidance opens
the normal Play menu, preserving its existing Continue option. Back to Learn is
still available. The hand does not award topic completion or overwrite a saved
match. This is rules guidance, not expert tactical analysis.

`SpadesGuidedHand` uses normal `spadesSession` transitions, starting with the full
deal before the player edits their own bid. `SpadesBids` has a compact variant
that occupies the same reserved hand space; guidance and the board do not move
when toggling cards/bids. Coaching accepts `SpadesLearningPosition`, which omits
opponents' hands. It uses the existing bid heuristic, follow-suit/breaking rules,
partnership target and intact/failed nil state, without claiming optimal play.
`domain/spadesLearning.ts` supplies public trick facts and a score breakdown
backed by normal settlement: contract points, extra books, nil, ten-bag penalties
and carried bags. Up to three actual tricks highlight nil failure, reaching the
bid, or a first bag. Hearts and Spades render these with `GuidedTrickRecap`.
Replay starts the same deal at bidding again; this one-hand activity cannot
advance a match, award course completion or overwrite a saved game.

`WhistGuidedHand` composes normal `whistSession` transitions and the shared
guided-hand lifecycle. Public-only `WhistLearningPosition` supplies the player's
cards, visible plays, dealer and turned trump, not concealed hands or a deal seed.
Coaching explains the dealer's last card setting trump, compulsory follow suit,
optional trumping/overtrumping, partnership habits and the six-trick scoring
baseline. Advice is a guideline, not an expert grade or guaranteed winner.
Every trick is explained automatically in the reserved coaching region.
`domain/whistLearning.ts` supplies actual winners, normal odd-trick points and up
to three distinct recap tricks: trump, the first scoring trick, and the last trick.
`GuidedTrickRecap` renders the cards and `GuidedHandActions` handles exits.
Replay recreates the same deal even if that hand would win a normal game; this
activity ends after thirteen tricks and neither settles a saved match nor awards
lesson completion. Normal single-game/rubber Play and version-1 saves are unchanged.

`GinGuidedHand` uses the normal Gin engine and public-information opponent policy.
`domain/ginRummyLearning.ts` pauses after each player action for review, records
only that player's observed card/deadwood changes, and stops after one hand.
The last action remains in the recap even when it ends the hand. Coaching accepts
`GinObservation`, never the opponent's hidden cards or stock order. It distinguishes
10-card counts from the temporary 11-card count, previews legal discards, explains
the opening offer and blocked upcard, and warns that a legal knock may be undercut.
Normal settlement supplies the final scores, layoffs and exposed melds. Replay
returns to the same opening offer; no new saved game or learning evidence is written.
The guided table moves its public turn message into feedback so the same reserved
two-row hand and controls fit small viewports without the board changing per move.
The presentation dependency check permits the existing launcher PNG as shared
artwork; native code remains outside the presentation layer.

This is an incremental frontend refactor, not another engine migration.
All five game features and Card Counting are isolated; the shell launches them
and provides catalog-wide services. `features/card-counting/CardCountingGame`
uses `GameLearning`, `PlayTabPanel` and the shared flow-layout table. Its five
exercises share a memory-question view and unboxed results. Pure question
generation and exercise transitions live in `domain/cardCountingQuestions` and
`domain/cardCountingSession`; the unused legacy practice engines were removed.
Card Counting reuses unsaved Hearts, Whist and No Queens hands and their
presentation helpers, never writing a saved match. It has no authored course
completion keys. The observation warm-up uses groups of four cards, not a legal
Whist deal. Existing question limitations remain: boss-card questions currently
have positive answers, and void spotting targets one seat rather than accepting
all demonstrated voids. These need a separate curriculum pass.
Add the next game using the same boundaries. Reuse the common Learn flow and generalize
controller behavior only where it removes real complexity. Do not add a
universal controller or replace the existing metadata/engine factories.

The paused Canasta prototype (hidden from players) extends the rummy collection with its own Modern American session and
meld rules, not Gin's knock/deadwood model. It shares deterministic shuffling,
the save-store/session controller, Learn/Play shell, card faces and completion
events. Double-pack identities are local to Canasta; existing single-deck IDs
and saves remain stable. Its policy projection removes hidden cards and stock
order. Large hands and public melds scroll in bounded regions rather than shrinking
the shared cards. See [Canasta](canasta.md) for the selected table agreements,
source differences and verification requirements.

Save keys, schemas, course progress identifiers, rules and native commands are
unchanged. Verify feature isolation, blocked storage, old-save resume, course
completion and compact-screen play before migrating the next game.

## New-Game And Migration Checklist

1. Document the object, players, cards, deal, turn order, legal actions, scoring,
   ending conditions, selected variant, and remaining club-play limitations.
2. Identify the game family and existing mechanics to reuse. State which domain
   runtime owns it; keep browser and native behavior consistent and testable.
3. Add a definition under `src/games/`, register it, and add catalog metadata.
   Keep incomplete games marked as planned rather than exposing unfinished play.
4. Implement or adapt the hand and session boundaries. Keep rules and settlement
   in the domain, game-local interaction under `src/features/<game>/`, and only
   catalog-wide routing/services in `App.svelte`.
5. Add save validation, resume, replay, and compatibility tests. Ensure advancing
   a completed hand cannot score it twice, and practice cannot overwrite a match.
6. Add guided lessons and topic exercises to the shared Learn panel. Use
   `CourseLesson` for concept/example/review and `TablePlaySurface` with
   `flowLayout` for decisions. Keep course-progress keys stable. Preserve
   generated practice behavior during migration rather than silently replacing it.
7. Test legality, conservation where applicable, scoring, completion, and opponent
   information limits. Add native/TypeScript comparison fixtures during migration.
8. Exercise catalog, Learn topics and guided lessons, Play, save/resume, and completion in browser
   tests. Check small-screen layouts and a physical-device upgrade before release.
9. Record what is migrated, what remains native, and which limitations remain.
   Remove legacy implementations and dispatch routes after their replacements
   are verified. Keep golden fixtures; do not maintain two production engines.

See [the prototype record](typescript-engine-prototype.md) for the migration's current
scope and verification commands. Use this checklist as a review gate for future
games, not as a requirement to build speculative abstractions in advance.
