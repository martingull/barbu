# Google Play Closed Testing

## Current Status

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
