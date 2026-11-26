# Google Play Releases

## Current Status

**November 26 production-submission audit:** Martin uploaded **1.0.11 / 1000015**
directly to production. The Publisher API confirms the release name and notes,
and the uploaded AAB's SHA-256 matches the verified local candidate exactly.
Closed testing (`alpha`) remains on **1.0.10 / 1000014**.

Console Publishing overview shows the production release plus both English
listing changes under **Changes in review**, with automated quick checks still
running. No unsent section is shown. The name is **Learn Card Games by Barbu**;
the short description is **Learn Gin Rummy, Hearts and Whist with short lessons
and guided hands.** They are separate change rows, not duplicate releases.
The desired final state is present; the discarded item's history was not verified.

Managed publishing is **off**, with **Start full rollout** requested. This is
not a manual publishing hold: approval can publish it automatically. The API's
release-lifecycle endpoint remains quota-blocked, so generic track `completed`
must not be described as proof that `1000015` is live. The earlier audit below
is the last confirmed publication state. No release or listing was changed by
this inspection; its temporary API edit was deleted.

Exact-candidate Play-installed Samsung upgrade, saved-game and native Premium
restore checks remain unrecorded, and the candidate's pre-launch report is not
yet verified. Current full-description copy does not list Belote, Euchre or
Cribbage; that is a later metadata improvement, not a reason to silently cancel
this review. Evidence is ignored under
`release/google-play/production-audit-2026-11-26/`.

### Preparation Audit

**November 26 release preparation:** a read-only Publisher API inspection confirms
**1.0.10 / 1000014 PUBLISHED** on both production and closed testing (`alpha`).
The highest visible version code is `1000014`. The inspection edit was deleted;
no upload, rollout, review, price or country setting was changed.

The next Android candidate is **1.0.11 / 1000015**, matching the product version
already used for the internal iOS preview. It adds free Belote, Premium Euchre
and Cribbage, selectable Gin Rummy scoring profiles and the expanded Spades
lessons. Existing free games stay free. The signed local bundle and browser
checks are complete; [the candidate handoff](#prepared-1011-candidate) records
the artifacts and outstanding checks. Preparation did not upload it; Martin's
subsequent production upload is recorded above, with approval still pending.
No Android device was connected during preparation. Exact-candidate Play upgrade,
native checkout/restore and pre-launch report checks remain release gates.

### Prepared 1.0.11 Candidate

Prepared November 26 from `f4cf756` and the recorded working tree, with billing
enabled through the existing local configuration. Production-source fingerprints
and build-input hashes are preserved in the verification receipt. The unrelated
marketing and roadmap edits were left intact; this is not a clean-commit claim.

- Release name: **1.0.11 - More games for your table**.
- Bundle: `release/google-play/barbu-google-play-v1.0.11-code1000015.aab`.
- Verification: `release/google-play/verification-v1.0.11-code1000015.json`.
- Notes: `release/google-play/release-notes-v1.0.11-code1000015.txt` (370 characters, excluding the trailing newline).
- Symbols: `release/google-play/native-debug-symbols-v1.0.11-code1000015.zip`.
- Mapping: `release/google-play/mapping-v1.0.11-code1000015.txt`.
- SHA-256: `8d4cfe59ef2d44af29854405967919076a211cd0c99cbca74788da755e4a6b17`.

Verification completed:

- 394 domain tests, frontend build, Tauri shell check, 17 release-tool tests and five mobile-configuration tests passed.
- Regular browser audit on iPhone XR WebKit and Galaxy S9-sized Chromium: 976 passed initially, 64 failed, 66 skipped. After fixture corrections, all 64 failed cases passed on rerun. The six-project matrix was not run.
- Corrections cover the eight-game free catalog, native mocks that must allow billing availability while still rejecting gameplay commands, and waiting for Belote images to load. Two initial timing failures also passed on rerun; no production gameplay change was needed.
- 58 production-built catalog, Belote, Gin scoring and Premium checks passed, plus four new checks proving Euchre/Cribbage learning and saved play open with verified mock Premium access and no preview flags. These do not prove real store checkout.
- The regular run skips preview-only Canasta/iOS flows and duplicate viewport cases by configuration. The dedicated preview matrices were not rerun for this candidate.
- Signing certificate matches `1000014`; bundletool validation, R8 mapping, full matching debug symbols, stripped libraries and 16 KB LOAD/RELRO alignment passed for all four ABIs. Physical 16 KB runtime testing is still pending.
- Public privacy, terms and support links returned HTTP 200; both legal pages matched repository source. Belote play and Cribbage lesson screenshots were visually inspected at narrow phone sizes.

Evidence is ignored under `release/google-play/release-1.0.11/`. The read-only
upload preview passed local candidate checks but could not complete Play
inspection: Google's release-listing endpoint returned **HTTP 403: Listing
releases quota exceeded**. No bundle upload or edit commit was attempted. Repeat
the normal preview against fresh Play state before approving an upload; do not
bypass the existing-release safeguards or infer eligibility from the old snapshot.

The intended next gates at preparation were a closed-test upload with approval, Play-installed Samsung upgrade,
saved-game and lesson smoke tests, native Premium access/restore verification,
and the candidate's pre-launch report. Current store copy/screenshots must also
be checked against eight free tables and three Premium games before promotion.
Martin subsequently uploaded directly to production as recorded above; that does
not complete the native acceptance checks. Do not change prices or subscription
markets merely to prepare or inspect a release.
Apple's internal `1.0.11 (10)` build is unchanged and does not include Belote.

### Earlier Release Evidence

**November 23 recorded audit:** the read-only Publisher API check documented in
the [discovery baseline](marketing/store-discovery.md) found **1.0.9 / 1000013
PUBLISHED** and **1.0.10 / 1000014 IN_REVIEW** on production. This supersedes the
earlier preparation/upload status below. Subsequent Euchre source changes are
not included in the signed `1000014` artifact; use a higher version code and
rebuild and verify a new candidate before uploading them. Committing this source
does not change the current review or replace the prepared bundle.

**November 21 preparation:** signed **1.0.10 / 1000014** is ready locally for
closed testing, including both named Bridge bidding profiles and the tighter
system-selector layout. It has **not been uploaded**. The read-only Publisher
API check before preparation confirmed the highest visible code was `1000013`,
published on `alpha` and still in production review. That review, the previous
bundle, store settings and subscription products were left unchanged. See the
[new candidate](#prepared-1010-candidate) for artifacts and verification.

**November 19 production-queue audit:** the Publisher API confirms `1.0.9` /
`1000013` is **IN_REVIEW** on production and **PUBLISHED** on closed testing
(`alpha`). The queued bundle's SHA-256 matches the signed local artifact below.
Production's previously published `1.0.6` / `1000007` remains live during review.
The generic track status `completed` does not establish publication; use the
separate release lifecycle. The temporary inspection edit was deleted without
committing; no release, product or review setting was changed by this audit.

Console Publishing overview shows only **Production: 1.0.9 - Clearer learning
and simpler Premium / Start full rollout** in review, with **managed publishing
off**. Approval can therefore publish the full rollout automatically; this is
not a staged launch or manual publishing hold. Policy status shows **No issues
found**. Preserve all earlier artifacts and verification records.

The signed bundle, production-source fingerprint and recorded build inputs still
match. All public privacy, terms and support pages returned HTTP 200 and matched
the billing-aware source. The audit reran 17 release-tool tests, five mobile
configuration tests and 40 focused Premium/catalog/privacy browser cases; all
passed. Earlier package, 301 domain and 510 selected browser checks remain the
preparation evidence below, not newly repeated full-suite or device tests.

Later on November 19, the internal iOS TestFlight preparation refreshed the two
lockfile-hash headers in `public/THIRD_PARTY_LICENSES.txt`. The working tree
therefore no longer exactly matches the Android source fingerprint checked
above. The queued AAB, its checksum, original receipt and production review were
left unchanged; do not restamp that receipt using the later iOS tree.

Monthly and yearly base plans are active, with checkout enabled in **Norway,
the UK and the US** following Martin's November 21 approval.
The November 21 pricing update lowered Norway to NOK 10/month and NOK 59/year,
and lowered all other existing regional prices; see
[the current regional prices](premium-launch.md#launch-markets). The Netherlands
remains disabled. The subsequent GB/US activation changed only subscription
availability: API readback confirms production `1000013` is still in review,
`1000007` remains published, and closed-test `1000013` is still published.
Existing subscriber cohorts, free-download distribution and release artifacts
were unchanged. Native UK/US checkout and restore are not yet verified.
The main listing still describes the free catalog and does not mention Canasta
Premium; a paid-content listing draft exists, but was not submitted during review.

**Remaining verification gaps:** Console's pre-launch overview currently shows
**Upload artifacts to generate pre-launch reports**, not a report for `1000013`.
That is not proof of a clean report or a known crash. Its settings were inspected
without saving changes. No Android device was connected, so the exact candidate's
Play-installed upgrade and native subscription lifecycle checks remain unverified
in our record. Earlier monthly sandbox results on `1000010` do not pass the yearly,
restore, renewal/expiry or offline checks for `1000013`. Bank/payout status was not
re-read in this audit. The release source changes remain uncommitted; the preserved
fingerprint identifies the actual packaged tree. Commit them before further work.

Read-only API, Console, legal-page and browser evidence is ignored under
`release/google-play/production-audit-2026-11-19/`. Do not cancel or resubmit the
review merely to tidy an empty alpha draft, replace screenshots or change copy.

### Prepared 1.0.10 Candidate

The November 21 preparation produced **1.0.10 / 1000014**, based on `00f9add`
plus the synchronized release-version changes and refreshed dependency-notice
hashes. This records the source at preparation time, before the later Euchre work.
The signed source fingerprint and build inputs are preserved in the verification
record. This is a closed-testing candidate, not a production release.

- Release name: **1.0.10 - Better Bridge bidding**.
- Bundle: `release/google-play/barbu-google-play-v1.0.10-code1000014.aab`.
- Verification: `release/google-play/verification-v1.0.10-code1000014.json`.
- Notes: `release/google-play/release-notes-v1.0.10-code1000014.txt` (406 characters, excluding the trailing newline).
- Symbols: `release/google-play/native-debug-symbols-v1.0.10-code1000014.zip`.
- Mapping: `release/google-play/mapping-v1.0.10-code1000014.txt`.
- SHA-256: `5bc822e7647bd0e7f2cdbfe4ea12bfe02585dfce60f538124496691b96ef02f3`.

This candidate adds Standard American Foundation and Acol Foundation, original
system-specific lessons, Stayman, American major-suit transfers and contextual
auction explanations. The American path has ten topics; existing boards retain
their original bidding agreements. These are bounded teaching profiles, not
complete SAYC or every club's Acol agreement. Canasta Premium and the seven free
tables retain the existing centralized access policy.

Release notes:

```text
New Bridge bidding choices: Standard American Foundation and Acol Foundation, with lessons matched to each system.
Learn Stayman, Jacoby transfers and notrump rebids, with clearer auction explanations.
Existing Bridge saves keep their original agreements.
Tighter Bridge learning layout. Includes Canasta Premium and the latest learning and gameplay improvements.
The seven existing free games remain free.
```

Verification passed: 317 domain tests, 17 release-tool tests, five mobile-config
tests, `tauri:check`, the production frontend build, 140 focused development
browser checks and 38 repeated checks against the packaged frontend. The latter
cover public-catalog isolation, Premium recovery/restore and the American lesson
path/live transfer. Browser billing is simulated, not a native purchase test.
This is not the complete browser suite or a physical-device acceptance pass.

The upload certificate matches `1000013`. Bundletool validation, stripped native
libraries, matching symbols/build IDs for all four ABIs, R8 mapping, optional
portrait hardware, phone-launcher declarations and static 16 KB LOAD/RELRO and
bundle alignment checks passed. Source and build-input hashes were rechecked;
the previous signed bundle is unchanged. Existing frontend chunk-size and
Java/Gradle deprecation warnings remain non-blocking.

Billing uses the existing ignored Android override; the browser development
unlock is not part of the release. No prices, checkout countries, tester groups,
store listing or review submission were changed. No iOS package was built.
Update the Samsung through the existing closed-testing track after upload and
publication, without uninstalling. Verify saved games, both Bridge systems,
Canasta learning/play and the native license-test subscription lifecycle before
considering production. The existing `1000013` production review was not cancelled
or replaced; no upload or submission was attempted for `1000014`.

### Prepared 1.0.9 Candidate

The November 19 preparation produced **1.0.9** / **1000013**, based on `02dcd78`
plus the current uncommitted Card Counting/template improvements and synchronized
version bump. The verification record captures the production-source fingerprint
and build inputs. No iOS archive or TestFlight upload was prepared.

- Release name: **1.0.9 - Clearer learning and simpler Premium**.
- Bundle: `release/google-play/barbu-google-play-v1.0.9-code1000013.aab`.
- Verification: `release/google-play/verification-v1.0.9-code1000013.json`.
- Notes: `release/google-play/release-notes-v1.0.9-code1000013.txt` (456 characters, excluding the trailing newline).
- Symbols: `release/google-play/native-debug-symbols-v1.0.9-code1000013.zip`.
- Mapping: `release/google-play/mapping-v1.0.9-code1000013.txt`.
- SHA-256: `d666b3143f45503602934d0b1bbd947dc13c790641e4b5bcabba4b505264c630`.
- Package `com.martin.barbu`, minimum SDK 24, target SDK 36; billing enabled only
  through the existing ignored Android override. Prices, checkout markets,
  testers and production distribution are unchanged. The seven free tables
  remain free; the standard configuration still disables billing.

Release notes:

```text
Simpler Premium checkout, with clearer subscription management and purchase help.
Card Counting now has one Learn screen, with each memory exercise listed once and improved feedback for correct answers.
New Gin Rummy lessons explain layoffs, undercuts and scoring after a knock.
Improved Domino opponents make decisions from their own cards and the visible layout.
Includes shared learning and layout improvements. The seven existing free tables stay free.
```

Verification passed: 301 domain tests, 17 release-tool tests, five mobile-config
tests, `tauri:check` and the packaged frontend build. The selected regular browser
run passed 441 cases initially, with 11 failures and six project-specific skips.
Outdated Whist/Bridge content assertions and a short-screen assumption that both
Learn entry buttons fit above the fold were corrected in tests. Guided play must
remain scroll-reachable; in-hand no-overlap and pinned-action checks are unchanged.
All 18 follow-up cases passed, including every earlier failure and the seven-game
navigation test that timed out during concurrent compilation. All 58 Canasta
preview cases passed separately: 510 distinct selected browser cases passed
overall. This is not the entire browser suite or a physical-device acceptance pass.
Card Counting and Premium screenshots were visually inspected at narrow widths.

Packaging verification passed: the existing upload certificate matches `1000012`,
bundletool validation, matching four-ABI debug symbols/build IDs, R8 mapping,
stripped libraries, 16 KB LOAD/RELRO and bundle alignment, optional portrait
hardware and phone-only launcher declarations. Existing non-blocking frontend
chunk-size and Java/Gradle deprecation warnings remain.

**Subsequent status:** Martin uploaded the bundle and promoted it to the production
queue. The audit above confirms it is published to closed testing and in production
review. Do not upload a duplicate or resubmit it. The next acceptance step is a
Play-installed Samsung update without
uninstalling: preserve a saved hand, complete a Learn exercise, open each Card
Counting activity and check Premium/Canasta access using the license-test flow.
Check the pre-launch report before considering production. Device, Play-signed
upgrade and 16 KB runtime checks remain pending for this candidate.

### Prepared 1.0.8 Candidate

The November 19 local preparation produced **1.0.8** / **1000012**, including all
improvements committed through `5e71213` plus the synchronized package/native
version bump. This supersedes local candidate `1000011`; preserve both older
artifacts rather than overwriting or relabelling them.

- Release name: **1.0.8 - Better Whist lessons and Premium recovery**.
- Bundle: `release/google-play/barbu-google-play-v1.0.8-code1000012.aab`.
- Verification: `release/google-play/verification-v1.0.8-code1000012.json`.
- Notes: `release/google-play/release-notes-v1.0.8-code1000012.txt` (428 characters).
- Symbols: `release/google-play/native-debug-symbols-v1.0.8-code1000012.zip`.
- Mapping: `release/google-play/mapping-v1.0.8-code1000012.txt`.
- SHA-256: `68779316afa5760a83f96c79c972e5b18a43bb43641d534e3c76ba819658592c`.
- Package `com.martin.barbu`, minimum SDK 24, target SDK 36; Premium billing enabled
  only through the existing ignored Android override. No product prices, checkout
  regions, testers or distribution settings were changed.

The bundle contains Canasta Premium, the immediate renewal-verification fix,
Whist's distinct foundations and club-format/scoring explanations, optional
portrait hardware and the removal of TV launcher declarations. Existing free
tables stay free. Shared version files now read `1.0.8`; no iOS archive or
TestFlight upload was prepared in this pass.

Verification passed: 290 domain tests; 17 release-tool and five mobile-config
tests; `tauri:check`; the packaged frontend build; and 134 targeted browser checks
across Galaxy S9 / Chromium and iPhone XR / WebKit. The regular run passed 76 and
intentionally skipped 58 preview-only Canasta cases; all 58 then passed through
`task ui:test:canasta`. This is not the complete browser suite or a physical-device
acceptance pass. Signing matches the existing upload certificate; bundletool,
four-ABI symbols/build IDs, R8 map, stripped libraries, 16 KB LOAD/RELRO and bundle
alignment, launcher and optional-portrait checks passed.

The full status read hit HTTP 403 **Listing releases quota exceeded** on the alpha
release-list endpoint. One lightweight bundle-only read then confirmed the highest
uploaded code remains `1000010`; its temporary inspection edit was deleted without
committing. No preview upload, bundle upload, review submission or promotion was
attempted for `1000012`. No production or phone installation was changed.

Martin subsequently reports this version is in closed beta. Next: verify its
remote code/hash and current review state without uploading a duplicate. Once Play makes it
available, update the Samsung without uninstalling; check saved-game continuity,
Whist's first lesson and a Canasta test renewal before production approval.
Annual checkout and the remaining Premium lifecycle gates still apply.

### Earlier 1.0.7 Candidates

**Superseded renewal-fix candidate:** November 19 preparation produced signed
`1.0.7` / `1000011`, named **1.0.7 - Premium renewal fix**. Its bundle is
`release/google-play/barbu-google-play-v1.0.7-code1000011.aab`, with verification,
symbols, mapping and release notes using the same suffix. SHA-256:
`77a5d064c3343a34cd46c459df67946fb0dba843aa4ac944bcd7c0eb22421dda`.
Source fingerprint, upload certificate, bundletool validation, matching four-ABI
symbols/R8 map, 16 KB alignment and phone manifest checks passed. Seventeen
release-tool tests, five mobile-config tests and `tauri:check` passed; the renewal
fix previously passed 289 domain tests and 72 Premium browser checks.

The upload preview then failed reading the Android XR production release list
with HTTP 403 **Listing releases quota exceeded**. The temporary inspection edit
was cleaned up; no bundle was uploaded or release committed. No actual submit was
attempted. Do not remove lifecycle safeguards or retry blindly. This candidate
is superseded by `1000012`; do not upload `1000011` as the latest release.
The candidate is not installed on
the Samsung and is not a production release.

The subsequent Whist content pass changes source after `1000011` was built.
Those lessons are not included in that artifact, and its source fingerprint no
longer matches the current tree. Preserve its signed bundle and verification
record; package current source under a fresh unused code before a latest-source
upload. Do not restamp the older artifact's verification.

ADB confirmed `1000010` on the Galaxy S9, installed by `com.android.vending`.
Martin reports a monthly license-test purchase. Active Premium, successful
restore and Canasta entry access were observed; renewal showed a transient
offers screen. A subsequent RevenueCat sandbox check confirmed renewal at that
boundary and six renewals before final test expiry. Direct Play acknowledgement
and corrected-build device verification remain open. See
[Samsung acceptance](premium-launch.md#samsung-acceptance) for the partial evidence
and remaining production gates. The candidate keeps portrait hardware optional
and removes unintended TV declarations.
The subsequent [renewal-boundary fix](premium-launch.md#renewal-boundary-fix) is
verified in source/browser tests but is not in `1000010`. Its source fingerprint
no longer matches the current tree. Preserve the signed bundle and verification
record. The corrected `1000012` candidate above includes the fix but still needs
upload and device checks.
Monthly and yearly `barbu_premium`
base plans are active; this does not confirm merchant payout readiness.
The standard configuration still disables billing.

The Data safety update was accepted through the API on November 18, and a fresh
Console CSV export verified all saved answers, including the removal of the
Families commitment after Martin confirmed a teen/adult audience. Martin's
subsequent Console screenshot confirms Data safety submission 14 was submitted
November 18 at 12:37 pm and **Published** at 12:52 pm. This is approval of the
declaration, not the new billing bundle. See
[the declaration evidence](premium.md#data-safety-update-from-the-existing-export).

On November 19 Martin reported that the payment went through and Play Console
shows no warnings. Confirm Payments profile explicitly shows the bank as verified;
the Publisher API checks above do not inspect payout, bank or tax verification.
Neither the test purchase nor declaration publication establishes payout readiness.
See the [Premium production preparation](premium-launch.md) for
listing, markets and the Play-installed acceptance checks.

The six pending commits were pushed through `1780a0f` on November 18. The
canonical support, privacy and terms URLs then returned HTTP 200 and matched
source. The guarded `1000008` upload preview passed, but submission stopped
before any bundle upload: first HTTP 503 from the alpha release-list endpoint,
then, after a successful fresh status check, HTTP 403 **Listing releases quota
exceeded** from the beta release-list endpoint. Both temporary edits were cleaned
up without committing. Logs are ignored under
`release/google-play/upload-v1.0.7-code1000008-2026-11-18*.log`.
Martin then uploaded `1000008` manually, as verified by the bundle-only read
above. Replace it with corrected `1000010` in the draft and verify the actual
version code and lifecycle before proceeding. Avoid repeated all-track polling
while the quota error persists.

After Martin authorized uploading the corrected bundle, local validation passed
again for `1000010`, including its source fingerprint, build inputs and checksum.
A fresh full status check succeeded and confirmed that `1000008` was the only
unsent release and the highest visible uploaded code. Submission used
`--replace-unsent 1000008`, targeting only `alpha`, but its transactional
pre-upload check received HTTP 403 **Listing releases quota exceeded** from
`/tracks/android_xr%3Aproduction/releases`. The temporary edit was deleted without
committing; no bundle upload or track update was attempted. Do not retry blindly
or remove lifecycle checks. Martin then discarded the old draft, received the
`1000010` path and release copy, and reported the changes in review. That report
is not an independent code/hash check. No production promotion or price/tester
change was performed by the agent.

This remains a phone-first release. Martin deferred dedicated tablet layout
work to a later pass. Existing wider-viewport checks are useful regression
coverage, not a claim that Android tablets or iPads have completed a full
usability review. TV launcher/Leanback declarations are removed from the next
bundle, but Console device exclusions, form-factor opt-ins and distribution
countries have not been changed or verified by this source cleanup.

### Prepared Billing Candidate

The November 18 local build is signed with the existing upload certificate and
verified against `1.0.6` / `1000007`. Bundletool validation, four-ABI native-symbol
build-ID matching, R8 mapping matching, stripping and static 16 KB LOAD/RELRO and
bundle alignment checks passed. The first verification attempt exceeded the
32 MB extraction buffer for the 34,985,602-byte R8 map. Its files are preserved
under `partial-v1.0.7-code1000008/`; the corrected verifier uses the existing
128 MB extraction allowance and reports subprocess errors explicitly.

- Bundle: `release/google-play/barbu-google-play-v1.0.7-code1000010.aab`.
- Verification: `release/google-play/verification-v1.0.7-code1000010.json`.
- Symbols and R8 mapping use the same version/code suffix in that directory.
- SHA-256: `75cc5312daa587f41889180f6aefd7f814fa63bbd07df649324b08871d31ace4`.
- Package `com.martin.barbu`, minimum SDK 24, target SDK 36; billing enabled only
  through the ignored override, with its hash included in verification.
- Seventeen release-tool tests, five mobile-configuration checks, `tauri:check`
  and the packaged frontend build passed. After purchase support was added,
  all 284 domain and 102 focused Premium/legal/privacy browser checks passed.

For the `1000009` correction, bundletool confirmed that the merged manifest
retains activity orientation `1` (portrait) and declares portrait hardware
`required="false"`. Inspection-only universal APKs from both bundles were
checked with Android build-tools 36.0.0 AAPT2: `1000008` lists required and
implied-required portrait; `1000009` lists only `uses-feature-not-required`
for portrait. Badging output and the comparison are ignored under
`release/google-play/portrait-feature-check-2026-11-18/`. The temporary APKs
were not installed or distributed. The source and upload regression tests
now guard this requirement; the signed bundle's four-ABI symbols, mapping,
signature and 16 KB checks also passed. These are packaging checks, not a
claim that Console has accepted the replacement or tablet usability is verified.

The phone-scope cleanup then produced `1000010`, keeping `1000009` unchanged
as earlier handoff evidence. Its merged manifest has no TV or Wear OS declarations,
retains the ordinary phone launcher and portrait orientation, and keeps portrait
hardware optional. Five mobile-configuration tests, 17 release-tool tests,
`tauri:check`, the frontend build and signed four-ABI package verification passed.
The latest lightweight bundle read still showed `1000008` as the highest uploaded
code; no new bundle upload or Console targeting change was performed in this pass.
See [the device support gate](#device-support-gate) for the remaining store checks.

Android build-tools 36.0.0 AAPT2 also verified an inspection-only universal APK
from `1000010`: the phone launcher is present, the TV launcher and Leanback/watch
features are absent, and portrait appears only as an optional hardware feature.
Badging output and results are ignored under
`release/google-play/device-scope-check-2026-11-18/`. The temporary APK was not
installed or distributed; Play's form-factor settings and tablet exclusions
remain unverified. No runtime startup block or fake telephony requirement was added.

The earlier `1000008` candidate was refreshed on November 18 with **Premium > Purchase support**:
a copyable private billing reference, native email handoff and recovery when no
mail client is available. An API status read still showed `1000007` as the
highest uploaded code before rebuilding. The earlier `1000008` bundle and its
verification, mapping and symbols are preserved locally under
`superseded-before-purchase-support/`; do not upload those older files. The new
verification record captures the current uncommitted source fingerprint.

The subsequent November 18 security refresh retained the same then-unuploaded version
and includes the targeted dependency updates described in
[the dependency follow-up](premium.md#dependency-security-follow-up). The previous
purchase-support bundle and its matching verification files are preserved under
`superseded-before-dependency-security-update/`. That security-refreshed
`1000008` bundle has SHA-256
`53632bc17859cf7f0ea6c78830405b53a27a3ada8030f63c708ec129f15b5331`.
It is superseded by the portrait
hardware correction in `1000009`.

After this refresh, 284 domain tests and 110 selected browser checks across
Galaxy S9 / Chromium and iPhone XR / WebKit passed, covering the catalog, all
seven free games, learning, saved hands and Premium. The production build,
`tauri:check`, 17 release-tool tests, three mobile-configuration tests and a Sharp
image-resize/format-conversion smoke check passed. The browser selection is not
the complete 2,802-case suite. An outdated Bridge count assertion was corrected
to verify the seven authored course IDs; no Bridge lesson was removed.

A disposable API 35 emulator verified the debug build's native clipboard
round-trip, email-client launch and missing-client fallback. It did not test an
email draft with a configured account, subscription checkout or a Play-signed
upgrade. After pushing `1780a0f`, the canonical support, privacy and terms pages
returned HTTP 200 and matched source, including the purchase-support instructions.
See [purchase support and remaining checks](premium.md#purchase-support).

Physical-device installation, a Play-signed saved-game upgrade, pre-launch report
and 16 KB runtime testing have not been performed on this candidate. Data safety
submission 14 is published; merchant checks remain open. No corrected candidate upload, review submission, product
change, purchase or public rollout was performed. Do not infer installation or
store availability from a successful local package verification.

### Canasta Browser Follow-Up

On November 18, `task ui:test:canasta` passed all 58 checks across Galaxy S9 /
Chromium and iPhone XR / WebKit profiles. Coverage includes rules/card values,
24 lesson decisions, guided-hand completion and replay, meld staging and risk
feedback, scoring, resume and preserving an existing saved game while learning.
Small-phone and tablet-sized screenshots were inspected.

The first run stopped six guided-hand cases at an outdated opening-hint string
after the pile-feedback improvement. The test now checks the actual empty-pile
explanation and explicitly verifies that Draw stock is enabled and Take pile is
disabled. The complete suite was rerun successfully; no production code changed.
Release-tool tests also passed (17). The signed candidate's bytes, source
fingerprint and build inputs were rechecked successfully. These browser results
do not replace Play-installed device or purchase lifecycle tests.

### Historical Production Submission

**November 4: first production release submitted and IN REVIEW.**
After Martin enabled the app-scoped production-release permission, promotion of
`1.0.6` / `1000007` passed validation and committed successfully as
`1.0.6 - First production release`. A fresh lifecycle read returned
`RELEASE_LIFECYCLE_STATE_IN_REVIEW` for production. This confirms submission,
not public availability. Do not submit a duplicate while review is pending;
check Publishing overview or the production lifecycle before announcing launch.

The rollout covers the 177 selected countries/regions plus rest of world, using
the same bundle already published to closed testing. No rebuild or new upload
was needed. Post-commit verification confirmed unchanged testing tracks,
countries, listing copy, screenshots, feature graphic, icon, tablet images and
app details. Receipts are ignored under
`release/google-play/production-submission-2026-11-04.json` and
`release/google-play/production-post-commit-2026-11-04.json`.

### Launch Checks and Initial Attempt

On November 4, Martin requested the first production launch and confirmed that
the Google Play-installed `1.0.6` works on Samsung, including saved-game resume,
a Learn lesson, sharing and the external club search. This supersedes the
previous pending physical Android check; it is user-reported device verification,
not an automated test result or a 16 KB runtime check.

Martin then confirmed no blocking errors in the Play pre-launch report and
saved production markets. A fresh API read confirmed 177 countries/regions plus
rest-of-world availability. The attempted promotion used the existing verified
`1000007` bundle, named `1.0.6 - First production release`, with full rollout to
those saved markets. Testing tracks, listing text, screenshots, feature graphic,
icon, tablet images and app details were checked unchanged.

The initial production track update was accepted only inside a temporary edit, but
`:validate` returned HTTP 403, `The caller does not have permission`. No commit
was attempted and the edit was deleted. Martin then enabled app-scoped
**Release to production, exclude devices and use Play app signing** permission;
the successful retry is recorded above. Validation and review protection were
not bypassed. The failed receipt is preserved as
`release/google-play/production-submission-2026-11-04-permission-denied.json`.
The pre-promotion snapshot is `release/google-play/production-ready-2026-11-04.json`.

### Initial November 4 Preflight

Preflight confirmed `1000007` is still the highest visible version code and is
published on `alpha`; production and open testing remain empty. Its server-side
bundle checksum matches the verified release package. The new store copy is
saved. However, production country availability returned an empty object (no
countries or rest-of-world availability). Launch markets must be saved under
Production > Countries / regions in Play Console before promotion. The API only
supports reading this setting. The Console inspection timed out, so confirmation
of the pre-launch report was requested separately. No production release was
created, committed or launched during this preflight. The ignored snapshot is
`release/google-play/production-preflight-2026-11-04.json`.

Later on November 3, the `en-GB` listing was updated to **Barbu: Learn Card Games**,
with benefit-led descriptions and a new King of Cards feature graphic bearing
"Learn here. Play together." Copy explicitly describes single-player practice,
in-person social play and external Google Maps club search. The API edit passed
validation and committed; a fresh read verified the saved text and graphic,
unchanged screenshots, icon, tablet images, app details and release tracks.
Source copy and artwork are under `docs/store-assets/google-play/`.
This listing update did not launch production or confirm review completion.

On November 3, eight replacement phone screenshots were captured from the exact
`1.0.6` / `1000007` Android release on an emulator. See
[the screenshot set and upload status](store-assets/google-play/README.md).
The first API edit failed validation with HTTP 403 and was discarded. After
Martin enabled listing access, the screenshot-only retry validated and committed
successfully. A fresh API read verified all eight saved checksums in order and
unchanged release tracks. Listing copy and other image types were also verified
unchanged before commit. Production was still empty then; this was not a production
rollout or confirmation that Google has finished reviewing the listing update.
Check Publishing overview for review/publication status.

On October 30, a direct read of the `alpha` release-lifecycle endpoint confirmed
`1.0.6` / `1000007` as `RELEASE_LIFECYCLE_STATE_PUBLISHED`, named
`1.0.6 - Share Barbu and Find Card Clubs` (the Console label uses an en dash).
Martin uploaded and submitted the verified bundle manually after the API attempts
below were blocked. This update includes Share Barbu and the external Google Maps
card-club search and is available to eligible closed testers, not the public.

Production and open testing were empty at the earlier October 30 inspection;
the later check queried alpha only. No production rollout was performed here.
A Play-signed saved-game upgrade and native sharing/Maps checks were still
pending at that point; see the November 4 device confirmation above.

Before the manual submission, API submission stopped before upload:
one transient HTTP 503, followed by HTTP 403 `Listing releases quota exceeded`
on the release-lifecycle endpoint, including a retry after a pause. No new bundle
upload, track update or commit was attempted. The temporary inspection edits
were discarded. The last successful inspection still showed `1000006` unsent
and `1000005` published. Do not interpret authentication success as upload success.
That state was superseded by the manual upload and published confirmation above.
Do not reuse code `1000007` or rerun the old replacement request. Avoid repeated
all-track polling when release-list quota errors occur; do not bypass safeguards.

API access now works through the dedicated Barbu service account in the existing
ISV project. See the CLI workflow below. Read lifecycle state with `task play:status`
before making release decisions; local artifacts and upload success are not
evidence that an update is available to testers.

The older pre-browser-fix candidate remains archived under
`release/google-play/superseded-before-oct30-browser-fixes/`. Never upload it.

## API Workflow

`scripts/google-play.mjs` uses the current `gcloud` login to mint an in-memory,
short-lived token for
`barbu-release@plenary-magpie-170009.iam.gserviceaccount.com`. No downloaded
service-account key is required. The ISV project (`plenary-magpie-170009`) has
Android Publisher and IAM Credentials enabled. Martin has Token Creator on this
service account only; the broader project-level grant was removed. Play access
is configured separately in Play Console. Never add secrets to Git.

Read-only status and offline checks:

```sh
task play:status
task play:status -- --json
task play:monetization
task play:test
```

`play:monetization` lists subscription/base-plan states and one-time products
without creating an edit or changing store settings. It does not verify merchant
or payout readiness. See [Premium and billing](premium.md) for those release gates.

Historical commands used to prepare/preview the now-published 1.0.6 candidate
(not instructions to upload it again):

```sh
caffeinate -di task play:prepare PREVIOUS_AAB=release/google-play/barbu-google-play-v1.0.5-code1000006.aab
task play:upload -- \
  --bundle release/google-play/barbu-google-play-v1.0.6-code1000007.aab \
  --verification release/google-play/verification-v1.0.6-code1000007.json \
  --notes release/google-play/release-notes-v1.0.6-code1000007.txt \
  --name '1.0.6 - Share and find card clubs' \
  --replace-unsent 1000006
```

Upload defaults to preview only; append `--submit` only with approval to submit
that exact closed-test release. The replacement flag is a one-time authorization
for the exact pending code; omit it on normal future releases. Pending reviews,
unknown lifecycle states and other unpublished releases stop the command.
Production publishing, tester editing and country changes are not supported.
Commit uses `ERROR_IF_IN_REVIEW` instead of cancelling an existing review.

`play:status` creates a temporary edit to list tracks/bundles, reads release
lifecycle separately and deletes the edit without committing changes. Do not run
release commands concurrently or edit Play Console during an upload. Status
reports the highest *visible* code; Google remains authoritative for any
historically consumed code. A failed or uncertain upload must be inspected before
retrying, not automatically repeated.

`play:prepare` uses the documented Mac SDK/Java/NDK setup below, the existing
private upload key/password files, and bundletool (set `BUNDLETOOL_JAR` if not at
`/private/tmp/bundletool-all-1.18.1.jar`). It refuses to overwrite a signed bundle
or symbols. The previous AAB provides the expected upload certificate. It hashes
production source before building and checks it before signing. Verification
records include that fingerprint, native checks, matching mapping and symbols.
Upload rejects changed source/build inputs, mismatching checksums, wrong package
or version, missing verification, and reused codes. Package verification does
not assert tests or physical-device checks ran; those are recorded separately.

### Billing-Enabled Candidates

Leave the tracked `tauri.conf.json` purchase key empty and checkout disabled.
Use the existing ignored `src-tauri/tauri.billing.local.json` for controlled
Android billing tests. It may override only the purchase plugin's public `goog_`
SDK key and `purchasesEnabled: true`, not the package, version or other plugins.
The release checks include that file in the source fingerprint and build-input
hashes and record the billing mode; a normal candidate and billing candidate
cannot be substituted for each other.

After choosing an unused version code and checking the paid release gates:

```sh
task play:prepare BILLING=1 \
  PREVIOUS_AAB=release/google-play/barbu-google-play-v1.0.7-code1000010.aab
task play:upload -- --billing \
  --bundle release/google-play/barbu-google-play-v1.0.8-code1000012.aab \
  --verification release/google-play/verification-v1.0.8-code1000012.json \
  --notes release/google-play/release-notes-v1.0.8-code1000012.txt \
  --name '1.0.8 - Better Whist lessons and Premium recovery'
```

Candidate `1000012` is already built: skip `play:prepare` for that artifact.
The build command is for a new unused code; it refuses to overwrite an existing
signed bundle. Update the paths for each future version.

The second command previews only. Do not add `--submit` until the Data safety
declaration and other [Premium gates](premium.md) are reviewed. A code becomes
consumed on upload; inspect remote status again before retrying a failed upload.
Do not upload the same version code once with billing and once without it.

Google's Data safety API accepts a complete CSV declaration, not a partial patch
or a read-back request. Export the existing answers in Play Console under the
**Barbu app**, not developer-account settings: Policy and programs > App content >
Data safety > Manage > Export to CSV. Preserve the export before changing answers;
an import replaces the form. A saved API response is not evidence that Google
has approved or published a declaration.

References: [Data safety API](https://developers.google.com/android-publisher/api-ref/rest/v3/applications/dataSafety)
and [Google's CSV import/export guidance](https://support.google.com/googleplay/android-developer/answer/10787469).

References: [Publishing edits](https://developers.google.com/android-publisher/edits),
[release lifecycle](https://developers.google.com/android-publisher/api-ref/rest/v3/applications.tracks.releases),
[commit review protection](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit).

## Previous Release (October 1 Observation)

The paragraph below records the October 1 submission. A subsequent October 30
API check confirmed `1000005` published before the newer release replaced it.

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

## Device Support Gate

Official support is Android phones and iPhones in upright portrait. Tablet/iPad
layout work is deferred; there is no supported watch, TV, automotive, desktop
or XR edition. Browser and desktop-shell builds are development/test runtimes.
Existing production installs are not changed by editing the next bundle.

The Android source removes both `android.software.leanback` and
`android.intent.category.LEANBACK_LAUNCHER`; the ordinary phone launcher remains.
Source and merged-bundle checks reject these TV declarations and Wear OS feature,
standalone-metadata and library declarations. The upload guard requires the
verifier's `noTvOrWearDeclarations` result. This prevents accidental opt-in
metadata, not installation by every possible unsupported device or sideloading.
See [Android's TV launcher guidance](https://developer.android.com/training/tv/get-started/create).

Before advertising phone-only store availability:

- [x] Inspect Play Console > Test and release > Advanced settings > Form factors.
      Martin's November 18, 16:04 screenshot shows **Android XR: Active** and
      **Google Play Games on PC: Active**. Wear OS, Android TV and Automotive
      are not listed. This is inspection evidence, not an opt-out confirmation.
- [ ] Opt out of Google Play Games on PC using the visible **Opt out** control,
      then verify the saved state. Do not unpublish the mobile application.
- [ ] Open Android XR > Manage and inspect its availability controls. Do not
      create or switch to a dedicated XR release track to try to disable XR.
      If no availability opt-out is offered, review XR headset exclusions in
      Device catalog instead. See
      [Android XR distribution and device exclusions](https://developer.android.com/develop/xr/package-and-distribute).
      A manifest change alone does not confirm the Console state. See also
      [Google's form-factor release guidance](https://support.google.com/googleplay/android-developer/answer/13295490?hl=en).
- [ ] Inspect Monitor and improve > Reach and devices > Device catalog. Review
      tablet and other unsupported models and the impact of any exclusions before
      applying them. Model exclusions need upkeep as devices are added; screen
      flags such as `largeScreens="false"` are not a reliable tablet block.
      See [device exclusions](https://support.google.com/googleplay/android-developer/answer/7353455?hl=en)
      and [Play filtering](https://developer.android.com/google/play/filters).
- [ ] Verify a Play-installed phone upgrade preserves saved games and learning,
      and that portrait rotation, system insets and native actions still work.

Do not require telephony or portrait hardware just to approximate a phone filter,
add a density/model allowlist, or block startup based only on viewport width.
Those approaches can exclude legitimate phones or break resizable/foldable use.
Apple preparation already sets `TARGETED_DEVICE_FAMILY=1`; iPad compatibility
mode can still be used during review and needs basic scrolling/control checks.
This cleanup does not claim native tablet, remote-control or keyboard-only support.

## Repository Boundaries

Native Barbu currently requests upright portrait only. The tracked manifest at
`src-tauri/android/AndroidManifest.xml` owns `screenOrientation="portrait"` and
`appCategory="game"`; `android:prepare` copies it into generated builds. Keep
the game category: Android 16 exempts games from the default large-screen
orientation override. Device/OEM settings and windowing modes can still override
orientation, so this is not a universal tablet-layout guarantee. Browser previews
remain resizable. Run `task mobile:check` and test phone rotation after shell changes.

The manifest also explicitly declares `android.hardware.screen.portrait` with
`android:required="false"`. Without this, Play infers a required hardware feature
from the activity's orientation and can exclude devices. The declaration removes
that install-time filter without changing the phone's upright portrait request.
Source tests and the bundle verifier both guard this distinction; the upload
guard requires the verifier's `optionalPortraitFeature` result. See
[Android's feature-filter guidance](https://developer.android.com/develop/adaptive-apps/guides/increase-app-availability).

Dedicated tablet/foldable/desktop layouts remain a separate validation task:
check bounded table/hand sizes, both window orientations, resizing, system insets,
lesson scrolling and saved-hand continuity before advertising native support.
Do not change Play device targeting or publish new tablet screenshots merely
because the portrait lock is present.

Reference: [Android 16 orientation exceptions](https://developer.android.com/about/versions/16/behavior-changes-16).

November 16 local verification: the rebuilt APK contains portrait orientation
and game category declarations and was installed on the Galaxy S9. With Barbu
confirmed as the foreground window, both left/right landscape requests retained
a nonblank 1080x2220 portrait screen. Original auto-rotate/user-rotation settings
were restored afterward. This does not verify Android tablet/OEM behavior.

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

### October 30: 1.0.6 / 1000007 (Published To Closed Testing)

Candidate: `release/google-play/barbu-google-play-v1.0.6-code1000007.aab`.
Size: `129510934` bytes. SHA-256:
`52314e7a5e04be2e58aa61ed2e23e1470ff30e1b060aac3c9e8c36e678a45751`.

Includes the committed sharing/club-search changes plus the version bump.
Full four-ABI Android build and frontend build passed. The signed bundle matches
the previous upload certificate and passes bundletool validation, manifest
version checks, stripped libraries, matching native symbol build IDs, R8 mapping,
and 16 KB native/bundle alignment checks. Verification includes a production
source fingerprint so a changed working tree cannot silently reuse this bundle.

Fresh social/privacy browser checks: 60 passed across six profiles. The earlier
full browser/domain audit remains recorded below; it was not rerun for this
version-only production-source change. Twelve offline release-tool tests cover
stale packages, checksums, code reuse, pending releases, exact unsent replacement,
production blocking, cleanup and quota failures. Native sharing/Maps handoff and
a Play-signed device upgrade still need physical-device verification.

The preview of replacing unsent `1000006` with `1000007` passed. API submission
was blocked by Google's release-list quota before upload. Martin then uploaded
through Play Console; its review screenshot and the later published lifecycle
response confirm the release progressed. Logs and matching package/symbol/
mapping/verification files remain in the ignored release directory. The original
package-verification receipt describes local checks, not subsequent store state.
Production was not changed. The CLI submission path has offline test coverage,
but has not yet completed a real upload/commit end to end.

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
