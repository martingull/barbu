<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import {
    playBrowserKingOfHeartsCard,
    playBrowserNoHeartsCard,
    playBrowserNoQueensCard,
    startBrowserKingOfHeartsHand,
    startBrowserNoHeartsHand,
    startBrowserNoQueensHand
  } from "./browserHandFallback";
  import { generateBrowserPlayBarbuDrillSteps } from "./browserDrillFallback";
  import CardTable from "./CardTable.svelte";
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
    | "reference"
    | "courseContent"
    | "lesson"
    | "drill"
    | "drillResult"
    | "fullHand"
    | "pathReview";

  type PathAction = "lesson" | "generated" | "review" | "planned";
  type CourseStage = "concept" | "example" | "review";

  type CatalogStatus = "Ready" | "Planned" | "Documented";
  type CatalogEntryKind = "core" | "variety";

  type CatalogEntry = {
    id: string;
    family: string;
    title: string;
    kind: CatalogEntryKind;
    status: CatalogStatus;
    summary: string;
    baseline: string;
    lessonCount: number;
    coreGameId?: string;
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

  type FullHandContractMeta = {
    penaltyName: string;
    penaltyPlural: string;
    penaltyTotal: number;
    playedLabel: string;
    startCommand: string;
    playCommand: string;
  };

  const catalogEntries: CatalogEntry[] = [
    {
      id: "barbu",
      family: "Hearts",
      title: "Barbu",
      kind: "core",
      status: "Ready",
      summary: "Contract trick-taking against the King of Cards.",
      baseline: "Parlett baseline",
      lessonCount: guidedLessons.length
    },
    {
      id: "hearts",
      family: "Hearts",
      title: "Hearts",
      kind: "core",
      status: "Planned",
      summary: "Plain-trick foundations before the contracts expand.",
      baseline: "Parlett baseline",
      lessonCount: 0
    },
    {
      id: "whist",
      family: "Whist",
      title: "Whist",
      kind: "core",
      status: "Planned",
      summary: "Partnership trick play and long-suit development.",
      baseline: "Parlett baseline",
      lessonCount: 0
    },
    {
      id: "bridge",
      family: "Bridge",
      title: "Bridge",
      kind: "core",
      status: "Planned",
      summary: "Declarer play, defense, and bidding concepts.",
      baseline: "Parlett baseline",
      lessonCount: 0
    },
    {
      id: "barbu-learning-table",
      family: "Hearts",
      title: "Barbu Learning Table",
      kind: "variety",
      status: "Documented",
      summary: "The app's teaching version: puzzle-sized decisions before full hands.",
      baseline: "Variety of Barbu",
      lessonCount: guidedLessons.length,
      coreGameId: "barbu"
    },
    {
      id: "barbu-full-hand",
      family: "Hearts",
      title: "Full-Hand Barbu",
      kind: "variety",
      status: "Planned",
      summary: "A later table for complete hands, scoring runs, and opponent behavior.",
      baseline: "Variety of Barbu",
      lessonCount: 0,
      coreGameId: "barbu"
    }
  ];

  const coreGameCatalog = catalogEntries.filter((entry) => entry.kind === "core");
  const varietyCatalog = catalogEntries.filter((entry) => entry.kind === "variety");
  const learningSteps = ["Concepts", "Examples", "Guided tricks", "Practice", "Review"];
  const progressStorageKey = "barbu.courseProgress.v1";
  const practiceSeedStorageKey = "barbu.practiceSeed.v1";
  const playBarbuHistoryStorageKey = "barbu.playHistory.v1";
  const maxStoredPlayBarbuAttempts = 8;
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
  let usingBrowserFullHand = false;
  let lastFullHandTapCardId = "";
  let lastFullHandTapAt = 0;

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
  $: fullHandLastFeedback = fullHandLastCompletedTrick ? fullHandTrickFeedback(fullHandLastCompletedTrick) : "";
  $: fullHandVisibleTableCards = fullHand?.currentTrick.length
    ? fullHand.currentTrick
    : (fullHandLastCompletedTrick?.cards ?? []);
  $: fullHandPendingBySeat =
    fullHand?.status === "in_progress" && fullHand.currentPlayer === "You" && fullHand.currentTrick.length < 4
      ? { You: "You" }
      : {};
  $: fullHandContractMeta = fullHandMeta(fullHand?.contract ?? "No Hearts");
  $: fullHandPenaltyName = fullHandContractMeta.penaltyName;
  $: fullHandPenaltyPlural = fullHandContractMeta.penaltyPlural;
  $: fullHandPenaltyTotal = fullHandContractMeta.penaltyTotal;
  $: fullHandPenaltyPlayedLabel = fullHandContractMeta.playedLabel;
  $: fullHandPlayerPenaltyLabel =
    fullHand?.playerPenalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural;

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
    if (entry.kind === "variety") {
      return entry.status === "Documented" ? "Reference only" : "Not scheduled";
    }
    return "No lessons yet";
  }

  function fullHandMeta(contract: FullHandContract): FullHandContractMeta {
    if (contract === "No Queens") {
      return {
        penaltyName: "queen",
        penaltyPlural: "queens",
        penaltyTotal: 4,
        playedLabel: "queens played",
        startCommand: "start_no_queens_hand",
        playCommand: "play_no_queens_hand_card"
      };
    }
    if (contract === "King of Hearts") {
      return {
        penaltyName: "king",
        penaltyPlural: "kings",
        penaltyTotal: 1,
        playedLabel: "king played",
        startCommand: "start_king_of_hearts_hand",
        playCommand: "play_king_of_hearts_hand_card"
      };
    }

    return {
      penaltyName: "heart",
      penaltyPlural: "hearts",
      penaltyTotal: 13,
      playedLabel: "hearts played",
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

    return startBrowserNoHeartsHand(seed);
  }

  function playBrowserFullHand(state: FullHandState, cardId: string) {
    if (state.contract === "No Queens") {
      return playBrowserNoQueensCard(state, cardId);
    }
    if (state.contract === "King of Hearts") {
      return playBrowserKingOfHeartsCard(state, cardId);
    }

    return playBrowserNoHeartsCard(state, cardId);
  }

  async function startFullHand(contract: FullHandContract) {
    const seed = usePracticeSeed();
    fullHandSelectedCardId = "";
    fullHandError = "";
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
    if (!fullHand || fullHand.status === "complete") {
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
    if (!fullHand || !cardId || !fullHandLegalCardIds.has(cardId)) {
      return;
    }

    fullHandError = "";

    if (usingBrowserFullHand) {
      fullHand = playBrowserFullHand(fullHand, cardId);
      fullHandSelectedCardId = "";
      lastFullHandTapCardId = "";
      lastFullHandTapAt = 0;
      return;
    }

    try {
      fullHand = await invoke<FullHandState>(fullHandMeta(fullHand.contract).playCommand, {
        state: fullHand,
        cardId
      });
      fullHandSelectedCardId = "";
      lastFullHandTapCardId = "";
      lastFullHandTapAt = 0;
    } catch (error) {
      fullHandError = typeof error === "string" ? error : "That card could not be played.";
    }
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

  function fullHandCardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: fullHandLegalCardIds.has(card.id),
      illegal: !fullHandLegalCardIds.has(card.id),
      selected: fullHandSelectedCardId === card.id
    };
  }

  function fullHandTrickOutcomeLabel(trick: CompletedHandTrick) {
    if (trick.outcome === "captured_penalty") {
      return "Penalty";
    }
    if (trick.outcome === "avoided_penalty") {
      return "Avoided";
    }
    if (trick.outcome === "won_clean_trick") {
      return "Clean win";
    }
    return "Clear";
  }

  function fullHandTrickFeedback(trick: CompletedHandTrick) {
    const penaltyText = `${trick.penalty} ${trick.penalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;

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
      return `You won a clean trick. Legal, but keep checking whether ${fullHandPenaltyPlural} can still enter the trick.`;
    }
    if (fullHand?.contract === "King of Hearts") {
      return `${trick.winner} won a clean trick. KH did not move, so you stayed clear.`;
    }
    return `${trick.winner} won a clean trick. No ${fullHandPenaltyPlural} moved, so you stayed clear.`;
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

  function startLesson(lessonId: string) {
    selectLesson(lessonId);
    activePathStepId = barbuPathSteps.find((step) => step.lessonId === lessonId)?.id ?? "";
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

  function continueCourseContent() {
    if (activeCourseStage === "concept") {
      activeCourseStage = "example";
      return;
    }

    if (activeCourseStage === "example") {
      startLesson(activeCourse.lessonId);
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

<main class="app-shell">
  {#if appView === "catalog"}
    <section class="welcome-screen" aria-labelledby="catalog-title">
      <div class="welcome-copy">
        <p class="eyebrow">Card game catalog</p>
        <h1 id="catalog-title">Choose a table</h1>
        <p class="intro">
          Start with the core Barbu table. Teaching varieties and future rule variations stay attached to their parent
          game as the curriculum grows.
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
        <p class="eyebrow">Learning paths</p>
        <h2>Core games</h2>
      </div>

      <div class="game-grid">
        {#each coreGameCatalog as game}
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

    <section class="catalog-section" aria-label="Varieties of play">
      <div class="section-heading">
        <p class="eyebrow">Game variations</p>
        <h2>Varieties of play</h2>
      </div>

      <div class="game-grid variety-grid">
        {#each varietyCatalog as variety}
          <article aria-label={`${variety.title} ${variety.status}`} class="game-card variety-card">
            <span class="game-family">{variety.family}</span>
            <strong>{variety.title}</strong>
            <span class="game-summary">{variety.summary}</span>
            <span class="game-baseline">{variety.baseline}</span>
            <span class="game-footer">
              <span>{variety.status}</span>
              <span>{catalogDetailLabel(variety)}</span>
            </span>
          </article>
        {/each}
      </div>
    </section>

    <section class="progression-section" aria-label="Lesson progression">
      {#each learningSteps as step, index}
        <div class="progression-step">
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      {/each}
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
        <div class="table-actions">
          <button class="drill-action" onclick={() => void startDailyDrill()} type="button">Play Barbu</button>
          <button class="drill-action" onclick={() => void startNoHeartsHand()} type="button">No Hearts hand</button>
          <button class="drill-action" onclick={() => void startNoQueensHand()} type="button">No Queens hand</button>
          <button class="drill-action" onclick={() => void startKingOfHeartsHand()} type="button">King of Hearts hand</button>
          <button class="reference-action" onclick={() => openReference("barbu")} type="button">Reference</button>
          {#if isCourseComplete}
            <button class="continue-action" onclick={openPathReview} type="button">Review results</button>
            <button class="reset-progress-action" onclick={resetCourseProgress} type="button">Reset path</button>
          {:else if nextPathStep}
            <button class="continue-action" onclick={continueCourse} type="button">
              Continue with {nextPathStep.title}
            </button>
          {/if}
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
            <small>{lesson.summary}</small>
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
  {:else if appView === "fullHand"}
    <header
      class:compact-play={fullHand?.status !== "complete"}
      class="topbar"
      aria-label={`${fullHand?.contract ?? "Barbu"} hand`}
    >
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Full-hand skeleton</p>
        <h1>{fullHand?.contract ?? "Barbu"} hand</h1>
      </div>
      <div class="contract-status">
        <span>{fullHand?.status === "complete" ? "Complete" : `Trick ${fullHand?.trickNumber ?? 1}`}</span>
        <strong>{fullHand?.playerPenalty ?? 0} {fullHandPlayerPenaltyLabel}</strong>
      </div>
    </header>

    {#if fullHand}
      <section
        class:compact-play={fullHand.status !== "complete"}
        class="full-hand-surface"
        aria-label={`${fullHand.contract} full hand`}
      >
        <div class="full-hand-summary" aria-label={`${fullHand.contract} hand score`}>
          <div>
            <span>Your score</span>
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
        </div>

        <CardTable
          ariaLabel={`${fullHand.contract} hand table`}
          pendingBySeat={fullHandPendingBySeat}
          tableCards={fullHandVisibleTableCards}
        />

        <section class="lesson-panel full-hand-panel" aria-label={`${fullHand.contract} hand decision`}>
          <div class="lesson-heading">
            <p class="eyebrow">{usingBrowserFullHand ? "Local browser hand" : "Rust hand"}</p>
            <h2>{fullHand.status === "complete" ? "Hand complete" : "Choose your card"}</h2>
          </div>

          <p class="result">{fullHand.prompt}</p>
          {#if fullHandLastFeedback}
            <p class:warning={fullHandLastCompletedTrick?.outcome === "captured_penalty"} class="outcome">
              {fullHandLastFeedback}
            </p>
          {/if}
          {#if fullHandError}
            <p class="outcome warning">{fullHandError}</p>
          {:else if fullHand.status === "complete"}
            <p class="explanation">
              {fullHand.playerPenalty === 0
                ? fullHand.contract === "King of Hearts"
                  ? "Clean hand. You avoided the king of hearts."
                  : `Clean hand. You avoided every ${fullHandPenaltyName} trick.`
                : `You captured ${fullHand.playerPenalty} ${fullHand.playerPenalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}.`}
            </p>
          {:else}
            <p class="explanation">
              {fullHandSelectedCard
                ? fullHandLegalCardIds.has(fullHandSelectedCard.id)
                  ? `${fullHandSelectedCard.label} is legal here.`
                  : `${fullHandSelectedCard.label} is off suit while you still have a legal card.`
                : "Legal cards are highlighted. Barbu's table will finish the trick after you play."}
            </p>
          {/if}

          <div class="hand full-hand-cards" aria-label={`Your ${fullHand.contract} hand`}>
            {#each fullHand.playerHand as card}
              <button
                aria-pressed={fullHandSelectedCardId === card.id}
                class:heart={fullHandCardClasses(card).heart}
                class:illegal={fullHandCardClasses(card).illegal}
                class:legal={fullHandCardClasses(card).legal}
                class:selected={fullHandCardClasses(card).selected}
                class="card hand-card full-hand-card"
                disabled={fullHand.status === "complete"}
                onclick={() => void selectFullHandCard(card)}
                type="button"
              >
                <b>{card.rank}</b>
                <small>{card.suit}</small>
              </button>
            {/each}
          </div>

          {#if fullHand.completedTricks.length}
            <div class="completed-trick-list" aria-label={`Completed ${fullHand.contract} tricks`}>
              <p class="eyebrow">Recent tricks</p>
              {#each fullHand.completedTricks.slice(-3).reverse() as trick}
                <div>
                  <span>{fullHandTrickOutcomeLabel(trick)}</span>
                  <strong>{trick.winner} won</strong>
                  <small>{trick.penalty} {trick.penalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}</small>
                  <em>{fullHandTrickFeedback(trick)}</em>
                </div>
              {/each}
            </div>
          {/if}

          <div class="action-row">
            {#if fullHand.status === "complete"}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              <button class="primary-action" onclick={() => void startFullHand(fullHand.contract)} type="button">New hand</button>
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
        </section>
      </section>
    {/if}
  {:else if appView === "drill"}
    <header class="topbar" aria-label="Play Barbu">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{drillSetTitle}</p>
        <h1>Play Barbu</h1>
      </div>
      <div class="contract-status">
        <span>{currentDrill.contract}</span>
        <strong>Decision {drillIndex + 1} of {activeDrillSteps.length}</strong>
      </div>
    </header>

    <section class="drill-surface" aria-label="Play Barbu game">
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

      <CardTable ariaLabel="Drill card table" pendingBySeat={currentDrillTrick.pendingBySeat} tableCards={drillCompletedTable} />

      <section class="lesson-panel drill-panel" aria-label="Drill decision">
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

        <div class="hand" aria-label="Your drill hand">
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
      </section>
    </section>
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
