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
- [ ] Publish and verify the updated terms/privacy URLs without login.
- [ ] Update Play Data safety for the billing-enabled version. RevenueCat requires
      disclosure of collected **Purchase history**, non-ephemeral processing,
      encryption in transit, and app-functionality/subscription-analytics uses.
      Review identifiers and technical data against the actual SDK configuration;
      disabling advertising identifiers does not remove the anonymous purchaser ID.
      Check service-provider sharing exemptions rather than marking all transfers
      as advertising sharing. Test the support process for purchase-data requests.
- [ ] Approve launch countries and local prices; only Norway is currently approved.
- [ ] Build a fresh, signed billing candidate with an unused Play version code,
      including the latest Canasta pile-pickup explanation. Keep the standard
      public configuration disabled until the candidate is approved.
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
- [ ] Update store screenshots/description so free games, paid Canasta and the
      Android-only purchase scope match the delivered build.

Sources: [RevenueCat Data safety guidance](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)
and [Google subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en).
This is a release checklist, not a statement that these Console changes or
physical-device tests have been completed.

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
