# Google Play Store Assets

## Listing Copy and Feature Graphic

The `en-GB` title and descriptions are maintained in
[`listing-en-GB.json`](listing-en-GB.json). The positioning is learning and
single-player practice before playing with people in person, not online
multiplayer. Club search opens Google Maps; it is not a verified directory.

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
release tracks. Production was empty then; the November 4 production submission
is now in review (see [release status](../../google-play-release.md)). Review/publication status must still
be checked in Play Console's Publishing overview. API receipts and the prior
listing backup are in `release/google-play/screenshots-2026-11-03/` (ignored).

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
