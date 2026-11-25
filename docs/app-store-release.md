# iPhone App Store Release

The first Apple release targets iPhone only. Device installs are not App Store
packages. Do not upload the IPA produced by `ios:install:device`.

Native orientation is upright portrait only, declared in tracked
`src-tauri/Info.ios.plist`. Tauri merges this override; `prepare-ios-store.mjs`
also applies it before XcodeGen so regeneration cannot restore landscape.
Keep `TARGETED_DEVICE_FAMILY=1` for distribution. The iPad orientation override
does not enable a native iPad edition; compatibility-mode review still needs
testing. A future universal/tablet release needs its own layout and windowing
audit rather than stretching the phone table. Run `task mobile:check`, then
verify the built application's Info.plist and physical rotation before release.

## Internal Game Preview

Canasta, Euchre and Cribbage can be tested without an Apple subscription in a separate internal-only
build. This is not a paid entitlement and must not be submitted for App Review.
The default store build still hides these games and uses `dist/`. The preview uses
`canasta-internal` Vite mode, requires the iOS build platform, writes to
`dist-canasta-preview/`, and labels each Premium game `Internal preview` in the catalog.
The channel and task names retain their original Canasta names for compatibility;
access uses the central Premium catalog and is restricted to internal iOS builds.
No purchase service is enabled on iOS and no Premium unlock is saved.
Both store and preview preparation set an iOS-specific build hook that copies
fresh frontend files into Xcode's `assets/` resource folder. Do not rely on the
Rust asset build alone to refresh those separately bundled resources.

```sh
node scripts/generate-ios-notices.mjs
task ios:preview:archive IOS_BUILD_NUMBER=7 # Confirm unused before upload.
task ios:preview:export IOS_ARCHIVE_PATH=/path/to/archive.xcarchive IOS_EXPORT_PATH=/path/to/export
```

The archive must have `BarbuBuildChannel=canasta-internal`, the expected version
and build number, portrait-only orientations, and `UIDeviceFamily=[1]`. Export
only with `src-tauri/ios/ExportOptions.canasta-preview.plist`, which sets
`testFlightInternalTestingOnly=true`. For Xcode upload, retain all those settings
and change only `destination` to `upload` in an ignored copy of the export plist.
Do not use the normal App Store export options for this archive.
Apple internal-only builds cannot be submitted to the App Store or external
TestFlight groups. The existing internal group can test it after processing.

Packaged browser checks (WebKit); do not run while archiving the same assets:

```sh
task ui:test:ios-preview
```

The second build deliberately retains preview environment variables to check
that production mode does not unlock Premium games. The crowded-hand component fixture
requires Vite's module server and remains covered by `task ui:test:canasta`, not
the packaged suite. On the phone, test all eight Learn topics, a guided hand,
ordinary play/resume, a large pile pickup, offline startup and rotation. Preview
progress and matches use the existing save keys; a later public build preserves
Canasta saves but hides them until access is available.

[Apple's internal testing restrictions](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers).

### November 24 Candidate

Uploaded **1.0.11 (10)** at 19:27 Europe/Oslo for internal-only TestFlight testing.
Apple finished processing and shows **Ready to Test**. The existing **Barbu
Internal Testing Group** is assigned (one tester), and build-specific **What to
Test** notes are saved. No encryption-compliance prompt is currently shown.
No App Review submission or public availability change was
made. Purchases remain disabled; Canasta, Euchre and Cribbage are unlocked only
in the internal iOS channel, without granting or saving a paid entitlement.

Both platforms now use source version `1.0.11`. The next Android version code is
`1000015`; no Android bundle was built or uploaded as part of this iPhone update.
The current source includes Cribbage's six learning topics, points sheet, guided
deal, independent games to 121 and stepwise hand/crib scoring. The source is
`c2f3615` plus the working-tree changes captured in the private verification receipt.

Preserved artifacts (ignored, not committed):

- `release/app-store/canasta-preview-v1.0.11-build10/Barbu.ipa`
- `release/app-store/Barbu-canasta-preview-v1.0.11-build10.xcarchive`
- `release/app-store/canasta-preview-v1.0.11-build10/verification.json`
- `release/app-store/canasta-preview-v1.0.11-build10/upload-result.json`
- `release/app-store/canasta-preview-v1.0.11-build10/simulator-smoke.json`

IPA SHA-256: `e1ce01eb1850e0a17cdfa63a5dde7a1a7dc85f2a101a41fdb4d5cdc8c063bc0b`.
Distribution signature/provisioning, internal-only export, version/build, iPhone
targeting, portrait orientation, iOS 15 minimum, privacy manifest, dependency
notices, opaque icons and all 133 frontend assets passed verification.

Verification passed: 380 domain tests, five mobile configuration checks, native
shell compilation, 40 packaged iPhone WebKit preview tests across Canasta, Euchre
and Cribbage, and the public-catalog isolation test. Sixteen development-fixture
or purchase-access tests were intentionally skipped in the internal preview;
they remain in the appropriate development/public checks. The final Cribbage
and internal-catalog checks passed again after archiving (eight tests), with
screenshots preserved in `browser-preview/`. The fresh iOS 26.5 simulator build
launches with existing saves visible and matches all 133 preview assets.
Physical installation and acceptance testing remain pending.

Apple returned the same non-blocking SDK warning as build 9: from April 2027,
uploads require iOS 27 SDK / Xcode 27 or later. The current upload succeeded.

### November 19 Candidate

Uploaded **1.0.9 (9)** at 20:43 Europe/Oslo for internal-only TestFlight testing.
Apple processed the build, the Account Holder completed the encryption
questionnaire, and the build shows **Ready to Test** with the existing
**Barbu Internal Testing Group** assigned (one tester). Build-specific
**What to Test** instructions cover saved-game upgrades, Card Counting, Gin
Rummy, Whist, Canasta and the remaining tables. Physical installation and
acceptance testing of build 9 remain pending. No App Review submission or
public availability change was made; iOS purchases remain disabled.

This candidate includes the single Card Counting Learn screen, clearer Whist
learning, Gin Rummy settlement lessons and the latest Domino and Canasta
improvements. It uses version `1.0.9` with the iOS-only build number `9`;
Android retains version code `1000013` and its existing production submission.
The source is `02dcd78` plus the pending changes captured in the private receipt.

Preserved artifacts (ignored, not committed):

- `release/app-store/canasta-preview-v1.0.9-build9/Barbu.ipa`
- `release/app-store/Barbu-canasta-preview-v1.0.9-build9.xcarchive`
- `release/app-store/canasta-preview-v1.0.9-build9/verification.json`
- `release/app-store/canasta-preview-v1.0.9-build9/upload-result.json`
- `release/app-store/canasta-preview-v1.0.9-build9/simulator-smoke.json`

IPA SHA-256: `37ce648be7008cee282f2246fe1ef6406dcb7a532c1f524437c629b7008dd9d2`.
Distribution signing/provisioning, internal-only export, iPhone targeting,
portrait orientation, iOS 15 minimum, privacy manifest, dependency notices and
all 133 bundled assets passed verification. The newly built iOS 26.5 simulator
version launches and renders with existing saved games retained; its assets
match the packaged preview. Screenshot: `simulator-launch.png` in the build's
ignored release directory.

Packaged iPhone WebKit checks passed 15 preview tests (14 development-fixture
checks intentionally skipped) and the public-catalog isolation test. Five
mobile configuration checks passed. The canonical packaged-test port was busy,
so an ignored configuration used ports 1424/1425 without terminating the
existing service. Native archive, export, upload and simulator builds succeeded.
Apple returned a non-blocking warning: from April 2027 uploads need the iOS 27
SDK / Xcode 27 or later. The current upload was accepted.

iOS dependency notices were refreshed against the current lockfiles; only their
two lockfile-hash headers changed. This happened after the Android artifact was
queued, so the current tree no longer exactly matches that older Android source
fingerprint. Its signed bundle and original verification record were not changed.

### November 17 Candidate

Uploaded `1.0.6 (8)` from `c9fe837` at 17:09 Europe/Oslo for internal-only
TestFlight testing. Xcode reported "Upload succeeded"; Apple finished processing
and the Account Holder completed the encryption questionnaire. Build 8 is
`Internal`, and the existing Barbu Internal Testing Group lists it as `Testing`.
The tester still shows installed build 7; physical installation/testing of build 8
remain pending. No App Review submission or public
availability change was made. Canasta is available as an internal preview;
iOS purchases remain disabled. Build-specific **What to Test** notes were saved
in App Store Connect for the internal testers.

This build includes Canasta's eight-topic learning path, rank-first hands,
meld-risk guidance, score breakdown and revised opponent strategy. Bridge adds
**Support partner's major**, taking its path to seven topics, and identifies
the Barbu Natural agreement at Play entry and in guided/normal auctions.

Preserved artifacts:

- `release/app-store/canasta-preview-v1.0.6-build8/Barbu.ipa`
- `release/app-store/Barbu-canasta-preview-v1.0.6-build8.xcarchive`
- `release/app-store/canasta-preview-v1.0.6-build8/verification.json`

IPA SHA-256: `e3d21fa7a0ca510ecc158adbe195c8cfd65c22e7dbb53f4db302a04bf67ec87a`.
The export passed distribution signature/provisioning, internal-only export,
iPhone-only targeting, portrait orientation, iOS 15 minimum, opaque icons,
privacy manifest, dependency notice and all 133 bundled-asset comparisons.

Verification on this source: 275 domain tests and 32 focused Bridge browser
checks passed. The packaged iPhone WebKit preview suite passed 15 tests, with
eight development-fixture checks deliberately skipped; the packaged public
catalog test also passed. Mobile configuration checks (three) and native shell
compilation passed. The newly compiled build-8 simulator app launches and
renders with pre-existing saved games retained. Tauri's subsequent simulator
packaging step hit an existing archive-directory conflict; the fresh Xcode
DerivedData app was installed directly. The separately preserved distribution
archive and successful upload were unaffected. Physical TestFlight testing of
build 8 remains pending.

### November 16 Candidate

Uploaded `1.0.6 (7)` at 18:23 Europe/Oslo for internal-only TestFlight testing.
Apple accepted the upload and finished processing it as an `Internal` build.
The Account Holder completed the encryption questionnaire. App Store Connect
now shows `Ready to Test`, and the existing Barbu Internal Testing Group lists
`1.0.6 (7)` as `Testing`. The tester still reports installed build 6; installation
and physical iPhone testing of build 7 remain pending.
No App Review submission or public availability change was made. The existing
Barbu Internal Testing Group has automatic distribution for Xcode builds enabled.

The first archive inspection caught stale files in Xcode's resource folder;
the iOS build hooks now explicitly sync assets and the rebuilt export passed
all 133 file comparisons, refreshed dependency notices, distribution signing,
provisioning, opaque icons, iOS 15 minimum, iPhone-only targeting and portrait checks.
Preserved artifacts:

- `release/app-store/canasta-preview-v1.0.6-build7/Barbu.ipa`
- `release/app-store/Barbu-canasta-preview-v1.0.6-build7.xcarchive`
- `release/app-store/canasta-preview-v1.0.6-build7/verification.json`

IPA SHA-256: `39fdd6061a15d48cc83c1c42ec18859bf964b032d15b4e025e30cc2b133106aa`.
The preview includes uncommitted source changes over `1127b23`, recorded in the
verification receipt. Verification passed: 243 domain tests, 24 Canasta browser
tests, 14 Premium/catalog browser checks, three mobile-config checks and native
shell compilation. The packaged WebKit preview suite passed 11 tests, with the
development-only component fixture skipped; the packaged public catalog check
also passed. An earlier packaged run had one startup timeout while its assets
were being rebuilt; the complete rerun used stable files and unchanged timeouts.
Screenshot checks covered lessons and guided play at compact phone sizes.

## TestFlight Update (November 2, 2026)

Version `1.0.6`, build `6`, was archived from `4f3a590` with refreshed dependency
notice lockfile hashes. Browser test selectors were also narrowed to the exact
`Open Barbu` button so they do not match `Share Barbu`.
This update is for TestFlight only, not an App Review submission.

The initial distribution export was blocked by `PLA Update available` and a
missing distribution certificate. After the Account Holder accepted the updated
agreement, automatic signing and App Store export succeeded without changing
certificates manually. Explicit export settings use `app-store-connect`; do not
use the generated default `ExportOptions.plist`, which currently says `debugging`.

The preserved IPA passed distribution-signature, provisioning, entitlement,
version, iPhone-only device-family, iOS 15.0 minimum, privacy-manifest, dependency
notice, opaque-icon and bundled frontend asset checks (133 assets).

- `release/app-store/barbu-app-store-v1.0.6-build6.ipa`
- `release/app-store/Barbu-v1.0.6-build6.xcarchive`
- `release/app-store/verification-v1.0.6-build6.json`

IPA SHA-256: `14b1c1f695e65343a734684b6655b7b862be7a4dbc966d5d603d377420f1cf99`.
Upload succeeded on November 2 at 09:47 Europe/Oslo. The Account Holder completed
the encryption questionnaire after processing. TestFlight shows `Ready to Submit`
and the existing Barbu Internal Testing Group confirms `Installed 1.0.6 (6)` on
Martin's iPhone 16. No tester groups or public-release settings were changed.
Martin reports that initial iPhone testing works; broader physical testing is
still in progress. No fresh native simulator run was performed for this update.

Verification: 228 domain tests and 12 release-tool tests passed; frontend build
and native shell check passed. The six-profile browser matrix finished with
2,499 passed, 72 skipped and three iPhone XR timeouts. All three passed when
rerun with one worker, unchanged assertions and unchanged timeouts (18 seconds
total). The original matrix is not a clean pass: two startup timeouts occurred
during overlapping test runs, and the full seven-contract Barbu journey exceeded
30 seconds under load. The isolated run completed that journey in 10.9 seconds.
The initial broader verification attempt was stopped after ambiguous Barbu
selectors matched the new sharing action; those selectors are now exact.

Logs: `/private/tmp/barbu-testflight-build6-verify-fixed.log` and
`/private/tmp/barbu-testflight-build6-rerun.log`. The ignored release receipt
records the package and upload checks. Generated binaries and signing files
remain untracked.

App Store Connect was checked on November 2: `1.0.4` shows Ready for Distribution
but also a removed-from-sale notice. Public availability was left unchanged.

## Previous Submission (October 1, 2026)

This section records the October submission, not its live status. Confirm the
current App Store Connect state and highest build number before preparing
another submission.

Version `1.0.4`, build `5`, was built from `08d406b` and refreshed dependency
notices, then uploaded successfully on October 1 at 16:27 Europe/Oslo. TestFlight
processed it and shows Ready to Submit. Martin installed it on his iPhone 16
(iOS 26.6.2 per TestFlight) and confirmed the requested learning, saved-hand,
Gin Rummy and Bridge flows work. Do not reuse the Android package or an iPhone
development-install IPA.

App Store Connect confirms the September 29 rejection of `1.0.3 (4)` under
Guideline 4.2 (Minimum Functionality), reviewed on iPad Air 11-inch (M3).
The September 24 physical-device videos and response were submitted; the
earlier Guideline 2.1 information request is not the latest rejection reason.

The replacement includes Gin Rummy, the family-organized catalog, an introductory
Hearts journey, saved-game continuation, expanded Barbu/Bridge/Gin learning, and
clearer lesson completion, retry, and next-lesson actions. Canasta remains hidden.
Keep the iPhone-only target, but verify iPad compatibility-mode scrolling and
controls because Apple used an iPad for review.

The exported IPA passed distribution signature, entitlement (`get-task-allow`
false), version, iPhone-only device-family, privacy manifest, dependency notices
and bundled frontend asset checks. Preserve these exact artifacts:

- `release/app-store/barbu-app-store-v1.0.4-build5.ipa`
- `release/app-store/Barbu-v1.0.4-build5.xcarchive`
- `release/app-store/verification-v1.0.4-build5.json`

IPA SHA-256: `4dda90b1938f61d56ae50fd8b82044c18819f03d198d576a20bd426e3906b26a`.
Frontend: `index-D7-YHMdb.js` and `index-BtzRYBG9.css`.

All 105 selected iPhone WebKit tests passed, including tablet-sized lesson and
result layouts. Native iPhone 13 Pro Max and iPad Air 11 M3 simulator journeys
passed on iOS 26.5. The first iPad run failed because XCTest exposes answer
choices as switches; correcting the temporary test selector resolved it.
Simulator compilation succeeded but Tauri's subsequent packaging hit an existing
archive-directory conflict. The verified DerivedData simulator app was installed
directly; the separate, preserved distribution archive was unaffected.

App Store Connect's editable version now has `1.0.4 (5)` selected, refreshed
description/keywords and the updated [review notes](app-review-response.md).
Six current native screenshots at 1284 x 2778 are in
`release/app-store/screenshots-v1.0.4-build5/`. The initial catalog capture caught
a pre-paint frame; it was replaced after a cold launch and visually checked.
Martin updated the screenshots and resubmitted on October 1; App Store Connect
shows version `1.0.4` Waiting for Review.
The existing automatic-release-after-approval setting is unchanged.

## Minimum iOS Version

Future builds require iOS 15.0, set by `bundle.iOS.minimumSystemVersion` in
`src-tauri/tauri.conf.json`. App Store preparation applies that same value to the
generated Xcode project, including when its template was created with iOS 14.0.
Build `1.0.4 (5)` already submitted for review still targets iOS 14.0; its
ITMS-90068 notice is a non-blocking warning about the April 2027 requirement.
Do not replace that submission solely for this change.

## Previous Submission (1.0.3 Build 4)

Barbu 1.0.3, build 4 archives and exports successfully with Xcode 26.5. The archive has
`UIDeviceFamily = [1]` and the privacy manifest. All 18 generated icon images
are opaque, including the 1024-pixel store icon.

The previous Apple account/signing blocker is resolved: team `3PB43Q6B3W`
successfully exported with a cloud-managed Apple Distribution certificate and
an iOS Team Store provisioning profile. The exported signature passes
`codesign --verify --deep --strict`; `get-task-allow` is false and
`testFlightInternalTestingOnly` is false. Version 1.0.3 (4) was successfully
uploaded from the preserved archive on September 23 at 16:51 Europe/Oslo.
Xcode reported "Upload succeeded" and "Uploaded package is processing".
The App Store Connect record is named `Barbu - The king of cards`, bundle ID
`com.martin.barbu`. Apple processed the build, and Martin confirmed installing
and testing it through TestFlight on September 23. It was subsequently submitted
for App Review. On September 24, Apple requested additional information under
Guideline 2.1, including a physical-device recording on the latest operating
system. The message does not identify a specific crash or gameplay defect.
See [the response draft and recording checklist](app-review-response.md).

The preserved candidate is
`release/app-store/barbu-app-store-v1.0.3-build4.ipa`. Its archive is retained
alongside it as `Barbu-v1.0.3-build4.xcarchive`. These generated release artifacts
are ignored by Git. Do not use a later device-install IPA from the generated
build directory for App Store upload.

Five refreshed native iPhone screenshots (1284 x 2778, opaque PNG) are in
`release/app-store/screenshots-2026-09-23/`. Their layouts were visually inspected.
Build 4 includes the merged Learn experience and the latest Hearts and Spades
feedback. The previous build 3 and old screenshot set are retained for history,
not for the current submission.

Both public support and privacy pages return HTTP 200 and show
`martin@insilicoveritas.org`. The support page links to GitHub Issues. Martin
confirmed that the card artwork was generated using ChatGPT; provenance is
recorded in `THIRD_PARTY_NOTICES.md`. Full dependency notices and exact source
download links are bundled in `assets/THIRD_PARTY_LICENSES.txt` in the IPA.

Verification: production build and native-shell check passed; 100 domain tests
passed. The six-profile browser run passed 1,061 cases with 30 skipped and 13
failures while Xcode was also running. All 13 failures passed on a one-worker
rerun (1,074 passing cases in total). An earlier run stopped because the Mac ran
out of disk space; only regenerable repository build caches were cleared.
Native simulator navigation and screenshot capture passed. These checks do not
replace testing the uploaded build through TestFlight.

Candidate IPA SHA-256:
`3597db9063bd1ddd9f9a9329384b39c2a988d8e33e1fd38723eebd0057fd6fa4`.
Its frontend assets are `index-CAR2ilQI.js` and `index-CFTZGQ9u.css`.

The account owner's TestFlight screenshot showed no previous builds before this
upload. Build number 4 is now used; choose a higher number for another upload.
Processing completion is confirmed by the App Store Connect screenshot.
Martin submitted two physical iPhone 16 recordings and review notes on September
24. The notes report TestFlight testing on iOS 26.6.2. These recordings demonstrate
build 4, not the new candidate. Approval and publication have not occurred.

Xcode accepted the upload with one non-blocking warning: this release targets
iOS 14.0, and its upload response says that from Spring 2027 Apple will require
iOS 15.0 or later as the deployment target. The tracked configuration now sets
15.0 for subsequent builds; it did not block this upload.

## Build

Requirements: paid Apple Developer membership, Xcode with the developer account
signed in, Rust iOS target, Node dependencies, Task, Ruby, and XcodeGen.

```sh
task ios:init # Only when src-tauri/gen/apple is missing.
node scripts/generate-ios-notices.mjs # Regenerate after either lockfile changes.
task verify
task ios:store:build IOS_BUILD_NUMBER=7 # Next candidate; confirm this number is unused before upload.
```

Use a new build number for each upload; check App Store Connect before choosing
it. The marketing version comes from `src-tauri/tauri.conf.json`. The build number
override is iOS-only and does not alter Android's release version.

The preparation task derives a project from Tauri's generated XcodeGen template,
sets the iPhone device family, disables script sandboxing for the Rust build,
bundles the privacy manifest, and removes alpha channels from generated iOS
icons. It rejects dependency notices with stale lockfile hashes. Generated
projects and signing material must not be committed.

Only after a successful App Store export, upload:

`src-tauri/gen/apple/build/arm64/Barbu.ipa`

An older IPA can remain there after a failed build. Check the command result and
the build number inside the archive before uploading. Use Transporter or Xcode's
Organizer to validate and upload using the developer account. Wait for processing
and check App Store Connect's build warnings before selecting the build.

## Release Checks

- Check `UIDeviceFamily` is `[1]` in the archived Barbu.app/Info.plist.
- Check `MinimumOSVersion` is `15.0` in the next archived Barbu.app/Info.plist.
- Confirm the archive has the intended version and build number, an opaque
  1024-pixel icon, and a root-level `PrivacyInfo.xcprivacy`.
- Confirm distribution export succeeds and the exported app's `get-task-allow`
  entitlement is false. An archive signed for development is not the final IPA.
- Test the uploaded build through TestFlight: cold launch without a dev server,
  offline play, all six card games, Learn lessons and exercises, saved-hand resume, and a
  completed game. Check both a compact iPhone viewport and a current iPhone.
- Check the privacy manifest against the release binary whenever dependencies
  change. The file-timestamp declaration (`C617.1`) covers bundled/private file
  metadata used by the Rust/Tauri runtime, not fingerprinting or external files.
- Retain card-art generation records and review regenerated dependency notices
  whenever dependencies change; see `THIRD_PARTY_NOTICES.md`.

## Final TestFlight Check

This is a release safety check, not a request to recruit a testing community.
Martin can test through an internal group using an eligible App Store Connect
account. Browser testing and direct Xcode installs do not exercise Apple's
distribution of the exact submitted build.

1. In App Store Connect, open `com.martin.barbu` and locate the new version `1.0.4`,
   build 5 once uploaded. Do not select rejected build 4. Future candidates
   must use an unused higher build number and normal App Store distribution,
   not "TestFlight Internal Only" (which cannot be submitted to customers).
2. Wait for build processing and resolve any export-compliance questions or
   processing warnings in App Store Connect.
3. Open Barbu > TestFlight > Internal Testing > +. Create a group, choose
   Invite Testers to add your eligible account, then Add Builds to select the
   uploaded version.
4. Install Apple's TestFlight on your iPhone, accept the invitation, and install
   Barbu. Confirm the version/build number matches the build selected above.
   Back up any irreplaceable local progress before replacing a development copy;
   do not uninstall it just to perform an upgrade check.
5. Run the checks below. Record the build number, device/iOS version, and any
   failures. Rebuild and repeat affected checks if a fix is needed, then select
   the tested build for App Review.

| Check | Expected result |
| --- | --- |
| Cold launch in airplane mode | Catalog and cards load without the Mac or a dev server. |
| Catalog | Seven working entries; no Canasta, planned games, paid labels, or Pro tab. |
| Each game: Learn, Play | A guided lesson and topic exercise complete in Learn; a hand starts in Play and cards are selectable. |
| Complete a hand and a game/session | Correct result appears and the next action remains reachable. |
| Background, close, reopen | Saved play resumes without losing or duplicating cards. |
| Small screen and landscape | Cards, feedback, and bottom actions remain reachable without overlap. |
| Privacy link, online | The public policy opens successfully. |

For this release, the seven catalog entries are Hearts, Whist, Spades, Bridge,
Barbu, Gin Rummy, and Card Counting I. Card Counting I has Learn and Play, not a separate
Practice tab. Check its memory exercises through Play.

[Apple's internal testing instructions](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)

## App Store Connect

- Create or confirm the iOS record for `com.martin.barbu` in the correct team.
- Complete agreements, contact details, and EU trader status as the account owner.
- Set price and availability explicitly; do not assume Google Play settings carry
  over. Decide whether the approved release should publish automatically.
- Supply iPhone screenshots from the actual iOS experience at Apple's accepted
  sizes. This release does not require a native iPad screenshot set.
- Publish the updated privacy page before submission:
  https://martingull.github.io/barbu/privacy-policy.html
- Publish `docs/support.html`, then verify and use
  https://martingull.github.io/barbu/support.html as the Support URL.
  The confirmed public contact is martin@insilicoveritas.org.
- Review App Privacy against the shipped binary. Current Barbu code has no
  account, advertising, tracking, or analytics SDK and keeps progress locally.
  Answer the questionnaire yourself, including any separately collected data.
- Complete age rating honestly: ordinary card games, no real-money wagering.
  Do not describe the product as a casino or invent a rating before completing
  Apple's questionnaire.
- Complete encryption export questions. There is no custom encryption feature
  in Barbu; confirm the platform/dependency exemption applies before declaring it.
- Add the processed build, review notes, screenshots, and metadata; submit to
  App Review. Uploading a build alone does not submit or publish it.

## Listing Draft

Name: Barbu - The king of cards

Version: 1.0.4 (match the selected release build)

Subtitle: Learn classic card games

Category: Games / Card

Keywords: hearts,spades,whist,bridge,tricks,bidding,lessons,practice,offline

Description:

Learn and practise classic card games at Barbu's table. Explore Hearts, Spades,
Whist, Bridge, Barbu, and Gin Rummy with short lessons, card decisions, and local games
against computer opponents.

Build your understanding of following suit, bidding, taking tricks, and scoring.
Practise individual ideas, then put them to work in a game. Keep your progress
and return to saved hands on your iPhone, without creating an account.

Barbu is a solo learning and practice table. It does not offer online multiplayer
or real-money gambling.

Review notes:

No account or login is required. Open a game from the catalog, then choose Learn
or Play. Learn includes guided lessons and short exercises. Gameplay and saved progress work locally; no development
server is required. There are no purchases or advertisements in this release.

## References

- [Tauri App Store distribution](https://v2.tauri.app/distribute/app-store/)
- [Apple submission steps](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)

Apple review determines publication timing. Submission today does not guarantee
that Barbu will be live today.
