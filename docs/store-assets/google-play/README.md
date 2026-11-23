# Google Play Store Assets

## Listing Copy and Feature Graphic

The discovery and optional Canasta update share one unpublished text draft,
[`listing-premium-en-GB.draft.json`](listing-premium-en-GB.draft.json).
It is text-only and must not replace the saved copy or trailer during the current
production review. See the [discovery baseline and rollout plan](../../marketing/store-discovery.md).
The [Premium launch plan](../../premium-launch.md#listing-and-screenshots)
defines the new screenshot sequence and required native-release provenance.
The existing screenshots and `manifest.json` below remain unchanged.

### French Listing Draft

[`listing-fr-FR.draft.json`](listing-fr-FR.draft.json) is a separate, unpublished
French-language text draft prepared November 23, 2026. Its short description
and opening paragraph explicitly disclose that menus, lessons and guided hands
are currently in English. It advertises only implemented games, not the proposed
Belote, Coinche or Tarot additions. This is store localisation, not an in-game
translation or a France-only distribution setting.

Have a fluent French reader check terminology before publication. Follow the
same review safeguards as the English refresh: back up and reconcile any existing
`fr-FR` listing, update only the approved text fields, and preserve the saved
English copy, trailer, artwork, tracks, countries and subscription settings.
Do not assume text localisation also translates English screenshots or the
trailer. Native gameplay images must remain truthful; review the French listing
preview and asset fallbacks before submitting. No upload or review cancellation
is authorised by preparing this draft.

The `en-GB` title and descriptions are maintained in
[`listing-en-GB.json`](listing-en-GB.json). The positioning is learning and
single-player practice before playing with people in person, not online
multiplayer. Club search opens Google Maps; it is not a verified directory.

On November 23, 2026, a read-only API audit confirmed the saved text is still
the November 3 copy and the saved video is version 2 (`FeuhyBNAAv0`). The local
JSON's stale version-1 video URL was corrected to match that saved value; this
did not publish anything. Production 1.0.10 (1000014) was in review and 1.0.9
(1000013) was published. The inspection edit was discarded.

[`feature-graphic.png`](feature-graphic.png) replaces the old screenshot with
blurred side panels. It is a 1024 x 500, 24-bit PNG, visually inspected after
export. It uses the King of Cards identity and "Learn here. Play together."
The built-in image generation tool created the promotional artwork using
`src-tauri/icons/icon.png` as its visual reference. The generation prompt is
recorded in [`feature-graphic-prompt.txt`](feature-graphic-prompt.txt).
The generated image was proportionally resized and minimally centre-cropped to
Google's exact dimensions; this artwork is not presented as a gameplay screenshot.

On November 3, 2026, a separate API edit validated and committed the new title,
descriptions and feature graphic. A fresh API read verified the saved copy and
graphic checksum, unchanged screenshots, icon, tablet images, app details and
release tracks. Production was empty then; the production API reported 1.0.6
(1000007) published on November 11 (see [release status](../../google-play-release.md)).
Review/publication status of later listing edits must still
be checked in Play Console's Publishing overview. API receipts and the prior
listing backup are in `release/google-play/screenshots-2026-11-03/` (ignored).

## Preview Video

The `en-GB` listing now stores
[`https://www.youtube.com/watch?v=FeuhyBNAAv0`](https://www.youtube.com/watch?v=FeuhyBNAAv0).
This is the 30-second version 2 portrait trailer on `@BarbuLearnCardGames`, with
one focused Hearts learning journey, guided play, the game catalog and credited
Beethoven piano music. YouTube confirmed public visibility, embedding enabled,
no age restriction and copyright checks with no issues found.
See [the video recipe and provenance](../../marketing/README.md#google-play-store-trailer).

On November 12, 2026, the video-only API edit validated and committed. A fresh
read verified the URL and unchanged listing text, images, app details and release
tracks. Martin approved replacing the video during review; the commit explicitly
cancelled the pending review and resubmitted the replacement alongside the
previously approved trader-status declaration. Play Console showed pre-review
checks with automatic submission after successful checks, not completed review
or confirmed public availability. The backup and receipts are in ignored
`release/google-play/store-video-1794490533632/`.

Version 1 (`dCkYZDe2oN4`) was submitted November 11 and remains public while the
replacement is reviewed. Its earlier receipts remain in ignored
`release/google-play/store-video-1794397303061/`.

## Phone Screenshots

Captured November 3, 2026 from the Android `1.0.6` / `1000007` closed-test
bundle on an API 35 emulator. These are actual native-release screens, not
browser mockups. Each image is a 1080 x 1920, 24-bit PNG without transparency.
The eight files total 3,091,601 bytes.

## Display Order

1. [Learn by playing](phone/01-learn-by-playing.png): a card decision and immediate explanation.
2. [Learning path](phone/02-hearts-learning-path.png): the Hearts lesson sequence.
3. [Guided Hearts](phone/03-guided-hearts-hand.png): rules and tactical advice during a full hand.
4. [Gin Rummy](phone/04-gin-rummy.png): stock, upcard, meld and deadwood.
5. [Bridge](phone/05-bridge-contract-and-dummy.png): contract, dummy, seat roles and legal play.
6. [Spades](phone/06-spades-partnership.png): partnership bids and match scoring.
7. [Barbu](phone/07-barbu-contracts.png): the first of seven training-session contracts.
8. [Whist](phone/08-whist-partnership.png): partnership play and the turned trump.

## Provenance

`manifest.json` records the source bundle checksum, capture settings, file order,
descriptions and image checksums. Android screenshot demo mode standardizes the
status bar. The game UI, content and cards were not restyled or composited.
PNG encoding removes only the unused alpha channel; decoded RGB pixels were
verified identical to the raw screenshots. No cropping, resizing or promotional
overlays were applied.

Raw captures, the previous three store images, temporary capture tooling and API
receipts are in the ignored `release/google-play/screenshots-2026-11-03/` folder.
Keep these store assets out of `public/` so they are not bundled with the game.

The target is the `en-GB` main listing's **phone screenshots** only. The app icon,
feature graphic, tablet screenshots, listing copy and release tracks are separate
assets/settings and must not be overwritten by this screenshot replacement.

## Upload Status

Prepared, visually inspected and committed through the Play API on November 3,
2026. The first attempt failed validation with HTTP 403 and was discarded.
After Martin enabled the service account's listing permission, the retry passed
validation and committed successfully. A fresh API edit verified all eight
saved checksums and their display order against the manifest, then was discarded.

The replacement changed only the `en-GB` phone screenshots. Release tracks,
listing text, icon, feature graphic and tablet images were verified unchanged.
Production was empty at that verification. This confirms the saved listing assets, not public
availability or completion of any Google review. Check Play Console > Publishing
overview for review/publication status, and Store listings > English (United
Kingdom) > Phone screenshots to inspect the saved set. Do not rerun the original
replacement script: its old-image guard deliberately rejects the updated set.

For a future refresh, capture the exact release being advertised and inspect each
screen for clipped cards, unreadable controls and accidental notifications.
Do not stretch phone captures into tablet screenshots. See Google's
[preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151).
