<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import {
    playBrowserKingOfHeartsCard,
    playBrowserNoHeartsCard,
    playBrowserNoLastTwoCard,
    playBrowserNoQueensCard,
    playBrowserNoTricksCard,
    playBrowserPositiveTricksCard,
    startBrowserKingOfHeartsHand,
    startBrowserNoHeartsHand,
    startBrowserNoLastTwoHand,
    startBrowserNoQueensHand,
    startBrowserNoTricksHand,
    startBrowserPositiveTricksHand
  } from "./browserHandFallback";
  import { generateBrowserPlayBarbuDrillSteps } from "./browserDrillFallback";
  import CardTable from "./CardTable.svelte";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import { guidedLessons } from "./lessons/catalog";
  import { referenceCatalog } from "./referenceCatalog";
  import type {
    Card,
    CompletedHandTrick,
    FullHandContract,
    FullHandState,
    GeneratedDrillSet,
    GeneratedPracticeScenario,
    GuidedCardOutcome,
    GuidedTrick,
    PracticeReason,
    Seat,
    Suit,
    TableCard
  } from "./lessonTypes";
  import type { GameReference } from "./referenceCatalog";

  type AppView =
    | "catalog"
    | "barbuTable"
    | "practiceChooser"
    | "reference"
    | "courseContent"
    | "lesson"
    | "drill"
    | "drillResult"
    | "runContractIntro"
    | "fullHand"
    | "pathReview";

  type PathAction = "lesson" | "generated" | "review" | "planned";
  type CourseStage = "concept" | "example" | "review";

  type CatalogStatus = "Ready" | "Planned";

  type CatalogEntry = {
    id: string;
    family: string;
    title: string;
    status: CatalogStatus;
    summary: string;
    baseline: string;
    lessonCount: number;
  };

  type BarbuPathStep = {
    id: string;
    step: string;
    title: string;
    summary: string;
    action: PathAction;
    lessonId?: string;
  };

  type CoursePanel = {
    heading: string;
    body: string;
  };

  type CoursePoint = {
    marker: string;
    text: string;
  };

  type CourseSequenceStep = {
    label: string;
    text: string;
  };

  type CourseContent = {
    id: string;
    pathStepId: string;
    lessonId: string;
    contract: string;
    title: string;
    concept: CoursePanel & { points: CoursePoint[] };
    example: CoursePanel & {
      sequence: CourseSequenceStep[];
      ariaLabel: string;
      tableCards: TableCard[];
      pendingBySeat: Partial<Record<Seat, string>>;
    };
    review: CoursePanel & { points: CoursePoint[] };
  };

  type DrillStep = {
    contract: string;
    title: string;
    trick: GuidedTrick;
  };

  type DrillResult = {
    contract: string;
    cardLabel: string;
    outcome: GuidedCardOutcome | "illegal";
    reason: PracticeReason;
    clean: boolean;
  };

  type PlayBarbuAttempt = {
    id: string;
    completedAt: string;
    results: DrillResult[];
  };

  type ContractResultSummary = {
    contract: string;
    clean: number;
    total: number;
    outcome: GuidedCardOutcome | "illegal";
  };

  type ReviewInsight = {
    contract: string;
    message: string;
  };

  type ContractScoringGoal = "avoid" | "win";

  type FullHandContractMeta = {
    scoringGoal: ContractScoringGoal;
    penaltyName: string;
    penaltyPlural: string;
    penaltyTotal: number;
    playedLabel: string;
    scoreLabel: string;
    resultLabel: string;
    bestLabel: string;
    weakestLabel: string;
    startCommand: string;
    playCommand: string;
  };

  type FullHandRunResult = {
    contract: FullHandContract;
    playerPenalty: number;
    totalPenalty: number;
    seatPenalties: Record<Seat, number>;
  };

  type RunStanding = {
    rank: number;
    seat: Seat;
    score: number;
  };

  type RunContractIntro = {
    title: string;
    target: string;
    reason: string;
    habit: string;
  };

  const catalogEntries: CatalogEntry[] = [
    {
      id: "barbu",
      family: "Hearts",
      title: "Barbu",
      status: "Ready",
      summary: "Contract trick-taking against the King of Cards.",
      baseline: "Parlett baseline",
      lessonCount: guidedLessons.length
    },
    {
      id: "hearts",
      family: "Hearts",
      title: "Hearts",
      status: "Planned",
      summary: "Plain-trick foundations before the contracts expand.",
      baseline: "Parlett baseline",
      lessonCount: 0
    },
    {
      id: "whist",
      family: "Whist",
      title: "Whist",
      status: "Planned",
      summary: "Partnership trick play and long-suit development.",
      baseline: "Parlett baseline",
      lessonCount: 0
    },
    {
      id: "bridge",
      family: "Bridge",
      title: "Bridge",
      status: "Planned",
      summary: "Declarer play, defense, and bidding concepts.",
      baseline: "Parlett baseline",
      lessonCount: 0
    }
  ];

  const progressStorageKey = "barbu.courseProgress.v1";
  const practiceSeedStorageKey = "barbu.practiceSeed.v1";
  const playBarbuHistoryStorageKey = "barbu.playHistory.v1";
  const maxStoredPlayBarbuAttempts = 8;
  const fullHandContracts: FullHandContract[] = [
    "No Hearts",
    "No Queens",
    "King of Hearts",
    "No Last Two",
    "No Tricks",
    "Positive Tricks"
  ];
  const scoreSeats: Seat[] = ["You", "Tutor", "Left", "Right"];
  const seatByPlayerIndex: Record<number, Seat> = {
    0: "Tutor",
    1: "Right",
    2: "You",
    3: "Left"
  };
  const runContractIntros: Record<FullHandContract, RunContractIntro> = {
    "No Hearts": {
      title: "Hearts are cargo. Do not bring them home.",
      target: "Avoid winning heart tricks.",
      reason: "Barbu starts with the simplest penalty shape: dangerous cards inside ordinary tricks.",
      habit: "Locate the trick winner before worrying about the heart."
    },
    "No Queens": {
      title: "Queens punish the player who captures them.",
      target: "Avoid queen tricks.",
      reason: "This contract raises the pressure because one high card can pull a queen into your score.",
      habit: "Duck under the current winner when a queen is loaded."
    },
    "King of Hearts": {
      title: "One card carries the contract.",
      target: "Avoid capturing KH.",
      reason: "Barbu now narrows the danger to one card, so tracking matters more than fear of the whole suit.",
      habit: "Find KH, then ask whether your card wins its trick."
    },
    "No Last Two": {
      title: "The end of the hand is dangerous.",
      target: "Avoid tricks 12 and 13.",
      reason: "Early tricks are setup. Barbu wants to see whether you can keep a late escape.",
      habit: "Count the hand before spending a low card."
    },
    "No Tricks": {
      title: "Every trick you win costs you.",
      target: "Avoid taking control.",
      reason: "This contract turns the whole hand into ducking practice.",
      habit: "Play below the current winner whenever the led suit allows it."
    },
    "Positive Tricks": {
      title: "Now tricks are treasure.",
      target: "Win tricks.",
      reason: "Barbu flips the lesson: control is good when the contract rewards tricks.",
      habit: "Look for safe chances to overtake and keep the lead."
    }
  };
  const outcomeLabels: Record<GuidedCardOutcome | "illegal", string> = {
    good: "Good",
    risky: "Risky",
    penalty: "Penalty",
    illegal: "Illegal"
  };
  const cleanDrillOutcomes: Array<GuidedCardOutcome | "illegal"> = ["good"];

  const barbuPathSteps: BarbuPathStep[] = [
    {
      id: "meet-contract",
      step: "Concept",
      title: "Meet the contract",
      summary: "Barbu names the danger cards and the object before play begins.",
      action: "lesson",
      lessonId: "barbu-no-hearts"
    },
    {
      id: "spot-danger",
      step: "Example",
      title: "Spot the danger",
      summary: "Read the table, identify who is likely to take the penalty, then choose.",
      action: "lesson",
      lessonId: "barbu-no-queens"
    },
    {
      id: "play-trick",
      step: "Guided trick",
      title: "Play the trick",
      summary: "Make the legal play and get immediate feedback from Barbu.",
      action: "lesson",
      lessonId: "barbu-king-of-hearts"
    },
    {
      id: "generated-drill",
      step: "Practice",
      title: "Practice table",
      summary: "Play a mixed Barbu table and review the contract results.",
      action: "generated"
    },
    {
      id: "review",
      step: "Review",
      title: "Review the hand",
      summary: "Review your latest table and choose what to practice next.",
      action: "review"
    }
  ];

  const suitNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };

  const courseCatalog: CourseContent[] = [
    {
      id: "no-hearts",
      pathStepId: "meet-contract",
      lessonId: "barbu-no-hearts",
      contract: "No Hearts",
      title: "Meet the contract",
      concept: {
        heading: "In No Hearts, hearts are cargo you do not want to collect.",
        body:
          "A heart only hurts the player who wins the trick containing it. Your first job is to follow suit legally while steering heart tricks toward someone else.",
        points: [
          { marker: "1", text: "Follow the led suit when you can." },
          { marker: "2", text: "Do not panic when someone else throws a heart." },
          { marker: "3", text: "Ask who is winning before choosing your card." }
        ]
      },
      example: {
        heading: "Tutor leads clubs. Right discards a heart into that trick.",
        body:
          "The first card in a trick sets the suit everyone must follow when they can. Right did not open hearts here; Right failed to follow clubs and threw a heart away.",
        sequence: [
          { label: "Lead", text: "Tutor plays 9C, so clubs are the led suit." },
          { label: "Then", text: "Right has no club and discards 4H." },
          { label: "Your turn", text: "You still have clubs, so you must follow clubs." }
        ],
        ariaLabel: "No Hearts example table",
        tableCards: [
          { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
          { seat: "Right", card: { id: "4H", rank: "4", suit: "H", label: "4H" } },
          { seat: "Left", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }
        ],
        pendingBySeat: { You: "follow clubs" }
      },
      review: {
        heading: "No Hearts starts with one habit: locate the trick winner before worrying about the heart.",
        body:
          "You followed suit, watched who controlled the trick, and avoided taking the heart yourself. That is the first Barbu table habit.",
        points: [
          { marker: "OK", text: "Hearts score against the trick winner." },
          { marker: "OK", text: "Following suit can still be safe." },
          { marker: "OK", text: "Winning a clean trick is different from winning a heart trick." }
        ]
      }
    },
    {
      id: "no-queens",
      pathStepId: "spot-danger",
      lessonId: "barbu-no-queens",
      contract: "No Queens",
      title: "Spot the danger",
      concept: {
        heading: "In No Queens, queens are only dangerous when they land in a trick you win.",
        body:
          "A queen sitting on the table is not automatically your penalty. Before you play, identify the current winner and whether your card would overtake the trick.",
        points: [
          { marker: "1", text: "Follow suit first." },
          { marker: "2", text: "Find the highest card in the led suit." },
          { marker: "3", text: "Avoid becoming the player who captures the queen." }
        ]
      },
      example: {
        heading: "Tutor leads diamonds. Right follows with QD, loading the trick.",
        body:
          "The first card sets diamonds as the led suit. The queen is dangerous, but only the player who wins the trick takes the queen penalty.",
        sequence: [
          { label: "Lead", text: "Tutor plays 8D, so diamonds are the led suit." },
          { label: "Then", text: "Right follows diamonds with QD." },
          { label: "Your turn", text: "You must follow diamonds without taking control." }
        ],
        ariaLabel: "No Queens example table",
        tableCards: [
          { seat: "Tutor", card: { id: "8D", rank: "8", suit: "D", label: "8D" } },
          { seat: "Right", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } },
          { seat: "Left", card: { id: "AD", rank: "A", suit: "D", label: "AD" } }
        ],
        pendingBySeat: { You: "follow diamonds" }
      },
      review: {
        heading: "No Queens rewards patience: do not overtake a queen trick unless the rules force you.",
        body:
          "You practiced separating the scary card from the player who actually wins the trick. That is the key tactical idea behind No Queens.",
        points: [
          { marker: "OK", text: "Queens are penalties only for the trick winner." },
          { marker: "OK", text: "A lower card can be the best legal card." },
          { marker: "OK", text: "Forced queen captures should be anticipated earlier." }
        ]
      }
    },
    {
      id: "king-of-hearts",
      pathStepId: "play-trick",
      lessonId: "barbu-king-of-hearts",
      contract: "King of Hearts",
      title: "Avoid the king",
      concept: {
        heading: "In King of Hearts, one card carries the danger.",
        body:
          "The king of hearts only hurts the player who wins the trick containing it. Your job is to notice when KH is on the table, then avoid becoming the trick winner.",
        points: [
          { marker: "1", text: "Follow suit when you can." },
          { marker: "2", text: "Track whether KH is in the trick." },
          { marker: "3", text: "Duck under KH or discard it when someone else is winning." }
        ]
      },
      example: {
        heading: "Tutor leads hearts. Right plays KH into the trick.",
        body:
          "Hearts are the led suit, so hearts must be followed. The danger is not holding a heart; the danger is winning the trick that contains KH.",
        sequence: [
          { label: "Lead", text: "Tutor plays 10H, so hearts are the led suit." },
          { label: "Then", text: "Right follows with KH, the contract card." },
          { label: "Your turn", text: "You can follow low and leave KH with Right." }
        ],
        ariaLabel: "King of Hearts example table",
        tableCards: [
          { seat: "Tutor", card: { id: "10H", rank: "10", suit: "H", label: "10H" } },
          { seat: "Right", card: { id: "KH", rank: "K", suit: "H", label: "KH" } },
          { seat: "Left", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } }
        ],
        pendingBySeat: { You: "follow hearts" }
      },
      review: {
        heading: "King of Hearts is about one dangerous capture, not every heart.",
        body:
          "You practiced ducking under KH and unloading it when you are void. The table habit is simple: locate KH, then ask who wins this trick.",
        points: [
          { marker: "OK", text: "KH penalizes the player who wins its trick." },
          { marker: "OK", text: "A low heart can be the best legal card." },
          { marker: "OK", text: "Discarding KH is strong when another player already controls the trick." }
        ]
      }
    },
    {
      id: "no-last-two",
      pathStepId: "contract-no-last-two",
      lessonId: "barbu-no-last-two",
      contract: "No Last Two",
      title: "Avoid the final tricks",
      concept: {
        heading: "In No Last Two, the danger appears late.",
        body:
          "The first eleven tricks are setup. Tricks 12 and 13 score against their winners, so your late high cards become dangerous.",
        points: [
          { marker: "1", text: "Count how close the hand is to the final two tricks." },
          { marker: "2", text: "Keep a low card for the last suits when you can." },
          { marker: "3", text: "Winning early can be fine; winning late is the danger." }
        ]
      },
      example: {
        heading: "Trick 12 starts with spades. Tutor is already winning.",
        body:
          "When only two tricks remain, staying under the current winner is often the whole decision. A high card that was safe earlier can now score against you.",
        sequence: [
          { label: "Late hand", text: "This is trick 12, so the trick winner takes a penalty." },
          { label: "Lead", text: "Left plays 7S and Tutor overtakes with JS." },
          { label: "Your turn", text: "You can follow low and leave the penalty with Tutor." }
        ],
        ariaLabel: "No Last Two example table",
        tableCards: [
          { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
          { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
          { seat: "Right", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
        ],
        pendingBySeat: { You: "follow low" }
      },
      review: {
        heading: "No Last Two is a timing contract.",
        body:
          "You practiced treating early tricks as setup and late tricks as danger. The key habit is counting the hand before choosing whether to overtake.",
        points: [
          { marker: "OK", text: "Only tricks 12 and 13 are penalties." },
          { marker: "OK", text: "Low legal cards are precious near the end." },
          { marker: "OK", text: "A forced late win usually means the setup happened earlier." }
        ]
      }
    },
    {
      id: "no-tricks",
      pathStepId: "contract-no-tricks",
      lessonId: "barbu-no-tricks",
      contract: "No Tricks",
      title: "Avoid every trick",
      concept: {
        heading: "In No Tricks, control is the thing you avoid.",
        body:
          "Every trick you win counts against you. The simple move is to follow suit with the lowest card that keeps someone else ahead.",
        points: [
          { marker: "1", text: "Follow the led suit when you can." },
          { marker: "2", text: "Compare your card to the current winner." },
          { marker: "3", text: "Duck under the winner unless the rules force you to win." }
        ]
      },
      example: {
        heading: "Tutor leads clubs. Right takes control with KC.",
        body:
          "In No Tricks, Right winning is good for you. The danger is overtaking with a higher club and taking the trick yourself.",
        sequence: [
          { label: "Lead", text: "Tutor plays 9C, so clubs are the led suit." },
          { label: "Then", text: "Right plays KC and becomes the current winner." },
          { label: "Your turn", text: "You can follow with 2C and avoid taking control." }
        ],
        ariaLabel: "No Tricks example table",
        tableCards: [
          { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
          { seat: "Right", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
          { seat: "Left", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }
        ],
        pendingBySeat: { You: "duck" }
      },
      review: {
        heading: "No Tricks turns every win into a cost.",
        body:
          "You practiced ducking under the current winner and recognizing forced wins. The key habit is asking whether your legal card takes control.",
        points: [
          { marker: "OK", text: "Every trick winner scores in this contract." },
          { marker: "OK", text: "A low legal card can be the strongest play." },
          { marker: "OK", text: "Forced wins are legal, but they still count." }
        ]
      }
    }
  ];
  const drillSteps: DrillStep[] = guidedLessons.map((lesson) => ({
    contract: lesson.contract,
    title: lesson.title,
    trick: lesson.tricks[0]
  }));

  let appView: AppView = "catalog";
  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";
  let drillIndex = 0;
  let drillSelectedCardId = "";
  let drillCheckedCardId = "";
  let drillResults: DrillResult[] = [];
  let activeDrillSteps: DrillStep[] = drillSteps;
  let drillSetTitle = "Play Barbu";
  let practiceSeed = loadPracticeSeed();
  let selectedLessonId = guidedLessons[0].id;
  let activeTricks: GuidedTrick[] = guidedLessons[0].tricks;
  let activePathStepId = "";
  let activeCourseId = courseCatalog[0].id;
  let activeReferenceId = referenceCatalog[0].id;
  let activeCourseStage: CourseStage = "concept";
  let completedPathSteps: Record<string, boolean> = loadCourseProgress();
  let playBarbuHistory: PlayBarbuAttempt[] = loadPlayBarbuHistory();
  let usingGeneratedPractice = false;
  let generatedPracticeError = "";
  let fullHand: FullHandState | null = null;
  let fullHandSelectedCardId = "";
  let fullHandError = "";
  let fullHandReviewTrickCount = 0;
  let usingBrowserFullHand = false;
  let lastFullHandTapCardId = "";
  let lastFullHandTapAt = 0;
  let fullHandRunActive = false;
  let fullHandRunResults: FullHandRunResult[] = [];
  let pendingRunContract: FullHandContract = fullHandContracts[0];

  function runSeatScores(results: FullHandRunResult[]) {
    const totals = emptySeatPenalties();

    for (const result of results) {
      for (const seat of scoreSeats) {
        totals[seat] += contractRunScore(result.contract, result.seatPenalties[seat] ?? 0);
      }
    }

    return totals;
  }

  $: selectedLesson = guidedLessons.find((lesson) => lesson.id === selectedLessonId) ?? guidedLessons[0];
  $: familyLabel = usingGeneratedPractice ? "Hearts" : selectedLesson.family;
  $: gameLabel = usingGeneratedPractice ? "Generated practice" : selectedLesson.game;
  $: contractLabel = usingGeneratedPractice ? "No Hearts" : selectedLesson.contract;
  $: currentTrick = activeTricks[trickIndex];
  $: legalCardIds = new Set(currentTrick.legalCardIds);
  $: hand = currentTrick.hand;
  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard
    ? [...currentTrick.tableBeforeChoice, { seat: "You" as const, card: playedCard }, ...currentTrick.tableAfterChoice]
    : currentTrick.tableBeforeChoice;
  $: explanation = generatedPracticeError || buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard ? currentTrick.afterResult : currentTrick.beforeResult;
  $: isLastTrick = trickIndex === activeTricks.length - 1;
  $: playablePathSteps = barbuPathSteps.filter((step) => step.action !== "planned");
  $: completedCount = playablePathSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextPathStep = playablePathSteps.find((step) => !completedPathSteps[step.id]);
  $: isCourseComplete = completedCount === playablePathSteps.length;
  $: lessonOutcome = selectedCard && (playedCard || !isSelectedLegal) ? buildLessonOutcome(selectedCard, playedCard) : "";
  $: activeCourse = courseCatalog.find((course) => course.id === activeCourseId) ?? courseCatalog[0];
  $: activeReference = referenceCatalog.find((reference) => reference.id === activeReferenceId) ?? referenceCatalog[0];
  $: currentDrill = activeDrillSteps[drillIndex] ?? activeDrillSteps[0] ?? drillSteps[0];
  $: currentDrillTrick = currentDrill.trick;
  $: drillLegalCardIds = new Set(currentDrillTrick.legalCardIds);
  $: drillSelectedCard = currentDrillTrick.hand.find((card) => card.id === drillSelectedCardId);
  $: drillCheckedCard = currentDrillTrick.hand.find((card) => card.id === drillCheckedCardId);
  $: isDrillSelectionLegal = drillSelectedCard ? drillLegalCardIds.has(drillSelectedCard.id) : false;
  $: isDrillCheckedLegal = drillCheckedCard ? drillLegalCardIds.has(drillCheckedCard.id) : false;
  $: drillCompletedTable = drillCheckedCard && isDrillCheckedLegal
    ? [
        ...currentDrillTrick.tableBeforeChoice,
        { seat: "You" as const, card: drillCheckedCard },
        ...currentDrillTrick.tableAfterChoice
      ]
    : currentDrillTrick.tableBeforeChoice;
  $: drillOutcome = drillCheckedCard ? buildDrillOutcome(drillCheckedCard) : "";
  $: drillFeedback = drillCheckedCard ? buildDrillFeedback(drillCheckedCard) : currentDrillTrick.emptyExplanation;
  $: cleanDrillCount = drillResults.filter((result) => result.clean).length;
  $: currentContractResults = summarizeContractResults(drillResults);
  $: weakContract = weakestContractFromResults(currentContractResults);
  $: recentPlayBarbuAttempts = playBarbuHistory.slice(0, 3);
  $: latestPlayBarbuAttempt = playBarbuHistory[0];
  $: reviewResults = latestPlayBarbuAttempt?.results ?? [];
  $: reviewContractResults = summarizeContractResults(reviewResults);
  $: reviewWeakContract = weakestContractFromResults(reviewContractResults);
  $: reviewCleanCount = reviewResults.filter((result) => result.clean).length;
  $: reviewInsight = buildReviewInsight(recentPlayBarbuAttempts);
  $: reviewAdvice = reviewInsight.message;
  $: reviewReplayContract = reviewInsight.contract || reviewWeakContract;
  $: fullHandLegalCardIds = new Set(fullHand?.legalCardIds ?? []);
  $: fullHandSelectedCard = fullHand?.playerHand.find((card) => card.id === fullHandSelectedCardId);
  $: fullHandLastCompletedTrick = fullHand?.completedTricks[fullHand.completedTricks.length - 1];
  $: fullHandReviewTrick =
    fullHand && fullHandReviewTrickCount > 0 ? fullHand.completedTricks[fullHandReviewTrickCount - 1] : undefined;
  $: fullHandIsReviewingTrick = Boolean(
    fullHandReviewTrick && fullHand?.status === "in_progress" && fullHand.completedTricks.length === fullHandReviewTrickCount
  );
  $: fullHandLastFeedback = fullHandLastCompletedTrick ? fullHandTrickFeedback(fullHandLastCompletedTrick) : "";
  $: fullHandReviewFeedback = fullHandReviewTrick ? fullHandTrickFeedback(fullHandReviewTrick) : "";
  $: fullHandVisibleTableCards = fullHandIsReviewingTrick && fullHandReviewTrick
    ? fullHandReviewTrick.cards
    : fullHand?.currentTrick.length
    ? fullHand.currentTrick
    : fullHand?.status === "complete"
      ? (fullHandLastCompletedTrick?.cards ?? [])
      : [];
  $: fullHandPendingBySeat =
    !fullHandIsReviewingTrick && fullHand?.status === "in_progress" && fullHand.currentPlayer === "You" && fullHand.currentTrick.length < 4
      ? { You: "You" }
      : {};
  $: fullHandContractMeta = fullHandMeta(fullHand?.contract ?? "No Hearts");
  $: fullHandPenaltyName = fullHandContractMeta.penaltyName;
  $: fullHandPenaltyPlural = fullHandContractMeta.penaltyPlural;
  $: fullHandPenaltyTotal = fullHandContractMeta.penaltyTotal;
  $: fullHandPenaltyPlayedLabel = fullHandContractMeta.playedLabel;
  $: fullHandPlayerPenaltyLabel =
    fullHand?.playerPenalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural;
  $: fullHandSeatPenalties = fullHand ? seatPenaltiesForTricks(fullHand.completedTricks) : emptySeatPenalties();
  $: fullHandResultTitle = fullHand ? fullHandResultHeading(fullHand) : "";
  $: fullHandResultSummary = fullHand ? fullHandResultText(fullHand) : "";
  $: fullHandBestTrick = fullHand ? fullHandBestTrickLabel(fullHand) : "";
  $: fullHandWorstTrick = fullHand ? fullHandWorstTrickLabel(fullHand) : "";
  $: fullHandRunCurrentIndex = fullHand ? fullHandContracts.indexOf(fullHand.contract) : -1;
  $: pendingRunContractIndex = fullHandContracts.indexOf(pendingRunContract);
  $: pendingRunContractIntro = runContractIntros[pendingRunContract];
  $: pendingRunStatusLabel = `Run ${pendingRunContractIndex + 1} of ${fullHandContracts.length}`;
  $: fullHandRunOrderedResults = fullHandContracts
    .map((contract) => fullHandRunResults.find((result) => result.contract === contract))
    .filter((result): result is FullHandRunResult => Boolean(result));
  $: fullHandRunSeatPenalties = runSeatPenalties(fullHandRunResults);
  $: fullHandRunSeatScores = runSeatScores(fullHandRunResults);
  $: fullHandRunStandings = runStandings(fullHandRunSeatScores);
  $: fullHandRunPlayerStanding = fullHandRunStandings.find((standing) => standing.seat === "You");
  $: fullHandRunBestContract = runBestContract(fullHandRunOrderedResults);
  $: fullHandRunWeakestContract = runWeakestContract(fullHandRunOrderedResults);
  $: fullHandRunIsComplete = fullHandRunActive && fullHandRunResults.length >= fullHandContracts.length;
  $: fullHandRunResultTitle = fullHandRunIsComplete ? runResultHeading(fullHandRunStandings) : "Run complete";
  $: fullHandRunResultSummary = fullHandRunIsComplete
    ? runResultSummary(fullHandRunStandings, fullHandRunResults.length)
    : "";
  $: fullHandRunStatusLabel =
    fullHandRunIsComplete
      ? "Run complete"
      : fullHandRunActive && fullHandRunCurrentIndex >= 0
      ? `Run ${fullHandRunCurrentIndex + 1} of ${fullHandContracts.length}`
      : fullHand?.status === "complete"
        ? "Complete"
        : `Trick ${fullHand?.trickNumber ?? 1}`;
  $: fullHandNextActionLabel = fullHandRunActive
    ? fullHandRunIsComplete
      ? "New run"
      : "Next contract"
    : "Try another";

  function loadCourseProgress() {
    if (typeof localStorage === "undefined") {
      return {};
    }

    try {
      const storedProgress = localStorage.getItem(progressStorageKey);
      return storedProgress ? (JSON.parse(storedProgress) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }

  function saveCourseProgress(nextProgress: Record<string, boolean>) {
    completedPathSteps = nextProgress;

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
    }
  }

  function loadPlayBarbuHistory(): PlayBarbuAttempt[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const storedHistory = localStorage.getItem(playBarbuHistoryStorageKey);
      return storedHistory ? normalizePlayBarbuHistory(JSON.parse(storedHistory) as PlayBarbuAttempt[]) : [];
    } catch {
      return [];
    }
  }

  function normalizePlayBarbuHistory(history: PlayBarbuAttempt[]) {
    return history.map((attempt) => ({
      ...attempt,
      results: attempt.results.map((result) => {
        const outcome = normalizeStoredOutcome(result.outcome);

        return {
          ...result,
          outcome,
          reason: normalizeStoredReason(result.reason, outcome),
          clean: cleanDrillOutcomes.includes(outcome)
        };
      })
    }));
  }

  function normalizeStoredOutcome(outcome: string): GuidedCardOutcome | "illegal" {
    if (outcome === "best" || outcome === "safe" || outcome === "forced" || outcome === "good") {
      return "good";
    }

    if (outcome === "risky" || outcome === "penalty" || outcome === "illegal") {
      return outcome;
    }

    return "risky";
  }

  function normalizeStoredReason(reason: string | undefined, outcome: GuidedCardOutcome | "illegal"): PracticeReason {
    if (
      reason === "followed_suit" ||
      reason === "void_discard" ||
      reason === "avoided_penalty" ||
      reason === "captured_penalty" ||
      reason === "won_clean_trick" ||
      reason === "off_suit"
    ) {
      return reason;
    }

    if (outcome === "illegal") {
      return "off_suit";
    }

    if (outcome === "penalty") {
      return "captured_penalty";
    }

    return outcome === "risky" ? "won_clean_trick" : "followed_suit";
  }

  function savePlayBarbuHistory(nextHistory: PlayBarbuAttempt[]) {
    playBarbuHistory = nextHistory.slice(0, maxStoredPlayBarbuAttempts);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(playBarbuHistoryStorageKey, JSON.stringify(playBarbuHistory));
    }
  }

  function loadPracticeSeed() {
    if (typeof localStorage === "undefined") {
      return 1;
    }

    const storedSeed = Number(localStorage.getItem(practiceSeedStorageKey));

    if (Number.isInteger(storedSeed) && storedSeed > 0) {
      return storedSeed;
    }

    const dateSeed = Math.floor(Date.now() / 1000) % 1_000_000;
    return Math.max(1, dateSeed);
  }

  function usePracticeSeed() {
    const seed = practiceSeed;
    practiceSeed += 1;

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(practiceSeedStorageKey, String(practiceSeed));
    }

    return seed;
  }

  function selectCard(card: Card) {
    if (playedCardId) {
      return;
    }

    selectedCardId = card.id;
  }

  function playSelectedCard() {
    if (!selectedCard || !isSelectedLegal) {
      return;
    }

    playedCardId = selectedCard.id;
  }

  function resetTrick() {
    selectedCardId = "";
    playedCardId = "";
  }

  function resetDrillDecision() {
    drillSelectedCardId = "";
    drillCheckedCardId = "";
  }

  function openCatalog() {
    appView = "catalog";
  }

  function openBarbuTable() {
    appView = "barbuTable";
  }

  function openPracticeChooser() {
    appView = "practiceChooser";
  }

  function openReference(referenceId = "barbu") {
    const reference = referenceCatalog.find((item) => item.id === referenceId);

    if (!reference) {
      return;
    }

    activeReferenceId = reference.id;
    appView = "reference";
  }

  function openPathReview() {
    activePathStepId = "review";
    appView = "pathReview";
  }

  function openGame(gameId: string) {
    if (gameId !== "barbu") {
      return;
    }

    openBarbuTable();
  }

  function catalogDetailLabel(entry: CatalogEntry) {
    if (entry.lessonCount > 0) {
      return `${entry.lessonCount} ${entry.lessonCount === 1 ? "lesson" : "lessons"}`;
    }
    return "No lessons yet";
  }

  function fullHandMeta(contract: FullHandContract): FullHandContractMeta {
    if (contract === "No Queens") {
      return {
        scoringGoal: "avoid",
        penaltyName: "queen",
        penaltyPlural: "queens",
        penaltyTotal: 4,
        playedLabel: "queens played",
        scoreLabel: "Your penalty",
        resultLabel: "took",
        bestLabel: "Best escape",
        weakestLabel: "Costliest trick",
        startCommand: "start_no_queens_hand",
        playCommand: "play_no_queens_hand_card"
      };
    }
    if (contract === "King of Hearts") {
      return {
        scoringGoal: "avoid",
        penaltyName: "king",
        penaltyPlural: "kings",
        penaltyTotal: 1,
        playedLabel: "king played",
        scoreLabel: "Your penalty",
        resultLabel: "took",
        bestLabel: "Best escape",
        weakestLabel: "Costliest trick",
        startCommand: "start_king_of_hearts_hand",
        playCommand: "play_king_of_hearts_hand_card"
      };
    }
    if (contract === "No Last Two") {
      return {
        scoringGoal: "avoid",
        penaltyName: "last trick",
        penaltyPlural: "last tricks",
        penaltyTotal: 2,
        playedLabel: "last tricks played",
        scoreLabel: "Your penalty",
        resultLabel: "took",
        bestLabel: "Best escape",
        weakestLabel: "Costliest trick",
        startCommand: "start_no_last_two_hand",
        playCommand: "play_no_last_two_hand_card"
      };
    }
    if (contract === "No Tricks") {
      return {
        scoringGoal: "avoid",
        penaltyName: "trick",
        penaltyPlural: "tricks",
        penaltyTotal: 13,
        playedLabel: "tricks played",
        scoreLabel: "Your penalty",
        resultLabel: "took",
        bestLabel: "Best escape",
        weakestLabel: "Costliest trick",
        startCommand: "start_no_tricks_hand",
        playCommand: "play_no_tricks_hand_card"
      };
    }
    if (contract === "Positive Tricks") {
      return {
        scoringGoal: "win",
        penaltyName: "trick",
        penaltyPlural: "tricks",
        penaltyTotal: 13,
        playedLabel: "tricks won",
        scoreLabel: "Your tricks",
        resultLabel: "won",
        bestLabel: "Best win",
        weakestLabel: "Missed chance",
        startCommand: "start_positive_tricks_hand",
        playCommand: "play_positive_tricks_hand_card"
      };
    }

    return {
      scoringGoal: "avoid",
      penaltyName: "heart",
      penaltyPlural: "hearts",
      penaltyTotal: 13,
      playedLabel: "hearts played",
      scoreLabel: "Your penalty",
      resultLabel: "took",
      bestLabel: "Best escape",
      weakestLabel: "Costliest trick",
      startCommand: "start_no_hearts_hand",
      playCommand: "play_no_hearts_hand_card"
    };
  }

  function startBrowserFullHand(contract: FullHandContract, seed: number) {
    if (contract === "No Queens") {
      return startBrowserNoQueensHand(seed);
    }
    if (contract === "King of Hearts") {
      return startBrowserKingOfHeartsHand(seed);
    }
    if (contract === "No Last Two") {
      return startBrowserNoLastTwoHand(seed);
    }
    if (contract === "No Tricks") {
      return startBrowserNoTricksHand(seed);
    }
    if (contract === "Positive Tricks") {
      return startBrowserPositiveTricksHand(seed);
    }

    return startBrowserNoHeartsHand(seed);
  }

  function playBrowserFullHand(state: FullHandState, cardId: string) {
    if (state.contract === "No Queens") {
      return playBrowserNoQueensCard(state, cardId);
    }
    if (state.contract === "King of Hearts") {
      return playBrowserKingOfHeartsCard(state, cardId);
    }
    if (state.contract === "No Last Two") {
      return playBrowserNoLastTwoCard(state, cardId);
    }
    if (state.contract === "No Tricks") {
      return playBrowserNoTricksCard(state, cardId);
    }
    if (state.contract === "Positive Tricks") {
      return playBrowserPositiveTricksCard(state, cardId);
    }

    return playBrowserNoHeartsCard(state, cardId);
  }

  async function startFullHand(contract: FullHandContract, options: { keepRun?: boolean } = {}) {
    if (!options.keepRun) {
      fullHandRunActive = false;
      fullHandRunResults = [];
    }

    const seed = usePracticeSeed();
    fullHandSelectedCardId = "";
    fullHandError = "";
    fullHandReviewTrickCount = 0;
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    const metadata = fullHandMeta(contract);

    try {
      fullHand = await invoke<FullHandState>(metadata.startCommand, {
        seed
      });
      usingBrowserFullHand = false;
    } catch {
      fullHand = startBrowserFullHand(contract, seed);
      usingBrowserFullHand = true;
    }

    appView = "fullHand";
  }

  async function selectFullHandCard(card: Card) {
    if (!fullHand || fullHand.status === "complete" || fullHandIsReviewingTrick) {
      return;
    }

    const now = Date.now();
    const isDoubleTap = lastFullHandTapCardId === card.id && now - lastFullHandTapAt < 450;

    fullHandSelectedCardId = card.id;
    lastFullHandTapCardId = card.id;
    lastFullHandTapAt = now;

    if (isDoubleTap && fullHandLegalCardIds.has(card.id)) {
      await playFullHandCard(card.id);
    }
  }

  async function playFullHandCard(cardId = fullHandSelectedCard?.id) {
    if (!fullHand || fullHandIsReviewingTrick || !cardId || !fullHandLegalCardIds.has(cardId)) {
      return;
    }

    fullHandError = "";
    const completedTrickCount = fullHand.completedTricks.length;

    if (usingBrowserFullHand) {
      updateFullHandAfterPlayerPlay(playBrowserFullHand(fullHand, cardId), completedTrickCount);
      recordCompletedFullHandRunResult(fullHand);
      fullHandSelectedCardId = "";
      lastFullHandTapCardId = "";
      lastFullHandTapAt = 0;
      return;
    }

    try {
      const nextFullHand = await invoke<FullHandState>(fullHandMeta(fullHand.contract).playCommand, {
        state: fullHand,
        cardId
      });
      updateFullHandAfterPlayerPlay(nextFullHand, completedTrickCount);
      recordCompletedFullHandRunResult(fullHand);
      fullHandSelectedCardId = "";
      lastFullHandTapCardId = "";
      lastFullHandTapAt = 0;
    } catch (error) {
      fullHandError = typeof error === "string" ? error : "That card could not be played.";
    }
  }

  function updateFullHandAfterPlayerPlay(nextFullHand: FullHandState, previousCompletedTrickCount: number) {
    fullHand = nextFullHand;
    fullHandReviewTrickCount =
      nextFullHand.status === "in_progress" && nextFullHand.completedTricks.length > previousCompletedTrickCount
        ? nextFullHand.completedTricks.length
        : 0;
  }

  function continueFullHandAfterTrick() {
    if (!fullHandIsReviewingTrick) {
      return;
    }

    fullHandReviewTrickCount = 0;
    fullHandSelectedCardId = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
  }

  function startNoHeartsHand() {
    void startFullHand("No Hearts");
  }

  function startNoQueensHand() {
    void startFullHand("No Queens");
  }

  function startKingOfHeartsHand() {
    void startFullHand("King of Hearts");
  }

  function startNoLastTwoHand() {
    void startFullHand("No Last Two");
  }

  function startNoTricksHand() {
    void startFullHand("No Tricks");
  }

  function startPositiveTricksHand() {
    void startFullHand("Positive Tricks");
  }

  function startBarbuRun() {
    fullHandRunActive = true;
    fullHandRunResults = [];
    fullHand = null;
    openRunContractIntro(fullHandContracts[0]);
  }

  function openRunContractIntro(contract: FullHandContract) {
    pendingRunContract = contract;
    appView = "runContractIntro";
  }

  function startPendingRunContract() {
    void startFullHand(pendingRunContract, { keepRun: true });
  }

  function startNextFullHand() {
    if (!fullHand) {
      return;
    }

    if (fullHandRunActive) {
      recordCompletedFullHandRunResult(fullHand);

      if (fullHandRunIsComplete) {
        startBarbuRun();
        return;
      }

      const currentIndex = fullHandContracts.indexOf(fullHand.contract);
      const nextContract = fullHandContracts[(currentIndex + 1) % fullHandContracts.length] ?? "No Hearts";
      openRunContractIntro(nextContract);
      return;
    }

    const currentIndex = fullHandContracts.indexOf(fullHand.contract);
    const nextContract = fullHandContracts[(currentIndex + 1) % fullHandContracts.length] ?? "No Hearts";
    void startFullHand(nextContract);
  }

  function replayFullHand() {
    if (!fullHand) {
      return;
    }

    if (fullHandRunActive) {
      fullHandRunResults = fullHandRunResults.filter((result) => result.contract !== fullHand?.contract);
      void startFullHand(fullHand.contract, { keepRun: true });
      return;
    }

    void startFullHand(fullHand.contract);
  }

  function replayWeakestRunContract() {
    if (!fullHandRunWeakestContract) {
      return;
    }

    void startFullHand(fullHandRunWeakestContract.contract);
  }

  function recordCompletedFullHandRunResult(state: FullHandState | null) {
    if (!fullHandRunActive || !state || state.status !== "complete") {
      return;
    }

    const result: FullHandRunResult = {
      contract: state.contract,
      playerPenalty: state.playerPenalty,
      totalPenalty: state.totalPenalty,
      seatPenalties: seatPenaltiesForTricks(state.completedTricks)
    };

    fullHandRunResults = [...fullHandRunResults.filter((item) => item.contract !== state.contract), result];
  }

  function emptySeatPenalties(): Record<Seat, number> {
    return {
      Tutor: 0,
      Right: 0,
      You: 0,
      Left: 0
    };
  }

  function seatPenaltiesForTricks(tricks: CompletedHandTrick[]) {
    const totals = emptySeatPenalties();

    for (const trick of tricks) {
      const seat = seatByPlayerIndex[trick.winnerIndex];

      if (seat) {
        totals[seat] += trick.penalty;
      }
    }

    return totals;
  }

  function runSeatPenalties(results: FullHandRunResult[]) {
    const totals = emptySeatPenalties();

    for (const result of results) {
      for (const seat of scoreSeats) {
        totals[seat] += result.seatPenalties[seat] ?? 0;
      }
    }

    return totals;
  }

  function contractRunScore(contract: FullHandContract, value: number) {
    return fullHandMeta(contract).scoringGoal === "win" ? value : -value;
  }

  function scoreSeatLabel(seat: Seat) {
    return seat === "Tutor" ? "Barbu" : seat;
  }

  function scoreSeatRunLabel(seat: Seat) {
    return seat === "You" ? "Your" : scoreSeatLabel(seat);
  }

  function scoreSeatResultLabel(seat: Seat) {
    return `${scoreSeatLabel(seat)} ${fullHandContractMeta.resultLabel}`;
  }

  function fullHandTrickIsWarning(trick: CompletedHandTrick | undefined) {
    return fullHandContractMeta.scoringGoal === "avoid" && trick?.outcome === "captured_penalty";
  }

  function runStandings(scores: Record<Seat, number>): RunStanding[] {
    const orderedScores = scoreSeats
      .map((seat) => ({ seat, score: scores[seat] }))
      .sort((left, right) => right.score - left.score);
    let previousScore = -1;
    let previousRank = 0;

    return orderedScores.map((standing, index) => {
      const rank = index > 0 && standing.score === previousScore ? previousRank : index + 1;
      previousScore = standing.score;
      previousRank = rank;

      return {
        ...standing,
        rank
      };
    });
  }

  function runResultHeading(standings: RunStanding[]) {
    const player = standings.find((standing) => standing.seat === "You");

    if (!player) {
      return "Run complete";
    }

    if (player.rank === 1) {
      const tiedWinners = standings.filter((standing) => standing.rank === 1);
      return tiedWinners.length > 1 ? "You tied for 1st" : "You won the run";
    }

    return `You finished ${formatOrdinal(player.rank)}`;
  }

  function runResultSummary(standings: RunStanding[], contractsPlayed: number) {
    const leader = standings[0];
    const player = standings.find((standing) => standing.seat === "You");

    if (!leader || !player) {
      return `Run complete after ${contractsPlayed} contracts. Higher net score wins the table.`;
    }

    if (player.rank === 1) {
      return `You finished with ${player.score} after ${contractsPlayed} contracts. Higher net score wins the table.`;
    }

    return `${scoreSeatLabel(leader.seat)} won with ${leader.score}. You finished with ${player.score} after ${contractsPlayed} contracts.`;
  }

  function formatOrdinal(value: number) {
    if (value === 1) {
      return "1st";
    }
    if (value === 2) {
      return "2nd";
    }
    if (value === 3) {
      return "3rd";
    }

    return `${value}th`;
  }

  function runBestContract(results: FullHandRunResult[]) {
    return [...results].sort((left, right) => {
      const leftScore = contractRunScore(left.contract, left.seatPenalties.You ?? 0);
      const rightScore = contractRunScore(right.contract, right.seatPenalties.You ?? 0);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return runContractRelativeScore(right) - runContractRelativeScore(left);
    })[0];
  }

  function runWeakestContract(results: FullHandRunResult[]) {
    return [...results].sort((left, right) => {
      const leftScore = contractRunScore(left.contract, left.seatPenalties.You ?? 0);
      const rightScore = contractRunScore(right.contract, right.seatPenalties.You ?? 0);

      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      return runContractRelativeScore(left) - runContractRelativeScore(right);
    })[0];
  }

  function runContractRelativeScore(result: FullHandRunResult) {
    const playerScore = contractRunScore(result.contract, result.seatPenalties.You ?? 0);
    const tableAverage =
      scoreSeats
        .filter((seat) => seat !== "You")
        .reduce((total, seat) => total + contractRunScore(result.contract, result.seatPenalties[seat] ?? 0), 0) / 3;

    return playerScore - tableAverage;
  }

  function fullHandCardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: fullHandLegalCardIds.has(card.id),
      illegal: !fullHandLegalCardIds.has(card.id),
      selected: fullHandSelectedCardId === card.id
    };
  }

  function fullHandTrickFeedback(trick: CompletedHandTrick) {
    const penaltyText = `${trick.penalty} ${trick.penalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;

    if (fullHand?.contract === "Positive Tricks") {
      return trick.winner === "You"
        ? `You won the trick and banked ${penaltyText}. Good: this contract rewards control.`
        : `${trick.winner} won the trick and banked ${penaltyText}. Look for a chance to overtake next time.`;
    }

    if (trick.outcome === "captured_penalty") {
      return `You won the trick and took ${penaltyText}. Risky: your card became the highest card in the led suit.`;
    }
    if (trick.outcome === "avoided_penalty") {
      return `${trick.winner} won the trick and took ${penaltyText}. Good: you stayed out of the penalty trick.`;
    }
    if (trick.outcome === "won_clean_trick") {
      if (fullHand?.contract === "King of Hearts") {
        return "You won a clean trick. Legal, but keep checking whether KH can still enter the trick.";
      }
      if (fullHand?.contract === "No Last Two") {
        return "You won a clean trick. Legal, but the final two tricks are the ones that score.";
      }
      if (fullHand?.contract === "No Tricks") {
        return "You won a trick. Legal, but every trick you win scores in this contract.";
      }
      return `You won a clean trick. Legal, but keep checking whether ${fullHandPenaltyPlural} can still enter the trick.`;
    }
    if (fullHand?.contract === "King of Hearts") {
      return `${trick.winner} won a clean trick. KH did not move, so you stayed clear.`;
    }
    if (fullHand?.contract === "No Last Two") {
      return `${trick.winner} won a clean trick. The final-two danger has not scored here.`;
    }
    if (fullHand?.contract === "No Tricks") {
      return `${trick.winner} won the trick. Good: you stayed out of it.`;
    }
    return `${trick.winner} won a clean trick. No ${fullHandPenaltyPlural} moved, so you stayed clear.`;
  }

  function fullHandResultHeading(hand: FullHandState) {
    if (hand.contract === "Positive Tricks") {
      return hand.playerPenalty >= 5 ? "Strong trick count" : "Keep fighting for tricks";
    }
    if (hand.playerPenalty === 0) {
      return "Clean hand";
    }
    if (hand.playerPenalty === hand.totalPenalty) {
      return "Barbu caught you";
    }
    return "Damage limited";
  }

  function fullHandResultText(hand: FullHandState) {
    if (hand.contract === "Positive Tricks") {
      return `You won ${formatFullHandPenalty(hand.playerPenalty)}. The table won ${formatFullHandPenalty(
        hand.totalPenalty - hand.playerPenalty
      )}.`;
    }

    if (hand.playerPenalty === 0) {
      return hand.contract === "King of Hearts"
        ? "You kept KH out of your tricks."
        : hand.contract === "No Last Two"
          ? "You avoided both final tricks."
          : hand.contract === "No Tricks"
            ? "You avoided every trick."
        : `You avoided every ${fullHandPenaltyName}.`;
    }

    const youTook = formatFullHandPenalty(hand.playerPenalty);
    const tableTook = formatFullHandPenalty(hand.totalPenalty - hand.playerPenalty);

    if (hand.playerPenalty === hand.totalPenalty) {
      return `You took ${youTook}. Replay the contract and look for one duck or discard.`;
    }

    return `You took ${youTook}. The other seats absorbed ${tableTook}.`;
  }

  function fullHandBestTrickLabel(hand: FullHandState) {
    if (fullHandMeta(hand.contract).scoringGoal === "win") {
      const won = hand.completedTricks
        .filter((trick) => trick.winnerIndex === 2 && trick.penalty > 0)
        .sort((left, right) => right.penalty - left.penalty)[0];

      return won ? `You won ${formatFullHandPenalty(won.penalty)}` : "No won tricks";
    }

    const avoided = hand.completedTricks
      .filter((trick) => trick.penalty > 0 && trick.winnerIndex !== 2)
      .sort((left, right) => right.penalty - left.penalty)[0];

    if (avoided) {
      return `${avoided.winner} took ${formatFullHandPenalty(avoided.penalty)}`;
    }

    const cleanWin = hand.completedTricks.find((trick) => trick.winnerIndex === 2 && trick.penalty === 0);
    return cleanWin ? "You won a clean trick" : "No escape trick";
  }

  function fullHandWorstTrickLabel(hand: FullHandState) {
    if (fullHandMeta(hand.contract).scoringGoal === "win") {
      const missed = hand.completedTricks
        .filter((trick) => trick.winnerIndex !== 2 && trick.penalty > 0)
        .sort((left, right) => right.penalty - left.penalty)[0];

      return missed ? `${missed.winner} won ${formatFullHandPenalty(missed.penalty)}` : "No missed tricks";
    }

    const captured = hand.completedTricks
      .filter((trick) => trick.penalty > 0 && trick.winnerIndex === 2)
      .sort((left, right) => right.penalty - left.penalty)[0];

    return captured ? `You took ${formatFullHandPenalty(captured.penalty)}` : "No penalty tricks";
  }

  function formatFullHandPenalty(value: number) {
    return `${value} ${value === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;
  }

  function formatContractPenalty(contract: FullHandContract, value: number) {
    const meta = fullHandMeta(contract);
    return `${value} ${value === 1 ? meta.penaltyName : meta.penaltyPlural}`;
  }

  function runResultForContract(contract: FullHandContract) {
    return fullHandRunResults.find((result) => result.contract === contract);
  }

  function scorecardCellLabel(contract: FullHandContract, seat: Seat) {
    const result = runResultForContract(contract);

    if (!result) {
      return contract === pendingRunContract || fullHand?.contract === contract ? "Now" : "-";
    }

    return String(contractRunScore(contract, result.seatPenalties[seat] ?? 0));
  }

  async function startDailyDrill(pathStepId = "") {
    activePathStepId = pathStepId;
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = "Play Barbu";
    resetDrillDecision();
    const seed = usePracticeSeed();

    try {
      const drillSet = await invoke<GeneratedDrillSet>("generate_daily_drill_set", {
        seed
      });

      activeDrillSteps = drillSet.scenarios.map(drillStepFromGeneratedScenario);
      drillSetTitle = drillSet.title;
    } catch {
      activeDrillSteps = generateBrowserPlayBarbuDrillSteps(seed);
      drillSetTitle = "Play Barbu";
    }

    drillIndex = 0;
    drillResults = [];
    resetDrillDecision();
    appView = "drill";
  }

  async function replayWeakContract() {
    const replayContract = weakContract;

    if (!replayContract) {
      await startDailyDrill();
      return;
    }

    await startContractReplay(replayContract);
  }

  async function replayReviewWeakContract() {
    const replayContract = reviewReplayContract;

    if (!replayContract) {
      await startDailyDrill();
      return;
    }

    await startContractReplay(replayContract);
  }

  async function startContractReplay(replayContract: string) {
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = `Replay ${replayContract}`;
    resetDrillDecision();
    const seed = usePracticeSeed();

    try {
      const drillSet = await invoke<GeneratedDrillSet>("generate_daily_drill_set", {
        seed
      });
      activeDrillSteps = drillSet.scenarios
        .map(drillStepFromGeneratedScenario)
        .filter((step) => step.contract === replayContract);
    } catch {
      activeDrillSteps = generateBrowserPlayBarbuDrillSteps(seed).filter((step) => step.contract === replayContract);
    }

    if (activeDrillSteps.length === 0) {
      activeDrillSteps = drillSteps.filter((step) => step.contract === replayContract);
    }

    drillIndex = 0;
    drillResults = [];
    resetDrillDecision();
    appView = "drill";
  }

  function startLesson(lessonId: string, pathStepId = "") {
    selectLesson(lessonId);
    activePathStepId = pathStepId || (barbuPathSteps.find((step) => step.lessonId === lessonId)?.id ?? "");
    appView = "lesson";
  }

  function startCourse(courseId: string) {
    const course = courseCatalog.find((item) => item.id === courseId);

    if (!course) {
      return;
    }

    activeCourseId = course.id;
    activePathStepId = course.pathStepId;
    activeCourseStage = "concept";
    appView = "courseContent";
  }

  function startCourseForLesson(lessonId: string) {
    const course = courseCatalog.find((item) => item.lessonId === lessonId);

    if (course) {
      startCourse(course.id);
      return;
    }

    startLesson(lessonId);
  }

  function courseForLesson(lessonId: string) {
    return courseCatalog.find((item) => item.lessonId === lessonId);
  }

  function continueCourseContent() {
    if (activeCourseStage === "concept") {
      activeCourseStage = "example";
      return;
    }

    if (activeCourseStage === "example") {
      startLesson(activeCourse.lessonId, activeCourse.pathStepId);
      return;
    }

    if (activeCourseStage === "review") {
      saveCourseProgress({ ...completedPathSteps, [activePathStepId]: true });
      openBarbuTable();
    }
  }

  async function startGeneratedDrill() {
    await startDailyDrill("generated-drill");
  }

  function continueCourse() {
    if (isCourseComplete || !nextPathStep) {
      openBarbuTable();
      return;
    }

    startPathStep(nextPathStep);
  }

  function startPathStep(step: BarbuPathStep) {
    const course = courseCatalog.find((item) => item.pathStepId === step.id);

    if (course) {
      startCourse(course.id);
      return;
    }

    if (step.action === "lesson" && step.lessonId) {
      startLesson(step.lessonId);
      return;
    }

    if (step.action === "generated") {
      void startGeneratedDrill();
      return;
    }

    if (step.action === "review") {
      openPathReview();
    }
  }

  function selectLesson(lessonId: string) {
    const lesson = guidedLessons.find((item) => item.id === lessonId);

    if (!lesson) {
      return;
    }

    selectedLessonId = lesson.id;
    activeTricks = lesson.tricks;
    usingGeneratedPractice = false;
    generatedPracticeError = "";
    trickIndex = 0;
    resetTrick();
  }

  function showFixedLesson() {
    activeTricks = selectedLesson.tricks;
    usingGeneratedPractice = false;
    generatedPracticeError = "";
    trickIndex = 0;
    resetTrick();
  }

  async function loadGeneratedDrill() {
    generatedPracticeError = "";

    try {
      const scenario = await invoke<GeneratedPracticeScenario>("generate_no_hearts_follow_suit", {
        seed: practiceSeed
      });

      practiceSeed += 1;
      activeTricks = [guidedTrickFromGeneratedScenario(scenario)];
      usingGeneratedPractice = true;
      trickIndex = 0;
      resetTrick();
    } catch {
      usingGeneratedPractice = true;
      generatedPracticeError = "Generated drills need the Tauri runtime. Use the fixed lesson here, or run the app with Tauri.";
    }
  }

  function nextTrick() {
    trickIndex = isLastTrick ? 0 : trickIndex + 1;
    resetTrick();
  }

  function finishLesson() {
    if (courseCatalog.some((course) => course.pathStepId === activePathStepId)) {
      activeCourseStage = "review";
      appView = "courseContent";
      return;
    }

    if (activePathStepId) {
      saveCourseProgress({ ...completedPathSteps, [activePathStepId]: true });
    }

    openBarbuTable();
  }

  function resetCourseProgress() {
    saveCourseProgress({});
  }

  function finishPathReview() {
    saveCourseProgress({ ...completedPathSteps, review: true });
    openBarbuTable();
  }

  function selectDrillCard(card: Card) {
    if (drillCheckedCardId) {
      return;
    }

    drillSelectedCardId = card.id;
  }

  function checkDrillAnswer() {
    if (!drillSelectedCard || drillCheckedCardId) {
      return;
    }

    const outcome = buildDrillOutcomeKey(drillSelectedCard);
    const reason = buildDrillReasonKey(drillSelectedCard, outcome);

    drillCheckedCardId = drillSelectedCard.id;
    drillResults = [
      ...drillResults,
      {
        contract: currentDrill.contract,
        cardLabel: drillSelectedCard.label,
        outcome,
        reason,
        clean: cleanDrillOutcomes.includes(outcome)
      }
    ];
  }

  function continueDrill() {
    if (drillIndex === activeDrillSteps.length - 1) {
      saveCompletedDrillSession();
      if (activePathStepId === "generated-drill") {
        saveCourseProgress({ ...completedPathSteps, "generated-drill": true });
      }
      appView = "drillResult";
      return;
    }

    drillIndex += 1;
    resetDrillDecision();
  }

  function drillCardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: drillLegalCardIds.has(card.id) && !drillCheckedCardId,
      illegal: !drillLegalCardIds.has(card.id) && !drillCheckedCardId,
      selected: drillSelectedCardId === card.id,
      played: drillCheckedCardId === card.id
    };
  }

  function buildDrillOutcomeKey(card: Card): GuidedCardOutcome | "illegal" {
    if (!drillLegalCardIds.has(card.id)) {
      return "illegal";
    }

    return currentDrillTrick.cardOutcomes[card.id] ?? "good";
  }

  function buildDrillOutcome(card: Card) {
    return outcomeLabels[buildDrillOutcomeKey(card)];
  }

  function buildDrillReasonKey(card: Card, outcome: GuidedCardOutcome | "illegal"): PracticeReason {
    if (!drillLegalCardIds.has(card.id)) {
      return "off_suit";
    }

    return currentDrillTrick.cardReasons?.[card.id] ?? normalizeStoredReason(undefined, outcome);
  }

  function buildDrillFeedback(card: Card) {
    if (!drillLegalCardIds.has(card.id)) {
      return `${card.label} is off suit while you still have a legal card.`;
    }

    return firstSentence(currentDrillTrick.playedExplanations[card.id] ?? "That legal play completes the trick.");
  }

  function firstSentence(text: string) {
    const match = text.match(/.*?[.!?](?:\s|$)/);
    return (match?.[0] ?? text).trim();
  }

  function drillStepFromGeneratedScenario(scenario: GeneratedPracticeScenario): DrillStep {
    return {
      contract: scenario.contract,
      title: scenario.title,
      trick: guidedTrickFromGeneratedScenario(scenario)
    };
  }

  function saveCompletedDrillSession() {
    if (drillResults.length === 0) {
      return;
    }

    savePlayBarbuHistory([
      {
        id: `${Date.now()}-${drillResults.length}`,
        completedAt: new Date().toISOString(),
        results: drillResults
      },
      ...playBarbuHistory
    ]);
  }

  function summarizeContractResults(results: DrillResult[]): ContractResultSummary[] {
    const summaries = new Map<string, ContractResultSummary>();

    for (const result of results) {
      const summary = summaries.get(result.contract) ?? {
        contract: result.contract,
        clean: 0,
        total: 0,
        outcome: result.outcome
      };

      summary.total += 1;
      summary.clean += result.clean ? 1 : 0;
      summary.outcome = worstOutcome(summary.outcome, result.outcome);
      summaries.set(result.contract, summary);
    }

    return Array.from(summaries.values());
  }

  function weakestContractFromResults(summaries: ContractResultSummary[]) {
    if (summaries.length === 0) {
      return "";
    }

    return [...summaries].sort((left, right) => {
      const leftRate = left.clean / left.total;
      const rightRate = right.clean / right.total;
      return leftRate - rightRate || outcomeSeverity(right.outcome) - outcomeSeverity(left.outcome);
    })[0].contract;
  }

  function worstOutcome(left: GuidedCardOutcome | "illegal", right: GuidedCardOutcome | "illegal") {
    return outcomeSeverity(right) > outcomeSeverity(left) ? right : left;
  }

  function outcomeSeverity(outcome: GuidedCardOutcome | "illegal") {
    const severity: Record<GuidedCardOutcome | "illegal", number> = {
      good: 0,
      risky: 1,
      penalty: 2,
      illegal: 3
    };

    return severity[outcome];
  }

  function adviceForContract(contract: string) {
    if (contract === "No Hearts") {
      return "Before choosing, ask who is winning the trick and whether a heart is already loaded.";
    }

    if (contract === "No Queens") {
      return "Find the queen, then avoid becoming the player who captures that trick.";
    }

    if (contract === "King of Hearts") {
      return "Track KH first; low hearts and safe discards are usually your escape route.";
    }

    return "Play another table to give Barbu enough decisions to review.";
  }

  function buildReviewInsight(attempts: PlayBarbuAttempt[]): ReviewInsight {
    const recentResults = attempts.flatMap((attempt) => attempt.results);

    if (recentResults.length === 0) {
      return {
        contract: "",
        message: "Play a practice table to give Barbu enough decisions to review."
      };
    }

    const priority: PracticeReason[] = [
      "off_suit",
      "captured_penalty",
      "won_clean_trick",
      "void_discard",
      "avoided_penalty",
      "followed_suit"
    ];
    const reason = priority.find((candidate) => recentResults.some((result) => result.reason === candidate));
    const result = reason ? recentResults.find((item) => item.reason === reason) : undefined;
    const contract = result?.contract ?? "";

    if (reason === "off_suit") {
      return {
        contract,
        message: "Check the led suit before choosing. Off-suit cards are only allowed when you are void."
      };
    }

    if (reason === "captured_penalty") {
      return {
        contract,
        message: "You captured a penalty. Before playing high, ask who wins the trick if you stay low."
      };
    }

    if (reason === "won_clean_trick") {
      return {
        contract,
        message: "You won a clean trick. That is legal, but keep checking whether the trick is actually dangerous."
      };
    }

    if (reason === "void_discard") {
      return {
        contract,
        message: "You used a void turn to discard. Keep looking for chances to shed danger when someone else controls the trick."
      };
    }

    if (reason === "avoided_penalty") {
      return {
        contract,
        message: "You avoided the penalty card. Keep locating the trick winner before choosing your card."
      };
    }

    return {
      contract,
      message: "You followed suit well. Keep repeating the table until reading the winner feels automatic."
    };
  }

  function cardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: legalCardIds.has(card.id) && !playedCardId,
      illegal: !legalCardIds.has(card.id) && !playedCardId,
      selected: selectedCardId === card.id,
      played: playedCardId === card.id
    };
  }

  function buildExplanation(selected: Card | undefined, played: Card | undefined) {
    if (played) {
      return currentTrick.playedExplanations[played.id] ?? "That legal play completes the trick.";
    }

    if (!selected) {
      return currentTrick.emptyExplanation;
    }

    if (!legalCardIds.has(selected.id)) {
      return `${selected.label} is not legal here because you still have ${suitNames[currentTrick.hand.find((card) => legalCardIds.has(card.id))?.suit ?? selected.suit]}.`;
    }

    return currentTrick.playedExplanations[selected.id] ?? `${selected.label} is legal here.`;
  }

  function buildLessonOutcome(selected: Card, played: Card | undefined) {
    if (!legalCardIds.has(selected.id)) {
      return outcomeLabels.illegal;
    }

    if (!played) {
      return "";
    }

    return outcomeLabels[currentTrick.cardOutcomes[played.id] ?? "good"];
  }

  function guidedTrickFromGeneratedScenario(scenario: GeneratedPracticeScenario): GuidedTrick {
    return {
      title: scenario.title,
      beforeResult: scenario.prompt,
      afterResult: "Generated drill complete. Check the explanation for the winner and penalty.",
      emptyExplanation: scenario.prompt,
      legalCardIds: scenario.legalCardIds,
      hand: scenario.playerHand,
      tableBeforeChoice: scenario.tableBeforeChoice,
      tableAfterChoice: scenario.tableAfterChoice,
      pendingBySeat: pendingSeatsForGeneratedScenario(scenario),
      playedExplanations: Object.fromEntries(
        scenario.outcomes.map((outcome) => [outcome.cardId, outcome.explanation])
      ),
      cardOutcomes: Object.fromEntries(
        scenario.outcomes.map((outcome) => [outcome.cardId, outcome.outcomeKind])
      ),
      cardReasons: Object.fromEntries(
        scenario.outcomes.map((outcome) => [outcome.cardId, outcome.reason])
      )
    };
  }

  function pendingSeatsForGeneratedScenario(scenario: GeneratedPracticeScenario) {
    const pendingBySeat: Partial<Record<Seat, string>> = { You: "You" };

    for (const play of scenario.tableAfterChoice) {
      pendingBySeat[play.seat] = play.card.label;
    }

    return pendingBySeat;
  }

  function factsForSection(section: GameReference["sections"][number]) {
    return section.facts ?? [];
  }
</script>

{#snippet runScorecard(label = "Barbu scorecard")}
  <div class="run-scorecard" aria-label={label}>
    <div class="run-scorecard-row header">
      <span>Contract</span>
      {#each scoreSeats as seat}
        <span>{scoreSeatLabel(seat)}</span>
      {/each}
    </div>
    {#each fullHandContracts as contract}
      <div class:active={contract === pendingRunContract || fullHand?.contract === contract} class="run-scorecard-row">
        <span>{contract}</span>
        {#each scoreSeats as seat}
          <strong>{scorecardCellLabel(contract, seat)}</strong>
        {/each}
      </div>
    {/each}
    <div class="run-scorecard-row total">
      <span>Total</span>
      {#each scoreSeats as seat}
        <strong>{fullHandRunSeatScores[seat]}</strong>
      {/each}
    </div>
  </div>
{/snippet}

<main class="app-shell">
  {#if appView === "catalog"}
    <section class="welcome-screen" aria-labelledby="catalog-title">
      <div class="welcome-copy">
        <p class="eyebrow">Card game catalog</p>
        <h1 id="catalog-title">Choose a table</h1>
        <p class="intro">
          Pick the game first. Each table keeps its own learning path, practice hands, play modes, and reference.
        </p>
      </div>

      <div class="welcome-table" aria-hidden="true">
        <div class="mini-card mini-card-one"><b>Q</b><small>H</small></div>
        <div class="mini-card mini-card-two"><b>K</b><small>C</small></div>
        <div class="mini-card mini-card-three"><b>A</b><small>S</small></div>
      </div>
    </section>

    <section class="catalog-section" aria-label="Games">
      <div class="section-heading">
        <p class="eyebrow">Games</p>
        <h2>Core games</h2>
      </div>

      <div class="game-grid">
        {#each catalogEntries as game}
          <button
            aria-label={game.status === "Ready" ? `Open ${game.title}` : `${game.title} planned`}
            class:ready={game.status === "Ready"}
            class="game-card"
            disabled={game.status !== "Ready"}
            onclick={() => openGame(game.id)}
            type="button"
          >
            <span class="game-family">{game.family}</span>
            <strong>{game.title}</strong>
            <span class="game-summary">{game.summary}</span>
            <span class="game-baseline">{game.baseline}</span>
            <span class="game-footer">
              <span>{game.status}</span>
              <span>{catalogDetailLabel(game)}</span>
            </span>
          </button>
        {/each}
      </div>
    </section>
  {:else if appView === "barbuTable"}
    <header class="topbar table-topbar" aria-label="Barbu table">
      <button class="back-button" onclick={openCatalog} type="button">Games</button>
      <div class="table-title">
        <p class="eyebrow">Hearts family</p>
        <h1>Barbu's table</h1>
      </div>
      <div class="contract-status">
        <span>King of Cards</span>
        <strong>{completedCount} of {playablePathSteps.length} complete</strong>
      </div>
    </header>

    <section class="table-room" aria-labelledby="barbu-table-title">
      <div class="barbu-card">
        <p class="eyebrow">Coach and opponent</p>
        <h2 id="barbu-table-title">Barbu sets the contract. You learn by playing the decision.</h2>
        <p>
          {isCourseComplete
            ? "You have cleared the first Barbu table. Review the contracts, or reset the path when you want another pass."
            : "Start with compact guided tricks, then move into generated drills as the rules become automatic."}
        </p>
        <div class="course-progress" aria-label="Course progress">
          <span>{completedCount} / {playablePathSteps.length} complete</span>
          <div class="progress-track">
            <div class="progress-fill" style={`width: ${(completedCount / playablePathSteps.length) * 100}%`}></div>
          </div>
        </div>
        <div class="table-action-groups" aria-label="Barbu table actions">
          <section class="table-action-group" aria-label="Learn">
            <p class="eyebrow">Learn</p>
            {#if isCourseComplete}
              <button class="continue-action" onclick={openPathReview} type="button">Review results</button>
              <button class="reset-progress-action" onclick={resetCourseProgress} type="button">Reset path</button>
            {:else if nextPathStep}
              <button class="continue-action" onclick={continueCourse} type="button">
                Continue with {nextPathStep.title}
              </button>
            {/if}
          </section>

          <section class="table-action-group" aria-label="Practice">
            <p class="eyebrow">Practice</p>
            <button class="drill-action" onclick={() => void startDailyDrill()} type="button">Play Barbu</button>
            <button class="drill-action" onclick={openPracticeChooser} type="button">Contract hands</button>
          </section>

          <section class="table-action-group" aria-label="Play">
            <p class="eyebrow">Play</p>
            <button class="drill-action" onclick={startBarbuRun} type="button">Barbu run</button>
          </section>

          <section class="table-action-group" aria-label="Reference">
            <p class="eyebrow">Reference</p>
            <button class="reference-action" onclick={() => openReference("barbu")} type="button">Reference</button>
          </section>
        </div>
      </div>

      <div class="contract-list" aria-label="Core Barbu contracts">
        <div class="section-heading">
          <p class="eyebrow">Core game</p>
          <h2>Barbu contracts</h2>
        </div>
        {#each guidedLessons as lesson}
          <button class="contract-card" onclick={() => startCourseForLesson(lesson.id)} type="button">
            <span>{lesson.contract}</span>
            <strong>{lesson.title}</strong>
            <small>
              {lesson.summary}
              {#if completedPathSteps[courseForLesson(lesson.id)?.pathStepId ?? ""]}
                Complete
              {/if}
            </small>
          </button>
        {/each}
      </div>
    </section>

    <section class="path-section" aria-label="Barbu lesson path">
      <div class="section-heading">
        <p class="eyebrow">Training path</p>
        <h2>Learn the table in five passes</h2>
      </div>

      <div class="path-grid">
        {#each barbuPathSteps as step, index}
          <button
            class:active={step.id === nextPathStep?.id && !completedPathSteps[step.id]}
            class:complete={completedPathSteps[step.id]}
            class:planned={step.action === "planned"}
            class="path-card"
            disabled={step.action === "planned"}
            onclick={() => startPathStep(step)}
            type="button"
          >
            <span class="path-index">{index + 1}</span>
            <span class="path-step">{step.step}</span>
            <strong>{step.title}</strong>
            <small>{step.summary}</small>
            <span class="path-status">
              {#if completedPathSteps[step.id]}
                Complete
              {:else if step.action === "planned"}
                Planned
              {:else if step.id === nextPathStep?.id}
                Next
              {:else}
                Open
              {/if}
            </span>
          </button>
        {/each}
      </div>
    </section>
  {:else if appView === "practiceChooser"}
    <header class="topbar" aria-label="Contract hand practice">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Practice</p>
        <h1>Contract hands</h1>
      </div>
      <div class="contract-status">
        <span>Full hands</span>
        <strong>{fullHandContracts.length} contracts</strong>
      </div>
    </header>

    <section class="practice-chooser-screen" aria-label="Contract hand chooser">
      <div class="practice-chooser-intro">
        <p class="eyebrow">Isolated contracts</p>
        <h2>One contract at a time.</h2>
        <p>Sharpen a single penalty pattern before returning to Barbu's table.</p>
      </div>

      <div class="practice-choice-list" aria-label="Contract hand choices">
        <button class="practice-choice" onclick={() => void startNoHeartsHand()} type="button">
          <span>No Hearts</span>
          <strong>Avoid heart tricks</strong>
        </button>
        <button class="practice-choice" onclick={() => void startNoQueensHand()} type="button">
          <span>No Queens</span>
          <strong>Avoid queen tricks</strong>
        </button>
        <button class="practice-choice" onclick={() => void startKingOfHeartsHand()} type="button">
          <span>King of Hearts</span>
          <strong>Avoid the king</strong>
        </button>
        <button class="practice-choice" onclick={() => void startNoLastTwoHand()} type="button">
          <span>No Last Two</span>
          <strong>Avoid the final tricks</strong>
        </button>
        <button class="practice-choice" onclick={() => void startNoTricksHand()} type="button">
          <span>No Tricks</span>
          <strong>Avoid every trick</strong>
        </button>
        <button class="practice-choice" onclick={() => void startPositiveTricksHand()} type="button">
          <span>Positive Tricks</span>
          <strong>Win tricks on purpose</strong>
        </button>
      </div>
    </section>
  {:else if appView === "reference"}
    <header class="topbar" aria-label={`${activeReference.title} reference`}>
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{activeReference.family} family</p>
        <h1>{activeReference.title} reference</h1>
      </div>
      <div class="contract-status">
        <span>Baseline</span>
        <strong>Parlett</strong>
      </div>
    </header>

    <section class="reference-screen" aria-label="Game reference">
      <section class="reference-overview" aria-label={`${activeReference.title} overview`}>
        <p class="eyebrow">Reference source</p>
        <h2>{activeReference.baseline}</h2>
        <p>{activeReference.overview}</p>
      </section>

      <section class="reference-sections" aria-label={`${activeReference.title} reference sections`}>
        {#each activeReference.sections as section}
          <article class="reference-card">
            <p class="eyebrow">{section.title}</p>
            <p>{section.body}</p>
            {#if factsForSection(section).length}
              <dl>
                {#each factsForSection(section) as fact}
                  <div>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                {/each}
              </dl>
            {/if}
          </article>
        {/each}
      </section>

      <section class="reference-list" aria-label="Contract reference">
        <div class="section-heading">
          <p class="eyebrow">Core game</p>
          <h2>Barbu contracts</h2>
        </div>
        <div class="reference-list-grid">
          {#each activeReference.contracts as contract}
            <article class="reference-card compact">
              <p class="eyebrow">{contract.title}</p>
              <h3>{contract.objective}</h3>
              <p>{contract.scoring}</p>
              <small>{contract.lesson}</small>
            </article>
          {/each}
        </div>
      </section>

      <section class="reference-list" aria-label="Contract roadmap">
        <div class="section-heading">
          <p class="eyebrow">Core roadmap</p>
          <h2>Contract status</h2>
        </div>
        <div class="contract-roadmap-list">
          {#each activeReference.contractRoadmap as item}
            <article class="contract-roadmap-card">
              <div>
                <p class="eyebrow">{item.coreStatus}</p>
                <h3>{item.title}</h3>
              </div>
              <span>{item.appStatus}</span>
              <p>{item.note}</p>
            </article>
          {/each}
        </div>
      </section>

      <section class="reference-list" aria-label="Variants and varieties">
        <div class="section-heading">
          <p class="eyebrow">Varieties of play</p>
          <h2>Documented variations</h2>
        </div>
        <div class="reference-list-grid">
          {#each activeReference.variants as variant}
            <article class="reference-card compact">
              <p class="eyebrow">{variant.title}</p>
              <p>{variant.note}</p>
            </article>
          {/each}
        </div>
      </section>

      <div class="course-actions">
        <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
        <button class="primary-action" onclick={continueCourse} type="button">Continue path</button>
      </div>
    </section>
  {:else if appView === "courseContent"}
    <header class="topbar" aria-label={`${activeCourse.contract} course`}>
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{activeCourse.contract}</p>
        <h1>{activeCourseStage === "review" ? "Review" : activeCourse.title}</h1>
      </div>
      <div class="contract-status">
        <span>Course</span>
        <strong>
          {#if activeCourseStage === "concept"}
            Concept
          {:else if activeCourseStage === "example"}
            Example
          {:else}
            Review
          {/if}
        </strong>
      </div>
    </header>

    <section class="course-screen" aria-label={`${activeCourse.contract} course content`}>
      {#if activeCourseStage === "concept"}
        <div class="course-copy">
          <p class="eyebrow">Concept</p>
          <h2>{activeCourse.concept.heading}</h2>
          <p>{activeCourse.concept.body}</p>
        </div>

        <div class="course-points" aria-label={`${activeCourse.contract} concept points`}>
          {#each activeCourse.concept.points as point}
            <div>
              <span>{point.marker}</span>
              <strong>{point.text}</strong>
            </div>
          {/each}
        </div>
      {:else if activeCourseStage === "example"}
        <div class="example-copy-stack">
          <div class="course-copy">
            <p class="eyebrow">Example</p>
            <h2>{activeCourse.example.heading}</h2>
            <p>{activeCourse.example.body}</p>
          </div>

          <div class="trick-sequence" aria-label={`${activeCourse.contract} trick sequence`}>
            {#each activeCourse.example.sequence as step}
              <div>
                <span>{step.label}</span>
                <strong>{step.text}</strong>
              </div>
            {/each}
          </div>
        </div>

        <div class="example-table">
          <CardTable
            ariaLabel={activeCourse.example.ariaLabel}
            pendingBySeat={activeCourse.example.pendingBySeat}
            tableCards={activeCourse.example.tableCards}
          />
        </div>
      {:else}
        <div class="course-copy">
          <p class="eyebrow">Review</p>
          <h2>{activeCourse.review.heading}</h2>
          <p>{activeCourse.review.body}</p>
        </div>

        <div class="course-points" aria-label={`${activeCourse.contract} review points`}>
          {#each activeCourse.review.points as point}
            <div>
              <span>{point.marker}</span>
              <strong>{point.text}</strong>
            </div>
          {/each}
        </div>
      {/if}

      <div class="course-actions">
        <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
        <button class="primary-action" onclick={continueCourseContent} type="button">
          {#if activeCourseStage === "concept"}
            See example
          {:else if activeCourseStage === "example"}
            Play guided trick
          {:else}
            Finish {activeCourse.contract}
          {/if}
        </button>
      </div>
    </section>
  {:else if appView === "runContractIntro"}
    <header class="topbar" aria-label={`${pendingRunContract} run intro`}>
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Barbu run</p>
        <h1>{pendingRunContract}</h1>
      </div>
      <div class="contract-status">
        <span>Next contract</span>
        <strong>{pendingRunStatusLabel}</strong>
      </div>
    </header>

    <section class="run-intro-screen" aria-label="Barbu run contract intro">
      <div class="run-intro-card">
        <p class="eyebrow">Barbu sets the contract</p>
        <h2>{pendingRunContractIntro.title}</h2>
        <p>{pendingRunContractIntro.reason}</p>
      </div>

      <div class="run-intro-panel">
        <div class="run-score-strip" aria-label="Current run score">
          {#each scoreSeats as seat}
            <div>
              <span>{scoreSeatLabel(seat)}</span>
              <strong>{fullHandRunSeatScores[seat]}</strong>
            </div>
          {/each}
        </div>

        <div class="run-contract-target" aria-label={`${pendingRunContract} target`}>
          <div>
            <span>Target</span>
            <strong>{pendingRunContractIntro.target}</strong>
          </div>
          <div>
            <span>Table habit</span>
            <strong>{pendingRunContractIntro.habit}</strong>
          </div>
        </div>

        {@render runScorecard("Barbu run scorecard")}

        <div class="course-actions">
          <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
          <button class="primary-action" onclick={startPendingRunContract} type="button">Start hand</button>
        </div>
      </div>
    </section>
  {:else if appView === "fullHand"}
    {#if fullHand}
      <TablePlaySurface
        mode={fullHand.status === "complete" ? "result" : "play"}
        ariaLabel={`${fullHand.contract} full hand`}
        title={`${fullHand.contract} hand`}
        eyebrow="Full-hand skeleton"
        statusLabel={fullHandRunStatusLabel}
        statusValue={`${fullHand.playerPenalty} ${fullHandPlayerPenaltyLabel}`}
        tableAriaLabel={`${fullHand.contract} hand table`}
        pendingBySeat={fullHandPendingBySeat}
        showTable={!fullHandRunIsComplete}
        tableCards={fullHandVisibleTableCards}
        panelAriaLabel={`${fullHand.contract} hand decision`}
        onBack={openBarbuTable}
        onSurfaceClick={fullHandIsReviewingTrick ? continueFullHandAfterTrick : undefined}
      >
        {#snippet summary()}
          {#if !fullHandRunIsComplete}
            <div class="full-hand-summary" aria-label={`${fullHand.contract} hand score`}>
              <div>
                <span>{fullHandContractMeta.scoreLabel}</span>
                <strong>{fullHand.playerPenalty}</strong>
              </div>
              <div>
                <span>{fullHandPenaltyPlayedLabel}</span>
                <strong>{fullHand.totalPenalty} / {fullHandPenaltyTotal}</strong>
              </div>
              <div>
                <span>Tricks</span>
                <strong>{fullHand.completedTricks.length} / 13</strong>
              </div>
              {#if fullHandRunActive}
                {#each scoreSeats as seat}
                  <div>
                    <span>{scoreSeatRunLabel(seat)} run</span>
                    <strong>{fullHandRunSeatScores[seat]}</strong>
                  </div>
                {/each}
              {/if}
            </div>
          {:else}
            <div class="full-hand-summary compact-run-complete" aria-label={`${fullHand.contract} hand score`}>
              {#each scoreSeats as seat}
                <div>
                  <span>{scoreSeatRunLabel(seat)} run</span>
                  <strong>{fullHandRunSeatScores[seat]}</strong>
                </div>
              {/each}
            </div>
          {/if}
        {/snippet}

        {#snippet panel()}
          {#if fullHand.status === "complete"}
            {#if fullHandRunIsComplete}
              <div class="lesson-heading">
                <p class="eyebrow">Run result</p>
                <h2>{fullHandRunResultTitle}</h2>
              </div>

              <p class="result">{fullHandRunResultSummary}</p>

              <div class="full-hand-run-score" aria-label="Barbu run score">
                {#each fullHandRunStandings as standing}
                  <div>
                    <span>{formatOrdinal(standing.rank)} {scoreSeatLabel(standing.seat)}</span>
                    <strong>{standing.score}</strong>
                  </div>
                {/each}
              </div>

              <div class="run-settlement-grid" aria-label="Barbu run settlement">
                <div>
                  <span>Your place</span>
                  <strong>{fullHandRunPlayerStanding ? formatOrdinal(fullHandRunPlayerStanding.rank) : "Done"}</strong>
                </div>
                <div>
                  <span>Best contract</span>
                  <strong>
                    {#if fullHandRunBestContract}
                      {fullHandRunBestContract.contract}: {formatContractPenalty(
                        fullHandRunBestContract.contract,
                        fullHandRunBestContract.seatPenalties.You ?? 0
                      )}
                    {:else}
                      Run complete
                    {/if}
                  </strong>
                </div>
                <div>
                  <span>Practice next</span>
                  <strong>
                    {#if fullHandRunWeakestContract}
                      {fullHandRunWeakestContract.contract}: {formatContractPenalty(
                        fullHandRunWeakestContract.contract,
                        fullHandRunWeakestContract.seatPenalties.You ?? 0
                      )}
                    {:else}
                      Replay a hand
                    {/if}
                  </strong>
                </div>
              </div>

              {@render runScorecard("Barbu run results")}
            {:else}
              <div class="lesson-heading">
                <p class="eyebrow">Result</p>
                <h2>{fullHandResultTitle}</h2>
              </div>

              <p class="result">{fullHandResultSummary}</p>

              <div class="full-hand-result-grid" aria-label={`${fullHand.contract} result summary`}>
                {#each scoreSeats as seat}
                  <div>
                    <span>{scoreSeatResultLabel(seat)}</span>
                    <strong>{formatFullHandPenalty(fullHandSeatPenalties[seat])}</strong>
                  </div>
                {/each}
              </div>

              <div class="full-hand-result-tricks" aria-label={`${fullHand.contract} key tricks`}>
                <div>
                  <span>{fullHandContractMeta.bestLabel}</span>
                  <strong>{fullHandBestTrick}</strong>
                </div>
                <div>
                  <span>{fullHandContractMeta.weakestLabel}</span>
                  <strong>{fullHandWorstTrick}</strong>
                </div>
              </div>
            {/if}
          {:else if fullHandIsReviewingTrick}
            <div class="lesson-heading">
              <p class="eyebrow">Trick complete</p>
              <h2>Read the table</h2>
            </div>

            <p class:warning={fullHandTrickIsWarning(fullHandReviewTrick)} class="outcome">
              {fullHandReviewFeedback}
            </p>
            <p class="explanation">Left's card is on the table. Tap the table or press Next trick when you are ready.</p>
          {:else}
            <div class="lesson-heading">
              <p class="eyebrow">{usingBrowserFullHand ? "Local browser hand" : "Rust hand"}</p>
              <h2>Choose your card</h2>
            </div>

            <p class="result">{fullHand.prompt}</p>
            {#if fullHandLastFeedback}
              <p class:warning={fullHandTrickIsWarning(fullHandLastCompletedTrick)} class="outcome">
                {fullHandLastFeedback}
              </p>
            {/if}
            {#if fullHandError}
              <p class="outcome warning">{fullHandError}</p>
            {/if}
            <p class="explanation">
              {fullHandSelectedCard
                ? fullHandLegalCardIds.has(fullHandSelectedCard.id)
                  ? `${fullHandSelectedCard.label} is legal here.`
                  : `${fullHandSelectedCard.label} is off suit while you still have a legal card.`
                : "Legal cards are highlighted. Barbu's table will finish the trick after you play."}
            </p>

            <div class="hand full-hand-cards" aria-label={`Your ${fullHand.contract} hand`}>
              {#each fullHand.playerHand as card}
                <button
                  aria-pressed={fullHandSelectedCardId === card.id}
                  class:heart={fullHandCardClasses(card).heart}
                  class:illegal={fullHandCardClasses(card).illegal}
                  class:legal={fullHandCardClasses(card).legal}
                  class:selected={fullHandCardClasses(card).selected}
                  class="card hand-card full-hand-card"
                  onclick={() => void selectFullHandCard(card)}
                  type="button"
                >
                  <b>{card.rank}</b>
                  <small>{card.suit}</small>
                </button>
              {/each}
            </div>
          {/if}

          <div class="action-row">
            {#if fullHand.status === "complete"}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              {#if fullHandRunIsComplete}
                <button class="secondary-action" onclick={() => void replayWeakestRunContract()} type="button">Replay weakest</button>
                <button class="primary-action" onclick={startBarbuRun} type="button">New run</button>
              {:else}
                <button class="secondary-action" onclick={() => void startNextFullHand()} type="button">{fullHandNextActionLabel}</button>
                <button class="primary-action" onclick={() => void replayFullHand()} type="button">Replay</button>
              {/if}
            {:else if fullHandIsReviewingTrick}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              <button class="primary-action" onclick={continueFullHandAfterTrick} type="button">Next trick</button>
            {:else}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              <button
                class="primary-action"
                disabled={!fullHandSelectedCard || !fullHandLegalCardIds.has(fullHandSelectedCard.id)}
                onclick={() => void playFullHandCard()}
                type="button"
              >
                Play card
              </button>
            {/if}
          </div>
        {/snippet}
      </TablePlaySurface>
    {/if}
  {:else if appView === "drill"}
    <TablePlaySurface
      mode="play"
      ariaLabel="Play Barbu game"
      title="Play Barbu"
      eyebrow={drillSetTitle}
      statusLabel={currentDrill.contract}
      statusValue={`Decision ${drillIndex + 1} of ${activeDrillSteps.length}`}
      tableAriaLabel="Drill card table"
      pendingBySeat={currentDrillTrick.pendingBySeat}
      tableCards={drillCompletedTable}
      panelAriaLabel="Drill decision"
      onBack={openBarbuTable}
    >
      {#snippet track()}
        <div class="drill-track" aria-label="Drill progress">
          {#each activeDrillSteps as step, index}
            <span
              class:active={index === drillIndex}
              class:complete={index < drillResults.length}
              aria-label={`Decision ${index + 1}: ${step.contract}`}
            >
              {index + 1}
            </span>
          {/each}
        </div>
      {/snippet}

      {#snippet panel()}
        <div class="lesson-heading">
          <p class="eyebrow">{currentDrill.contract}</p>
          <h2>{currentDrillTrick.title}</h2>
        </div>

        <p class="result">{currentDrillTrick.beforeResult}</p>
        <p class="explanation">{drillFeedback}</p>
        {#if drillOutcome}
          <p
            class:warning={drillOutcome === "Illegal" || drillOutcome === "Risky" || drillOutcome === "Penalty"}
            class="outcome"
          >
            {drillOutcome}
          </p>
        {/if}

        <div class="hand drill-hand" aria-label="Your drill hand">
          {#each currentDrillTrick.hand as card}
            <button
              aria-pressed={drillSelectedCardId === card.id}
              class:heart={drillCardClasses(card).heart}
              class:illegal={drillCardClasses(card).illegal}
              class:legal={drillCardClasses(card).legal}
              class:played={drillCardClasses(card).played}
              class:selected={drillCardClasses(card).selected}
              class="card hand-card"
              onclick={() => selectDrillCard(card)}
              type="button"
            >
              <b>{card.rank}</b>
              <small>{card.suit}</small>
            </button>
          {/each}
        </div>

        <div class="action-row">
          {#if drillCheckedCard}
            <button class="primary-action" onclick={continueDrill} type="button">
              {drillIndex === activeDrillSteps.length - 1 ? "Finish game" : "Next table"}
            </button>
          {:else}
            <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
            <button class="primary-action" disabled={!drillSelectedCard} onclick={checkDrillAnswer} type="button">
              Check answer
            </button>
          {/if}
        </div>
      {/snippet}
    </TablePlaySurface>
  {:else if appView === "drillResult"}
    <header class="topbar" aria-label="Drill result">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{drillSetTitle}</p>
        <h1>Game complete</h1>
      </div>
      <div class="contract-status">
        <span>Score</span>
        <strong>{cleanDrillCount} of {activeDrillSteps.length} clean</strong>
      </div>
    </header>

    <section class="drill-result-screen" aria-label="Drill results">
      <div class="drill-score-card">
        <p class="eyebrow">Result</p>
        <h2>{cleanDrillCount} / {activeDrillSteps.length} clean decisions</h2>
        <p>
          {cleanDrillCount === activeDrillSteps.length
            ? "Clean table. Barbu is ready to raise the pressure."
            : "Run the table again and make the legal card automatic."}
        </p>
      </div>

      <div class="drill-result-list" aria-label="Decision results">
        {#each drillResults as result, index}
          <div>
            <span>{index + 1}</span>
            <strong>{result.contract}</strong>
            <small>{outcomeLabels[result.outcome]}</small>
            <em>{result.cardLabel}</em>
          </div>
        {/each}
      </div>

      <div class="contract-result-list" aria-label="Contract results">
        {#each currentContractResults as result}
          <div>
            <span>{result.clean === result.total ? "Clean" : outcomeLabels[result.outcome]}</span>
            <strong>{result.contract}</strong>
            <small>{result.clean} / {result.total} clean</small>
          </div>
        {/each}
      </div>

      {#if recentPlayBarbuAttempts.length}
        <div class="recent-attempt-list" aria-label="Recent Play Barbu attempts">
          <p class="eyebrow">Recent tables</p>
          {#each recentPlayBarbuAttempts as attempt}
            <div>
              <strong>{attempt.results.filter((result) => result.clean).length} / {attempt.results.length} clean</strong>
              <small>{attempt.results.map((result) => result.contract).join(" · ")}</small>
            </div>
          {/each}
        </div>
      {/if}

      <div class="course-actions">
        <button class="secondary-action" onclick={() => void startDailyDrill()} type="button">Try again</button>
        <button class="secondary-action" onclick={() => void replayWeakContract()} type="button">
          Replay {weakContract || "table"}
        </button>
        <button class="primary-action" onclick={continueCourse} type="button">Continue path</button>
      </div>
    </section>
  {:else if appView === "pathReview"}
    <header class="topbar" aria-label="Barbu review">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Review</p>
        <h1>Review the hand</h1>
      </div>
      <div class="contract-status">
        <span>Latest</span>
        <strong>{reviewCleanCount} of {reviewResults.length} clean</strong>
      </div>
    </header>

    <section class="drill-result-screen" aria-label="Review results">
      <div class="drill-score-card">
        <p class="eyebrow">Latest table</p>
        <h2>
          {#if reviewResults.length}
            {reviewCleanCount} / {reviewResults.length} clean decisions
          {:else}
            No table yet
          {/if}
        </h2>
        <p>{reviewAdvice}</p>
      </div>

      {#if reviewContractResults.length}
        <div class="contract-result-list" aria-label="Review contract results">
          {#each reviewContractResults as result}
            <div>
              <span>{result.clean === result.total ? "Clean" : outcomeLabels[result.outcome]}</span>
              <strong>{result.contract}</strong>
              <small>{result.clean} / {result.total} clean</small>
            </div>
          {/each}
        </div>
      {:else}
        <div class="contract-result-list" aria-label="Review contract results">
          <div>
            <span>Ready</span>
            <strong>Play Barbu</strong>
            <small>Finish a practice table to unlock review feedback.</small>
          </div>
        </div>
      {/if}

      {#if recentPlayBarbuAttempts.length}
        <div class="recent-attempt-list" aria-label="Review recent attempts">
          <p class="eyebrow">Recent tables</p>
          {#each recentPlayBarbuAttempts as attempt}
            <div>
              <strong>{attempt.results.filter((result) => result.clean).length} / {attempt.results.length} clean</strong>
              <small>{attempt.results.map((result) => result.contract).join(" · ")}</small>
            </div>
          {/each}
        </div>
      {/if}

      <div class="course-actions">
        <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
        <button class="secondary-action" onclick={() => void replayReviewWeakContract()} type="button">
          Replay {reviewReplayContract || "table"}
        </button>
        <button class="secondary-action" onclick={() => void startDailyDrill("generated-drill")} type="button">Play Barbu</button>
        <button class="primary-action" onclick={finishPathReview} type="button">Finish review</button>
      </div>
    </section>
  {:else}
    <header class="topbar" aria-label="Current game">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{familyLabel} family</p>
        <h1>{gameLabel}</h1>
      </div>
      <div class="contract-status">
        <span>{contractLabel}</span>
        <strong>Trick {trickIndex + 1} of {activeTricks.length}</strong>
      </div>
    </header>

    <section class="lesson-row" aria-label="Guided Barbu lessons">
      {#each guidedLessons as lesson}
        <button
          class:active={!usingGeneratedPractice && selectedLessonId === lesson.id}
          class="lesson-chip"
          onclick={() => selectLesson(lesson.id)}
          type="button"
        >
          <span>{lesson.contract}</span>
          <small>{lesson.summary}</small>
        </button>
      {/each}
    </section>

    <section class="mode-row" aria-label="Learning mode">
      <button class:active={!usingGeneratedPractice} class="mode-tab" onclick={showFixedLesson} type="button">Practice</button>
      <button class:active={usingGeneratedPractice} class="mode-tab" onclick={loadGeneratedDrill} type="button">Generated</button>
      <button class="mode-tab" type="button">Learn</button>
      <button class="mode-tab" type="button">Rules</button>
    </section>

    <section class="learning-surface" aria-label="Guided trick">
      <CardTable ariaLabel="Card table" pendingBySeat={currentTrick.pendingBySeat} tableCards={completedTable} />

      <section class="lesson-panel" aria-label="Current lesson">
        <div class="lesson-heading">
          <p class="eyebrow">{contractLabel}</p>
          <h2>{currentTrick.title}</h2>
        </div>

        <p class="result">{resultText}</p>
        <p class="explanation">{explanation}</p>
        {#if lessonOutcome}
          <p
            class:warning={lessonOutcome === "Illegal" || lessonOutcome === "Risky" || lessonOutcome === "Penalty"}
            class="outcome"
          >
            {lessonOutcome}
          </p>
        {/if}

        <div class="hand" aria-label="Your hand">
          {#each hand as card}
            <button
              aria-pressed={selectedCardId === card.id}
              class:heart={card.suit === "H"}
              class:illegal={cardClasses(card).illegal}
              class:legal={cardClasses(card).legal}
              class:played={cardClasses(card).played}
              class:selected={cardClasses(card).selected}
              class="card hand-card"
              onclick={() => selectCard(card)}
              type="button"
            >
              <b>{card.rank}</b>
              <small>{card.suit}</small>
            </button>
          {/each}
        </div>

        <div class="action-row">
          {#if generatedPracticeError}
            <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
            <button class="primary-action" onclick={finishLesson} type="button">Mark practiced</button>
          {:else if playedCard}
            <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
            {#if isLastTrick}
              <button class="primary-action" onclick={finishLesson} type="button">Finish lesson</button>
            {:else}
              <button class="primary-action" onclick={nextTrick} type="button">Next trick</button>
            {/if}
          {:else}
            <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
            <button class="primary-action" disabled={!isSelectedLegal} onclick={playSelectedCard} type="button">
              Play selected
            </button>
          {/if}
        </div>
      </section>
    </section>
  {/if}
</main>
