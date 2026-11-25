# Belote

Belote is a **free** partnership point-trick game in the catalog. It uses the
shared Learn/Play navigation, rules reference, teaching characters, decision
feedback, saved-session controller and card/table components. This source
implementation is not included in the already uploaded 1.0.11 (10) TestFlight
build. Native device acceptance and a rebuilt store candidate remain required.

## Selected Profile

Classic, four-player suit-trump Belote, without sequence or four-of-a-kind
announcements. South is the learner, partnered with North against East/West.
Deal, taking, play and dealer rotation run anticlockwise.

| Agreement | Implementation |
| --- | --- |
| Cards | 32: seven through ace in each suit. Jacks keep their printed suits. |
| Trump, high to low | J (20), 9 (14), A (11), 10 (10), K (4), Q (3), 8 (0), 7 (0). |
| Other suits, high to low | A (11), 10 (10), K (4), Q (3), J (2), 9 (0), 8 (0), 7 (0). |
| Deal | Shuffle; packets of three then two; expose next card. Right of dealer acts first. |
| Taking | First round: upcard suit or pass. Second: another suit or pass. Eight passes: no score, deal moves right. |
| Complete deal | Taker gets the upcard in either round and two concealed cards; others get three. Eight each; no discard. |
| Following | Follow suit. On a trump lead, overtake the highest trump when possible, even over partner. |
| Void in a plain suit | Opponent winning: trump if held, overtrump if possible, otherwise undertrump. Partner winning: any discard, including a lower trump. |
| Belote/rebelote | One player originally holds K/Q of trump. Auto-announce on their two plays, either order. Protected 20, even if the taking side fails. |
| Ordinary deal | 152 card points plus 10 for the last trick. Compare totals including Belote. Takers must strictly beat defenders. |
| Set | Defenders receive 162 card points; each side retains its own Belote. |
| Capot | Taking all eight tricks replaces the last-trick 10 with 100: 252 before Belote. Applies to either side. |
| Litige | Equal totals: defenders score immediately; takers' points carry. Further ties add to the pot; the next decided winning side receives it. Passed-out deals preserve it. |
| Match | Exact scores to 1,000 after complete deals. Higher total wins if both cross; equal match totals continue. |

No Coinche/Contree auction, all-trump/no-trump, early stopping or verbal-omission
penalties. These are table agreements, not a claim to reproduce every club's
rules. Original English teaching copy is used; the game is not translated into
French merely because it is Belote.

Parlett remains the catalog's starting reference framework, but no local
edition/page text was available to verify for this implementation. Rules were
cross-checked against [Pagat's Belote](https://www.pagat.com/jass/belote.html)
and the [French federation's Classic rules, 27 January 2016](https://www.ffbelote.org/documents/regles-officielles-de-la-Belote-27-01-2016.pdf).
Deliberate source choices: shuffle each deal and allow any void discard over a
winning partner as in the federation profile; restrict second-round taking to
the other three suits as explicitly described by Pagat. No announcements other
than Belote follows the federation Classic profile. Exact scoring, litige and
the match target are explicit choices; do not silently substitute rounded scores
or Pagat's alternative treatment of a lost Belote bonus.

## Implementation

- `src/domain/beloteRules.ts`: points, rank hooks into the shared trick winner,
  follow/trump obligations and settlement.
- `src/domain/beloteSession.ts`: deterministic partial deal, taking, complete
  deals, reviewed tricks, automatic announcements, match progression and replay.
- `src/domain/belotePolicy.ts`: taking and play heuristics from an explicit
  public-information projection. No hidden hands, stock, seed or unannounced
  pair is available to opponents/coaching. This is not expert-strength AI.
- `src/domain/beloteLearning.ts` and `src/lessons/belote/`: seven topics,
  21 worked/supported/independent decisions and 21 distinct bounded companions;
  concepts/examples, decision review and one unsaved guided deal. Legal but
  tactically weaker taking choices are risky, not illegal.
- `src/features/belote/`: presentation and interaction through `GameLearning`,
  `learningSession`, `createGuidedHandFeature` and `createSavedSessionFeature`.
  Card rows stay four-by-two; feedback and hand height are reserved during play.
- `src/persistence/beloteSave.ts`: version-1 action-log saves under
  `barbu.savedBeloteRun.v1`. Restore replays legal transitions and recomputes
  scores; it does not trust cached summary totals. Existing game keys are unchanged.
- `src/games/belote.ts`: shared registry metadata. `accessPolicy.ts` declares
  Belote free; there is no new purchase product or entitlement check.

The standard 13-card hand factory is deliberately not used for the partial
32-card deal and stronger trumping obligations. Shared shuffling/trick primitives
are reused without changing other games' rules. No Rust gameplay implementation
or native command route is added.

## Verification

Run `task domain:test` and `task build`, then:

```sh
npx playwright test tests/e2e/belote.spec.ts tests/e2e/catalog-availability.spec.ts --project=iphone-xr --project=galaxy-s9 --workers=1
```

Domain coverage includes point totals/ranks, both taking rounds, legality
exceptions, protected bonuses, capot/litige/carry, complete seeded matches,
save validation/replay, public-information invariance and all lesson companions.
Browser coverage checks Learn completion, wrong-answer reinforcement, rules and
example cards, a complete saved deal, guided play isolation, stable boards,
four-by-two cards and non-overlapping controls at widths 320, 360, 393 and 1366.

Try http://localhost:1420/ -> Belote -> Learn or Play. Browser mode uses the same
rules engine as installed builds. Physical Android/iPhone checks and a new
store package are still needed before announcing a mobile release.
