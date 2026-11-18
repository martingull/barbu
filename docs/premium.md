# Premium Access and Billing

## Product Decision

Keep Hearts, Barbu, Whist, Spades, Bridge, Gin Rummy and Card Counting I free,
including their current Learn and Play content. No timers, cooldowns or ads.
Future premium games belong to one optional Barbu Premium subscription, starting
with Canasta. Martin approved EUR 2.50 per month or EUR 19.99 per year, with no free
trial, on November 16, 2026. These are intended customer-facing euro prices;
regional conversions and broader launch availability still need review. Martin
approved Norway-only activation at NOK 33/month and NOK 265/year on November 16.
Both plans are now active in Norway for controlled license testing. Public-build
checkout must wait for purchase testing and the launch gates below.

Google Play product: `barbu_premium`, with auto-renewing base plans
`monthly` (`P1M`) and `yearly` (`P1Y`). No introductory offers or lifetime plan.
Both should unlock the same RevenueCat `premium` entitlement. The annual plan
is billed once per year, not monthly. Future price increases should initially
apply to new subscribers, preserving existing subscribers' prices while their
subscriptions remain active; do not promise a permanent lifetime price lock.

`src/games/accessPolicy.ts` owns the free list and premium classification.
The catalog factory derives access metadata from that policy. Existing open/resume
routes use `isCatalogGameAvailable`, which checks both visibility and access.
Unassigned games do not receive access by default. Do not add per-game billing checks.

Canasta's preview is not a purchase, trial or permanent free entitlement.
`VITE_CANASTA_PREVIEW=1` works only in development. The default release configuration
keeps Canasta hidden: its Android RevenueCat SDK key is empty and
`purchasesEnabled` is false. A configured Android candidate can expose Premium;
this is separate from enabling checkout. Never use the developer preview as
evidence that purchase verification works.

The separate iOS `canasta-internal` build mode also enables Canasta without a
purchase, only for internal TestFlight gameplay testing. It uses a separate asset
directory and internal-only Apple export; it never fabricates or persists a
Premium entitlement. See [the preview runbook](app-store-release.md#internal-canasta-preview).
This does not implement iOS billing or change the normal release defaults.

The local Android plugin under `src-tauri/plugins/purchases` wraps RevenueCat's
SDK. `src/features/premium` owns the shared purchase UI and service; the pure
access check lives in `src/domain/premiumAccess.ts`. The local Android build has
passed an initial license-test purchase, restart/access, restore and cancellation/expiry check; a
Play-distributed billing candidate and broader lifecycle tests remain outstanding.
iOS billing is not implemented.

## Pre-Release Polish

The November 18 source changes add a reconnect state to Premium. Unknown,
failed or stale verification does not show checkout buttons, even when prices
load. **Check access** retries verification; **Restore purchases** and **Manage
subscription** remain available. Pending or unconfirmed checkout also requires
an access check before another purchase attempt. Valid in-memory access survives
a temporary connection failure only within the existing verified window.
Cancelled subscribers see the paid-through date and time in the device locale.

This pass deliberately does not persist a client-side Premium flag or change the
native verification contract. Cold-start offline access is still unavailable;
the Premium screen and terms now disclose the reconnect requirement. A future
cross-restart offline cache needs a separate native verification design, not a
local-storage entitlement. No store configuration or public checkout is changed.

Terms and privacy source pages now describe optional Android subscriptions,
RevenueCat processing, cancellation, restoration and deletion requests. They
must be published and checked at their public URLs before a paid candidate is
distributed. Updating these files does not update Play Console's Data safety form.

November 18 automated verification: 281 domain tests, 78 focused Premium/legal/
privacy browser checks across all six configured device profiles, and the
production build passed. Screenshots were inspected at small-phone widths.
Browser billing responses are simulated; these checks do not establish that the
new UI has been installed or tested on a physical device.

### Paid Candidate Checklist

- [ ] Confirm merchant payout, bank and tax requirements have no outstanding warnings.
      Martin added a payout bank account on November 18; verification is pending
      via Google's test-deposit flow. This is not a verified payout method yet.
- [x] Publish and verify the updated terms/privacy URLs without login. Both returned
      HTTP 200 and matched commit `aae8699` on November 18.
- [x] Publish the subsequent purchase-support instructions and privacy clarification.
      After pushing `1780a0f`, the canonical support, privacy and terms URLs all
      returned HTTP 200 and matched their source on November 18.
- [x] Update Play Data safety for the billing-enabled version. RevenueCat requires
      disclosure of collected **Purchase history**, non-ephemeral processing,
      encryption in transit, and app-functionality/subscription-analytics uses.
      The November 18 API update and a fresh Console export verified the saved
      answers for purchase history and the anonymous app identifier, with the
      Families commitment removed following Martin's audience confirmation.
- [x] Confirm the declaration's publication status. Martin's November 18 Console
      screenshot shows Data safety submission 14 submitted at 12:37 pm and
      **Published** at 12:52 pm. This approves the declaration, not a new bundle.
- [ ] Confirm no additional non-provider RevenueCat integrations are enabled and
      test the support process for purchase-data requests before paid launch.
- [ ] Approve launch countries and local prices; only Norway is currently approved.
- [x] Build a fresh, signed billing candidate including the latest Canasta
      pile-pickup explanation and purchase support: `1.0.7` / `1000008`, refreshed and package-verified
      November 18. It is not uploaded; check remote codes again before upload.
      The standard public configuration remains disabled.
- [ ] Upload the verified candidate to closed testing. The November 18 preview
      passed, but the first submission received HTTP 503 before upload. A fresh
      status still showed only `1000007`; the single retry then hit Google's
      release-list quota before upload. No release changed. Manual Console
      upload or quota recovery is needed; do not weaken the review safeguards.
- [ ] Install/update through a Play testing track without uninstalling. Check
      saved hands, course progress and existing free games.
- [ ] Verify monthly and annual checkout using license-test payment methods,
      cancellation, pending/declined payments, renewal, refund/revocation, grace
      period/account hold and restoration after reinstall. Monthly purchase,
      restore and cancellation/expiry have local-device evidence, not yet
      Play-distributed candidate evidence.
- [ ] Check Canasta-save retention across expiry and restoration, reconnect
      behavior, subscription dates and subscription management on that candidate.
- [ ] Walk rules -> lessons -> guided hand -> full game -> scoring -> resume on
      a small phone and a modern Android screen; check larger system text too.
      The November 18 browser follow-up passed all 58 Canasta checks across
      Chromium/WebKit, including guided completion, replay and save preservation;
      installed-device checks on this candidate remain outstanding.
- [ ] Update store screenshots/description so free games, paid Canasta and the
      Android-only purchase scope match the delivered build.
- [x] Apply the available compatible dependency security updates, including
      Svelte's transitive `devalue` dependency; the production dependency audit
      now reports no known vulnerabilities.
- [ ] Recheck the unresolved development-only `picomatch` advisory before release;
      see the dependency follow-up below. The full audit is not clean yet.

Sources: [RevenueCat Data safety guidance](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)
and [Google subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en).
This is a release checklist, not a statement that these Console changes or
physical-device tests have been completed.

### Data Safety Update From the Existing Export

On November 18, Martin exported `data_safety_export.csv` from Barbu's App content
page. The original 782-row export declared no collected data and had the optional
Families-policy commitment enabled. Martin confirmed that Barbu targets teens
and adults, not children under 13, and approved removing that commitment. This
does not independently inspect or change the separate target-audience form.

The untouched original, a proposed CSV and its response-level diff are preserved
locally in ignored `release/google-play/data-safety-2026-11-18/`. The initial draft
changed 24 response values; the reviewed version changes 25 including the Families
commitment. Row identifiers, labels, requirements, order and all other responses
are preserved, and CSV round-trip checks passed. It declares:

- Purchase history and the generated RevenueCat installation/customer identifier
  (under Device or other IDs), collected for functionality and subscription
  analytics. The identifier classification follows Google's inclusion of app
  identifiers; it is not a claim that advertising identifiers are collected.
- Non-ephemeral, required processing over encrypted connections; no Barbu account
  creation or external-account login.
- Data-deletion requests through the published privacy page's purchase-data
  section and support email.
- No sharing beyond the service-provider processing, subject to confirming that
  no additional non-provider RevenueCat integrations are enabled.

The API accepted `billing-reviewed.csv` on November 18. Its SHA-256 is
`0c6cafd0c664af4860d3f8c291d3f52bec299c0ea0cbc5460f6fc023ee4cfb06`.
Martin then refreshed the Console and supplied `data_safety_export (1).csv`.
All 782 saved responses match the reviewed file semantically, including the
Families commitment set to false. Google normalized six unchecked choice
responses from explicit false to blank; no Boolean question or selected answer
changed. Receipts and read-back verification are preserved in the same ignored
directory. The old `billing-draft.csv` is superseded; do not import it.

Saved-answer verification alone is not proof of review approval or public visibility.
Martin subsequently supplied a Console screenshot of submission 14 showing the
single Data safety change **Published** on November 18 at 12:52 pm, after
submission at 12:37 pm. That is publication evidence for this declaration only.
No bundle upload, product
change, purchase or rollout was performed as part of this declaration update.
The presence of a support email is not proof that a purchase-data deletion
request has been tested.

### Merchant Verification and Service-Fee Follow-Up

Martin's November 18 Payments profile screenshot initially showed no payout
method. He then added a bank account; the subsequent screenshot showed the
test-deposit verification form. No bank identifiers or documents are recorded
here. Verification, any remaining tax/setup requirements and payout readiness
remain open. A pending test deposit is not evidence of a purchase failure.

Martin's subsequent full-panel screenshot confirms the heading is **Enrol for
the 15% service fee**. It is an enrollment invitation, not a merchant setup error
or evidence that Premium checkout is blocked. Do not accept fee terms or change
account associations on Martin's behalf.
Google's [service-fee guidance](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
lists auto-renewing subscription pricing separately from the first-$1M fee tier;
the latter has its own account-group and enrollment requirements. Review the
applicable program before enrolling; bank verification remains a separate task.

### Purchase Support

Configured Android builds expose **Premium > Purchase support**, even if access
verification fails. The native plugin reads the SDK's anonymous app-user ID and
provides a copy action plus an email intent addressed to
`martin@insilicoveritas.org`. The draft includes only the reference and installed
Barbu version; it is not sent automatically. The Android clipboard entry is marked
sensitive on Android 13 and later. If copying or email is unavailable, the
selectable reference and address remain visible. Support-operation errors do not
replace pending-payment messages or change subscription access.

The reference is a private lookup aid, not a password, receipt or proof of payment.
It is read from RevenueCat's native SDK, not persisted in browser storage or used to grant
access. A reinstall can create a new anonymous ID; purchase restoration and its
aliases may be needed to find an older record. Never ask users to post references
or receipts in public GitHub issues. See RevenueCat's
[customer identity guidance](https://www.revenuecat.com/docs/customers/identifying-customers).

#### Support Procedure

1. Ask for the privately emailed billing reference, Barbu version and a short
   description. Never request bank details, full payment-card details or raw
   purchase tokens. If access is missing, first try reconnecting, **Check access**
   and **Restore purchases** with the Google Play account that bought Premium;
   do not suggest buying twice or uninstalling to fix verification.
2. Look up the reference in the Barbu RevenueCat project. Check aliases, store,
   product, entitlement dates and whether the transaction is sandbox or production.
   A reference alone does not authorize disclosure or destructive changes. Where
   needed, verify the request against the corresponding Google Play order record
   supplied privately by the purchaser. Do not grant access from an email claim
   or edit client storage to bypass verification.
3. Treat cancellation, refund and data deletion as separate requests. Direct a
   cancellation to **Manage subscription** or Google Play's subscription settings.
   Do not refund, revoke, cancel or delete a customer without an explicit request
   and appropriate verification.
4. For a verified purchase-data deletion request, explain that it can affect
   Premium access but does not cancel Google Play billing. Determine which records
   must legally be retained and explain that Google controls its own store records.
   Use RevenueCat's customer profile **Manage > Delete Customer** only after the
   request and scope are confirmed. Check aliases and follow the provider's
   completion guidance; deletion is asynchronous, so an accepted request alone
   does not establish completion. See the
   [customer-profile documentation](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile).
5. Confirm the outcome privately and retain only the minimum support record
   needed. Do not erase local saved games to handle a purchase-data request.
   Restoring purchases does not recover local games lost through uninstalling.

This documents the procedure, not a completed deletion test. No live customer
was deleted, refunded or charged in developing these controls. Before paid
launch, run a complete support/deletion rehearsal with a dedicated sandbox
customer, verify completion and access consequences, and record the result
without publishing its identifiers.

November 18 support verification passed 284 domain tests, 102 focused browser
checks across all six device profiles, the frontend production build and
`tauri:check`. A local debug build on a disposable read-only API 35 emulator
verified the native billing-reference format and a real clipboard round-trip
back into Barbu. Contact support launched Gmail's welcome/setup screen; no
account was added and no message was sent. Temporarily disabling that emulator's
mail client also verified the missing-email-app fallback and retained reference.
Gmail was re-enabled and the emulator stopped without saving its overlay.
Screenshots and a private result record are ignored under
`release/google-play/purchase-support-2026-11-18/`. A composed email on a
configured physical phone and the complete deletion workflow remain untested.

### Dependency Security Follow-Up

The November 18 targeted update retains Svelte 5.56.1, the existing Svelte plugin,
Tauri, TypeScript and Playwright. It updates only audited dependency chains:

- `devalue` 5.8.1 -> 5.9.4, including the
  [serialization fix](https://github.com/sveltejs/devalue/security/advisories/GHSA-j22f-vq7h-c4qm).
- Vite 6.4.3 -> 6.4.6, including the maintainer's
  [network-exposed dev-server fix](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7).
- Sharp 0.35.3 -> 0.35.5 and its matching native image-processing packages.
- PostCSS 8.5.33, Nano ID 3.3.20, source-map-js 1.2.2 and picomatch 4.0.7,
  within the parents' supported version ranges. Their required transitive
  changes are recorded in `package-lock.json`; third-party notices are regenerated.

`npm audit --omit=dev` reports zero known vulnerabilities. The full `npm audit`
still reports four high-severity package entries: picomatch plus its dependent
fdir, tinyglobby and Vite. They trace to one
[repeated-extglob denial-of-service advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf),
which lists no patched release; 4.0.7 is the latest published version checked.
These are build/development dependencies, not a claim of a runtime vulnerability
in installed Barbu. The reported attack requires attacker-controlled glob
patterns. Keep patterns developer-controlled and do not expose development or
preview servers to untrusted networks. This is risk containment, not an upstream
fix or a general security certification.

Do not use `npm audit fix --force`: its suggested Vite 6.2.7 downgrade would remove
newer security fixes. Recheck the advisory and registry before the paid release,
and update/retest when a maintained fix is available. No native billing SDK,
gameplay policy, subscription region or public release changes in this pass.

Verification passed 284 domain tests, 110 selected browser checks on Galaxy S9 /
Chromium and iPhone XR / WebKit, the production build, `tauri:check`, 17 release
tooling tests, three mobile-config tests and a Sharp image-conversion smoke.
The selected browser run initially found an outdated assertion expecting six
Bridge lessons; it now checks the seven authored IDs, and the complete selection
was rerun successfully. This is not the full 2,802-case browser suite.
The local signed `1.0.7` / `1000008` candidate was rebuilt and package-verified
with these dependencies; no upload, device installation or purchase was performed.
Dedicated tablet layout work remains deferred, not certified by the existing
wider-viewport regression checks.

## Current Evidence

On November 16, 2026:

- Martin reported Google trader approval. This is not merchant/payout verification.
- After Martin completed merchant setup, the Subscriptions page no longer showed
  the merchant-account blocker and `pricing:convertRegionPrices` succeeded.
  This confirms product setup access, not payout/bank/tax verification: the
  embedded Payments profile could not be fully inspected.
- Created `barbu_premium` with `monthly` and `yearly` base plans through the
  Publisher API. A separate GET verified both states are `DRAFT` and every
  regional `newSubscriberAvailability` was false at creation.
- Each plan has prices for 173 supported current production markets. All EUR
  prices are exactly 2.50 or 19.99 respectively, updated and read back after
  Martin revised the initial prices. Subsequently, with explicit approval,
  both plans were activated for Norway only at NOK 33/month and NOK 265/year.
  A separate GET verified both are `ACTIVE`, only `NO` is available, and prices
  and other fields are unchanged. All other regional prices remain unapproved
  conversion suggestions, not a commitment to sell in those regions. No future
  region availability is configured. Region version: `2026/01`.
- RevenueCat project `aeea1aa5` and Google Play app `appb0a8483753` are configured
  for `com.martin.barbu`; RevenueCat reports valid credentials.
- Google Play real-time notifications are saved for subscriptions and voided
  purchases. RevenueCat received the test at 15:03 UTC (16:03 Oslo).
- Native integration and shared entitlement handling exist locally, but real
  Play purchase/lifecycle tests remain outstanding. No paid release was submitted.

### November 17 Device Check

An initial USB capture of the Galaxy S9 (SM-G960F), running the local debug build `1.0.6`
(`1000007`), confirms live offers at NOK 33/month and NOK 265/year, with the
corresponding subscription buttons. Tapping **Refresh prices** retained both
offers with no visible error. The previous product-loading blocker is no
longer present on this device.

Martin then completed a purchase and explicitly confirmed Google Play used a
test payment method. The device showed **Premium is active** and **Premium is
ready**. After force-stopping and reopening Barbu without clearing data, Canasta
opened from the catalog rather than showing the paywall; Manage Premium still
showed active access. **Restore purchases** returned **Premium access restored**.
Existing saved-game data was retained. This is an on-device Google Play
license-test flow, not a browser/mock purchase or real-money revenue.

With Martin's explicit approval, renewal of that monthly test subscription was
cancelled in Google Play. The management screen identified **Test card, always
approves**, a five-minute test billing period, and cancellation effective at
18:02 Europe/Oslo on November 17. Barbu subsequently showed **Renewal is off**
while Premium was still active. By 18:03 the open Premium screen automatically
returned to subscription offers without a restart. Opening Canasta from the
catalog then routed to Premium instead of the game. Restore after expiry
returned **No active Premium subscription was found**, without restoring access.
The existing Hearts hand still resumed at pass-left, zero of three selected;
no cards were selected or passed, and no installation or data reset was used.
Canasta-save preservation across expiry still needs a device check with an
existing Canasta save; this device had no Canasta match to resume before expiry.

No further purchase was initiated by the agent, and no public build or store
product configuration was changed. This evidence does not establish restoration
after reinstall, a separately observed renewal, pending/declined payments,
refund/revocation, payout readiness or behavior in a Play-distributed candidate.

## RevenueCat Configuration

- Service account: `barbu-revenuecat@plenary-magpie-170009.iam.gserviceaccount.com`.
- Cloud roles: Pub/Sub Editor and Monitoring Viewer on `plenary-magpie-170009`,
  explicitly approved by Martin. This project is shared with ISV.
- Topic: `projects/plenary-magpie-170009/topics/Play-Store-Notifications`.
- Subscription: `RevenueCat-Subscriber-appb0a8483753` (active).
- Google Play's notification service has Publisher access on this topic only.
  Temporary topic-level Pub/Sub Admin for RevenueCat was removed after setup.
- Play Console grants read app information, read app quality, view financial data,
  and manage orders/subscriptions at account scope. Narrow to Barbu before adding
  other apps; administrator and release-publishing permissions are not granted.
- Entitlement identifier: `premium`, display name `Barbu Premium`.
- Offering identifier: `premium`, display name `Barbu Premium`.
- Both Google Play plans are imported and attached to the `premium` entitlement.
  Offering `premium` (`ofrng04dcf30142`) maps `$rc_monthly` to
  `barbu_premium:monthly` and `$rc_annual` to `barbu_premium:yearly`. Neither
  package includes a Test Store product or an older-SDK fallback. The native
  adapter reads the `premium` offering explicitly; the existing default offering
  was not changed. The Google Play plans are now active for Norway only.
- Existing `barbu_pro` and `default` records belong to Test Store setup and were
  left untouched. Test Store monthly/yearly/lifetime products are not Google Play
  plans, approved prices, or a promise of lifetime access.

Keep private service-account JSON out of Git and the client. The Android SDK
uses a public `goog_` key instead. Neither a successful notification test nor
valid credentials proves checkout, entitlement delivery, or payout readiness.

Repeat the product check with `task play:monetization`. It reuses the existing
short-lived service-account credentials, follows pagination and only reads
products. It creates no publishing edit and never activates, prices or submits
anything. API failures stop the check, rather than reporting an empty catalog.
Successful product reads do not prove that billing or payouts are ready.

## Verification Before Device Testing

- The 12 focused Premium/catalog browser checks passed on Chromium and WebKit,
  including 320x568, 360x740 and 820x1180 viewports. Purchase success, cancellation,
  pending payment, revocation, restore and preservation of the Canasta save are
  simulated through a test-only native adapter, not Google Play transactions.
- The browser test now scopes the Draw stock assertion to Canasta's decisions
  region: the stock pile and action button intentionally share that command name.
- The production web build passed. Test screenshots use fixture prices to verify
  store-provided display strings; they are not the approved live prices.
- An Android ARM64 debug APK built successfully on November 16 with the public
  RevenueCat Google Play SDK key in ignored `src-tauri/tauri.billing.local.json`.
  This also compiled the current Rust plugin wrapper and Android integration.
  The first local override kept `purchasesEnabled: false`; tracked release defaults
  remain unconfigured. After the user removed the Play installation and authorized
  USB debugging, this APK was installed successfully on the physical Galaxy S9
  (SM-G960F). Barbu launched; screenshots confirmed the Canasta Premium catalog
  entry and Premium screen render without visible overlaps. Checkout correctly
  shows as unavailable with no purchase buttons. This verifies installation and
  the disabled-checkout UI, not real purchase or entitlement verification.
  Rebuild with the documented Android environment and
  `npm run tauri -- android build --debug --apk --target aarch64 --ci --config src-tauri/tauri.billing.local.json`.
- No billing-enabled Play candidate has been uploaded, no real purchase tested,
  and no public build changed. On 2026-11-16, verified that the existing Martin email
  list contains the user's confirmed Samsung Play account, selected that list
  for account-level license testing, and received Google's saved confirmation.
  The licence response remains `RESPOND_NORMALLY`. Ordinary closed-test
  membership alone does not establish license-test billing. Confirm the checkout
  uses that account and shows a test payment method before completing any
  transaction.
- After Norway activation was approved, enabled checkout only in the ignored
  local configuration, rebuilt the ARM64 debug APK and updated the S9 using
  `adb install -r` successfully. The installed APK has the Billing permission.
  The native SDK retrieves the expected product ID from RevenueCat, but Google
  Play returns `PRODUCT_NOT_FOUND` for `barbu_premium`. A retry also failed;
  checkout, the license-test payment method and purchase delivery are unverified.
  Recent activation propagation is a possible cause, not a confirmed diagnosis.
  Retry Premium > Refresh prices; if it persists, check the purchasing account,
  store country, merchant requirements and a Play-distributed billing candidate.
  Do not confirm a transaction unless Google displays a test payment method.

## Delivery Gates

1. **Merchant setup:** product setup access is confirmed; verify payout readiness in
   Manage account > Play apps settings > Monetization settings > Payments profile.
   Complete any requirements Google displays. Do not record bank details in Git.
2. **Commercial approval:** EUR 2.50/month and EUR 19.99/year without a trial are approved.
   Review launch countries and local-currency prices before activation. Define
   subscriber expectations around future additions; do not promise games that
   are not delivered.
3. **Native billing and verification:** finish reviewing and verifying the local
   RevenueCat Android integration on a Play-distributed candidate. Keep store
   operations outside game engines; client flags and saved games are not proof
   of payment. Never ship Publisher credentials in the client.
4. **Shared entitlements:** verify purchase, restore, foreground refresh and
   subscription management across premium Learn, guided and Play routes. The
   current policy retains only an in-memory verified snapshot, for at most 24
   hours or until subscription expiry, whichever comes first. Restart requires
   fresh verification. Access expiry must not erase saved games.
5. **Lifecycle tests:** cover pending/declined purchases, acknowledgement,
   restoration after reinstall, renewal, cancellation through paid-through expiry,
   grace period, account hold, expiry, refund and revocation. Use Play license
   testers on installed builds; browser tests cannot verify a real purchase.
6. **Launch:** the store plans are active for Norway-only license testing.
   The November 17 local S9 check confirms price loading, a monthly license-test purchase,
   access after restart, restore, cancelled-but-active access and expiry locking.
   Verify a Play-distributed billing candidate
   and the remaining lifecycle cases before approving broader regions. Keep
   the production build's checkout disabled until tests pass. Update
   terms/privacy/Data safety as applicable before submitting a paid candidate.
   Display actual store-localized prices and clear renewal/cancellation terms,
   not hardcoded euro prices.

An Android purchase does not automatically unlock iOS. StoreKit and a deliberate
cross-platform identity/entitlement design need their own implementation and tests.
Do not add a login requirement to free local play just to prepare for billing.

## Sources

- [Merchant payments profile](https://support.google.com/googleplay/android-developer/answer/3092739?hl=en)
- [Payments setup](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en)
- [Bank verification](https://support.google.com/googleplay/android-developer/answer/7161378?hl=en)
- [Subscription products and base plans](https://support.google.com/googleplay/android-developer/answer/140504?hl=en)
- [Play Billing integration](https://developer.android.com/google/play/billing/integrate)
- [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- [Purchase security](https://developer.android.com/google/play/billing/security)

Barbu is already a free Google Play listing and cannot be changed to a paid
download under the same listing. Premium is an in-app offering, not a new paid
download. See [Google's pricing rules](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en).
