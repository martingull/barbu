# Christmas Card-Table Shorts

Updated November 11, 2026. The two original promotional Shorts were made
**Private** in YouTube Studio at Martin's request. They were not deleted, so
their history and any comments remain attached to the original uploads.
The larger-card replacement dilemmas were **published November 11, 2026**:

- [Christmas Hearts: which three would you pass?](https://www.youtube.com/shorts/QocN5A-wAdI)
- [Christmas Gin Rummy: would you discard this king?](https://www.youtube.com/shorts/eA4QMbcBESM)

Both cleared YouTube's copyright checks with no issues found at publication.
Both are Public, with general-audience settings, comments On (Basic moderation,
Anyone), music attribution and the generated-backdrop disclosure. Anonymous
oEmbed checks returned 200 for both new videos and 403 for both retired uploads.
No comments were posted on Martin's behalf.

Retired uploads:

- [Bring Hearts to the Christmas table](https://www.youtube.com/shorts/ZelvyQX3OsQ)
- [Just two of you this Christmas? Try Gin Rummy](https://www.youtube.com/shorts/6ok3_bi-7n4)

These links identify the retired uploads and will not play publicly. Both
visibility changes were saved and verified as Private in Studio. Their original
links also returned 403 to anonymous oEmbed checks, while the unchanged public
Grieg-backed Hearts dilemma returned 200. Their original
recipe, including Jingle Bells source/credit, is retained in
[archive/christmas-adverts-2026.json](archive/christmas-adverts-2026.json).
No other videos, comments, advertising or Google Play listings were changed.

The new format provides a card decision worth discussing without downloading
anything: cards in the first frame and throughout, a choice with reasoning,
a remaining risk, then a question. No sales hook, countdown, large logo ending,
store link or download pitch. Christmas is the setting, not a sales message.
These reuse actual Hearts pass and Gin discard lessons. The Gin opponent's
Q♠ pickup is explicitly hypothetical, not represented as captured gameplay.

| Short | Real lesson | Local preview |
| --- | --- | --- |
| Christmas Hearts: which three would you pass? | High spades versus remaining high hearts; ask what the family would pass | http://localhost:1420/release/marketing/christmas-hearts-dilemma/preview.html |
| Christmas Gin Rummy: would you discard this king? | Keep the melds; consider whether the discard helps the opponent | http://localhost:1420/release/marketing/christmas-gin-dilemma/preview.html |

## Render and Review

Start the existing development server on port 1420, then run:

```sh
node scripts/marketing/render-learning-short.mjs christmas-hearts-dilemma --campaign christmas
node scripts/marketing/render-learning-short.mjs christmas-gin-dilemma --campaign christmas
```

The same renderer still accepts the original evergreen ids without a campaign
argument. Seasonal copy and pacing are in [christmas-shorts.json](christmas-shorts.json),
which references the original lesson records instead of duplicating their card
choices, expected feedback or capture selectors.

Each export is 32 seconds, 1080 x 1920, H.264 at 30 fps and full bleed, with
quiet orchestral music (stereo AAC, 48 kHz). A `-silent.mp4` alternative is kept.
Timing: 7-second question, 6-second selection, 7-second explanation,
7-second remaining risk and 5-second discussion question.
Captions and discussion starters are included on each preview page.
The hand capture uses a taller 390 x 850 viewport to avoid compact-height card
shrinking. Cards retain the two-row layout and render at least 100 pixels wide
in the 1080-pixel export, with selection states preserved.

Outputs, raw captures, midpoint inspection frames and capture provenance live
under ignored `release/marketing/christmas-hearts-dilemma/` and `christmas-gin-dilemma/`.
Old render folders are retained separately; do not upload those retired MP4s.
The renderer checks real lesson states, selected cards, feedback, transparent
captures, editorial text overflow, pairwise overlap, safe margins, frame count,
duration and video decoding. Inspect the previews on a phone-sized viewport
before publishing; platform captions and controls must not cover the teaching.
Keep these time-sensitive videos out of the evergreen store trailer slot.

## Artwork Provenance

`assets/christmas-felt.png` is a generated photographic-style backdrop created
with OpenAI's built-in image tool on November 11, 2026 and retained in the repo.
It is decorative artwork, not a real venue or a screenshot. Card art, hands,
selection states and feedback are captured from Barbu, not image-generated.
Rebuilding the videos reuses the saved bitmap; it does not regenerate the art.

Generation brief: portrait 9:16 overhead dark-green felt, close to `#102b22`,
with a fine natural texture and an empty central area for real cards and text.
Small fir sprigs and crimson ribbon appear at the extreme top-right and
bottom-left edges, without an enclosing border. Soft even light; no text,
logos, people, cards, candles, baubles, glowing dots or bokeh. The full-bleed
bitmap is shared by every stage so gameplay crops have no mismatched rectangles.

Review future renders before publishing. Retain the
AI-use disclosure for the generated photographic backdrop and the music credit.
Publishing a replacement requires a new upload, not changing the old video's title.

## Music

Both replacements use the opening of Smetana's **Vltava (The Moldau)**,
performed by the Czech National Symphony Orchestra / Musopen Symphony Orchestra.
The [specific Commons recording](https://commons.wikimedia.org/wiki/File:Smetana,_M%C3%A1_vlast_-_Vltava_-_The_Moldau.ogg)
is released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
It is not a Christmas composition; it supplies a gentler orchestral background
while the artwork supplies the seasonal setting. Keep the courtesy credit from
the draft caption. The licence does not guarantee that a platform will never
flag the recording. Do not substitute a commercial performance of the same work.

The renderer downloads the reviewed recording to ignored output on first use,
then checks its SHA-256 before reuse. No music binary is stored in Git. Network
access is needed for the first render after cloning. The first 32 seconds are
normalized to -26 LUFS before a 0.8-second fade-in and 2.5-second fade-out. Video
frames are copied without re-encoding when adding audio. The preview includes
music and silent downloads, and capture metadata records the source and filters.
