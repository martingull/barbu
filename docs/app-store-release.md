# iPhone App Store Release

The first Apple release targets iPhone only. Device installs are not App Store
packages. Do not upload the IPA produced by `ios:install:device`.

## Current Status (September 14, 2026)

Barbu 1.0.1, build 2 archives successfully with Xcode 26.5. The archive has
`UIDeviceFamily = [1]` and the privacy manifest. All 18 generated icon images
are opaque, including the 1024-pixel store icon.

App Store export is blocked, not complete. Apple's response for team
`3PB43Q6B3W` was "No provider associated with App Store Connect user", followed
by no permission to create iOS App Store provisioning profiles. Confirm active
Developer Program membership, the correct team/account in Xcode, and App Store
Connect access before retrying. No build has been uploaded or submitted.

Store screenshots, account declarations, and final TestFlight testing remain
outstanding. The updated privacy page is publicly reachable. Martin confirmed
that the card artwork was generated using ChatGPT; provenance is recorded in
`THIRD_PARTY_NOTICES.md`. Browser checks are not a substitute for the final
uploaded-build TestFlight check below.

## Build

Requirements: paid Apple Developer membership, Xcode with the developer account
signed in, Rust iOS target, Node dependencies, Task, Ruby, and XcodeGen.

```sh
task ios:init # Only when src-tauri/gen/apple is missing.
task verify
task ios:store:build IOS_BUILD_NUMBER=2
```

Use a new build number for each upload; check App Store Connect before choosing
it. The marketing version comes from `src-tauri/tauri.conf.json`. The build number
override is iOS-only and does not alter Android's release version.

The preparation task derives a project from Tauri's generated XcodeGen template,
sets the iPhone device family, disables script sandboxing for the Rust build,
bundles the privacy manifest, and removes alpha channels from generated iOS
icons. Generated projects and signing material must not be committed.

Only after a successful App Store export, upload:

`src-tauri/gen/apple/build/arm64/Barbu.ipa`

An older IPA can remain there after a failed build. Check the command result and
the build number inside the archive before uploading. Use Transporter or Xcode's
Organizer to validate and upload using the developer account. Wait for processing
and check App Store Connect's build warnings before selecting the build.

## Release Checks

- Check `UIDeviceFamily` is `[1]` in the archived Barbu.app/Info.plist.
- Confirm the archive has the intended version and build number, an opaque
  1024-pixel icon, and a root-level `PrivacyInfo.xcprivacy`.
- Confirm distribution export succeeds and the exported app's `get-task-allow`
  entitlement is false. An archive signed for development is not the final IPA.
- Test the uploaded build through TestFlight: cold launch without a dev server,
  offline play, all five game tables, Learn, Practice, saved-hand resume, and a
  completed game. Check both a compact iPhone viewport and a current iPhone.
- Check the privacy manifest against the release binary whenever dependencies
  change. The file-timestamp declaration (`C617.1`) covers bundled/private file
  metadata used by the Rust/Tauri runtime, not fingerprinting or external files.
- Retain card-art generation records and complete the dependency-license review
  recorded in `THIRD_PARTY_NOTICES.md` before making content-rights declarations.

## Final TestFlight Check

This is a release safety check, not a request to recruit a testing community.
Martin can test through an internal group using an eligible App Store Connect
account. Browser testing and direct Xcode installs do not exercise Apple's
distribution of the exact submitted build.

1. Resolve the Apple account/signing blocker above. Build and upload the updated
   release using normal App Store distribution, not "TestFlight Internal Only"
   (that upload option cannot be submitted to customers).
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
| Catalog | Six working entries; no planned games, paid labels, or Pro tab. |
| Each game: Learn, Practice, Play | A lesson and exercise complete; a hand starts and cards are selectable. |
| Complete a hand and a game/session | Correct result appears and the next action remains reachable. |
| Background, close, reopen | Saved play resumes without losing or duplicating cards. |
| Small screen and landscape | Cards, feedback, and bottom actions remain reachable without overlap. |
| Privacy link, online | The public policy opens successfully. |

For this release, the six catalog entries are Hearts, Whist, Spades, Bridge,
Barbu, and Card Counting I. Card Counting I has Learn and Play, not a separate
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
- Provide a support URL. The existing public issue tracker is
  https://github.com/martingull/barbu/issues; confirm this is the intended channel.
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

Name: Barbu (subject to availability)

Subtitle: Learn classic card games

Category: Games / Card

Keywords: hearts,spades,whist,bridge,tricks,bidding,lessons,practice,offline

Description:

Learn and practise classic card games at Barbu's table. Explore Hearts, Spades,
Whist, Bridge, and Barbu with short lessons, card decisions, and local games
against computer opponents.

Build your understanding of following suit, bidding, taking tricks, and scoring.
Practise individual ideas, then put them to work in a game. Keep your progress
and return to saved hands on your iPhone, without creating an account.

Barbu is a solo learning and practice table. It does not offer online multiplayer
or real-money gambling.

Review notes:

No account or login is required. Open a game from the catalog, then choose Learn,
Practice, or Play. Gameplay and saved progress work locally; no development
server is required. There are no purchases or advertisements in this release.

## References

- [Tauri App Store distribution](https://v2.tauri.app/distribute/app-store/)
- [Apple submission steps](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)

Apple review determines publication timing. Submission today does not guarantee
that Barbu will be live today.
