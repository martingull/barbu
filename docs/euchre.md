# Euchre Implementation

Euchre is the next candidate after Canasta in the [agreed expansion order](game-roadmap.md).
Martin selected Euchre as the next game on November 23, 2026, ahead of the newly
proposed French-game track. The intended destination is a complete Learn and
Play experience within the existing Premium subscription, not a separate purchase.
The implementation follows the North American profile below, with a shared Learn
journey, guided hands and independent partnership games. This is one documented
club-style ruleset, not a claim to support every regional convention or expert AI.
Euchre uses the existing Premium entitlement alongside Canasta; it does not add
a separate purchase or change access to the existing free games.

## Current Implementation

- `domain/euchreRules.ts` supplies the 24-card deck, effective bower suits,
  trump ranks, follow-suit legality, trick resolution and hand scoring.
- `domain/euchreSession.ts` owns the packet deal, both calling rounds, dealer
  pickup/discard, lone-hand seat skipping, five tricks, explicit trick review,
  passed-out redeals, score settlement, dealer rotation and game completion at 10.
  Replay reconstructs the same seeded deal and preceding scores, not a new deal.
- `domain/euchrePolicy.ts` consumes `euchrePosition` public observations only.
  Calling weighs bowers, trump length, outside aces and a dealer's pickup.
  Discards preserve control and consider voids; play uses public card memory,
  protects secure partner winners and draws trump when there is control.
  These deterministic heuristics are not expert play. They do not perform
  search or inspect unobserved cards in the shuffle.
- `domain/euchreLearning.ts` grades lesson decisions through those rules and
  adapts the normal session to a single unsaved guided hand. Advice uses only
  the learner's cards and public information, with actual trick explanations.
- `persistence/euchreSave.ts` reuses the save-store factory and a separate
  version-1 key. It validates the event schema and replays legal transitions;
  caller-supplied score or hand snapshots are not trusted. Summary caches are
  recomputed on load; older preview saves retain the same key and action history.

The shared `legalCards` and `trickWinner` primitives accept optional effective
suit/rank rules with unchanged standard defaults. Euchre does not change
`FullHandState`, force five cards into 13-card replay validation, or duplicate
the standard trick winner. Its calling and inactive-seat state belong in a
separate session. Existing game saves and native commands are unchanged.

The registered definition in `games/euchre.ts` supplies Learn/Play metadata,
six topics, the guided-hand entry and the rules reference. `features/euchre`
composes `GameLearning`, `learningSession`, `PlayTabPanel`, `TablePlaySurface`,
shared card/feedback/review components and the saved-session controller.
`App.svelte` only launches the feature and supplies shared services.
Play supports a full match as South: trump selection, lone hands, private dealer
discard, legal cards, trick review, score arithmetic, replay, resume and completion
at 10. The calling-format control uses a touch-sized Partner / Alone radio group
instead of a checkbox. Guided hands never overwrite the independent match.

The production frontend includes Euchre behind centralized Premium access.
Access loss hides the hand and its resume entry without deleting the save.
Native phone verification remains outstanding: do not advertise Euchre in either
store until a new packaged candidate passes that check.
Current development source is newer than the prepared 1.0.10 bundle: these
changes neither modify that artifact nor enter its pending review. Rebuild and
verify a new candidate before uploading source changes in a later release.

### Try In The Browser

Use the existing development server on port 1420, then open
`http://localhost:1420/?preview=euchre&tab=learn` for the learning journey.
Start lesson begins card decisions; Start guided hand begins a normal deal with
automatic coaching. The Play tab opens an independent match.
`http://localhost:1420/?preview=euchre` resumes the saved match or deals a new one.
You are South, partnered with North; the first side to 10 wins.
For a fresh reproducible first call, use `?preview=euchre&seed=1` in a fresh
browser context. The optional seed does not overwrite a saved game.
The development-only query grants preview access without a subscription;
`VITE_EUCHRE_PREVIEW=1` also exposes it in the development catalog. Neither
mechanism bypasses Premium in a production build. Packaged Android access uses
the normal Premium catalog entry; iOS billing is not introduced by this change.

## Implemented Rules Profile

David Parlett's *The Penguin Book of Card Games* supplies the family framework;
no edition-specific passage has been verified for this implementation. The rules
below are cross-checked against [Pagat's North American distinctions](https://www.pagat.com/euchre/euchre.html)
and [Bicycle's play and scoring description](https://bicyclecards.com/how-to-play/euchre).
They define one US-style table, not universal club rules.

- Four seats, fixed opposite partnerships; South is the learner, North is partner.
- Use 24 cards: 9 through ace in each suit, no joker; deal five each, turn one up,
  leave the other three concealed. Rotate dealer and play clockwise.
- Trump ranks right bower, left bower, ace, king, queen, ten, nine. The left bower
  belongs to trump for following suit; its printed suit no longer determines legality.
- Two calling rounds begin left of dealer. First round accepts the upcard suit;
  the dealer picks up and discards privately. Second round excludes that suit.
  Dealer's partner may order up without being forced to play alone.
- All pass twice means redeal by the next dealer, with no score.
  Stick the dealer is a documented later variant, not an invisible shortcut.
- Only the caller may go alone, declared with the call; their partner sits out.
  No defender-alone, partner-card exchange, joker or extra zero-trick bonus.
- Opening lead is left of dealer, skipping the inactive partner. Follow the
  effective led suit when possible; otherwise any card is legal. Winner leads next.
- Makers score 1 for three/four tricks, 2 for all five, or 4 for all five alone.
  Defenders score 2 when makers fail to take three. First partnership to 10 wins.

## Learning Journey

Every topic uses the shared Learn shell: three distinct worked/supported/independent
decisions, explanation and decision review, with optional concept/example pages.
Each base decision has one different reinforcement position after a mistake;
reinforcement cannot recursively add more questions. Progress is awarded only
after completing the topic, not after opening or abandoning it.

| Topic | Decision to teach |
| --- | --- |
| Meet the bowers | Identify the two highest trumps; do not mistake the left bower for its printed suit. |
| Follow the real suit | Choose legal cards when a bower is held or led. |
| Order it up | Use the visible hand, upcard and dealer position to weigh a first-round call. |
| Choose another trump | Reject the turned-down suit and compare second-round options or pass. |
| Play with partner | Follow, duck or trump using only visible information and the three-trick target. |
| Go alone and score | Compare partner play with a loner and explain the resulting partnership score. |

That is 18 base decisions plus 18 reinforcement positions, and an optional guided
five-trick hand with calling and any dealer discard. Distinguish forced legality
from tactical advice: more than one call or discard can be reasonable. Shared
outcomes remain `good`, `risky`, `penalty` and `illegal`, with structured reasons.

Guidance is automatic, not hidden behind a hint button. Explain the rule and a
public-information tactic before each decision; review its consequence afterwards.
Finish with Replay and Play Euchre, without overwriting the independent match.
Game rules cover object, players, cards, deal, calling, play, scoring, variants
and tactics. Display suits as symbols where useful; name the actual suit accessibly.

## Shared Architecture

Follow the [new-game checklist](game-architecture.md). Metadata is registered through
`createGameTableDefinition`, compose `GameLearning` and `TablePlaySurface`, and
keep calling/hand/session transitions in TypeScript domain modules. Use the
saved-session controller and replay-validated persistence; exercises and guided
hands stay separate from the saved match. Access remains centralized in
`games/accessPolicy.ts`; do not add native billing products or per-view paywalls.

The existing 13-card trick engine is not configuration-only Euchre: replay validates
13-card hands/52-card deals, trick legality compares printed suits, and normal
turns assume four participating seats. Do not pass Euchre into that path unchanged.
The first pass adds only the effective-suit and rank hooks to shared primitives;
deck size and active-seat transitions remain in the separate Euchre session.
Preserve existing defaults and test the other games before changing shared
contracts. Do not clone Whist's full engine or spread game-name conditionals
through shared components when adding the frontend.

Opponent policy must use public observations, not hidden hands. Evaluate calling
and play against making or defending three tricks; use a conservative documented
heuristic initially, not an expert-strength claim. Keep the same compact phone
table, five-card thumb hand, suit choices, dealer/upcard and maker/defender labels.
Inactive partners are clearly marked during loners. No new two-column layout.

## Acceptance Before Release

- [x] Document the selected regional rules and deliberate variants in Game rules.
- [x] Domain tests: unique 24-card deal, both calling rounds, private dealer discard, two-pass redeal, bowers and effective-suit legality, loner seat skipping, all scoring cases and match completion.
- [x] Policy tests: no concealed-card access; deterministic seeds and legal decisions.
- [x] Save tests: restore in calling, discard, trick/review and result phases; reject malformed history; preserve the actual deal on replay.
- [x] Learning tests: 18 distinct base decisions and 18 reinforcement positions; consistent rules, progress, decision review and guided-to-independent handoff.
- [x] Browser phone checks: readable bowers, stable board, legal-card indication and no action overlap on small and modern screens.
- [x] Automated Premium access/expiry/recovery checks use the existing entitlement and preserve the saved match; free games remain unaffected.
- [ ] Native phone journey and reviewed opponent behavior before any store claim.
- [ ] Rebuilt release candidate with verified store-installed Premium access.

Keep Euchre absent from public listing copy until the remaining release checks pass.

### Verification

The November 23 development pass verified:

- `task domain:test`: 349 passing tests across the catalog.
- Euchre Learn/Play, shared learning/navigation and Premium browser regressions:
  80 passing checks across the Galaxy S9 and iPhone XR profiles, including a
  320-by-568 guided hand and keyboard operation of Partner / Alone.
- `npm run build`: passed, with the existing large-chunk advisory.
- Built-frontend browser checks: a preview query cannot grant production access;
  inactive Premium is locked and verified active Premium opens Euchre.
- Screenshots inspected at 320-by-568, 360-by-740 and desktop sizes.

Billing checks use a normal dev server without preview flags. An already-running
`VITE_CANASTA_PREVIEW=1` server deliberately bypasses Canasta access and cannot
verify its paywall. Browser billing checks mock the native provider and make no
real purchases; they do not replace the pending store-installed device check.
