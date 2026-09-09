# Game Completion

Full-hand results are settled before testing a session endpoint. Reaching a
provisional score during a trick does not terminate the deal.

| Table | Endpoint | Continuation |
| --- | --- | --- |
| Hearts | Any seat reaches 100 after moon settlement; lowest score wins, including tied winners | New match |
| Whist, single game | A partnership reaches five points | New match |
| Whist, rubber | Each game ends at five; two game wins finish the rubber | Next game, then New match |
| Spades | At least 500 after nil and bag penalties; higher score wins | New match; tied totals play another hand |
| Barbu | All seven training-table contracts completed | New game |
| Bridge | Thirteen tricks complete a contracted board; four opening passes complete a passed-out board | Next board or Deal again |

Bridge uses duplicate-style board scoring, not rubber scoring or a race to a
cumulative point target. There is currently no fixed-board session limit or
multi-table comparison. Barbu remains a fixed-order training session, not a
full dealer-selected settlement. These are product boundaries, not club rules.

## Local Completion Event

`GameResult.svelte` presents a named `role="status"` region and dispatches
`barbu:game-completed` on `window`. Its `CustomEvent.detail` contains
`{ game, scope, title, summary }`; scope is `game`, `rubber`, `match`, `board`, or
`session`. Ordinary intermediate hands and practice results do not emit it.

This is a presentation event: it fires once when a completed result is mounted,
including when resuming a completed save. Resizing or reactive updates do not
emit it again. It is not a persisted achievement, scoring command, Tauri event,
or network/analytics request. Consumers must not use it to add scores.

Completed Hearts, Whist, and Spades sessions clear their ongoing save and cannot
be replayed from pre-deal totals. Whist also blocks replay after an individual
game within a rubber. New match resets points, bags, and rubber games as relevant.

## Verification

`tests/e2e/game-completion.spec.ts` and `tests/e2e/hearts-match.spec.ts` cover score
boundaries, wins, losses, ties, penalties, resume, completion events, and resets.
Run `task ui:test` and `task core:test`. Browser mode is sufficient for these
session/UI checks; native dealing and card legality remain Rust-backed on phones.
