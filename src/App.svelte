<script lang="ts">
  import { tick } from "svelte";
  import { bridgeBiddingPracticeSteps, bridgeDeclarerDrillPool, bridgeDefenseDrillPool } from "./bridgePractice";
  import { bridgeHighCardPoints, bridgeSuitCount, explainBridgeCall } from "./bridgeBidding";
  import { bridgeBidOptions, bridgeSideForSeat, bridgeAuctionStatus, bridgeLegalCallOptions,
    bridgeCallLabel, bridgeCallLongLabel, bridgeFinalizeContract, bridgeSuggestedCallForHand, type BridgeBidOption,
    type BridgeCallOption } from "./domain/bridgeAuction";
  import { bridgeDeclarerTrickCounts, bridgeHandResultFor, bridgeScoreTotalsWith,
    type BridgeHandResult, type BridgeScoreState } from "./domain/bridgeScoring";
  import { createBridgeSession, transitionBridgeSession, type BridgeSession } from "./domain/bridgeSession";
  import { createBridgeSaveStore, saveBridgeSession, restoreBridgeSession, type SavedBridgeRun } from "./persistence/bridgeSave";
  import GameResult from "./GameResult.svelte";
  import { spadesMatchComplete, spadesMatchTarget, spadesSideBid, spadesHandResultFor, addSpadesMatchResult,
    spadesPlayerSideSeats, spadesOpponentSideSeats, type SpadesHandResult, type SpadesScoreState } from "./spadesScoring";
  import { defaultSpadesBidState, suggestedSpadesBidsForHand, type SpadesBidState } from "./domain/spadesBidding";
  import { createSpadesSession, transitionSpadesSession, type SpadesSession } from "./domain/spadesSession";
  import { createSpadesSaveStore, saveSpadesSession, restoreSpadesSession, type SavedSpadesRun } from "./persistence/spadesSave";
  import { spadesFollowSuitDrillPool, spadesTrumpOrDiscardDrillPool, spadesBidBooksDrillPool, spadesAvoidBagsDrillPool } from "./spadesLessons";
  import { whistFollowSuitDrillPool, whistTrumpOrDiscardDrillPool, whistThirdHandHighDrillPool, whistReturnPartnerSuitDrillPool, whistOpeningLeadLessonPool, whistOddTrickDrillPool } from "./whistLessons";
  import { invoke, isTauri } from "@tauri-apps/api/core";
  import { typescriptHandEngine } from "./domain/handEngine";
  import { generateHeartsPracticeSet, generateHeartsPassPractice, evaluateHeartsPass, heartsPracticeTopics, type HeartsPracticeFocus } from "./domain/heartsPractice";
  import { createHeartsSession, transitionHeartsSession, heartsSessionSettlement, heartsMoonShooter, heartsScoredSeatPenalties,
    heartsHandPenaltyTotal, heartsMatchTarget, type HeartsHandResult, type HeartsPassDirection, type HeartsSession } from "./domain/heartsSession";
  import { addSeatPenalties, emptySeatPenalties, seatPenaltiesForTricks } from "./domain/trickTakingScore";
  import { createHeartsSaveStore, restoreHeartsSession, saveHeartsSession, savedHeartsRunSummary, type SavedHeartsRun } from "./persistence/heartsSave";
  import { createWhistSession, emptyWhistScore, transitionWhistSession, whistSessionSettlement, type WhistSession } from "./domain/whistSession";
  import { createWhistSaveStore, restoreWhistSession, saveWhistSession, savedWhistRunSummary, type SavedWhistRun } from "./persistence/whistSave";
  import { createBarbuSession, transitionBarbuSession, barbuSessionComplete, barbuSeatTotals, dominoSeatScores,
    type BarbuSession, type BarbuSessionEvent, type BarbuHandResult as FullHandRunResult } from "./domain/barbuSession";
  import { createBarbuSaveStore, saveBarbuSession, restoreBarbuSession, savedPlayBarbuRunSummary,
    type SavedPlayBarbuRun } from "./persistence/barbuSave";
  import { dominoHandEngine, type DominoAction } from "./domain/dominoHand";
  import { generateBarbuPracticeSet } from "./domain/barbuPractice";
  import BridgeTable from "./BridgeTable.svelte";
  import CardChoiceHand from "./CardChoiceHand.svelte";
  import CardFace from "./CardFace.svelte";
  import CardTable from "./CardTable.svelte";
  import { compareCardsForDisplay, displaySuitSequence } from "./cardOrdering";
  import { formatCardLabel, formatCardList } from "./cardDisplay";
  import ExerciseFeedback from "./ExerciseFeedback.svelte";
  import "./games";
  import { registry } from "./gameRegistry";
  import GameTableShell from "./GameTableShell.svelte";
  import LearnPanel from "./LearnPanel.svelte";
  import PlayTabPanel from "./PlayTabPanel.svelte";
  import PracticePanel from "./PracticePanel.svelte";
  import ProTabPanel from "./ProTabPanel.svelte";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import { fullHandContracts } from "./contractRegistry";
  import { contractRunScore, contractScoreMeta, formatContractValue } from "./contractScoring";
  import { courseCatalog, courseTargetsGuidedLesson, type CourseContent, type CourseStage } from "./courseContent";
  import { guidedLessons } from "./lessons/catalog";
  import { referenceCatalog } from "./referenceCatalog";
  import { whistOddProgress, whistResultCopy, type WhistSessionMode } from "./whistScoring";
  import type { BarbuLearnPathAction } from "./games/barbu";
  import type { BridgeLearnPathAction, BridgePracticeAction } from "./games/bridge";
  import type { HeartsLearnPathAction } from "./games/hearts";
  import type { SpadesLearnPathAction, SpadesPracticeAction } from "./games/spades";
  import type { WhistLearnPathAction, WhistPracticeAction } from "./games/whist";
  import {
    getCatalogCategories,
    type ActiveGameTable,
    type CatalogGameId,
    type LearnPathStep,
    type TableTabId
  } from "./tableFactory";
  import type {
    Card,
    CompletedHandTrick,
    DominoHandState,
    FullHandContract,
    FullHandState,
    GeneratedPracticeScenario,
    GuidedCardOutcome,
    GuidedTrick,
    BridgeAuctionCall,
    BridgeContractState,
    BridgeVulnerability,
    HeartsPassScenario,
    PracticeReason,
    Seat,
    Suit,
    TableCard
  } from "./lessonTypes";
  import type { GameReference } from "./referenceCatalog";

  type AppView =
    | "catalog"
    | "barbuTable"
    | "heartsTable"
    | "whistTable"
    | "cardCountingTable"
    | "barbuContracts"
    | "practiceChooser"
    | "reference"
    | "courseContent"
    | "heartsLearnObject"
    | "whistLearnObject"
    | "lesson"
    | "drill"
    | "drillResult"
    | "runContractIntro"
    | "bridgeAuction"
    | "bridgeBiddingPractice"
    | "heartsPass"
    | "heartsPassPractice"
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

  type CardCountingLearnStep = {
    eyebrow: string;
    title: string;
    summary: string;
  };

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

  type DrillStep = {
    scenarioId?: string;
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

  type BridgeBiddingPracticeResult = {
    id: string;
    selectedCall: BridgeCallOption;
    correctCall: BridgeCallOption;
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

  type DrillLoopInsight = ReviewInsight & {
    heading: string;
    streakText: string;
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
  type HeartsLearnPathStep = LearnPathStep<HeartsLearnPathAction>;
  type WhistLearnPathStep = LearnPathStep<WhistLearnPathAction>;
  type SpadesLearnPathStep = LearnPathStep<SpadesLearnPathAction>;
  type BridgeLearnPathStep = LearnPathStep<BridgeLearnPathAction>;

  type RunStanding = {
    rank: number;
    seat: Seat;
    score: number;
  };

  type RunContractIntro = {
    title: string;
    role: string;
    surface: string;
    target: string;
    reason: string;
    habit: string;
  };

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

  type WhistOpeningLeadPracticeDeal = {
    id: string;
    trumpSuit: Suit;
    focusSuit: Suit;
    recommendedLead: string;
    explanation: string;
    prompt: string;
    hands: Card[][];
  };

  const whistOpeningLeadPracticeMaxRounds = 3;

  const catalogCategories = getCatalogCategories();
  const privacyPolicyUrl = "https://martingull.github.io/barbu/privacy-policy.html";
  let privacyPolicyError = "";
  let openingPrivacyPolicy = false;
  const barbuUi = registry.get("barbu")!;
  const heartsUi = registry.get("hearts")!;
  const whistUi = registry.get("whist")!;
  const spadesUi = registry.get<SpadesLearnPathAction | SpadesPracticeAction>("spades")!;
  const bridgeUi = registry.get<BridgeLearnPathAction | BridgePracticeAction>("bridge")!;

  const progressStorageKey = "barbu.courseProgress.v1";
  const practiceSeedStorageKey = "barbu.practiceSeed.v1";
  const drillPatternMemoryStorageKey = "barbu.drillPatternMemory.v1";
  const playBarbuHistoryStorageKey = "barbu.playHistory.v1";
  const barbuSaveStore = createBarbuSaveStore(() => typeof localStorage === "undefined" ? undefined : localStorage);
  const heartsSaveStore = createHeartsSaveStore(() => typeof localStorage === "undefined" ? undefined : localStorage);
  const whistSaveStore = createWhistSaveStore(() => typeof localStorage === "undefined" ? undefined : localStorage);
  const spadesSaveStore = createSpadesSaveStore(() => typeof localStorage === "undefined" ? undefined : localStorage);
  const bridgeSaveStore = createBridgeSaveStore(() => typeof localStorage === "undefined" ? undefined : localStorage);
  const maxStoredDrillPatterns = 6;
  const maxStoredPlayBarbuAttempts = 8;
  const scoreSeats: Seat[] = ["You", "Tutor", "Left", "Right"];
  const spadesBidSeats: Seat[] = ["You", "Tutor", "Left", "Right"];

  const countingTrickSeats: Seat[] = ["Tutor", "Right", "You", "Left"];
  const realisticTrumpTotalTricks = 13;
  const realisticTrumpCheckpoints = [3, 7, 11];
  const cardCountingLearnSteps: CardCountingLearnStep[] = [
    {
      eyebrow: "1 Habit",
      title: "Count one suit",
      summary: "Start with Black Lady: play a real hand and keep the hearts count alive between tricks."
    },
    {
      eyebrow: "2 Memory",
      title: "Track high cards",
      summary: "Court cards decide many tricks, so the next habit is remembering which high cards have left."
    },
    {
      eyebrow: "3 Transfer",
      title: "Read danger",
      summary: "Use the same memory habit in Barbu contracts, Hearts, Whist, and later Bridge."
    }
  ];
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
  const heartsPassPracticeTotalSteps = 2;
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
  const dominoOrderScores = [45, 20, 5, -5];
  const whistMatchTarget = 5;
  const seatByPlayerIndex: Record<number, Seat> = {
    0: "Tutor",
    1: "Right",
    2: "You",
    3: "Left"
  };
  const playerIndexBySeat: Record<Seat, number> = {
    Tutor: 0,
    Right: 1,
    You: 2,
    Left: 3
  };
  const runContractIntros: Record<FullHandContract, RunContractIntro> = {
    Hearts: {
      title: "Hearts and Queen of Spades are dangerous.",
      role: "Starter Hearts hand",
      surface: "Trick-taking hand",
      target: "Avoid penalty tricks.",
      reason: "Hearts rotates the pass, opens with 2C, and keeps hearts back until they are broken.",
      habit: "Track hearts and the queen of spades before deciding whether to win."
    },
    "No Hearts": {
      title: "Hearts are cargo. Do not bring them home.",
      role: "Opening avoidance contract",
      surface: "Trick-taking hand",
      target: "Avoid winning heart tricks.",
      reason: "Barbu starts with the simplest penalty shape: dangerous cards inside ordinary tricks.",
      habit: "Locate the trick winner before worrying about the heart."
    },
    "No Queens": {
      title: "Queens punish the player who captures them.",
      role: "Penalty-card contract",
      surface: "Trick-taking hand",
      target: "Avoid queen tricks.",
      reason: "This contract raises the pressure because one high card can pull a queen into your score.",
      habit: "Duck under the current winner when a queen is loaded."
    },
    "King of Hearts": {
      title: "One card carries the contract.",
      role: "Single-danger contract",
      surface: "Trick-taking hand",
      target: "Avoid capturing KH.",
      reason: "Barbu now narrows the danger to one card, so tracking matters more than fear of the whole suit.",
      habit: "Find KH, then ask whether your card wins its trick."
    },
    "No Last Two": {
      title: "The end of the hand is dangerous.",
      role: "Timing contract",
      surface: "Trick-taking hand",
      target: "Avoid tricks 12 and 13.",
      reason: "Early tricks are setup. Barbu wants to see whether you can keep a late escape.",
      habit: "Count the hand before spending a low card."
    },
    "No Tricks": {
      title: "Every trick you win costs you.",
      role: "Pure avoidance contract",
      surface: "Trick-taking hand",
      target: "Avoid taking control.",
      reason: "This contract turns the whole hand into ducking practice.",
      habit: "Play below the current winner whenever the led suit allows it."
    },
    "Hearts Trumps": {
      title: "Hearts are trumps.",
      role: "Positive trick contract",
      surface: "Trump hand",
      target: "Win tricks with heart control.",
      reason: "Barbu flips the table: hearts now outrank the led suit and tricks are worth points.",
      habit: "Track whether a heart can cut the trick before you spend a high card."
    },
    Domino: {
      title: "Build the layout from sevens.",
      role: "Layout contract",
      surface: "Domino layout",
      target: "Go out before the table.",
      reason: "Barbu changes the surface: no tricks, just legal adjacent placements in each suit.",
      habit: "Open a suit with a seven, then extend the low or high end when you can."
    }
  };
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
  let drillSetTitle = "Quick drill";
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
  let activeWhistPracticeFocus: WhistPracticeAction = "follow";
  let activeSpadesPracticeFocus: SpadesPracticeAction = "follow";
  let activeBridgePracticeFocus: BridgePracticeAction = "declarer";
  let bridgeBiddingPracticeIndex = 0;
  let bridgeBiddingSelectedCall: BridgeCallOption = "Pass";
  let bridgeBiddingCheckedCall: BridgeCallOption | "" = "";
  let bridgeBiddingPracticeResults: BridgeBiddingPracticeResult[] = [];
  let whistFullHandSource: "play" | "practice" | "card-counting" = "play";
  let whistOpeningLeadPracticeRound = 0;
  let activeCardCountingTab: CardCountingTabId = "play";
  let cardCountingReturnTarget: CardCountingReturnTarget = "barbu";
  let activeGameTable: ActiveGameTable = "barbu";
  let completedPathSteps: Record<string, boolean> = loadCourseProgress();
  let playBarbuHistory: PlayBarbuAttempt[] = loadPlayBarbuHistory();

  let savedPlayBarbuRun: SavedPlayBarbuRun | null = barbuSaveStore.load();
  let barbuSession: BarbuSession | null = null;
  let barbuSaveError = "";
  let savedHeartsRun: SavedHeartsRun | null = heartsSaveStore.load();
  let savedWhistRun: SavedWhistRun | null = whistSaveStore.load();
  let savedSpadesRun: SavedSpadesRun | null = spadesSaveStore.load();
  let spadesSession: SpadesSession | null = null;
  let spadesDealPending = false;
  let savedBridgeRun = bridgeSaveStore.load();
  let bridgeSession: BridgeSession | null = null;
  let bridgeDealPending = false;
  let heartsSession: HeartsSession | null = null;
  let heartsDealPending = false;
  let whistSession: WhistSession | null = null;
  let whistSessionMode: WhistSessionMode = "game";
  let whistDealPending = false;
  let spadesBids: SpadesBidState = { ...defaultSpadesBidState };
  let spadesPlayStarted = true;
  let spadesOpeningPanel: "table" | "bid" = "table";
  let spadesMatchScores: SpadesScoreState = { playerSide: 0, opponentSide: 0 };
  let spadesBagScores: SpadesScoreState = { playerSide: 0, opponentSide: 0 };
  let spadesHandResults: SpadesHandResult[] = [];
  let bridgeAuctionSelectedBidId = "1NT";
  let bridgeAuctionSelectedCall: BridgeCallOption = "1NT";
  let bridgeAuctionSelectedCallExplanation = "";
  let bridgeAuctionCalls: BridgeAuctionCall[] = [];
  let bridgeAuctionError = "";
  let bridgeHandResults: BridgeHandResult[] = [];
  let bridgeMatchScores: BridgeScoreState = { ns: 0, ew: 0 };
  $: spadesPartnershipBids = {
    playerSide: spadesSideBid(spadesBids, spadesPlayerSideSeats),
    opponentSide: spadesSideBid(spadesBids, spadesOpponentSideSeats)
  };
  $: spadesBidTotal = spadesBidSeats.reduce((total, seat) => total + spadesBids[seat], 0);
  $: spadesBidError = "";
  $: spadesBidReady = true;
  $: spadesCurrentBidLabel = spadesBidLabel(spadesBids);
  let fullHand: FullHandState | null = null;
  let heartsPassingHand: FullHandState | null = null;
  let heartsPassPractice: HeartsPassScenario | null = null;
  let heartsPassPracticeBaseSeed = 1;
  let heartsPassPracticeStepIndex = 0;
  let dominoHand: DominoHandState | null = null;
  let fullHandSelectedCardId = "";
  let dummySelectedCardId = "";
  let heartsPassSelectedCardIds: string[] = [];
  let heartsPassDirection: HeartsPassDirection = "left";
  let heartsPassPracticeSelectedCardIds: string[] = [];
  let heartsPassPracticeChecked = false;
  let heartsPassPracticeError = "";
  let dominoSelectedCardId = "";
  let fullHandError = "";
  let heartsPassError = "";
  let dominoError = "";
  let fullHandReviewTrickCount = 0;
  let lastFullHandTapCardId = "";
  let lastFullHandTapAt = 0;
  let lastDominoTapCardId = "";
  let lastDominoTapAt = 0;
  let dominoLastMoveReason = "";
  $: fullHandRunActive = barbuSession !== null;
  $: fullHandRunResults = barbuSession?.results ?? [];
  $: pendingRunContract = barbuSession?.pendingContract ?? fullHandContracts[0];
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
    appView === "drill" ||
    appView === "heartsPass" ||
    appView === "heartsPassPractice" ||
    appView === "runContractIntro" ||
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

  function whistOpeningLeadPracticeDeals(): WhistOpeningLeadPracticeDeal[] {
    return [
      {
        id: "long-spades",
        trumpSuit: "H",
        focusSuit: "S",
        recommendedLead: "5S",
        explanation: "5S is fourth highest from Q-10-8-5-2. It invites spades while preserving the queen.",
        prompt:
          "Lead 1 of 3. Hearts are trumps. Show Barbu spades with fourth highest from Q-10-8-5-2.",
        hands: [
          ["AS", "KS", "9S", "4S", "2D", "QD", "5D", "AC", "9C", "6C", "AH", "10H", "4H"].map(cardFromId),
          ["JS", "7S", "3S", "KD", "10D", "8D", "3D", "QC", "8C", "5C", "KH", "9H", "2H"].map(cardFromId),
          ["8S", "AD", "QS", "9D", "10S", "6D", "5S", "JH", "2S", "7H", "KC", "3H", "4C"].map(cardFromId),
          ["6S", "JD", "7D", "4D", "JC", "10C", "7C", "3C", "2C", "QH", "8H", "6H", "5H"].map(cardFromId)
        ]
      },
      {
        id: "strong-clubs",
        trumpSuit: "D",
        focusSuit: "C",
        recommendedLead: "KC",
        explanation: "KC leads the top of the K-Q-J honour sequence, showing supported strength.",
        prompt:
          "Lead 2 of 3. Diamonds are trumps. Show Barbu clubs with the top of K-Q-J.",
        hands: [
          ["KS", "10S", "7S", "2S", "AC", "10C", "3C", "AH", "QH", "8H", "4H", "AD", "KD"].map(cardFromId),
          ["QS", "JS", "9S", "5S", "8C", "7C", "5C", "KH", "9H", "5H", "2H", "QD", "JD"].map(cardFromId),
          ["KC", "7D", "QC", "10H", "JC", "6H", "9C", "3H", "6C", "2C", "AS", "8S", "4S"].map(cardFromId),
          ["6S", "3S", "4C", "JH", "7H", "10D", "9D", "8D", "6D", "5D", "4D", "3D", "2D"].map(cardFromId)
        ]
      },
      {
        id: "strong-clubs-save-trump",
        trumpSuit: "S",
        focusSuit: "C",
        recommendedLead: "AC",
        explanation: "AC cashes a winner in your long plain suit while keeping AS and KS for control.",
        prompt:
          "Lead 3 of 3. Spades are trumps. Show Barbu clubs: cash the ace and retain your two top trumps.",
        hands: [
          ["QS", "JS", "7S", "4S", "AD", "KD", "10D", "AH", "KH", "QH", "5H", "KC", "JC"].map(cardFromId),
          ["10S", "9S", "6S", "3S", "QD", "JD", "5D", "JH", "9H", "6H", "3H", "10C", "9C"].map(cardFromId),
          ["9D", "AS", "8D", "KS", "6D", "AC", "4D", "QC", "2C", "5C", "10H", "3C", "7H"].map(cardFromId),
          ["8S", "5S", "2S", "7D", "3D", "8H", "4H", "2H", "8C", "7C", "6C", "4C", "2D"].map(cardFromId)
        ]
      }
    ];
  }

  function cardFromId(cardId: string): Card {
    const suit = cardId.at(-1) as Suit;
    return appCard(cardId.slice(0, -1), suit);
  }

  function whistOpeningLeadPracticeDealFor(round: number) {
    const deals = whistOpeningLeadPracticeDeals();
    return deals[round % deals.length];
  }

  function buildWhistOpeningLeadPracticeHand(round: number): FullHandState {
    const deal = whistOpeningLeadPracticeDealFor(round);
    const playerHand = deal.hands[2];

    return {
      id: `whist-opening-lead-practice-${deal.id}-${deal.trumpSuit}`,
      contract: "Whist",
      hands: deal.hands,
      currentPlayerIndex: 2,
      currentPlayer: "You",
      currentTrick: [],
      completedTricks: [],
      playerHand,
      legalCardIds: playerHand.map((card) => card.id),
      playerPenalty: 0,
      totalPenalty: 0,
      cardsRemaining: 52,
      trickNumber: 1,
      status: "in_progress",
      prompt: deal.prompt
    };
  }

  function whistTrumpSuitFromHandId(id: string): Suit | null {
    const suffix = id.split("-").at(-1);
    if (suffix === "null") return null;
    return suffix === "C" || suffix === "D" || suffix === "H" || suffix === "S" ? suffix : "S";
  }

  function whistPartnershipTrickCounts(tricks: CompletedHandTrick[]) {
    return tricks.reduce(
      (totals, trick) => ({
        playerSide: totals.playerSide + (trick.winnerIndex === 0 || trick.winnerIndex === 2 ? 1 : 0),
        opponentSide: totals.opponentSide + (trick.winnerIndex === 1 || trick.winnerIndex === 3 ? 1 : 0)
      }),
      { playerSide: 0, opponentSide: 0 }
    );
  }

  function bridgeAuctionSummary(calls: BridgeAuctionCall[] = fullHand?.bridgeAuction ?? bridgeAuctionCalls) {
    return calls.length
      ? calls.map((call) => `${bridgeSeatLabel(call.seat)} ${bridgeCallLongLabel(call.call as BridgeCallOption)}`).join(", ")
      : "No auction recorded";
  }

  function bridgeOpeningLeadSummary(hand: FullHandState | null = fullHand) {
    const openingLead = hand?.completedTricks[0]?.cards[0];
    if (!openingLead) {
      return `${bridgeSeatLabel(bridgeVisibleContract.openingLeader)} is on opening lead.`;
    }

    return `${bridgeSeatLabel(openingLead.seat)} led ${formatCardLabel(openingLead.card)}.`;
  }

  function spadesBidLabel(bids = spadesBids) {
    return `${spadesSideBid(bids, spadesPlayerSideSeats)}-${spadesSideBid(bids, spadesOpponentSideSeats)}`;
  }

  function setSpadesSeatBid(seat: Seat, value: number) {
    if (seat !== "You" || !isSpadesSessionHand() || !spadesSession) return;
    setSpadesSession(transitionSpadesSession(spadesSession, { type: "set-bid", bid: value }));
    persistSavedSpadesRun();
  }

  function bumpSpadesSeatBid(seat: Seat, delta: number) {
    setSpadesSeatBid(seat, spadesBids[seat] + delta);
  }

  function spadesBidSeatLabel(seat: Seat) {
    return seat === "Tutor" ? "Barbu" : scoreSeatLabel(seat);
  }

  function spadesNilSummary(results: SpadesHandResult["nilResults"]) {
    if (!results.length) {
      return "";
    }

    return results
      .map((result) =>
        `${spadesBidSeatLabel(result.seat)} ${result.tricks === 0 ? "made nil" : "missed nil"} (${formatSignedScore(result.score)})`
      )
      .join("; ");
  }

  function spadesResultCopy(result: SpadesHandResult | null, scores: SpadesScoreState, complete: boolean) {
    const matchScore = `${scores.playerSide} - ${scores.opponentSide}`;
    if (complete) {
      const playerWon = scores.playerSide > scores.opponentSide;
      return {
        heading: playerWon ? "Your partnership won the match" : "Opponents won the match",
        summary: `${playerWon ? "You + Barbu" : "Left + Right"} reached ${Math.max(scores.playerSide, scores.opponentSide)} points. Final match score: ${matchScore}.`
      };
    }
    if (!result) return { heading: "Spades hand complete", summary: "Play to 500 points." };
    const nilText = spadesNilSummary(result.nilResults);
    const penaltyText = [
      result.playerSideBagPenalty ? `You + Barbu took a ${result.playerSideBagPenalty}-point bag penalty` : "",
      result.opponentSideBagPenalty ? `Left + Right took a ${result.opponentSideBagPenalty}-point bag penalty` : ""
    ].filter(Boolean).join("; ");
    const tiedAtTarget = scores.playerSide === scores.opponentSide && scores.playerSide >= spadesMatchTarget;
    return {
      heading: tiedAtTarget ? "Spades match tied: play on"
        : result.playerSideScore === result.opponentSideScore ? "Spades hand tied"
        : result.playerSideScore > result.opponentSideScore ? "Your partnership scored the hand" : "Opponents scored the hand",
      summary: `Bid ${result.playerSideBid}-${result.opponentSideBid}. You + Barbu won ${result.playerSideTricks} books for ${formatSignedScore(result.playerSideScore)}; Left + Right won ${result.opponentSideTricks} books for ${formatSignedScore(result.opponentSideScore)}. ${nilText ? `${nilText}. ` : ""}${penaltyText ? `${penaltyText}. ` : ""}Match score: ${matchScore}.${tiedAtTarget ? " Play another hand to break the tie." : ""}`
    };
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

  function bridgeHandShapeLabel(cards: Card[]) {
    return displaySuitSequence.map((suit) => bridgeSuitCount(cards, suit)).join("-");
  }

  function bridgeDealerSeat(hand: FullHandState | null = fullHand): Seat {
    return hand?.bridgeDealer ?? "You";
  }

  function bridgeDealerIndex(hand: FullHandState | null = fullHand) {
    return playerIndexBySeat[bridgeDealerSeat(hand)];
  }

  function bridgeVulnerabilityForHand(hand: FullHandState | null = fullHand): BridgeVulnerability {
    return hand?.bridgeVulnerability ?? "None";
  }

  function bridgeSeatLabel(seat: Seat) {
    if (seat === "Tutor") return "North";
    if (seat === "You") return "South";
    if (seat === "Right") return "East";
    return "West";
  }

  function bridgePartnershipLabel(side: "NS" | "EW") {
    return side === "NS" ? "North-South" : "East-West";
  }

  function bridgeExplainCall(call: BridgeCallOption, calls = bridgeAuctionCalls) {
    return explainBridgeCall(call, calls, bridgeAuctionStatus(calls, bridgeDealerIndex()).currentSeat);
  }

  function bridgeContractFromBid(bid: BridgeBidOption): BridgeContractState {
    return {
      level: bid.level,
      strain: bid.strain,
      label: bid.longLabel,
      declarer: "You",
      dummy: "Tutor",
      target: bid.target,
      vulnerability: "None",
      declarerSide: "NS",
      dealer: "You",
      openingLeader: "Left"
    };
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
  $: heartsCompletedCount = heartsUi.learnSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextHeartsPathStep = heartsUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  $: isHeartsCourseComplete = heartsCompletedCount === heartsUi.learnSteps.length;
  $: whistCompletedCount = whistUi.learnSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextWhistPathStep = whistUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  $: isWhistCourseComplete = whistCompletedCount === whistUi.learnSteps.length;
  $: spadesCompletedCount = spadesUi.learnSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextSpadesPathStep = spadesUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  $: isSpadesCourseComplete = spadesCompletedCount === spadesUi.learnSteps.length;
  $: bridgeCompletedCount = bridgeUi.learnSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextBridgePathStep = bridgeUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  $: isBridgeCourseComplete = bridgeCompletedCount === bridgeUi.learnSteps.length;
  $: barbuLearnPanelActions = [
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
  $: heartsLearnPanelActions = [
    {
      id: "reference",
      eyebrow: "Rules",
      title: "Reference",
      summary: heartsUi.table.learn.referenceSummary,
      onClick: () => openReference(heartsUi.table.referenceId)
    }
  ];
  $: whistLearnPanelActions = [
    {
      id: "reference",
      eyebrow: "Rules",
      title: "Reference",
      summary: whistUi.table.learn.referenceSummary,
      onClick: () => openReference(whistUi.table.referenceId)
    }
  ];
  $: spadesLearnPanelActions = [
    {
      id: "reference",
      eyebrow: "Rules",
      title: "Reference",
      summary: spadesUi.table.learn.referenceSummary,
      onClick: () => openReference(spadesUi.table.referenceId)
    }
  ];
  $: bridgeLearnPanelActions = [
    {
      id: "reference",
      eyebrow: "Rules",
      title: "Reference",
      summary: bridgeUi.table.learn.referenceSummary,
      onClick: () => openReference(bridgeUi.table.referenceId)
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
  $: isDrillSelectionLegal = drillSelectedCard ? drillLegalCardIds.has(drillSelectedCard.id) : false;
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
  $: drillOutcome = drillCheckedCard ? buildDrillOutcome(drillCheckedCard) : "";
  $: drillFeedback = drillCheckedCard ? buildDrillFeedback(drillCheckedCard) : currentDrillTrick.emptyExplanation;
  $: cleanDrillCount = drillResults.filter((result) => result.clean).length;
  $: currentDrillDecisionNumber = drillCheckedCard ? drillResults.length : drillResults.length + 1;
  $: isLastDrillDecision = drillIndex >= activeDrillSteps.length - 1;
  $: drillScreenTitle =
    activeGameTable === "whist" || activeGameTable === "spades" || activeGameTable === "bridge"
      ? drillSetTitle
      : "Quick drill";
  $: completedPracticeTableSession =
    !activeDrillFocusContract && activeDrillSteps.length >= fullHandContracts.length && drillResults.length >= activeDrillSteps.length;
  $: canMarkPracticeTableComplete = completedPracticeTableSession && !completedPathSteps["generated-drill"];
  $: drillResultIsBarbuPractice = activeGameTable === "barbu";
  $: drillResultIsBarbuPathPractice = drillResultIsBarbuPractice && activePathStepId === "generated-drill";
  $: drillResultIsHeartsPractice = activeGameTable === "hearts";
  $: drillResultIsWhistPractice = activeGameTable === "whist";
  $: drillResultIsSpadesPractice = activeGameTable === "spades";
  $: drillResultIsBridgePractice = activeGameTable === "bridge";
  $: drillResultIsTablePractice =
    drillResultIsHeartsPractice || drillResultIsWhistPractice || drillResultIsSpadesPractice || drillResultIsBridgePractice;
  $: drillResultMessage =
    drillResults.length > 0 && cleanDrillCount === drillResults.length
      ? drillResultIsHeartsPractice
        ? "Clean Hearts practice. Keep avoiding penalty tricks until the danger cards feel automatic."
        : drillResultIsWhistPractice
          ? "Clean Whist practice. Keep reading partner, led suit, and trump before full hands arrive."
          : drillResultIsSpadesPractice
            ? "Clean Spades practice. Keep reading the bid, trump, nil, and bags before full hands arrive."
            : drillResultIsBridgePractice
              ? "Clean Bridge practice. Keep planning declarer play, using dummy, and defending 1NT."
        : "Clean session. Barbu is ready to raise the pressure."
      : drillResultIsHeartsPractice
        ? "Repeat the Hearts pattern until following suit and avoiding penalties feels automatic."
        : drillResultIsWhistPractice
          ? "Repeat the Whist pattern until follow-suit and trump decisions feel automatic."
          : drillResultIsSpadesPractice
            ? "Repeat the Spades pattern until bid-aware trick decisions feel automatic."
            : drillResultIsBridgePractice
              ? "Repeat the Bridge pattern until dummy, declarer, and defensive plans feel automatic."
        : "Use the next repetition to make the weak decision automatic.";
  $: currentContractResults = summarizeContractResults(drillResults);
  $: weakContract = weakestContractFromResults(currentContractResults);
  $: recentPlayBarbuAttempts = playBarbuHistory.slice(0, 3);
  $: drillLoopInsight = buildDrillLoopInsight(drillResults, recentPlayBarbuAttempts);
  $: drillLoopFocus = drillLoopInsight.contract || weakContract || "Full table";
  $: drillLoopFocusSummary = currentContractResults.find((result) => result.contract === drillLoopFocus);
  $: currentBridgeBiddingPractice = bridgeBiddingPracticeSteps[bridgeBiddingPracticeIndex] ?? bridgeBiddingPracticeSteps[0];
  $: bridgeBiddingPracticeDecisionNumber = bridgeBiddingCheckedCall ? bridgeBiddingPracticeResults.length : bridgeBiddingPracticeResults.length + 1;
  $: bridgeBiddingPracticeCleanCount = bridgeBiddingPracticeResults.filter((result) => result.clean).length;
  $: bridgeBiddingPracticeIsLast = bridgeBiddingPracticeIndex >= bridgeBiddingPracticeSteps.length - 1;
  $: bridgeBiddingPracticeFeedback = bridgeBiddingCheckedCall
    ? currentBridgeBiddingPractice.explanations[bridgeBiddingCheckedCall] ?? "Compare your call with basic natural bidding."
    : "Choose the call that best describes South's hand for basic natural bidding.";
  $: bridgeBiddingPracticeOutcome =
    bridgeBiddingCheckedCall
      ? bridgeBiddingCheckedCall === currentBridgeBiddingPractice.correctCall
        ? "Good"
        : "Risky"
      : "";
  $: latestPlayBarbuAttempt = playBarbuHistory[0];
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
  $: heartsPassSelectedCards =
    heartsPassingHand?.playerHand.filter((card) => heartsPassSelectedCardIds.includes(card.id)) ?? [];
  $: heartsPassCanSubmit = heartsPassSelectedCardIds.length === 3;
  $: heartsPassPracticeSelectedCards =
    heartsPassPractice?.playerHand.filter((card) => heartsPassPracticeSelectedCardIds.includes(card.id)) ?? [];
  $: heartsPassPracticeRecommendedIds = new Set(heartsPassPractice?.recommendedPass.map((card) => card.id) ?? []);
  $: heartsPassPracticeOutcome = heartsPassPractice ? evaluateHeartsPass(heartsPassPractice, heartsPassPracticeSelectedCardIds) : null;
  $: heartsPassPracticeMatchCount = heartsPassPracticeOutcome?.matchedCards.length ?? 0;
  $: heartsPassPracticeCanCheck = heartsPassPracticeOutcome?.isComplete ?? false;
  $: heartsPassPracticeExact = heartsPassPracticeOutcome?.isExact ?? false;
  $: heartsPassPracticeIsLastStep = heartsPassPracticeStepIndex >= heartsPassPracticeTotalSteps - 1;
  $: fullHandLastCompletedTrick = fullHand?.completedTricks[fullHand.completedTricks.length - 1];
  $: fullHandReviewTrick =
    fullHand && fullHandReviewTrickCount > 0 ? fullHand.completedTricks[fullHandReviewTrickCount - 1] : undefined;
  $: fullHandIsReviewingTrick = Boolean(
    fullHandReviewTrick && fullHand?.status === "in_progress" && fullHand.completedTricks.length === fullHandReviewTrickCount
  );
  $: fullHandReviewFeedback = fullHandReviewTrick ? fullHandTrickFeedback(fullHandReviewTrick) : "";
  $: fullHandCardCountingActive =
    fullHandCardCountingMode &&
    (fullHand?.contract === "Hearts" || fullHand?.contract === "Whist" || fullHand?.contract === "No Queens") &&
    !fullHandRunActive;
  $: fullHandCardCountingIsWhist = fullHandCardCountingActive && fullHandCardCountingExercise === "whist-memory";
  $: fullHandCardCountingIsHighCard = fullHandCardCountingActive && fullHandCardCountingExercise === "high-card-memory";
  $: fullHandCardCountingIsHearts = fullHandCardCountingActive && fullHandCardCountingExercise === "heart-memory";
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
  $: fullHandCardCountingSeenCount = fullHandCardCountingReviewCards.length;
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
        : fullHandIsBridgeGame && fullHand.currentPlayer === "Tutor"
          ? { Tutor: "Dummy" }
          : {}
      : {};
  $: fullHandContractMeta = contractScoreMeta(fullHand?.contract ?? "No Hearts");
  $: fullHandPenaltyName = fullHandContractMeta.unitName;
  $: fullHandPenaltyPlural = fullHandContractMeta.unitPlural;
  $: fullHandPenaltyTotal = fullHandContractMeta.totalValue;
  $: fullHandPenaltyPlayedLabel = fullHandContractMeta.inPlayLabel;
  $: fullHandNoLastTwoPhaseLabel = noLastTwoPhaseLabel(fullHand);
  $: fullHandNoLastTwoPhaseValue = noLastTwoPhaseValue(fullHand);
  $: fullHandPlayerPenaltyLabel =
    fullHand?.playerPenalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural;
  $: fullHandSeatPenalties = fullHand ? seatPenaltiesForTricks(fullHand.completedTricks) : emptySeatPenalties();
  $: fullHandSeatTrickCounts = fullHand ? seatTricksWonForTricks(fullHand.completedTricks) : emptySeatPenalties();
  $: whistResult = whistResultCopy(whistSettlement, whistPartnershipTricks, whistRubberActive ? "rubber" : "game");
  $: heartsResult = heartsResultCopy(heartsMatchIsComplete, heartsStandings, heartsHighestScore,
    heartsCurrentMoonShooter, heartsVisibleHandCount, fullHand?.playerPenalty ?? 0, heartsScorecardMeta.objective);
  $: spadesResult = spadesResultCopy(currentSpadesHandResult, spadesVisibleMatchScores, spadesMatchIsComplete);
  $: fullHandResultTitle = fullHandIsHeartsGame ? heartsResult.heading : fullHandIsWhistGame ? whistResult.heading : fullHandIsSpadesGame ? spadesResult.heading : fullHand ? fullHandResultHeading(fullHand) : "";
  $: fullHandResultSummary = fullHandIsHeartsGame ? heartsResult.summary : fullHandIsWhistGame ? whistResult.summary : fullHandIsSpadesGame ? spadesResult.summary : fullHand ? fullHandResultText(fullHand, bridgeVisibleMatchScores) : "";
  $: fullHandBestTrick = fullHand ? fullHandBestTrickLabel(fullHand) : "";
  $: fullHandWorstTrick = fullHand ? fullHandWorstTrickLabel(fullHand) : "";
  $: fullHandIsHeartsGame = activeGameTable === "hearts" && fullHand?.contract === "Hearts" && !fullHandRunActive;
  $: fullHandIsWhistGame = activeGameTable === "whist" && fullHand?.contract === "Whist" && !fullHandRunActive;
  $: fullHandIsSpadesGame = activeGameTable === "spades" && fullHand?.contract === "Spades" && !fullHandRunActive;
  $: fullHandIsBridgeGame = activeGameTable === "bridge" && fullHand?.contract === "Bridge" && !fullHandRunActive;
  $: fullHandIsPartnershipGame = fullHandIsWhistGame || fullHandIsSpadesGame || fullHandIsBridgeGame;
  $: bridgeDummySeat = fullHand?.bridgeContract?.dummy ?? "Tutor";
  $: bridgeDeclarerSeat = fullHand?.bridgeContract?.declarer ?? "You";
  $: bridgeUserSideDeclares = fullHandIsBridgeGame && (bridgeSideForSeat(bridgeDeclarerSeat) === "NS");
  $: isBridgeDummyTurn = fullHandIsBridgeGame && bridgeUserSideDeclares && fullHand?.currentPlayer === bridgeDummySeat;
  $: bridgeActiveHandCards =
    fullHandIsBridgeGame && fullHand
      ? isBridgeDummyTurn
        ? fullHand.dummyHand ?? []
        : fullHand.playerHand
      : [];
  $: bridgeActiveHandAriaLabel =
    fullHandIsBridgeGame && isBridgeDummyTurn
      ? `${bridgeSeatLabel(bridgeDummySeat)} dummy hand`
      : "South Bridge hand";
  $: bridgeActiveHandLabel = `${bridgeSeatLabel(isBridgeDummyTurn ? bridgeDummySeat : "You")} · ${
    isBridgeDummyTurn || bridgeDummySeat === "You" ? "Dummy" : bridgeUserSideDeclares ? "Declarer" : "Defender"
  }`;
  $: bridgeLedSuit = fullHand?.currentTrick[0]?.card.suit;
  $: bridgePlayPrompt = bridgeLedSuit
    ? `Led: ${suitNames[bridgeLedSuit]}. Follow suit if you can.`
    : fullHand?.completedTricks.length === 0 ? "Make the opening lead." : "Lead any card.";
  $: whistOpeningLeadPracticeActive = fullHandIsWhistGame && whistFullHandSource === "practice" && activeWhistPracticeFocus === "lead";
  $: whistOpeningLeadPracticeReview =
    whistOpeningLeadPracticeActive &&
    fullHandIsReviewingTrick &&
    Boolean(fullHandReviewTrick && fullHandCompletedTrickNumber(fullHandReviewTrick) === 1);
  $: whistTrumpSuitLabel =
    fullHandIsPartnershipGame && fullHand
      ? fullHand.trumpSuit
        ? suitNameFromId(fullHand.trumpSuit)
        : fullHandIsBridgeGame
          ? "No Trump"
          : suitNameFromId(whistTrumpSuitFromHandId(fullHand.id))
      : "";
  $: whistPartnershipTricks = fullHand ? whistPartnershipTrickCounts(fullHand.completedTricks) : { playerSide: 0, opponentSide: 0 };
  $: whistOddScore = whistOddProgress(whistPartnershipTricks);
  $: whistPlayerSideOddTricks = whistOddScore.playerSideOddTricks;
  $: whistOpponentSideOddTricks = whistOddScore.opponentSideOddTricks;
  $: whistOddProgressLabel = whistOddScore.label;
  $: whistOddProgressValue = whistOddScore.value;
  $: bridgeAuctionCurrentStatus = bridgeAuctionStatus(bridgeAuctionCalls, bridgeDealerIndex(fullHand));
  $: bridgeAuctionLegalCalls = bridgeLegalCallOptions(bridgeAuctionCalls, bridgeAuctionCurrentStatus.currentSeat, bridgeDealerIndex(fullHand));
  $: bridgeAuctionReadyToPlay = bridgeAuctionCurrentStatus.complete && !bridgeAuctionCurrentStatus.passedOut;
  $: bridgeAuctionActionLabel = bridgeAuctionReadyToPlay ? "Start play" : bridgeAuctionCurrentStatus.passedOut ? "Deal again" : "Make call";
  $: bridgeSelectedBid = bridgeBidOptions.find((bid) => bid.id === bridgeAuctionSelectedBidId) ?? bridgeBidOptions[4];
  $: bridgeAuctionSelectedCallExplanation = bridgeExplainCall(bridgeAuctionSelectedCall, bridgeAuctionCalls);
  $: bridgeSuggestedCall = bridgeSuggestedCallForHand(fullHand, bridgeAuctionCalls, "You");
  $: bridgeVisibleContract = fullHand?.bridgeContract ?? bridgeFinalizeContract(bridgeAuctionCalls, fullHand) ?? bridgeContractFromBid(bridgeSelectedBid);
  $: bridgeContractLabel = bridgeVisibleContract.label;
  $: bridgeTrickCounts = bridgeDeclarerTrickCounts(fullHand);
  $: bridgeDeclarerTricks = bridgeTrickCounts.declarer;
  $: bridgeDefenderTricks = bridgeTrickCounts.defenders;
  $: bridgeContractTarget = bridgeVisibleContract.target;
  $: bridgeContractMade = bridgeDeclarerTricks >= bridgeContractTarget;
  $: currentBridgeHandResult = fullHandIsBridgeGame && fullHand?.status === "complete" ? bridgeHandResultFor(fullHand, fullHand.bridgeBoardNumber ?? bridgeHandResults.length + 1) : null;
  $: bridgeVisibleMatchScores = bridgeScoreTotalsWith(currentBridgeHandResult, bridgeMatchScores);
  $: currentSpadesHandResult = fullHandIsSpadesGame && fullHand?.status === "complete" ? spadesHandResultFor(fullHand, spadesHandResults.length + 1, spadesBids, spadesBagScores) : null;
  $: fullHandShowWhistMatchSummary =
    (fullHandIsWhistGame || fullHandIsSpadesGame) && !fullHandCardCountingActive;
  $: spadesBidsAdjustable =
    fullHandIsSpadesGame &&
    whistFullHandSource === "play" &&
    !spadesPlayStarted &&
    fullHand?.status === "in_progress" &&
    fullHand?.completedTricks.length === 0;
  $: spadesOpeningDecisionActive = spadesBidsAdjustable;
  $: whistSessionForDisplay = fullHandIsWhistGame && whistFullHandSource === "play" && !fullHandCardCountingActive
    && whistSession?.fullHand === fullHand ? whistSession : null;
  $: whistSettlement = whistSessionSettlement(whistSessionForDisplay ?? {
    fullHand: fullHandIsWhistGame ? fullHand : null, scores: emptyWhistScore(), games: emptyWhistScore(), mode: "game"
  });
  $: whistVisibleMatchScores = whistSettlement.points;
  $: whistVisibleHandCount = (whistSessionForDisplay?.results.length ?? 0) + (fullHandIsWhistGame && fullHand?.status === "complete" ? 1 : 0);
  $: whistRubberActive = whistSessionForDisplay?.mode === "rubber";
  $: whistTurnedCardVisible = fullHandIsWhistGame && fullHand?.whistTurnedTrump
    && fullHand.completedTricks.length === 0
    && !fullHand.currentTrick.some(play => play.seat === ["Tutor", "Right", "You", "Left"][fullHand.whistDealer ?? -1]);
  $: spadesVisibleResult = currentSpadesHandResult
    ? addSpadesMatchResult(spadesMatchScores, spadesBagScores, currentSpadesHandResult)
    : { scores: spadesMatchScores, bags: spadesBagScores };
  $: spadesVisibleMatchScores = spadesVisibleResult.scores;
  $: spadesVisibleBags = spadesVisibleResult.bags;
  $: spadesVisibleHandCount = spadesHandResults.length + (currentSpadesHandResult ? 1 : 0);
  $: partnershipVisibleMatchScores = fullHandIsSpadesGame ? spadesVisibleMatchScores : whistVisibleMatchScores;
  $: partnershipVisibleHandCount = fullHandIsSpadesGame ? spadesVisibleHandCount : whistVisibleHandCount;
  $: partnershipMatchTarget = fullHandIsSpadesGame ? spadesMatchTarget : whistMatchTarget;
  $: whistMatchIsComplete =
    fullHandIsWhistGame &&
    fullHand?.status === "complete" &&
    whistSettlement.complete;
  $: spadesMatchIsComplete =
    fullHandIsSpadesGame &&
    fullHand?.status === "complete" &&
    spadesMatchComplete(spadesVisibleMatchScores);
  $: partnershipMatchIsComplete = fullHandIsSpadesGame ? spadesMatchIsComplete : whistMatchIsComplete;
  $: heartsSessionForDisplay = activeGameTable === "hearts" && !fullHandCardCountingMode && !fullHandRunActive
    && heartsSession && (heartsSession.phase === "passing" ? heartsPassingHand : fullHand) === heartsSession.fullHand ? heartsSession : null;
  $: heartsHandResults = heartsSessionForDisplay?.results ?? [];
  $: heartsMatchSettlement = heartsSessionForDisplay ? heartsSessionSettlement(heartsSessionForDisplay) : null;
  $: heartsCurrentMoonShooter = fullHandIsHeartsGame ? heartsMoonShooter(fullHandSeatPenalties) : undefined;
  $: heartsCurrentMoonThreatSeat = fullHandIsHeartsGame ? heartsMoonThreatSeat(fullHandSeatPenalties) : undefined;
  $: heartsCurrentScoredSeatPenalties = fullHandIsHeartsGame
    ? heartsScoredSeatPenalties(fullHandSeatPenalties)
    : emptySeatPenalties();
  $: currentHeartsHandResult = heartsMatchSettlement?.result ?? null;
  $: heartsVisibleHandResults = currentHeartsHandResult
    ? [...heartsHandResults, currentHeartsHandResult]
    : heartsHandResults;
  $: heartsVisibleHandCount = heartsVisibleHandResults.length;
  $: heartsScorecardMeta = heartsUi.table.scorecard;
  $: heartsVisibleScores = heartsMatchSettlement?.scores ?? heartsCurrentScoredSeatPenalties;
  $: heartsStandings = heartsScorecardStandings(heartsVisibleScores);
  $: heartsHighestScore = scoreSeats
    .map((seat) => ({ seat, score: heartsVisibleScores[seat] }))
    .sort((left, right) => right.score - left.score)[0];
  $: heartsMatchIsComplete =
    fullHandIsHeartsGame && Boolean(heartsMatchSettlement?.complete);
  $: fullHandCompletion = fullHand?.status !== "complete" || fullHandCardCountingActive ? null
    : fullHandIsHeartsGame && heartsMatchIsComplete ? "match"
    : whistFullHandSource !== "play" ? null
    : fullHandIsSpadesGame && spadesMatchIsComplete ? "match"
    : fullHandIsWhistGame && whistSettlement.gameComplete ? whistRubberActive && whistSettlement.complete ? "rubber" : "game"
    : fullHandIsBridgeGame ? "board" : null;
  $: fullHandReplayAllowed = !fullHandCompletion || fullHandCompletion === "board";
  $: heartsPlayerStanding = heartsStandings.find((standing) => standing.seat === "You");
  $: heartsPlayerPlaceLabel = heartsPlayerStanding ? formatOrdinal(heartsPlayerStanding.rank) : "1st";
  $: heartsBestHand = heartsPlayerHandResult("best", heartsVisibleHandResults);
  $: heartsWorstHand = heartsPlayerHandResult("worst", heartsVisibleHandResults);
  $: heartsBestHandLabel = heartsBestHand ? heartsHandResultLabel(heartsBestHand) : "No hands yet";
  $: heartsWorstHandLabel = heartsWorstHand ? heartsHandResultLabel(heartsWorstHand) : "No hands yet";
  $: activeRunContract = fullHand?.contract ?? dominoHand?.contract;
  $: fullHandRunCurrentIndex = activeRunContract ? fullHandContracts.indexOf(activeRunContract) : -1;
  $: pendingRunContractIndex = fullHandContracts.indexOf(pendingRunContract);
  $: pendingRunContractIntro = runContractIntros[pendingRunContract];
  $: pendingRunStatusLabel = `Contract ${pendingRunContractIndex + 1} of ${fullHandContracts.length}`;
  $: pendingRunSequenceLabel = `${fullHandRunResults.length} played, ${fullHandRunRemainingCount} to go`;
  $: pendingRunSurfaceLabel = pendingRunContractIntro.surface;
  $: fullHandRunOrderedResults = fullHandContracts
    .map((contract) => fullHandRunResults.find((result) => result.contract === contract))
    .filter((result): result is FullHandRunResult => Boolean(result));
  $: fullHandRunSeatPenalties = barbuSeatTotals(fullHandRunResults, false);
  $: fullHandRunSeatScores = barbuSeatTotals(fullHandRunResults);
  $: fullHandRunStandings = runStandings(fullHandRunSeatScores);
  $: fullHandRunPlayerStanding = fullHandRunStandings.find((standing) => standing.seat === "You");
  $: fullHandRunLeader = fullHandRunStandings[0];
  $: fullHandRunBestContract = runBestContract(fullHandRunOrderedResults);
  $: fullHandRunWeakestContract = runWeakestContract(fullHandRunOrderedResults);
  $: fullHandRunIsComplete = barbuSession !== null && barbuSessionComplete(barbuSession);
  $: fullHandRunRemainingCount = Math.max(fullHandContracts.length - fullHandRunResults.length, 0);
  $: fullHandRunLeaderLabel = fullHandRunLeader
    ? `${scoreSeatLabel(fullHandRunLeader.seat)} ${formatSignedScore(fullHandRunLeader.score)}`
    : "You 0";
  $: fullHandRunPlayerPlaceLabel = fullHandRunPlayerStanding ? formatOrdinal(fullHandRunPlayerStanding.rank) : "1st";
  $: fullHandRunRemainingLabel = `${fullHandRunRemainingCount} ${
    fullHandRunRemainingCount === 1 ? "contract" : "contracts"
  }`;
  $: savedPlayBarbuRunLabel = savedPlayBarbuRun ? savedPlayBarbuRunSummary(savedPlayBarbuRun) : "";
  $: fullHandRunResultTitle = fullHandRunIsComplete ? runResultHeading(fullHandRunStandings) : "Game complete";
  $: fullHandRunResultSummary = fullHandRunIsComplete
    ? runResultSummary(fullHandRunStandings, fullHandRunResults.length)
    : "";
  $: fullHandRunWinnerLabel = fullHandRunLeader
    ? `${scoreSeatLabel(fullHandRunLeader.seat)} wins with ${formatSignedScore(fullHandRunLeader.score)}`
    : "Game complete";
  $: fullHandRunBestContractLabel = fullHandRunBestContract
    ? `${fullHandRunBestContract.contract}: ${runContractValueLabel(fullHandRunBestContract)}`
    : "No hands yet";
  $: fullHandRunWeakestContractLabel = fullHandRunWeakestContract
    ? `${fullHandRunWeakestContract.contract}: ${runContractValueLabel(fullHandRunWeakestContract)}`
    : "No hands yet";
  $: fullHandRunStatusLabel =
    fullHandRunIsComplete
      ? "Game complete"
      : fullHandRunActive && fullHandRunCurrentIndex >= 0
      ? `Contract ${fullHandRunCurrentIndex + 1} of ${fullHandContracts.length}`
      : fullHandIsPartnershipGame
        ? whistTrumpSuitLabel
          ? `Trump ${whistTrumpSuitLabel}`
          : fullHandIsSpadesGame
            ? "Spades"
            : "Whist"
      : fullHand?.status === "complete" || dominoHand?.status === "complete"
        ? "Complete"
        : fullHand
          ? `Trick ${fullHand.trickNumber}`
          : dominoHand
            ? `${dominoHand.cardsRemaining} cards left`
            : "Ready";
  $: fullHandNextActionLabel = fullHandIsHeartsGame
    ? heartsMatchIsComplete
      ? "New match"
      : "Next hand"
    : fullHandIsBridgeGame
    ? "Next board"
    : fullHandIsPartnershipGame
    ? whistFullHandSource === "practice"
      ? "Try another"
      : partnershipMatchIsComplete
      ? "New match"
      : fullHandIsWhistGame && whistSettlement.gameComplete
      ? "Next game"
      : "Next hand"
    : fullHandRunActive
    ? fullHandRunIsComplete
      ? "New game"
      : "Next contract"
    : "Try another";
  $: dominoLegalCardIds = new Set(dominoHand?.legalCardIds ?? []);
  $: dominoSelectedCard = dominoHand?.playerHand.find((card) => card.id === dominoSelectedCardId);
  $: dominoDefaultPlayableCard = dominoHand?.playerHand.find((card) => dominoLegalCardIds.has(card.id));
  $: dominoScoreMap = dominoHand
    ? ({
        Tutor: dominoHand.scores[0] ?? 0,
        Right: dominoHand.scores[1] ?? 0,
        You: dominoHand.scores[2] ?? 0,
        Left: dominoHand.scores[3] ?? 0
      } satisfies Record<Seat, number>)
    : emptySeatPenalties();
  $: dominoResultTitle = dominoHand?.status === "complete" ? dominoResultHeading(dominoHand) : "Build the layout";
  $: dominoResultSummary = dominoHand?.status === "complete" ? dominoResultText(dominoHand) : "";
  $: dominoNextOutScore = dominoHand ? dominoOrderScores[dominoHand.outOrder.length] ?? -5 : 0;
  $: dominoMoveReason = dominoHand
    ? dominoSelectedCard
      ? dominoMoveExplanation(dominoHand, dominoSelectedCard)
      : dominoLastMoveReason || dominoMoveExplanation(dominoHand, undefined)
    : "";
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

  function setBarbuSession(session: BarbuSession) {
    barbuSession = session;
    fullHand = session.fullHand;
    dominoHand = session.dominoHand;
    fullHandReviewTrickCount = session.fullHandReviewTrickCount;
  }

  function openBarbuSession(session: BarbuSession) {
    activeGameTable = "barbu";
    activeTableTabs.barbu = "play";
    fullHandCardCountingMode = false;
    heartsPassingHand = null;
    setBarbuSession(session);
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    dominoSelectedCardId = "";
    fullHandError = "";
    dominoError = "";
    dominoLastMoveReason = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    lastDominoTapCardId = "";
    lastDominoTapAt = 0;
    appView = session.view;
  }

  function persistSavedPlayBarbuRun() {
    if (!barbuSession) return;
    savedPlayBarbuRun = saveBarbuSession(barbuSession, new Date().toISOString());
    if (fullHandError === barbuSaveError) fullHandError = "";
    if (dominoError === barbuSaveError) dominoError = "";
    barbuSaveError = "";
    try {
      barbuSaveStore.write(savedPlayBarbuRun);
    } catch {
      barbuSaveError = "Progress could not be saved on this device.";
      if (barbuSession.view === "dominoHand") dominoError = barbuSaveError;
      else fullHandError = barbuSaveError;
    }
  }

  function dispatchBarbuSession(event: BarbuSessionEvent) {
    if (!barbuSession) return;
    const next = transitionBarbuSession(barbuSession, event);
    if (next === barbuSession) return;
    openBarbuSession(next);
    persistSavedPlayBarbuRun();
  }

  function continueSavedPlayBarbuRun() {
    const saved = savedPlayBarbuRun ?? barbuSaveStore.load();
    if (!saved) return;
    openBarbuSession(restoreBarbuSession(saved));
    persistSavedPlayBarbuRun();
  }

  function heartsPassDirectionLabel(direction: HeartsPassDirection) {
    return direction === "hold" ? "No pass" : `Pass ${direction}`;
  }

  function heartsPassTargetLabel(direction: HeartsPassDirection) {
    if (direction === "right") {
      return "Right";
    }
    if (direction === "across") {
      return "Barbu";
    }
    return "Left";
  }

  function heartsPassReceiveLabel(direction: HeartsPassDirection) {
    if (direction === "right") {
      return "Left";
    }
    if (direction === "across") {
      return "Barbu";
    }
    return "Right";
  }

  function isHeartsSessionActive() {
    return activeGameTable === "hearts" && !fullHandRunActive && !fullHandCardCountingMode && heartsSession !== null
      && (heartsSession.phase === "passing" ? heartsPassingHand : fullHand) === heartsSession.fullHand;
  }

  function setHeartsSession(session: HeartsSession) {
    heartsSession = session;
    heartsPassingHand = session.phase === "passing" ? session.fullHand : null;
    fullHand = session.phase === "playing" ? session.fullHand : null;
    heartsPassSelectedCardIds = session.selectedPassCardIds;
    heartsPassDirection = session.passDirection;
    fullHandReviewTrickCount = session.fullHandReviewTrickCount;
  }

  function openHeartsSession(session: HeartsSession) {
    activeGameTable = "hearts";
    activeTableTabs.hearts = "play";
    barbuSession = null;
    fullHandCardCountingMode = false;
    dominoHand = null;
    spadesPlayStarted = true;
    setHeartsSession(session);
    heartsPassError = "";
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    fullHandError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    appView = session.phase === "passing" ? "heartsPass" : "fullHand";
  }

  function persistSavedHeartsRun() {
    if (!isHeartsSessionActive() || !heartsSession) return;
    savedHeartsRun = saveHeartsSession(heartsSession, new Date().toISOString());
    try {
      heartsSaveStore.write(savedHeartsRun);
    } catch {
      if (heartsSession.phase === "passing") heartsPassError = "Progress could not be saved on this device.";
      else fullHandError = "Progress could not be saved on this device.";
    }
  }

  function continueSavedHeartsRun() {
    const saved = savedHeartsRun ?? heartsSaveStore.load();
    if (!saved) return;
    openHeartsSession(restoreHeartsSession(saved));
    persistSavedHeartsRun();
  }

  function isWhistSessionHand() {
    return activeGameTable === "whist" && whistFullHandSource === "play" && !fullHandCardCountingMode
      && !fullHandRunActive && whistSession !== null && fullHand === whistSession.fullHand;
  }

  function setWhistSession(session: WhistSession) {
    whistSession = session;
    fullHand = session.fullHand;
    fullHandReviewTrickCount = session.fullHandReviewTrickCount;
  }

  function openWhistSession(session: WhistSession) {
    activeGameTable = "whist";
    activeTableTabs.whist = "play";
    whistFullHandSource = "play";
    whistSessionMode = session.mode;
    barbuSession = null;
    fullHandCardCountingMode = false;
    dominoHand = null;
    heartsPassingHand = null;
    spadesPlayStarted = true;
    setWhistSession(session);
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    fullHandError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    appView = "fullHand";
  }

  function persistSavedWhistRun() {
    if (!isWhistSessionHand() || !whistSession) return;
    savedWhistRun = saveWhistSession(whistSession, new Date().toISOString());
    try {
      whistSaveStore.write(savedWhistRun);
    } catch {
      fullHandError = "Progress could not be saved on this device.";
    }
  }

  function continueSavedWhistRun() {
    const saved = savedWhistRun ?? whistSaveStore.load();
    if (!saved) return;
    openWhistSession(restoreWhistSession(saved));
    persistSavedWhistRun();
  }

  function isSpadesSessionHand() {
    return activeGameTable === "spades" && whistFullHandSource === "play" && !fullHandCardCountingMode
      && !fullHandRunActive && spadesSession !== null && fullHand === spadesSession.fullHand;
  }

  function setSpadesSession(session: SpadesSession) {
    spadesSession = session;
    fullHand = session.fullHand;
    fullHandReviewTrickCount = session.fullHandReviewTrickCount;
    spadesMatchScores = session.scores;
    spadesBagScores = session.bags;
    spadesBids = session.bids;
    spadesHandResults = session.results;
    spadesPlayStarted = session.playStarted;
    spadesOpeningPanel = session.openingPanel;
  }

  function openSpadesSession(session: SpadesSession) {
    activeGameTable = "spades";
    activeTableTabs.spades = "play";
    whistFullHandSource = "play";
    barbuSession = null;
    fullHandCardCountingMode = false;
    dominoHand = null;
    heartsPassingHand = null;
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    fullHandError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    setSpadesSession(session);
    appView = "fullHand";
  }


  function persistSavedSpadesRun() {
    if (!isSpadesSessionHand() || !spadesSession) return;
    savedSpadesRun = saveSpadesSession(spadesSession, new Date().toISOString());
    try {
      spadesSaveStore.write(savedSpadesRun);
    } catch {
      fullHandError = "Progress could not be saved on this device.";
    }
  }

  function savedSpadesRunSummary(savedRun: SavedSpadesRun) {
    const handNumber = savedRun.results.length + 1;
    const matchScore = `${savedRun.scores.playerSide} - ${savedRun.scores.opponentSide}`;

    if (!savedRun.playStarted && savedRun.fullHand.status !== "complete") {
      return `Hand ${handNumber}, bid ${spadesBidLabel(savedRun.bids)}, match ${matchScore}`;
    }

    return savedRun.fullHand.status === "complete"
      ? `Hand ${handNumber} complete, match ${matchScore}`
      : `Hand ${handNumber}, trick ${savedRun.fullHand.trickNumber}, match ${matchScore}`;
  }

  function continueSavedSpadesRun() {
    const saved = savedSpadesRun ?? spadesSaveStore.load();
    if (!saved) return;
    openSpadesSession(restoreSpadesSession(saved));
    persistSavedSpadesRun();
  }

  function isBridgeSessionHand() {
    return activeGameTable === "bridge" && whistFullHandSource === "play" && !fullHandCardCountingMode
      && !fullHandRunActive && bridgeSession !== null && fullHand === bridgeSession.fullHand;
  }

  function setBridgeSession(session: BridgeSession) {
    bridgeSession = session;
    fullHand = session.fullHand;
    fullHandReviewTrickCount = session.fullHandReviewTrickCount;
    bridgeMatchScores = session.scores;
    bridgeHandResults = session.results;
    bridgeAuctionCalls = session.auctionCalls;
    bridgeAuctionSelectedCall = session.selectedCall;
    if (bridgeBidOptions.some(bid => bid.id === session.selectedCall)) bridgeAuctionSelectedBidId = session.selectedCall;
  }

  function openBridgeSession(session: BridgeSession) {
    activeGameTable = "bridge";
    activeTableTabs.bridge = "play";
    whistFullHandSource = "play";
    barbuSession = null;
    fullHandCardCountingMode = false;
    dominoHand = null;
    heartsPassingHand = null;
    spadesPlayStarted = true;
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    fullHandError = "";
    bridgeAuctionError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    setBridgeSession(session);
    appView = session.view;
  }

  function persistSavedBridgeRun() {
    if (!isBridgeSessionHand() || !bridgeSession) return;
    savedBridgeRun = saveBridgeSession(bridgeSession, new Date().toISOString());
    try {
      bridgeSaveStore.write(savedBridgeRun);
    } catch {
      if (bridgeSession.view === "bridgeAuction") bridgeAuctionError = "Progress could not be saved on this device.";
      else fullHandError = "Progress could not be saved on this device.";
    }
  }

  function savedBridgeRunSummary(savedRun: SavedBridgeRun) {
    const handNumber = savedRun.fullHand.bridgeBoardNumber ?? savedRun.results.length + 1;
    const score = `NS ${formatSignedScore(savedRun.scores.ns)}, EW ${formatSignedScore(savedRun.scores.ew)}`;
    const finalContract = savedRun.fullHand.bridgeContract?.label;

    if (savedRun.view === "bridgeAuction") {
      return `Board ${handNumber}, auction in progress, ${score}`;
    }

    return savedRun.fullHand.status === "complete"
      ? `Board ${handNumber} complete, ${score}`
      : `Board ${handNumber}, ${finalContract ?? "contract"}, trick ${savedRun.fullHand.trickNumber}, ${score}`;
  }

  function continueSavedBridgeRun() {
    const saved = savedBridgeRun ?? bridgeSaveStore.load();
    if (!saved) return;
    openBridgeSession(restoreBridgeSession(saved));
    persistSavedBridgeRun();
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
    appView = "gameTable";
  }

  function openWhistTable() {
    activeGameTable = "whist";
    appView = "gameTable";
  }

  function openSpadesTable() {
    activeGameTable = "spades";
    appView = "gameTable";
  }

  function openBridgeTable() {
    activeGameTable = "bridge";
    appView = "gameTable";
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
    if (contract === "Whist") whistSession = null;
    if (contract === "Spades") spadesSession = null;
    if (contract === "Hearts") heartsSession = null;
    if (contract === "Bridge") bridgeSession = null;
    fullHandCardCountingAnswer = null;
    fullHandCardCountingChecked = false;
    fullHandCardCountingQuestionsAsked = 0;
    fullHandCardCountingClean = 0;

    barbuSession = null;

    dominoHand = null;
    heartsPassingHand = null;
    const seed = options.seed ?? usePracticeSeed();
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    fullHandError = "";
    fullHandReviewTrickCount = 0;
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    const engine = typescriptHandEngine(contract);
    if (!engine) throw new Error(`Unsupported hand: ${contract}`);
    fullHand = engine.start({ seed, dealer: options.dealer });

    appView = "fullHand";
  }

  async function startHeartsPassingPhase(options: { keepSession?: boolean } = {}) {
    if (heartsDealPending) return;
    heartsDealPending = true;
    try {
      const session = options.keepSession && heartsSession
        ? transitionHeartsSession(heartsSession, { type: "next-hand", seed: usePracticeSeed() })
        : createHeartsSession(usePracticeSeed());
      openHeartsSession(session);
      persistSavedHeartsRun();
      await tick();
    } catch (error) {
      fullHandError = error instanceof Error ? error.message : "That hand could not be dealt.";
    } finally {
      heartsDealPending = false;
    }
  }

  async function startDominoHand() {
    barbuSession = null;
    const seed = usePracticeSeed();
    fullHand = null;
    heartsPassingHand = null;
    dominoSelectedCardId = "";
    dominoError = "";
    dominoLastMoveReason = "";
    lastDominoTapCardId = "";
    lastDominoTapAt = 0;

    dominoHand = dominoHandEngine.start({ seed });

    appView = "dominoHand";
  }

  function toggleHeartsPassCard(card: Card) {
    if (!isHeartsSessionActive() || !heartsSession || heartsSession.phase !== "passing") return;
    heartsPassError = "";
    const next = transitionHeartsSession(heartsSession, { type: "select-pass", cardId: card.id });
    if (next === heartsSession && heartsPassSelectedCardIds.length >= 3) {
      heartsPassError = "Remove one card before choosing another.";
      return;
    }
    setHeartsSession(next);
    persistSavedHeartsRun();
  }

  function confirmHeartsPass() {
    if (!isHeartsSessionActive() || !heartsSession || heartsSession.phase !== "passing") return;
    if (heartsPassSelectedCardIds.length !== 3) {
      heartsPassError = "Choose exactly three cards to pass.";
      return;
    }
    const next = transitionHeartsSession(heartsSession, { type: "pass" });
    if (next === heartsSession) {
      heartsPassError = "Those cards could not be passed.";
      return;
    }
    openHeartsSession(next);
    persistSavedHeartsRun();
  }

  async function selectFullHandCard(card: Card) {
    if (!fullHand || fullHand.status === "complete" || fullHandIsReviewingTrick || spadesOpeningDecisionActive) {
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

  async function selectDummyCard(card: Card) {
    if (!fullHand || fullHand.status === "complete" || fullHandIsReviewingTrick || spadesOpeningDecisionActive) {
      return;
    }

    const now = Date.now();
    const isDoubleTap = lastFullHandTapCardId === card.id && now - lastFullHandTapAt < 450;

    dummySelectedCardId = card.id;
    lastFullHandTapCardId = card.id;
    lastFullHandTapAt = now;

    if (isDoubleTap && fullHand.dummyLegalCardIds?.includes(card.id)) {
      await playFullHandCard(card.id);
    }
  }

  async function playFullHandCard(cardId?: string) {
    const targetId = cardId || (isBridgeDummyTurn ? dummySelectedCardId : fullHandSelectedCard?.id);
    if (!fullHand || fullHandIsReviewingTrick || spadesOpeningDecisionActive || !targetId) {
      return;
    }
    
    if (isBridgeDummyTurn && (!fullHand.dummyLegalCardIds || !fullHand.dummyLegalCardIds.includes(targetId))) {
      return;
    }
    
    if (!isBridgeDummyTurn && !fullHandLegalCardIds.has(targetId)) {
      return;
    }

    fullHandError = "";
    const completedTrickCount = fullHand.completedTricks.length;

    try {
      if (isHeartsSessionActive() && heartsSession) {
        setHeartsSession(transitionHeartsSession(heartsSession, { type: "play-card", cardId: targetId }));
      } else if (isBridgeSessionHand() && bridgeSession) {
        setBridgeSession(transitionBridgeSession(bridgeSession, { type: "play-card", cardId: targetId }));
      } else if (isSpadesSessionHand() && spadesSession) {
        setSpadesSession(transitionSpadesSession(spadesSession, { type: "play-card", cardId: targetId }));
      } else if (isWhistSessionHand() && whistSession) {
        setWhistSession(transitionWhistSession(whistSession, { type: "play-card", cardId: targetId }));
      } else if (barbuSession) {
        setBarbuSession(transitionBarbuSession(barbuSession, { type: "play-card", cardId: targetId }));
      } else {
        const engine = typescriptHandEngine(fullHand.contract);
        if (!engine) throw new Error(`Unsupported hand: ${fullHand.contract}`);
        updateFullHandAfterPlayerPlay(engine.transition(fullHand, { type: "play-card", cardId: targetId }), completedTrickCount);
      }
      fullHandSelectedCardId = "";
      dummySelectedCardId = "";
      lastFullHandTapCardId = "";
      lastFullHandTapAt = 0;
      persistSavedPlayBarbuRun();
      persistSavedHeartsRun();
      persistSavedWhistRun();
      persistSavedSpadesRun();
      persistSavedBridgeRun();
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

    if (isHeartsSessionActive() && heartsSession) {
      setHeartsSession(transitionHeartsSession(heartsSession, { type: "next-trick" }));
    } else if (isBridgeSessionHand() && bridgeSession) {
      setBridgeSession(transitionBridgeSession(bridgeSession, { type: "next-trick" }));
    } else if (isSpadesSessionHand() && spadesSession) {
      setSpadesSession(transitionSpadesSession(spadesSession, { type: "next-trick" }));
    } else if (isWhistSessionHand() && whistSession) {
      setWhistSession(transitionWhistSession(whistSession, { type: "next-trick" }));
    } else if (barbuSession) {
      setBarbuSession(transitionBarbuSession(barbuSession, { type: "next-trick" }));
    } else {
      fullHandReviewTrickCount = 0;
    }
    fullHandSelectedCardId = "";
    dummySelectedCardId = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    persistSavedPlayBarbuRun();
    persistSavedHeartsRun();
    persistSavedWhistRun();
    persistSavedSpadesRun();
    persistSavedBridgeRun();
  }

  function continueWhistOpeningLeadPractice() {
    if (!whistOpeningLeadPracticeReview) {
      continueFullHandAfterTrick();
      return;
    }

    fullHandSelectedCardId = "";
    fullHandError = "";
    fullHandReviewTrickCount = 0;
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;

    if (whistOpeningLeadPracticeRound >= whistOpeningLeadPracticeMaxRounds - 1) {
      fullHand = null;
      activeTableTabs.whist = "practice";
      appView = "gameTable";
      return;
    }

    void startWhistPracticeHand(activePathStepId, whistOpeningLeadPracticeRound + 1);
  }

  function continueFullHandReview() {
    if (whistOpeningLeadPracticeReview) {
      continueWhistOpeningLeadPractice();
      return;
    }

    if (fullHandCardCountingPromptActive) {
      continueFullHandCardCountingAfterQuestion();
      return;
    }

    continueFullHandAfterTrick();
  }

  function toggleSpadesOpeningPanel() {
    if (!isSpadesSessionHand() || !spadesSession) return;
    setSpadesSession(transitionSpadesSession(spadesSession, { type: "toggle-bids" }));
    fullHandSelectedCardId = "";
    fullHandError = "";
    persistSavedSpadesRun();
  }

  function startSpadesOpeningPlay() {
    if (!isSpadesSessionHand() || !spadesSession) return;
    setSpadesSession(transitionSpadesSession(spadesSession, { type: "start-play" }));
    fullHandSelectedCardId = "";
    fullHandError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    persistSavedSpadesRun();
  }

  function startNoHeartsHand() {
    void startFullHand("No Hearts");
  }

  function startHeartsHand() {
    activeGameTable = "hearts";
    spadesPlayStarted = true;
    void startHeartsPassingPhase();
  }

  async function startWhistHand(options: { keepSession?: boolean } = {}) {
    if (whistDealPending) return;
    whistDealPending = true;
    try {
      const next = options.keepSession && whistSession
        ? transitionWhistSession(whistSession, { type: "next-hand", seed: usePracticeSeed() })
        : createWhistSession(usePracticeSeed(), whistSessionMode);
      openWhistSession(next);
      persistSavedWhistRun();
      await tick();
    } catch (error) {
      fullHandError = error instanceof Error ? error.message : "That hand could not be dealt.";
    } finally {
      whistDealPending = false;
    }
  }

  async function startSpadesHand(options: { keepSession?: boolean } = {}) {
    if (spadesDealPending) return;
    spadesDealPending = true;
    try {
      const next = options.keepSession && spadesSession
        ? transitionSpadesSession(spadesSession, { type: "next-hand", seed: usePracticeSeed() })
        : createSpadesSession(usePracticeSeed());
      openSpadesSession(next);
      persistSavedSpadesRun();
      await tick();
    } catch (error) {
      fullHandError = error instanceof Error ? error.message : "That hand could not be dealt.";
    } finally {
      spadesDealPending = false;
    }
  }

  async function startBridgeHand(options: { keepSession?: boolean } = {}) {
    if (bridgeDealPending) return;
    bridgeDealPending = true;
    try {
      const next = options.keepSession && bridgeSession
        ? transitionBridgeSession(bridgeSession, { type: "next-hand", seed: usePracticeSeed() })
        : createBridgeSession(usePracticeSeed());
      openBridgeSession(next);
      persistSavedBridgeRun();
      await tick();
    } catch (error) {
      bridgeAuctionError = error instanceof Error ? error.message : "That board could not be dealt.";
    } finally {
      bridgeDealPending = false;
    }
  }

  function advancePassedOutBridgeBoard() {
    if (!isBridgeSessionHand() || !bridgeSession || bridgeSession.view !== "bridgeAuction"
      || !bridgeAuctionStatus(bridgeSession.auctionCalls, bridgeDealerIndex()).passedOut) return;
    void startBridgeHand({ keepSession: true });
  }

  function selectBridgeAuctionBid(bidId: string) {
    selectBridgeAuctionCall(bidId);
  }

  function selectBridgeAuctionCall(call: BridgeCallOption) {
    if (!isBridgeSessionHand() || !bridgeSession) return;
    setBridgeSession(transitionBridgeSession(bridgeSession, { type: "select-call", call }));
    bridgeAuctionError = "";
    persistSavedBridgeRun();
  }

  function confirmBridgeAuction() {
    if (!isBridgeSessionHand() || !bridgeSession || bridgeSession.view !== "bridgeAuction") return;
    const complete = bridgeAuctionStatus(bridgeSession.auctionCalls, bridgeDealerIndex()).complete;
    const next = transitionBridgeSession(bridgeSession, { type: complete ? "start-play" : "make-call" });
    openBridgeSession(next);
    persistSavedBridgeRun();
  }

  function startPartnershipHand(options: { keepSession?: boolean } = {}) {
    return fullHandIsSpadesGame
      ? startSpadesHand(options)
      : fullHandIsBridgeGame
        ? startBridgeHand(options)
        : startWhistHand(options);
  }

  async function startSpadesPracticeHand(pathStepId = "", _focus: SpadesPracticeAction = "follow") {
    activeGameTable = "spades";
    activeTableTabs.spades = "practice";
    whistFullHandSource = "practice";
    activePathStepId = pathStepId;
    spadesPlayStarted = true;
    spadesOpeningPanel = "table";
    spadesBids = { ...defaultSpadesBidState };
    spadesMatchScores = { playerSide: 0, opponentSide: 0 };
    spadesBagScores = { playerSide: 0, opponentSide: 0 };
    spadesHandResults = [];
    await startFullHand("Spades");
    spadesBids = suggestedSpadesBidsForHand(fullHand);
  }

  async function startWhistPracticeHand(pathStepId = "", round = 0) {
    activeGameTable = "whist";
    activeTableTabs.whist = "practice";
    whistFullHandSource = "practice";
    activeWhistPracticeFocus = "lead";
    spadesPlayStarted = true;
    whistOpeningLeadPracticeRound = round;
    activePathStepId = pathStepId;
    whistSession = null;
    barbuSession = null;
    dominoHand = null;
    heartsPassingHand = null;
    fullHandSelectedCardId = "";
    fullHandError = "";
    fullHandReviewTrickCount = 0;
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    fullHand = buildWhistOpeningLeadPracticeHand(round);
    appView = "fullHand";
  }

  function startHeartsObjectLesson() {
    activeGameTable = "hearts";
    activePathStepId = "hearts-object";
    appView = "heartsLearnObject";
  }

  function continueHeartsObjectLesson() {
    completeHeartsPathStep("hearts-object");
    void startHeartsQueenDangerDrill("hearts-queen");
  }

  function completeHeartsPathStep(stepId = activePathStepId) {
    if (!stepId.startsWith("hearts-")) {
      return;
    }

    saveCourseProgress({ ...completedPathSteps, [stepId]: true });
  }

  function startHeartsPathStep(step: HeartsLearnPathStep) {
    const course = courseCatalog.find((item) => item.pathStepId === step.id && item.game === "hearts");

    if (course) {
      startCourse(course.id);
      return;
    }

    if (step.action === "object") {
      startHeartsObjectLesson();
      return;
    }

    if (step.action === "queen") {
      void startHeartsQueenDangerDrill(step.id);
      return;
    }

    if (step.action === "avoid") {
      void startHeartsAvoidHeartsDrill(step.id);
      return;
    }

    if (step.action === "pass") {
      void startHeartsPassPractice(step.id);
      return;
    }

    if (step.action === "break") {
      void startHeartsBreakHeartsDrill(step.id);
      return;
    }

    if (step.action === "moon") {
      void startHeartsStopMoonDrill(step.id);
      return;
    }

    void startHeartsScoreHandDrill(step.id);
  }

  function findNextHeartsPathStep(fromStepId = "") {
    const currentStepIndex = heartsUi.learnSteps.findIndex((step) => step.id === fromStepId);
    if (currentStepIndex >= 0 && completedPathSteps[fromStepId]) {
      const nextSequentialStep = heartsUi.learnSteps
        .slice(currentStepIndex + 1)
        .find((step) => !completedPathSteps[step.id]);

      if (nextSequentialStep) {
        return nextSequentialStep;
      }
    }

    return heartsUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  }

  function continueHeartsPath(fromStepId = activePathStepId) {
    const nextStep = findNextHeartsPathStep(fromStepId);

    if (!nextStep) {
      activeTableTabs.hearts = "learn";
      openHeartsTable();
      return;
    }

    startHeartsPathStep(nextStep);
  }

  function completeWhistPathStep(stepId = activePathStepId) {
    if (!stepId.startsWith("whist-")) {
      return;
    }

    saveCourseProgress({ ...completedPathSteps, [stepId]: true });
  }

  function startWhistObjectLesson() {
    activeGameTable = "whist";
    activePathStepId = "whist-object";
    appView = "whistLearnObject";
  }

  function continueWhistObjectLesson() {
    completeWhistPathStep("whist-object");
    startWhistFollowSuitDrill("whist-follow-suit");
  }

  function startWhistPathStep(step: WhistLearnPathStep) {
    const course = courseCatalog.find((item) => item.pathStepId === step.id && item.game === "whist");

    if (course) {
      startCourse(course.id);
      return;
    }

    practiceActionRegistry.whist[step.action]({ pathStepId: step.id, source: "course" });
  }

  function findNextWhistPathStep(fromStepId = "") {
    const currentStepIndex = whistUi.learnSteps.findIndex((step) => step.id === fromStepId);
    if (currentStepIndex >= 0 && completedPathSteps[fromStepId]) {
      const nextSequentialStep = whistUi.learnSteps
        .slice(currentStepIndex + 1)
        .find((step) => !completedPathSteps[step.id]);

      if (nextSequentialStep) {
        return nextSequentialStep;
      }
    }

    return whistUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  }

  function continueWhistPath(fromStepId = activePathStepId) {
    const nextStep = findNextWhistPathStep(fromStepId);

    if (!nextStep) {
      activeTableTabs.whist = "learn";
      openWhistTable();
      return;
    }

    startWhistPathStep(nextStep);
  }

  function completeSpadesPathStep(stepId = activePathStepId) {
    if (!stepId.startsWith("spades-")) {
      return;
    }

    saveCourseProgress({ ...completedPathSteps, [stepId]: true });
  }

  function startSpadesPathStep(step: SpadesLearnPathStep) {
    const course = courseCatalog.find((item) => item.pathStepId === step.id && item.game === "spades");

    if (course) {
      startCourse(course.id);
      return;
    }

    activePathStepId = step.id;
    void startSpadesPracticeHand(step.id, step.action === "object" ? "follow" : (step.action as SpadesPracticeAction));
  }

  function findNextSpadesPathStep(fromStepId = "") {
    const currentStepIndex = spadesUi.learnSteps.findIndex((step) => step.id === fromStepId);
    if (currentStepIndex >= 0 && completedPathSteps[fromStepId]) {
      const nextSequentialStep = spadesUi.learnSteps
        .slice(currentStepIndex + 1)
        .find((step) => !completedPathSteps[step.id]);

      if (nextSequentialStep) {
        return nextSequentialStep;
      }
    }

    return spadesUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  }

  function continueSpadesPath(fromStepId = activePathStepId) {
    const nextStep = findNextSpadesPathStep(fromStepId);

    if (!nextStep) {
      activeTableTabs.spades = "learn";
      openSpadesTable();
      return;
    }

    startSpadesPathStep(nextStep);
  }

  function completeBridgePathStep(stepId = activePathStepId) {
    if (!stepId.startsWith("bridge-")) {
      return;
    }

    saveCourseProgress({ ...completedPathSteps, [stepId]: true });
  }

  function startBridgePathStep(step: BridgeLearnPathStep) {
    activePathStepId = step.id;

    if (step.action === "bidding") {
      startBridgeBiddingDrill(step.id);
      return;
    }

    if (step.action === "defense") {
      startBridgeDefenseDrill(step.id);
      return;
    }

    startBridgeDeclarerDrill(step.id);
  }

  function findNextBridgePathStep(fromStepId = "") {
    const currentStepIndex = bridgeUi.learnSteps.findIndex((step) => step.id === fromStepId);
    if (currentStepIndex >= 0 && completedPathSteps[fromStepId]) {
      const nextSequentialStep = bridgeUi.learnSteps
        .slice(currentStepIndex + 1)
        .find((step) => !completedPathSteps[step.id]);

      if (nextSequentialStep) {
        return nextSequentialStep;
      }
    }

    return bridgeUi.learnSteps.find((step) => !completedPathSteps[step.id]);
  }

  function continueBridgePath(fromStepId = activePathStepId) {
    const nextStep = findNextBridgePathStep(fromStepId);

    if (!nextStep) {
      activeTableTabs.bridge = "learn";
      openBridgeTable();
      return;
    }

    startBridgePathStep(nextStep);
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
    openBarbuSession(createBarbuSession(usePracticeSeed()));
    persistSavedPlayBarbuRun();
  }

  function startPendingRunContract() {
    dispatchBarbuSession({ type: "start-hand" });
  }

  function applyDominoAction(action: DominoAction, reason = "") {
    if (!dominoHand) return;
    dominoError = "";
    try {
      if (barbuSession) {
        const next = transitionBarbuSession(barbuSession, action);
        if (next === barbuSession) return;
        setBarbuSession(next);
      } else {
        const next = dominoHandEngine.transition(dominoHand, action);
        if (next === dominoHand) return;
        dominoHand = next;
      }
      dominoSelectedCardId = "";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
      dominoLastMoveReason = reason;
      persistSavedPlayBarbuRun();
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

    if (barbuSession) {
      dispatchBarbuSession({ type: "next-contract" });
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
    if (fullHandIsBridgeGame && bridgeDealPending) return;
    if (fullHandIsSpadesGame && spadesDealPending) return;
    if (fullHandIsWhistGame && whistDealPending) return;
    if (!fullHand) {
      return;
    }

    if (isHeartsSessionActive() && heartsSession) {
      if (heartsDealPending) return;
      if (heartsSessionSettlement(heartsSession).complete) startHeartsHand();
      else void startHeartsPassingPhase({ keepSession: true });
      return;
    }

    if (fullHandIsPartnershipGame) {
      if (fullHandIsBridgeGame) {
        void startBridgeHand({ keepSession: true });
        return;
      }

      if (whistFullHandSource === "practice") {
        if (fullHandIsSpadesGame) {
          if (activePathStepId) {
            const completedStepId = activePathStepId;
            const completedSpadesCourse = courseCatalog.find(
              (course) => course.game === "spades" && course.pathStepId === completedStepId
            );

            if (completedSpadesCourse) {
              activeCourseId = completedSpadesCourse.id;
              activePathStepId = completedSpadesCourse.pathStepId;
              activeCourseStage = "review";
              appView = "courseContent";
              return;
            }

            completeSpadesPathStep(completedStepId);
            continueSpadesPath(completedStepId);
          } else {
            void startSpadesPracticeHand();
          }
        } else {
          void startWhistPracticeHand(activePathStepId);
        }
        return;
      }

      if (partnershipMatchIsComplete) {
        startPartnershipHand();
        return;
      }

      if (fullHandIsSpadesGame) {
        void startSpadesHand({ keepSession: true });
        return;
      }

      startPartnershipHand({ keepSession: true });
      return;
    }

    if (barbuSession) {
      dispatchBarbuSession({ type: "next-contract" });
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
    if (bridgeDealPending) return;
    if (fullHandIsSpadesGame && spadesDealPending) return;
    if (!fullHandReplayAllowed) return;
    if (fullHandIsWhistGame && whistDealPending) return;
    if (!fullHand) {
      return;
    }

    if (isHeartsSessionActive() && heartsSession) {
      if (heartsDealPending) return;
      openHeartsSession(transitionHeartsSession(heartsSession, { type: "replay" }));
      persistSavedHeartsRun();
      return;
    }

    if (isBridgeSessionHand() && bridgeSession) {
      openBridgeSession(transitionBridgeSession(bridgeSession, { type: "replay" }));
      persistSavedBridgeRun();
      return;
    }
    if (isSpadesSessionHand() && spadesSession) {
      openSpadesSession(transitionSpadesSession(spadesSession, { type: "replay" }));
      persistSavedSpadesRun();
      return;
    }
    if (isWhistSessionHand() && whistSession) {
      openWhistSession(transitionWhistSession(whistSession, { type: "replay" }));
      persistSavedWhistRun();
      return;
    }

    if (fullHandIsPartnershipGame) {
      if (fullHandIsBridgeGame) {
        startBridgeHand({ keepSession: true });
        return;
      }

      if (whistFullHandSource === "practice") {
        if (fullHandIsSpadesGame) {
          void startSpadesPracticeHand(activePathStepId);
        } else {
          void startWhistPracticeHand(activePathStepId);
        }
        return;
      }

      startPartnershipHand({ keepSession: true });
      return;
    }

    if (barbuSession) {
      dispatchBarbuSession({ type: "replay" });
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
    dummySelectedCardId = "";
    fullHandError = "";
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    persistSavedPlayBarbuRun();
  }

  function replayWeakestRunContract() {
    if (!fullHandRunWeakestContract) {
      return;
    }

    void startFullHand(fullHandRunWeakestContract.contract);
  }

  function seatTricksWonForTricks(tricks: CompletedHandTrick[]) {
    const totals = emptySeatPenalties();

    for (const trick of tricks) {
      const seat = seatByPlayerIndex[trick.winnerIndex];

      if (seat) {
        totals[seat] += 1;
      }
    }

    return totals;
  }

  function scoreSeatLabel(seat: Seat) {
    return seat === "Tutor" ? "Barbu" : seat;
  }

  function scoreSeatRunLabel(seat: Seat) {
    return seat === "You" ? "Your" : scoreSeatLabel(seat);
  }

  function scoreSeatResultLabel(seat: Seat) {
    return `${scoreSeatLabel(seat)} ${fullHandContractMeta.resultVerb}`;
  }

  function fullHandTrickIsWarning(trick: CompletedHandTrick | undefined) {
    return fullHandContractMeta.kind === "avoidance" && trick?.outcome === "captured_penalty";
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

  function heartsScorecardStandings(scores: Record<Seat, number>): RunStanding[] {
    const orderedScores = scoreSeats
      .map((seat) => ({ seat, score: scores[seat] }))
      .sort((left, right) => left.score - right.score);
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

  function heartsMoonThreatSeat(rawSeatPenalties: Record<Seat, number>) {
    const total = scoreSeats.reduce((sum, seat) => sum + (rawSeatPenalties[seat] ?? 0), 0);

    if (total <= 0 || total >= heartsHandPenaltyTotal) {
      return undefined;
    }

    return scoreSeats.find((seat) => rawSeatPenalties[seat] === total);
  }

  function heartsMoonResultText(shooter: Seat) {
    if (shooter === "You") {
      return "You shot the moon. This hand scores 0 for you and 26 for everyone else.";
    }

    return `${scoreSeatLabel(shooter)} shot the moon. This hand scores 0 for ${scoreSeatLabel(
      shooter
    )} and 26 for everyone else.`;
  }

  function heartsMoonThreatText() {
    if (!fullHandIsHeartsGame || !heartsCurrentMoonThreatSeat || fullHand?.status !== "in_progress") {
      return "";
    }

    if (heartsCurrentMoonThreatSeat === "You") {
      return " You have every point so far; the table will try to break the moon.";
    }

    return ` ${scoreSeatLabel(heartsCurrentMoonThreatSeat)} has every point so far; break the moon by making someone else take points.`;
  }

  function withHeartsMoonThreat(message: string) {
    return `${message}${heartsMoonThreatText()}`;
  }

  function heartsResultCopy(
    matchComplete: boolean,
    standings: RunStanding[],
    trigger: { seat: Seat; score: number } | undefined,
    moonShooter: Seat | undefined,
    handCount: number,
    playerPenalty: number,
    objective: string
  ) {
    const player = standings.find(standing => standing.seat === "You");
    const winner = standings[0];
    const winners = standings.filter(standing => standing.rank === 1);
    const winnerLabel = winners.map(standing => scoreSeatLabel(standing.seat)).join(" and ");
    const moonText = moonShooter ? heartsMoonResultText(moonShooter) : "";
    if (!player || !winner) return { heading: "Hearts hand complete", summary: "Low score wins.", winnerLabel };
    if (matchComplete && trigger) {
      const heading = player.rank === 1
        ? winners.length > 1 ? "You tied the match" : "You won Hearts"
        : `You finished ${formatOrdinal(player.rank)}`;
      const resultVerb = winners.length > 1 ? "tie" : winner.seat === "You" ? "win" : "wins";
      const result = `${scoreSeatLabel(trigger.seat)} reached ${trigger.score} points. ${winnerLabel} ${resultVerb} with ${winner.score}. You finished ${formatOrdinal(player.rank)} after ${handCount} ${handCount === 1 ? "hand" : "hands"}.`;
      return { heading, summary: moonText ? `${moonText} ${result}` : result, winnerLabel };
    }
    const heading = moonShooter
      ? moonShooter === "You" ? "You shot the moon" : `${scoreSeatLabel(moonShooter)} shot the moon`
      : player.rank === 1
        ? winners.length > 1 ? "You tied the table" : "You led the table"
        : `You finished ${formatOrdinal(player.rank)}`;
    return { heading, summary: moonText || `${objective}. You took ${formatPointCount(playerPenalty)}; ${scoreSeatLabel(winner.seat)} ${formatPointCount(winner.score)} leads the match.`, winnerLabel };
  }

  function heartsPlayerHandResult(kind: "best" | "worst", handResults: HeartsHandResult[]) {
    const results = [...handResults];

    if (!results.length) {
      return undefined;
    }

    return results.sort((left, right) => {
      const leftScore = left.seatPenalties.You ?? 0;
      const rightScore = right.seatPenalties.You ?? 0;

      return kind === "best"
        ? leftScore - rightScore || left.handNumber - right.handNumber
        : rightScore - leftScore || left.handNumber - right.handNumber;
    })[0];
  }

  function heartsHandResultLabel(result: HeartsHandResult) {
    const score = result.seatPenalties.You ?? 0;
    const moonText = result.moonShooter
      ? result.moonShooter === "You"
        ? " (shot moon)"
        : ` (${scoreSeatLabel(result.moonShooter)} shot moon)`
      : "";

    return `Hand ${result.handNumber}: ${score} ${score === 1 ? "point" : "points"}${moonText}`;
  }

  function runResultHeading(standings: RunStanding[]) {
    const player = standings.find((standing) => standing.seat === "You");

    if (!player) {
      return "Game complete";
    }

    if (player.rank === 1) {
      const tiedWinners = standings.filter((standing) => standing.rank === 1);
      return tiedWinners.length > 1 ? "You tied for 1st" : "You won the game";
    }

    return `You finished ${formatOrdinal(player.rank)}`;
  }

  function runResultSummary(standings: RunStanding[], contractsPlayed: number) {
    const leader = standings[0];
    const player = standings.find((standing) => standing.seat === "You");

    if (!leader || !player) {
      return `Game complete after ${contractsPlayed} contracts. Higher net score wins the table.`;
    }

    if (player.rank === 1) {
      return `You finished with ${formatSignedScore(player.score)} after ${contractsPlayed} contracts. Higher net score wins the table.`;
    }

    return `${scoreSeatLabel(leader.seat)} won with ${formatSignedScore(leader.score)}. You finished with ${formatSignedScore(
      player.score
    )} after ${contractsPlayed} contracts.`;
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

  function formatSignedScore(value: number) {
    return value > 0 ? `+${value}` : String(value);
  }

  function formatPointCount(value: number) {
    return `${value} ${value === 1 ? "point" : "points"}`;
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

  function runContractValueLabel(result: FullHandRunResult) {
    return formatContractValue(result.contract, result.seatPenalties.You ?? 0);
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

  function bridgeThumbCardClasses(card: Card) {
    const legalCardIds = isBridgeDummyTurn ? new Set(fullHand?.dummyLegalCardIds ?? []) : fullHandLegalCardIds;

    return {
      heart: card.suit === "H",
      legal: legalCardIds.has(card.id),
      illegal: !legalCardIds.has(card.id),
      selected: isBridgeDummyTurn ? dummySelectedCardId === card.id : fullHandSelectedCardId === card.id
    };
  }

  function spadesOpeningCardClasses(card: Card) {
    return {
      heart: card.suit === "H"
    };
  }

  function noLastTwoPhaseLabel(hand: FullHandState | null | undefined) {
    if (!hand || hand.contract !== "No Last Two") {
      return "";
    }
    if (hand.trickNumber >= 13) {
      return "Penalty trick";
    }
    if (hand.trickNumber === 12) {
      return "Penalty trick";
    }
    return "Setup trick";
  }

  function noLastTwoPhaseValue(hand: FullHandState | null | undefined) {
    if (!hand || hand.contract !== "No Last Two") {
      return "";
    }
    if (hand.trickNumber >= 13) {
      return "20 points";
    }
    if (hand.trickNumber === 12) {
      return "10 points";
    }
    return "0 points";
  }

  function fullHandCompletedTrickNumber(trick: CompletedHandTrick) {
    return fullHand ? fullHand.completedTricks.indexOf(trick) + 1 : 0;
  }

  function fullHandTrickHasTag(trick: CompletedHandTrick, tag: NonNullable<CompletedHandTrick["tacticalTags"]>[number]) {
    return (trick.tacticalTags ?? []).includes(tag);
  }

  function whistOpeningLeadPracticeFeedback(trick: CompletedHandTrick) {
    if (whistFullHandSource !== "practice" || activeWhistPracticeFocus !== "lead" || fullHandCompletedTrickNumber(trick) !== 1 || !fullHand) {
      return "";
    }

    const lead = trick.cards[0];
    if (!lead) {
      return "";
    }

    const leadCard = lead.card;
    const leadLabel = formatCardLabel(leadCard);
    const leadSuit = suitNameFromId(leadCard.suit).toLowerCase();
    const trumpSuit = whistTrumpSuitFromHandId(fullHand.id);
    const deal = whistOpeningLeadPracticeDealFor(whistOpeningLeadPracticeRound);
    const focusSuit = deal.focusSuit;
    const focusSuitLabel = suitNameFromId(focusSuit).toLowerCase();
    const winnerIsPlayerSide = trick.winnerIndex === 0 || trick.winnerIndex === 2;

    if (lead.seat !== "You") {
      return `${scoreSeatLabel(lead.seat)} opened ${leadLabel}. Follow suit, support Barbu, and count trump.`;
    }

    if (leadCard.suit === trumpSuit) {
      return `${leadLabel} opened trump. Here it spends control before inviting ${focusSuitLabel}.`;
    }

    if (leadCard.suit === focusSuit) {
      if (leadCard.id !== deal.recommendedLead) {
        return `${leadLabel} shows ${focusSuitLabel}. ${deal.explanation}`;
      }

      return deal.explanation;
    }

    if (rankValue(leadCard.rank) >= rankValue("J")) {
      return winnerIsPlayerSide
        ? `${leadLabel} opened strong ${leadSuit}, but the target invite was ${focusSuitLabel}.`
        : `${leadLabel} opened strong ${leadSuit}, hiding the ${focusSuitLabel} plan.`;
    }

    return winnerIsPlayerSide
      ? `${leadLabel} opened ${leadSuit}. Cleaner message: invite ${focusSuitLabel}.`
      : `${leadLabel} opened ${leadSuit}. Legal, but it does not invite ${focusSuitLabel}.`;
  }

  function fullHandTrickFeedback(trick: CompletedHandTrick) {
    const penaltyText = `${trick.penalty} ${trick.penalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;

    if (fullHandIsPartnershipGame) {
      const openingLeadFeedback = whistOpeningLeadPracticeFeedback(trick);
      if (openingLeadFeedback) {
        return openingLeadFeedback;
      }

      const winnerIsPlayerSide = trick.winnerIndex === 0 || trick.winnerIndex === 2;
      if (fullHandIsBridgeGame) {
        const winnerIsDeclarerSide = trick.winnerIndex % 2 === playerIndexBySeat[bridgeVisibleContract.declarer] % 2;

        return winnerIsDeclarerSide
          ? `${bridgeSeatLabel(trick.winner)} won for declarer. Count that toward the ${bridgeContractTarget} tricks needed for ${bridgeContractLabel}.`
          : `${bridgeSeatLabel(trick.winner)} won for the defense. Protect entries and look for the next sure trick.`;
      }

      const partnershipLabel = winnerIsPlayerSide ? "You + Barbu" : "Left + Right";

      if (fullHandTrickHasTag(trick, "trump_won")) {
        return winnerIsPlayerSide
          ? `${trick.winner} won with trump for ${partnershipLabel}. Good cut: your side took control.`
          : `${trick.winner} won with trump for ${partnershipLabel}. Count that trump as gone.`;
      }
      if (fullHandTrickHasTag(trick, "avoided_overtake")) {
        return `Barbu held the trick and you stayed under him. Good ${fullHand?.contract ?? "partnership"} play: do not fight your own partner.`;
      }
      if (fullHandTrickHasTag(trick, "partner_supported")) {
        return trick.winner === "You"
          ? "Barbu led the suit and you carried it home. Good third-hand support."
          : "Barbu's lead held for your side. Good: the partnership kept control.";
      }
      if (fullHandTrickHasTag(trick, "partner_held")) {
        return "Barbu held the trick for your partnership. Save strength and watch what suit he led.";
      }

      return winnerIsPlayerSide
        ? `${trick.winner} won the trick for ${partnershipLabel}. Build toward odd tricks above six.`
        : `${trick.winner} won the trick for ${partnershipLabel}. Regain lead or return Barbu's suit.`;
    }

    if (fullHandIsHeartsGame) {
      if (trick.outcome === "captured_penalty") {
        if (fullHandTrickHasTag(trick, "opponent_loaded_player_trick")) {
          return withHeartsMoonThreat(fullHandTrickHasTag(trick, "queen_spades_moved")
            ? `You held the trick and the table loaded the queen of spades into it. That is 13 danger points plus any hearts.`
            : `You held the trick and the table loaded hearts into it. The lead created pressure; look for a lower exit next time.`);
        }
        if (fullHandTrickHasTag(trick, "queen_spades_moved")) {
          return withHeartsMoonThreat(`You captured the queen of spades and took ${penaltyText}. In Hearts, that one card is the big danger.`);
        }
        if (fullHandTrickHasTag(trick, "hearts_moved")) {
          return withHeartsMoonThreat(`You captured hearts and took ${penaltyText}. Once hearts are broken, every heart can become cargo.`);
        }
        return withHeartsMoonThreat(`You won the trick and took ${penaltyText}. Try to stay below the current winner when danger can enter.`);
      }
      if (trick.outcome === "avoided_penalty") {
        if (fullHandTrickHasTag(trick, "queen_spades_moved")) {
          return withHeartsMoonThreat(`${trick.winner} took the queen of spades. Good: it moved, but not into your score.`);
        }
        if (fullHandTrickHasTag(trick, "hearts_moved")) {
          return withHeartsMoonThreat(`${trick.winner} took ${penaltyText}. Good: the hearts moved away from you.`);
        }
        return withHeartsMoonThreat(`${trick.winner} took ${penaltyText}. Good: you stayed out of the loaded trick.`);
      }
      if (trick.outcome === "won_clean_trick") {
        return withHeartsMoonThreat(fullHandTrickHasTag(trick, "pressure_lead")
          ? "You won a clean trick after pressure from the lead. No points, but watch whether this gives you the next lead."
          : "You won a clean trick. No points moved, but Hearts is still about avoiding the loaded tricks.");
      }
      return withHeartsMoonThreat(fullHandTrickHasTag(trick, "void_discard")
        ? `${trick.winner} won a clean trick. Good: your void discard could not take the led suit.`
        : `${trick.winner} won a clean trick. No hearts or queen of spades moved.`);
    }

    if (fullHand?.contract === "Hearts Trumps") {
      if (fullHandTrickHasTag(trick, "overtrumped")) {
        return trick.winner === "You"
          ? `You overtrumped and banked ${penaltyText}. Good: your heart beat the previous trump.`
          : `${trick.winner} overtrumped and banked ${penaltyText}. A higher heart took control.`;
      }
      if (fullHandTrickHasTag(trick, "trump_won")) {
        return trick.winner === "You"
          ? `Your heart won the trick and banked ${penaltyText}. Good: trumps beat the led suit.`
          : `${trick.winner} won with a heart and banked ${penaltyText}. Count which trumps are still out.`;
      }
      return trick.winner === "You"
        ? `You won the trick and banked ${penaltyText}. Good: you took control without needing a trump.`
        : `${trick.winner} won the trick and banked ${penaltyText}. Look for a heart or higher control next time.`;
    }

    if (fullHand?.contract === "No Last Two") {
      const trickNumber = fullHandCompletedTrickNumber(trick);
      if (fullHandTrickHasTag(trick, "setup_trick")) {
        return trick.winner === "You"
          ? "You won a setup trick. No score yet; use these tricks to shed awkward high cards."
          : `${trick.winner} won a setup trick. No score yet; the final two tricks are still ahead.`;
      }
      return trick.winner === "You"
        ? `You won trick ${trickNumber} and took ${penaltyText}. This is one of the final two.`
        : `${trick.winner} won trick ${trickNumber} and took ${penaltyText}. Good: you stayed out of the final-two penalty.`;
    }

    if (trick.outcome === "captured_penalty") {
      if (fullHandTrickHasTag(trick, "danger_card_moved")) {
        return `You won the trick and took ${penaltyText}. Penalty cards moved, and your card held the trick.`;
      }
      return `You won the trick and took ${penaltyText}. Risky: your card became the highest card in the led suit.`;
    }
    if (trick.outcome === "avoided_penalty") {
      if (fullHandTrickHasTag(trick, "void_discard")) {
        return `${trick.winner} won the trick and took ${penaltyText}. Good: you were void, so your discard stayed clear.`;
      }
      if (fullHandTrickHasTag(trick, "danger_card_moved")) {
        return `${trick.winner} won the trick and took ${penaltyText}. Good: you kept below the danger.`;
      }
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
      if (fullHandTrickHasTag(trick, "followed_suit")) {
        return `You followed suit and won a clean trick. Legal, but check whether ${fullHandPenaltyPlural} can still enter later.`;
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
    if (fullHandTrickHasTag(trick, "void_discard")) {
      return `${trick.winner} won a clean trick. Good: your void discard could not take the led suit.`;
    }
    return `${trick.winner} won a clean trick. No ${fullHandPenaltyPlural} moved, so you stayed clear.`;
  }

  function fullHandResultHeading(hand: FullHandState) {
    if (hand.bridgeContract) {
      const result = bridgeHandResultFor(hand, hand.bridgeBoardNumber ?? bridgeHandResults.length + 1);
      return `${hand.bridgeContract.label} ${result?.made ? "made" : "defeated"}`;
    }

    if (hand.contract === "Hearts Trumps") {
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

  function fullHandResultText(hand: FullHandState, bridgeScores: { ns: number; ew: number }) {
    if (hand.bridgeContract) {
      const result = bridgeHandResultFor(hand, hand.bridgeBoardNumber ?? bridgeHandResults.length + 1)!;
      const contract = hand.bridgeContract;
      return `Auction: ${bridgeAuctionSummary(hand.bridgeAuction ?? [])}. Contract: ${contract.label} by ${bridgeSeatLabel(contract.declarer)}; ${bridgeSeatLabel(contract.dummy)} was dummy. ${bridgeOpeningLeadSummary(hand)} Declarer side won ${result.tricks} tricks; defenders won ${result.defenders}. ${
        result.made ? `Contract made for ${formatSignedScore(result.score)}.`
          : `Declarer needed ${contract.target} tricks, so the defense defeated the contract.`
      } Duplicate score: NS ${formatSignedScore(bridgeScores.ns)}, EW ${formatSignedScore(bridgeScores.ew)}.`;
    }

    if (hand.contract === "Hearts Trumps") {
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
    if (contractScoreMeta(hand.contract).kind !== "avoidance") {
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
    if (contractScoreMeta(hand.contract).kind !== "avoidance") {
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

  function dominoResultHeading(state: DominoHandState) {
    const playerRank = state.outOrder.indexOf("You") + 1;

    if (playerRank === 1) {
      return "You went out first";
    }
    if (playerRank > 0) {
      return `You finished ${formatOrdinal(playerRank)}`;
    }
    return "Domino complete";
  }

  function dominoResultText(state: DominoHandState) {
    const playerScore = state.scores[2] ?? 0;
    const leader = scoreSeats
      .map((seat, index) => ({ seat, score: state.scores[index] ?? 0 }))
      .sort((left, right) => right.score - left.score)[0];

    if (!leader || leader.seat === "You") {
      return `You scored ${formatSignedScore(playerScore)}. Domino rewards the first players to empty their hands.`;
    }

    return `${scoreSeatLabel(leader.seat)} led Domino with ${formatSignedScore(leader.score)}. You scored ${formatSignedScore(playerScore)}.`;
  }

  function dominoSuitLabel(index: number) {
    return ["Clubs", "Diamonds", "Hearts", "Spades"][index] ?? "Suit";
  }

  function dominoStartRank(state?: DominoHandState) {
    return state?.startRank ?? "7";
  }

  function dominoLaneText(lane: Card[], startRank = "7") {
    return lane.length ? lane.map(formatCardLabel).join(" ") : `Open with ${startRank}`;
  }

  function dominoOutOrderText(state: DominoHandState) {
    return state.outOrder.length ? state.outOrder.map((seat) => scoreSeatLabel(seat as Seat)).join(" ") : "No one out";
  }

  function dominoMoveExplanation(state: DominoHandState, card: Card | undefined) {
    if (!card) {
      if (state.legalCardIds.length === 0) {
        return "You are blocked. Pass to wait for a lane to open.";
      }

      return `Legal cards are highlighted. Next out: ${formatSignedScore(dominoNextOutScore)}.`;
    }

    if (!dominoLegalCardIds.has(card.id)) {
      return dominoIllegalMoveExplanation(state, card);
    }

    const lane = state.layout[suitIndex(card.suit)];
    const unlockedCards = dominoCardsUnlockedByPlacement(state, card);
    const finishText =
      state.playerHand.length === 1
        ? ` Out for ${formatSignedScore(dominoNextOutScore)}.`
        : "";
    const unlockText = unlockedCards.length ? ` Opens ${unlockedCards.map(formatCardLabel).join(" or ")} later.` : "";

    if (lane.length === 0) {
      return `${formatCardLabel(card)} opens ${suitNames[card.suit]} from ${dominoStartRank(state)}.${unlockText}${finishText}`;
    }

    const direction = dominoExtensionDirection(lane, card);
    return `${formatCardLabel(card)} extends ${suitNames[card.suit]} ${direction}.${unlockText}${finishText}`;
  }

  function dominoIllegalMoveExplanation(state: DominoHandState, card: Card) {
    const lane = state.layout[suitIndex(card.suit)];

    if (lane.length === 0) {
      return `${formatCardLabel(card)} is blocked. Closed suits start with ${dominoStartRank(state)}.`;
    }

    return `${formatCardLabel(card)} is blocked. ${suitNames[card.suit]} needs the next lower or higher card.`;
  }

  function dominoCardsUnlockedByPlacement(state: DominoHandState, card: Card) {
    const nextLayout = state.layout.map((lane) => [...lane]);
    const lane = nextLayout[suitIndex(card.suit)];
    lane.push(card);
    lane.sort((left, right) => rankValue(left.rank) - rankValue(right.rank));

    return state.playerHand
      .filter((heldCard) => heldCard.id !== card.id && heldCard.suit === card.suit)
      .filter((heldCard) => isLegalDominoCardOnLayout(nextLayout, heldCard, dominoStartRank(state)));
  }

  function isLegalDominoCardOnLayout(layout: Card[][], card: Card, startRank = "7") {
    const lane = layout[suitIndex(card.suit)];

    if (lane.length === 0) {
      return card.rank === startRank;
    }

    const low = Math.min(...lane.map((played) => rankValue(played.rank)));
    const high = Math.max(...lane.map((played) => rankValue(played.rank)));
    const rank = rankValue(card.rank);

    return rank === low - 1 || rank === high + 1;
  }

  function dominoExtensionDirection(lane: Card[], card: Card) {
    const low = Math.min(...lane.map((played) => rankValue(played.rank)));
    const high = Math.max(...lane.map((played) => rankValue(played.rank)));
    const rank = rankValue(card.rank);

    if (rank === low - 1) {
      return "downward";
    }
    if (rank === high + 1) {
      return "upward";
    }
    return "by one rank";
  }

  function dominoCardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: dominoLegalCardIds.has(card.id),
      illegal: !dominoLegalCardIds.has(card.id),
      selected: dominoSelectedCardId === card.id
    };
  }

  function runResultForContract(contract: FullHandContract) {
    return fullHandRunResults.find((result) => result.contract === contract);
  }

  function scorecardCellLabel(contract: FullHandContract, seat: Seat) {
    const score = scorecardCellScore(contract, seat);

    if (score !== undefined) {
      return formatSignedScore(score);
    }

    return contract === pendingRunContract || fullHand?.contract === contract ? "Now" : "-";
  }

  function scorecardCellScore(contract: FullHandContract, seat: Seat) {
    const result = runResultForContract(contract);

    if (!result) {
      return undefined;
    }

    return contractRunScore(contract, result.seatPenalties[seat] ?? 0);
  }

  function scorecardRowState(contract: FullHandContract) {
    if (runResultForContract(contract)) {
      return "Complete";
    }
    if (contract === pendingRunContract || fullHand?.contract === contract) {
      return "Now";
    }
    return "Pending";
  }

  async function startDailyDrill(pathStepId = "") {
    activePathStepId = pathStepId;
    activeDrillFocusContract = "";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = "Quick drill";
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

    if (target.game === "hearts") {
      practiceActionRegistry.hearts[target.action]({ pathStepId: course.pathStepId, source: "course" });
      return;
    }

    if (target.game === "whist") {
      practiceActionRegistry.whist[target.action]({ pathStepId: course.pathStepId, source: "course" });
      return;
    }

    practiceActionRegistry.spades[target.action]({ pathStepId: course.pathStepId, source: "course" });
  }

  async function startGeneratedDrill() {
    await startDailyDrill("generated-drill");
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

  function loadGeneratedHeartsPracticeSteps(seed: number, focus: HeartsPracticeFocus) {
    return generateHeartsPracticeSet(seed, focus).scenarios.map(drillStepFromGeneratedScenario);
  }

  async function startGeneratedHeartsMicroDrill(
    focus: HeartsPracticeFocus,
    title: string,
    pathStepId = ""
  ) {
    const seed = usePracticeSeed();
    const candidates = await loadGeneratedHeartsPracticeSteps(seed, focus);
    const orderedCandidates = orderPracticePool(candidates, seed);

    startHeartsMicroDrillSession(orderedCandidates, title, pathStepId);
  }

  async function startHeartsAvoidHeartsDrill(pathStepId = "") {
    await startGeneratedHeartsMicroDrill("avoid-hearts", "Hearts practice: avoid hearts", pathStepId);
  }

  async function startHeartsFirstTrickDrill(pathStepId = "") {
    await startGeneratedHeartsMicroDrill("first-trick", "Hearts practice: first trick", pathStepId);
  }

  async function startHeartsQueenDangerDrill(pathStepId = "") {
    await startGeneratedHeartsMicroDrill("queen-danger", "Hearts practice: Queen of Spades danger", pathStepId);
  }

  async function startHeartsQuickDrill() {
    const seed = usePracticeSeed();
    const steps = heartsPracticeTopics.map((topic, index) =>
      selectGeneratedDrillCandidate(loadGeneratedHeartsPracticeSteps(seed, topic), seed + index * 11, [])
    );
    const offset = seed % steps.length;

    activeGameTable = "hearts";
    activePathStepId = "";
    activeDrillFocusContract = "Hearts";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = "Hearts quick drill";
    activeDrillSteps = [...steps.slice(offset), ...steps.slice(0, offset)];
    resetDrillDecision();
    appView = "drill";
  }

  function startHeartsMicroDrillSession(steps: DrillStep[], title: string, pathStepId = "") {
    activeGameTable = "hearts";
    activePathStepId = pathStepId;
    activeDrillFocusContract = "Hearts";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = title;
    activeDrillSteps = steps;
    resetDrillDecision();
    appView = "drill";
  }

  function orderPracticePool(steps: DrillStep[], seed: number) {
    if (steps.length <= 1) {
      return steps;
    }

    const offset = seed % steps.length;
    return [...steps.slice(offset), ...steps.slice(0, offset)];
  }

  async function startHeartsBreakHeartsDrill(pathStepId = "") {
    await startGeneratedHeartsMicroDrill("break-hearts", "Hearts practice: break hearts", pathStepId);
  }

  async function startHeartsStopMoonDrill(pathStepId = "") {
    await startGeneratedHeartsMicroDrill("stop-moon", "Hearts practice: stop the moon", pathStepId);
  }

  async function startHeartsScoreHandDrill(pathStepId = "") {
    await startGeneratedHeartsMicroDrill("score-hand", "Hearts practice: score a hand", pathStepId);
  }

  function replayHeartsPracticeDrill() {
    if (drillSetTitle === "Hearts quick drill") {
      void startHeartsQuickDrill();
      return;
    }

    void startHeartsAvoidHeartsDrill();
  }

  function startWhistPracticeSession(focus: WhistPracticeAction, steps: DrillStep[], title: string, pathStepId = "") {
    activeGameTable = "whist";
    activeTableTabs.whist = "practice";
    activeWhistPracticeFocus = focus;
    activePathStepId = pathStepId;
    activeDrillFocusContract = "Whist";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = title;
    activeDrillSteps = orderPracticePool(steps, usePracticeSeed());
    resetDrillDecision();
    appView = "drill";
  }

  function startWhistOpeningLeadDrill(pathStepId = "") {
    void startWhistPracticeHand(pathStepId);
  }

  function startWhistOpeningLeadLesson(pathStepId = "") {
    startWhistPracticeSession("lead", whistOpeningLeadLessonPool, "Whist lesson: opening leads", pathStepId);
  }

  function startWhistFollowSuitDrill(pathStepId = "") {
    startWhistPracticeSession("follow", whistFollowSuitDrillPool, "Whist practice: follow suit", pathStepId);
  }

  function startWhistTrumpOrDiscardDrill(pathStepId = "") {
    startWhistPracticeSession("trump", whistTrumpOrDiscardDrillPool, "Whist practice: trump or discard", pathStepId);
  }

  function startWhistThirdHandHighDrill(pathStepId = "") {
    startWhistPracticeSession("third", whistThirdHandHighDrillPool, "Whist practice: third hand high", pathStepId);
  }

  function startWhistReturnPartnerSuitDrill(pathStepId = "") {
    startWhistPracticeSession("return", whistReturnPartnerSuitDrillPool, "Whist practice: return partner's suit", pathStepId);
  }

  function startWhistOddTrickDrill(pathStepId = "") {
    startWhistPracticeSession("odd", whistOddTrickDrillPool, "Whist practice: count odd tricks", pathStepId);
  }

  function replayWhistPracticeDrill() {
    switch (activeWhistPracticeFocus) {
      case "lead":
        startWhistOpeningLeadDrill();
        return;
      case "trump":
        startWhistTrumpOrDiscardDrill();
        return;
      case "third":
        startWhistThirdHandHighDrill();
        return;
      case "return":
        startWhistReturnPartnerSuitDrill();
        return;
      case "odd":
        startWhistOddTrickDrill();
        return;
      case "follow":
      default:
        startWhistFollowSuitDrill();
    }
  }

  function startSpadesPracticeSession(focus: SpadesPracticeAction, steps: DrillStep[], title: string, pathStepId = "") {
    activeGameTable = "spades";
    activeTableTabs.spades = "practice";
    activeSpadesPracticeFocus = focus;
    activePathStepId = pathStepId;
    activeDrillFocusContract = "Spades";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = title;
    activeDrillSteps = orderPracticePool(steps, usePracticeSeed());
    resetDrillDecision();
    appView = "drill";
  }

  function startSpadesFollowSuitDrill(pathStepId = "") {
    startSpadesPracticeSession("follow", spadesFollowSuitDrillPool, "Spades practice: follow suit", pathStepId);
  }

  function startSpadesTrumpOrDiscardDrill(pathStepId = "") {
    startSpadesPracticeSession("trump", spadesTrumpOrDiscardDrillPool, "Spades practice: trump or discard", pathStepId);
  }

  function startSpadesBidBooksDrill(pathStepId = "") {
    startSpadesPracticeSession("bid", spadesBidBooksDrillPool, "Spades practice: bid books", pathStepId);
  }

  function startSpadesAvoidBagsDrill(pathStepId = "") {
    startSpadesPracticeSession("bags", spadesAvoidBagsDrillPool, "Spades practice: avoid bags", pathStepId);
  }

  function replaySpadesPracticeDrill() {
    switch (activeSpadesPracticeFocus) {
      case "trump":
        startSpadesTrumpOrDiscardDrill();
        return;
      case "bid":
        startSpadesBidBooksDrill();
        return;
      case "bags":
        startSpadesAvoidBagsDrill();
        return;
      case "follow":
      default:
        startSpadesFollowSuitDrill();
    }
  }

  function startBridgePracticeSession(focus: BridgePracticeAction, steps: DrillStep[], title: string, pathStepId = "") {
    activeGameTable = "bridge";
    activeTableTabs.bridge = "practice";
    activeBridgePracticeFocus = focus;
    activePathStepId = pathStepId;
    activeDrillFocusContract = "Bridge";
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = title;
    activeDrillSteps = orderPracticePool(steps, usePracticeSeed());
    resetDrillDecision();
    appView = "drill";
  }

  function startBridgeBiddingDrill(pathStepId = "") {
    activeGameTable = "bridge";
    activeTableTabs.bridge = "practice";
    activeBridgePracticeFocus = "bidding";
    activePathStepId = pathStepId;
    bridgeBiddingPracticeIndex = 0;
    bridgeBiddingSelectedCall = bridgeBiddingPracticeSteps[0]?.correctCall ?? "Pass";
    bridgeBiddingCheckedCall = "";
    bridgeBiddingPracticeResults = [];
    appView = "bridgeBiddingPractice";
  }

  function startBridgeDeclarerDrill(pathStepId = "") {
    startBridgePracticeSession("declarer", bridgeDeclarerDrillPool, "Bridge practice: declarer play", pathStepId);
  }

  function startBridgeDefenseDrill(pathStepId = "") {
    startBridgePracticeSession("defense", bridgeDefenseDrillPool, "Bridge practice: defense", pathStepId);
  }

  function selectBridgeBiddingPracticeCall(call: BridgeCallOption) {
    if (bridgeBiddingCheckedCall) {
      return;
    }

    bridgeBiddingSelectedCall = call;
  }

  function checkBridgeBiddingPractice() {
    if (bridgeBiddingCheckedCall) {
      return;
    }

    const step = currentBridgeBiddingPractice;
    bridgeBiddingCheckedCall = bridgeBiddingSelectedCall;
    bridgeBiddingPracticeResults = [
      ...bridgeBiddingPracticeResults,
      {
        id: step.id,
        selectedCall: bridgeBiddingSelectedCall,
        correctCall: step.correctCall,
        clean: bridgeBiddingSelectedCall === step.correctCall
      }
    ];
  }

  function nextBridgeBiddingPracticeDecision() {
    if (!bridgeBiddingCheckedCall) {
      return;
    }

    if (bridgeBiddingPracticeIsLast) {
      if (activePathStepId === "bridge-bidding") {
        completeBridgePathStep("bridge-bidding");
      }
      openBridgeTable();
      activeTableTabs.bridge = "practice";
      return;
    }

    bridgeBiddingPracticeIndex += 1;
    bridgeBiddingSelectedCall = bridgeBiddingPracticeSteps[bridgeBiddingPracticeIndex]?.correctCall ?? "Pass";
    bridgeBiddingCheckedCall = "";
  }

  function replayBridgePracticeDrill() {
    switch (activeBridgePracticeFocus) {
      case "bidding":
        startBridgeBiddingDrill();
        return;
      case "defense":
        startBridgeDefenseDrill();
        return;
      case "declarer":
      default:
        startBridgeDeclarerDrill();
    }
  }

  async function startHeartsPassPractice(pathStepId = "") {
    activeGameTable = "hearts";
    activePathStepId = pathStepId;
    heartsPassPracticeBaseSeed = usePracticeSeed();
    heartsPassPracticeStepIndex = 0;
    await loadHeartsPassPracticeStep();
    appView = "heartsPassPractice";
  }

  async function loadHeartsPassPracticeStep() {
    const seed = heartsPassPracticeBaseSeed + heartsPassPracticeStepIndex;
    heartsPassPracticeSelectedCardIds = [];
    heartsPassPracticeChecked = false;
    heartsPassPracticeError = "";

    heartsPassPractice = generateHeartsPassPractice(seed);
  }

  async function nextHeartsPassPracticeStep() {
    if (heartsPassPracticeIsLastStep) {
      if (activePathStepId === "hearts-pass") {
        const course = courseCatalog.find((item) => item.pathStepId === activePathStepId && item.game === "hearts");

        if (course) {
          activeCourseId = course.id;
          activeCourseStage = "review";
          appView = "courseContent";
        } else {
          continueHeartsPath();
        }
      } else {
        openHeartsTable();
      }
      return;
    }

    heartsPassPracticeStepIndex += 1;
    await loadHeartsPassPracticeStep();
  }

  function toggleHeartsPassPracticeCard(card: Card) {
    heartsPassPracticeError = "";

    if (heartsPassPracticeSelectedCardIds.includes(card.id)) {
      heartsPassPracticeSelectedCardIds = heartsPassPracticeSelectedCardIds.filter((cardId) => cardId !== card.id);
      heartsPassPracticeChecked = false;
      return;
    }

    if (heartsPassPracticeSelectedCardIds.length >= 3) {
      heartsPassPracticeError = "Remove one card before choosing another.";
      return;
    }

    heartsPassPracticeSelectedCardIds = [...heartsPassPracticeSelectedCardIds, card.id];
    heartsPassPracticeChecked = false;
  }

  function checkHeartsPassPractice() {
    if (!heartsPassPracticeCanCheck) {
      heartsPassPracticeError = "Choose exactly three cards to pass.";
      return;
    }

    heartsPassPracticeError = "";
    heartsPassPracticeChecked = true;

    if (activePathStepId === "hearts-pass" && !courseCatalog.some((course) => course.pathStepId === activePathStepId)) {
      completeHeartsPathStep("hearts-pass");
    }
  }

  const practiceActionRegistry: PracticeActionRegistry = {
    barbu: {
      quick: () => void startDailyDrill(),
      fixed: () => {
        activeTableTabs.barbu = "practice";
      },
      domino: () => void startDominoPracticeHand()
    },
    hearts: {
      quick: () => void startHeartsQuickDrill(),
      pass: ({ pathStepId } = {}) => void startHeartsPassPractice(pathStepId),
      first: ({ pathStepId } = {}) => void startHeartsFirstTrickDrill(pathStepId),
      avoid: ({ pathStepId } = {}) => void startHeartsAvoidHeartsDrill(pathStepId),
      queen: ({ pathStepId } = {}) => void startHeartsQueenDangerDrill(pathStepId),
      break: ({ pathStepId } = {}) => void startHeartsBreakHeartsDrill(pathStepId),
      moon: ({ pathStepId } = {}) => void startHeartsStopMoonDrill(pathStepId),
      score: ({ pathStepId } = {}) => void startHeartsScoreHandDrill(pathStepId)
    },
    whist: {
      lead: ({ pathStepId, source } = {}) => {
        if (source === "course") {
          startWhistOpeningLeadLesson(pathStepId);
          return;
        }

        startWhistOpeningLeadDrill(pathStepId);
      },
      follow: ({ pathStepId } = {}) => startWhistFollowSuitDrill(pathStepId),
      trump: ({ pathStepId } = {}) => startWhistTrumpOrDiscardDrill(pathStepId),
      third: ({ pathStepId } = {}) => startWhistThirdHandHighDrill(pathStepId),
      return: ({ pathStepId } = {}) => startWhistReturnPartnerSuitDrill(pathStepId),
      odd: ({ pathStepId } = {}) => startWhistOddTrickDrill(pathStepId)
    },
    spades: {
      follow: ({ pathStepId } = {}) => startSpadesFollowSuitDrill(pathStepId),
      trump: ({ pathStepId } = {}) => startSpadesTrumpOrDiscardDrill(pathStepId),
      bid: ({ pathStepId } = {}) => startSpadesBidBooksDrill(pathStepId),
      bags: ({ pathStepId } = {}) => startSpadesAvoidBagsDrill(pathStepId)
    },
    bridge: {
      bidding: ({ pathStepId } = {}) => startBridgeBiddingDrill(pathStepId),
      declarer: ({ pathStepId } = {}) => startBridgeDeclarerDrill(pathStepId),
      defense: ({ pathStepId } = {}) => startBridgeDefenseDrill(pathStepId)
    }
  };

  const barbuPracticeActions = createPracticePanelActions(practiceActionRegistry.barbu);
  const heartsPracticeActions = createPracticePanelActions(practiceActionRegistry.hearts);
  const whistPracticeActions = createPracticePanelActions(practiceActionRegistry.whist);
  const spadesPracticeActions = createPracticePanelActions(practiceActionRegistry.spades);
  const bridgePracticeActions = createPracticePanelActions(practiceActionRegistry.bridge);

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

    const outcome = buildDrillOutcomeKey(selected);
    const reason = buildDrillReasonKey(selected, outcome);

    drillCheckedCardId = selected.id;
    drillResults = [
      ...drillResults,
      {
        contract: currentDrill.contract,
        cardLabel: selected.label,
        outcome,
        reason,
        clean: cleanDrillOutcomes.includes(outcome)
      }
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
    const completedPathPracticeTable = activePathStepId === "generated-drill" && completedPracticeTableSession;
    const completedHeartsPathStepId = activePathStepId.startsWith("hearts-") ? activePathStepId : "";
    const completedWhistPathStepId = activePathStepId.startsWith("whist-") ? activePathStepId : "";
    const completedSpadesPathStepId = activePathStepId.startsWith("spades-") ? activePathStepId : "";
    const completedBridgePathStepId = activePathStepId.startsWith("bridge-") ? activePathStepId : "";
    const completedHeartsCourse = courseCatalog.find(
      (course) => course.game === "hearts" && course.pathStepId === completedHeartsPathStepId
    );
    const completedWhistCourse = courseCatalog.find((course) => course.game === "whist" && course.pathStepId === completedWhistPathStepId);
    const completedSpadesCourse = courseCatalog.find(
      (course) => course.game === "spades" && course.pathStepId === completedSpadesPathStepId
    );

    try {
      saveCompletedDrillSession();
      if (completedPathPracticeTable) {
        saveCourseProgress({ ...completedPathSteps, "generated-drill": true });
      } else if (completedHeartsPathStepId && !completedHeartsCourse) {
        completeHeartsPathStep(completedHeartsPathStepId);
      } else if (completedWhistPathStepId && !completedWhistCourse) {
        completeWhistPathStep(completedWhistPathStepId);
      } else if (completedSpadesPathStepId && !completedSpadesCourse) {
        completeSpadesPathStep(completedSpadesPathStepId);
      } else if (completedBridgePathStepId) {
        completeBridgePathStep(completedBridgePathStepId);
      }
    } catch {
      // The result screen should still open if local storage is unavailable.
    }

    if (completedHeartsCourse) {
      activeCourseId = completedHeartsCourse.id;
      activePathStepId = completedHeartsCourse.pathStepId;
      activeCourseStage = "review";
      appView = "courseContent";
      return;
    }

    if (completedWhistCourse) {
      activeCourseId = completedWhistCourse.id;
      activePathStepId = completedWhistCourse.pathStepId;
      activeCourseStage = "review";
      appView = "courseContent";
      return;
    }

    if (completedSpadesCourse) {
      activeCourseId = completedSpadesCourse.id;
      activePathStepId = completedSpadesCourse.pathStepId;
      activeCourseStage = "review";
      appView = "courseContent";
      return;
    }

    if (completedPathPracticeTable) {
      openPathReview();
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

  function markPracticeTableComplete() {
    saveCourseProgress({ ...completedPathSteps, "generated-drill": true });
    activeTableTabs.barbu = barbuUi.table.defaultTab;

    if (completedPathSteps.review) {
      openBarbuTable();
      return;
    }

    openPathReview();
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

    return currentDrillTrick.cardOutcomes?.[card.id] ?? "good";
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
      return firstSentence(
        currentDrillTrick.playedExplanations[card.id] ??
          `${formatCardLabel(card)} is not legal while you still have a legal card.`
      );
    }

    return firstSentence(currentDrillTrick.playedExplanations[card.id] ?? "That legal play completes the trick.");
  }

  function firstSentence(text: string) {
    const match = text.match(/.*?[.!?](?:\s|$)/);
    return (match?.[0] ?? text).trim();
  }

  function drillStepFromGeneratedScenario(scenario: GeneratedPracticeScenario): DrillStep {
    return {
      scenarioId: generatedScenarioPatternId(scenario.id),
      contract: scenario.contract,
      title: scenario.title,
      trick: guidedTrickFromGeneratedScenario(scenario)
    };
  }

  function generatedScenarioPatternId(id: string) {
    const lastHyphen = id.lastIndexOf("-");

    return lastHyphen > 0 ? id.slice(0, lastHyphen) : id;
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

  function cleanAttemptCount(attempts: PlayBarbuAttempt[]) {
    return attempts.filter((attempt) => attempt.results.length > 0 && attempt.results.every((result) => result.clean)).length;
  }

  function buildDrillLoopInsight(results: DrillResult[], attempts: PlayBarbuAttempt[]): DrillLoopInsight {
    try {
      const cleanCount = results.filter((result) => result.clean).length;
      const replayContract = weakestContractFromResults(summarizeContractResults(results));
      const reasonInsight = buildReasonInsight(results, {
        empty: "Finish a quick drill to unlock a replay target.",
        clean:
          "Good table. Repeat once more for rhythm, or replay the weakest contract to keep the habit sharp.",
        risky:
          "You won a clean trick. In avoidance contracts, only win when the trick is worth taking.",
        captured:
          "You captured a penalty. Before playing high, ask who wins if you stay low."
      });
      const cleanStreak = cleanAttemptCount(attempts);

      return {
        contract: replayContract || reasonInsight.contract,
        heading: results.length > 0 && cleanCount === results.length ? "Repeat for rhythm" : "Replay the weak spot",
        message: reasonInsight.message,
        streakText: cleanStreak
          ? `${cleanStreak} recent clean ${cleanStreak === 1 ? "table" : "tables"}`
          : "No clean streak yet"
      };
    } catch {
      return {
        contract: "",
        heading: "Repeat for rhythm",
        message: "Finish a quick drill to unlock a replay target.",
        streakText: "No clean streak yet"
      };
    }
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

  function buildReviewInsight(attempts: PlayBarbuAttempt[]): ReviewInsight {
    const recentResults = attempts.flatMap((attempt) => attempt.results);

    return buildReasonInsight(recentResults, {
      empty: "Play a practice table to give Barbu enough decisions to review.",
      clean: "You followed suit well. Keep repeating the table until reading the winner feels automatic.",
      risky: "You won a clean trick. That is legal, but keep checking whether the trick is actually dangerous.",
      captured: "You captured a penalty. Before playing high, ask who wins the trick if you stay low."
    });
  }

  function buildReasonInsight(
    results: DrillResult[],
    copy: { empty: string; clean: string; risky: string; captured: string }
  ): ReviewInsight {
    if (results.length === 0) {
      return {
        contract: "",
        message: copy.empty
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
    const reason = priority.find((candidate) => results.some((result) => result.reason === candidate));
    const result = reason ? results.find((item) => item.reason === reason) : undefined;
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
        message:
          contract === "No Last Two"
            ? "You won a late trick. In No Last Two, the safe card is often the card that loses the trick."
            : copy.captured
      };
    }

    if (reason === "won_clean_trick") {
      return {
        contract,
        message: copy.risky
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
        message:
          contract === "No Last Two"
            ? "Good avoidance. You lost the late trick while staying legal, which is the point of No Last Two."
            : "You avoided the penalty card. Keep locating the trick winner before choosing your card."
      };
    }

    return {
      contract,
      message: copy.clean
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
  $: gameTableConfigs = {
    barbu: {
      learnProps: { steps: barbuUi.learnSteps, completedCount: barbuUi.learnSteps.filter(s => completedPathSteps[s.id]).length, nextStep: barbuUi.learnSteps.find(s => !completedPathSteps[s.id]), actions: barbuLearnPanelActions, onStepSelect: startPathStep },
      practiceProps: { lessonEntries: fixedDrillLessons, onLessonSelect: startFixedContractDrill, actions: barbuPracticeActions },
      playProps: { onPrimary: startBarbuRun, resumeLabel: savedPlayBarbuRun ? "Continue Play Barbu" : undefined, resumeNote: savedPlayBarbuRun ? savedPlayBarbuRunLabel : undefined, onResume: savedPlayBarbuRun ? continueSavedPlayBarbuRun : undefined }
    },
    hearts: {
      learnProps: { steps: heartsUi.learnSteps, completedCount: heartsUi.learnSteps.filter(s => completedPathSteps[s.id]).length, nextStep: heartsUi.learnSteps.find(s => !completedPathSteps[s.id]), actions: heartsLearnPanelActions, onStepSelect: startHeartsPathStep },
      practiceProps: { actions: heartsPracticeActions },
      playProps: { onPrimary: startHeartsHand, resumeLabel: savedHeartsRun ? "Continue Hearts" : undefined, resumeNote: savedHeartsRun ? savedHeartsRunSummary(savedHeartsRun) : undefined, onResume: savedHeartsRun ? continueSavedHeartsRun : undefined }
    },
    whist: {
      learnProps: { steps: whistUi.learnSteps, completedCount: whistUi.learnSteps.filter(s => completedPathSteps[s.id]).length, nextStep: whistUi.learnSteps.find(s => !completedPathSteps[s.id]), actions: whistLearnPanelActions, onStepSelect: startWhistPathStep },
      practiceProps: { actions: whistPracticeActions },
      playProps: { onPrimary: () => void startWhistHand(), resumeLabel: savedWhistRun ? "Continue Whist" : undefined, resumeNote: savedWhistRun ? savedWhistRunSummary(savedWhistRun) : undefined, onResume: savedWhistRun ? continueSavedWhistRun : undefined, footerNote: `You and Barbu play to ${whistMatchTarget} points against Left and Right.` }
    },
    spades: {
      learnProps: { steps: spadesUi.learnSteps, completedCount: spadesUi.learnSteps.filter(s => completedPathSteps[s.id]).length, nextStep: spadesUi.learnSteps.find(s => !completedPathSteps[s.id]), actions: spadesLearnPanelActions, onStepSelect: startSpadesPathStep },
      practiceProps: { actions: spadesPracticeActions },
      playProps: {
        onPrimary: () => void startSpadesHand(),
        resumeLabel: savedSpadesRun ? "Continue Spades" : undefined,
        resumeNote: savedSpadesRun ? savedSpadesRunSummary(savedSpadesRun) : undefined,
        onResume: savedSpadesRun ? continueSavedSpadesRun : undefined,
        footerNote: `Individual bids, nil, bags, and ten-bag penalties score locally. Play to ${spadesMatchTarget}.`,
        primaryDisabled: !spadesBidReady,
        primaryWarning: spadesBidError
      }
    },
    bridge: {
      learnProps: {
        steps: bridgeUi.learnSteps,
        completedCount: bridgeUi.learnSteps.filter((step) => completedPathSteps[step.id]).length,
        nextStep: bridgeUi.learnSteps.find((step) => !completedPathSteps[step.id]),
        actions: bridgeLearnPanelActions,
        onStepSelect: startBridgePathStep
      },
      practiceProps: { actions: bridgePracticeActions },
      playProps: {
        onPrimary: () => void startBridgeHand(),
        resumeLabel: savedBridgeRun ? "Continue Bridge" : undefined,
        resumeNote: savedBridgeRun ? savedBridgeRunSummary(savedBridgeRun) : undefined,
        onResume: savedBridgeRun ? continueSavedBridgeRun : undefined,
        footerNote: `Bridge uses a basic natural auction: five-card majors, better minor, 15-17 1NT, strong 2C, declarer, dummy, opening lead, vulnerability, and duplicate scoring.`
      }
    }
  } as Record<string, any>;

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
      <div
        class:active={contract === pendingRunContract || fullHand?.contract === contract}
        class:complete={Boolean(runResultForContract(contract))}
        class:pending={!runResultForContract(contract) && contract !== pendingRunContract && fullHand?.contract !== contract}
        class="run-scorecard-row"
      >
        <span>
          {contract}
          <small>{scorecardRowState(contract)}</small>
        </span>
        {#each scoreSeats as seat}
          <strong
            class:negative={(scorecardCellScore(contract, seat) ?? 0) < 0}
            class:positive={(scorecardCellScore(contract, seat) ?? 0) > 0}
            class:pending={scorecardCellScore(contract, seat) === undefined}
          >
            {scorecardCellLabel(contract, seat)}
          </strong>
        {/each}
      </div>
    {/each}
    <div class="run-scorecard-row total">
      <span>Total</span>
      {#each scoreSeats as seat}
        <strong
          class:negative={fullHandRunSeatScores[seat] < 0}
          class:positive={fullHandRunSeatScores[seat] > 0}
        >
          {formatSignedScore(fullHandRunSeatScores[seat])}
        </strong>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet heartsScorecard(label = heartsScorecardMeta.label)}
  <div class="run-scorecard hearts-scorecard" aria-label={label}>
    <div class="run-scorecard-row hearts-scorecard-row header">
      <span>Player</span>
      <span>{heartsScorecardMeta.unitLabel}</span>
      <span>Place</span>
    </div>
    {#each scoreSeats as seat}
      <div class:active={seat === "You"} class="run-scorecard-row hearts-scorecard-row">
        <span>
          {scoreSeatLabel(seat)}
          <small>{seat === "You" ? "You" : "Table"}</small>
        </span>
        <strong>{heartsVisibleScores[seat]}</strong>
        <strong>{formatOrdinal(heartsStandings.find((standing) => standing.seat === seat)?.rank ?? 1)}</strong>
      </div>
    {/each}
    <div class="run-scorecard-row hearts-scorecard-row total">
      <span>
        {heartsScorecardMeta.objective}
        <small>Hand {heartsVisibleHandCount}</small>
      </span>
      <strong>Target {heartsMatchTarget}</strong>
      <strong>{heartsPlayerPlaceLabel}</strong>
    </div>
  </div>
{/snippet}

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

{#snippet spadesBidSetup(label = "Spades bids", editable = true)}
  <section class="play-spades-bids" aria-label={label}>
    <p class="eyebrow">Set your bid for this hand</p>
    <div class="spades-bid-grid">
      {#each spadesBidSeats as seat}
        <label class="spades-bid-control" class:auto={seat !== "You"}>
          <span>{spadesBidSeatLabel(seat)}{spadesBids[seat] === 0 ? " nil" : ""}</span>
          {#if seat === "You"}
            <div class="spades-bid-stepper">
              <button
                class="drill-action spades-bid-button"
                aria-label="Decrease You bid"
                disabled={!editable || spadesBids.You <= 0}
                onclick={() => bumpSpadesSeatBid("You", -1)}
                type="button"
              >
                -
              </button>
              <strong class="spades-bid-value" aria-label={`You bid ${spadesBids.You}`}>
                {spadesBids.You}
              </strong>
              <button
                class="drill-action spades-bid-button"
                aria-label="Increase You bid"
                disabled={!editable || spadesBids.You >= 13}
                onclick={() => bumpSpadesSeatBid("You", 1)}
                type="button"
              >
                +
              </button>
            </div>
          {:else}
            <div class="spades-bid-stepper auto">
              <span class="spades-bid-placeholder" aria-hidden="true"></span>
              <strong class="spades-bid-value auto" aria-label={`${spadesBidSeatLabel(seat)} bid ${spadesBids[seat]}`}>
                {spadesBids[seat]}
              </strong>
              <small>Auto</small>
            </div>
          {/if}
        </label>
      {/each}
    </div>
    <p class="saved-run-note">
      {editable
        ? "Your opening estimate comes from aces, protected kings, high spades, and spade length. Set 0 for nil."
        : "Bids are locked for this hand."}
    </p>
    <p class="spades-bid-summary">
      Team bids:
      <strong>You + Barbu {spadesPartnershipBids.playerSide}</strong>
      <strong>Left + Right {spadesPartnershipBids.opponentSide}</strong>
      <span>Table total {spadesBidTotal}</span>
    </p>
  </section>
{/snippet}

{#snippet runSequenceStrip(label = "Play Barbu sequence")}
  <div class="run-sequence-strip" aria-label={label}>
    {#each fullHandContracts as contract, index}
      <div
        class:active={contract === pendingRunContract || fullHand?.contract === contract || dominoHand?.contract === contract}
        class:complete={Boolean(runResultForContract(contract))}
        class:layout={contract === "Domino"}
      >
        <span>{index + 1}</span>
        <strong>{contract}</strong>
        <small>{runContractIntros[contract].role}</small>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet runSettlementSummary()}
  <div class="run-final-summary" aria-label="Play Barbu settlement">
    <div>
      <span>Winner</span>
      <strong>{fullHandRunWinnerLabel}</strong>
    </div>
    <div>
      <span>Your place</span>
      <strong>{fullHandRunPlayerStanding ? formatOrdinal(fullHandRunPlayerStanding.rank) : "Done"}</strong>
    </div>
    <div>
      <span>Strongest</span>
      <strong>{fullHandRunBestContractLabel}</strong>
    </div>
    <div>
      <span>Weakest</span>
      <strong>{fullHandRunWeakestContractLabel}</strong>
    </div>
  </div>
{/snippet}

<main class:fixed-play-screen={isTablePlayScreen} class="app-shell">
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
  {:else if appView === "cardCountingTable"}
    <header class="topbar table-topbar" aria-label="Card Counting I table">
      <button class="back-button" onclick={openCatalog} type="button">Games</button>
      <div class="table-title">
        <p class="eyebrow">Card skills</p>
        <h1>Card Counting I</h1>
      </div>
      <div class="contract-status">
        <span>Current mode</span>
        <strong>{activeCardCountingTab === "learn" ? "Learn" : "Play"}</strong>
      </div>
    </header>

    <section class="table-room" aria-label="Card Counting I modes">
      <div class="barbu-table-rail">
        <div class="barbu-mode-box">
          <div class="barbu-table-tabs compact" aria-label="Card Counting I sections" role="tablist">
            <button
              aria-controls="card-counting-learn-panel"
              aria-selected={activeCardCountingTab === "learn"}
              class:active={activeCardCountingTab === "learn"}
              onclick={() => {
                activeCardCountingTab = "learn";
              }}
              role="tab"
              type="button"
            >
              Learn
            </button>
            <button
              aria-controls="card-counting-play-panel"
              aria-selected={activeCardCountingTab === "play"}
              class:active={activeCardCountingTab === "play"}
              onclick={() => {
                activeCardCountingTab = "play";
              }}
              role="tab"
              type="button"
            >
              Play
            </button>
          </div>
        </div>
      </div>

      {#if activeCardCountingTab === "learn"}
        <div aria-label="Learn" class="barbu-tab-panel learn-panel" id="card-counting-learn-panel" role="tabpanel">
          <div class="barbu-mode-copy">
            <p class="eyebrow">Learn</p>
            <h2>Play a hand with one extra job.</h2>
            <p>Card Counting I adds memory goals to simple table games. Play the trick normally, then answer what you tracked.</p>
          </div>

          <div class="learn-action-grid" aria-label="Card Counting I learning path">
            {#each cardCountingLearnSteps as step}
              <div class="learn-action-card">
                <p class="eyebrow">{step.eyebrow}</p>
                <strong>{step.title}</strong>
                <small>{step.summary}</small>
              </div>
            {/each}
          </div>
        </div>
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
    </section>
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
        />
      {:else if currentTab === "practice"}
        <PracticePanel
          id={gameUi.table.tabs.practice.panelId}
          intro={gameUi.table.tabs.practice.intro}
          groups={gameUi.practiceGroups}
          actions={activeConfig.practiceProps.actions}
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
          {#if activeGameTable === "whist"}
            <fieldset class="whist-session-options" role="radiogroup" aria-label="Whist session">
              <legend>Session</legend>
              <label>
                <input type="radio" name="whist-session" value="game" bind:group={whistSessionMode} />
                <span>Single game<small>First to 5 points</small></span>
              </label>
              <label>
                <input type="radio" name="whist-session" value="rubber" bind:group={whistSessionMode} />
                <span>Rubber<small>Best of three games</small></span>
              </label>
            </fieldset>
          {/if}
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
    <header class="topbar" aria-label={`${activeCourse.contract} course`}>
      <button class="back-button" onclick={openActiveCourseTable} type="button">Table</button>
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
          {#if activeCourse.contract === "Domino"}
            <div class="domino-layout" aria-label={activeCourse.example.ariaLabel}>
              {#each buildDominoDrillLayout(activeCourse.example.tableCards) as lane, index}
                <div>
                  <span>{dominoSuitLabel(index)}</span>
                  <strong>{dominoLaneText(lane, dominoStartRank(dominoHand))}</strong>
                </div>
              {/each}
            </div>
          {:else}
            <CardTable
              ariaLabel={activeCourse.example.ariaLabel}
              pendingBySeat={activeCourse.example.pendingBySeat}
              tableCards={activeCourse.example.tableCards}
            />
          {/if}
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
        <button class="secondary-action" onclick={openActiveCourseTable} type="button">{activeCourseTableLabel} table</button>
        <button class="primary-action" onclick={continueCourseContent} type="button">
          {#if activeCourseStage === "concept"}
            See example
          {:else if activeCourseStage === "example"}
            {activeCourse.game === "barbu" ? "Play guided trick" : "Practice decision"}
          {:else}
            Finish {activeCourse.contract}
          {/if}
        </button>
      </div>
    </section>
  {:else if appView === "heartsLearnObject"}
    <header class="topbar" aria-label="Hearts object lesson">
      <button class="back-button" onclick={openHeartsTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Hearts</p>
        <h1>Object of Hearts</h1>
      </div>
      <div class="contract-status">
        <span>Lesson</span>
        <strong>Concept</strong>
      </div>
    </header>

    <section class="course-screen" aria-label="Hearts object lesson content">
      <div class="course-copy">
        <p class="eyebrow">Concept</p>
        <h2>Take as few penalty points as possible.</h2>
        <p>
          Hearts is a penalty game in the Black Lady style. Each heart is worth one point, the queen of spades is worth thirteen,
          and the low score wins the match.
        </p>
      </div>

      <div class="course-points" aria-label="Hearts object points">
        <div>
          <span>1</span>
          <strong>Duck tricks when hearts or the queen of spades are likely to land there.</strong>
        </div>
        <div>
          <span>2</span>
          <strong>Follow suit when you can; off-suit danger cards matter only when you are void.</strong>
        </div>
        <div>
          <span>3</span>
          <strong>Watch for moon threats: sometimes taking points stops one player from taking all of them.</strong>
        </div>
      </div>

      <div class="course-actions">
        <button class="secondary-action" onclick={openHeartsTable} type="button">Table</button>
        <button class="primary-action" onclick={continueHeartsObjectLesson} type="button">Next lesson</button>
      </div>
    </section>
  {:else if appView === "whistLearnObject"}
    <header class="topbar" aria-label="Whist object lesson">
      <button class="back-button" onclick={openWhistTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Whist</p>
        <h1>Win tricks together</h1>
      </div>
      <div class="contract-status">
        <span>Lesson</span>
        <strong>Concept</strong>
      </div>
    </header>

    <section class="course-screen" aria-label="Whist object lesson content">
      <div class="course-copy">
        <p class="eyebrow">Concept</p>
        <h2>You and Barbu score as partners.</h2>
        <p>
          Whist is partnership trick-taking. You sit opposite Barbu, follow suit when you can, use trumps when they matter,
          and count only the tricks your side wins above six.
        </p>
      </div>

      <div class="course-points" aria-label="Whist object points">
        <div>
          <span>1</span>
          <strong>Read the table as two sides: You + Barbu against Left + Right.</strong>
        </div>
        <div>
          <span>2</span>
          <strong>Follow suit first; trump changes the winner only when a player is void.</strong>
        </div>
        <div>
          <span>3</span>
          <strong>Seven tricks is the first point. Every trick after six is an odd trick.</strong>
        </div>
      </div>

      <div class="course-actions">
        <button class="secondary-action" onclick={openWhistTable} type="button">Table</button>
        <button class="primary-action" onclick={continueWhistObjectLesson} type="button">Next lesson</button>
      </div>
    </section>
  {:else if appView === "runContractIntro"}
    <header class="topbar run-intro-topbar" aria-label={`${pendingRunContract} game intro`}>
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Play Barbu</p>
        <h1>{pendingRunContract}</h1>
      </div>
      <div class="contract-status">
        <span>Next contract</span>
        <strong>{pendingRunStatusLabel}</strong>
      </div>
    </header>

    <section class="run-intro-screen" aria-label="Play Barbu contract intro">
      <div class="run-intro-card">
        <p class="eyebrow">Barbu sets the contract</p>
        <h2>{pendingRunContractIntro.title}</h2>
        <p>{pendingRunContractIntro.reason}</p>
        <div class="run-contract-role" aria-label={`${pendingRunContract} role`}>
          <div>
            <span>Role</span>
            <strong>{pendingRunContractIntro.role}</strong>
          </div>
          <div>
            <span>Surface</span>
            <strong>{pendingRunSurfaceLabel}</strong>
          </div>
          <div>
            <span>Sequence</span>
            <strong>{pendingRunSequenceLabel}</strong>
          </div>
        </div>
      </div>

      <div class="run-intro-panel">
        {#if barbuSaveError}<p class="error" role="alert">{barbuSaveError}</p>{/if}
        <div class="run-session-summary" aria-label="Play Barbu session summary">
          <div>
            <span>Leader</span>
            <strong>{fullHandRunLeaderLabel}</strong>
          </div>
          <div>
            <span>Your place</span>
            <strong>{fullHandRunPlayerPlaceLabel}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong>{fullHandRunRemainingLabel}</strong>
          </div>
        </div>

        {@render runSequenceStrip("Play Barbu contract sequence")}

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

        {@render runScorecard("Play Barbu scorecard")}

        <div class="course-actions">
          <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
          <button class="primary-action" onclick={startPendingRunContract} type="button">Start hand</button>
        </div>
      </div>
    </section>
  {:else if appView === "heartsPassPractice"}
    {#if heartsPassPractice}
      <TablePlaySurface
        mode="play"
        ariaLabel="Hearts pass practice"
        title="Pass three"
        eyebrow="Hearts practice"
        statusLabel="Exercise"
        statusValue={`${heartsPassPracticeStepIndex + 1} of ${heartsPassPracticeTotalSteps}`}
        tableAriaLabel="Hearts pass practice table"
        tableCards={[]}
        showTable={false}
        panelAriaLabel="Hearts pass practice cards"
        onBack={openHeartsTable}
      >
        {#snippet summary()}
          <div class="full-hand-summary grouped-play-summary" aria-label="Hearts pass practice summary">
            <div class="full-hand-summary-row current-hand" aria-label="Passing drill status">
              <span class="summary-row-label">Passing drill</span>
              <div>
                <span>Exercise</span>
                <strong>{heartsPassPracticeStepIndex + 1} / {heartsPassPracticeTotalSteps}</strong>
              </div>
              <div>
                <span>Goal</span>
                <strong>{heartsPassPractice.title}</strong>
              </div>
              <div>
                <span>Selected</span>
                <strong>{heartsPassPracticeSelectedCardIds.length} / 3</strong>
              </div>
              <div>
                <span>Matched</span>
                <strong>{heartsPassPracticeChecked ? `${heartsPassPracticeMatchCount} / 3` : "-"}</strong>
              </div>
            </div>
          </div>
        {/snippet}

        {#snippet panel()}
          <div class="lesson-heading">
            <p class="eyebrow">Before the hand</p>
            <h2>{heartsPassPractice.title}</h2>
          </div>

          {#if !heartsPassPracticeChecked}
            <p class="result">{heartsPassPractice.prompt}</p>
          {/if}
          {#if heartsPassPracticeError}
            <p class="outcome warning">{heartsPassPracticeError}</p>
          {:else if heartsPassPracticeChecked}
            <p class:warning={!heartsPassPracticeExact} class="outcome">
              {heartsPassPracticeExact
                ? "Good pass. You moved the obvious danger cards."
                : `${heartsPassPracticeMatchCount} of 3 matched. Compare your pass with the recommendation.`}
            </p>
            <p class="explanation pass-recommendation">
              Recommended: {formatCardList(heartsPassPractice.recommendedPass)}.
              Move the obvious danger cards before play starts.
            </p>
          {:else if heartsPassPracticeSelectedCards.length}
            <p class="explanation">
              Passing: {formatCardList(heartsPassPracticeSelectedCards)}
            </p>
          {/if}

          <CardChoiceHand
            cards={heartsPassPractice.playerHand}
            ariaLabel="Your Hearts pass practice hand"
            className="hand full-hand-cards hearts-pass-cards"
            cardClassName="card hand-card full-hand-card"
            getCardClasses={(card) => ({
              heart: card.suit === "H",
              legal: !heartsPassPracticeSelectedCardIds.includes(card.id),
              recommended: heartsPassPracticeChecked && heartsPassPracticeRecommendedIds.has(card.id),
              selected: heartsPassPracticeSelectedCardIds.includes(card.id)
            })}
            isPressed={(card) => heartsPassPracticeSelectedCardIds.includes(card.id)}
            onSelect={toggleHeartsPassPracticeCard}
          />

          <div class="action-row">
            <button class="secondary-action" onclick={openHeartsTable} type="button">Table</button>
            {#if heartsPassPracticeChecked}
              {#if activePathStepId === "hearts-pass"}
                <button class="primary-action" onclick={() => void nextHeartsPassPracticeStep()} type="button">
                  {heartsPassPracticeIsLastStep
                    ? isHeartsCourseComplete
                      ? "Back to Hearts table"
                      : "Continue Hearts path"
                    : "Next pass"}
                </button>
              {:else}
                <button class="primary-action" onclick={() => void nextHeartsPassPracticeStep()} type="button">
                  {heartsPassPracticeIsLastStep ? "Complete exercise" : "Next pass"}
                </button>
              {/if}
            {:else}
              <button
                class="primary-action"
                disabled={!heartsPassPracticeCanCheck}
                onclick={checkHeartsPassPractice}
                type="button"
              >
                Check pass
              </button>
            {/if}
          </div>
        {/snippet}
      </TablePlaySurface>
    {/if}
  {:else if appView === "heartsPass"}
    {#if heartsPassingHand}
      <TablePlaySurface
        mode="play"
        ariaLabel="Hearts passing phase"
        flowLayout
        title="Pass cards"
        eyebrow="Hearts"
        statusLabel={heartsPassDirectionLabel(heartsPassDirection)}
        statusValue={`${heartsPassSelectedCardIds.length} of 3`}
        tableAriaLabel="Hearts passing table"
        tableCards={[]}
        showTable={false}
        panelAriaLabel="Hearts pass cards"
        onBack={openHeartsTable}
      >
        {#snippet summary()}
          <div class="full-hand-summary grouped-play-summary" aria-label="Hearts pass summary">
            <div class="full-hand-summary-row current-hand" aria-label="Passing direction">
              <span class="summary-row-label">Passing</span>
              <div>
                <span>You pass</span>
                <strong>{heartsPassTargetLabel(heartsPassDirection)}</strong>
              </div>
              <div>
                <span>You receive</span>
                <strong>{heartsPassReceiveLabel(heartsPassDirection)}</strong>
              </div>
              <div>
                <span>Cards</span>
                <strong>{heartsPassSelectedCardIds.length} / 3</strong>
              </div>
            </div>
          </div>
        {/snippet}

        {#snippet panel()}
          <div class="lesson-heading">
            <p class="eyebrow">Before the first trick</p>
            <h2>Pass three cards</h2>
          </div>

          <p class="result">
            Choose exactly three cards to pass to {heartsPassTargetLabel(heartsPassDirection)}. You will receive three cards
            from {heartsPassReceiveLabel(heartsPassDirection)}.
          </p>
          {#if heartsPassSelectedCards.length}
            <p class="explanation">
              Passing: {formatCardList(heartsPassSelectedCards)}
            </p>
          {/if}
          {#if heartsPassError}
            <p class="outcome warning">{heartsPassError}</p>
          {/if}

          <CardChoiceHand
            cards={heartsPassingHand.playerHand}
            ariaLabel="Your Hearts passing hand"
            className="hand full-hand-cards hearts-pass-cards"
            cardClassName="card hand-card full-hand-card"
            getCardClasses={(card) => ({
              heart: card.suit === "H",
              legal: !heartsPassSelectedCardIds.includes(card.id),
              selected: heartsPassSelectedCardIds.includes(card.id)
            })}
            isPressed={(card) => heartsPassSelectedCardIds.includes(card.id)}
            onSelect={toggleHeartsPassCard}
          />

          <div class="action-row">
            <button class="secondary-action" onclick={openHeartsTable} type="button">Table</button>
            <button class="primary-action" disabled={!heartsPassCanSubmit} onclick={() => void confirmHeartsPass()} type="button">
              Pass cards
            </button>
          </div>
        {/snippet}
      </TablePlaySurface>
    {/if}
  {:else if appView === "bridgeAuction"}
    {#if fullHand}
      <header class="topbar table-play-topbar" aria-label="Bridge auction">
        <button class="back-button" onclick={openBridgeTable} type="button">Table</button>
        <div>
          <p class="eyebrow">Contract Bridge</p>
          <h1>Bridge auction</h1>
        </div>
        <div class="contract-status">
          <span>Dealer</span>
          <strong>{bridgeSeatLabel(bridgeDealerSeat(fullHand))}</strong>
        </div>
      </header>

      <section class="bridge-auction-screen" aria-label="Bridge auction">
        <section class="lesson-panel bridge-auction-panel" aria-label="Bridge bidding box">
          {#if bridgeAuctionCurrentStatus.passedOut}
            <GameResult game="Bridge" completion="board" title="Auction complete" summary="All four players passed. No contract was played and neither side scores." />
          {:else}
          <div class="lesson-heading">
            <p class="eyebrow">Before dummy appears</p>
            <h2>{bridgeAuctionCurrentStatus.complete ? "Auction complete" : bridgeAuctionCurrentStatus.currentSeat === "You" ? "Choose your call" : "Auction in progress"}</h2>
          </div>

          <p class="result">
            You are South. The auction uses basic natural bidding: five-card majors, better minor, 15-17 1NT, strong 2C,
            and weak twos. The final contract sets declarer, dummy, opening lead, vulnerability, and scoring.
          </p>
          {/if}

          <div class="bridge-auction-metrics" aria-label="Bridge hand estimate">
            <div>
              <span>HCP</span>
              <strong>{bridgeHighCardPoints(fullHand.playerHand)}</strong>
            </div>
            <div>
              <span>Suggested</span>
              <strong>{bridgeCallLongLabel(bridgeSuggestedCall)}</strong>
            </div>
            <div>
              <span>Turn</span>
              <strong>{bridgeAuctionCurrentStatus.complete ? "Done" : bridgeSeatLabel(bridgeAuctionCurrentStatus.currentSeat)}</strong>
            </div>
            <div>
              <span>Vuln.</span>
              <strong>{bridgeVulnerabilityForHand(fullHand)}</strong>
            </div>
          </div>

          <CardChoiceHand
            cards={fullHand.playerHand}
            ariaLabel="Your Bridge auction hand"
            className="hand full-hand-cards bridge-auction-hand"
            cardClassName="card hand-card full-hand-card"
            getCardClasses={() => ({ legal: false })}
            isPressed={() => false}
            onSelect={() => {}}
          />

          <div class="bridge-call-grid" aria-label="Bridge calls">
            <button
              aria-pressed={bridgeAuctionSelectedCall === "Pass"}
              class:recommended={bridgeSuggestedCall === "Pass"}
              class:selected={bridgeAuctionSelectedCall === "Pass"}
              class="secondary-action"
              disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes("Pass")}
              onclick={() => selectBridgeAuctionCall("Pass")}
              type="button"
            >
              Pass
            </button>
            <button
              aria-label="Double"
              aria-pressed={bridgeAuctionSelectedCall === "Double"}
              class:recommended={bridgeSuggestedCall === "Double"}
              class:selected={bridgeAuctionSelectedCall === "Double"}
              class="secondary-action"
              disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes("Double")}
              onclick={() => selectBridgeAuctionCall("Double")}
              type="button"
            >
              X
            </button>
            <button
              aria-label="Redouble"
              aria-pressed={bridgeAuctionSelectedCall === "Redouble"}
              class:recommended={bridgeSuggestedCall === "Redouble"}
              class:selected={bridgeAuctionSelectedCall === "Redouble"}
              class="secondary-action"
              disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes("Redouble")}
              onclick={() => selectBridgeAuctionCall("Redouble")}
              type="button"
            >
              XX
            </button>
          </div>

          <div class="bridge-bidding-grid" aria-label="Bridge bids">
            {#each bridgeBidOptions as bid}
              <button
                aria-pressed={bridgeAuctionSelectedCall === bid.id}
                class:selected={bridgeAuctionSelectedCall === bid.id}
                class:recommended={bridgeSuggestedCall === bid.id}
                disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes(bid.id)}
                onclick={() => selectBridgeAuctionBid(bid.id)}
                type="button"
              >
                {bid.label}
              </button>
            {/each}
          </div>

          <div class="bridge-auction-history" aria-label="Bridge auction history">
            <span>Auction</span>
            <div>
              {#if bridgeAuctionCalls.length === 0}
                <p>
                  <strong>{bridgeSeatLabel(bridgeAuctionCurrentStatus.currentSeat)}</strong>
                  <span>to call</span>
                </p>
              {/if}
              {#each bridgeAuctionCalls as call}
                <p>
                  <strong>{bridgeSeatLabel(call.seat)}</strong>
                  <span>{call.call}</span>
                </p>
              {/each}
            </div>
          </div>

          {#if bridgeAuctionReadyToPlay}
            <div class="bridge-auction-history bridge-contract-preview" aria-label="Bridge contract preview">
              <span>Contract</span>
              <div>
                <p>
                  <strong>{bridgeVisibleContract.label}</strong>
                  <span>{bridgeSeatLabel(bridgeVisibleContract.declarer)} declares; {bridgeSeatLabel(bridgeVisibleContract.dummy)} is dummy.</span>
                </p>
              </div>
            </div>
          {/if}

          {#if bridgeAuctionError}
            <p class="outcome warning">{bridgeAuctionError}</p>
          {/if}

          {#if bridgeAuctionSelectedCallExplanation && !bridgeAuctionReadyToPlay && bridgeAuctionCurrentStatus.currentSeat === "You"}
            <p class="bridge-call-explanation">
              Meaning: {bridgeAuctionSelectedCallExplanation}
            </p>
          {/if}

          <div class="action-row">
            <button class="secondary-action" onclick={openBridgeTable} type="button">Table</button>
            <button
              class="secondary-action"
              disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes(bridgeSuggestedCall)}
              onclick={() => selectBridgeAuctionCall(bridgeSuggestedCall)}
              type="button"
            >
              Use suggestion
            </button>
            <button
              class="primary-action"
              disabled={!bridgeAuctionCurrentStatus.passedOut && !bridgeAuctionReadyToPlay && bridgeAuctionCurrentStatus.currentSeat !== "You"}
              onclick={bridgeAuctionCurrentStatus.passedOut ? () => void advancePassedOutBridgeBoard() : confirmBridgeAuction}
              type="button"
            >
              {bridgeAuctionActionLabel}
            </button>
          </div>
        </section>
      </section>
    {/if}
  {:else if appView === "bridgeBiddingPractice"}
    <header class="topbar table-play-topbar" aria-label="Bridge bidding practice">
      <button class="back-button" onclick={openBridgeTable} type="button">Table</button>
      <div>
        <p class="eyebrow">Basic natural</p>
        <h1>Bridge bidding</h1>
      </div>
      <div class="contract-status">
        <span>Clean</span>
        <strong>{bridgeBiddingPracticeCleanCount}/{bridgeBiddingPracticeSteps.length}</strong>
      </div>
    </header>

    <section class="bridge-auction-screen" aria-label="Bridge bidding practice">
      <section class="lesson-panel bridge-auction-panel" aria-label="Bridge bidding exercise">
        <div class="lesson-heading">
          <p class="eyebrow">Decision {bridgeBiddingPracticeDecisionNumber} of {bridgeBiddingPracticeSteps.length}</p>
          <h2>{currentBridgeBiddingPractice.title}</h2>
        </div>

        <ExerciseFeedback
          eyebrow="Opening bid"
          title={bridgeCallLongLabel(currentBridgeBiddingPractice.correctCall)}
          result={currentBridgeBiddingPractice.prompt}
          explanation={bridgeBiddingPracticeFeedback}
          outcome={bridgeBiddingPracticeOutcome}
          warning={bridgeBiddingPracticeOutcome === "Risky"}
        />

        <div class="bridge-auction-metrics" aria-label="Bridge bidding estimate">
          <div>
            <span>HCP</span>
            <strong>{bridgeHighCardPoints(currentBridgeBiddingPractice.hand)}</strong>
          </div>
          <div>
            <span>Shape</span>
            <strong>{bridgeHandShapeLabel(currentBridgeBiddingPractice.hand)}</strong>
          </div>
          <div>
            <span>Dealer</span>
            <strong>{bridgeSeatLabel(currentBridgeBiddingPractice.dealer)}</strong>
          </div>
          <div>
            <span>Vuln.</span>
            <strong>{currentBridgeBiddingPractice.vulnerability}</strong>
          </div>
        </div>

        <CardChoiceHand
          cards={currentBridgeBiddingPractice.hand}
          ariaLabel="Your Bridge bidding practice hand"
          className="hand full-hand-cards bridge-auction-hand"
          cardClassName="card hand-card full-hand-card"
          getCardClasses={() => ({ legal: false })}
          isPressed={() => false}
          onSelect={() => {}}
        />

        <div class="bridge-call-grid bridge-practice-call-grid" aria-label="Bridge bidding choices">
          {#each currentBridgeBiddingPractice.options as call}
            <button
              aria-pressed={bridgeBiddingSelectedCall === call}
              class:recommended={bridgeBiddingCheckedCall && currentBridgeBiddingPractice.correctCall === call}
              class:selected={bridgeBiddingSelectedCall === call}
              class="secondary-action"
              onclick={() => selectBridgeBiddingPracticeCall(call)}
              type="button"
            >
              {bridgeCallLabel(call)}
            </button>
          {/each}
        </div>

        <div class="action-row">
          <button class="secondary-action" onclick={openBridgeTable} type="button">Table</button>
          {#if bridgeBiddingCheckedCall}
            <button class="primary-action" onclick={nextBridgeBiddingPracticeDecision} type="button">
              {bridgeBiddingPracticeIsLast ? "Finish practice" : "Next decision"}
            </button>
          {:else}
            <button class="primary-action" onclick={checkBridgeBiddingPractice} type="button">
              Check answer
            </button>
          {/if}
        </div>
      </section>
    </section>
  {:else if appView === "fullHand"}
    {#if fullHand}
      <TablePlaySurface
        mode={fullHand.status === "complete" ? "result" : "play"}
        ariaLabel={`${fullHand.contract} full hand`}
        flowLayout
        title={fullHandCardCountingActive ? fullHandCardCountingTitle : `${fullHand.contract} hand`}
        eyebrow={fullHandCardCountingActive ? "Card Counting I" : fullHandIsPartnershipGame ? (whistFullHandSource === "practice" ? `${fullHand.contract} practice` : `Play ${fullHand.contract}`) : fullHandRunActive ? "Play Barbu" : "Contract hand"}
        statusLabel={fullHandCardCountingActive ? fullHandCardCountingStatusLabel : fullHandIsBridgeGame ? "Contract" : fullHandIsPartnershipGame ? "Trump" : fullHandRunStatusLabel}
        statusValue={fullHandCardCountingActive ? `${fullHand.completedTricks.length} / 13 tricks` : fullHandIsBridgeGame ? bridgeContractLabel : fullHandIsPartnershipGame ? whistTrumpSuitLabel : `${fullHand.playerPenalty} ${fullHandPlayerPenaltyLabel}`}
        tableAriaLabel={`${fullHand.contract} hand table`}
        pendingBySeat={fullHandPendingBySeat}
        surfaceClassName={fullHandIsBridgeGame ? "bridge-play-surface" : ""}
        showTable={
          !fullHandRunIsComplete &&
          !(fullHandIsHeartsGame && fullHand.status === "complete") &&
          !(fullHandIsPartnershipGame && fullHand.status === "complete")
        }
        tableCards={fullHandVisibleTableCards}
        tableVariant={fullHandIsBridgeGame ? "bridge" : "default"}
        panelAriaLabel={`${fullHand.contract} hand decision`}
        onBack={openFullHandTableTarget}
        onSurfaceClick={fullHandIsReviewingTrick ? continueFullHandReview : undefined}
        useCustomTable={fullHandIsBridgeGame}
      >
        {#snippet table()}
          <BridgeTable
            ariaLabel={`${fullHand.contract} hand table`}
            dummyHand={fullHand.dummyHand}
            playerHand={fullHand.playerHand}
            dummySeat={bridgeDummySeat}
            declarerSeat={bridgeDeclarerSeat}
            isDummyTurn={isBridgeDummyTurn}
            isReviewing={fullHandIsReviewingTrick}
            pendingBySeat={fullHandPendingBySeat}
            tableCards={fullHandVisibleTableCards}
          />
        {/snippet}

        {#snippet summary()}
          {#if !fullHandRunIsComplete && !(fullHandIsPartnershipGame && fullHand.status === "complete")}
            <div
              class:bridge-play-summary={fullHandIsBridgeGame}
              class="full-hand-summary grouped-play-summary"
              aria-label={`${fullHand.contract} hand score`}
            >
              {#if fullHandIsBridgeGame}
                <div
                  class="full-hand-summary-row current-hand bridge-current-hand-row"
                  aria-label="Current hand"
                >
                  <div>
                    <span>Declarer</span>
                    <strong>{bridgeDeclarerTricks}</strong>
                  </div>
                  <div>
                    <span>Defense</span>
                    <strong>{bridgeDefenderTricks}</strong>
                  </div>
                  <div>
                    <span>Tricks</span>
                    <strong>{fullHand.completedTricks.length} / 13</strong>
                  </div>
                  <div>
                    <span>Target</span>
                    <strong>{bridgeContractTarget}</strong>
                  </div>
                </div>
              {:else}
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
                    <span>{whistOpeningLeadPracticeActive ? "Lead" : "Tricks"}</span>
                    <strong>{whistOpeningLeadPracticeActive ? `${whistOpeningLeadPracticeRound + 1} / ${whistOpeningLeadPracticeMaxRounds}` : `${fullHand.completedTricks.length} / 13`}</strong>
                  </div>
                  {#if fullHandShowWhistMatchSummary}
                    <div>
                      <span>{fullHandIsSpadesGame ? "Bid" : whistOpeningLeadPracticeActive ? "Focus" : whistOddProgressLabel}</span>
                      <strong>{fullHandIsSpadesGame ? spadesCurrentBidLabel : whistOpeningLeadPracticeActive ? "Opening" : whistOddProgressValue}</strong>
                    </div>
                  {/if}
                  {#if fullHand.contract === "No Last Two"}
                    <div>
                      <span>{fullHandNoLastTwoPhaseLabel}</span>
                      <strong>{fullHandNoLastTwoPhaseValue}</strong>
                    </div>
                  {/if}
                </div>
              {/if}
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
                  <span class="summary-row-label">{fullHandIsSpadesGame ? "Score" : "Game"} to {partnershipMatchTarget}</span>
                  <div>
                    <span>You + Barbu</span>
                    <strong>{partnershipVisibleMatchScores.playerSide}</strong>
                  </div>
                  <div>
                    <span>Left + Right</span>
                    <strong>{partnershipVisibleMatchScores.opponentSide}</strong>
                  </div>
                  <div aria-label={whistRubberActive ? "Whist rubber games" : undefined}>
                    <span>{fullHandIsSpadesGame ? "Bags" : whistRubberActive ? "Games" : "Hands"}</span>
                    <strong>{fullHandIsSpadesGame ? `${spadesVisibleBags.playerSide}-${spadesVisibleBags.opponentSide}` : whistRubberActive ? `${whistSettlement.games.playerSide}-${whistSettlement.games.opponentSide}` : partnershipVisibleHandCount}</strong>
                  </div>
                  {#if fullHandIsWhistGame && fullHand.whistDealer !== undefined}
                    <div>
                      <span>Dealer</span>
                      <strong aria-label="Whist dealer">{["Barbu", "Right", "You", "Left"][fullHand.whistDealer]}{#if whistTurnedCardVisible && fullHand.whistTurnedTrump} <b class="whist-turned-card" aria-label="Turned trump">{formatCardLabel(fullHand.whistTurnedTrump)}</b>{/if}</strong>
                    </div>
                  {/if}
                </div>
              {/if}
              {#if fullHandIsBridgeGame}
                <div class="full-hand-summary-row table-score bridge-duplicate-row" aria-label="Bridge score">
                  <div>
                    <span>NS</span>
                    <strong>{formatSignedScore(bridgeVisibleMatchScores.ns)}</strong>
                  </div>
                  <div>
                    <span>EW</span>
                    <strong>{formatSignedScore(bridgeVisibleMatchScores.ew)}</strong>
                  </div>
                  <div>
                    <span>Board</span>
                    <strong>{fullHand.bridgeBoardNumber ?? bridgeHandResults.length + 1}</strong>
                  </div>
                  <div>
                    <span>Score</span>
                    <strong>{currentBridgeHandResult ? formatSignedScore(currentBridgeHandResult.score) : "Playing"}</strong>
                  </div>
                </div>
              {/if}
              {#if fullHandRunActive}
                <div class="full-hand-summary-row table-score" aria-label="Table scores">
                  <span class="summary-row-label">Table scores</span>
                  {#each scoreSeats as seat}
                    <div>
                      <span>{scoreSeatRunLabel(seat)} score</span>
                      <strong>{formatSignedScore(fullHandRunSeatScores[seat])}</strong>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else if fullHandRunIsComplete}
            <div class="full-hand-summary compact-run-complete" aria-label={`${fullHand.contract} hand score`}>
              {#each scoreSeats as seat}
                <div>
                  <span>{scoreSeatRunLabel(seat)} score</span>
                  <strong>{formatSignedScore(fullHandRunSeatScores[seat])}</strong>
                </div>
              {/each}
            </div>
          {/if}
        {/snippet}

        {#snippet panel()}
          {#if fullHand.status === "complete"}
            {#if fullHandCardCountingActive}
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
            {:else if fullHandRunIsComplete}
              <GameResult game="Barbu" completion="session" title={fullHandRunResultTitle} summary={fullHandRunResultSummary} />

              <div class="full-hand-run-score" aria-label="Play Barbu score">
                {#each fullHandRunStandings as standing}
                  <div>
                    <span>{formatOrdinal(standing.rank)} {scoreSeatLabel(standing.seat)}</span>
                    <strong>{formatSignedScore(standing.score)}</strong>
                  </div>
                {/each}
              </div>

              {@render runSettlementSummary()}

              {@render runScorecard("Play Barbu results")}
            {:else}
              <GameResult game={fullHand.contract} completion={fullHandCompletion} title={fullHandResultTitle} summary={fullHandResultSummary} />

              {#if fullHandIsHeartsGame}
                <div class="hearts-result-stack" aria-label="Hearts hand score">
                  {@render heartsScorecard("Hearts final scorecard")}
                  <div class="hearts-hand-breakdown" aria-label="This hand breakdown">
                    <div class="hearts-hand-breakdown-row header">
                      <span>This hand</span>
                      <span>Tricks</span>
                      <span>Points</span>
                    </div>
                    {#each scoreSeats as seat}
                      <div class:active={seat === "You"} class="hearts-hand-breakdown-row">
                        <span>{scoreSeatLabel(seat)}</span>
                        <strong>{fullHandSeatTrickCounts[seat]}</strong>
                        <strong>{heartsCurrentScoredSeatPenalties[seat]}</strong>
                      </div>
                    {/each}
                  </div>
                </div>
                {#if heartsMatchIsComplete}
                  <div class="full-hand-result-tricks" aria-label="Hearts match summary">
                    <div>
                      <span>Winner</span>
                      <strong>{heartsResult.winnerLabel}</strong>
                    </div>
                    <div>
                      <span>Your place</span>
                      <strong>{heartsPlayerPlaceLabel}</strong>
                    </div>
                    <div>
                      <span>Best hand</span>
                      <strong>{heartsBestHandLabel}</strong>
                    </div>
                    <div>
                      <span>Hardest hand</span>
                      <strong>{heartsWorstHandLabel}</strong>
                    </div>
                  </div>
                {/if}
              {:else if fullHandIsBridgeGame}
                <div class="hearts-result-stack" aria-label="Bridge hand score">
                  <div class="hearts-hand-breakdown" aria-label="Bridge contract breakdown">
                    <div class="hearts-hand-breakdown-row whist-score-row header">
                      <span>Contract</span>
                      <span>Target</span>
                      <span>Declarer</span>
                      <span>Defense</span>
                    </div>
                    <div class:active={true} class="hearts-hand-breakdown-row whist-score-row">
                      <span>{bridgeContractLabel}</span>
                      <strong>{bridgeContractTarget}</strong>
                      <strong>{bridgeDeclarerTricks}</strong>
                      <strong>{bridgeDefenderTricks}</strong>
                    </div>
                    <div class="hearts-hand-breakdown-row whist-score-row">
                      <span>{bridgePartnershipLabel(bridgeVisibleContract.declarerSide ?? bridgeSideForSeat(bridgeVisibleContract.declarer))}</span>
                      <strong>{bridgeVisibleContract.vulnerability}</strong>
                      <strong>{formatSignedScore(currentBridgeHandResult?.score ?? 0)}</strong>
                      <strong>{bridgeSeatLabel(bridgeVisibleContract.declarer)}</strong>
                    </div>
                    <div class="hearts-hand-breakdown-row whist-score-row">
                      <span>Score</span>
                      <strong>NS {formatSignedScore(bridgeVisibleMatchScores.ns)}</strong>
                      <strong>EW {formatSignedScore(bridgeVisibleMatchScores.ew)}</strong>
                      <strong>Board {fullHand.bridgeBoardNumber ?? bridgeHandResults.length + 1}</strong>
                    </div>
                  </div>
                </div>
              {:else if fullHandIsPartnershipGame}
                <div class="hearts-result-stack" aria-label={`${fullHand.contract} hand score`}>
                  <div class="hearts-hand-breakdown" aria-label={`${fullHand.contract} partnership breakdown`}>
                    <div class="hearts-hand-breakdown-row whist-score-row header">
                      <span>Partnership</span>
                      <span>{fullHandIsWhistGame ? "Game" : "Match"}</span>
                      <span>Tricks</span>
                      <span>{fullHandIsSpadesGame ? "Bid" : "Odd"}</span>
                    </div>
                    <div class:active={true} class="hearts-hand-breakdown-row whist-score-row">
                      <span>You + Barbu</span>
                      <strong>{partnershipVisibleMatchScores.playerSide}</strong>
                      <strong>{whistPartnershipTricks.playerSide}</strong>
                      <strong>{fullHandIsSpadesGame ? `${spadesPartnershipBids.playerSide}` : whistPlayerSideOddTricks}</strong>
                    </div>
                    <div class="hearts-hand-breakdown-row whist-score-row">
                      <span>Left + Right</span>
                      <strong>{partnershipVisibleMatchScores.opponentSide}</strong>
                      <strong>{whistPartnershipTricks.opponentSide}</strong>
                      <strong>{fullHandIsSpadesGame ? `${spadesPartnershipBids.opponentSide}` : whistOpponentSideOddTricks}</strong>
                    </div>
                  </div>
                </div>
              {:else}
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
            {/if}
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
                {fullHandIsBridgeGame
                  ? "Check who won and press Next trick when ready."
                  : fullHandIsPartnershipGame
                  ? "Check whether the trick stayed with your partnership, whether trump changed the winner, and who leads next."
                  : fullHand.contract === "No Last Two"
                  ? "Check the trick number first. Tap the table or press Next trick when you are ready."
                  : "Left's card is on the table. Tap the table or press Next trick when you are ready."}
              </p>
            {/if}
          {:else if spadesOpeningDecisionActive}
            {#if spadesOpeningPanel === "bid"}
              <div class="lesson-heading">
                <p class="eyebrow">Before the first trick</p>
                <h2>Adjust the bids</h2>
              </div>

              {@render spadesBidSetup("Spades bids for this hand", true)}
            {:else}
              <ExerciseFeedback
                eyebrow="Before the first trick"
                title="Read your hand"
                result="Check your spades, likely winners, and weak suits before setting the table bid."
                error={fullHandError}
              />

              <CardChoiceHand
                cards={fullHand.playerHand}
                ariaLabel={`Your ${fullHand.contract} hand`}
                className="hand full-hand-cards"
                cardClassName="card hand-card full-hand-card"
                getCardClasses={spadesOpeningCardClasses}
                isPressed={() => false}
                onSelect={() => {}}
              />
            {/if}
          {:else}
            <div class:bridge-dummy-turn-feedback={isBridgeDummyTurn} class:bridge-play-feedback={fullHandIsBridgeGame}>
              <ExerciseFeedback
                eyebrow="Your turn"
                title={isBridgeDummyTurn ? "Play from dummy" : fullHandIsBridgeGame ? (bridgeUserSideDeclares ? "Play as declarer" : "Defend the contract") : "Choose your card"}
                result={fullHandIsBridgeGame ? bridgePlayPrompt : fullHand.prompt}
                error={fullHandError}
              />
              {#if fullHandIsBridgeGame}
                <div class="bridge-active-hand-label">{bridgeActiveHandLabel}</div>
              {/if}
            </div>

            {#if fullHandIsBridgeGame}
              <CardChoiceHand
                cards={bridgeActiveHandCards}
                ariaLabel={bridgeActiveHandAriaLabel}
                className="hand full-hand-cards bridge-thumb-hand"
                cardClassName="card hand-card full-hand-card"
                getCardClasses={bridgeThumbCardClasses}
                isPressed={(card) => isBridgeDummyTurn ? dummySelectedCardId === card.id : fullHandSelectedCardId === card.id}
                onSelect={(card) => void (isBridgeDummyTurn ? selectDummyCard(card) : selectFullHandCard(card))}
              />
            {:else}
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
          {/if}

          <div class="action-row">
            {#if fullHand.status === "complete"}
              <button class="secondary-action" onclick={openFullHandTableTarget} type="button">Table</button>
              {#if fullHandCardCountingActive}
                <button class="secondary-action" onclick={replayFullHandCardCounting} type="button">Replay</button>
                <button class="primary-action" onclick={nextFullHandCardCounting} type="button">Next hand</button>
              {:else if fullHandRunIsComplete}
                <button class="secondary-action" onclick={() => void replayWeakestRunContract()} type="button">Replay weakest</button>
                <button class="primary-action" onclick={startBarbuRun} type="button">New game</button>
              {:else}
                {#if fullHandReplayAllowed}
                  <button class="secondary-action" onclick={() => void replayFullHand()} type="button">Replay</button>
                {/if}
                <button class="primary-action" disabled={fullHandIsWhistGame && whistDealPending} onclick={() => void startNextFullHand()} type="button">{fullHandNextActionLabel}</button>
              {/if}
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
                  {whistOpeningLeadPracticeReview
                    ? whistOpeningLeadPracticeRound >= whistOpeningLeadPracticeMaxRounds - 1
                      ? "Finish session"
                      : "Next lead"
                    : "Next trick"}
                </button>
              {/if}
            {:else if spadesOpeningDecisionActive}
              <button class="secondary-action" onclick={openFullHandTableTarget} type="button">Table</button>
              <button class="secondary-action" onclick={toggleSpadesOpeningPanel} type="button">
                {spadesOpeningPanel === "bid" ? "Show cards" : "Adjust bid"}
              </button>
              <button
                class="primary-action"
                disabled={!spadesBidReady}
                onclick={startSpadesOpeningPlay}
                type="button"
              >
                Start hand
              </button>
            {:else}
              <button class="secondary-action" onclick={openFullHandTableTarget} type="button">Table</button>
              <button
                class="primary-action"
                disabled={(isBridgeDummyTurn ? (!dummySelectedCardId || !fullHand.dummyLegalCardIds?.includes(dummySelectedCardId)) : (!fullHandSelectedCard || !fullHandLegalCardIds.has(fullHandSelectedCard.id)))}
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
      <TablePlaySurface
        mode={dominoHand.status === "complete" ? "result" : "play"}
        ariaLabel="Domino hand"
        title="Domino hand"
        eyebrow={fullHandRunActive ? "Play Barbu" : "Contract hand"}
        statusLabel={fullHandRunStatusLabel}
        statusValue={`${formatSignedScore(dominoScoreMap.You)} points`}
        tableAriaLabel="Domino layout"
        tableCards={[]}
        flowLayout
        useCustomTable
        surfaceClassName="domino-play-surface"
        showTable={dominoHand.status !== "complete"}
        panelAriaLabel="Domino hand decision"
        onBack={openBarbuTable}
      >
        {#snippet summary()}
          {#if !fullHandRunIsComplete && dominoHand.status !== "complete"}
            <div class="full-hand-summary grouped-play-summary" aria-label="Domino hand score">
              <div class="full-hand-summary-row current-hand" aria-label="Current hand">
                <span class="summary-row-label">Current hand</span>
                <div>
                  <span>Your score</span>
                  <strong>{formatSignedScore(dominoScoreMap.You)}</strong>
                </div>
              <div>
                <span>Cards left</span>
                <strong>{dominoHand.cardsRemaining}</strong>
              </div>
              <div>
                <span>Next out</span>
                <strong>{formatSignedScore(dominoNextOutScore)}</strong>
              </div>
                <div>
                  <span>Order</span>
                  <strong>{dominoOutOrderText(dominoHand)}</strong>
                </div>
              </div>
              {#if fullHandRunActive}
                <div class="full-hand-summary-row table-score" aria-label="Table scores">
                  <span class="summary-row-label">Table scores</span>
                  {#each scoreSeats as seat}
                    <div>
                      <span>{scoreSeatRunLabel(seat)} score</span>
                      <strong>{formatSignedScore(dominoScoreMap[seat])}</strong>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <div class="full-hand-summary compact-run-complete" aria-label="Domino hand score">
              {#each scoreSeats as seat}
                <div>
                  <span>{scoreSeatRunLabel(seat)} score</span>
                  <strong>{formatSignedScore(dominoScoreMap[seat])}</strong>
                </div>
              {/each}
            </div>
          {/if}
        {/snippet}

        {#snippet table()}
          <div class="domino-layout hand-domino-layout" aria-label="Domino layout">
            {#each dominoHand.layout as lane, index}
              <div>
                <span>{dominoSuitLabel(index)}</span>
                <strong>{dominoLaneText(lane, dominoStartRank(dominoHand))}</strong>
              </div>
            {/each}
          </div>
        {/snippet}

        {#snippet panel()}
          {#if dominoHand.status === "complete"}
            {#if fullHandRunIsComplete}
              <GameResult game="Barbu" completion="session" title={fullHandRunResultTitle} summary={fullHandRunResultSummary} />

              <div class="full-hand-run-score" aria-label="Play Barbu score">
                {#each fullHandRunStandings as standing}
                  <div>
                    <span>{formatOrdinal(standing.rank)} {scoreSeatLabel(standing.seat)}</span>
                    <strong>{formatSignedScore(standing.score)}</strong>
                  </div>
                {/each}
              </div>

              {@render runSettlementSummary()}

              {@render runScorecard("Play Barbu results")}
            {:else}
              <div class="domino-result-card">
                <div class="lesson-heading">
                  <p class="eyebrow">Result</p>
                  <h2>{dominoResultTitle}</h2>
                </div>

                <p class="result" aria-label="Domino result summary">{dominoResultSummary}</p>

                <div class="domino-result-grid" aria-label="Domino result details">
                  <div>
                    <span>Your score</span>
                    <strong>{formatSignedScore(dominoScoreMap.You)}</strong>
                  </div>
                  <div>
                    <span>Winner</span>
                    <strong>{dominoOutOrderText(dominoHand).split(" ")[0] ?? "Table"}</strong>
                  </div>
                  <div>
                    <span>Order</span>
                    <strong>{dominoOutOrderText(dominoHand)}</strong>
                  </div>
                </div>
              </div>
            {/if}
          {:else}
            <ExerciseFeedback
              eyebrow="Your turn"
              title="Place a card"
              result={dominoHand.prompt}
              error={dominoError}
              explanation={dominoMoveReason}
            />

            <CardChoiceHand
              cards={dominoHand.playerHand}
              ariaLabel="Your Domino hand"
              className="hand full-hand-cards domino-cards"
              cardClassName="card hand-card full-hand-card"
              getCardClasses={dominoCardClasses}
              isPressed={(card) => dominoSelectedCardId === card.id}
              onSelect={(card) => void selectDominoCard(card)}
              onFocus={(card) => {
                dominoSelectedCardId = card.id;
              }}
            />
          {/if}

          <div class="action-row">
            {#if dominoHand.status === "complete"}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              {#if fullHandRunIsComplete}
                <button class="secondary-action" onclick={() => void replayWeakestRunContract()} type="button">Replay weakest</button>
                <button class="primary-action" onclick={startBarbuRun} type="button">New game</button>
              {:else}
                <button class="secondary-action" onclick={() => void replayDominoHand()} type="button">Replay</button>
                <button class="primary-action" onclick={() => void startNextDominoHand()} type="button">{fullHandNextActionLabel}</button>
              {/if}
            {:else}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              <button
                class="secondary-action"
                disabled={dominoHand.legalCardIds.length > 0}
                onclick={() => void passDomino()}
                type="button"
              >
                Pass
              </button>
              <button
                class="primary-action"
                disabled={!dominoDefaultPlayableCard}
                onclick={placeSelectedOrDefaultDominoCard}
                type="button"
              >
                Place card
              </button>
            {/if}
          </div>
        {/snippet}
      </TablePlaySurface>
    {/if}
  {:else if appView === "drill"}
    <TablePlaySurface
      mode="play"
      ariaLabel={drillScreenTitle}
      title={drillScreenTitle}
      eyebrow={activeGameTable === "whist" || activeGameTable === "spades" || activeGameTable === "bridge" ? currentDrill.contract : drillSetTitle}
      statusLabel={currentDrill.contract}
      statusValue={`Decision ${currentDrillDecisionNumber} of ${activeDrillSteps.length}`}
      tableAriaLabel="Drill card table"
      pendingBySeat={currentDrillTrick.pendingBySeat}
      useCustomTable={currentDrillIsDomino}
      tableCards={currentDrillIsDomino ? [] : drillCompletedTable}
      panelAriaLabel="Drill decision"
      onBack={openActiveGameTable}
    >
      {#snippet table()}
        {#if currentDrillIsDomino}
          <div class="domino-layout" aria-label="Domino drill layout">
            {#each drillDominoLayout as lane, index}
              <div>
                <span>{dominoSuitLabel(index)}</span>
                <strong>{dominoLaneText(lane)}</strong>
              </div>
            {/each}
          </div>
        {/if}
      {/snippet}

      {#snippet track()}
        <div class="drill-loop-status" aria-label="Drill progress">
          <span>{drillResults.length} / {activeDrillSteps.length} played</span>
          <span>{cleanDrillCount} clean</span>
          <span>{activeDrillFocusContract || "Mixed contracts"}</span>
        </div>
      {/snippet}

      {#snippet panel()}
        <ExerciseFeedback
          eyebrow={currentDrill.contract}
          title={currentDrillTrick.title}
          result={currentDrillTrick.beforeResult}
          explanation={drillFeedback}
          outcome={drillOutcome}
          warning={drillOutcome === "Illegal" || drillOutcome === "Risky" || drillOutcome === "Penalty"}
        />

        <CardChoiceHand
          cards={currentDrillTrick.hand}
          ariaLabel="Your drill hand"
          className="hand drill-hand"
          getCardClasses={drillCardClasses}
          isPressed={(card) => drillSelectedCardId === card.id}
          onSelect={selectDrillCard}
        />

        <div class="action-row">
          {#if drillCheckedCard}
            {#if isLastDrillDecision}
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {:else}
              <button class="secondary-action" onclick={finishDrill} type="button">Finish session</button>
            {/if}
            <button class="primary-action" onclick={handleDrillPrimaryAction} type="button">
              {isLastDrillDecision ? "Review session" : "Next decision"}
            </button>
          {:else}
            <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            <button class="primary-action" disabled={!drillSelectedCard} onclick={checkDrillAnswer} type="button">
              Check answer
            </button>
          {/if}
        </div>
      {/snippet}
    </TablePlaySurface>
  {:else if appView === "drillResult"}
    <header class="topbar" aria-label="Drill result">
      <button class="back-button" onclick={openActiveGameTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{drillSetTitle}</p>
        <h1>Session complete</h1>
      </div>
      <div class="contract-status">
        <span>Score</span>
        <strong>{cleanDrillCount} of {drillResults.length} clean</strong>
      </div>
    </header>

    <section class="drill-result-screen" aria-label="Drill results">
      <div class="drill-loop-panel" aria-label="Next drill step">
        <div class="drill-loop-copy">
          <p class="eyebrow">Practice loop</p>
          <h2>Next repetition</h2>
          <strong>{drillLoopInsight.heading}</strong>
          <p>{drillLoopInsight.message}</p>
        </div>
        <div class="drill-loop-detail">
          <span>Weakest contract</span>
          <strong>{drillLoopFocus}</strong>
          {#if drillLoopFocusSummary}
            <small>{drillLoopFocusSummary.clean} / {drillLoopFocusSummary.total} clean</small>
          {/if}
        </div>
        <div class="drill-loop-detail">
          <span>Recent rhythm</span>
          <strong>{drillLoopInsight.streakText}</strong>
        </div>
        <div class="drill-loop-actions">
          {#if drillResultIsHeartsPractice}
            {#if activePathStepId.startsWith("hearts-")}
              <button class="primary-action" onclick={() => continueHeartsPath()} type="button">
                {isHeartsCourseComplete ? "Back to Hearts table" : "Continue Hearts path"}
              </button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {:else}
              <button class="primary-action" onclick={replayHeartsPracticeDrill} type="button">Practice Hearts again</button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {/if}
          {:else if drillResultIsWhistPractice}
            {#if activePathStepId.startsWith("whist-")}
              <button class="primary-action" onclick={() => continueWhistPath()} type="button">
                {isWhistCourseComplete ? "Back to Whist table" : "Continue Whist path"}
              </button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {:else}
              <button class="primary-action" onclick={replayWhistPracticeDrill} type="button">Practice Whist again</button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {/if}
          {:else if drillResultIsSpadesPractice}
            {#if activePathStepId.startsWith("spades-")}
              <button class="primary-action" onclick={() => continueSpadesPath()} type="button">
                {isSpadesCourseComplete ? "Back to Spades table" : "Continue Spades path"}
              </button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {:else}
              <button class="primary-action" onclick={replaySpadesPracticeDrill} type="button">Practice Spades again</button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {/if}
          {:else if drillResultIsBridgePractice}
            {#if activePathStepId.startsWith("bridge-")}
              <button class="primary-action" onclick={() => continueBridgePath()} type="button">
                {isBridgeCourseComplete ? "Back to Bridge table" : "Continue Bridge path"}
              </button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {:else}
              <button class="primary-action" onclick={replayBridgePracticeDrill} type="button">Practice Bridge again</button>
              <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
            {/if}
          {:else}
            <button class="primary-action" onclick={() => void replayWeakContract()} type="button">
              Replay {drillLoopFocus}
            </button>
            <button class="secondary-action" onclick={() => void startDailyDrill()} type="button">Try again</button>
          {/if}
        </div>
      </div>

      <div class="drill-score-card">
        <p class="eyebrow">Result</p>
        <h2>{cleanDrillCount} / {drillResults.length} clean decisions</h2>
        <p>{drillResultMessage}</p>
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
        <div class="recent-attempt-list" aria-label="Recent quick drill attempts">
          <p class="eyebrow">Recent tables</p>
          {#each recentPlayBarbuAttempts as attempt}
            <div>
              <strong>{attempt.results.filter((result) => result.clean).length} / {attempt.results.length} clean</strong>
              <small>{attempt.results.map((result) => result.contract).join(" · ")}</small>
            </div>
          {/each}
        </div>
      {/if}

      <div class="course-actions drill-result-actions">
        {#if canMarkPracticeTableComplete && !drillResultIsTablePractice}
          <button class="primary-action" onclick={markPracticeTableComplete} type="button">Mark Practice table complete</button>
        {/if}
        {#if drillResultIsHeartsPractice}
          {#if !activePathStepId.startsWith("hearts-")}
            <button class="primary-action" onclick={openActiveGameTable} type="button">Back to Hearts practice</button>
          {/if}
        {:else if drillResultIsWhistPractice}
          {#if !activePathStepId.startsWith("whist-")}
            <button class="primary-action" onclick={openActiveGameTable} type="button">Back to Whist practice</button>
          {/if}
        {:else if drillResultIsSpadesPractice}
          {#if !activePathStepId.startsWith("spades-")}
            <button class="primary-action" onclick={openActiveGameTable} type="button">Back to Spades practice</button>
          {/if}
        {:else if drillResultIsBridgePractice}
          {#if !activePathStepId.startsWith("bridge-")}
            <button class="primary-action" onclick={openActiveGameTable} type="button">Back to Bridge practice</button>
          {/if}
        {:else if drillResultIsBarbuPractice && !drillResultIsBarbuPathPractice}
          <button class="primary-action" onclick={openActiveGameTable} type="button">Back to Barbu practice</button>
        {:else}
          <button class="primary-action" onclick={continueCourse} type="button">Continue path</button>
        {/if}
      </div>
    </section>
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
            <strong>Quick drill</strong>
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
        <button class="secondary-action" onclick={() => void startDailyDrill("generated-drill")} type="button">Quick drill</button>
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
        <strong>Decision {trickIndex + 1} of {activeTricks.length}</strong>
      </div>
    </header>

    <section class="learning-surface" aria-label="Guided trick">
      {#if currentLessonIsDomino}
        <div class="domino-layout" aria-label="Domino lesson layout">
          {#each completedDominoLessonLayout as lane, index}
            <div>
              <span>{dominoSuitLabel(index)}</span>
              <strong>{dominoLaneText(lane)}</strong>
            </div>
          {/each}
        </div>
      {:else}
        <CardTable ariaLabel="Card table" pendingBySeat={currentTrick.pendingBySeat} tableCards={completedTable} />
      {/if}

      <section class="lesson-panel" aria-label="Current lesson">
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
      </section>
    </section>
  {/if}
</main>
