# Premium Production Preparation

Prepare the Canasta update without promoting the closed test or changing production.
The public free edition is already live; this is the first paid-content launch,
not Barbu's first production release. Owner: Martin Gullaksen.

## Release State

On November 19 the Publisher API confirmed `1.0.7` / `1000010` is published to
closed testing (`alpha`), with the verified local bundle's checksum. Production
remains `1.0.6` / `1000007`. ADB confirmed the connected Samsung has version
`1000010`, installed by `com.android.vending`. The earlier release-list quota
failure did not upload anything; Martin's manual replacement is now verified.
Do not rebuild or promote this candidate merely because closed testing passed
review; the paid-production acceptance checks below still apply.

## Listing and Screenshots

[Premium listing draft](store-assets/google-play/listing-premium-en-GB.draft.json)
separates the seven free tables from paid Canasta. It is text only: it deliberately
omits the video field so publishing it cannot restore an old trailer. Keep the
current listing and screenshot manifest untouched until the production update
is ready. Follow Google's [metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en).

Prepare this eight-image sequence from the exact Play-installed candidate:

| Order | Screen | What it should establish |
| --- | --- | --- |
| 1 | Hearts lesson decision and feedback | Learn by playing; free starter content. |
| 2 | Hearts learning path | Rules, lessons and guided play have distinct entry points. |
| 3 | Guided Hearts hand | Advice and explanations accompany a full hand. |
| 4 | Gin Rummy full hand | Independent practice with readable cards. |
| 5 | Catalog containing Canasta | Canasta is Premium; existing games are free. |
| 6 | Canasta Learn | Card values first, eight topics and guided-hand entry. |
| 7 | Guided Canasta after drawing | A useful decision, melds and explanation are visible. |
| 8 | Premium subscription plans | Store-provided prices, billing periods and optional purchase. |

Use clean phone captures with no notifications, private billing references or
test-payment dialogs. Inspect card readability, safe areas and text at full size.
Record bundle version/hash, device, image sizes and hashes before replacing
approved assets. Browser drafts may help select scenes but are not native-release
evidence and must not be uploaded as Play captures. Do not edit the current
manifest to claim new screenshots already exist.

To select Canasta scenes locally, start a separate development preview with
`VITE_CANASTA_PREVIEW=1 npm run dev -- --port 1422`, then run
`node scripts/marketing/capture-premium-preview.mjs`. It uses an isolated browser
and writes four clearly marked drafts plus hashes to ignored
`release/google-play/premium-launch-preview/`. No billing is mocked or purchased;
the development catalog correctly retains its Internal preview label.

November 18 preparation produced and visually inspected all four drafts at a
393 x 805 CSS-pixel viewport (1179 x 2415 PNG). Cards loaded, no horizontal
overflow or browser errors occurred, and gameplay actions remained visible in
the captured hand screens. The draft listing passes the 30/80/4000-character
field limits. At that capture, the billing candidate's source fingerprint matched
its verification record; subsequent source edits require a fresh package.
These checks do not replace native screenshot capture,
store-country checkout or the acceptance rows below.

## Launch Markets

Martin selected Norway, the Netherlands and the UK for preparation. A read-only
Google Play subscription query on November 18 returned these saved prices:

| Market | Code | Monthly | Yearly | Current checkout |
| --- | --- | --- | --- | --- |
| Norway | NO | NOK 33 | NOK 265 | Enabled for controlled testing |
| Netherlands | NL | EUR 2.50 | EUR 19.99 | Disabled |
| United Kingdom | GB | GBP 2.49 | GBP 19.99 | Disabled |

The two base plans are active, but only Norway permits new subscribers. The UK
price is the saved conversion, not a newly approved price. Confirm these exact
launch prices with Martin before enabling NL/GB. Do not turn on automatic future
regions or change existing subscribers' prices. Regional settings belong to
[subscription base plans](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en),
not a restriction of the free download's distribution countries. Keep existing
free-game availability unchanged. Verify checkout with an eligible account per
market; device language or a VPN is not proof of store-country eligibility.

## Samsung Acceptance

Run after closed testing is published. Closed-test membership is separate from
license-test billing; only proceed with purchases showing a test payment method.
Use Google's [billing test tools](https://developer.android.com/google/play/billing/test)
for accelerated renewal and payment-state scenarios. An unsupported test scenario
is blocked, not passed; record the available test method before running it.

| Check | Expected outcome | Result |
| --- | --- | --- |
| Confirm candidate | Play installs `1.0.7` / `1000010`, not an older local APK. | Passed November 19: ADB version and Play installer confirmed. |
| Upgrade without uninstalling | Existing saved hand, lesson progress and free tables survive. Stop on a signature conflict; do not erase data. | Pending |
| First Canasta journey | Rules -> card values -> lesson feedback -> next topic -> guided hand -> Play -> score -> resume. | Pending |
| Phone usability | Readable S9 controls, no navigation-key overlap, stable board, usable larger system text. Check a modern phone too. | Pending |
| Monthly and yearly separately | Correct local total/period, test checkout, verified access and acknowledged transaction in provider/store records. | Partial: user reports monthly test purchase; active access observed. Yearly checkout and provider/order checks pending. |
| Restart and restore | Access returns without a second purchase; Restore purchases uses the buying Play account. | Partial: active restore succeeded November 19. Cold restart and reinstall restore pending. |
| Renewal and cancellation | Observe renewal; cancellation stops renewal but access lasts through the verified paid period. | Partial: November 19 RevenueCat sandbox history confirms six renewals; installed client showed a paywall transient. Fixed-build device test and deliberate cancellation pending. |
| Expiry and reactivation | Canasta locks at expiry, its local save remains, and renewed/restored access resumes it. Free tables stay usable. | Pending |
| Declined and pending payment | No access before confirmed payment; no duplicate purchase prompt while status is unresolved. | Pending |
| Grace, hold, refund and revocation | Access matches verified provider state; grace and account hold are distinguished. | Pending |
| Reconnect and offline reopen | Honest reconnect state, no duplicate checkout, access recovery and save retention. | Pending |
| Reinstall restore | Use a disposable test device/profile: restore purchase access. Local saves are not expected to survive uninstalling. | Pending |

Keep a private result record in ignored `release/google-play/`: candidate/hash,
device/OS, Play install source, scenario, observed outcome, time and redacted
evidence path. Do not commit emails, billing references, receipts or tokens.
Browser simulations and November 17 local-device checks do not tick these rows.

November 19 Samsung evidence shows **Premium is active**, renewal enabled and a
paid-period end of 12:11, followed by **Premium access restored** after an explicit
restore. Canasta's Play entry opened, and its Learn entry was visible without
starting a match or awarding lesson progress. Martin confirmed the purchase was
monthly and Google's email identified it as a test subscription. Checkout itself
and transaction acknowledgement were not independently inspected.

Around 12:11 the screen briefly showed subscription offers, then returned to
Canasta automatically by 12:12 without another purchase. Google's
[test subscriptions use accelerated renewal](https://developer.android.com/google/play/billing/test#renewal-periods),
but that alone does not establish this transition was correct. The subsequent
provider check below confirms a renewal at that boundary; repeat the physical
scenario on the corrected build before marking renewal or expiry as passed.
The agent did not cancel, refund, reinstall, clear data or change store settings.
Private screenshots and the partial result are in ignored
`release/google-play/samsung-acceptance-2026-11-19/`; captures containing the
billing reference or system notifications are not store assets.

### Renewal Boundary Fix

The November 19 investigation reproduced a client-side race: the one-second
access timer expired the old paid period, but verification still considered the
snapshot recent. Offers could therefore appear before the next one-minute
customer refresh restored access. This explains a possible path to the observed
screen transition; the provider correlation below independently confirms renewal
at that boundary, without proving the exact timing of every native response.

The Premium controller now treats an ended active or still-renewing snapshot as
unresolved and requests customer information immediately, with at most three
automatic checks per expiry timestamp, at least five seconds apart. Existing
manual, focus and periodic refresh remain available. Checkout stays blocked
while unresolved; no local grace period or unverified access is granted.
Offer loading waits for an in-flight operation so confirmed expiry can display
prices, while verified renewal returns to the saved hand without a new purchase.

RevenueCat documents that Google Play can briefly report old expiry information
around renewal; this is not itself proof of cancellation. See
[Google Play renewal extensions](https://www.revenuecat.com/docs/customers/google-play-renewal-extensions).
The controller handles a reported still-renewing expired snapshot conservatively;
it does not infer a renewal from an empty entitlement or replace provider checks.

Verification: `task domain:test` (289 passed), `task build`, and
`npx playwright test tests/e2e/premium.spec.ts --workers=4` (72 passed across six
browser profiles). New regressions cover delayed renewal, inactive-but-renewing
responses, bounded retries, stale responses, busy operations, confirmed expiry,
and saved-hand preservation. S9-sized screenshots were visually inspected.
Browser billing is simulated, not evidence of a native store transaction.

These source changes are not in published closed-test bundle `1000010`. Preserve
that artifact and its verification record. A fresh signed `1000011` candidate
was prepared November 19 and passed packaging, 17 release-tool tests, five
mobile-config tests and `tauri:check`. Its upload preview hit Google's release-list
quota (HTTP 403) before any upload. See the
[release handoff](google-play-release.md#current-status). Upload it to closed
testing and repeat the physical renewal/expiry checks before marking those rows
passed. Do not assume the installed `1000010` contains the fix.

### Provider Correlation

After Martin unlocked the Mac, the November 19 read-only RevenueCat check matched
the Samsung billing reference to the day's sandbox customer. No API keys were
read, and no subscription, entitlement or integration settings were changed.
Times below are Europe/Oslo; the dashboard displays UTC, one hour earlier.

- Initial monthly sandbox purchase: 11:56, `barbu_premium:monthly`, NOK 33.
- Six renewal events: 12:01, 12:06, 12:11, 12:16, 12:21 and 12:26.
- The boundary renewal purchased at 12:11:21, extended expiry to 12:16:21, and
  has an event timestamp of 12:11:58. Its environment is `SANDBOX`, store
  `PLAY_STORE`, and entitlement `premium`. These timestamps correlate with the
  offers screen around 12:11 and automatic Canasta return by 12:12; they do not
  measure the exact native response latency.
- Final expiry: 12:31:21, recorded at 12:31:54, with reason `BILLING_ERROR`.
  RevenueCat now shows the sandbox entitlement inactive. Ending after six
  renewals is consistent with Google's documented test-renewal limit, not proof
  of a production payment failure. The recorded reason alone does not establish
  the cause of that final sandbox expiry.

Google documents approximately five-minute monthly test periods and at most six
renewals in [billing testing](https://developer.android.com/google/play/billing/test#renewal-periods).
Sandbox amounts are not production revenue. This confirms provider-side monthly
renewals, not direct Play acknowledgement status or annual checkout. Those
checks and fixed-build physical renewal/expiry behavior remain pending. Sanitized
provider evidence is kept with the ignored Samsung acceptance record; do not
publish customer references or order identifiers.

## Purchase Support Rehearsal

Use the existing [support procedure](premium.md#support-procedure), with a
dedicated sandbox customer, not a real purchaser. No deletion, cancellation or
refund is authorized by this preparation.

- [ ] Inspect Barbu's RevenueCat integrations and verify destinations against the privacy declaration; never change the shared ISV project casually.
- [ ] On a configured phone, open Premium -> Purchase support -> Load billing reference -> Contact support. Confirm a private draft opens; send only with Martin's approval.
- [ ] Look up the sandbox customer and aliases privately; confirm store, entitlement and test transaction without treating an identifier as proof of ownership.
- [ ] Rehearse the reply: reconnect, Check access, Restore purchases, then investigate; never ask the user to buy twice or uninstall.
- [ ] With separate explicit authorization, rehearse a verified sandbox deletion request and verify completion and access consequences. Deleting RevenueCat data does not cancel Google Play billing. Follow the [customer-profile procedure](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile).
- [ ] Confirm no local gameplay data was deleted and record only a redacted outcome.

## Production Decision

Do not promote while billing lifecycle, support rehearsal, bank verification or
launch-price approvals remain unresolved. Check the exact candidate's pre-launch
report, legal pages and published Data safety declaration; then obtain approval
for production promotion and the matching listing. Keep the release under review
unchanged meanwhile. Complete the next game's [Euchre specification](euchre.md)
separately; no second Premium game or tablet redesign is part of this release.
