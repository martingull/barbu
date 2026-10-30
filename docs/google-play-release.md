# Google Play Releases

## Current Status

The October 30 rebuilt candidate is version `1.0.5`, Android code `1000006`. Martin
reconfirmed `1000005` is the highest uploaded code and that Google granted
production access. This candidate is for the existing closed-testing track;
production publication is deliberately on hold for further polish. No upload
or rollout of `1000006` has been performed or verified yet.

The rebuilt AAB includes the browser audit's Bridge contract/trump context and
bidding shape fixes. Its signature and package checks passed. The older candidate
and matching verification files are archived under the ignored
`release/google-play/superseded-before-oct30-browser-fixes/` directory.
The current Google CLI token lacks the Android Publisher OAuth scope, so direct
API upload is not configured. Upload through the existing closed-testing track
in Play Console; do not publish to production yet.

The candidate includes the shared learning and guided-hand improvements across
Hearts, Gin Rummy, Spades, Whist, Bridge and Barbu. Community/club discovery is
not included in this packaged candidate. The subsequent catalog Share Barbu
and external Maps-search changes are source-only and require a new build and
native handoff check before release. If `1000006` has been uploaded by then,
the next bundle must use a higher code. Package verification and remaining release
checks are recorded below.

## Previous Release

The October 1 candidate is version `1.0.4`, Android code `1000005`. Martin
confirmed the highest uploaded code is `1000004` or lower. Play Console was
checked directly: the existing closed-testing track currently serves `1.0.2`
(`1000003`). The new signed bundle passed local package verification. Martin
uploaded it and submitted the closed-test update; Play Console was checked and
shows `1.0.4 (1000005)` under Changes in review, with preliminary checks running.
Managed publishing is off. Availability of the new version to testers is not
yet confirmed.

The saved September 18 AAB (`1.0.2` / `1000003`) is a pre-migration candidate,
not a build of the current TypeScript engines. Its verification results below
are historical. Do not upload it when releasing the migration.

Every candidate needs matching symbols, mapping, checksum and verification
records. Confirm live rollout status in Play Console; local artifacts alone do
not establish whether a release is available to testers.

The September 22 migration build was installed and launched on iPhone 16.
That does not verify the Android package or a Google Play saved-game upgrade.

## Repository Boundaries

- Keep this runbook in Git; keep packages, symbols and signing material under
  the ignored `release/google-play/` directory.
- `src-tauri/gen/android/` is ignored generated output, matching the iOS project
  policy. Ignoring it does not delete the existing project or local builds.
- Keep shared settings in `src-tauri/tauri.conf.json`, Android build hooks in
  `src-tauri/tauri.android.conf.json`, the native activity in
  `src-tauri/android/MainActivity.kt`, and launcher artwork in
  `src-tauri/icons/android/`. Never move those source files into the ignored tree.
- After `npm run tauri -- android init` generates a project, apply the Gradle
  overrides listed below and run `task android:prepare`. The Gradle overrides
  currently require manual reapplication; initialization alone is not a release
  build setup. Do not regenerate a working project merely to tidy Git status.
- Never commit upload keystores, passwords, local SDK paths or signing-property
  files. Review explicitly staged files before committing release work.

The Android activity reserves system-bar and display-cutout space around the
WebView, then zeros those handled insets before forwarding them. This prevents
status-bar collisions and double padding while retaining keyboard inset updates.
Native Android does not add the browser's legacy 48px navigation allowance.
Build and dev hooks sync the tracked activity and icons automatically. This follows
[Android's WebView inset guidance](https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets).

## September 18, 2026 Update

- Package: `com.martin.barbu`.
- Candidate: version `1.0.2`, version code `1000003`.
- Closed-test version code at that time: `1000000`, confirmed by Martin.
- Keep the existing closed-testing track, tester group, and opt-in link.
- Upload and rollout must be confirmed in Play Console. Building locally does
  not publish an update. The Google CLI login checked then lacked the Android Publisher
  OAuth scope.

## Build And Verify

Run `task verify` before packaging. Avoid running native compilation alongside
the browser suite on a busy machine: the long multi-hand and viewport tests can
exceed their 30-second timeout. Investigate and rerun any failures in isolation.

On macOS, keep the lid open and prevent idle sleep during long browser runs:
`caffeinate -di task ui:test`. The sleep assertion ends with the command; it
does not change system settings. If a run spans a sleep/wake event, preserve
the failure logs and rerun every affected case while awake rather than raising
timeouts or marking the interrupted run as passed.

The current generated Android project uses Gradle 8.14.3. Use the installed
Java 21 runtime, not Android Studio's Java 25 runtime. On this Mac:

```sh
task android:prepare
env PATH=/opt/homebrew/opt/rustup/bin:$PATH \
  JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  ANDROID_HOME=/Users/martin/Library/Android/sdk \
  NDK_HOME=/Users/martin/Library/Android/sdk/ndk/26.1.10909125 \
  CARGO_PROFILE_RELEASE_DEBUG=1 \
  RUSTFLAGS='-C link-arg=-Wl,-z,max-page-size=16384 -C link-arg=-Wl,-z,common-page-size=16384 -C link-arg=-Wl,--build-id=sha1' \
  npm run tauri -- android build --aab --ci
```

The generated `app/build.gradle.kts` also needs
`ndkVersion = "26.1.10909125"` inside `android` to match the installed NDK,
`ndk.debugSymbolLevel = "FULL"` inside the release build type, and this
release-only packaging override (reapply after regenerating Android):

```kotlin
androidComponents {
    onVariants(selector().withBuildType("release")) { variant ->
        variant.packaging.jniLibs.keepDebugSymbols.set(emptySet())
    }
}
```

This avoids the generated debug configuration retaining native symbols in the
release download. Gradle stores separate symbol metadata in the AAB; verify
that it is present and that native libraries have matching GNU build IDs.

Check the NDK selected in the Tauri build log, rather than assuming `NDK_HOME`
controls it. The September 22 build selected NDK `27.1.12297006` for Rust while
Gradle used its pinned `26.1.10909125` tools. Verify final packaged library
alignment and symbol/build-ID matching after both stages.

Sign the release AAB with the existing upload key, never a newly generated key
or the Android debug key. Keep credentials out of commands, logs, and Git; pass
passwords through the signing tool's environment/file support.

Before upload, check the bundle with Google's bundletool, verify its signature
against the previous release, inspect its manifest version and SDK settings,
and check native-library LOAD and RELRO alignment. Package native symbols from
the same build and retain the R8 mapping. Never reuse symbols from an older AAB.

Release bundles, symbols, signing material, and release notes live in the ignored
`release/google-play/` directory. Do not commit them or generated Android files.

## Publish The Update

1. Open Barbu in Play Console, then Testing > Closed testing > the existing track.
2. Create a release and upload the newly built and verified candidate AAB, not
   the archived September 18 package when publishing the migration.
3. Add the accompanying release notes. Native debug symbols and R8 mapping are
   embedded in the AAB; retain their separate files as backups.
4. Review warnings, confirm the new candidate's version code, and submit the changes.
   If managed publishing is enabled, publish approved changes separately.
5. Confirm the new release is available to the existing testers. Do not select
   Production. Preserve existing tester groups; only add groups with explicit
   approval. On October 1, Martin approved adding `kingofcards@googlegroups.com`
   alongside `testers-community@googlegroups.com`; both entries were verified
   after saving. The additional group was then included in Changes in review.

## Candidate Verification

### October 30: Rebuilt 1.0.5 / 1000006 (Testing Only)

Candidate: `release/google-play/barbu-google-play-v1.0.5-code1000006.aab`.
Size: `129421710` bytes. SHA-256:
`0bbf7f82629df6359e43cbeae4b5799393f561eff2bdb911bf9f232f6f592d98`.

Built from the verified working tree including the Bridge browser fixes below.
Signed with the existing upload key; certificate matches the previous release.
Bundletool 1.18.1 validation passed: package `com.martin.barbu`, version
`1.0.5` / `1000006`, minimum SDK 24 and target SDK 36. All four native libraries
are stripped, have matching full debug-symbol build IDs, and pass 16 KB LOAD
and RELRO alignment checks. Bundle configuration specifies `PAGE_ALIGNMENT_16K`.
Matching symbols, embedded R8 mapping, release notes and the refreshed
`verification-v1.0.5-code1000006.json` accompany the AAB.

No upload or rollout has been verified. A Play-signed physical-device upgrade
and the Play pre-launch report remain release gates before production.

### October 30: Browser Reverification

The previous edits were intact. A fresh six-profile `task ui:test` run finished
with 2432 passed, 16 timeouts and 72 existing conditional skips. macOS power
logs confirmed sleep periods matching two clusters of eight interrupted workers:
11:40:43-11:57:30 and 11:59:05-12:09:05, Europe/Oslo. All 16 affected cases
then passed three separate awake reruns (48 passes), with unchanged source,
assertions and timeouts. This is a recovered interrupted run, not a claim that
the initial run had zero failures. All 2448 active cases passed across the run
and its rechecks; the S9 profile passed all 413 active cases on the initial run.

Fresh `task domain:test` passed 222 tests; `task build` and `task tauri:check`
passed. A separate preview server serving the built `dist/` files passed 26
targeted browser checks on iPhone 16/WebKit and Galaxy S9/Chromium, including
Bridge image rendering, contract/bidding context, mistake recovery, Hearts
progression and Domino guided-hand entry.

Logs, the original interrupted-test IDs, sleep/wake evidence, rerun results
and production screenshots are under the ignored
`release/google-play/browser-audit-2026-10-30/` directory. No gameplay or test
assertion changes were needed during this recheck. This does not verify a
physical-device upgrade. The subsequent AAB rebuild is recorded above.

### October 29: 1.0.5 / 1000006 (Superseded)

Candidate: `release/google-play/barbu-google-play-v1.0.5-code1000006.aab`.
Source: `f58b02f` plus the release version changes. No gameplay changes were
made during packaging. Martin confirmed the highest uploaded code is `1000005`.

Size: `129422825` bytes. SHA-256:
`922281e8b52cf6701d056f9557ea32b78483bb41dd3ac975ff9e38968dbeb2c3`.

Verified package `com.martin.barbu`, version `1.0.5` / `1000006`, minimum SDK
24 and target SDK 36. The signed AAB passes bundletool 1.18.1 validation and
signature verification against the previous release's upload certificate.
All four native libraries are stripped, have matching full debug-symbol build
IDs, and have 16 KB LOAD alignment and aligned RELRO ends. Bundle configuration
requests `PAGE_ALIGNMENT_16K`. This is package verification, not a 16 KB device
runtime test. Tauri selected NDK 27.1.12297006; Gradle retains its NDK 26 pin.

Matching symbols, the embedded R8 mapping, release notes, signature output,
browser test log and `verification-v1.0.5-code1000006.json` are preserved beside
the AAB. Symbols and mapping are also embedded in the AAB.

Initial packaging checks: 221 domain tests, frontend build and `task tauri:check`
passed, but the Galaxy S9 browser run had 21 failures. The initial full matrix
was interrupted after failures. Those results did not establish release readiness.

The subsequent browser repair audit passed **2448 tests with zero failures**
across all six phone profiles (`task ui:test`, 23 minutes). The 72 existing skips
cover hidden Canasta and viewport checks that run only in the Galaxy S9 project;
no skips were added by the repair. The S9 project passed all 413 active tests.
The updated domain suite passed 222 tests, and `task build` passed with the
existing JavaScript chunk-size warning.

The repair restores Bridge's always-visible contract/trump context and bidding
hand shape. Tests now follow current learning menus, Hearts' five decisions,
Domino's guided-hand entry, detailed reviews and bounded reinforcement examples.
The Bridge image check waits for images to load after transitions instead of
reading `naturalWidth` immediately. WebKit and Chromium guided-hand tests pass.
Browser screenshots and audit logs are saved under the ignored
`release/google-play/browser-audit-2026-10-29/` directory.

These results apply to the working tree, not the older AAB above. Before upload:

- Rebuild the bundle with the browser fixes and regenerate its matching symbols,
  mapping, checksum and verification record. The version code can remain
  `1000006` only while it has not been uploaded.
- Test a Play-signed upgrade on a physical phone without uninstalling or
  clearing saved games/progress.
- Inspect the Play pre-launch report and manually check small-screen learning,
  guided hands, offline startup and resume before considering production.

No upload, phone installation or production rollout was performed for this
candidate. Keep it in testing while these checks are outstanding.

### October 1: 1.0.4 / 1000005

Candidate: `release/google-play/barbu-google-play-v1.0.4-code1000005.aab`.
Size: `116773789` bytes. SHA-256:
`ed6c0e79040a97452e682592dcb50b706f7d11abd15444002764f7be9774c159`.

Verified package `com.martin.barbu`, target SDK 36, version name/code, existing
upload certificate, bundletool validation, stripped native libraries, matching
debug-symbol build IDs for all four ABIs, embedded R8 mapping, and 16 KB
LOAD/RELRO and bundle alignment. Matching symbols, mapping, release notes and
`verification-v1.0.4-code1000005.json` are preserved beside the bundle.

All 178 domain tests passed. The focused Galaxy S9 browser checks passed all
47 selected tests after correcting stale headings and completion labels in
four assertions and rerunning the affected files. The frontend production
build and native Android build succeeded. This is not a fresh full-browser
matrix run, a Play-signed upgrade test, or a 16 KB runtime test.

Source: `8a45373` plus the recorded working-tree release, Android inset and
test-label changes. Signing credentials and generated packages remain ignored.

An APK generated from this AAB, signed with the S9's existing local debug key,
was installed with `adb install -r` on the physical Samsung Galaxy S9. Installed
version `1.0.4` / `1000005` and successful cold launch were verified. The saved
Gin Rummy hand and completed Hearts introduction remained visible; recent
Barbu process logs showed no crash or uncaught-error matches. This does not
verify a Google Play app-signing-key upgrade.

The upload-key-signed APK also updated and cold-launched on the Android emulator;
the catalog rendered and its saved Hearts hand remained visible. These launch
checks supplement the automated tests, not a complete physical-device playthrough.

### September 22: 1.0.3 / 1000004

The corrected AAB is `115607395` bytes. SHA-256:
`eb5e7083517d9bf22eebffe185ba8ff12ca9d262c3c35fd7347b98df003088c4`.
It passed bundletool validation, signature verification against the existing
upload certificate, manifest checks, stripped-library checks, native build-ID
and symbol matching for all four ABIs, R8 mapping matching and 16 KB LOAD/RELRO
and bundle alignment checks. All packaged libraries match the current build
outputs and differ from the September 18 pre-migration candidate.

All 95 domain tests, native check and frontend build passed. The complete
six-profile browser run had 1038 passes and 30 intentional profile-specific
skips, with no failures. The initial packaged emulator check found a system-bar
overlap that browser tests cannot model. After fixing native inset ownership,
the full S9 suite passed all 180 tests and the cross-profile inset/privacy suite
passed all 30 checks. The corrected Android bundle was rebuilt and reverified.

APKs generated from the corrected signed AAB were installed on the Android
API 35 emulator (4 KB pages). Screenshots confirmed that the status bar and both
gesture and three-button navigation stay outside the game controls. Hearts
passing, legal card play, offline cold start and saved-trick resume passed.
The privacy link activated through keyboard focus and launched Chrome's first-run
activity; browser setup was not completed, so page loading there remains unchecked.
The emulator's navigation and network settings were restored. A physical
Play-installed upgrade and a 16 KB runtime still need device testing.

Source provenance, native build IDs and companion-file checksums are recorded in
`verification-v1.0.3-code1000004.json`. The source is merge commit `57d4714` plus
the recorded uncommitted release-version and native-inset changes. The first
local AAB is preserved under `superseded-before-android-insets/`, explicitly
marked not for upload. No candidate from this work has been uploaded.

### September 18: 1.0.2 / 1000003 (Historical)

The September 18 candidate passed bundletool validation and signature checks
against the existing upload certificate. All four Android ABIs have stripped
release libraries, matching embedded debug symbols and GNU build IDs, and
16 KB LOAD/RELRO alignment. The bundle requests 16 KB native-library alignment
and contains the matching R8 mapping.

Automated checks: 183 Rust tests passed; Tauri check and frontend build passed.
The browser suite had 710 passes, 20 skips, and two timeouts while native builds
were running. Both timed-out tests passed when rerun with one worker.
No physical Android device was connected for upgrade verification.

The artifact checksum and library build IDs are recorded alongside the bundle
in `verification-v1.0.2-code1000003.json`. These checks do not establish Play
Console acceptance or tester availability; upload and rollout remain pending.

## Try It Yourself

After rollout, update Barbu through Google Play using an opted-in tester account.
Do not uninstall the previous Play version: verify that saved play survives the
upgrade. Open Hearts > Play and Bridge > Play, check card selection and the bottom
controls on a small screen, then open the catalog's Privacy policy link online.
Also cold-launch in airplane mode and confirm cards and local gameplay load.

An upload-key-signed local APK may not update a Play-installed copy because Play
App Signing uses a separate app-signing key. Use the Play update for this check.

References:
- [Google Play releases](https://support.google.com/googleplay/android-developer/answer/9859348)
- [Tauri Google Play builds](https://v2.tauri.app/distribute/google-play/)
- [Native debug symbols](https://developer.android.com/build/include-native-symbols)
- [16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
