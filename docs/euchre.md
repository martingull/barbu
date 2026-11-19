# Euchre Implementation Proposal

Euchre is the next candidate after Canasta in the [agreed expansion order](game-roadmap.md).
This proposes a complete Learn and Play experience within the existing Premium
subscription, not a separate purchase. No engine, entitlement or release entry
is added by this specification. Confirm the rules profile before implementation.

## Proposed Rules Profile

Start from David Parlett's *The Penguin Book of Card Games*; confirm its treatment
against the available edition before writing reference content. The choices
below use [Pagat's North American distinctions](https://www.pagat.com/euchre/euchre.html)
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
- Proposed default: all pass twice means redeal by the next dealer, with no score.
  Stick the dealer is a documented later variant, not an invisible shortcut.
- Only the caller may go alone, declared with the call; their partner sits out.
  No defender-alone, partner-card exchange, joker or extra zero-trick bonus.
- Opening lead is left of dealer, skipping the inactive partner. Follow the
  effective led suit when possible; otherwise any card is legal. Winner leads next.
- Makers score 1 for three/four tricks, 2 for all five, or 4 for all five alone.
  Defenders score 2 when makers fail to take three. First partnership to 10 wins.

## Learning Journey

Every topic uses the shared Learn shell: short introduction, three distinct
worked/supported/independent decisions, explanation and decision review. Plan
three additional reinforcement positions per topic, not repeated answer layouts.

| Topic | Decision to teach |
| --- | --- |
| Meet the bowers | Identify the two highest trumps; do not mistake the left bower for its printed suit. |
| Follow the real suit | Choose legal cards when a bower is held or led. |
| Order it up | Use the visible hand, upcard and dealer position to weigh a first-round call. |
| Choose another trump | Reject the turned-down suit and compare second-round options or pass. |
| Play with partner | Follow, duck or trump using only visible information and the three-trick target. |
| Go alone and score | Compare partner play with a loner and explain the resulting partnership score. |

That is 18 base decisions plus 18 reinforcement positions, followed by a guided
five-trick hand with calling and any dealer discard. Distinguish forced legality
from tactical advice: more than one call or discard can be reasonable. Shared
outcomes remain `good`, `risky`, `penalty` and `illegal`, with structured reasons.

Guidance is automatic, not hidden behind a hint button. Explain the rule and a
public-information tactic before each decision; review its consequence afterwards.
Finish with Replay and Play Euchre, without overwriting the independent match.
Game rules cover object, players, cards, deal, calling, play, scoring, variants
and tactics. Display suits as symbols where useful; name the actual suit accessibly.

## Shared Architecture

Follow the [new-game checklist](game-architecture.md). Register metadata through
`createGameTableDefinition`, compose `GameLearning` and `TablePlaySurface`, and
keep calling/hand/session transitions in TypeScript domain modules. Use the
saved-session controller and replay-validated persistence; exercises and guided
hands stay separate from the saved match. Access remains centralized in
`games/accessPolicy.ts`; do not add native billing products or per-view paywalls.

The current trick engine is not configuration-only Euchre: replay validates
13-card hands/52-card deals, trick legality compares printed suits, and normal
turns assume four participating seats. Do not pass Euchre into that path unchanged.
Review small rule hooks for effective suit, trump rank, deck/hand size and active
seats. Extract shared mechanics only where useful; preserve existing defaults and
test the other games before changing their engine contracts. Use a dedicated
Euchre calling/session model rather than cloning Whist's full engine or spreading
game-name conditionals through shared components.

Opponent policy must use public observations, not hidden hands. Evaluate calling
and play against making or defending three tricks; use a conservative documented
heuristic initially, not an expert-strength claim. Keep the same compact phone
table, five-card thumb hand, suit choices, dealer/upcard and maker/defender labels.
Inactive partners are clearly marked during loners. No new two-column layout.

## Acceptance Before Registration as Released

- [ ] Confirm the chosen regional rules and deliberate variants with Martin.
- [ ] Domain tests: unique 24-card deal, both calling rounds, private dealer discard, two-pass redeal, bowers and effective-suit legality, loner seat skipping, all scoring cases and match completion.
- [ ] Policy tests: no concealed-card access; deterministic seeds and legal decisions.
- [ ] Save tests: restore in calling, discard, trick/review and result phases; reject malformed history; preserve the actual deal on replay.
- [ ] Learning tests: 18 distinct base decisions and 18 reinforcement positions; consistent rules, progress, decision review and guided-to-independent handoff.
- [ ] Browser phone checks: readable bowers, stable board, legal-card indication and no action overlap on small and modern screens.
- [ ] Premium access/expiry/restore uses the existing entitlement and preserves the saved match; free games remain unaffected.
- [ ] Native phone journey and reviewed opponent behavior before any store claim.

Keep Euchre unregistered and absent from public listing copy until these pass.
