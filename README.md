# Barbu

**Learn here. Play together.**

Barbu helps players learn classic card games through short interactive lessons, guided hands and single-player practice, then take that confidence to a real table with friends, family or a local card club. It is designed for phones, with Android and iPhone builds and a browser development runtime.

Barbu is available on [Google Play](https://play.google.com/store/apps/details?id=com.martin.barbu). Visit the [product website](https://siliciumveritas.com/) for a preview and an introduction to the games; its source lives in [`website/`](website/).

The active catalog contains Hearts, Barbu (including Domino), Whist, Spades, Bridge, Gin Rummy and Card Counting I. Each table uses shared **Learn | Play** navigation; short exercises and guided hands belong inside Learn. [Canasta](docs/canasta.md) has an opt-in development preview and an Android Premium candidate with shared lessons and guided play; it remains hidden in the public production build.

All gameplay runs locally in TypeScript, shared by browser and installed builds. Svelte owns presentation and interaction; Tauri packages the native application. Rust handles startup and native integrations, not rules or scoring. Saves and learning progress are local; there is no gameplay server or player login. The Android billing test integration uses Google Play and RevenueCat.

The existing seven games remain free. Additional games, starting with Canasta,
are intended for an optional Premium subscription. Billing is disabled in the
public build. Canasta version `1.0.7` / `1000010` is published to closed testing;
Norway, the Netherlands and the UK are selected for paid-launch preparation,
with only Norway currently enabled for checkout. See the
[premium setup and release gates](docs/premium.md) and
[production preparation checklist](docs/premium-launch.md).

Play is against computer opponents, not online multiplayer. **Share Barbu** shares the Google Play listing, and **Get out and play** opens an external Google Maps search for card clubs. Barbu does not operate a verified club directory, membership service or tournament booking system. Local tables may use different rules and conventions.

## Device Support

The current release target is **Android phones and iPhones in upright portrait**.
Tablet and iPad layouts are deferred; no dedicated watch, TV, automotive or XR
edition is supported. Browser gameplay and the desktop Tauri shell are development
and testing runtimes, not separately launched consumer products.

This is a support policy, not proof that every other device is blocked from
installation. Google Play form-factor settings and Device catalog exclusions
must be checked separately. The Android manifest keeps portrait hardware optional
and does not advertise a TV launcher or Wear OS edition. Apple release preparation
targets iPhone, with iPad compatibility-mode checks still required. See the
[Android device-support gate](docs/google-play-release.md#device-support-gate)
and [iPhone release scope](docs/app-store-release.md).

## Release Status

Google Play production is live. The first production release is:

- Store title: **Barbu: Learn Card Games**.
- Version: **1.0.6**, Android version code **1000007**.
- Release: **1.0.6 - First production release**, promoting the existing closed-test bundle.

Android version **1.0.8** / **1000012** was prepared with the
Whist learning improvements, Premium renewal recovery and phone compatibility
fixes. It is signed and package-verified; the developer now reports it is in
closed testing. Later Premium-screen simplification is source-only and is not
included in that bundle. See the
[1.0.8 handoff](docs/google-play-release.md#prepared-108-candidate).

Physical Samsung testing and no blocking pre-launch report errors were confirmed
by the developer. Later store-listing updates have their own review status; check
Play Console's **Publishing overview** before announcing those changes. See the
[Google Play release runbook](docs/google-play-release.md) for dated evidence and
the [store assets](docs/store-assets/google-play/README.md) for copy, artwork and
screenshot provenance. iPhone distribution is tracked separately in the
[App Store runbook](docs/app-store-release.md).

## Quick Start

For browser development, install a current Node.js LTS compatible with the locked dependencies and [Task](https://taskfile.dev/). Rust, Xcode and the Android SDK are not needed for browser gameplay.

```sh
npm ci
task dev
```

Open http://127.0.0.1:1420. Vite requires that port to be free. Browser mode uses the same rules and lessons as native builds, but does not verify native sharing, external links, safe areas or packaging.

For native development, install Rust and the relevant platform toolchain first. Use the [iOS](docs/app-store-release.md) or [Android](docs/google-play-release.md) runbook for device and store builds. `task tauri:dev` starts the desktop shell, not a phone build.

```sh
task tauri:dev
```

## Verification

```sh
npx playwright install chromium webkit # Once, and after browser dependency upgrades
task domain:test                       # Type-check and test gameplay
task build                             # Build the frontend
task ui:test                           # Browser interaction/layout tests
task play:test                         # Offline release-tool safeguards
task tauri:check                       # Native shell; requires Rust/toolchain
task verify                            # All of the above
```

The [Taskfile](Taskfile.yml) is the canonical command surface. Browser tests start or reuse the server on port 1420. Test installed builds on physical devices before release, including saved-game upgrades and native integrations.

## Documentation

- **[FEATURES.md](./FEATURES.md)**: Product control document (roadmap, current features, non-goals).
- **[SCREEN_PLAN.md](./SCREEN_PLAN.md)**: UI boundaries, catalog structure, and navigation architecture.
- **[AGENTS.md](./AGENTS.md)**: Technical guidelines for AI agents working in this repository.
- **[Game architecture](docs/game-architecture.md)**: Source ownership, shared factories and the new-game checklist.
- **[Content](content/README.md)**: Lesson, reference and generated-exercise sources.
- **[Documentation index](docs/README.md)**: Game rules, release runbooks, public pages and historical audits.
- **[Market-entry strategy](docs/marketing/strategy.md)**: Audiences, competition, distribution experiments, measurement and monetisation boundaries.
- **[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)**: Dependency licenses and attribution.
- **[Google Play releases](./docs/google-play-release.md)**: Android packaging, API workflow and dated release evidence.
- **[App Store releases](docs/app-store-release.md)**: iPhone packaging, review and dated submission evidence.

## License

This repository is proprietary and all rights are reserved. See [LICENSE](./LICENSE).

## Silicium Veritas product website

`https://siliciumveritas.com/` now introduces Barbu. Source is in `website/public`,
with existing hosting ownership recorded in `website/ownership.json` and Pulumi
source in `website/infra`. Use `task website:serve` for local preview at
`http://localhost:4178`, `task website:test` for the phone/desktop browser checks,
and `task website:deploy` for a backed-up content release. Retain existing AWS/Pulumi
resource identities; the old isv-mainpage deployment is retired. The ISV repo
retains its newsletter drafting tools but no longer owns this domain.

The page explains learning and computer-opponent practice, with an organiser
contact route for clubs, teachers and community hosts. Do not imply online
multiplayer, club-management software, public iPhone availability or measured
customer results. Explee campaign sending/settings are managed separately;
editing this site does not authorize outreach or spending.

The site is buildless HTML/CSS with a small click-to-play video enhancement.
YouTube is loaded only after pressing Play; a direct video link remains available
without JavaScript. Website tests cover Chromium and WebKit, including narrow
screens, navigation, FAQ controls and the embed handoff (not external playback).
The logo and King of Hearts in `website/public/assets` are copies of the existing
app artwork, kept here so the website deploys independently of the game bundle.
