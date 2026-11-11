# Barbu Marketing Videos

Status: the three quiz Shorts and piano-backed store trailer are public on
YouTube. The trailer's Google Play listing update was submitted November 11,
2026; the last observed status was pre-review checks. No paid advertising or
external uploads are performed by the capture script.

This is one execution channel within the [market-entry strategy](strategy.md).
That strategy owns audiences, organiser outreach, budgets, measurement and
monetisation decisions. The videos form the initial organic publishing
experiment; publication alone is not evidence of audience reach or acquisition.

## Google Play Store Trailer

Published on the dedicated [Barbu channel](https://www.youtube.com/@BarbuLearnCardGames):
[Barbu: Learn Card Games | Official Preview](https://www.youtube.com/watch?v=dCkYZDe2oN4).
YouTube categorises this portrait upload as a Short; Play uses the standard watch
URL without sharing parameters. Studio confirmed public visibility, embedding
enabled, no age restriction and no copyright claims. The audience setting was
corrected to not Made for Kids with Martin's approval, and the description
includes the recording credit below.

The Play API validated, committed and freshly verified the `en-GB` video URL on
November 11. Listing text, images, app details and release tracks were unchanged.
Martin also approved submitting the existing pending trader-status declaration.
Publishing overview subsequently showed pre-review checks, with automatic review
submission after successful checks. This is not confirmation of public listing
availability. Receipts are in ignored
`release/google-play/store-video-1794397303061/`.

Separate from the quiz shorts: a 36-second, 1080 x 1920 portrait trailer with
actual Hearts decisions and feedback, the learning path, a guided Hearts trick,
a Gin Rummy discard and scoring explanation, and the game catalog. The final
three seconds carry the Barbu identity and "Learn here. Play together."

With the local server running on port 1420:

```sh
node scripts/marketing/render-store-trailer.mjs
```

Preview: `http://localhost:1420/release/marketing/store-trailer/preview.html`.
The MP4, source recording, full-resolution UI captures, sampled video frames and
provenance are generated under ignored `release/marketing/store-trailer/`.
The editable timing and headlines are in [store-trailer.json](store-trailer.json).
This command rebuilds from the current UI, not an old local export. Review any
recapture against the production version before publishing.

The edit keeps the real UI intact, apart from making its outer background match
the full-bleed green. The guided-hand sequence (12-20.5 seconds) uses the entire
frame without an additional trailer heading: a 360 x 640 capture instead of
360 x 560, giving the responsive table and hand more room without cropping or
shrinking them. The renderer checks table-slot spacing and visible controls.
Each shot has one editorial spotlight: the table, the selected card, or the
explanation. Unrelated interface elements are dimmed in the same green, and a
gold outline identifies the focus. Focus bounds come from actual DOM elements,
not hand-positioned coordinates. The highlights are video annotations, not
features added to the game. Selection holds last 1.5-2 seconds; captions describe
the specific action instead of repeating generic feature claims.
Both Hearts explanations last 4.5 seconds, and the Gin score breakdown lasts
5 seconds. The extra six seconds compared with the first cut go to reading and
card decisions, not the catalog or end card. Export length, frame count and
preview copy follow the storyboard's declared duration; each stage gets a
midpoint inspection frame named `preview-<stage-id>.png`.
Only chapter boundaries dissolve; card selections and
feedback are actual browser states. It does not change phone saves or game code.
The trailer has quiet piano music and remains understandable when muted. No
third-party video footage, price claims, store badges or download prompts are included. The Tricky
Bridge reference informed pacing, not artwork or copy.

Google Play supports portrait previews and recommends early gameplay, at least
80% representative experience, and short videos that work muted. This trailer
shows the interface for 33 of 36 seconds. For future replacements, upload to
YouTube as public or unlisted, enable embedding, disable monetization and avoid
age restrictions. Add that video's URL to the main listing. The renderer does
not upload anything or alter Play Console.

Source checked November 11, 2026:
[Google Play preview-video requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

### Store Trailer Music

Beethoven's *Für Elise*, WoO 59, performed by V. Gao (Gaodifan), recorded July 18,
2006. The [recording's Commons page](https://commons.wikimedia.org/wiki/File:FurElise.ogg)
lists a worldwide public-domain release and CC0 1.0, including commercial reuse.
This is clearance information for this recording, not an assumption that every
recording of Beethoven is free to use. Checked November 11, 2026; the reviewed
page revision, download URL, licence and SHA-256 are in `store-trailer.json`.

The renderer downloads the original Ogg only when absent, validates its pinned
checksum, and caches it alongside the ignored export. A clone needs network
access for the first render; no music binary or credentials are stored in Git.
The opening 36 seconds are trimmed, normalised towards -24 LUFS, faded in over
0.8 seconds and out over the final 3 seconds, and encoded as stereo AAC at 48 kHz.
The main MP4 contains music; `barbu-store-trailer-silent.mp4` preserves the same
picture without audio. The preview provides both downloads and music credits.

Suggested YouTube description credit: "Music: Für Elise, WoO 59, by Ludwig van
Beethoven. Performed by V. Gao (Gaodifan), via Wikimedia Commons, CC0 1.0.
Excerpt with loudness adjustment and fades. https://commons.wikimedia.org/wiki/File:FurElise.ogg"

Check YouTube's copyright checks before adding the trailer to Play Console.
The public-domain dedication does not guarantee that an automated Content ID
claim will never occur; retain the source and licence evidence if one does.

## Current Three-Video Pilot

All three published Shorts use one borderless layout and capture/render pipeline. The
storyboards, exercise selectors, expected feedback and base post captions
live in [learning-shorts.json](learning-shorts.json).

| Video | Lesson idea | Local preview (under `release/marketing/`) | Published Short |
| --- | --- | --- | --- |
| 01 Hearts | Pass the exposed queen, king and ace of spades in this hand | `hearts-pass-three/preview.html` | [Watch](https://www.youtube.com/shorts/L0XjoP9RTyI) |
| 02 Gin Rummy | Discard K♠, keep three melds, leave two deadwood points | `gin-find-the-discard/preview.html` | [Watch](https://www.youtube.com/shorts/IxSzRsMINXw) |
| 03 Gin Rummy | Two deadwood points allow a knock, but not gin | `gin-knock-or-gin/preview.html` | [Watch](https://www.youtube.com/shorts/zBTSt8WoQ5s) |

Each preview includes an MP4 download, draft caption and links to the other
videos. Each video stands alone; the two Gin videos also form a small sequence.
All three were published publicly on `@BarbuLearnCardGames` on November 11,
2026, with the recipe titles and captions plus Google Play and trailer URLs.
The videos are set to not Made for Kids, consistent with the confirmed general
audience. YouTube's upload checks reported no issues; Studio listed all three
as Public/Published and anonymous oEmbed requests resolved their titles and
channel. No paid promotion, scheduled posts or community outreach was performed.

The channel profile now has a saved "Get Barbu on Google Play" link to
`https://play.google.com/store/apps/details?id=com.martin.barbu`.
URLs in Shorts descriptions are not clickable; direct viewers to the channel
profile rather than claiming a clickable description link. A related-video link
to the trailer could not be added: YouTube requested one-time advanced-feature
verification. Martin must complete that verification before we add those links.
No identity verification or channel-wide audience changes were performed.

### Distribution and Measurement

- Treat these three posts as a first organic test, not a promise of Shorts-feed reach.
- Share the relevant quiz with existing testers and club organisers; disclose
  authorship and ask permission before posting in moderated groups. Avoid mass
  posting, paid engagement or requests for positive ratings.
- Review Shorts analytics after roughly 48 hours and again after seven days:
  engaged views, stayed-to-watch versus swiped-away, average viewing duration,
  percentage viewed, subscribers and useful comments. Do not judge by raw views alone.
- Compare Google Play acquisition over the same period, but do not claim installs
  were caused by YouTube without attribution evidence. The current profile link
  is a plain store URL, not a per-video attribution setup.
- Make the next quiz based on the clearest response; a Whist decision would test
  the audience behind our "learn whist" discovery concern. Do not buy ads yet.

Platform guidance checked November 11, 2026:
[Shorts uploads](https://support.google.com/youtube/answer/12779649),
[clickable-link rules](https://support.google.com/youtube/answer/13748639).

With the local Barbu server available on port 1420:

```sh
node scripts/marketing/render-learning-short.mjs hearts-pass-three
node scripts/marketing/render-learning-short.mjs gin-find-the-discard
node scripts/marketing/render-learning-short.mjs gin-knock-or-gin
```

Each export is silent, 24 seconds, 1080 x 1920, H.264 at 30 fps. The shared
renderer checks actual card counts, selections and lesson feedback before
encoding, then checks transparent crops, overlap-free frames and video decoding.
The original `render-hearts-pass.mjs` command remains a compatibility wrapper.

Keep the visual template stable for this initial audience test. Assess whether
the main takeaway is readable without the smaller gameplay text. A narrated
version can be a later comparison, not an assumed improvement. Before publishing,
review each native platform preview and approve the caption and destination.

## First Video: Pass Three in Hearts

Prepared November 10, 2026. Google Play's production API now reports 1.0.6
(1000007) as published, and the public Norway listing responds without login.
The new draft therefore ends with "Free on Google Play", not "Follow for launch".

Run with the local Barbu server available on port 1420:

```sh
node scripts/marketing/render-hearts-pass.mjs
```

Open `release/marketing/hearts-pass-three/preview.html` directly in a browser,
or play `release/marketing/hearts-pass-three/barbu-hearts-pass-three.mp4`.
The export is 24 seconds, 1080 x 1920, H.264 at 30 fps, silent. Its edit uses
actual lesson screenshots and card art, not generated gameplay. The original
browser recording, screenshots and provenance are kept alongside the export.
Gameplay crops use a temporary transparent screenshot backdrop, so cards and
feedback sit directly on the same full-bleed green as the rest of the video.
There is no decorative frame. The preview preserves the 9:16 aspect ratio and
uses matching green outside the video on differently proportioned screens.
The renderer uses an isolated browser and a repeatable exercise seed; it does
not change production UI, phone progress or the store listing.

Storyboard:

- 0-3 seconds: the queen of spades and her 13-point cost.
- 3-9 seconds: see the hand and choose a pass, with a three-second countdown.
- 9-12.6 seconds: real selection states for Q♠, K♠ and A♠.
- 12.6-19 seconds: the actual "Good pass" response and a concise explanation.
- 19-24 seconds: Barbu, "Learn here. Play together.", and Google Play.

This is a hand-specific lesson, not a claim to always pass these cards. They
are the only spades in this exercise. High hearts still need care, and incoming
cards may change the plan. Nothing is uploaded or posted by this script.

Suggested post title: **Which three cards would you pass in Hearts?**

Suggested caption:

> Q♠, K♠ and A♠ are your only spades. What would you pass? In this hand,
> passing all three removes the queen and the two cards that could catch her
> later. Recheck your plan after receiving cards. Learn Hearts with Barbu,
> free on Google Play. Learn here. Play together. #Hearts #CardGames #Barbu

Destination: https://play.google.com/store/apps/details?id=com.martin.barbu

Verify the native platform preview before posting; overlay positions vary.
Review this silent edit before adding narration or properly licensed music.
Earlier prototypes below retain pre-launch wording and must not be posted as-is.

## Creative Direction

Lead with a card decision, give viewers time to choose, then show the result.
One useful idea per short, followed by a brief Barbu sign-off. The audience is
curious beginners and card-club players practicing between in-person games.
Test this approach before investing in cinematic generated footage.

The first two scripts and platform captions are in `shorts.json`:

- Hearts: would you play the ace? A low club avoids this trick's heart penalty.
- Gin Rummy: discard the king, preserving three melds and leaving two deadwood.

These are real guided exercises, not recordings of complete matches. The
browser captures use the same TypeScript rules as the installed game. They show
the current working tree, not necessarily the submitted App Store build.
In particular, verify Gin availability before promoting it as downloadable.
Static holds use full-resolution screenshots from the same session to preserve
small card labels; the recording supplies the selection/result transitions.

## Rebuild

Prerequisites: installed npm dependencies, Playwright Chromium, `ffmpeg` and
`ffprobe` on PATH. Start `npm run dev -- --port 1420`, then run:

```sh
node scripts/marketing/render-shorts.mjs
```

`BARBU_CAPTURE_URL` can select another local server. The script uses separate
browser storage and does not modify phone saves. It checks the real feedback,
image loading, page errors, output dimensions and duration. The source commit
and dirty-worktree status are recorded with each export. Re-running replaces
the generated drafts; it does not alter game code.

Outputs under ignored `release/marketing/shorts/`:

- Two MP4s: 1080 x 1920, H.264, 30 fps, 18 seconds, without audio.
- Per-short raw browser video, title plates, actual lesson screenshots,
  opening/reveal/ending preview frames, and `capture.json` provenance.

Review all three preview frames and watch the complete MP4 on a phone. Important
copy stays away from the extreme top, bottom and right edge, but check each
platform's upload preview because its controls and captions can cover content.
There is no soundtrack, so no third-party music license is assumed.

## OpenAI Workflow

The scripts, captions and edit structure were authored with OpenAI assistance;
the logo/card art are existing Barbu assets. The gameplay itself is not generated.

Optional narration text is included in `shorts.json`. An OpenAI API credential
was not available when preparing this pilot; no speech request was made. A later
voice pass can use OpenAI text-to-speech, then retime the edit to the actual audio.
Disclose AI narration to viewers if it is added; do not claim a silent draft has
voiceover. Keep API credentials outside the repository and frontend bundle.

OpenAI lists September 24, 2026 as the shutdown date for Sora 2 and the Videos API.
Do not build a new production workflow around that endpoint.

- [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations)
- [OpenAI text-to-speech and disclosure](https://developers.openai.com/api/docs/guides/text-to-speech)

## Distribution Checklist

1. Confirm the Barbu TikTok and YouTube channel handles and ownership.
2. Approve the complete video, title, caption and destination link for each post.
3. Keep "Follow for launch" while availability is unconfirmed. Google Play
   production was in review at the November 4 check; verify the current state
   and a non-tester install before changing the call to action. Verify Apple
   availability separately. Closed testing is not a public release. Do not send
   public audiences through an unexplained tester-enrollment flow.
4. Upload natively to each platform or connect an authorized scheduling service
   such as Metricool. Nothing is connected or scheduled by this pilot.
5. Check platform-specific AI/commercial-content disclosures at publication.
   Verify music rights separately if audio is added; a platform library track
   must not be assumed licensed for cross-posting or advertising.
6. Verify the final mobile preview, captions, profile identity and link before
   making each post public. Never buy reach or start a paid campaign implicitly.

Start with these two organic posts on different days. This is an experiment,
not an audience-growth guarantee. Record results after 24 hours and seven days:

| Short | Platform | Post URL | Date | Views | Avg. watch time | Completion | Profile visits | Link clicks | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hearts | TikTok | | | | | | | | |
| Hearts | YouTube | | | | | | | | |
| Gin Rummy | TikTok | | | | | | | | |
| Gin Rummy | YouTube | | | | | | | | |

Use only metrics actually available in each account; leave unavailable fields
blank rather than inferring installs from views. Try a different opening hook
on the next batch while keeping the lesson format comparable.
