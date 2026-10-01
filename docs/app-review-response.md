# App Review Response

## October 1 Resubmission: Guideline 4.2

Candidate: `1.0.4 (5)`. Uploaded and processed October 1. Martin confirmed that
the requested learning, saved-hand, Gin Rummy and Bridge flows work on the
physical iPhone 16 through TestFlight. Do not claim that the September 24 videos
show build 5; they show the previous `1.0.3 (4)` submission. Copy the final text into
App Review Information > Notes and the reply to the September 29 review message.

### Updated Review Notes

Hello App Review team,

Thank you for the feedback under Guideline 4.2. We have prepared a materially
updated version, 1.0.4 (5), to replace 1.0.3 (4).

We installed build 5 through TestFlight on a physical iPhone 16 (iOS 26.6.2)
and checked learning progression, saved-hand continuation, Gin Rummy and Bridge.
Native iPhone and iPad Air simulator journeys also passed. The two videos
previously supplied demonstrate build 4, not this updated build.

Barbu is an interactive, single-player card-game collection for beginners,
recreational players, and card-club players practising between in-person games.
It combines playable games against local computer opponents with short exercises
in which players choose cards or bids and receive feedback on their decisions.
It is not a collection of static rule pages.

Changes since the reviewed build:
- Added Gin Rummy gameplay, including stock/upcard drawing, melds, deadwood,
  knocking, gin, hand scoring, and saved matches.
- Reorganized the catalog by game family and added a three-decision Hearts
  introduction that leads directly into a full game or further learning.
- Expanded Barbu, Bridge and Gin Rummy learning with progressive decisions,
  clearer table context, and feedback specific to the chosen answer.
- Added consistent lesson completion, retry, next-lesson and reset actions,
  plus direct continuation of saved games from the catalog.
- Improved compact-screen layouts, result-screen scrolling and reachable controls.

Suggested review path:
1. Launch Barbu and select Try Hearts. Choose a card, tap Check answer, and use
   Next decision to finish the three decisions. Choose Play Hearts at the result.
   If the introduction is already complete, select Hearts, then Play Hearts.
2. Select three cards and tap Pass cards. Choose a legal card, tap Play card,
   and use Next trick to continue through a full hand and its scoring.
3. Return with Table, then Games. Open Gin Rummy and select Play Gin Rummy.
   Take or pass the opening upcard, then draw and discard; the hand shows melds
   and deadwood and supports knocking or gin when legal.
4. Open Bridge, choose Learn, and try the contract, declarer, dummy and defense
   exercises. They show the relevant cards and explain individual decisions.
   Play Bridge starts an auction followed by a playable 13-trick hand.

The catalog also includes full Hearts, Whist and Spades games, a seven-contract
Barbu training session, and Card Counting I memory exercises. Barbu's session is
explicitly a fixed-order training format, not a full tournament settlement.

No account, login credentials, sample files, purchases or subscriptions are
required. All listed games and lessons are accessible. Gameplay and progress
run locally and work offline; external support/privacy links need internet.
There are no ads, tracking, user-generated content, online multiplayer or
real-money gambling, and no regional feature differences.

The interface uses Svelte/TypeScript in Tauri and Apple's system web view.
There is no remote gameplay server or runtime AI service. GitHub Pages hosts
support/privacy pages; GitHub Issues and email provide support. ChatGPT was used
to generate artwork during development, not to process player data. Third-party
software notices are bundled. No affiliation with a federation or publisher is
claimed.

Contact: martin@insilicoveritas.org
Support: https://martingull.github.io/barbu/support.html
Privacy: https://martingull.github.io/barbu/privacy-policy.html

## Historical Draft: Guideline 2.1

The following draft is retained for context. Martin submitted the completed
response and two physical-device recordings on September 24. The live Notes
field was read on October 1 and confirms the response for build 4.

September 24, 2026. Submission: Barbu - The king of cards, 1.0.3 (4).

This is a draft, not a submitted response. Replace every bracketed field after
capturing the evidence. Put the completed response in both the App Review message
reply and App Review Information > Notes, as Apple requested. Attach the recording
and identify it in both places, or supply a reviewer-accessible video link that
does not require login. Do not upload a new build merely to answer this request.

## Recording Checklist

- Use a physical iPhone, not Simulator or browser emulation. In Settings > General
  > Software Update, confirm the latest public iOS is installed. Record the exact
  device model and iOS version from Settings > General > About separately.
- Confirm TestFlight lists version 1.0.3 (4). Use that installed build, not a
  development installation. Martin reported testing it on September 23, but the
  precise device, OS, and coverage still need to be documented.
- Enable a Focus mode to avoid recording private notifications. Close Barbu, start
  iPhone Screen Recording from Control Center, return to the Home Screen, and tap
  Barbu. Keep this launch in the video.
- Show the catalog, open Hearts > Learn, and complete a short card-decision
  exercise, including its feedback.
- Open Hearts > Play, start or resume a hand, and play through a trick. Show the
  three-card pass if starting a deal that requires it.
- Show Spades bidding and Bridge auction/play, including selecting a card from
  dummy when applicable. Briefly show Whist, Barbu, and Card Counting I so the
  recording represents the available catalog.
- Demonstrate leaving and resuming a saved hand, and open the privacy policy.
- There are no registration, login, account deletion, user-generated content,
  reporting/blocking, or paid-content flows to demonstrate in this release.
- Aim for a clear, continuous demonstration of roughly 4-7 minutes; this is our
  suggested duration, not an Apple requirement. Do not cut around a failure.
  Reproduce and fix any issue before claiming the build is ready.
- Confirm the video is readable and plays successfully before attaching it. Keep
  the original recording outside Git. Record any additional physical-device QA
  actually performed; do not describe simulator tests as physical-device tests.

## Response To Paste

Hello App Review team,

Thank you for your request. Below is the information for Barbu - The king of cards,
version 1.0.3 (4).

1. Physical-device demonstration and testing

Recording: [ATTACHMENT FILENAME OR ACCESSIBLE VIDEO URL]. Recorded on a physical
[IPHONE MODEL] running iOS [VERSION], using version 1.0.3 (4) installed through
TestFlight. It begins with launching Barbu and demonstrates the main learning and
gameplay flows. Testing performed: [ACTUAL DEVICE TESTS AND RESULTS].

There is no account creation, login, user-generated content, or paid content in
this release, so those flows do not apply.

2. Purpose and target audience

Barbu is a single-player learning and practice collection for people interested
in traditional card games, including beginners and card-club players practising
between in-person games. It provides Hearts, Whist, Spades, Bridge, a Barbu training
session, and Card Counting I memory exercises. Short interactive lessons explain
card decisions, while local computer opponents let players practise without
organising a group. It is available to the general public; no club membership or
business affiliation is required. There is no real-money gambling.

3. Setup and access

No account, credentials, sample files, or special setup are required. Launch Barbu
and open a game from the catalog. Choose Learn for explanations and interactive
card exercises, or Play to start or resume local gameplay. Follow the displayed
passing or bidding actions where applicable, then select a legal card and confirm
the play. Card Counting I provides card-memory exercises. Progress and saved games
are stored on the device. Gameplay and lessons work offline. All available games
and lessons are accessible without purchases or subscriptions.

4. External services, tools, and platforms

Core gameplay, rules, scoring, computer opponents, and lessons run locally on the
device. The interface uses Svelte and TypeScript within a Tauri native shell and
Apple's system web view. There is no remote gameplay server, authentication
provider, data provider, payment processor, advertising/analytics service, or
runtime AI service. GitHub Pages hosts the public privacy and support pages;
GitHub Issues and email provide support. These are not needed for gameplay.
The privacy link opens in the system browser and needs internet access.
ChatGPT was used during development to generate card artwork; players do not
connect to ChatGPT, and gameplay data is not sent to it.

5. Regional differences

The submitted build has the same games, lessons, and features in every region
where it is offered. There are no region-specific feature gates or content
variations.

6. Regulated services and third-party material

Barbu is an educational card-game collection, not a regulated financial,
healthcare, or real-money gambling service. It has no wagering, cash prizes, or
cash-out functionality. The card artwork was generated using ChatGPT, as confirmed
by the developer. Third-party software license notices and source links are
included in the distributed build. Barbu does not claim affiliation with a card
club, federation, or book publisher.

Support: https://martingull.github.io/barbu/support.html
Privacy: https://martingull.github.io/barbu/privacy-policy.html
Contact: martin@insilicoveritas.org

## Evidence Still Needed

- Physical-device recording and its filename or accessible link.
- Device model, exact iOS version, and actual test results for response item 1.
- Owner confirmation that the artwork and any source images used in its generation
  are authorised for this release. Retain generation records. The provenance note
  in THIRD_PARTY_NOTICES.md is not an independent rights clearance; attach relevant
  permissions if any protected third-party material was used.
- Confirmation that the completed response and video were supplied in App Store
  Connect. Follow Apple's reply/status instructions rather than assuming a new
  binary or immediate approval is required.

## References

- [Reply to App Review messages](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages)
- [Record an iPhone screen](https://support.apple.com/102653)
