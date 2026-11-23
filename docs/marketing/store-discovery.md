# Google Play Discovery

## Current Decision

Keep **Barbu: Learn Card Games**. Make the learning offer concrete before
considering another name change. Lead with Gin Rummy, Hearts and Whist, while
retaining the wider catalog and the optional Canasta subscription distinction.

The [single text-only draft](../store-assets/google-play/listing-premium-en-GB.draft.json)
now proposes:

> Learn Gin Rummy, Hearts and Whist with short lessons and guided hands.

The full description starts with card decisions, feedback and preparation for
in-person play. It names the games naturally, explains English-language lessons,
and does not imply multiplayer or universal bidding conventions. Card Counting
is described as a learning activity, not a second Play mode.

This is **prepared, not uploaded**. On November 23, 2026, the Publisher API
reported production 1.0.10 (1000014) in review and 1.0.9 (1000013) published.
Do not cancel or resubmit that review for this experiment.

## Public Search Baseline

Captured November 23, 2026 with signed-out Chromium, an English locale and
explicit country parameters on Google's public web store. Counts are unique
app cards returned by the page, not the size of Google's full search index.

| Country parameter | Query | Returned app cards | Barbu observed |
| --- | --- | --- | --- |
| Norway | learn card games | 30 | No |
| Norway | Barbu Learn Card Games | 30 | First card |
| US | learn card games | 30 | No |
| US | learn gin rummy | 11 | No |
| US | learn whist | 30 | No |

Raw results, URLs, timestamps and page screenshots are local, ignored artifacts:
`release/google-play/discovery-2026-11-23/baseline.json` and adjacent PNG files.
They are not included when someone clones the repository.

Interpretation: the listing is discoverable by name in this sample, but broad
and game-specific discovery is weak. This does not establish authenticated
phone rankings, explain the ranking algorithm, or prove unavailability in
other countries. Device, language and account context can change results.

## Console Baseline

The screenshot supplied November 23, 2026 (16:15) shows the following for
**October 24-November 20, 2026**. The top summary and individual listing are
different scopes; do not combine their counts or rates.

| Scope | Visitors | Unique user install clicks | Rate | Evidence |
| --- | --- | --- | --- | --- |
| Top performance summary | 139 | 33 | 24% CTR, rounded | Screenshot |
| Default listing | 130 | Not shown | 16.2%, exact metric unconfirmed | Visitors in screenshot; rate reported separately by Martin |

The earlier estimate of approximately 21 default-listing conversions was
arithmetic from the reported figures, not a verified count. The screenshot
confirms 33 install clicks only for the top summary, not 33 completed installs
or the default-listing numerator. Country, traffic-source and new/returning-user
filters remain unconfirmed. The screenshot is a local Desktop file, not a
committed asset or an independently inspected Console export.

The summary reports visitors up 456%, install clicks up 38% and CTR down 75%
relative to the previous period. The large CTR decline alone does not establish
a worse listing: traffic volume and possibly audience composition changed.
Do not attribute the change to outreach, organic discovery or a particular edit
without a traffic-source breakdown.

This is a different window from the requested October 26-November 22 baseline.
Keep it as a separate observation; use matching dates for later comparisons.
The small sample does not establish whether conversion is above or below peers.

For the 28 complete days **October 26-November 22, 2026**, export
**Grow users > Store performance > Conversion analysis**. Record exact filters
and the Console reporting timezone. Start with the main listing's overall
traffic and a traffic-source breakdown, then inspect countries and search terms
separately. Record new/returning-user selection. Keep raw exports outside the
public repository.

Google distinguishes branded Google Play search from Google Play explore,
which also includes category-style searches. Do not filter only to branded
search when assessing discovery for "learn card games". Ads and referrals are
another source; outreach clicks are not evidence of organic search visibility.

| Measure | Baseline | Source |
| --- | --- | --- |
| Search listing visitors | Not yet exported | Conversion analysis |
| Unique user Install Clicks | 33 in Oct 24-Nov 20 top summary; requested window not exported | Screenshot / Conversion analysis |
| Listing CTR | 24% in Oct 24-Nov 20 top summary; requested window not exported | Screenshot / Conversion analysis |
| Completed user acquisitions | Not yet exported | Grow users / Statistics |
| Search terms bringing visitors | Not yet exported | Search-term breakdown |

Since July 2026, the listing report focuses on clicks. Install clicks are not
completed installs. A missing search-term row is unknown, not automatically
zero search impressions. Do not sum country and search-term reports as separate
audiences. The current release API tool does not retrieve these analytics.

See Google's [report definitions](https://support.google.com/googleplay/android-developer/answer/9859173?hl=en).
Do not infer acquisitions or retention from the public download band or Shorts
views. Do not add in-game tracking just to fill these blanks.

## Controlled Listing Update

1. Obtain the Console baseline and confirm the active review has finished.
2. Read and privately back up current listings, images, app details and tracks.
   Compare the saved copy with the local snapshot; stop if an intervening edit
   needs reconciliation. Get approval to publish the text refresh.
3. Update only `en-GB` title, short description and full description from the
   draft. Preserve the current video rather than writing the older trailer URL.
   Keep other languages, screenshots, icon, feature graphic, app details,
   subscriptions, countries and release tracks unchanged. Text work needs no AAB.
4. Validate, show the exact diff and check for other pending Console changes
   before committing. Do not silently submit unrelated changes or cancel review.
5. After approval, record when the new public text becomes visible and read back
   all preserved fields. Only then update `listing-en-GB.json` to the new text.

Google's [listing guidance](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en)
limits titles to 30 characters, short descriptions to 80 and full descriptions
to 4,000. Avoid keyword repetition and ranking claims. Better copy is a test,
not a promise that Barbu will rank for a particular query.

## Screenshot And Content Follow-Up

### French-Language Discovery

Martin requested a French listing and French-game expansion on November 23.
The [French text draft](../store-assets/google-play/listing-fr-FR.draft.json)
is prepared, not published. English-only content is disclosed in the short
description and first paragraph. Premium availability remains country-dependent;
this does not enable checkout in France, Algeria or any additional market.

France and Algeria's positive installed-audience changes justify a small
language test, not a claim that those users speak French or prefer a particular
game. Check the Console device-language breakdown alongside country, visitors
and install clicks. Do not treat `fr-FR` as a France-only audience or assume all
Algerian players use French. Google supports store translations separately from
in-game translations; see its [localisation guidance](https://support.google.com/googleplay/android-developer/answer/9844778?hl=en).

Publish only after the active review has finished and the French copy and asset
preview have been approved. Record the publication date and compare matched
French-language cohorts before committing to translating the curriculum.
Proposed French games are tracked in the [game roadmap](../game-roadmap.md),
not advertised in the listing before implementation and verification.

### Visual Refresh

Keep the existing native artwork and version-2 trailer for this text test.
For the next visual refresh, capture the downloadable Android build and make
the first three images show **a card choice, its feedback, then guided play**.
Show a readable Gin Rummy example early. Preserve actual UI and record bundle,
device, capture settings and hashes in the store-asset manifest; browser captures
must not be relabelled as native-release screenshots.

Use Gin Rummy decision videos and relevant game-specific website pages as
separate discovery channels. Keep direct Play links in outreach and supported
video descriptions. Do not buy reviews or promise clubs use rules we do not teach.

## Review The Result

After publication, repeat the same web checks at 7, 14 and 28 days. Compare
Console visitors, install clicks, CTR and completed acquisitions over matched
complete periods, with country and traffic-source filters unchanged. Record
outreach, video releases and binary updates as possible confounders.

More visitors with unchanged CTR suggests improved reach; unchanged visitors
with higher CTR suggests a clearer offer. Small counts cannot establish a winner.
If traffic remains low, test one game-specific landing/listing offer next rather
than adding keywords indiscriminately. No paid campaign is authorised by this plan.
