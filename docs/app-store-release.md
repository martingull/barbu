# iPhone App Store Release

The first Apple release targets iPhone only. Device installs are not App Store
packages. Do not upload the IPA produced by `ios:install:device`.

## Current Candidate (October 1, 2026)

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
task ios:store:build IOS_BUILD_NUMBER=6 # Next candidate; confirm this number is unused before upload.
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
