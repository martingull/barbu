<script lang="ts">
  import { invoke, isTauri } from "@tauri-apps/api/core";
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
  import { passBrowserDominoTurn, playBrowserDominoCard, startBrowserDominoHand } from "./browserDominoFallback";
  import { generateBrowserPlayBarbuDrillSteps } from "./browserDrillFallback";
  import CardFace from "./CardFace.svelte";
  import CardTable from "./CardTable.svelte";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import { fullHandContractCommands, fullHandContracts } from "./contractRegistry";
  import { contractRunScore, contractScoreMeta, formatContractValue } from "./contractScoring";
  import { guidedLessons } from "./lessons/catalog";
  import { referenceCatalog } from "./referenceCatalog";
  import type {
    Card,
    CompletedHandTrick,
    DominoHandState,
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
    | "barbuContracts"
    | "practiceChooser"
    | "reference"
    | "courseContent"
    | "lesson"
    | "drill"
    | "drillResult"
    | "runContractIntro"
    | "fullHand"
    | "dominoHand"
    | "pathReview";

  type PathAction = "lesson" | "generated" | "review" | "planned";
  type CourseStage = "concept" | "example" | "review";
  type BarbuTableTab = "learn" | "practice" | "play" | "perfect";

  type CatalogStatus = "Ready" | "Planned";

  type CatalogEntry = {
    id: string;
    family: string;
    title: string;
    status: CatalogStatus;
    access: "Free" | "Pack";
    summary: string;
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
    role: string;
    surface: string;
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
      access: "Free",
      summary: "Contract trick-taking against the King of Cards.",
      lessonCount: guidedLessons.length
    },
    {
      id: "hearts",
      family: "Hearts",
      title: "Hearts",
      status: "Planned",
      access: "Free",
      summary: "Plain-trick foundations before the contracts expand.",
      lessonCount: 0
    },
    {
      id: "solitaire",
      family: "Patience",
      title: "Solitaire",
      status: "Planned",
      access: "Free",
      summary: "Solo card play for practicing order, suits, and patience habits.",
      lessonCount: 0
    },
    {
      id: "whist",
      family: "Whist",
      title: "Whist",
      status: "Planned",
      access: "Pack",
      summary: "Partnership trick play and long-suit development.",
      lessonCount: 0
    },
    {
      id: "bridge",
      family: "Bridge",
      title: "Bridge",
      status: "Planned",
      access: "Pack",
      summary: "Declarer play, defense, and bidding concepts.",
      lessonCount: 0
    },
    {
      id: "gin-rummy",
      family: "Rummy",
      title: "Gin Rummy",
      status: "Planned",
      access: "Pack",
      summary: "Draw, discard, meld, and read what the opponent is collecting.",
      lessonCount: 0
    },
    {
      id: "canasta",
      family: "Rummy",
      title: "Canasta",
      status: "Planned",
      access: "Pack",
      summary: "Partnership meld-building with wild cards, packs, and bonuses.",
      lessonCount: 0
    }
  ];

  const progressStorageKey = "barbu.courseProgress.v1";
  const practiceSeedStorageKey = "barbu.practiceSeed.v1";
  const drillPatternMemoryStorageKey = "barbu.drillPatternMemory.v1";
  const playBarbuHistoryStorageKey = "barbu.playHistory.v1";
  const maxStoredDrillPatterns = 6;
  const maxStoredPlayBarbuAttempts = 8;
  const scoreSeats: Seat[] = ["You", "Tutor", "Left", "Right"];
  const dominoOrderScores = [45, 20, 5, -5];
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
      id: "contract-no-last-two",
      step: "Contract",
      title: "Avoid the final tricks",
      summary: "Learn why the final two tricks change the hand.",
      action: "lesson",
      lessonId: "barbu-no-last-two"
    },
    {
      id: "contract-no-tricks",
      step: "Contract",
      title: "Avoid every trick",
      summary: "Practice ducking under the current winner.",
      action: "lesson",
      lessonId: "barbu-no-tricks"
    },
    {
      id: "contract-hearts-trumps",
      step: "Contract",
      title: "Use trumps",
      summary: "See when a heart can cut the led suit.",
      action: "lesson",
      lessonId: "barbu-hearts-trumps"
    },
    {
      id: "contract-domino",
      step: "Layout",
      title: "Build Domino",
      summary: "Place sevens and extend suit lanes.",
      action: "lesson",
      lessonId: "barbu-domino"
    },
    {
      id: "generated-drill",
      step: "Practice",
      title: "Practice table",
      summary: "Run generated practice decisions and review the next repetition.",
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
        heading: "Barbu leads clubs. Right discards a heart into that trick.",
        body:
          "The first card in a trick sets the suit everyone must follow when they can. Right did not open hearts here; Right failed to follow clubs and threw a heart away.",
        sequence: [
          { label: "Lead", text: "Barbu plays 9C, so clubs are the led suit." },
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
        heading: "Barbu leads diamonds. Right follows with QD, loading the trick.",
        body:
          "The first card sets diamonds as the led suit. The queen is dangerous, but only the player who wins the trick takes the queen penalty.",
        sequence: [
          { label: "Lead", text: "Barbu plays 8D, so diamonds are the led suit." },
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
        heading: "Barbu leads hearts. Right plays KH into the trick.",
        body:
          "Hearts are the led suit, so hearts must be followed. The danger is not holding a heart; the danger is winning the trick that contains KH.",
        sequence: [
          { label: "Lead", text: "Barbu plays 10H, so hearts are the led suit." },
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
        heading: "Trick 12 starts with spades. Barbu is already winning.",
        body:
          "When only two tricks remain, staying under the current winner is often the whole decision. A high card that was safe earlier can now score against you.",
        sequence: [
          { label: "Late hand", text: "This is trick 12, so the trick winner takes a penalty." },
          { label: "Lead", text: "Left plays 7S and Barbu overtakes with JS." },
          { label: "Your turn", text: "You can follow low and leave the penalty with Barbu." }
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
        heading: "Barbu leads clubs. Right takes control with KC.",
        body:
          "In No Tricks, Right winning is good for you. The danger is overtaking with a higher club and taking the trick yourself.",
        sequence: [
          { label: "Lead", text: "Barbu plays 9C, so clubs are the led suit." },
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
    },
    {
      id: "hearts-trumps",
      pathStepId: "contract-hearts-trumps",
      lessonId: "barbu-hearts-trumps",
      contract: "Hearts Trumps",
      title: "Use trumps",
      concept: {
        heading: "In Hearts Trumps, hearts can beat the led suit.",
        body:
          "The follow-suit rule still comes first. If you can follow the led suit, you must. When you are void, a heart can trump and win the trick.",
        points: [
          { marker: "1", text: "Check whether you can follow the led suit." },
          { marker: "2", text: "If you are void, a heart can cut the trick." },
          { marker: "3", text: "This is a winning contract: taking tricks is good." }
        ]
      },
      example: {
        heading: "Barbu leads clubs. You have no clubs, but you have hearts.",
        body:
          "Because clubs were led and you are void in clubs, you may play any card. A heart is trump, so it beats the club trick.",
        sequence: [
          { label: "Lead", text: "Barbu plays 9C, so clubs are the led suit." },
          { label: "Then", text: "Right follows with AC and is winning for now." },
          { label: "Your turn", text: "You are void in clubs, so 5H can trump." }
        ],
        ariaLabel: "Hearts Trumps example table",
        tableCards: [
          { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
          { seat: "Right", card: { id: "AC", rank: "A", suit: "C", label: "AC" } },
          { seat: "Left", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }
        ],
        pendingBySeat: { You: "trump" }
      },
      review: {
        heading: "Hearts Trumps flips the usual Barbu habit.",
        body:
          "You practiced using a heart to take control when you are void. The important rule is that trumping is powerful only after follow-suit has been checked.",
        points: [
          { marker: "OK", text: "Follow suit still comes first." },
          { marker: "OK", text: "A heart can trump when you are void." },
          { marker: "OK", text: "Winning tricks is the goal in this contract." }
        ]
      }
    },
    {
      id: "domino",
      pathStepId: "contract-domino",
      lessonId: "barbu-domino",
      contract: "Domino",
      title: "Build Domino",
      concept: {
        heading: "Domino is a layout, not a trick.",
        body:
          "No one leads a suit and no trick is won. A suit opens with a seven, then grows outward one rank at a time toward the ace and the two.",
        points: [
          { marker: "1", text: "Open an empty suit with its seven." },
          { marker: "2", text: "Extend an open suit by exactly one rank." },
          { marker: "3", text: "Pass only when no card in your hand fits." }
        ]
      },
      example: {
        heading: "The spade lane is open around 7S.",
        body:
          "The lane already contains 6S, 7S, and 8S. You may place 5S below 6S, 9S above 8S, or open another suit with a seven.",
        sequence: [
          { label: "Lane", text: "Spades show 6S 7S 8S." },
          { label: "Legal", text: "5S extends the low end; 7H opens hearts." },
          { label: "Blocked", text: "10C cannot open clubs before 7C." }
        ],
        ariaLabel: "Domino example layout",
        tableCards: [
          { seat: "Right", card: { id: "6S", rank: "6", suit: "S", label: "6S" } },
          { seat: "Tutor", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
          { seat: "Left", card: { id: "8S", rank: "8", suit: "S", label: "8S" } }
        ],
        pendingBySeat: { You: "place" }
      },
      review: {
        heading: "Domino asks what fits the layout right now.",
        body:
          "You practiced reading a suit lane instead of reading a trick. The next habit is simple: scan for sevens, then scan the open ends of each suit.",
        points: [
          { marker: "OK", text: "Empty suits start with sevens." },
          { marker: "OK", text: "Open suits grow one rank at a time." },
          { marker: "OK", text: "Passing is only correct when nothing fits." }
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
  let activeBarbuTableTab: BarbuTableTab = "learn";
  let completedPathSteps: Record<string, boolean> = loadCourseProgress();
  let playBarbuHistory: PlayBarbuAttempt[] = loadPlayBarbuHistory();
  let usingGeneratedPractice = false;
  let generatedPracticeError = "";
  let fullHand: FullHandState | null = null;
  let dominoHand: DominoHandState | null = null;
  let fullHandSelectedCardId = "";
  let dominoSelectedCardId = "";
  let fullHandError = "";
  let dominoError = "";
  let fullHandReviewTrickCount = 0;
  let usingBrowserFullHand = false;
  let usingBrowserDomino = false;
  let lastFullHandTapCardId = "";
  let lastFullHandTapAt = 0;
  let lastDominoTapCardId = "";
  let lastDominoTapAt = 0;
  let dominoLastMoveReason = "";
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
  $: currentLessonIsDomino = contractLabel === "Domino";
  $: completedDominoLessonLayout = buildDominoDrillLayout(completedTable);
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
  $: activeBarbuTableTabLabel =
    activeBarbuTableTab === "learn"
      ? "Learn"
      : activeBarbuTableTab === "practice"
        ? "Practice"
        : activeBarbuTableTab === "play"
          ? "Play"
          : "Perfect";
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
  $: completedPracticeTableSession =
    !activeDrillFocusContract && activeDrillSteps.length >= fullHandContracts.length && drillResults.length >= activeDrillSteps.length;
  $: canMarkPracticeTableComplete = completedPracticeTableSession && !completedPathSteps["generated-drill"];
  $: currentContractResults = summarizeContractResults(drillResults);
  $: weakContract = weakestContractFromResults(currentContractResults);
  $: recentPlayBarbuAttempts = playBarbuHistory.slice(0, 3);
  $: drillLoopInsight = buildDrillLoopInsight(drillResults, recentPlayBarbuAttempts);
  $: drillLoopFocus = drillLoopInsight.contract || weakContract || "Full table";
  $: drillLoopFocusSummary = currentContractResults.find((result) => result.contract === drillLoopFocus);
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
  $: fullHandResultTitle = fullHand ? fullHandResultHeading(fullHand) : "";
  $: fullHandResultSummary = fullHand ? fullHandResultText(fullHand) : "";
  $: fullHandBestTrick = fullHand ? fullHandBestTrickLabel(fullHand) : "";
  $: fullHandWorstTrick = fullHand ? fullHandWorstTrickLabel(fullHand) : "";
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
  $: fullHandRunSeatPenalties = runSeatPenalties(fullHandRunResults);
  $: fullHandRunSeatScores = runSeatScores(fullHandRunResults);
  $: fullHandRunStandings = runStandings(fullHandRunSeatScores);
  $: fullHandRunPlayerStanding = fullHandRunStandings.find((standing) => standing.seat === "You");
  $: fullHandRunLeader = fullHandRunStandings[0];
  $: fullHandRunBestContract = runBestContract(fullHandRunOrderedResults);
  $: fullHandRunWeakestContract = runWeakestContract(fullHandRunOrderedResults);
  $: fullHandRunIsComplete = fullHandRunActive && fullHandRunResults.length >= fullHandContracts.length;
  $: fullHandRunRemainingCount = Math.max(fullHandContracts.length - fullHandRunResults.length, 0);
  $: fullHandRunLeaderLabel = fullHandRunLeader
    ? `${scoreSeatLabel(fullHandRunLeader.seat)} ${formatSignedScore(fullHandRunLeader.score)}`
    : "You 0";
  $: fullHandRunPlayerPlaceLabel = fullHandRunPlayerStanding ? formatOrdinal(fullHandRunPlayerStanding.rank) : "1st";
  $: fullHandRunRemainingLabel = `${fullHandRunRemainingCount} ${
    fullHandRunRemainingCount === 1 ? "contract" : "contracts"
  }`;
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
      : fullHand?.status === "complete" || dominoHand?.status === "complete"
        ? "Complete"
        : fullHand
          ? `Trick ${fullHand.trickNumber}`
          : dominoHand
            ? `${dominoHand.cardsRemaining} cards left`
            : "Ready";
  $: fullHandNextActionLabel = fullHandRunActive
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

  function openBarbuTable() {
    appView = "barbuTable";
  }

  function openBarbuContracts() {
    activeBarbuTableTab = "learn";
    appView = "barbuContracts";
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
    if (contract === "Hearts Trumps") {
      return startBrowserPositiveTricksHand(seed);
    }

    return startBrowserNoHeartsHand(seed);
  }

  function hasTauriRuntime() {
    return typeof window !== "undefined" && isTauri();
  }

  function invokeWithTimeout<T>(command: string, args: Record<string, unknown>, timeoutMs = 900) {
    return Promise.race<T>([
      invoke<T>(command, args),
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error(`Timed out calling ${command}`)), timeoutMs);
      })
    ]);
  }

  function isInvokeTimeoutError(error: unknown) {
    return error instanceof Error && error.message.startsWith("Timed out calling");
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
    if (state.contract === "Hearts Trumps") {
      return playBrowserPositiveTricksCard(state, cardId);
    }

    return playBrowserNoHeartsCard(state, cardId);
  }

  async function startFullHand(contract: FullHandContract, options: { keepRun?: boolean } = {}) {
    if (contract === "Domino") {
      await startDominoHand(options);
      return;
    }

    if (!options.keepRun) {
      fullHandRunActive = false;
      fullHandRunResults = [];
    }

    dominoHand = null;
    const seed = usePracticeSeed();
    fullHandSelectedCardId = "";
    fullHandError = "";
    fullHandReviewTrickCount = 0;
    lastFullHandTapCardId = "";
    lastFullHandTapAt = 0;
    const metadata = fullHandContractCommands[contract];

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

  async function startDominoHand(options: { keepRun?: boolean } = {}) {
    if (!options.keepRun) {
      fullHandRunActive = false;
      fullHandRunResults = [];
    }

    const seed = usePracticeSeed();
    fullHand = null;
    dominoSelectedCardId = "";
    dominoError = "";
    dominoLastMoveReason = "";
    lastDominoTapCardId = "";
    lastDominoTapAt = 0;

    if (!hasTauriRuntime()) {
      dominoHand = startBrowserDominoHand(seed);
      usingBrowserDomino = true;
      appView = "dominoHand";
      return;
    }

    try {
      dominoHand = await invokeWithTimeout<DominoHandState>("start_domino_hand", {
        seed
      });
      usingBrowserDomino = false;
    } catch {
      dominoHand = startBrowserDominoHand(seed);
      usingBrowserDomino = true;
    }

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
      const nextFullHand = await invoke<FullHandState>(fullHandContractCommands[fullHand.contract].playCommand, {
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
    void startFullHand("Hearts Trumps");
  }

  function startDominoPracticeHand() {
    void startFullHand("Domino");
  }

  function startBarbuRun() {
    fullHandRunActive = true;
    fullHandRunResults = [];
    fullHand = null;
    dominoHand = null;
    openRunContractIntro(fullHandContracts[0]);
  }

  function openRunContractIntro(contract: FullHandContract) {
    pendingRunContract = contract;
    appView = "runContractIntro";
  }

  function startPendingRunContract() {
    void startFullHand(pendingRunContract, { keepRun: true });
  }

  async function playDominoSelectedCard(cardId = dominoSelectedCardId) {
    if (!dominoHand || dominoHand.status === "complete" || !cardId || !dominoHand.legalCardIds.includes(cardId)) {
      return;
    }

    const playedCard = dominoHand.playerHand.find((card) => card.id === cardId);
    const moveReason = playedCard ? dominoMoveExplanation(dominoHand, playedCard) : "";
    dominoError = "";

    if (usingBrowserDomino || !hasTauriRuntime()) {
      dominoHand = playBrowserDominoCard(dominoHand, cardId);
      usingBrowserDomino = true;
      recordCompletedDominoRunResult(dominoHand);
      dominoSelectedCardId = "";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
      dominoLastMoveReason = moveReason;
      return;
    }

    try {
      dominoHand = await invokeWithTimeout<DominoHandState>("play_domino_card", {
        state: dominoHand,
        cardId
      });
      recordCompletedDominoRunResult(dominoHand);
      dominoSelectedCardId = "";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
      dominoLastMoveReason = moveReason;
    } catch (error) {
      if (!isInvokeTimeoutError(error)) {
        dominoError = typeof error === "string" ? error : "That card could not be placed.";
        return;
      }

      dominoHand = playBrowserDominoCard(dominoHand, cardId);
      usingBrowserDomino = true;
      recordCompletedDominoRunResult(dominoHand);
      dominoSelectedCardId = "";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
      dominoLastMoveReason = moveReason;
    }
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

  async function passDomino() {
    if (!dominoHand || dominoHand.status === "complete" || dominoHand.legalCardIds.length > 0) {
      return;
    }

    dominoError = "";

    if (usingBrowserDomino || !hasTauriRuntime()) {
      dominoHand = passBrowserDominoTurn(dominoHand);
      usingBrowserDomino = true;
      recordCompletedDominoRunResult(dominoHand);
      dominoLastMoveReason = "You passed because no card in your hand could start or extend a lane.";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
      return;
    }

    try {
      dominoHand = await invokeWithTimeout<DominoHandState>("pass_domino_turn", {
        state: dominoHand
      });
      recordCompletedDominoRunResult(dominoHand);
      dominoLastMoveReason = "You passed because no card in your hand could start or extend a lane.";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
    } catch (error) {
      if (!isInvokeTimeoutError(error)) {
        dominoError = typeof error === "string" ? error : "You could not pass here.";
        return;
      }

      dominoHand = passBrowserDominoTurn(dominoHand);
      usingBrowserDomino = true;
      recordCompletedDominoRunResult(dominoHand);
      dominoLastMoveReason = "You passed because no card in your hand could start or extend a lane.";
      lastDominoTapCardId = "";
      lastDominoTapAt = 0;
    }
  }

  function startNextDominoHand() {
    if (!dominoHand) {
      return;
    }

    if (fullHandRunActive) {
      recordCompletedDominoRunResult(dominoHand);

      if (fullHandRunIsComplete) {
        startBarbuRun();
        return;
      }

      const currentIndex = fullHandContracts.indexOf(dominoHand.contract);
      const nextContract = fullHandContracts[(currentIndex + 1) % fullHandContracts.length] ?? "No Hearts";
      openRunContractIntro(nextContract);
      return;
    }

    const currentIndex = fullHandContracts.indexOf(dominoHand.contract);
    const nextContract = fullHandContracts[(currentIndex + 1) % fullHandContracts.length] ?? "No Hearts";
    void startFullHand(nextContract);
  }

  function replayDominoHand() {
    if (!dominoHand) {
      return;
    }

    if (fullHandRunActive) {
      fullHandRunResults = fullHandRunResults.filter((result) => result.contract !== "Domino");
      void startFullHand("Domino", { keepRun: true });
      return;
    }

    void startFullHand("Domino");
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

  function recordCompletedDominoRunResult(state: DominoHandState | null) {
    if (!fullHandRunActive || !state || state.status !== "complete") {
      return;
    }

    const result: FullHandRunResult = {
      contract: "Domino",
      playerPenalty: state.scores[2] ?? 0,
      totalPenalty: state.scores.reduce((total, score) => total + score, 0),
      seatPenalties: dominoSeatScores(state)
    };

    fullHandRunResults = [...fullHandRunResults.filter((item) => item.contract !== "Domino"), result];
  }

  function dominoSeatScores(state: DominoHandState): Record<Seat, number> {
    return {
      Tutor: state.scores[0] ?? 0,
      Right: state.scores[1] ?? 0,
      You: state.scores[2] ?? 0,
      Left: state.scores[3] ?? 0
    };
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

  function fullHandTrickFeedback(trick: CompletedHandTrick) {
    const penaltyText = `${trick.penalty} ${trick.penalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;

    if (fullHand?.contract === "Hearts Trumps") {
      return trick.winner === "You"
        ? `You won the trick and banked ${penaltyText}. Good: hearts are trumps in this contract.`
        : `${trick.winner} won the trick and banked ${penaltyText}. Look for a heart or higher control next time.`;
    }

    if (fullHand?.contract === "No Last Two") {
      const trickNumber = fullHandCompletedTrickNumber(trick);
      if (trickNumber <= 11) {
        return trick.winner === "You"
          ? "You won a setup trick. No score yet; high cards are being shed before the final two."
          : `${trick.winner} won a setup trick. No score yet; high cards are being shed before the final two.`;
      }
      return trick.winner === "You"
        ? `You won trick ${trickNumber} and took ${penaltyText}. This is one of the final two.`
        : `${trick.winner} won trick ${trickNumber} and took ${penaltyText}. Good: you stayed out of the final-two penalty.`;
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

  function fullHandResultText(hand: FullHandState) {
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

  function dominoLaneText(lane: Card[]) {
    return lane.length ? lane.map((card) => card.label).join(" ") : "Open with 7";
  }

  function dominoSeatProgressLabel(state: DominoHandState, seat: Seat) {
    const outIndex = state.outOrder.indexOf(seat);

    if (outIndex >= 0) {
      return `${formatOrdinal(outIndex + 1)} ${formatSignedScore(dominoOrderScores[outIndex] ?? 0)}`;
    }

    const cardsLeft = state.hands[playerIndexBySeat[seat]]?.length ?? 0;
    return `${cardsLeft} ${cardsLeft === 1 ? "card" : "cards"}`;
  }

  function dominoOutOrderText(state: DominoHandState) {
    return state.outOrder.length ? state.outOrder.map((seat) => scoreSeatLabel(seat as Seat)).join(" ") : "No one out";
  }

  function dominoMoveExplanation(state: DominoHandState, card: Card | undefined) {
    if (!card) {
      if (state.legalCardIds.length === 0) {
        return "You are blocked. Passing is correct because no card in your hand starts or extends a lane.";
      }

      return `Legal cards are highlighted. Open a closed suit with a seven, or extend an open suit by one rank. The next player out scores ${formatSignedScore(dominoNextOutScore)}.`;
    }

    if (!dominoLegalCardIds.has(card.id)) {
      return dominoIllegalMoveExplanation(state, card);
    }

    const lane = state.layout[suitIndex(card.suit)];
    const unlockedCards = dominoCardsUnlockedByPlacement(state, card);
    const finishText =
      state.playerHand.length === 1
        ? ` It empties your hand and claims ${formatSignedScore(dominoNextOutScore)}.`
        : "";
    const unlockText = unlockedCards.length
      ? ` It also prepares ${unlockedCards.map((unlocked) => unlocked.label).join(" or ")} for a later turn.`
      : "";

    if (lane.length === 0) {
      return `${card.label} opens the ${suitNames[card.suit]} lane from seven.${unlockText}${finishText}`;
    }

    const direction = dominoExtensionDirection(lane, card);
    return `${card.label} extends ${suitNames[card.suit]} ${direction}. This reduces your hand without opening an unrelated suit.${unlockText}${finishText}`;
  }

  function dominoIllegalMoveExplanation(state: DominoHandState, card: Card) {
    const lane = state.layout[suitIndex(card.suit)];

    if (lane.length === 0) {
      return `${card.label} is blocked because a closed suit must start with its seven.`;
    }

    return `${card.label} is blocked because ${suitNames[card.suit]} currently shows ${dominoLaneText(lane)}; only the next lower or next higher rank fits.`;
  }

  function dominoCardsUnlockedByPlacement(state: DominoHandState, card: Card) {
    const nextLayout = state.layout.map((lane) => [...lane]);
    const lane = nextLayout[suitIndex(card.suit)];
    lane.push(card);
    lane.sort((left, right) => rankValue(left.rank) - rankValue(right.rank));

    return state.playerHand
      .filter((heldCard) => heldCard.id !== card.id && heldCard.suit === card.suit)
      .filter((heldCard) => isLegalDominoCardOnLayout(nextLayout, heldCard));
  }

  function isLegalDominoCardOnLayout(layout: Card[][], card: Card) {
    const lane = layout[suitIndex(card.suit)];

    if (lane.length === 0) {
      return card.rank === "7";
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

  async function loadGeneratedDrillCandidates(focusContract = "") {
    const seed = usePracticeSeed();

    try {
      const drillSet = await invoke<GeneratedDrillSet>("generate_daily_drill_set", {
        seed
      });

      const candidates = drillSet.scenarios
        .map(drillStepFromGeneratedScenario)
        .filter((step) => !focusContract || step.contract === focusContract);

      if (candidates.length > 0) {
        return { candidates, seed };
      }
    } catch {
      const candidates = generateBrowserPlayBarbuDrillSteps(seed).filter(
        (step) => !focusContract || step.contract === focusContract
      );

      if (candidates.length > 0) {
        return { candidates, seed };
      }
    }

    const fallbackCandidates = drillSteps.filter((step) => !focusContract || step.contract === focusContract);

    return {
      candidates: fallbackCandidates.length > 0 ? fallbackCandidates : [drillSteps[0]],
      seed
    };
  }

  async function loadGeneratedDrillStep(focusContract = "") {
    const { candidates, seed } = await loadGeneratedDrillCandidates(focusContract);

    return selectGeneratedDrillCandidate(candidates, seed);
  }

  async function loadGeneratedDrillSessionSteps(focusContract = "") {
    const { candidates, seed } = await loadGeneratedDrillCandidates(focusContract);

    if (focusContract) {
      return [selectGeneratedDrillCandidate(candidates, seed)];
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
    activeDrillFocusContract = replayContract;
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = `Replay ${replayContract}`;
    resetDrillDecision();

    activeDrillSteps = [await loadGeneratedDrillStep(replayContract)];
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

  function startFixedContractDrill(lessonId: string) {
    const lesson = guidedLessons.find((item) => item.id === lessonId);
    const step = lesson ? drillSteps.find((item) => item.contract === lesson.contract) : undefined;

    if (!lesson || !step) {
      return;
    }

    activePathStepId = "";
    activeDrillFocusContract = lesson.contract;
    drillIndex = 0;
    drillResults = [];
    drillSetTitle = `Fixed drill: ${lesson.contract}`;
    activeDrillSteps = [step];
    resetDrillDecision();
    appView = "drill";
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

    try {
      saveCompletedDrillSession();
      if (completedPathPracticeTable) {
        saveCourseProgress({ ...completedPathSteps, "generated-drill": true });
      }
    } catch {
      // The result screen should still open if local storage is unavailable.
    }

    if (completedPathPracticeTable) {
      openPathReview();
      return;
    }

    appView = "drillResult";
  }

  function markPracticeTableComplete() {
    saveCourseProgress({ ...completedPathSteps, "generated-drill": true });
    activeBarbuTableTab = "learn";

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

<main class:fixed-play-screen={appView === "drill"} class="app-shell">
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
            <span class="game-card-meta">
              <span class="game-family">{game.family}</span>
              <span class:free-access={game.access === "Free"} class="game-access">{game.access}</span>
            </span>
            <strong>{game.title}</strong>
            <span class="game-summary">{game.summary}</span>
            <span class="game-footer">
              <span>{game.status}</span>
              {#if game.lessonCount > 0}
                <span>{catalogDetailLabel(game)}</span>
              {/if}
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
        <span>Current mode</span>
        <strong>{activeBarbuTableTabLabel}</strong>
      </div>
    </header>

    <section class="table-room" aria-label="Barbu table modes">
      <div class="barbu-table-rail">
        <div class="barbu-mode-box">
          <p class="eyebrow">Table mode</p>
          <div class="barbu-table-tabs" aria-label="Barbu table sections" role="tablist">
            <button
              aria-controls="barbu-learn-panel"
              aria-selected={activeBarbuTableTab === "learn"}
              class:active={activeBarbuTableTab === "learn"}
              onclick={() => {
                activeBarbuTableTab = "learn";
              }}
              role="tab"
              type="button"
            >
              Learn
            </button>
            <button
              aria-controls="barbu-practice-panel"
              aria-selected={activeBarbuTableTab === "practice"}
              class:active={activeBarbuTableTab === "practice"}
              onclick={() => {
                activeBarbuTableTab = "practice";
              }}
              role="tab"
              type="button"
            >
              Practice
            </button>
            <button
              aria-controls="barbu-play-panel"
              aria-selected={activeBarbuTableTab === "play"}
              class:active={activeBarbuTableTab === "play"}
              onclick={() => {
                activeBarbuTableTab = "play";
              }}
              role="tab"
              type="button"
            >
              Play
            </button>
            <button
              aria-controls="barbu-perfect-panel"
              aria-selected={activeBarbuTableTab === "perfect"}
              class:active={activeBarbuTableTab === "perfect"}
              onclick={() => {
                activeBarbuTableTab = "perfect";
              }}
              role="tab"
              type="button"
            >
              Perfect
            </button>
          </div>
        </div>
      </div>

      {#if activeBarbuTableTab === "learn"}
        <div
          aria-label="Learn"
          class="barbu-tab-panel learn-panel"
          id="barbu-learn-panel"
          role="tabpanel"
        >
          <div class="table-action-groups" aria-label="Barbu table actions">
            <section class="learn-action-grid" aria-label="Learn actions">
              {#if isCourseComplete}
                <button class="learn-action-card primary" onclick={openPathReview} type="button">
                  <span class="eyebrow">Review</span>
                  <strong>Review results</strong>
                  <small>Look over the first Barbu table before another pass.</small>
                </button>
                <button class="learn-action-card" onclick={resetCourseProgress} type="button">
                  <span class="eyebrow">Reset</span>
                  <strong>Reset path</strong>
                  <small>Clear lesson progress and start the table again.</small>
                </button>
              {:else if nextPathStep}
                <button class="learn-action-card primary" onclick={continueCourse} type="button">
                  <span class="eyebrow">Next lesson</span>
                  <strong>Continue with {nextPathStep.title}</strong>
                  <small>Return to the next short card decision.</small>
                </button>
              {/if}
              <button class="learn-action-card" onclick={() => openReference("barbu")} type="button">
                <span class="eyebrow">Rules</span>
                <strong>Reference</strong>
                <small>Check the baseline rules, scoring, and variants.</small>
              </button>
            </section>
          </div>

          <button class="learn-action-card" onclick={openBarbuContracts} type="button">
            <span class="eyebrow">Core game</span>
            <strong>Barbu contracts</strong>
            <small>Open the contract map.</small>
          </button>

          <section class="path-section" aria-label="Barbu lesson path">
            <div class="section-heading">
              <p class="eyebrow">Training path</p>
              <h2>Learn the Barbu table</h2>
            </div>

            <div class="course-progress path-progress" aria-label="Course progress">
              <span>{completedCount} / {playablePathSteps.length} complete</span>
              <div class="progress-track">
                <div class="progress-fill" style={`width: ${(completedCount / playablePathSteps.length) * 100}%`}></div>
              </div>
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
        </div>
      {:else if activeBarbuTableTab === "practice"}
        <div
          aria-label="Practice"
          class="barbu-tab-panel practice-panel"
          id="barbu-practice-panel"
          role="tabpanel"
        >
          <div class="barbu-mode-copy">
            <p class="eyebrow">Practice</p>
            <h2>Sharpen one decision at a time.</h2>
            <p>Use short mixed drills when you want rhythm, or isolate one contract pattern when a rule feels weak.</p>
          </div>
          <div class="table-action-groups" aria-label="Barbu table actions">
            <section class="table-action-group" aria-label="Practice actions">
              <p class="eyebrow">Practice</p>
              <button class="drill-action" onclick={() => void startDailyDrill()} type="button">Quick drill</button>
            </section>
          </div>

          <section class="fixed-contract-practice" aria-label="Fixed contract drills">
            <div class="section-heading">
              <p class="eyebrow">Fixed drills</p>
              <h2>Practice one contract pattern.</h2>
            </div>
            <div class="fixed-contract-grid">
              {#each guidedLessons as lesson}
                <button class="contract-card compact" onclick={() => startFixedContractDrill(lesson.id)} type="button">
                  <span>{lesson.contract}</span>
                  <strong>{lesson.title}</strong>
                  <small>One authored decision with immediate feedback.</small>
                </button>
              {/each}
            </div>
          </section>
        </div>
      {:else if activeBarbuTableTab === "play"}
        <div
          aria-label="Play"
          class="barbu-tab-panel play-panel"
          id="barbu-play-panel"
          role="tabpanel"
        >
          <div class="barbu-mode-copy">
            <p class="eyebrow">Play</p>
            <h2>Challenge the table.</h2>
            <p>Play the current local Barbu run: contracts in sequence, cumulative score, and a final table result.</p>
          </div>
          <div class="table-action-groups" aria-label="Barbu table actions">
            <section class="table-action-group" aria-label="Play actions">
              <p class="eyebrow">Play</p>
              <button class="drill-action" onclick={startBarbuRun} type="button">Play Barbu</button>
            </section>
          </div>
        </div>
      {:else}
        <div
          aria-label="Perfect"
          class="barbu-tab-panel perfect-panel"
          id="barbu-perfect-panel"
          role="tabpanel"
        >
          <div class="barbu-mode-copy">
            <p class="eyebrow">Perfect</p>
            <h2>Train the skills behind strong card play.</h2>
            <p>
              Placeholder for short minigames that build card-counting habits: remembering trumps, court cards, and
              cards that have left the deck.
            </p>
          </div>

          <section class="perfect-skill-grid" aria-label="Perfect mode placeholders">
            <article class="perfect-skill-card">
              <span>Planned</span>
              <strong>Count trumps</strong>
              <small>Track which trump cards have appeared and name what remains.</small>
            </article>
            <article class="perfect-skill-card">
              <span>Planned</span>
              <strong>Track court cards</strong>
              <small>Remember kings, queens, and jacks as tricks move around the table.</small>
            </article>
          </section>
        </div>
      {/if}
    </section>
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
          {#if activeCourse.contract === "Domino"}
            <div class="domino-layout" aria-label={activeCourse.example.ariaLabel}>
              {#each buildDominoDrillLayout(activeCourse.example.tableCards) as lane, index}
                <div>
                  <span>{dominoSuitLabel(index)}</span>
                  <strong>{dominoLaneText(lane)}</strong>
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
  {:else if appView === "fullHand"}
    {#if fullHand}
      <TablePlaySurface
        mode={fullHand.status === "complete" ? "result" : "play"}
        ariaLabel={`${fullHand.contract} full hand`}
        title={`${fullHand.contract} hand`}
        eyebrow={fullHandRunActive ? "Play Barbu" : "Contract hand"}
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
                <span>{fullHandContractMeta.playerValueLabel}</span>
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
              {#if fullHand.contract === "No Last Two"}
                <div>
                  <span>{fullHandNoLastTwoPhaseLabel}</span>
                  <strong>{fullHandNoLastTwoPhaseValue}</strong>
                </div>
              {/if}
              {#if fullHandRunActive}
                {#each scoreSeats as seat}
                  <div>
                    <span>{scoreSeatRunLabel(seat)} score</span>
                    <strong>{formatSignedScore(fullHandRunSeatScores[seat])}</strong>
                  </div>
                {/each}
              {/if}
            </div>
          {:else}
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
            {#if fullHandRunIsComplete}
              <div class="lesson-heading">
                <p class="eyebrow">Play Barbu</p>
                <h2>{fullHandRunResultTitle}</h2>
              </div>

              <p class="result">{fullHandRunResultSummary}</p>

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
            <p class="explanation">
              {fullHand.contract === "No Last Two"
                ? "Check the trick number first. Tap the table or press Next trick when you are ready."
                : "Left's card is on the table. Tap the table or press Next trick when you are ready."}
            </p>
          {:else}
            <div class="lesson-heading">
              <p class="eyebrow">Your turn</p>
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
                  aria-label={`${card.rank} ${card.suit}`}
                  aria-pressed={fullHandSelectedCardId === card.id}
                  class:heart={fullHandCardClasses(card).heart}
                  class:illegal={fullHandCardClasses(card).illegal}
                  class:legal={fullHandCardClasses(card).legal}
                  class:selected={fullHandCardClasses(card).selected}
                  class="card hand-card full-hand-card"
                  onclick={() => void selectFullHandCard(card)}
                  type="button"
                >
                  <CardFace {card} decorative />
                </button>
              {/each}
            </div>
          {/if}

          <div class="action-row">
            {#if fullHand.status === "complete"}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              {#if fullHandRunIsComplete}
                <button class="secondary-action" onclick={() => void replayWeakestRunContract()} type="button">Replay weakest</button>
                <button class="primary-action" onclick={startBarbuRun} type="button">New game</button>
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
        showTable={false}
        panelAriaLabel="Domino hand decision"
        onBack={openBarbuTable}
      >
        {#snippet summary()}
          <div
            class:compact-run-complete={fullHandRunIsComplete}
            class="full-hand-summary"
            aria-label="Domino hand score"
          >
            {#each scoreSeats as seat}
              <div>
                <span>{scoreSeatRunLabel(seat)} score</span>
                <strong>{formatSignedScore(dominoScoreMap[seat])}</strong>
              </div>
            {/each}
            {#if !fullHandRunIsComplete}
              <div>
                <span>Cards left</span>
                <strong>{dominoHand.cardsRemaining}</strong>
              </div>
              <div>
                <span>Next out</span>
                <strong>{formatSignedScore(dominoNextOutScore)}</strong>
              </div>
            {/if}
          </div>

          {#if !fullHandRunIsComplete}
            <div class="domino-layout" aria-label="Domino layout">
              {#each dominoHand.layout as lane, index}
                <div>
                  <span>{dominoSuitLabel(index)}</span>
                  <strong>{dominoLaneText(lane)}</strong>
                </div>
              {/each}
            </div>
          {/if}
        {/snippet}

        {#snippet panel()}
          {#if dominoHand.status === "complete"}
            {#if fullHandRunIsComplete}
              <div class="lesson-heading">
                <p class="eyebrow">Play Barbu</p>
                <h2>{fullHandRunResultTitle}</h2>
              </div>

              <p class="result">{fullHandRunResultSummary}</p>

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
              <div class="lesson-heading">
                <p class="eyebrow">Result</p>
                <h2>{dominoResultTitle}</h2>
              </div>

              <p class="result">{dominoResultSummary}</p>
              <div class="full-hand-run-score" aria-label="Domino result summary">
                {#each scoreSeats as seat}
                  <div>
                    <span>{scoreSeatLabel(seat)}</span>
                    <strong>{formatSignedScore(dominoScoreMap[seat])}</strong>
                  </div>
                {/each}
              </div>
            {/if}
          {:else}
            <div class="lesson-heading">
              <p class="eyebrow">Your turn</p>
              <h2>Place a card</h2>
            </div>

            <p class="result">{dominoHand.prompt}</p>
            {#if dominoError}
              <p class="outcome warning">{dominoError}</p>
            {/if}
            <p class="explanation">{dominoMoveReason}</p>

            <div class="domino-counter" aria-label="Domino point counter">
              {#each scoreSeats as seat}
                <div>
                  <span>{scoreSeatRunLabel(seat)}</span>
                  <strong>{dominoSeatProgressLabel(dominoHand, seat)}</strong>
                </div>
              {/each}
              <div>
                <span>Next out</span>
                <strong>{formatSignedScore(dominoNextOutScore)}</strong>
              </div>
              <div>
                <span>Order</span>
                <strong>{dominoOutOrderText(dominoHand)}</strong>
              </div>
            </div>

            <div class="hand full-hand-cards domino-cards" aria-label="Your Domino hand">
              {#each dominoHand.playerHand as card}
                <button
                  aria-label={`${card.rank} ${card.suit}`}
                  aria-pressed={dominoSelectedCardId === card.id}
                  class:heart={dominoCardClasses(card).heart}
                  class:illegal={dominoCardClasses(card).illegal}
                  class:legal={dominoCardClasses(card).legal}
                  class:selected={dominoCardClasses(card).selected}
                  class="card hand-card full-hand-card"
                  onclick={() => void selectDominoCard(card)}
                  onfocus={() => {
                    dominoSelectedCardId = card.id;
                  }}
                  type="button"
                >
                  <CardFace {card} decorative />
                </button>
              {/each}
            </div>
          {/if}

          <div class="action-row">
            {#if dominoHand.status === "complete"}
              <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
              {#if fullHandRunIsComplete}
                <button class="secondary-action" onclick={() => void replayWeakestRunContract()} type="button">Replay weakest</button>
                <button class="primary-action" onclick={startBarbuRun} type="button">New game</button>
              {:else}
                <button class="secondary-action" onclick={() => void startNextDominoHand()} type="button">{fullHandNextActionLabel}</button>
                <button class="primary-action" onclick={() => void replayDominoHand()} type="button">Replay</button>
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
      ariaLabel="Quick drill"
      title="Quick drill"
      eyebrow={drillSetTitle}
      statusLabel={currentDrill.contract}
      statusValue={`Decision ${currentDrillDecisionNumber} of ${activeDrillSteps.length}`}
      tableAriaLabel="Drill card table"
      pendingBySeat={currentDrillTrick.pendingBySeat}
      showTable={!currentDrillIsDomino}
      tableCards={currentDrillIsDomino ? [] : drillCompletedTable}
      panelAriaLabel="Drill decision"
      onBack={openBarbuTable}
    >
      {#snippet summary()}
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
              aria-label={`${card.rank} ${card.suit}`}
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
              <CardFace {card} decorative />
            </button>
          {/each}
        </div>

        <div class="action-row">
          {#if drillCheckedCard}
            <button class="secondary-action" onclick={finishDrill} type="button">Finish session</button>
            <button class="primary-action" onclick={() => void continueDrill()} type="button">
              {isLastDrillDecision ? "Review session" : "Next decision"}
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
          <button class="primary-action" onclick={() => void replayWeakContract()} type="button">
            Replay {drillLoopFocus}
          </button>
          <button class="secondary-action" onclick={() => void startDailyDrill()} type="button">Try again</button>
        </div>
      </div>

      <div class="drill-score-card">
        <p class="eyebrow">Result</p>
        <h2>{cleanDrillCount} / {drillResults.length} clean decisions</h2>
        <p>
          {drillResults.length > 0 && cleanDrillCount === drillResults.length
            ? "Clean session. Barbu is ready to raise the pressure."
            : "Use the next repetition to make the weak decision automatic."}
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
        {#if canMarkPracticeTableComplete}
          <button class="primary-action" onclick={markPracticeTableComplete} type="button">Mark Practice table complete</button>
        {/if}
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
        <button class="secondary-action" onclick={openBarbuTable} type="button">Table</button>
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
              aria-label={`${card.rank} ${card.suit}`}
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
              <CardFace {card} decorative />
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
