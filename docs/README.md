# Barbu Documentation

Start with the [project README](../README.md), [feature map](../FEATURES.md) and
[screen plan](../SCREEN_PLAN.md). Current implementation guidance and historical
release evidence have different roles; an old audit is not a current release gate.

## Development

- [Shared game architecture](game-architecture.md): source ownership, factories,
  learning contracts and the new-game checklist.
- [Content sources](../content/README.md): references, courses and generated exercises.
- [Agent guidelines](../AGENTS.md): repository constraints and verification policy.
- [TypeScript migration record](typescript-engine-prototype.md): completed migration,
  frozen compatibility fixtures and historical verification results.
- [Game completion](game-completion.md): end-of-game behavior.
- [Result-screen audit](result-screen-audit.md): dated layout findings and checks.
- [Card-back artwork](card-back-art.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

## Game Profiles

- [Hearts](hearts.md)
- [Whist](whist.md)
- [Bridge](bridge.md)
- [Gin Rummy](gin-rummy.md)
- [Canasta prototype](canasta.md), paused and hidden from players

Barbu's training boundaries and contract values are in the
[feature map](../FEATURES.md#play-boundaries). Spades currently documents its
scope there and in the domain modules; neither has a dedicated rules runbook here.

## Release Operations

- [Google Play](google-play-release.md): packaging, API safeguards and dated track status.
- [App Store](app-store-release.md): iPhone packaging and last recorded submission.
- [App Review response](app-review-response.md): submission-specific correspondence,
  not reusable claims about an untested new build.

Keep signed artifacts and credentials outside Git. Check the live store before
making release decisions; documented submission states are dated observations.

## Public Pages

GitHub Pages serves these static pages from this directory:

- [Privacy policy](https://martingull.github.io/barbu/privacy-policy.html)
  ([source](privacy-policy.html)).
- [Support](https://martingull.github.io/barbu/support.html)
  ([source](support.html)), including contact and GitHub Issues.

Verify the published pages after deploying changes; editing a local file does not
publish it or update a store listing.
