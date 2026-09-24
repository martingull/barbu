<script lang="ts">
  import BarbuPlay from "./features/barbu/BarbuPlay.svelte";
  import BarbuHandView from "./features/barbu/BarbuHandView.svelte";
  import DominoHandView from "./features/barbu/DominoHandView.svelte";
  import { createBarbuFeature } from "./features/barbu/barbuFeature";
  import { savedPlayBarbuRunSummary } from "./persistence/barbuSave";
  import { noLastTwoPhaseLabel, noLastTwoPhaseValue, fullHandTrickFeedback as barbuTrickFeedback, dominoSuitLabel, dominoStartRank, dominoLaneText, dominoMoveExplanation } from "./features/barbu/barbuPresentation";

  import BridgeGame from "./features/bridge/BridgeGame.svelte";
  import { createBridgeFeature } from "./features/bridge/bridgeFeature";
  import SpadesGame from "./features/spades/SpadesGame.svelte";
  import { createSpadesFeature } from "./features/spades/spadesFeature";
  import HeartsGame from "./features/hearts/HeartsGame.svelte";
  import { createHeartsFeature } from "./features/hearts/heartsFeature";
  import { heartsTrickFeedback } from "./features/hearts/heartsPresentation";
  import { scoreSeats, scoreSeatLabel, scoreSeatRunLabel, formatPointCount } from "./scorePresentation";
  import { drillStepFromGeneratedScenario } from "./lessons/generatedDrill";

  import WhistGame from "./features/whist/WhistGame.svelte";
  import { createWhistFeature } from "./features/whist/whistFeature";
  import DrillResultScreen from "./DrillResultScreen.svelte";
  import { summarizeContractResults, weakestContractFromResults, buildDrillLoopInsight, buildReviewInsight, type PlayBarbuAttempt } from "./lessons/drillReview";
  import DrillScreen from "./DrillScreen.svelte";
  import { drillDecision, orderPracticePool, type DrillStep, type DrillResult } from "./lessons/drillDecision";
  import { whistTrumpSuitFromHandId, whistPartnershipTrickCounts, whistTrickFeedback } from "./whistPresentation";

  import { invoke, isTauri } from "@tauri-apps/api/core";
  import { typescriptHandEngine } from "./domain/handEngine";
  import { heartsScoredSeatPenalties } from "./domain/heartsSession";
  import { emptySeatPenalties, seatPenaltiesForTricks } from "./domain/trickTakingScore";
  import { emptyWhistScore, whistSessionSettlement } from "./domain/whistSession";

  import { dominoHandEngine, type DominoAction } from "./domain/dominoHand";
  import { generateBarbuPracticeSet } from "./domain/barbuPractice";

  import CardChoiceHand from "./CardChoiceHand.svelte";
  import CardFace from "./CardFace.svelte";
  import CardTable from "./CardTable.svelte";
  import { compareCardsForDisplay } from "./cardOrdering";
  import { formatCardLabel } from "./cardDisplay";
  import ExerciseFeedback from "./ExerciseFeedback.svelte";
  import "./games";
  import { registry } from "./gameRegistry";
  import GameTableShell from "./GameTableShell.svelte";
  import { cardCountingTable } from "./games/cardCounting";
  import LearnPanel from "./LearnPanel.svelte";
  import CourseLesson from "./CourseLesson.svelte";
  import PlayTabPanel from "./PlayTabPanel.svelte";
  import ProTabPanel from "./ProTabPanel.svelte";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import { fullHandContracts } from "./contractRegistry";
  import { contractScoreMeta } from "./contractScoring";
  import { courseCatalog, courseTargetsGuidedLesson, type CourseContent, type CourseStage } from "./courseContent";
  import { guidedLessons } from "./lessons/catalog";
  import { referenceCatalog } from "./referenceCatalog";
  import { whistOddProgress } from "./whistScoring";
  import type { BarbuLearnPathAction } from "./games/barbu";

  import {
    getCatalogCategories,
    type ActiveGameTable,
    type CatalogGameId,
    type LearnPathStep,
    type TableTabId
  } from "./tableFactory";
  import type { Card, CompletedHandTrick, DominoHandState, FullHandContract, FullHandState, GuidedCardOutcome, GuidedTrick, PracticeReason, Seat, Suit, TableCard } from "./lessonTypes";
  import type { GameReference } from "./referenceCatalog";

  type AppView =
    | "catalog"
    | "barbuTable"
    | "heartsFeature"
    | "whistFeature"
    | "spadesFeature"
    | "cardCountingTable"
    | "barbuContracts"
    | "practiceChooser"
    | "reference"
    | "courseContent"
    | "lesson"
    | "drill"
    | "drillResult"
    | "barbuPlay"
    | "bridgeFeature"
    | "fullHand"
    | "dominoHand"
    | "trumpCount"
    | "trumpMemory"
    | "courtCount"
    | "pathReview";

  type CardCountingTabId = "learn" | "play";
  type CardCountingReturnTarget = ActiveGameTable | "card-counting";
  type CardCountingExerciseAction = "heart-memory" | "trump-count" | "high-card-memory" | "danger-count" | "whist-memory";
  type FullHandCardCountingExercise = "heart-memory" | "danger-count" | "whist-memory" | "high-card-memory";

  type CardCountingExerciseDefinition = {
    eyebrow: string;
    title: string;
    summary: string;
    action: CardCountingExerciseAction;
  };

  type CardMemoryExerciseConfig = {
    title: string;
    eyebrow: string;
    statusText: string;
    trackedCardsLabel: string;
    challengeLabel: string;
    leadPrompt: string;
    followPrompt: string;
    voidPrompt: string;
    countPrompt: string;
    specificPrompt: string;
    targetAriaLabel: string;
    answerAriaLabel: string;
    countMax: number;
    seedOffset: number;
    targetCards: Card[];
    isTrackedCard: (card: Card) => boolean;
  };

  type PracticeLaunchContext = {
    pathStepId?: string;
    source?: "course" | "practice";
  };

  type PracticeActionLauncher = (context?: PracticeLaunchContext) => void;

  type PracticeActionRegistry = {
    barbu: Record<string, PracticeActionLauncher>;
    hearts: Record<string, PracticeActionLauncher>;
    whist: Record<string, PracticeActionLauncher>;
    spades: Record<string, PracticeActionLauncher>;
    bridge: Record<string, PracticeActionLauncher>;
  };

  type BarbuLearnPathStep = LearnPathStep<BarbuLearnPathAction>;

  type CountMemoryQuestion =
    | {
        kind: "count";
        prompt: string;
        answer: number;
        options: number[];
        startTrick: number;
        endTrick: number;
      }
    | {
        kind: "specific";
        prompt: string;
        answer: boolean;
        targetCard: Card;
        startTrick: number;
        endTrick: number;
      };

  type TrumpCountRound = {
    trumpSuit: Suit;
    tricks: TableCard[][];
    questions: CountMemoryQuestion[];
  };

  type CountingBreakSummary = {
    title: string;
    summary: string;
    firstLabel: string;
    firstValue: string;
    firstDetail: string;
    secondLabel: string;
    secondValue: string;
    secondDetail: string;
  };

  type TrumpMemoryQuestion =
    | {
        kind: "count";
        prompt: string;
        answer: number;
        options: number[];
      }
    | {
        kind: "specific";
        prompt: string;
        answer: boolean;
        targetCard: Card;
      };

  type RealisticTrumpRound = {
    trumpSuit: Suit;
    hands: Record<Seat, Card[]>;
    currentLeader: Seat;
    currentTrick: TableCard[];
    completedTricks: TableCard[][];
    status: "playing" | "review" | "question" | "complete";
    question: TrumpMemoryQuestion;
    questionsAsked: number;
  };

  type CourtMemoryQuestion =
    | {
        kind: "count";
        prompt: string;
        answer: number;
        options: number[];
      }
    | {
        kind: "specific";
        prompt: string;
        answer: boolean;
        targetCard: Card;
      };

  type RealisticCourtRound = {
    hands: Record<Seat, Card[]>;
    currentLeader: Seat;
    currentTrick: TableCard[];
    completedTricks: TableCard[][];
    status: "playing" | "review" | "question" | "complete";
    question: CourtMemoryQuestion;
    questionsAsked: number;
  };

  type DangerMemoryQuestion = CourtMemoryQuestion;

  type WhistMemoryQuestion =
    | { kind: "trump_count"; prompt: string; answer: number; options: number[]; trumpSuit: Suit }
    | { kind: "trump_specific"; prompt: string; answer: boolean; targetCard: Card }
    | { kind: "boss_card"; prompt: string; answer: boolean; targetCard: Card }
    | { kind: "void_spotter"; prompt: string; answer: Seat; targetSuit: Suit };

  const catalogCategories = getCatalogCategories();
  const privacyPolicyUrl = "https://martingull.github.io/barbu/privacy-policy.html";
  let privacyPolicyError = "";
  let openingPrivacyPolicy = false;
  const barbuUi = registry.get("barbu")!;
  const heartsUi = registry.get("hearts")!;

  const progressStorageKey = "barbu.courseProgress.v1";
  const practiceSeedStorageKey = "barbu.practiceSeed.v1";
  const drillPatternMemoryStorageKey = "barbu.drillPatternMemory.v1";
  const playBarbuHistoryStorageKey = "barbu.playHistory.v1";
  const barbuFeature = createBarbuFeature({ storage: () => typeof localStorage === "undefined" ? undefined : localStorage, nextSeed: usePracticeSeed });
  const whistFeature = createWhistFeature({ storage: () => typeof localStorage === "undefined" ? undefined : localStorage, nextSeed: usePracticeSeed });
  let whistFixedSurface = false;
  const heartsFeature = createHeartsFeature({ storage: () => typeof localStorage === "undefined" ? undefined : localStorage, nextSeed: usePracticeSeed });
  let heartsFixedSurface = false;
  const spadesFeature = createSpadesFeature({ storage: () => typeof localStorage === "undefined" ? undefined : localStorage, nextSeed: usePracticeSeed });
  let spadesFixedSurface = false;
  const bridgeFeature = createBridgeFeature({ storage: () => typeof localStorage === "undefined" ? undefined : localStorage, nextSeed: usePracticeSeed });
  let bridgeFixedSurface = false;

  const maxStoredDrillPatterns = 6;
  const maxStoredPlayBarbuAttempts = 8;

  const countingTrickSeats: Seat[] = ["Tutor", "Right", "You", "Left"];
  const realisticTrumpTotalTricks = 13;
  const realisticTrumpCheckpoints = [3, 7, 11];
  const cardCountingExercises: CardCountingExerciseDefinition[] = [
    {
      eyebrow: "Warm-up",
      title: "Count trumps",
      summary: "Watch all thirteen tricks in segments, then answer how many hearts appeared.",
      action: "trump-count"
    },
    {
      eyebrow: "Black Lady",
      title: "Heart memory hand",
      summary: "Play a full Black Lady hand and answer heart-memory checks as the hand develops.",
      action: "heart-memory"
    },
    {
      eyebrow: "Three amigos",
      title: "Three amigos memory",
      summary: "Play a real Whist hand while remembering kings, queens, and jacks that have left the table.",
      action: "high-card-memory"
    },
    {
      eyebrow: "No Queens memory",
      title: "Danger cards",
      summary: "Play a real No Queens hand. Avoid winning queens while remembering which queens are already gone.",
      action: "danger-count"
    },
    {
      eyebrow: "Whist mechanics",
      title: "Whist memory hand",
      summary: "Play a Whist hand while tracking trumps, boss cards, and suit voids.",
      action: "whist-memory"
    }
  ];
  const countingRanks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const countingSuits: Suit[] = ["C", "D", "H", "S"];
  const dangerCardMemoryConfig: CardMemoryExerciseConfig = {
    title: "Danger cards",
    eyebrow: "No Queens",
    statusText: "Play No Queens and keep the four queens in memory.",
    trackedCardsLabel: "queens",
    challengeLabel: "Queen memory challenge",
    leadPrompt: "Lead safely. In No Queens, every queen you win is a penalty.",
    followPrompt: "Follow suit and watch whether a queen can fall into this trick.",
    voidPrompt: "You are void. Shed danger if you can, and remember which queens leave the table.",
    countPrompt: "How many queens have been played so far?",
    specificPrompt: "Has this queen been played yet?",
    targetAriaLabel: "Target queen",
    answerAriaLabel: "Danger card specific answers",
    countMax: 4,
    seedOffset: 151,
    targetCards: countingSuits.map((suit) => ({
      id: `Q${suit}`,
      rank: "Q" as const,
      suit,
      label: `Q${suit}`
    })),
    isTrackedCard: (card) => card.rank === "Q"
  };

  const whistMatchTarget = 5;

  const outcomeLabels: Record<GuidedCardOutcome | "illegal", string> = {
    good: "Good",
    risky: "Risky",
    penalty: "Penalty",
    illegal: "Illegal"
  };
  const cleanDrillOutcomes: Array<GuidedCardOutcome | "illegal"> = ["good"];

  const suitNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };
  const drillSteps: DrillStep[] = guidedLessons.map((lesson) => ({
    contract: lesson.contract,
    title: lesson.title,
    trick: lesson.tricks[0]
  }));
  const fixedDrillLessons = guidedLessons.filter((lesson) => lesson.contract !== "Domino");

  const catalogTableCards: Card[] = [
    { id: "catalog-queen-spades", rank: "Q", suit: "S", label: "QS" },
    { id: "catalog-king-hearts", rank: "K", suit: "H", label: "KH" },
    { id: "catalog-ace-spades", rank: "A", suit: "S", label: "AS" }
  ];

  let appView: AppView = "catalog";
  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";
  let drillIndex = 0;
  let drillSelectedCardId = "";
  let drillCheckedCardId = "";
  let drillResults: DrillResult[] = [];
  let activeDrillSteps: DrillStep[] = drillSteps;
  let drillSetTitle = "Contract review";
  let activeDrillFocusContract = "";
  let recentDrillScenarioIds = loadDrillPatternMemory();
  let practiceSeed = loadPracticeSeed();
  let selectedLessonId = guidedLessons[0].id;
  let activeTricks: GuidedTrick[] = guidedLessons[0].tricks;
  let activePathStepId = "";
  let activeCourseId = courseCatalog[0].id;
  let activeReferenceId = referenceCatalog[0].id;
  let activeCourseStage: CourseStage = "concept";
  let activeTableTabs: Record<string, TableTabId> = {};

  let whistFullHandSource: "play" | "practice" | "card-counting" = "play";
  let activeCardCountingTab: CardCountingTabId = "play";
  let cardCountingReturnTarget: CardCountingReturnTarget = "barbu";
  let activeGameTable: ActiveGameTable = "barbu";
  let completedPathSteps: Record<string, boolean> = loadCourseProgress();
  let playBarbuHistory: PlayBarbuAttempt[] = loadPlayBarbuHistory();

  let fullHand: FullHandState | null = null;
  let dominoHand: DominoHandState | null = null;
  let fullHandSelectedCardId = "";

  let dominoSelectedCardId = "";
  let fullHandError = "";
  let dominoError = "";
  let fullHandReviewTrickCount = 0;
  let lastFullHandTapCardId = "";
  let lastFullHandTapAt = 0;
  let lastDominoTapCardId = "";
  let lastDominoTapAt = 0;
  let dominoLastMoveReason = "";

  let trumpCountSeed = practiceSeed;
  let trumpCountRound = buildTrumpCountRound(trumpCountSeed);
  let trumpCountRevealIndex = 0;
  let trumpCountQuestionIndex = 0;
  let trumpCountStage: "reveal" | "answer" | "complete" = "reveal";
  let trumpCountSelected: number | boolean | null = null;
  let trumpCountChecked = false;
  let trumpCountAttempts = 0;
  let trumpCountClean = 0;
  let fullHandCardCountingMode = false;
  let fullHandCardCountingExercise: FullHandCardCountingExercise = "heart-memory";
  let fullHandCardCountingPlaySeed = practiceSeed;
  let fullHandCardCountingSeed = 1;
  let fullHandCardCountingAnswer: number | boolean | Seat | null = null;
  let fullHandCardCountingChecked = false;
  let fullHandCardCountingQuestionsAsked = 0;
  let fullHandCardCountingClean = 0;
  let realisticTrumpSeed = practiceSeed + 29;
  let realisticTrumpRound = buildRealisticTrumpRound(realisticTrumpSeed);
  let realisticTrumpSelectedCardId = "";
  let realisticTrumpAnswer: number | boolean | null = null;
  let realisticTrumpChecked = false;
  let realisticCourtSeed = practiceSeed + 17;
  let realisticCourtRound = buildRealisticCourtRound(realisticCourtSeed);
  let realisticCourtSelectedCardId = "";
  let courtCountSelected: number | boolean | null = null;
  let courtCountChecked = false;
  let courtCountAttempts = 0;
  let courtCountClean = 0;
  $: isTablePlayScreen =
    appView === "courseContent" ||
    appView === "lesson" ||
    appView === "drill" ||
    appView === "barbuPlay" ||
    appView === "fullHand" ||
    appView === "dominoHand" ||
    appView === "trumpCount" ||
    appView === "courtCount" ||
    appView === "trumpMemory";

  function buildDominoDrillLayout(tableCards: TableCard[]) {
    const lanes: Card[][] = [[], [], [], []];

    for (const play of tableCards) {
      const laneIndex = suitIndex(play.card.suit);
      lanes[laneIndex] = [...lanes[laneIndex], play.card].sort((left, right) => rankValue(left.rank) - rankValue(right.rank));
    }

    return lanes;
  }

  function suitIndex(suit: Suit) {
    return { C: 0, D: 1, H: 2, S: 3 }[suit];
  }

  function suitNameFromId(suit: Suit) {
    return { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" }[suit];
  }

  function appCard(rank: string, suit: Suit): Card {
    const label = `${rank}${suit}`;
    return { id: label, rank, suit, label };
  }

  function cardFromId(cardId: string): Card {
    const suit = cardId.at(-1) as Suit;
    return appCard(cardId.slice(0, -1), suit);
  }

  function rankValue(rank: string) {
    const values: Record<string, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14
    };

    return values[rank] ?? 0;
  }

  $: selectedLesson = guidedLessons.find((lesson) => lesson.id === selectedLessonId) ?? guidedLessons[0];
  $: familyLabel = selectedLesson.family;
  $: gameLabel = selectedLesson.game;
  $: contractLabel = selectedLesson.contract;
  $: currentTrick = activeTricks[trickIndex];
  $: legalCardIds = new Set(currentTrick.legalCardIds);
  $: hand = currentTrick.hand;
  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard
    ? [...currentTrick.tableBeforeChoice, { seat: "You" as const, card: playedCard }, ...currentTrick.tableAfterChoice]
    : currentTrick.tableBeforeChoice;
  $: currentLessonIsDomino = contractLabel === "Domino";
  $: completedDominoLessonLayout = buildDominoDrillLayout(completedTable);
  $: explanation = buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard ? currentTrick.afterResult : currentTrick.beforeResult;
  $: isLastTrick = trickIndex === activeTricks.length - 1;
  $: playablePathSteps = barbuUi.learnSteps.filter((step) => step.action !== "planned");
  $: completedCount = playablePathSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextPathStep = playablePathSteps.find((step) => !completedPathSteps[step.id]);
  $: isCourseComplete = completedCount === playablePathSteps.length;

  $: barbuLearnPanelActions = [
    {
      id: "review-results",
      title: "Review results",
      summary: "Return to your previous contract decisions.",
      onClick: openPathReview
    },
    {
      id: "reference",
      eyebrow: "Rules",
      title: "Reference",
      summary: barbuUi.table.learn.referenceSummary,
      onClick: () => openReference(barbuUi.table.referenceId)
    },
    {
      id: "contracts",
      eyebrow: "Core game",
      title: "Barbu contracts",
      summary: "See the contract roster and what each table asks you to notice.",
      onClick: openBarbuContracts
    }
  ];

  $: lessonOutcome = selectedCard && (playedCard || !isSelectedLegal) ? buildLessonOutcome(selectedCard, playedCard) : "";
  $: activeCourse = courseCatalog.find((course) => course.id === activeCourseId) ?? courseCatalog[0];
  $: activeCourseTableLabel =
    activeCourse.game === "spades"
      ? "Spades"
      : activeCourse.game === "whist"
        ? "Whist"
        : activeCourse.game === "hearts"
          ? "Hearts"
          : "Barbu";
  $: activeReference = referenceCatalog.find((reference) => reference.id === activeReferenceId) ?? referenceCatalog[0];
  $: activeReferenceIsBarbu = activeReference.id === "barbu";
  $: currentDrill = activeDrillSteps[drillIndex] ?? activeDrillSteps[0] ?? drillSteps[0];
  $: currentDrillTrick = currentDrill.trick;
  $: drillLegalCardIds = new Set(currentDrillTrick.legalCardIds);
  $: drillSelectedCard = currentDrillTrick.hand.find((card) => card.id === drillSelectedCardId);
  $: drillCheckedCard = currentDrillTrick.hand.find((card) => card.id === drillCheckedCardId);
  $: isDrillCheckedLegal = drillCheckedCard ? drillLegalCardIds.has(drillCheckedCard.id) : false;
  $: currentDrillIsDomino = currentDrill.contract === "Domino";
  $: drillCompletedTable = drillCheckedCard && isDrillCheckedLegal
    ? [
        ...currentDrillTrick.tableBeforeChoice,
        { seat: "You" as const, card: drillCheckedCard },
        ...currentDrillTrick.tableAfterChoice
      ]
    : currentDrillTrick.tableBeforeChoice;
  $: drillDominoLayout = buildDominoDrillLayout(drillCompletedTable);
  $: cleanDrillCount = drillResults.filter((result) => result.clean).length;
  $: isLastDrillDecision = drillIndex >= activeDrillSteps.length - 1;
  $: drillScreenTitle = currentDrillTrick.title;
  $: drillResultIsBarbuPractice = activeGameTable === "barbu";

  $: drillResultMessage =
    drillResults.length > 0 && cleanDrillCount === drillResults.length
      ? "Clean session. Barbu is ready to raise the pressure."
      : "Use the next repetition to make the weak decision automatic.";
  $: currentContractResults = summarizeContractResults(drillResults);
  $: weakContract = weakestContractFromResults(currentContractResults);
  $: recentPlayBarbuAttempts = playBarbuHistory.filter(attempt => attempt.results.length > 0
    && attempt.results.every(result => activeGameTable === "barbu"
      ? fullHandContracts.some(contract => contract === result.contract)
      : result.contract.toLowerCase() === activeGameTable)).slice(0, 3);
  $: drillLoopInsight = buildDrillLoopInsight(drillResults, recentPlayBarbuAttempts);
  $: drillLoopFocus = drillLoopInsight.contract || weakContract || "Full table";

  $: latestPlayBarbuAttempt = recentPlayBarbuAttempts[0];
  $: reviewResults = latestPlayBarbuAttempt?.results ?? [];
  $: reviewContractResults = summarizeContractResults(reviewResults);
  $: reviewWeakContract = weakestContractFromResults(reviewContractResults);
  $: reviewCleanCount = reviewResults.filter((result) => result.clean).length;
  $: reviewInsight = buildReviewInsight(recentPlayBarbuAttempts);
  $: reviewAdvice = reviewInsight.message;
  $: reviewReplayContract = reviewInsight.contract || reviewWeakContract;
  $: reviewFocusSummary = reviewContractResults.find((result) => result.contract === reviewReplayContract);
  $: fullHandLegalCardIds = new Set(fullHand?.legalCardIds ?? []);
  $: fullHandSelectedCard = fullHand?.playerHand.find((card) => card.id === fullHandSelectedCardId);
  $: fullHandLastCompletedTrick = fullHand?.completedTricks[fullHand.completedTricks.length - 1];
  $: fullHandReviewTrick =
    fullHand && fullHandReviewTrickCount > 0 ? fullHand.completedTricks[fullHandReviewTrickCount - 1] : undefined;
  $: fullHandIsReviewingTrick = Boolean(
    fullHandReviewTrick && fullHand?.status === "in_progress" && fullHand.completedTricks.length === fullHandReviewTrickCount
  );
  $: fullHandReviewFeedback = fullHandReviewTrick ? fullHandTrickFeedback(fullHandReviewTrick) : "";
  $: fullHandCardCountingActive =
    fullHandCardCountingMode &&
    (fullHand?.contract === "Hearts" || fullHand?.contract === "Whist" || fullHand?.contract === "No Queens");
  $: fullHandCardCountingIsWhist = fullHandCardCountingActive && fullHandCardCountingExercise === "whist-memory";
  $: fullHandCardCountingIsHighCard = fullHandCardCountingActive && fullHandCardCountingExercise === "high-card-memory";

  $: fullHandCardCountingIsDanger = fullHandCardCountingActive && fullHandCardCountingExercise === "danger-count";
  $: fullHandCardCountingCompletedTricks = fullHandCardCountingActive
    ? fullHand?.completedTricks.map((trick) => trick.cards) ?? []
    : [];
  $: fullHandCardCountingQuestion =
    fullHandCardCountingActive && fullHand
      ? fullHandCardCountingIsWhist
        ? buildWhistMemoryQuestion(
            fullHandCardCountingCompletedTricks,
            whistTrumpSuitFromHandId(fullHand.id),
            fullHandCardCountingSeed + fullHand.completedTricks.length
          )
        : fullHandCardCountingIsHighCard
          ? buildCourtMemoryQuestion(
              fullHandCardCountingCompletedTricks,
              fullHandCardCountingSeed + fullHand.completedTricks.length
            )
        : fullHandCardCountingIsDanger
          ? buildDangerMemoryQuestion(
              fullHandCardCountingCompletedTricks,
              fullHandCardCountingSeed + fullHand.completedTricks.length
            )
        : buildTrumpMemoryQuestion(fullHandCardCountingCompletedTricks, fullHandCardCountingSeed + fullHand.completedTricks.length)
      : undefined;
  $: fullHandCardCountingCheckpoints =
    fullHandCardCountingIsWhist || fullHandCardCountingIsHighCard ? realisticWhistCheckpoints : realisticTrumpCheckpoints;
  $: fullHandCardCountingCheckpointIndex =
    fullHandCardCountingActive && fullHandReviewTrickCount > 0
      ? fullHandCardCountingCheckpoints.indexOf(fullHandReviewTrickCount)
      : -1;
  $: fullHandCardCountingQuestionNumber = Math.min(
    fullHandCardCountingQuestionsAsked + (fullHandCardCountingChecked ? 0 : 1),
    fullHandCardCountingCheckpoints.length
  );
  $: fullHandCardCountingPromptActive = Boolean(
    fullHandCardCountingQuestion &&
      fullHandIsReviewingTrick &&
      fullHandCardCountingCheckpointIndex >= 0 &&
      (fullHandCardCountingQuestionsAsked <= fullHandCardCountingCheckpointIndex || fullHandCardCountingChecked)
  );
  $: fullHandCardCountingSeenCards = fullHandCardCountingCompletedTricks.flatMap((trick) =>
    trick.map((play) => play.card)
  );
  $: fullHandCardCountingTrackedSuit = fullHandCardCountingIsWhist && fullHand ? whistTrumpSuitFromHandId(fullHand.id) : "H";
  $: fullHandCardCountingReviewCards = fullHandCardCountingIsHighCard
    ? fullHandCardCountingSeenCards.filter(isCourtCard)
    : fullHandCardCountingIsDanger
      ? fullHandCardCountingSeenCards.filter(dangerCardMemoryConfig.isTrackedCard)
      : fullHandCardCountingSeenCards.filter((card) => card.suit === fullHandCardCountingTrackedSuit);

  $: fullHandCardCountingCoreScore = fullHandCardCountingActive
    ? fullHandCardCountingIsWhist || fullHandCardCountingIsHighCard
      ? whistPartnershipTricks.playerSide
      : fullHandCardCountingIsDanger
        ? fullHandSeatPenalties.You
        : heartsScoredSeatPenalties(fullHandSeatPenalties).You
    : 0;
  $: fullHandCardCountingFeedback =
    fullHandCardCountingChecked && fullHandCardCountingAnswer !== null
      ? fullHandCardCountingAnswer === fullHandCardCountingQuestion?.answer
        ? "Correct. Memory held."
        : fullHandCardCountingQuestion
          ? fullHandCardCountingAnswerText(
              fullHandCardCountingQuestion,
              fullHandCardCountingIsDanger,
              fullHandCardCountingIsHighCard
            )
          : ""
      : "Answer from memory. Old tricks are hidden.";
  $: fullHandCardCountingTitle = fullHandCardCountingIsHighCard
    ? "Three amigos memory"
    : fullHandCardCountingIsWhist
    ? "Whist memory hand"
    : fullHandCardCountingIsDanger
      ? "Danger cards"
      : "Heart memory hand";
  $: fullHandCardCountingStatusLabel = fullHandCardCountingIsWhist || fullHandCardCountingIsHighCard
    ? "Whist"
    : fullHandCardCountingIsDanger
      ? "No Queens"
      : "Black Lady";
  $: fullHandCardCountingQuestionTitle = fullHandCardCountingQuestion
    ? fullHandCardCountingQuestionHeading(
        fullHandCardCountingQuestion,
        fullHandCardCountingIsDanger,
        fullHandCardCountingIsHighCard
      )
    : "";
  $: fullHandCardCountingTargetLabel = fullHandCardCountingIsHighCard
    ? "Target high card"
    : fullHandCardCountingIsWhist
    ? "Target whist card"
    : fullHandCardCountingIsDanger
      ? dangerCardMemoryConfig.targetAriaLabel
      : "Target heart card";
  $: fullHandCardCountingAnswerOptionsLabel = fullHandCardCountingIsHighCard
    ? "High card answer options"
    : fullHandCardCountingIsWhist
    ? "Whist card answer options"
    : fullHandCardCountingIsDanger
      ? dangerCardMemoryConfig.answerAriaLabel
      : "Heart card answer options";
  $: fullHandCardCountingCountOptionsLabel = fullHandCardCountingIsDanger
    ? "Danger card count answers"
    : fullHandCardCountingIsHighCard
      ? "High card count answers"
    : fullHandCardCountingIsWhist
      ? "Whist count answer options"
      : "Heart count answer options";
  $: fullHandCardCountingSeenLabel = fullHandCardCountingIsHighCard
    ? "High cards seen so far"
    : fullHandCardCountingIsWhist
    ? "Trumps seen so far"
    : fullHandCardCountingIsDanger
      ? "Queens seen so far"
      : "Hearts seen so far";
  $: fullHandCardCountingBreakSummary = countingBreakSummary({
    title:
      fullHandCardCountingIsHighCard
        ? fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
          ? "High cards remembered"
          : "High card hand complete"
        : fullHandCardCountingIsWhist
        ? fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
          ? "Sharp Whist memory"
          : "Whist memory hand complete"
        : fullHandCardCountingIsDanger
          ? fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
            ? "Clean queen memory"
            : "Danger cards hand complete"
        : fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
          ? "Sharp heart memory"
          : "Heart memory hand complete",
    summary:
      fullHandCardCountingIsHighCard
        ? fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
          ? "You played the Whist hand and kept the court cards clean in memory. That is strong table awareness."
          : "You finished a real Whist hand while tracking jacks, queens, and kings. Next run, name each court card as it leaves."
        : fullHandCardCountingIsWhist
        ? fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
          ? "You played the Whist hand and kept the trump and table state clean in memory. That is strong partnership awareness."
          : "You finished a real Whist hand while tracking trump, boss cards, and voids. Next run, keep naming the table state after every trick."
        : fullHandCardCountingIsDanger
          ? fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
            ? "You played No Queens and kept the queen map clean. That is exactly the awareness this contract rewards."
            : "You finished a real No Queens hand while tracking which queens were already gone. Next run, name every queen as it leaves the table."
        : fullHandCardCountingClean === fullHandCardCountingQuestionsAsked && fullHandCardCountingQuestionsAsked > 0
          ? "You played the Black Lady hand and kept the hearts clean in memory. That is strong table awareness."
          : "You finished the hand while tracking hearts. Next run, keep naming the hearts as they leave the table.",
    firstLabel: "Card counting",
    firstValue: `${fullHandCardCountingClean} of ${fullHandCardCountingQuestionsAsked}`,
    firstDetail: "Memory checks answered cleanly.",
    secondLabel: fullHandCardCountingIsWhist || fullHandCardCountingIsHighCard ? "Your side" : fullHandCardCountingIsDanger ? "Queens taken" : "Hearts score",
    secondValue: fullHandCardCountingIsWhist || fullHandCardCountingIsHighCard
      ? `${fullHandCardCountingCoreScore} ${fullHandCardCountingCoreScore === 1 ? "trick" : "tricks"}`
      : formatPointCount(fullHandCardCountingCoreScore),
    secondDetail: fullHandCardCountingIsWhist || fullHandCardCountingIsHighCard
      ? "Tricks won by You + Barbu in the Whist hand."
      : fullHandCardCountingIsDanger
        ? "Queen penalties you captured in the No Queens hand."
      : "Penalty points you took in the Black Lady hand."
  });
  $: fullHandVisibleTableCards = fullHandIsReviewingTrick && fullHandReviewTrick
    ? fullHandReviewTrick.cards
    : fullHand?.currentTrick.length
    ? fullHand.currentTrick
    : fullHand?.status === "complete"
      ? (fullHandLastCompletedTrick?.cards ?? [])
      : [];
  $: fullHandPendingBySeat =
    !fullHandIsReviewingTrick && fullHand?.status === "in_progress" && fullHand.currentTrick.length < 4
      ? fullHand.currentPlayer === "You"
        ? { You: "You" }
        : {}
      : {};
  $: fullHandContractMeta = contractScoreMeta(fullHand?.contract ?? "No Hearts");

  $: fullHandPenaltyTotal = fullHandContractMeta.totalValue;
  $: fullHandPenaltyPlayedLabel = fullHandContractMeta.inPlayLabel;
  $: fullHandNoLastTwoPhaseLabel = noLastTwoPhaseLabel(fullHand);
  $: fullHandNoLastTwoPhaseValue = noLastTwoPhaseValue(fullHand);

  $: fullHandSeatPenalties = fullHand ? seatPenaltiesForTricks(fullHand.completedTricks) : emptySeatPenalties();

  $: fullHandIsHeartsGame = activeGameTable === "hearts" && fullHand?.contract === "Hearts";
  $: fullHandIsWhistGame = activeGameTable === "whist" && fullHand?.contract === "Whist";

  $: fullHandIsPartnershipGame = fullHandIsWhistGame;

  $: whistPartnershipTricks = fullHand ? whistPartnershipTrickCounts(fullHand.completedTricks) : { playerSide: 0, opponentSide: 0 };
  $: whistOddScore = whistOddProgress(whistPartnershipTricks);

  $: whistOddProgressLabel = whistOddScore.label;
  $: whistOddProgressValue = whistOddScore.value;

  $: fullHandShowWhistMatchSummary =
    fullHandIsWhistGame && !fullHandCardCountingActive;
  // Card Counting retains single Whist hands, separate from the feature's saved match.
  $: whistSettlement = whistSessionSettlement({
    fullHand: fullHandIsWhistGame ? fullHand : null, scores: emptyWhistScore(), games: emptyWhistScore(), mode: "game"
  });
  $: whistVisibleMatchScores = whistSettlement.points;
  $: whistVisibleHandCount = fullHandIsWhistGame && fullHand?.status === "complete" ? 1 : 0;
  $: whistTurnedCardVisible = fullHandIsWhistGame && fullHand?.whistTurnedTrump
    && fullHand.completedTricks.length === 0
    && !fullHand.currentTrick.some(play => play.seat === ["Tutor", "Right", "You", "Left"][fullHand.whistDealer ?? -1]);
  $: partnershipVisibleMatchScores = whistVisibleMatchScores;
  $: partnershipVisibleHandCount = whistVisibleHandCount;
  $: partnershipMatchTarget = whistMatchTarget;
  $: whistMatchIsComplete =
    fullHandIsWhistGame &&
    fullHand?.status === "complete" &&
    whistSettlement.complete;
  $: partnershipMatchIsComplete = whistMatchIsComplete;
  $: heartsScorecardMeta = heartsUi.table.scorecard;
  $: heartsVisibleScores = heartsScoredSeatPenalties(fullHandSeatPenalties);
  $: fullHandCompletion = fullHand?.status !== "complete" || fullHandCardCountingActive ? null
    : whistFullHandSource !== "play" ? null
    : fullHandIsWhistGame && whistSettlement.gameComplete ? "game"
    : null;
  $: fullHandReplayAllowed = !fullHandCompletion;

  $: dominoLegalCardIds = new Set(dominoHand?.legalCardIds ?? []);
  $: dominoSelectedCard = dominoHand?.playerHand.find((card) => card.id === dominoSelectedCardId);
  $: dominoDefaultPlayableCard = dominoHand?.playerHand.find((card) => dominoLegalCardIds.has(card.id));

  $: trumpCountVisibleTrick = trumpCountRound.tricks[trumpCountRevealIndex] ?? [];
  $: trumpCountTotalTricks = trumpCountRound.tricks.length;
  $: trumpCountQuestion = trumpCountRound.questions[trumpCountQuestionIndex] ?? trumpCountRound.questions[0];
  $: trumpCountQuestionTricks = trumpCountQuestion
    ? trumpCountRound.tricks.slice(trumpCountQuestion.startTrick, trumpCountQuestion.endTrick + 1)
    : [];
  $: trumpCountSeenCards = trumpCountQuestionTricks.flatMap((trick) => trick.map((play) => play.card));
  $: trumpCountSeenCount = trumpCountSeenCards.filter((card) => card.suit === trumpCountRound.trumpSuit).length;
  $: trumpCountSegmentLabel = trumpCountQuestion
    ? `tricks ${trumpCountQuestion.startTrick + 1}-${trumpCountQuestion.endTrick + 1}`
    : "this segment";
  $: trumpCountPromptTitle =
    trumpCountStage === "reveal"
      ? "Watch the trick. Count hearts."
      : trumpCountQuestion?.kind === "specific"
        ? "Did this trump appear?"
        : "How many trumps appeared?";
  $: trumpCountPromptBody =
    trumpCountStage === "reveal"
      ? `Trick ${trumpCountRevealIndex + 1} of ${trumpCountTotalTricks}. Keep the heart count in your head.`
      : (trumpCountQuestion?.prompt ?? "The cards are hidden; answer from memory.");
  $: trumpCountFeedback =
    trumpCountChecked && trumpCountSelected !== null
      ? trumpCountSelected === trumpCountQuestion?.answer
        ? `Correct. ${trumpCountSeenCount} ${suitNames[trumpCountRound.trumpSuit].toLowerCase()} appeared in ${trumpCountSegmentLabel}.`
        : `${trumpCountSeenCount} ${suitNames[trumpCountRound.trumpSuit].toLowerCase()} appeared in ${trumpCountSegmentLabel}.`
      : "Keep a running trump count as each trick appears.";
  $: trumpCountBreakSummary = countingBreakSummary({
    title: trumpCountClean === trumpCountAttempts && trumpCountAttempts > 0 ? "Clean warm-up" : "Warm-up complete",
    summary:
      trumpCountClean === trumpCountAttempts && trumpCountAttempts > 0
        ? "You kept the heart count through the whole warm-up. That is the exact habit these exercises train."
        : "You finished the warm-up. Take a breath, then run another set and keep the count alive for longer.",
    firstLabel: "Card counting",
    firstValue: `${trumpCountClean} of ${trumpCountAttempts}`,
    firstDetail: "Memory checks answered cleanly.",
    secondLabel: "Focus",
    secondValue: `${trumpCountTotalTricks} tricks`,
    secondDetail: "Hearts were the cards to track."
  });
  $: realisticTrumpSeenCards = realisticTrumpRound.completedTricks.flatMap((trick) => trick.map((play) => play.card));
  $: realisticTrumpSeenCount = realisticTrumpSeenCards.filter((card) => card.suit === realisticTrumpRound.trumpSuit).length;
  $: realisticTrumpLegalCards = countingLegalCards(
    realisticTrumpRound.hands.You,
    realisticTrumpRound.currentTrick[0]?.card.suit
  );
  $: realisticTrumpSelectedCard = realisticTrumpRound.hands.You.find((card) => card.id === realisticTrumpSelectedCardId);
  $: realisticTrumpPromptTitle =
    realisticTrumpRound.status === "question"
      ? `Memory check ${realisticTrumpRound.questionsAsked + 1} of ${realisticTrumpCheckpoints.length}`
      : realisticTrumpRound.status === "complete"
        ? "Hand complete"
      : realisticTrumpRound.status === "review"
        ? "Update the count"
        : `Trick ${realisticTrumpRound.completedTricks.length + 1} of ${realisticTrumpTotalTricks}`;
  $: realisticTrumpPromptBody =
    realisticTrumpRound.status === "question"
      ? realisticTrumpRound.question.prompt
      : realisticTrumpRound.status === "complete"
        ? "You played the full hand while keeping track of the trump suit."
      : realisticTrumpRound.status === "review"
        ? "Add any hearts from this trick, then continue."
        : realisticTrumpPlayPrompt(realisticTrumpRound);
  $: realisticTrumpTableCards =
    realisticTrumpRound.status === "question" || realisticTrumpRound.status === "complete"
      ? []
      : realisticTrumpRound.currentTrick;
  $: realisticTrumpPendingBySeat =
    realisticTrumpRound.status === "question" || realisticTrumpRound.status === "complete"
      ? { Tutor: "Barbu", Right: "Right", You: "You", Left: "Left" }
      : realisticTrumpRound.status === "playing"
        ? pendingCountingSeats(realisticTrumpRound)
        : {};
  $: realisticTrumpFeedback =
    realisticTrumpChecked && realisticTrumpAnswer !== null
      ? realisticTrumpAnswer === realisticTrumpRound.question.answer
        ? "Correct. Memory held."
        : realisticTrumpQuestionAnswerText(realisticTrumpRound.question)
      : "Answer from memory. Old tricks are hidden.";
  $: realisticTrumpBreakSummary = countingBreakSummary({
    title: trumpCountClean === trumpCountAttempts && trumpCountAttempts > 0 ? "Sharp trump memory" : "Trump hand complete",
    summary:
      trumpCountClean === trumpCountAttempts && trumpCountAttempts > 0
        ? "You played the hand and kept the trump count clean. That is strong table awareness."
        : "You completed the hand while tracking hearts. Next run, keep updating the count after every trick.",
    firstLabel: "Card counting",
    firstValue: `${trumpCountClean} of ${trumpCountAttempts}`,
    firstDetail: "Memory checks answered cleanly.",
    secondLabel: "Core play",
    secondValue: `${realisticTrumpRound.completedTricks.length} tricks`,
    secondDetail: "You played the hand while hearts were the suit to watch."
  });
  $: courtCountFeedback =
    courtCountChecked && courtCountSelected !== null
      ? courtCountSelected === realisticCourtRound.question.answer
        ? "Correct."
        : "Not this time."
      : "Track jacks, queens, and kings as the hand plays.";
  $: realisticCourtSelectedCard = realisticCourtRound.hands.You.find((card) => card.id === realisticCourtSelectedCardId);
  $: realisticCourtLedSuit = realisticCourtRound.currentTrick[0]?.card.suit;
  $: realisticCourtLegalCards = countingLegalCards(realisticCourtRound.hands.You, realisticCourtLedSuit);
  $: realisticCourtTableCards =
    realisticCourtRound.status === "question" || realisticCourtRound.status === "complete"
      ? []
      : realisticCourtRound.currentTrick;
  $: realisticCourtPendingBySeat =
    realisticCourtRound.status === "question" || realisticCourtRound.status === "complete"
      ? { Tutor: "Barbu", Right: "Right", You: "You", Left: "Left" }
      : realisticCourtRound.status === "playing"
        ? pendingCountingSeats(realisticCourtRound)
        : {};
  $: realisticCourtSeenCards = realisticCourtRound.completedTricks.flatMap((trick) => trick.map((play) => play.card));
  $: realisticCourtSeenCount = realisticCourtSeenCards.filter((card) => isCourtCard(card)).length;
  $: realisticCourtBreakSummary = countingBreakSummary({
    title: courtCountClean === courtCountAttempts && courtCountAttempts > 0 ? "Court cards remembered" : "Court hand complete",
    summary:
      courtCountClean === courtCountAttempts && courtCountAttempts > 0
        ? "You kept track of the high cards while the hand moved. That is the table skill we want."
        : "You finished the hand and saw the court cards move. Next run, name the Jacks, Queens, and Kings as they leave.",
    firstLabel: "Card counting",
    firstValue: `${courtCountClean} of ${courtCountAttempts}`,
    firstDetail: "Memory checks answered cleanly.",
    secondLabel: "Cards seen",
    secondValue: `${realisticCourtSeenCount} courts`,
    secondDetail: "Jacks, Queens, and Kings that left the table."
  });
  $: realisticCourtPromptTitle =
    realisticCourtRound.status === "playing"
      ? "Play the trick"
      : realisticCourtRound.status === "question"
        ? realisticCourtRound.question.prompt
        : realisticCourtRound.status === "complete"
          ? "Court memory complete"
          : "Watch the table";
  $: realisticCourtPromptBody =
    realisticCourtRound.status === "playing"
      ? realisticCourtPlayPrompt(realisticCourtRound)
      : realisticCourtRound.status === "question"
        ? `${realisticCourtRound.completedTricks.length} tricks have passed. Answer from memory.`
        : realisticCourtRound.status === "complete"
          ? `You answered ${courtCountClean} of ${courtCountAttempts} court-card checks cleanly.`
          : "The trick is complete. Keep the court cards in memory.";
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

  function loadDrillPatternMemory() {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const storedMemory = JSON.parse(localStorage.getItem(drillPatternMemoryStorageKey) ?? "[]");

      return Array.isArray(storedMemory)
        ? storedMemory.filter((item): item is string => typeof item === "string").slice(0, maxStoredDrillPatterns)
        : [];
    } catch {
      return [];
    }
  }

  function rememberDrillScenarioPattern(scenarioId: string | undefined) {
    if (!scenarioId) {
      return;
    }

    recentDrillScenarioIds = [
      scenarioId,
      ...recentDrillScenarioIds.filter((recentScenarioId) => recentScenarioId !== scenarioId)
    ].slice(0, maxStoredDrillPatterns);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(drillPatternMemoryStorageKey, JSON.stringify(recentDrillScenarioIds));
    }
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

  async function openPrivacyPolicy(event: MouseEvent) {
    if (!isTauri()) return;
    event.preventDefault();
    if (openingPrivacyPolicy) return;

    openingPrivacyPolicy = true;
    privacyPolicyError = "";
    try {
      await invoke("open_privacy_policy");
    } catch {
      privacyPolicyError = "Could not open your browser. Please try again.";
    } finally {
      openingPrivacyPolicy = false;
    }
  }

  function openBarbuTable() {
    activeGameTable = "barbu";
    appView = "gameTable";
  }

  function openBarbuLearnTable() {
    activeTableTabs.barbu = "learn";
    openBarbuTable();
  }

  function openHeartsTable() {
    activeGameTable = "hearts";
    heartsFeature.openTable();
    appView = "heartsFeature";
  }

  function openWhistTable() {
    activeGameTable = "whist";
    whistFeature.openTable();
    appView = "whistFeature";
  }

  function openSpadesTable() {
    activeGameTable = "spades";
    spadesFeature.openTable();
    appView = "spadesFeature";
  }

  function openBridgeTable() {
    activeGameTable = "bridge";
    bridgeFeature.openTable();
    appView = "bridgeFeature";
  }

  function openCardCountingTable(tab: CardCountingTabId = activeCardCountingTab) {
    activeCardCountingTab = tab;
    cardCountingReturnTarget = "card-counting";
    appView = "cardCountingTable";
  }

  function rememberCardCountingReturnTarget() {
    cardCountingReturnTarget = appView === "cardCountingTable" ? "card-counting" : activeGameTable;
  }

  function openCardCountingReturnTarget() {
    if (cardCountingReturnTarget === "card-counting") {
      openCardCountingTable(activeCardCountingTab);
      return;
    }

    activeGameTable = cardCountingReturnTarget;
    openActiveGameTable();
  }

  function openActiveGameTable() {
    if (activeGameTable === "hearts") {
      openHeartsTable();
      return;
    }

    if (activeGameTable === "whist") {
      openWhistTable();
      return;
    }

    if (activeGameTable === "spades") {
      openSpadesTable();
      return;
    }

    if (activeGameTable === "bridge") {
      openBridgeTable();
      return;
    }

    openBarbuTable();
  }

  function openFullHandTableTarget() {
    if (fullHandCardCountingMode) {
      fullHandCardCountingMode = false;
      openCardCountingReturnTarget();
      return;
    }

    openActiveGameTable();
  }

  function openTrumpCountTrainer() {
    rememberCardCountingReturnTarget();
    nextTrumpCountRound();
    appView = "trumpCount";
  }

  function openTrumpMemoryTrainer() {
    rememberCardCountingReturnTarget();
    activeGameTable = "barbu";
    startTrumpMemoryFullHand();
  }

  function startTrumpMemoryFullHand(seed = usePracticeSeed()) {
    fullHandCardCountingExercise = "heart-memory";
    fullHandCardCountingPlaySeed = seed;
    fullHandCardCountingSeed = seed + 101;
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;
    void startFullHand("Hearts", { cardCounting: true, seed });
  }

  function openHighCardMemoryTrainer() {
    rememberCardCountingReturnTarget();
    startHighCardMemoryFullHand();
  }

  function startHighCardMemoryFullHand(seed = usePracticeSeed()) {
    activeGameTable = "whist";
    whistFullHandSource = "card-counting";
    fullHandCardCountingExercise = "high-card-memory";
    fullHandCardCountingPlaySeed = seed;
    fullHandCardCountingSeed = seed + 17;
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;
    void startFullHand("Whist", { cardCounting: true, seed });
  }

  function openDangerCountTrainer() {
    rememberCardCountingReturnTarget();
    activeGameTable = "barbu";
    startDangerCardsFullHand();
  }

  function startDangerCardsFullHand(seed = usePracticeSeed()) {
    fullHandCardCountingExercise = "danger-count";
    fullHandCardCountingPlaySeed = seed;
    fullHandCardCountingSeed = seed + dangerCardMemoryConfig.seedOffset;
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;
    void startFullHand("No Queens", { cardCounting: true, seed });
  }

  function openCardCountingExercise(action: CardCountingExerciseAction) {
    if (action === "heart-memory") {
      openTrumpMemoryTrainer();
      return;
    }

    if (action === "trump-count") {
      openTrumpCountTrainer();
      return;
    }

    if (action === "high-card-memory") {
      openHighCardMemoryTrainer();
      return;
    }

    if (action === "danger-count") {
      openDangerCountTrainer();
      return;
    }

    openWhistMemoryTrainer();
  }

  function openWhistMemoryTrainer() {
    rememberCardCountingReturnTarget();
    startWhistMemoryFullHand();
  }

  function startWhistMemoryFullHand(seed = usePracticeSeed()) {
    activeGameTable = "whist";
    whistFullHandSource = "card-counting";
    fullHandCardCountingExercise = "whist-memory";
    fullHandCardCountingPlaySeed = seed;
    fullHandCardCountingSeed = seed + whistMemoryConfig.seedOffset;
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;
    void startFullHand("Whist", { cardCounting: true, seed });
  }

  function buildTrumpCountRound(seed: number): TrumpCountRound {
    const deck = shuffleCountingDeck(seed);
    const trickCount = 13;
    const tricks = Array.from({ length: trickCount }, (_, trickIndex) =>
      countingTrickSeats.map((seat, seatIndex) => ({
        seat,
        card: deck[trickIndex * countingTrickSeats.length + seatIndex]
      }))
    );
    const trumpSuit: Suit = "H";
    const questionRanges = [
      [0, 3],
      [4, 7],
      [8, 12]
    ] as const;
    const trumpCards = deck.filter((card) => card.suit === trumpSuit);
    const questions = questionRanges.map(([startTrick, endTrick], questionIndex): CountMemoryQuestion => {
      const segmentCards = tricks
        .slice(startTrick, endTrick + 1)
        .flatMap((trick) => trick.map((play) => play.card));
      const segmentTrumpCards = segmentCards.filter((card) => card.suit === trumpSuit);
      const shouldAskSpecific = (seed + questionIndex) % 2 === 1;

      if (shouldAskSpecific) {
        const seenTargets = segmentTrumpCards;
        const unseenTargets = trumpCards.filter((card) => !segmentCards.some((segmentCard) => segmentCard.id === card.id));
        const answer = (seed + questionIndex) % 4 !== 0 && seenTargets.length > 0;
        const targetPool = answer ? seenTargets : unseenTargets.length > 0 ? unseenTargets : seenTargets;
        const targetCard = targetPool[(seed + questionIndex * 3) % Math.max(1, targetPool.length)] ?? trumpCards[0];

        return {
          kind: "specific",
          prompt: `The cards from tricks ${startTrick + 1}-${endTrick + 1} are hidden. Did this heart appear in that segment?`,
          answer,
          targetCard,
          startTrick,
          endTrick
        };
      }

      const answer = segmentTrumpCards.length;

      return {
        kind: "count",
        prompt: `The cards from tricks ${startTrick + 1}-${endTrick + 1} are hidden. How many hearts appeared in that segment?`,
        answer,
        options: countOptions(answer, seed + questionIndex, 13),
        startTrick,
        endTrick
      };
    });

    return { trumpSuit, tricks, questions };
  }

  function countingBreakSummary(summary: CountingBreakSummary) {
    return summary;
  }

  function buildRealisticTrumpRound(seed: number): RealisticTrumpRound {
    const deck = shuffleCountingDeck(seed);
    const hands = emptyCountingHands();

    deck.forEach((card, index) => {
      hands[countingTrickSeats[index % countingTrickSeats.length]].push(card);
    });

    for (const seat of countingTrickSeats) {
      hands[seat] = [...hands[seat]].sort(compareCountingCards);
    }

    return beginRealisticTrumpTrick({
      trumpSuit: "H",
      hands,
      currentLeader: countingTrickSeats[seed % countingTrickSeats.length],
      currentTrick: [],
      completedTricks: [],
      status: "playing",
      question: buildTrumpMemoryQuestion([], seed),
      questionsAsked: 0
    });
  }

  function buildRealisticCourtRound(seed: number): RealisticCourtRound {
    const deck = shuffleCountingDeck(seed + 97);
    const hands = emptyCountingHands();

    deck.forEach((card, index) => {
      hands[countingTrickSeats[index % countingTrickSeats.length]].push(card);
    });

    for (const seat of countingTrickSeats) {
      hands[seat] = [...hands[seat]].sort(compareCountingCards);
    }

    return beginRealisticCourtTrick({
      hands,
      currentLeader: countingTrickSeats[seed % countingTrickSeats.length],
      currentTrick: [],
      completedTricks: [],
      status: "playing",
      question: buildCourtMemoryQuestion([], seed),
      questionsAsked: 0
    });
  }

  function buildWhistMemoryQuestion(tricks: TableCard[][], trumpSuit: Suit, seed: number): WhistMemoryQuestion {
    const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
    const trumpSeen = seenCards.filter((card) => card.suit === trumpSuit).length;

    // Detect voids
    const voids: { seat: Seat; suit: Suit }[] = [];
    tricks.forEach((trick) => {
      const leadSuit = trick[0].card.suit;
      trick.forEach((play) => {
        if (play.card.suit !== leadSuit) {
          voids.push({ seat: play.seat, suit: leadSuit });
        }
      });
    });

    const voidSpotterValid = voids.filter(v => v.seat !== "You").length > 0;
    const lastTrick = tricks.length > 0 ? tricks[tricks.length - 1] : null;
    const ledSuit = lastTrick ? lastTrick[0].card.suit : null;
    const bossCardValid = ledSuit !== null && ledSuit !== trumpSuit;

    const availableKinds = ["trump_count", "trump_specific"];
    if (bossCardValid) availableKinds.push("boss_card");
    if (voidSpotterValid) availableKinds.push("void_spotter");

    const kind = availableKinds[seed % availableKinds.length];

    if (kind === "void_spotter") {
      const targetVoid = voids.filter(v => v.seat !== "You")[seed % voids.filter(v => v.seat !== "You").length];
      return {
        kind: "void_spotter",
        prompt: `Who is officially out of ${suitNames[targetVoid.suit]}?`,
        answer: targetVoid.seat,
        targetSuit: targetVoid.suit
      };
    } else if (kind === "boss_card") {
      // Find the highest unplayed card of ledSuit
      const allSuitCards = countingRanks.map((rank) => ({ id: `${rank}${ledSuit}`, rank, suit: ledSuit as Suit, label: `${rank}${ledSuit}` }));
      const unplayed = allSuitCards.filter(c => !seenCards.some(sc => sc.id === c.id));
      const boss = unplayed.length > 0 ? unplayed.reduce((max, c) => countingRanks.indexOf(c.rank) > countingRanks.indexOf(max.rank) ? c : max) : allSuitCards[allSuitCards.length - 1];

      return {
        kind: "boss_card",
        prompt: `Is this now the boss card in ${suitNames[boss.suit]}?`,
        answer: true, // We always ask about the true boss for simplicity in this version, or we can randomise it
        targetCard: boss
      };
    } else if (kind === "trump_count") {
      return {
        kind: "trump_count",
        prompt: `How many ${suitNames[trumpSuit]} trumps have appeared?`,
        answer: trumpSeen,
        options: countOptions(trumpSeen, seed, 13),
        trumpSuit
      };
    } else {
      const allTrumps = countingRanks.map((rank) => ({ id: `${rank}${trumpSuit}`, rank, suit: trumpSuit as Suit, label: `${rank}${trumpSuit}` }));
      const targetCard = allTrumps[(seed + trumpSeen) % allTrumps.length];
      return {
        kind: "trump_specific",
        prompt: "Has this trump been played so far?",
        answer: seenCards.some((card) => card.id === targetCard.id),
        targetCard
      };
    }
  }

  const realisticWhistCheckpoints = [3, 7, 10];
  const whistMemoryConfig = { seedOffset: 51 };

  function emptyCountingHands(): Record<Seat, Card[]> {
    return {
      Tutor: [],
      Right: [],
      You: [],
      Left: []
    };
  }

  function beginRealisticTrumpTrick(round: RealisticTrumpRound): RealisticTrumpRound {
    const hands = cloneCountingHands(round.hands);
    const currentTrick: TableCard[] = [];

    for (const seat of countingPlayOrderFrom(round.currentLeader)) {
      if (seat === "You") {
        break;
      }

      const card = currentTrick.length
        ? chooseCountingAutoCard(hands[seat], currentTrick, round.trumpSuit, seat)
        : chooseCountingLeadCard(hands[seat]);
      removeCountingCard(hands, seat, card.id);
      currentTrick.push({ seat, card });
    }

    return {
      ...round,
      hands,
      currentTrick,
      status: "playing"
    };
  }

  function cloneCountingHands(hands: Record<Seat, Card[]>): Record<Seat, Card[]> {
    return {
      Tutor: [...hands.Tutor],
      Right: [...hands.Right],
      You: [...hands.You],
      Left: [...hands.Left]
    };
  }

  function chooseCountingLeadCard(hand: Card[]) {
    return [...hand].sort((left, right) => {
      const leftTrump = left.suit === "H" ? 1 : 0;
      const rightTrump = right.suit === "H" ? 1 : 0;
      return leftTrump - rightTrump || compareCountingCards(left, right);
    })[0];
  }

  function chooseCountingAutoCard(hand: Card[], currentTrick: TableCard[], trumpSuit: Suit, seat: Seat) {
    const ledSuit = currentTrick[0]?.card.suit;
    const legal = countingLegalCards(hand, ledSuit);

    return (
      [...legal]
        .filter((card) => countingCardWouldWinTrick(currentTrick, card, trumpSuit, seat))
        .sort(compareCountingCards)[0] ?? [...legal].sort(compareCountingCards)[0]
    );
  }

  function countingPlayOrderFrom(leader: Seat) {
    const leaderIndex = countingTrickSeats.indexOf(leader);
    const startIndex = leaderIndex >= 0 ? leaderIndex : 0;

    return Array.from({ length: countingTrickSeats.length }, (_, offset) => countingTrickSeats[(startIndex + offset) % countingTrickSeats.length]);
  }

  function pendingCountingSeats(round: { currentLeader: Seat; currentTrick: TableCard[] }): Partial<Record<Seat, string>> {
    const playedSeats = new Set(round.currentTrick.map((play) => play.seat));

    return countingPlayOrderFrom(round.currentLeader).reduce<Partial<Record<Seat, string>>>((pending, seat) => {
      if (!playedSeats.has(seat)) {
        pending[seat] = scoreSeatLabel(seat);
      }

      return pending;
    }, {});
  }

  function realisticTrumpPlayPrompt(round: RealisticTrumpRound) {
    const ledSuit = round.currentTrick[0]?.card.suit;

    if (!ledSuit) {
      return "Lead the trick. Count hearts as they hit the table.";
    }

    if (round.hands.You.some((card) => card.suit === ledSuit)) {
      return `Follow ${suitNames[ledSuit].toLowerCase()}. Count hearts as they hit the table.`;
    }

    return `You are void in ${suitNames[ledSuit].toLowerCase()}. Play any card and keep counting hearts.`;
  }

  function countingTrickWinner(trick: TableCard[], trumpSuit: Suit): Seat | undefined {
    const ledSuit = trick[0]?.card.suit;
    const trumpCards = trick.filter((play) => play.card.suit === trumpSuit);
    const candidates = trumpCards.length ? trumpCards : trick.filter((play) => play.card.suit === ledSuit);

    return [...candidates].sort((left, right) => rankValue(right.card.rank) - rankValue(left.card.rank))[0]?.seat;
  }

  function countingCardWouldWinTrick(currentTrick: TableCard[], card: Card, trumpSuit: Suit, seat: Seat) {
    const ledSuit = currentTrick[0]?.card.suit;

    if (!ledSuit) {
      return true;
    }

    if (card.suit !== ledSuit && card.suit !== trumpSuit) {
      return false;
    }

    return countingTrickWinner([...currentTrick, { seat, card }], trumpSuit) === seat;
  }

  function countingLegalCards(hand: Card[], ledSuit: Suit | undefined) {
    if (!ledSuit) {
      return hand;
    }

    const suitedCards = hand.filter((card) => card.suit === ledSuit);
    return suitedCards.length ? suitedCards : hand;
  }

  function compareCountingCards(left: Card, right: Card) {
    return compareCardsForDisplay(left, right);
  }

  function removeCountingCard(hands: Record<Seat, Card[]>, seat: Seat, cardId: string) {
    hands[seat] = hands[seat].filter((card) => card.id !== cardId);
  }

  function buildTrumpMemoryQuestion(tricks: TableCard[][], seed: number): TrumpMemoryQuestion {
    const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
    const trumpSeen = seenCards.filter((card) => card.suit === "H").length;

    if (seed % 2 === 0) {
      return {
        kind: "count",
        prompt: "How many hearts have been played so far?",
        answer: trumpSeen,
        options: countOptions(trumpSeen, seed, 13)
      };
    }

    const hearts = countingRanks.map((rank) => ({ id: `${rank}H`, rank, suit: "H" as Suit, label: `${rank}H` }));
    const targetCard = hearts[(seed + trumpSeen) % hearts.length];

    return {
      kind: "specific",
      prompt: "Has this heart been played so far?",
      answer: seenCards.some((card) => card.id === targetCard.id),
      targetCard
    };
  }

  function shuffleCountingDeck(seed: number) {
    const deck = countingSuits.flatMap((suit) =>
      countingRanks.map((rank) => ({
        id: `${rank}${suit}`,
        rank,
        suit,
        label: `${rank}${suit}`
      }))
    );
    let randomSeed = seed || 1;

    for (let index = deck.length - 1; index > 0; index -= 1) {
      randomSeed = (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
      const swapIndex = randomSeed % (index + 1);
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }

    return deck;
  }

  function countOptions(answer: number, seed: number, max: number) {
    const offsets = seed % 2 === 0 ? [-2, -1, 0, 1] : [-1, 0, 1, 2];
    const options = offsets.map((offset) => Math.max(0, Math.min(max, answer + offset)));

    for (let value = 0; new Set(options).size < 4 && value <= max; value += 1) {
      options.push(value);
    }

    return Array.from(new Set(options)).slice(0, 4).sort((left, right) => left - right);
  }

  function isCourtCard(card: Card) {
    return card.rank === "J" || card.rank === "Q" || card.rank === "K";
  }

  function selectTrumpCountAnswer(option: number | boolean) {
    if (trumpCountChecked) {
      return;
    }

    trumpCountSelected = option;
  }

  function checkTrumpCountAnswer() {
    if (trumpCountSelected === null || trumpCountChecked) {
      return;
    }

    trumpCountChecked = true;
    trumpCountAttempts += 1;

    if (trumpCountSelected === trumpCountQuestion?.answer) {
      trumpCountClean += 1;
    }
  }

  function advanceTrumpCountReveal() {
    if (trumpCountStage !== "reveal") {
      return;
    }

    if (trumpCountQuestion && trumpCountRevealIndex >= trumpCountQuestion.endTrick) {
      trumpCountStage = "answer";
      return;
    }

    trumpCountRevealIndex += 1;
  }

  function nextTrumpCountRound() {
    trumpCountSeed = usePracticeSeed();
    replayTrumpCountRound();
  }

  function replayTrumpCountRound() {
    trumpCountRevealIndex = 0;
    trumpCountQuestionIndex = 0;
    trumpCountStage = "reveal";
    trumpCountSelected = null;
    trumpCountChecked = false;
    trumpCountRound = buildTrumpCountRound(trumpCountSeed);
  }

  function continueTrumpCountRound() {
    if (trumpCountQuestionIndex >= trumpCountRound.questions.length - 1) {
      trumpCountStage = "complete";
      return;
    }

    const nextQuestionIndex = trumpCountQuestionIndex + 1;
    const nextQuestion = trumpCountRound.questions[nextQuestionIndex];
    trumpCountQuestionIndex = nextQuestionIndex;
    trumpCountRevealIndex = nextQuestion.startTrick;
    trumpCountStage = "reveal";
    trumpCountSelected = null;
    trumpCountChecked = false;
  }

  function selectRealisticTrumpCard(card: Card) {
    if (realisticTrumpRound.status !== "playing") {
      return;
    }

    realisticTrumpSelectedCardId = card.id;
  }

  function playRealisticTrumpCard() {
    if (!realisticTrumpSelectedCard || realisticTrumpRound.status !== "playing") {
      return;
    }

    if (!realisticTrumpLegalCards.some((card) => card.id === realisticTrumpSelectedCard.id)) {
      return;
    }

    const hands = cloneCountingHands(realisticTrumpRound.hands);
    removeCountingCard(hands, "You", realisticTrumpSelectedCard.id);
    const completedTrick: TableCard[] = [
      ...realisticTrumpRound.currentTrick,
      { seat: "You" as const, card: realisticTrumpSelectedCard }
    ];

    const playOrder = countingPlayOrderFrom(realisticTrumpRound.currentLeader);
    const playerTurnIndex = playOrder.indexOf("You");
    const remainingSeats = playerTurnIndex >= 0 ? playOrder.slice(playerTurnIndex + 1) : [];

    for (const seat of remainingSeats) {
      const card = chooseCountingAutoCard(hands[seat], completedTrick, realisticTrumpRound.trumpSuit, seat);
      removeCountingCard(hands, seat, card.id);
      completedTrick.push({ seat, card });
    }

    const completedTricks = [...realisticTrumpRound.completedTricks, completedTrick];
    const currentLeader = countingTrickWinner(completedTrick, realisticTrumpRound.trumpSuit) ?? realisticTrumpRound.currentLeader;

    realisticTrumpRound = {
      ...realisticTrumpRound,
      hands,
      currentLeader,
      currentTrick: completedTrick,
      completedTricks,
      question: buildTrumpMemoryQuestion(completedTricks, practiceSeed + completedTricks.length),
      status: "review"
    };
    realisticTrumpSelectedCardId = "";
  }

  function continueRealisticTrumpRound() {
    if (realisticTrumpRound.status !== "review") {
      return;
    }

    if (realisticTrumpRound.completedTricks.length >= realisticTrumpTotalTricks) {
      realisticTrumpRound = {
        ...realisticTrumpRound,
        status: "complete"
      };
      return;
    }

    const checkpointIndex = realisticTrumpCheckpoints.indexOf(realisticTrumpRound.completedTricks.length);
    if (checkpointIndex >= 0 && realisticTrumpRound.questionsAsked <= checkpointIndex) {
      realisticTrumpRound = {
        ...realisticTrumpRound,
        status: "question"
      };
      realisticTrumpAnswer = null;
      realisticTrumpChecked = false;
      return;
    }

    realisticTrumpRound = beginRealisticTrumpTrick(realisticTrumpRound);
  }

  function realisticTrumpReviewActionLabel(round: RealisticTrumpRound) {
    if (round.completedTricks.length >= realisticTrumpTotalTricks) {
      return "Finish hand";
    }

    const checkpointIndex = realisticTrumpCheckpoints.indexOf(round.completedTricks.length);
    return checkpointIndex >= 0 && round.questionsAsked <= checkpointIndex ? "Answer memory" : "Next trick";
  }

  function selectRealisticTrumpAnswer(answer: number | boolean) {
    if (realisticTrumpChecked) {
      return;
    }

    realisticTrumpAnswer = answer;
  }

  function checkRealisticTrumpAnswer() {
    if (realisticTrumpAnswer === null || realisticTrumpChecked) {
      return;
    }

    realisticTrumpChecked = true;
    trumpCountAttempts += 1;
    realisticTrumpRound = {
      ...realisticTrumpRound,
      questionsAsked: realisticTrumpRound.questionsAsked + 1
    };

    if (realisticTrumpAnswer === realisticTrumpRound.question.answer) {
      trumpCountClean += 1;
    }
  }

  function continueRealisticTrumpAfterQuestion() {
    if (!realisticTrumpChecked || realisticTrumpRound.status !== "question") {
      return;
    }

    realisticTrumpAnswer = null;
    realisticTrumpChecked = false;
    realisticTrumpRound = beginRealisticTrumpTrick(realisticTrumpRound);
  }

  function nextRealisticTrumpRound() {
    realisticTrumpSeed = usePracticeSeed();
    replayRealisticTrumpRound();
  }

  function replayRealisticTrumpRound() {
    realisticTrumpSelectedCardId = "";
    realisticTrumpAnswer = null;
    realisticTrumpChecked = false;
    realisticTrumpRound = buildRealisticTrumpRound(realisticTrumpSeed);
  }

  function selectFullHandCardCountingAnswer(answer: number | boolean | Seat) {
    if (fullHandCardCountingChecked) {
      return;
    }

    fullHandCardCountingAnswer = answer;
  }

  function checkFullHandCardCountingAnswer() {
    if (fullHandCardCountingAnswer === null || fullHandCardCountingChecked) {
      return;
    }

    fullHandCardCountingChecked = true;
    fullHandCardCountingQuestionsAsked += 1;
    trumpCountAttempts += 1;

    if (fullHandCardCountingAnswer === fullHandCardCountingQuestion?.answer) {
      trumpCountClean += 1;
      fullHandCardCountingClean += 1;
    }
  }

  function continueFullHandCardCountingAfterQuestion() {
    if (!fullHandCardCountingChecked) {
      return;
    }

    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    continueFullHandAfterTrick();
  }

  function replayFullHandCardCounting() {
    if (fullHandCardCountingIsHighCard) {
      startHighCardMemoryFullHand(fullHandCardCountingPlaySeed);
      return;
    }

    if (fullHandCardCountingIsWhist) {
      startWhistMemoryFullHand(fullHandCardCountingPlaySeed);
      return;
    }

    if (fullHandCardCountingIsDanger) {
      startDangerCardsFullHand(fullHandCardCountingPlaySeed);
      return;
    }

    startTrumpMemoryFullHand(fullHandCardCountingPlaySeed);
  }

  function nextFullHandCardCounting() {
    if (fullHandCardCountingIsHighCard) {
      startHighCardMemoryFullHand();
      return;
    }

    if (fullHandCardCountingIsWhist) {
      startWhistMemoryFullHand();
      return;
    }

    if (fullHandCardCountingIsDanger) {
      startDangerCardsFullHand();
      return;
    }

    startTrumpMemoryFullHand();
  }

  function realisticTrumpQuestionAnswerText(question: TrumpMemoryQuestion) {
    if (question.kind === "count") {
      return `${question.answer} hearts have been played so far.`;
    }

    return question.answer
      ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
      : `No. ${formatCardLabel(question.targetCard)} was not played.`;
  }

  function fullHandCardCountingQuestionHeading(
    question: TrumpMemoryQuestion | DangerMemoryQuestion | WhistMemoryQuestion,
    isDanger = false,
    isHighCard = false
  ) {
    if (question.kind === "count") {
      return isDanger ? "How many queens appeared?" : isHighCard ? "How many high cards appeared?" : "How many hearts appeared?";
    }
    if (question.kind === "specific") {
      return isDanger ? "Did this queen appear?" : isHighCard ? "Did this high card appear?" : "Did this heart appear?";
    }
    if (question.kind === "trump_count") {
      return "How many trumps appeared?";
    }
    if (question.kind === "void_spotter") {
      return "Who is void?";
    }
    if (question.kind === "boss_card") {
      return "Is this the boss card?";
    }

    return "Did this trump appear?";
  }

  function fullHandCardCountingAnswerText(
    question: TrumpMemoryQuestion | DangerMemoryQuestion | WhistMemoryQuestion,
    isDanger = false,
    isHighCard = false
  ) {
    if (question.kind === "count") {
      return isDanger
        ? `${question.answer} queens have been played so far.`
        : isHighCard
          ? `${question.answer} high cards have been played so far.`
          : realisticTrumpQuestionAnswerText(question);
    }
    if (question.kind === "specific") {
      if (isHighCard) {
        return question.answer
          ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
          : `No. ${formatCardLabel(question.targetCard)} was not played.`;
      }

      return isDanger
        ? question.answer
          ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
          : `No. ${formatCardLabel(question.targetCard)} was not played.`
        : realisticTrumpQuestionAnswerText(question);
    }
    if (question.kind === "trump_count") {
      return `${question.answer} ${suitNames[question.trumpSuit].toLowerCase()} trumps have been played so far.`;
    }
    if (question.kind === "void_spotter") {
      return `${scoreSeatLabel(question.answer)} is void in ${suitNames[question.targetSuit].toLowerCase()}.`;
    }
    if (question.kind === "boss_card") {
      return question.answer
        ? `Yes. ${formatCardLabel(question.targetCard)} is the boss card.`
        : `No. ${formatCardLabel(question.targetCard)} is not the boss card.`;
    }

    return question.answer
      ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
      : `No. ${formatCardLabel(question.targetCard)} was not played.`;
  }

  function beginRealisticCourtTrick(round: RealisticCourtRound): RealisticCourtRound {
    const hands = cloneCountingHands(round.hands);
    const currentTrick: TableCard[] = [];

    for (const seat of countingPlayOrderFrom(round.currentLeader)) {
      if (seat === "You") {
        break;
      }

      const card = currentTrick.length ? chooseCountingAutoPlainCard(hands[seat], currentTrick, seat) : chooseCountingLeadCard(hands[seat]);
      removeCountingCard(hands, seat, card.id);
      currentTrick.push({ seat, card });
    }

    return {
      ...round,
      hands,
      currentTrick,
      status: "playing"
    };
  }

  function chooseCountingAutoPlainCard(hand: Card[], currentTrick: TableCard[], seat: Seat) {
    const ledSuit = currentTrick[0]?.card.suit;
    const legal = countingLegalCards(hand, ledSuit);

    return (
      [...legal]
        .filter((card) => countingCardWouldWinPlainTrick(currentTrick, card, seat))
        .sort(compareCountingCards)[0] ?? [...legal].sort(compareCountingCards)[0]
    );
  }

  function countingPlainTrickWinner(trick: TableCard[]): Seat | undefined {
    const ledSuit = trick[0]?.card.suit;
    const candidates = trick.filter((play) => play.card.suit === ledSuit);

    return [...candidates].sort((left, right) => rankValue(right.card.rank) - rankValue(left.card.rank))[0]?.seat;
  }

  function countingCardWouldWinPlainTrick(currentTrick: TableCard[], card: Card, seat: Seat) {
    const ledSuit = currentTrick[0]?.card.suit;

    if (!ledSuit) {
      return true;
    }

    if (card.suit !== ledSuit) {
      return false;
    }

    return countingPlainTrickWinner([...currentTrick, { seat, card }]) === seat;
  }

  function realisticCourtPlayPrompt(round: RealisticCourtRound) {
    const ledSuit = round.currentTrick[0]?.card.suit;

    if (!ledSuit) {
      return "Lead the trick. Track jacks, queens, and kings as they appear.";
    }

    if (round.hands.You.some((card) => card.suit === ledSuit)) {
      return `Follow ${suitNames[ledSuit].toLowerCase()}. Keep court cards in memory.`;
    }

    return `You are void in ${suitNames[ledSuit].toLowerCase()}. Play any card and keep court cards in memory.`;
  }

  function buildCourtMemoryQuestion(tricks: TableCard[][], seed: number): CourtMemoryQuestion {
    const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
    const courtSeen = seenCards.filter((card) => isCourtCard(card)).length;

    if (seed % 2 === 0) {
      return {
        kind: "count",
        prompt: "How many high cards have been played so far?",
        answer: courtSeen,
        options: countOptions(courtSeen, seed, 12)
      };
    }

    const courtCards = countingSuits.flatMap((suit) =>
      (["J", "Q", "K"] as Rank[]).map((rank) => ({
        id: `${rank}${suit}`,
        rank,
        suit,
        label: `${rank}${suit}`
      }))
    );
    const targetCard = courtCards[(seed + courtSeen) % courtCards.length];

    return {
      kind: "specific",
      prompt: "Has this high card been played so far?",
      answer: seenCards.some((card) => card.id === targetCard.id),
      targetCard
    };
  }

  function selectRealisticCourtCard(card: Card) {
    if (realisticCourtRound.status !== "playing") {
      return;
    }

    realisticCourtSelectedCardId = card.id;
  }

  function playRealisticCourtCard() {
    if (!realisticCourtSelectedCard || realisticCourtRound.status !== "playing") {
      return;
    }

    if (!realisticCourtLegalCards.some((card) => card.id === realisticCourtSelectedCard.id)) {
      return;
    }

    const hands = cloneCountingHands(realisticCourtRound.hands);
    removeCountingCard(hands, "You", realisticCourtSelectedCard.id);
    const completedTrick: TableCard[] = [
      ...realisticCourtRound.currentTrick,
      { seat: "You" as const, card: realisticCourtSelectedCard }
    ];
    const playOrder = countingPlayOrderFrom(realisticCourtRound.currentLeader);
    const playerTurnIndex = playOrder.indexOf("You");
    const remainingSeats = playerTurnIndex >= 0 ? playOrder.slice(playerTurnIndex + 1) : [];

    for (const seat of remainingSeats) {
      const card = chooseCountingAutoPlainCard(hands[seat], completedTrick, seat);
      removeCountingCard(hands, seat, card.id);
      completedTrick.push({ seat, card });
    }

    const completedTricks = [...realisticCourtRound.completedTricks, completedTrick];
    const currentLeader = countingPlainTrickWinner(completedTrick) ?? realisticCourtRound.currentLeader;

    realisticCourtRound = {
      ...realisticCourtRound,
      hands,
      currentLeader,
      currentTrick: completedTrick,
      completedTricks,
      question: buildCourtMemoryQuestion(completedTricks, practiceSeed + completedTricks.length + 17),
      status: "review"
    };
    realisticCourtSelectedCardId = "";
  }

  function continueRealisticCourtRound() {
    if (realisticCourtRound.status !== "review") {
      return;
    }

    if (realisticCourtRound.completedTricks.length >= realisticTrumpTotalTricks) {
      realisticCourtRound = {
        ...realisticCourtRound,
        status: "complete"
      };
      return;
    }

    const checkpointIndex = realisticTrumpCheckpoints.indexOf(realisticCourtRound.completedTricks.length);
    if (checkpointIndex >= 0 && realisticCourtRound.questionsAsked <= checkpointIndex) {
      realisticCourtRound = {
        ...realisticCourtRound,
        status: "question"
      };
      courtCountSelected = null;
      courtCountChecked = false;
      return;
    }

    realisticCourtRound = beginRealisticCourtTrick(realisticCourtRound);
  }

  function realisticCourtReviewActionLabel(round: RealisticCourtRound) {
    if (round.completedTricks.length >= realisticTrumpTotalTricks) {
      return "Finish hand";
    }

    const checkpointIndex = realisticTrumpCheckpoints.indexOf(round.completedTricks.length);
    return checkpointIndex >= 0 && round.questionsAsked <= checkpointIndex ? "Answer memory" : "Next trick";
  }

  function selectCourtCountAnswer(option: number | boolean) {
    if (courtCountChecked) {
      return;
    }

    courtCountSelected = option;
  }

  function checkCourtCountAnswer() {
    if (courtCountSelected === null || courtCountChecked) {
      return;
    }

    courtCountChecked = true;
    courtCountAttempts += 1;
    realisticCourtRound = {
      ...realisticCourtRound,
      questionsAsked: realisticCourtRound.questionsAsked + 1
    };

    if (courtCountSelected === realisticCourtRound.question.answer) {
      courtCountClean += 1;
    }
  }

  function continueRealisticCourtAfterQuestion() {
    if (!courtCountChecked || realisticCourtRound.status !== "question") {
      return;
    }

    courtCountSelected = null;
    courtCountChecked = false;
    realisticCourtRound = beginRealisticCourtTrick(realisticCourtRound);
  }

  function nextCourtCountRound() {
    realisticCourtSeed = usePracticeSeed();
    replayCourtCountRound();
  }

  function replayCourtCountRound() {
    realisticCourtSelectedCardId = "";
    courtCountSelected = null;
    courtCountChecked = false;
    realisticCourtRound = buildRealisticCourtRound(realisticCourtSeed);
  }

  function realisticCourtQuestionAnswerText(question: CourtMemoryQuestion) {
    if (question.kind === "count") {
      return `The answer was ${question.answer}.`;
    }

    return question.answer
      ? `Yes. ${formatCardLabel(question.targetCard)} was played.`
      : `No. ${formatCardLabel(question.targetCard)} was not played.`;
  }

  function buildDangerMemoryQuestion(tricks: TableCard[][], seed: number): DangerMemoryQuestion {
    const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
    const dangerSeen = seenCards.filter(dangerCardMemoryConfig.isTrackedCard).length;
    const checkpointIndex = Math.max(0, realisticTrumpCheckpoints.indexOf(tricks.length));

    if ((seed + checkpointIndex) % 2 === 0) {
      return {
        kind: "count",
        prompt: dangerCardMemoryConfig.countPrompt,
        answer: dangerSeen,
        options: countOptions(dangerSeen, seed, dangerCardMemoryConfig.countMax)
      };
    }

    const targetCard = dangerCardMemoryConfig.targetCards[(seed + checkpointIndex * 2) % dangerCardMemoryConfig.targetCards.length];

    return {
      kind: "specific",
      prompt: dangerCardMemoryConfig.specificPrompt,
      answer: seenCards.some((card) => card.id === targetCard.id),
      targetCard
    };
  }

  function openBarbuContracts() {
    activeTableTabs.barbu = barbuUi.table.defaultTab;
    appView = "barbuContracts";
  }

  function openPracticeChooser() {
    appView = "practiceChooser";
  }

  function openReference(referenceId = barbuUi.table.referenceId) {
    const reference = referenceCatalog.find((item) => item.id === referenceId);

    if (!reference) {
      return;
    }

    activeReferenceId = reference.id;
    appView = "reference";
  }

  function openPathReview() {
    activeGameTable = "barbu";
    activePathStepId = "review";
    appView = "pathReview";
  }

  function openGame(gameId: CatalogGameId) {
    if (gameId === "hearts") {
      openHeartsTable();
      return;
    }

    if (gameId === "whist") {
      openWhistTable();
      return;
    }

    if (gameId === "spades") {
      openSpadesTable();
      return;
    }

    if (gameId === "bridge") {
      openBridgeTable();
      return;
    }

    if (gameId === "card-counting") {
      openCardCountingTable("play");
      return;
    }

    if (gameId !== "barbu") {
      return;
    }

    activeTableTabs.barbu = "play";
    openBarbuTable();
  }

  async function startFullHand(contract: FullHandContract, options: { cardCounting?: boolean; seed?: number; dealer?: number } = {}) {
    if (contract === "Domino") {
      await startDominoHand();
      return;
    }

    fullHandCardCountingMode = options.cardCounting === true;
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;

    dominoHand = null;

    const seed = options.seed ?? usePracticeSeed();
    fullHandSelectedCardId = "";
    fullHandError = "";
    fullHandReviewTrickCount = 0;
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    const engine = typescriptHandEngine(contract);
    if (!engine) throw new Error(`Unsupported hand: ${contract}`);
    fullHand = engine.start({ seed, dealer: options.dealer });

    appView = "fullHand";
  }

  async function startDominoHand() {
    const seed = usePracticeSeed();
    fullHand = null;

    dominoSelectedCardId = "";
    dominoError = "";
    dominoLastMoveReason = "";
    lastDominoTapCardId = "";
    lastDominoTapAt = 0;

    dominoHand = dominoHandEngine.start({ seed });

    appView = "dominoHand";
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

  async function playFullHandCard(cardId?: string) {
    const targetId = cardId || fullHandSelectedCard?.id;
    if (!fullHand || fullHandIsReviewingTrick || !targetId) {
      return;
    }

    if (!fullHandLegalCardIds.has(targetId)) {
      return;
    }

    fullHandError = "";
    const completedTrickCount = fullHand.completedTricks.length;

    try {
      const engine = typescriptHandEngine(fullHand.contract);
      if (!engine) throw new Error(`Unsupported hand: ${fullHand.contract}`);
      updateFullHandAfterPlayerPlay(engine.transition(fullHand, { type: "play-card", cardId: targetId }), completedTrickCount);
      fullHandSelectedCardId = "";
      lastFullHandTapCardId = "";
      lastFullHandTapAt = 0;
    } catch (error) {
      fullHandError = typeof error === "string" ? error : error instanceof Error ? error.message : "That card could not be played.";
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

  function continueFullHandReview() {
    if (fullHandCardCountingPromptActive) {
      continueFullHandCardCountingAfterQuestion();
      return;
    }

    continueFullHandAfterTrick();
  }

  function startNoHeartsHand() {
    void startFullHand("No Hearts");
  }

  function startPartnershipHand() { openWhistTable(); }

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
    void startFullHand("Hearts Trumps");
  }

  function startDominoPracticeHand() {
    void startFullHand("Domino");
  }

  function createPracticePanelActions<Action extends string>(
    actions: Record<Action, PracticeActionLauncher>
  ): Record<Action, () => void> {
    return Object.fromEntries(
      Object.entries(actions).map(([action, launch]) => [
        action,
        () => {
          launch({ source: "practice" });
        }
      ])
    ) as Record<Action, () => void>;
  }

  function startBarbuRun() {
    activeGameTable = "barbu";
    activeTableTabs.barbu = "play";
    void barbuFeature.start();
    appView = "barbuPlay";
  }

  function applyDominoAction(action: DominoAction, reason = "") {
    if (!dominoHand) return;
    dominoError = "";
    try {
      const next = dominoHandEngine.transition(dominoHand, action);
      if (next === dominoHand) return;
      dominoHand = next;
      dominoSelectedCardId = "";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
      dominoLastMoveReason = reason;
    } catch (error) {
      dominoError = error instanceof Error ? error.message : "That Domino action could not be completed.";
    }
  }

  function playDominoSelectedCard(cardId = dominoSelectedCardId) {
    if (!dominoHand || dominoHand.status === "complete" || !dominoHand.legalCardIds.includes(cardId)) return;
    const card = dominoHand.playerHand.find(card => card.id === cardId);
    applyDominoAction({ type: "play-card", cardId }, card ? dominoMoveExplanation(dominoHand, card) : "");
  }

  async function selectDominoCard(card: Card) {
    if (!dominoHand || dominoHand.status === "complete") {
      return;
    }

    const now = Date.now();
    const isDoubleTap = lastDominoTapCardId === card.id && now - lastDominoTapAt < 450;

    dominoSelectedCardId = card.id;
    lastDominoTapCardId = card.id;
    lastDominoTapAt = now;

    if (isDoubleTap && dominoLegalCardIds.has(card.id)) {
      await playDominoSelectedCard(card.id);
    }
  }

  function placeSelectedOrDefaultDominoCard() {
    const cardId =
      dominoSelectedCard && dominoLegalCardIds.has(dominoSelectedCard.id)
        ? dominoSelectedCard.id
        : (dominoDefaultPlayableCard?.id ?? "");

    void playDominoSelectedCard(cardId);
  }

  function passDomino() {
    applyDominoAction({ type: "pass" }, "You passed because no card in your hand could start or extend a lane.");
  }

  function startNextDominoHand() {
    if (!dominoHand) {
      return;
    }

    const currentIndex = fullHandContracts.indexOf(dominoHand.contract);
    const nextContract = fullHandContracts[(currentIndex + 1) % fullHandContracts.length] ?? "No Hearts";
    void startFullHand(nextContract);
  }

  function replayDominoHand() {
    applyDominoAction({ type: "replay" });
  }

  function startNextFullHand() {

    if (!fullHand) {
      return;
    }

    if (fullHandIsPartnershipGame) {

      if (whistFullHandSource === "practice") {
        openWhistTable();
        return;
      }

      if (partnershipMatchIsComplete) {
        startPartnershipHand();
        return;
      }

      startPartnershipHand();
      return;
    }

    const currentIndex = fullHandContracts.indexOf(fullHand.contract);
    if (currentIndex < 0) {
      void startFullHand(fullHand.contract);
      return;
    }

    const nextContract = fullHandContracts[(currentIndex + 1) % fullHandContracts.length] ?? "No Hearts";
    void startFullHand(nextContract);
  }

  function replayFullHand() {

    if (!fullHandReplayAllowed) return;
    if (!fullHand) {
      return;
    }

    if (fullHandIsPartnershipGame) {

      if (whistFullHandSource === "practice") {
        openWhistTable();
        return;
      }

      startPartnershipHand();
      return;
    }

    const engine = typescriptHandEngine(fullHand.contract);
    if (!engine) return;
    fullHand = engine.transition(fullHand, { type: "replay" });
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;
    fullHandReviewTrickCount = 0;
    fullHandSelectedCardId = "";
    fullHandError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
  }

  function fullHandTrickFeedback(trick: CompletedHandTrick) {
    if (fullHandIsPartnershipGame) return whistTrickFeedback(trick, fullHand?.contract ?? "partnership");
    if (fullHandIsHeartsGame && fullHand) return heartsTrickFeedback(trick, fullHand);
    return fullHand ? barbuTrickFeedback(trick, fullHand) : "";
  }

  function fullHandTrickIsWarning(trick: CompletedHandTrick | undefined) {
    return fullHandContractMeta.kind === "avoidance" && trick?.outcome === "captured_penalty";
  }

  function fullHandCardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: fullHandLegalCardIds.has(card.id),
      illegal: !fullHandLegalCardIds.has(card.id),
      selected: fullHandSelectedCardId === card.id
    };
  }

  async function startDailyDrill(pathStepId = "") {
    activePathStepId = pathStepId;
    activeDrillFocusContract = "";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = "Mixed contract review";
    resetDrillDecision();

    activeDrillSteps = await loadGeneratedDrillSessionSteps();
    appView = "drill";
  }

  function loadGeneratedDrillSessionSteps(focusContract = "") {
    const seed = usePracticeSeed();
    const candidates = generateBarbuPracticeSet(seed).scenarios
      .map(drillStepFromGeneratedScenario)
      .filter((step) => !focusContract || step.contract === focusContract);

    if (focusContract) {
      return orderPracticePool(candidates, seed);
    }

    const selectedSteps: DrillStep[] = [];

    for (const contract of fullHandContracts) {
      const contractCandidates = candidates.filter((step) => step.contract === contract);

      if (contractCandidates.length === 0) {
        continue;
      }

      const contractSeed = seed + selectedSteps.length * 13;
      selectedSteps.push(selectGeneratedDrillCandidate(contractCandidates, contractSeed, selectedSteps));
    }

    return selectedSteps.length > 0 ? selectedSteps : [selectGeneratedDrillCandidate(candidates, seed)];
  }

  function selectGeneratedDrillCandidate(candidates: DrillStep[], seed: number, sessionSteps = activeDrillSteps) {
    const lastStep = sessionSteps[sessionSteps.length - 1];
    const activeScenarioIds = sessionSteps
      .slice(-maxStoredDrillPatterns)
      .map((step) => step.scenarioId)
      .filter((scenarioId): scenarioId is string => Boolean(scenarioId));
    const recentScenarioIds = new Set([...recentDrillScenarioIds, ...activeScenarioIds]);
    const freshCandidates =
      candidates.length > 1
        ? candidates.filter((step) => !step.scenarioId || !recentScenarioIds.has(step.scenarioId))
        : candidates;
    const nonRepeatingCandidates =
      candidates.length > 1 && lastStep?.scenarioId
        ? candidates.filter((step) => step.scenarioId !== lastStep.scenarioId)
        : candidates;
    const candidatePool =
      freshCandidates.length > 0
        ? freshCandidates
        : nonRepeatingCandidates.length > 0
          ? nonRepeatingCandidates
          : candidates;
    const selectedCandidate = candidatePool[generatedCandidateIndex(seed, candidatePool.length)];

    rememberDrillScenarioPattern(selectedCandidate.scenarioId);
    return selectedCandidate;
  }

  function generatedCandidateIndex(seed: number, candidateCount: number) {
    return (Math.imul(seed, 2654435761) + 1013904223 >>> 0) % candidateCount;
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
    activeGameTable = "barbu";
    activePathStepId = "";
    activeDrillFocusContract = replayContract;
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = `Replay ${replayContract}`;
    resetDrillDecision();

    activeDrillSteps = await loadGeneratedDrillSessionSteps(replayContract);
    resetDrillDecision();
    appView = "drill";
  }

  function startLesson(lessonId: string, pathStepId = "") {
    selectLesson(lessonId);
    activePathStepId = pathStepId || (barbuUi.learnSteps.find((step) => step.lessonId === lessonId)?.id ?? "");
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
    const course = courseCatalog.find((item) => courseTargetsGuidedLesson(item, lessonId));

    if (course) {
      startCourse(course.id);
      return;
    }

    startLesson(lessonId);
  }

  function courseForLesson(lessonId: string) {
    return courseCatalog.find((item) => courseTargetsGuidedLesson(item, lessonId));
  }

  function continueCourseContent() {
    if (activeCourseStage === "concept") {
      activeCourseStage = "example";
      return;
    }

    if (activeCourseStage === "example") {
      startCoursePractice(activeCourse);
      return;
    }

    if (activeCourseStage === "review") {
      saveCourseProgress({ ...completedPathSteps, [activePathStepId]: true });
      openActiveCourseTable();
    }
  }

  function openActiveCourseTable() {
    if (activeCourse.game === "bridge") {
      activeTableTabs.bridge = "learn";
      openBridgeTable();
      return;
    }

    if (activeCourse.game === "spades") {
      activeTableTabs.spades = "learn";
      openSpadesTable();
      return;
    }

    if (activeCourse.game === "whist") {
      activeTableTabs.whist = "learn";
      openWhistTable();
      return;
    }

    if (activeCourse.game === "hearts") {
      activeTableTabs.hearts = "learn";
      openHeartsTable();
      return;
    }

    openBarbuTable();
  }

  function startCoursePractice(course: CourseContent) {
    const target = course.practiceTarget;

    if (target.kind === "guided-lesson") {
      startLesson(target.lessonId, course.pathStepId);
      return;
    }

    practiceActionRegistry[target.game][target.action]({ pathStepId: course.pathStepId, source: "course" });
  }

  async function startFixedContractDrill(lessonId: string) {
    const lesson = guidedLessons.find((item) => item.id === lessonId);
    const step = lesson ? drillSteps.find((item) => item.contract === lesson.contract) : undefined;

    if (!lesson) {
      return;
    }

    activePathStepId = "";
    activeDrillFocusContract = lesson.contract;
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = `Fixed drill: ${lesson.contract}`;
    activeDrillSteps = await loadGeneratedDrillSessionSteps(lesson.contract);
    if (activeDrillSteps.length === 0 && step) {
      activeDrillSteps = [step];
    }
    resetDrillDecision();
    appView = "drill";
  }

  const practiceActionRegistry: PracticeActionRegistry = {
    barbu: {
      fixed: () => {
        activeTableTabs.barbu = "learn";
      },
      domino: () => void startDominoPracticeHand()
    },
    hearts: {},
    whist: {},
    spades: {},
    bridge: {}
  };

  const barbuPracticeActions = createPracticePanelActions(practiceActionRegistry.barbu);

  function continueCourse() {
    if (isCourseComplete || !nextPathStep) {
      openBarbuLearnTable();
      return;
    }

    startPathStep(nextPathStep);
  }

  function startPathStep(step: BarbuLearnPathStep) {
    const course = courseCatalog.find((item) => item.game === "barbu" && item.pathStepId === step.id);

    if (course) {
      startCourse(course.id);
      return;
    }

    if (step.action === "lesson" && step.lessonId) {
      startLesson(step.lessonId);
      return;
    }

  }

  function selectLesson(lessonId: string) {
    const lesson = guidedLessons.find((item) => item.id === lessonId);

    if (!lesson) {
      return;
    }

    selectedLessonId = lesson.id;
    activeTricks = lesson.tricks;
    trickIndex = 0;
    resetTrick();
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

  function finishPathReview() {
    saveCourseProgress({ ...completedPathSteps, review: true });
    openBarbuLearnTable();
  }

  function selectDrillCard(card: Card) {
    if (drillCheckedCardId) {
      return;
    }

    drillSelectedCardId = card.id;
  }

  function checkDrillAnswer() {
    const selected = currentDrillTrick.hand.find((card) => card.id === drillSelectedCardId);

    if (!selected || drillCheckedCardId) {
      return;
    }

    const { result } = drillDecision(currentDrill, selected);

    drillCheckedCardId = selected.id;
    drillResults = [
      ...drillResults,
      result
    ];
  }

  async function continueDrill() {
    const nextIndex = drillIndex + 1;

    if (nextIndex >= activeDrillSteps.length) {
      finishDrill();
      return;
    }

    drillIndex = nextIndex;
    resetDrillDecision();
  }

  function finishDrill() {
    const completedCourse = courseCatalog.find(course => course.pathStepId === activePathStepId);

    try {
      saveCompletedDrillSession();
      if (activePathStepId && !completedCourse) {
        saveCourseProgress({ ...completedPathSteps, [activePathStepId]: true });
      }
    } catch {
      // The result screen should still open if local storage is unavailable.
    }

    if (completedCourse) {
      activeCourseId = completedCourse.id;
      activeCourseStage = "review";
      appView = "courseContent";
      return;
    }

    appView = "drillResult";
  }

  function handleDrillPrimaryAction() {
    if (isLastDrillDecision) {
      finishDrill();
      return;
    }

    void continueDrill();
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
      if (contractLabel === "Domino") {
        return `${selected.label} does not fit the layout right now. Open with a seven or extend an open suit by one rank.`;
      }

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

    return outcomeLabels[currentTrick.cardOutcomes?.[played.id] ?? "good"];
  }

  function factsForSection(section: GameReference["sections"][number]) {
    return section.facts ?? [];
  }
  $: gameTableConfigs = {
    barbu: {
      learnProps: { steps: barbuUi.learnSteps, completedCount: barbuUi.learnSteps.filter(s => completedPathSteps[s.id]).length, nextStep: barbuUi.learnSteps.find(s => !completedPathSteps[s.id]), actions: barbuLearnPanelActions, onStepSelect: startPathStep },
      practiceProps: { lessonEntries: fixedDrillLessons, onLessonSelect: startFixedContractDrill, actions: barbuPracticeActions },
      playProps: { onPrimary: startBarbuRun, primaryDisabled: $barbuFeature.dealing, primaryWarning: $barbuFeature.error, resumeLabel: $barbuFeature.saved ? "Continue Play Barbu" : undefined, resumeNote: $barbuFeature.saved ? savedPlayBarbuRunSummary($barbuFeature.saved) : undefined, onResume: $barbuFeature.saved ? () => { barbuFeature.resume(); appView = "barbuPlay"; } : undefined }
    },

  } as Record<string, any>;

</script>

{#snippet cardCountingExerciseGrid(label = "Card counting exercises")}
  <div class="fixed-contract-grid" aria-label={label}>
    {#each cardCountingExercises as exercise}
      <button class="contract-card compact" onclick={() => openCardCountingExercise(exercise.action)} type="button">
        <span>{exercise.eyebrow}</span>
        <strong>{exercise.title}</strong>
        <small>{exercise.summary}</small>
      </button>
    {/each}
  </div>
{/snippet}

{#snippet proFeatureGrid()}
  <div class="fixed-contract-grid">
    <div class="contract-card compact pro-feature-card">
      <span>Subscriber feature</span>
      <strong>Play against AI</strong>
      <small>Challenge stronger local or remote opponents that adjust to the game, contract, and your recent decisions.</small>
    </div>
    <div class="contract-card compact pro-feature-card">
      <span>Subscriber feature</span>
      <strong>Competitive Play</strong>
      <small>Play ranked or table-style matches against other players when multiplayer and accounts are ready.</small>
    </div>
  </div>
{/snippet}

<main class:fixed-play-screen={isTablePlayScreen || (appView === "whistFeature" && whistFixedSurface) || (appView === "heartsFeature" && heartsFixedSurface) || (appView === "spadesFeature" && spadesFixedSurface) || (appView === "bridgeFeature" && bridgeFixedSurface)} class="app-shell">
  {#if appView === "catalog"}
    <section class="welcome-screen" aria-labelledby="catalog-title">
      <div class="welcome-copy">
        <p class="eyebrow">Card game catalog</p>
        <h1 id="catalog-title">Choose a table</h1>
        <p class="intro">
          Learn, practice, and play. Follow the Bridge path from Hearts to Whist, or explore other classic card club games.
        </p>
      </div>

      <div class="welcome-table" aria-hidden="true">
        <div class="mini-card mini-card-one"><CardFace card={catalogTableCards[0]} decorative /></div>
        <div class="mini-card mini-card-two"><CardFace card={catalogTableCards[1]} decorative /></div>
        <div class="mini-card mini-card-three"><CardFace card={catalogTableCards[2]} decorative /></div>
      </div>
    </section>

    <section class="catalog-section" aria-label="Games">
      {#each catalogCategories as category}
        <div class="section-heading">
          <p class="eyebrow">{category.summary}</p>
          <h2>{category.title}</h2>
        </div>

        <div class="game-grid">
          {#each category.entries as game}
            <button
              aria-label={game.status === "Ready" ? `Open ${game.title}` : `${game.title} planned`}
              class:ready={game.status === "Ready"}
              class="game-card"
              disabled={game.status !== "Ready"}
              onclick={() => openGame(game.id)}
              type="button"
            >
              <span class="game-card-meta">
                <span class="game-family">{game.family}</span>
                <span class:free-access={game.access === "Free"} class="game-access">{game.access}</span>
              </span>
              <strong>{game.title}</strong>
              <span class="game-summary">{game.summary}</span>
              <span class="game-footer">
                <span>{game.status}</span>
              </span>
            </button>
          {/each}
        </div>
      {/each}
    </section>

    <footer class="catalog-footer">
      <a href={privacyPolicyUrl} rel="noopener noreferrer" target="_blank" onclick={openPrivacyPolicy} aria-busy={openingPrivacyPolicy}>Privacy policy</a>
      {#if privacyPolicyError}
        <p role="alert">
          {privacyPolicyError}
          <span class="privacy-policy-url">{privacyPolicyUrl}</span>
        </p>
      {/if}
    </footer>
  {:else if appView === "bridgeFeature"}
    <BridgeGame feature={bridgeFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("bridge")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { bridgeFixedSurface = fixed; }} />
  {:else if appView === "spadesFeature"}
    <SpadesGame feature={spadesFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("spades")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { spadesFixedSurface = fixed; }} />
  {:else if appView === "heartsFeature"}
    <HeartsGame feature={heartsFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("hearts")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { heartsFixedSurface = fixed; }} />
  {:else if appView === "whistFeature"}
    <WhistGame feature={whistFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("whist")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { whistFixedSurface = fixed; }} />
  {:else if appView === "cardCountingTable"}
    <GameTableShell table={cardCountingTable} activeTab={activeCardCountingTab} onBack={openCatalog}
      onTabSelect={(tab) => { activeCardCountingTab = tab === "play" ? "play" : "learn"; }}>
      {#if activeCardCountingTab === "learn"}
        <LearnPanel table={cardCountingTable} steps={[]} completedSteps={{}} completedCount={0} onStepSelect={() => {}}
          groups={[{ id: "memory", ariaLabel: "Card Counting I learning path", eyebrow: "Memory", title: "Memory skills", layout: "entry-grid",
            entries: cardCountingExercises.map(exercise => ({ id: exercise.action, label: exercise.eyebrow, title: exercise.title,
              summary: exercise.summary, action: exercise.action, group: "memory" })) }]}
          exerciseActions={Object.fromEntries(cardCountingExercises.map(exercise => [exercise.action, () => openCardCountingExercise(exercise.action)]))}
        />
      {:else}
        <div aria-label="Play" class="barbu-tab-panel perfect-panel" id="card-counting-play-panel" role="tabpanel">
          <div class="barbu-mode-copy">
            <p class="eyebrow">Play</p>
            <h2>Real hands with memory checks.</h2>
            <p>Start with Black Lady, then try trump, court-card, and danger-card tracking.</p>
          </div>

          <section class="fixed-contract-practice" aria-label="Card Counting I practice">
            {@render cardCountingExerciseGrid("Card Counting I exercises")}
          </section>
        </div>
      {/if}
    </GameTableShell>
  {:else if appView === "gameTable" && activeGameTable}
    {@const gameUi = registry.get(activeGameTable)!}
    {@const currentTab = activeTableTabs[activeGameTable] || gameUi.table.defaultTab}

        {@const activeConfig = gameTableConfigs[activeGameTable] || gameTableConfigs["barbu"]}

    <GameTableShell
      table={gameUi.table}
      activeTab={currentTab}
      onBack={openCatalog}
      onTabSelect={(tab) => {
        activeTableTabs[activeGameTable] = tab;
      }}
    >
      {#if currentTab === "learn"}
        <LearnPanel
          table={gameUi.table}
          steps={activeConfig.learnProps.steps}
          completedSteps={completedPathSteps}
          completedCount={activeConfig.learnProps.completedCount}
          nextStep={activeConfig.learnProps.nextStep}
          actions={activeConfig.learnProps.actions}
          onStepSelect={activeConfig.learnProps.onStepSelect}
          groups={gameUi.practiceGroups}
          exerciseActions={activeConfig.practiceProps.actions}
          lessonEntries={activeConfig.practiceProps.lessonEntries}
          onLessonSelect={activeConfig.practiceProps.onLessonSelect}
        />
      {:else if currentTab === "play"}
        <PlayTabPanel
          table={gameUi.table}
          actionAriaLabel={gameUi.playTabConfig!.actionAriaLabel}
          groupAriaLabel={gameUi.playTabConfig!.groupAriaLabel}
          groupEyebrow={gameUi.playTabConfig!.groupEyebrow}
          primaryLabel={gameUi.playTabConfig!.primaryLabel}
          supportingCopy={gameUi.playTabConfig!.supportingCopy}
          footerNote={activeConfig.playProps.footerNote}
          primaryDisabled={activeConfig.playProps.primaryDisabled}
          primaryWarning={activeConfig.playProps.primaryWarning}
          onPrimary={activeConfig.playProps.onPrimary}
          resumeLabel={activeConfig.playProps.resumeLabel}
          resumeNote={activeConfig.playProps.resumeNote}
          onResume={activeConfig.playProps.onResume}
        >
        </PlayTabPanel>
      {:else}
        <ProTabPanel
          table={gameUi.table}
          featuresAriaLabel={gameUi.proTabConfig!.featuresAriaLabel}
          headingTitle={gameUi.proTabConfig!.headingTitle}
          headingSummary={gameUi.proTabConfig!.headingSummary}
        >
          {@render proFeatureGrid()}
        </ProTabPanel>
      {/if}
    </GameTableShell>
  {:else if appView === "trumpMemory"}
      <TablePlaySurface
        flowLayout
        mode={realisticTrumpRound.status === "complete" ? "result" : "play"}
        showTable={realisticTrumpRound.status !== "complete"}
        ariaLabel="Heart memory hand trainer"
        title="Heart memory hand"
        eyebrow="Card Counting I"
        statusLabel="Memory"
        statusValue={`${trumpCountClean} of ${trumpCountAttempts}`}
        tableAriaLabel="Realistic trump table"
        pendingBySeat={realisticTrumpPendingBySeat}
        tableCards={realisticTrumpTableCards}
        panelAriaLabel="Realistic trump decision"
        onBack={openCardCountingReturnTarget}
        onSurfaceClick={realisticTrumpRound.status === "review" ? continueRealisticTrumpRound : undefined}
      >
        {#snippet summary()}
          {#if realisticTrumpRound.status !== "complete"}
            <div class="trump-count-review" aria-label="Heart memory status">
              <span>Memory run</span>
              <strong>{realisticTrumpRound.completedTricks.length} tricks complete</strong>
              <small>Track hearts from memory.</small>
            </div>
          {/if}
        {/snippet}

        {#snippet panel()}
          {#if realisticTrumpRound.status === "complete"}
            <div class="counting-break-card" aria-label="Heart memory intermission">
              <div class="lesson-heading">
                <p class="eyebrow">Break</p>
                <h2>{realisticTrumpBreakSummary.title}</h2>
              </div>

              <p class="result">{realisticTrumpBreakSummary.summary}</p>

              <div class="counting-break-grid">
                <div>
                  <span>{realisticTrumpBreakSummary.firstLabel}</span>
                  <strong>{realisticTrumpBreakSummary.firstValue}</strong>
                  <small>{realisticTrumpBreakSummary.firstDetail}</small>
                </div>
                <div>
                  <span>{realisticTrumpBreakSummary.secondLabel}</span>
                  <strong>{realisticTrumpBreakSummary.secondValue}</strong>
                  <small>{realisticTrumpBreakSummary.secondDetail}</small>
                </div>
              </div>
            </div>
          {:else}
            <div class="lesson-heading">
              <p class="eyebrow">Hearts are trumps</p>
              <h2>{realisticTrumpPromptTitle}</h2>
            </div>

            <p class="result" aria-label="Realistic trump challenge">{realisticTrumpPromptBody}</p>

            {#if realisticTrumpRound.status === "playing"}
            <CardChoiceHand
              cards={realisticTrumpRound.hands.You}
              ariaLabel="Your realistic trump hand"
              className="hand full-hand-cards realistic-trump-hand"
              cardClassName="card hand-card full-hand-card"
              getCardClasses={(card) => ({
                heart: card.suit === "H",
                illegal: !realisticTrumpLegalCards.some((legalCard) => legalCard.id === card.id),
                legal: realisticTrumpLegalCards.some((legalCard) => legalCard.id === card.id),
                selected: realisticTrumpSelectedCardId === card.id
              })}
              isPressed={(card) => realisticTrumpSelectedCardId === card.id}
              onSelect={selectRealisticTrumpCard}
            />
            {/if}

            {#if realisticTrumpRound.status === "question"}
            {#if realisticTrumpRound.question.kind === "count"}
              <div class="trump-count-options" aria-label="Realistic trump count answers">
                {#each realisticTrumpRound.question.options as option}
                  <button
                    aria-pressed={realisticTrumpAnswer === option}
                    class:correct={realisticTrumpChecked && option === realisticTrumpRound.question.answer}
                    class:selected={realisticTrumpAnswer === option}
                    class:wrong={realisticTrumpChecked && realisticTrumpAnswer === option && option !== realisticTrumpRound.question.answer}
                    disabled={realisticTrumpChecked}
                    onclick={() => selectRealisticTrumpAnswer(option)}
                    type="button"
                  >
                    {option}
                  </button>
                {/each}
              </div>
            {:else}
              <div class="trump-specific-check">
                <div class="trump-target-card" aria-label={`Target trump card ${formatCardLabel(realisticTrumpRound.question.targetCard)}`}>
                  <span>Target</span>
                  <div class="trump-target-card-face">
                    <CardFace card={realisticTrumpRound.question.targetCard} decorative />
                  </div>
                </div>
                <div class="trump-count-options trump-specific-options" aria-label="Realistic trump specific answers">
                  <button
                    aria-pressed={realisticTrumpAnswer === true}
                    class:correct={realisticTrumpChecked && realisticTrumpRound.question.answer === true}
                    class:selected={realisticTrumpAnswer === true}
                    class:wrong={realisticTrumpChecked && realisticTrumpAnswer === true && realisticTrumpRound.question.answer !== true}
                    disabled={realisticTrumpChecked}
                    onclick={() => selectRealisticTrumpAnswer(true)}
                    type="button"
                  >
                    Yes
                  </button>
                  <button
                    aria-pressed={realisticTrumpAnswer === false}
                    class:correct={realisticTrumpChecked && realisticTrumpRound.question.answer === false}
                    class:selected={realisticTrumpAnswer === false}
                    class:wrong={realisticTrumpChecked && realisticTrumpAnswer === false && realisticTrumpRound.question.answer !== false}
                    disabled={realisticTrumpChecked}
                    onclick={() => selectRealisticTrumpAnswer(false)}
                    type="button"
                  >
                    No
                  </button>
                </div>
              </div>
            {/if}

            <p
              class:warning={realisticTrumpChecked && realisticTrumpAnswer !== realisticTrumpRound.question.answer}
              class="trump-count-feedback"
            >
              {realisticTrumpFeedback}
            </p>
            {/if}

            {#if realisticTrumpChecked}
            <div class="trump-count-review" aria-label="Realistic trump count review">
              <span>Trump cards seen</span>
              <strong>{realisticTrumpSeenCount} hearts appeared</strong>
              <small>{realisticTrumpQuestionAnswerText(realisticTrumpRound.question)}</small>
              <div class="trump-review-cards">
                {#each realisticTrumpSeenCards.filter((card) => card.suit === realisticTrumpRound.trumpSuit) as card}
                  <div class="trump-seen-card trump">
                    <CardFace {card} decorative />
                  </div>
                {/each}
              </div>
            </div>
            {/if}
          {/if}

          <div class="action-row">
            <button class="secondary-action" onclick={openCardCountingReturnTarget} type="button">Table</button>
            {#if realisticTrumpRound.status === "playing"}
              <button
                class="primary-action"
                disabled={
                  !realisticTrumpSelectedCard ||
                  !realisticTrumpLegalCards.some((card) => card.id === realisticTrumpSelectedCard.id)
                }
                onclick={playRealisticTrumpCard}
                type="button"
              >
                Play card
              </button>
            {:else if realisticTrumpRound.status === "review"}
              <button class="primary-action" onclick={continueRealisticTrumpRound} type="button">
                {realisticTrumpReviewActionLabel(realisticTrumpRound)}
              </button>
            {:else if realisticTrumpRound.status === "question" && realisticTrumpChecked}
              <button class="primary-action" onclick={continueRealisticTrumpAfterQuestion} type="button">Continue hand</button>
            {:else if realisticTrumpRound.status === "complete"}
              <button class="secondary-action" onclick={replayRealisticTrumpRound} type="button">Replay</button>
              <button class="primary-action" onclick={nextRealisticTrumpRound} type="button">Next hand</button>
            {:else}
              <button
                class="primary-action"
                disabled={realisticTrumpAnswer === null}
                onclick={checkRealisticTrumpAnswer}
                type="button"
              >
                Check memory
              </button>
            {/if}
          </div>
        {/snippet}
      </TablePlaySurface>
  {:else if appView === "trumpCount"}
    <TablePlaySurface
      flowLayout
      mode={trumpCountStage === "complete" ? "result" : "play"}
      ariaLabel="Count trumps trainer"
      title="Count trumps"
      eyebrow="Card Counting I"
      statusLabel="Memory"
      statusValue={`${trumpCountClean} of ${trumpCountAttempts}`}
      tableAriaLabel="Trump trick reveal"
      tableCards={[]}
      panelAriaLabel="Count trumps decision"
      showTable={false}
      onBack={openCardCountingReturnTarget}
    >
      {#snippet summary()}
        {#if trumpCountStage !== "complete"}
          <div class="trump-count-review" aria-label="Count trumps status">
            <span>Memory run</span>
            <strong>{trumpCountRevealIndex} tricks revealed</strong>
            <small>Track hearts from memory.</small>
          </div>
        {/if}
      {/snippet}

      {#snippet panel()}
        {#if trumpCountStage === "complete"}
          <div class="counting-break-card" aria-label="Count trumps intermission">
            <div class="lesson-heading">
              <p class="eyebrow">Break</p>
              <h2>{trumpCountBreakSummary.title}</h2>
            </div>

            <p class="result">{trumpCountBreakSummary.summary}</p>

            <div class="counting-break-grid">
              <div>
                <span>{trumpCountBreakSummary.firstLabel}</span>
                <strong>{trumpCountBreakSummary.firstValue}</strong>
                <small>{trumpCountBreakSummary.firstDetail}</small>
              </div>
              <div>
                <span>{trumpCountBreakSummary.secondLabel}</span>
                <strong>{trumpCountBreakSummary.secondValue}</strong>
                <small>{trumpCountBreakSummary.secondDetail}</small>
              </div>
            </div>
          </div>
        {:else}
          <div class="trump-count-stage">
            {#if trumpCountStage === "reveal"}
            <div class="trump-memory-table" aria-label="Trump trick reveal">
              {#each trumpCountVisibleTrick as play}
                <div class="trump-memory-seat">
                  <span>{scoreSeatLabel(play.seat)}</span>
                  <div class:trump={play.card.suit === trumpCountRound.trumpSuit} class="trump-memory-card">
                    <CardFace card={play.card} decorative />
                  </div>
                </div>
              {/each}
            </div>
          {:else if !trumpCountChecked}
            <div class="trump-memory-hidden" aria-label="Trump memory prompt">
              <span>{trumpCountSegmentLabel} shown</span>
              <strong>Cards hidden</strong>
              <small>Use the count you kept while the tricks appeared.</small>
            </div>
            {/if}
          </div>

          <div class="lesson-heading">
            <p class="eyebrow">Hearts are trumps</p>
            <h2>{trumpCountPromptTitle}</h2>
          </div>

          {#if trumpCountChecked}
          <div class="trump-count-review" aria-label="Trump count review">
            <span>Trump cards seen</span>
            <strong>{trumpCountSeenCount} hearts appeared</strong>
            <small>
              {#if trumpCountQuestion?.kind === "specific"}
                {formatCardLabel(trumpCountQuestion.targetCard)} {trumpCountQuestion.answer ? "was" : "was not"} in {trumpCountSegmentLabel}.
              {:else}
                The answer for {trumpCountSegmentLabel} was {trumpCountQuestion?.answer}.
              {/if}
            </small>
            <div class="trump-review-cards">
              {#each trumpCountSeenCards.filter((card) => card.suit === trumpCountRound.trumpSuit) as card}
                <div class="trump-seen-card trump">
                  <CardFace {card} decorative />
                </div>
              {/each}
            </div>
          </div>
          {/if}

          <p class="result" aria-label="Trump count prompt">{trumpCountPromptBody}</p>

          {#if trumpCountStage === "answer" && !trumpCountChecked}
          {#if trumpCountQuestion?.kind === "count"}
            <div class="trump-count-options" aria-label="Trump count answers">
              {#each trumpCountQuestion.options as option}
                <button
                  aria-pressed={trumpCountSelected === option}
                  class:correct={trumpCountChecked && option === trumpCountQuestion.answer}
                  class:selected={trumpCountSelected === option}
                  class:wrong={trumpCountChecked && trumpCountSelected === option && option !== trumpCountQuestion.answer}
                  disabled={trumpCountChecked}
                  onclick={() => selectTrumpCountAnswer(option)}
                  type="button"
                >
                  {option}
                </button>
              {/each}
            </div>
          {:else if trumpCountQuestion?.kind === "specific"}
            <div class="trump-specific-check">
              <div class="trump-target-card" aria-label={`Target trump card ${formatCardLabel(trumpCountQuestion.targetCard)}`}>
                <span>Target</span>
                <div class="trump-target-card-face">
                  <CardFace card={trumpCountQuestion.targetCard} decorative />
                </div>
              </div>
              <div class="trump-count-options trump-specific-options" aria-label="Trump specific answers">
                <button
                  aria-pressed={trumpCountSelected === true}
                  class:correct={trumpCountChecked && trumpCountQuestion.answer === true}
                  class:selected={trumpCountSelected === true}
                  class:wrong={trumpCountChecked && trumpCountSelected === true && trumpCountQuestion.answer !== true}
                  disabled={trumpCountChecked}
                  onclick={() => selectTrumpCountAnswer(true)}
                  type="button"
                >
                  Yes
                </button>
                <button
                  aria-pressed={trumpCountSelected === false}
                  class:correct={trumpCountChecked && trumpCountQuestion.answer === false}
                  class:selected={trumpCountSelected === false}
                  class:wrong={trumpCountChecked && trumpCountSelected === false && trumpCountQuestion.answer !== false}
                  disabled={trumpCountChecked}
                  onclick={() => selectTrumpCountAnswer(false)}
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          {/if}
          {/if}

          {#if trumpCountChecked}
          <p
            class:warning={trumpCountChecked && trumpCountSelected !== trumpCountQuestion?.answer}
            class="trump-count-feedback"
          >
            {trumpCountFeedback}
          </p>
          {/if}
        {/if}

        <div class="action-row">
          <button class="secondary-action" onclick={openCardCountingReturnTarget} type="button">Table</button>
          {#if trumpCountStage === "complete"}
            <button class="secondary-action" onclick={replayTrumpCountRound} type="button">Replay</button>
            <button class="primary-action" onclick={nextTrumpCountRound} type="button">Next hand</button>
          {:else if trumpCountStage === "reveal"}
            <button class="primary-action" onclick={advanceTrumpCountReveal} type="button">
              {trumpCountQuestion && trumpCountRevealIndex >= trumpCountQuestion.endTrick ? "Answer memory" : "Next trick"}
            </button>
          {:else if trumpCountChecked}
            <button class="primary-action" onclick={continueTrumpCountRound} type="button">
              {trumpCountQuestionIndex >= trumpCountRound.questions.length - 1 ? "Review round" : "Continue"}
            </button>
          {:else}
            <button class="primary-action" disabled={trumpCountSelected === null} onclick={checkTrumpCountAnswer} type="button">
              Check memory
            </button>
          {/if}
        </div>
      {/snippet}
    </TablePlaySurface>
  {:else if appView === "courtCount"}
    <TablePlaySurface
      flowLayout
      mode={realisticCourtRound.status === "complete" ? "result" : "play"}
      showTable={realisticCourtRound.status !== "complete"}
      ariaLabel="Three amigos memory trainer"
      title="Three amigos memory"
      eyebrow="Card Counting I"
      statusLabel="Memory"
      statusValue={`${courtCountClean} of ${courtCountAttempts}`}
      tableAriaLabel="Court card memory table"
      pendingBySeat={realisticCourtPendingBySeat}
      tableCards={realisticCourtTableCards}
      panelAriaLabel="Court card memory decision"
      onBack={openCardCountingReturnTarget}
      onSurfaceClick={realisticCourtRound.status === "review" ? continueRealisticCourtRound : undefined}
    >
      {#snippet summary()}
        {#if realisticCourtRound.status !== "complete"}
          <div class="trump-count-review" aria-label="Court card memory status">
            <span>Memory run</span>
            <strong>{realisticCourtRound.completedTricks.length} tricks complete</strong>
            <small>Track jacks, queens, and kings from memory.</small>
          </div>
        {/if}
      {/snippet}

      {#snippet panel()}
        {#if realisticCourtRound.status === "complete"}
          <div class="counting-break-card" aria-label="Court cards intermission">
            <div class="lesson-heading">
              <p class="eyebrow">Break</p>
              <h2>{realisticCourtBreakSummary.title}</h2>
            </div>

            <p class="result">{realisticCourtBreakSummary.summary}</p>

            <div class="counting-break-grid">
              <div>
                <span>{realisticCourtBreakSummary.firstLabel}</span>
                <strong>{realisticCourtBreakSummary.firstValue}</strong>
                <small>{realisticCourtBreakSummary.firstDetail}</small>
              </div>
              <div>
                <span>{realisticCourtBreakSummary.secondLabel}</span>
                <strong>{realisticCourtBreakSummary.secondValue}</strong>
                <small>{realisticCourtBreakSummary.secondDetail}</small>
              </div>
            </div>
          </div>
        {:else}
          <div class="lesson-heading">
            <p class="eyebrow">Jacks, queens, kings</p>
            <h2>{realisticCourtPromptTitle}</h2>
          </div>

        {#if courtCountChecked}
          <div class="trump-count-review" aria-label="Court card memory review">
            <span>Court cards seen</span>
            <strong>{realisticCourtSeenCount} court cards appeared</strong>
            <small>{realisticCourtQuestionAnswerText(realisticCourtRound.question)}</small>
            <div class="trump-review-cards">
              {#each realisticCourtSeenCards.filter(isCourtCard) as card}
                <div class="trump-seen-card court">
                  <CardFace {card} decorative />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <p class="result" aria-label="Court card memory challenge">
          {courtCountChecked ? "Review the court cards that had already left the table." : realisticCourtPromptBody}
        </p>

        {#if realisticCourtRound.status === "playing"}
          <CardChoiceHand
            cards={realisticCourtRound.hands.You}
            ariaLabel="Your court card memory hand"
            className="hand full-hand-cards realistic-trump-hand"
            cardClassName="card hand-card full-hand-card"
            getCardClasses={(card) => ({
              heart: card.suit === "H",
              illegal: !realisticCourtLegalCards.some((legalCard) => legalCard.id === card.id),
              legal: realisticCourtLegalCards.some((legalCard) => legalCard.id === card.id),
              selected: realisticCourtSelectedCardId === card.id
            })}
            isPressed={(card) => realisticCourtSelectedCardId === card.id}
            onSelect={selectRealisticCourtCard}
          />
        {/if}

        {#if realisticCourtRound.status === "question" && !courtCountChecked}
          {#if realisticCourtRound.question.kind === "count"}
            <div class="trump-count-options" aria-label="Court card count answers">
              {#each realisticCourtRound.question.options as option}
                <button
                  aria-pressed={courtCountSelected === option}
                  class:correct={courtCountChecked && option === realisticCourtRound.question.answer}
                  class:selected={courtCountSelected === option}
                  class:wrong={courtCountChecked && courtCountSelected === option && option !== realisticCourtRound.question.answer}
                  disabled={courtCountChecked}
                  onclick={() => selectCourtCountAnswer(option)}
                  type="button"
                >
                  {option}
                </button>
              {/each}
            </div>
          {:else}
            <div class="trump-specific-check">
              <div class="trump-target-card" aria-label={`Target court card ${formatCardLabel(realisticCourtRound.question.targetCard)}`}>
                <span>Target</span>
                <div class="trump-target-card-face">
                  <CardFace card={realisticCourtRound.question.targetCard} decorative />
                </div>
              </div>
              <div class="trump-count-options trump-specific-options" aria-label="Court card specific answers">
                <button
                  aria-pressed={courtCountSelected === true}
                  class:correct={courtCountChecked && realisticCourtRound.question.answer === true}
                  class:selected={courtCountSelected === true}
                  class:wrong={courtCountChecked && courtCountSelected === true && realisticCourtRound.question.answer !== true}
                  disabled={courtCountChecked}
                  onclick={() => selectCourtCountAnswer(true)}
                  type="button"
                >
                  Yes
                </button>
                <button
                  aria-pressed={courtCountSelected === false}
                  class:correct={courtCountChecked && realisticCourtRound.question.answer === false}
                  class:selected={courtCountSelected === false}
                  class:wrong={courtCountChecked && courtCountSelected === false && realisticCourtRound.question.answer !== false}
                  disabled={courtCountChecked}
                  onclick={() => selectCourtCountAnswer(false)}
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          {/if}

        {/if}

        {#if courtCountChecked}
          <p class:warning={courtCountSelected !== realisticCourtRound.question.answer} class="trump-count-feedback">
            {courtCountFeedback}
          </p>
        {/if}
        {/if}

        <div class="action-row">
          <button class="secondary-action" onclick={openCardCountingReturnTarget} type="button">Table</button>
          {#if realisticCourtRound.status === "playing"}
            <button
              class="primary-action"
              disabled={
                !realisticCourtSelectedCard ||
                !realisticCourtLegalCards.some((card) => card.id === realisticCourtSelectedCard.id)
              }
              onclick={playRealisticCourtCard}
              type="button"
            >
              Play card
            </button>
          {:else if realisticCourtRound.status === "review"}
            <button class="primary-action" onclick={continueRealisticCourtRound} type="button">
              {realisticCourtReviewActionLabel(realisticCourtRound)}
            </button>
          {:else if realisticCourtRound.status === "question" && courtCountChecked}
            <button class="primary-action" onclick={continueRealisticCourtAfterQuestion} type="button">Continue hand</button>
          {:else if realisticCourtRound.status === "complete"}
            <button class="secondary-action" onclick={replayCourtCountRound} type="button">Replay</button>
            <button class="primary-action" onclick={nextCourtCountRound} type="button">Next hand</button>
          {:else}
            <button
              class="primary-action"
              disabled={courtCountSelected === null}
              onclick={checkCourtCountAnswer}
              type="button"
            >
              Check memory
            </button>
          {/if}
        </div>
      {/snippet}
    </TablePlaySurface>
  {:else if appView === "barbuContracts"}
    <header class="topbar" aria-label="Barbu contracts">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Core game</p>
        <h1>Barbu contracts</h1>
      </div>
      <div class="contract-status">
        <span>Core roster</span>
        <strong>{guidedLessons.length} contracts</strong>
      </div>
    </header>

    <section class="contract-roster-screen" aria-label="Core Barbu contracts">
      <div class="contract-roster-intro">
        <p class="eyebrow">Contract map</p>
        <h2>Each contract changes what a good card means.</h2>
        <p>
          Use this screen when you want to jump into one contract directly. The main Learn tab keeps the ordered
          path separate so the table does not become a long list of controls.
        </p>
      </div>

      <div class="contract-list">
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
          <span>Hearts Trumps</span>
          <strong>Hearts beat the led suit</strong>
        </button>
        <button class="practice-choice" onclick={() => void startDominoPracticeHand()} type="button">
          <span>Domino</span>
          <strong>Build suits from sevens</strong>
        </button>
      </div>
    </section>
  {:else if appView === "reference"}
    <header class="topbar" aria-label={`${activeReference.title} reference`}>
      <button class="back-button" onclick={openActiveGameTable} type="button">Table</button>
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
          <p class="eyebrow">{activeReferenceIsBarbu ? "Core game" : "Current game"}</p>
          <h2>{activeReferenceIsBarbu ? "Barbu contracts" : `${activeReference.title} rules`}</h2>
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
          <p class="eyebrow">{activeReferenceIsBarbu ? "Core roadmap" : "Rule boundary"}</p>
          <h2>{activeReferenceIsBarbu ? "Contract status" : "Current and later rules"}</h2>
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
        <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
        {#if activeReferenceIsBarbu}
          <button class="primary-action" onclick={continueCourse} type="button">Continue path</button>
        {:else}
          <button class="primary-action" onclick={openActiveGameTable} type="button">Back to {activeReference.title} table</button>
        {/if}
      </div>
    </section>
  {:else if appView === "courseContent"}
    <CourseLesson course={activeCourse} stage={activeCourseStage} onBack={openActiveCourseTable} onContinue={continueCourseContent}>
      {#snippet customExample()}
        <div class="domino-layout" aria-label={activeCourse.example.ariaLabel}>
          {#each buildDominoDrillLayout(activeCourse.example.tableCards) as lane, index}
            <div><span>{dominoSuitLabel(index)}</span><strong>{dominoLaneText(lane, dominoStartRank(dominoHand))}</strong></div>
          {/each}
        </div>
      {/snippet}
    </CourseLesson>
  {:else if appView === "barbuPlay"}
    <BarbuPlay feature={barbuFeature} onBack={openBarbuTable} onStandaloneHand={contract => void startFullHand(contract)} />
  {:else if appView === "fullHand"}
    {#if fullHand && !fullHandCardCountingActive}
      <BarbuHandView hand={fullHand} reviewCount={fullHandReviewTrickCount} selectedCardId={fullHandSelectedCardId} error={fullHandError}
        onBack={openFullHandTableTarget} onSelect={id => { const card = fullHand?.playerHand.find(card => card.id === id); if (card) void selectFullHandCard(card); }}
        onPlay={() => void playFullHandCard()} onNextTrick={continueFullHandReview} onNextHand={startNextFullHand} onReplay={replayFullHand} />
    {:else if fullHand}
      <TablePlaySurface
        mode={fullHand.status === "complete" ? "result" : "play"}
        ariaLabel={`${fullHand.contract} full hand`}
        flowLayout
        title={fullHandCardCountingTitle}
        eyebrow={"Card Counting I"}
        statusLabel={fullHandCardCountingStatusLabel}
        statusValue={`${fullHand.completedTricks.length} / 13 tricks`}
        tableAriaLabel={`${fullHand.contract} hand table`}
        pendingBySeat={fullHandPendingBySeat}
        showTable={
          !(fullHandIsHeartsGame && fullHand.status === "complete") &&
          !(fullHandIsPartnershipGame && fullHand.status === "complete")
        }
        tableCards={fullHandVisibleTableCards}
        panelAriaLabel={`${fullHand.contract} hand decision`}
        onBack={openFullHandTableTarget}
        onSurfaceClick={fullHandIsReviewingTrick ? continueFullHandReview : undefined}
      >

        {#snippet summary()}
          {#if !(fullHandIsPartnershipGame && fullHand.status === "complete")}
            <div
              class="full-hand-summary grouped-play-summary"
              aria-label={`${fullHand.contract} hand score`}
            >
              <div
                  class:no-last-two={fullHand.contract === "No Last Two"}
                  class:whist-hand-summary={fullHandShowWhistMatchSummary}
                  class="full-hand-summary-row current-hand"
                  aria-label="Current hand"
                >
                  <span class="summary-row-label">Current hand</span>
                  <div>
                    <span>{fullHandIsPartnershipGame ? "Your side" : fullHandContractMeta.playerValueLabel}</span>
                    <strong>{fullHandIsPartnershipGame ? whistPartnershipTricks.playerSide : fullHand.playerPenalty}</strong>
                  </div>
                  <div>
                    <span>{fullHandIsPartnershipGame ? "Opponents" : fullHandPenaltyPlayedLabel}</span>
                    <strong>{fullHandIsPartnershipGame ? whistPartnershipTricks.opponentSide : `${fullHand.totalPenalty} / ${fullHandPenaltyTotal}`}</strong>
                  </div>
                  <div>
                    <span>Tricks</span>
                    <strong>{fullHand.completedTricks.length} / 13</strong>
                  </div>
                  {#if fullHandShowWhistMatchSummary}
                    <div>
                      <span>{whistOddProgressLabel}</span>
                      <strong>{whistOddProgressValue}</strong>
                    </div>
                  {/if}
                  {#if fullHand.contract === "No Last Two"}
                    <div>
                      <span>{fullHandNoLastTwoPhaseLabel}</span>
                      <strong>{fullHandNoLastTwoPhaseValue}</strong>
                    </div>
                  {/if}
                </div>
              {#if fullHandIsHeartsGame}
                <div class="full-hand-summary-row table-score" aria-label="Hearts table score">
                  <span class="summary-row-label">{heartsScorecardMeta.label}</span>
                  {#each scoreSeats as seat}
                    <div>
                      <span>{scoreSeatRunLabel(seat)} penalty</span>
                      <strong>{heartsVisibleScores[seat]}</strong>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if fullHandShowWhistMatchSummary}
                <div class="full-hand-summary-row table-score" aria-label={`${fullHand.contract} match score`}>
                  <span class="summary-row-label">Game to {partnershipMatchTarget}</span>
                  <div>
                    <span>You + Barbu</span>
                    <strong>{partnershipVisibleMatchScores.playerSide}</strong>
                  </div>
                  <div>
                    <span>Left + Right</span>
                    <strong>{partnershipVisibleMatchScores.opponentSide}</strong>
                  </div>
                  <div>
                    <span>Hands</span>
                    <strong>{partnershipVisibleHandCount}</strong>
                  </div>
                  {#if fullHandIsWhistGame && fullHand.whistDealer !== undefined}
                    <div>
                      <span>Dealer</span>
                      <strong aria-label="Whist dealer">{["Barbu", "Right", "You", "Left"][fullHand.whistDealer]}{#if whistTurnedCardVisible && fullHand.whistTurnedTrump} <b class="whist-turned-card" aria-label="Turned trump">{formatCardLabel(fullHand.whistTurnedTrump)}</b>{/if}</strong>
                    </div>
                  {/if}
                </div>
              {/if}

            </div>
          {/if}
        {/snippet}

        {#snippet panel()}
          {#if fullHand.status === "complete"}
            <div class="counting-break-card" aria-label={`${fullHandCardCountingTitle} intermission`}>
                <div class="lesson-heading">
                  <p class="eyebrow">Break</p>
                  <h2>{fullHandCardCountingBreakSummary.title}</h2>
                </div>

                <p class="result">{fullHandCardCountingBreakSummary.summary}</p>

                <div class="counting-break-grid">
                  <div>
                    <span>{fullHandCardCountingBreakSummary.firstLabel}</span>
                    <strong>{fullHandCardCountingBreakSummary.firstValue}</strong>
                    <small>{fullHandCardCountingBreakSummary.firstDetail}</small>
                  </div>
                  <div>
                    <span>{fullHandCardCountingBreakSummary.secondLabel}</span>
                    <strong>{fullHandCardCountingBreakSummary.secondValue}</strong>
                    <small>{fullHandCardCountingBreakSummary.secondDetail}</small>
                  </div>
                </div>
              </div>
          {:else if fullHandIsReviewingTrick}
            {#if fullHandCardCountingPromptActive && fullHandCardCountingQuestion}
              <section class:answered={fullHandCardCountingChecked} class="memory-check-card">
                <div class="memory-check-prompt">
                  <span>Memory check {fullHandCardCountingQuestionNumber} of {fullHandCardCountingCheckpoints.length}</span>
                  <strong>{fullHandCardCountingQuestionTitle}</strong>
                  <p>{fullHandCardCountingQuestion.prompt}</p>
                </div>

                {#if fullHandCardCountingQuestion.kind === "specific" || fullHandCardCountingQuestion.kind === "trump_specific" || fullHandCardCountingQuestion.kind === "boss_card"}
                  <div class:answered={fullHandCardCountingChecked} class="trump-specific-check">
                    <div class="trump-target-card" aria-label={`${fullHandCardCountingTargetLabel} ${formatCardLabel(fullHandCardCountingQuestion.targetCard)}`}>
                      <span>Target</span>
                      <div class="trump-target-card-face">
                        <CardFace card={fullHandCardCountingQuestion.targetCard} decorative />
                      </div>
                    </div>
                    <div class="trump-count-options trump-specific-options" aria-label={fullHandCardCountingAnswerOptionsLabel}>
                      <button
                        aria-pressed={fullHandCardCountingAnswer === true}
                        class:correct={fullHandCardCountingChecked && fullHandCardCountingQuestion.answer === true}
                        class:selected={fullHandCardCountingAnswer === true}
                        class:wrong={fullHandCardCountingChecked && fullHandCardCountingAnswer === true && fullHandCardCountingQuestion.answer !== true}
                        disabled={fullHandCardCountingChecked}
                        onclick={() => selectFullHandCardCountingAnswer(true)}
                        type="button"
                      >
                        Yes
                      </button>
                      <button
                        aria-pressed={fullHandCardCountingAnswer === false}
                        class:correct={fullHandCardCountingChecked && fullHandCardCountingQuestion.answer === false}
                        class:selected={fullHandCardCountingAnswer === false}
                        class:wrong={fullHandCardCountingChecked && fullHandCardCountingAnswer === false && fullHandCardCountingQuestion.answer !== false}
                        disabled={fullHandCardCountingChecked}
                        onclick={() => selectFullHandCardCountingAnswer(false)}
                        type="button"
                      >
                        No
                      </button>
                    </div>
                  </div>
                {:else if fullHandCardCountingQuestion.kind === "count" || fullHandCardCountingQuestion.kind === "trump_count"}
                  <div class="trump-count-options" aria-label={fullHandCardCountingCountOptionsLabel}>
                    {#each fullHandCardCountingQuestion.options as option}
                      <button
                        aria-pressed={fullHandCardCountingAnswer === option}
                        class:correct={fullHandCardCountingChecked && option === fullHandCardCountingQuestion.answer}
                        class:selected={fullHandCardCountingAnswer === option}
                        class:wrong={fullHandCardCountingChecked && fullHandCardCountingAnswer === option && option !== fullHandCardCountingQuestion.answer}
                        disabled={fullHandCardCountingChecked}
                        onclick={() => selectFullHandCardCountingAnswer(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    {/each}
                  </div>
                {:else}
                  <div class="trump-count-options memory-answer-options" aria-label="Void spotter options">
                    {#each ["Left", "Right", "Tutor"] as seat}
                      <button
                        aria-pressed={fullHandCardCountingAnswer === seat}
                        class:correct={fullHandCardCountingChecked && fullHandCardCountingQuestion.answer === seat}
                        class:selected={fullHandCardCountingAnswer === seat}
                        class:wrong={fullHandCardCountingChecked && fullHandCardCountingAnswer === seat && fullHandCardCountingQuestion.answer !== seat}
                        disabled={fullHandCardCountingChecked}
                        onclick={() => selectFullHandCardCountingAnswer(seat as Seat)}
                        type="button"
                      >
                        <strong>{seat === "Tutor" ? "Barbu" : seat}</strong>
                      </button>
                    {/each}
                  </div>
                {/if}

                <p class:warning={fullHandCardCountingChecked && fullHandCardCountingAnswer !== fullHandCardCountingQuestion.answer} class="outcome">
                  {fullHandCardCountingFeedback}
                </p>
                {#if fullHandCardCountingChecked}
                  <div class="trump-review-cards" aria-label={fullHandCardCountingSeenLabel}>
                    {#each fullHandCardCountingReviewCards as card}
                      <CardFace {card} />
                    {/each}
                  </div>
                {/if}
              </section>
            {:else}
              <div class="lesson-heading">
                <p class="eyebrow">Trick complete</p>
                <h2>Read the table</h2>
              </div>

              <p class:warning={fullHandTrickIsWarning(fullHandReviewTrick)} class="outcome">
                {fullHandReviewFeedback}
              </p>
                <p class="explanation">
                  {fullHandIsPartnershipGame
                    ? "Check whether the trick stayed with your partnership, whether trump changed the winner, and who leads next."
                    : fullHand.contract === "No Last Two"
                    ? "Check the trick number first. Tap the table or press Next trick when you are ready."
                    : "Left's card is on the table. Tap the table or press Next trick when you are ready."}
                </p>
            {/if}
          {:else}
            <div>
              <ExerciseFeedback
                eyebrow="Your turn"
                title="Choose your card"
                result={fullHand.prompt}
                error={fullHandError}
              />

            </div>

            <CardChoiceHand
                cards={fullHand.playerHand}
                ariaLabel={`Your ${fullHand.contract} hand`}
                className="hand full-hand-cards"
                cardClassName="card hand-card full-hand-card"
                getCardClasses={fullHandCardClasses}
                isPressed={(card) => fullHandSelectedCardId === card.id}
                onSelect={(card) => void selectFullHandCard(card)}
              />
          {/if}

          <div class="action-row">
            {#if fullHand.status === "complete"}
              <button class="secondary-action" onclick={openFullHandTableTarget} type="button">Table</button>
              <button class="secondary-action" onclick={replayFullHandCardCounting} type="button">Replay</button>
                <button class="primary-action" onclick={nextFullHandCardCounting} type="button">Next hand</button>
            {:else if fullHandIsReviewingTrick}
              <button class="secondary-action" onclick={openFullHandTableTarget} type="button">Table</button>
              {#if fullHandCardCountingPromptActive}
                <button
                  class="primary-action"
                  disabled={fullHandCardCountingAnswer === null}
                  onclick={fullHandCardCountingChecked ? continueFullHandCardCountingAfterQuestion : checkFullHandCardCountingAnswer}
                  type="button"
                >
                  {fullHandCardCountingChecked ? "Next trick" : "Check memory"}
                </button>
              {:else}
                <button class="primary-action" onclick={continueFullHandReview} type="button">
                  Next trick
                </button>
              {/if}
            {:else}
              <button class="secondary-action" onclick={openFullHandTableTarget} type="button">Table</button>
              <button
                class="primary-action"
                disabled={(!fullHandSelectedCard || !fullHandLegalCardIds.has(fullHandSelectedCard.id))}
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
  {:else if appView === "dominoHand"}
    {#if dominoHand}
      <DominoHandView {dominoHand} {dominoSelectedCardId} {dominoError} {dominoLastMoveReason}
        onBack={openBarbuTable} onSelect={id => { const card = dominoHand?.playerHand.find(card => card.id === id); if (card) void selectDominoCard(card); }}
        onFocus={id => { dominoSelectedCardId = id; }} onPlace={placeSelectedOrDefaultDominoCard} onPass={passDomino}
        onNextHand={startNextDominoHand} onReplay={replayDominoHand} />
    {/if}
  {:else if appView === "drill"}
    {#snippet dominoDrillTable()}
      <div class="domino-layout" aria-label="Domino drill layout">
        {#each drillDominoLayout as lane, index}
          <div><span>{dominoSuitLabel(index)}</span><strong>{dominoLaneText(lane)}</strong></div>
        {/each}
      </div>
    {/snippet}
    <DrillScreen step={currentDrill} selectedCardId={drillSelectedCardId} checkedCardId={drillCheckedCardId}
      results={drillResults} total={activeDrillSteps.length} index={drillIndex} title={drillScreenTitle}
      eyebrow={drillSetTitle}
      topic={activeDrillFocusContract}
      customTable={currentDrillIsDomino ? dominoDrillTable : undefined}
      onBack={openActiveGameTable} onSelect={selectDrillCard} onCheck={checkDrillAnswer}
      onNext={handleDrillPrimaryAction} onFinish={finishDrill} />
  {:else if appView === "drillResult"}
    <DrillResultScreen title={drillSetTitle} results={drillResults} message={drillResultMessage}
      attempts={recentPlayBarbuAttempts} onBack={openActiveGameTable}>
      {#snippet actions()}
          <button class="primary-action" onclick={() => void replayWeakContract()} type="button">
              Replay {drillLoopFocus}
            </button>
            <button class="secondary-action" onclick={() => void startDailyDrill()} type="button">Try again</button>
      {/snippet}
      {#snippet footer()}
        {#if drillResultIsBarbuPractice}
          <button class="primary-action" onclick={openActiveGameTable} type="button">Back to Learn</button>
        {:else}
          <button class="primary-action" onclick={continueCourse} type="button">Continue path</button>
        {/if}
      {/snippet}
    </DrillResultScreen>
  {:else if appView === "pathReview"}
    <header class="topbar" aria-label="Barbu review">
      <button class="back-button" onclick={openBarbuLearnTable} type="button">Table</button>
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

      {#if reviewReplayContract}
        <div class="drill-loop-panel review-focus-panel" aria-label="Review focus">
          <div class="drill-loop-copy">
            <p class="eyebrow">Targeted repetition</p>
            <h2>{reviewReplayContract}</h2>
            <strong>Replay the pattern that cost the most attention.</strong>
            <p>{reviewAdvice}</p>
          </div>
          {#if reviewFocusSummary}
            <div class="drill-loop-detail">
              <span>Last result</span>
              <strong>{reviewFocusSummary.clean} / {reviewFocusSummary.total} clean</strong>
              <small>{outcomeLabels[reviewFocusSummary.outcome]}</small>
            </div>
          {/if}
          <div class="drill-loop-actions">
            <button class="primary-action" onclick={() => void replayReviewWeakContract()} type="button">
              Replay {reviewReplayContract}
            </button>
          </div>
        </div>
      {/if}

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
            <strong>No decisions yet</strong>
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
        <button class="secondary-action" onclick={openBarbuLearnTable} type="button">Table</button>
        <button class="secondary-action" onclick={() => void replayReviewWeakContract()} type="button">
          Replay {reviewReplayContract || "table"}
        </button>
        <button class="secondary-action" onclick={() => void startDailyDrill()} type="button">Mixed contract review</button>
        <button class="primary-action" onclick={finishPathReview} type="button">Finish review</button>
      </div>
    </section>
  {:else}
    <TablePlaySurface
      flowLayout
      ariaLabel="Guided trick"
      surfaceClassName={currentLessonIsDomino ? "learning-play-surface domino-play-surface" : "learning-play-surface"}
      title={gameLabel}
      eyebrow={contractLabel}
      statusLabel="Decision"
      statusValue={`${trickIndex + 1} of ${activeTricks.length}`}
      tableAriaLabel="Card table"
      panelAriaLabel="Current lesson"
      pendingBySeat={currentTrick.pendingBySeat}
      tableCards={completedTable}
      useCustomTable={currentLessonIsDomino}
      onBack={openBarbuLearnTable}
    >
      {#snippet table()}
      {#if currentLessonIsDomino}
        <div class="domino-layout" aria-label="Domino lesson layout">
          {#each completedDominoLessonLayout as lane, index}
            <div>
              <span>{dominoSuitLabel(index)}</span>
              <strong>{dominoLaneText(lane)}</strong>
            </div>
          {/each}
        </div>
      {/if}
      {/snippet}
      {#snippet panel()}
        <ExerciseFeedback
          eyebrow={contractLabel}
          title={currentTrick.title}
          result={resultText}
          explanation={explanation}
          outcome={lessonOutcome}
          warning={lessonOutcome === "Illegal" || lessonOutcome === "Risky" || lessonOutcome === "Penalty"}
        />

        <CardChoiceHand
          cards={hand}
          ariaLabel="Your hand"
          className="hand full-hand-cards"
          cardClassName="card hand-card full-hand-card"
          getCardClasses={cardClasses}
          isPressed={(card) => selectedCardId === card.id}
          onSelect={selectCard}
        />

        <div class="action-row">
          {#if playedCard}
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
      {/snippet}
    </TablePlaySurface>
  {/if}
</main>
