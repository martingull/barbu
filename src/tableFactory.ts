export const tableTabIds = ["learn", "practice", "play", "perfect"] as const;

export type TableTabId = (typeof tableTabIds)[number];
export type ActiveGameTable = "barbu" | "hearts";
export type CatalogGameId =
  | ActiveGameTable
  | "solitaire"
  | "card-counting"
  | "whist"
  | "bridge"
  | "gin-rummy"
  | "canasta";
export type CatalogStatus = "Ready" | "Planned";
export type CatalogAccess = "Free" | "Pack";
export type CatalogAccessModel = "free-starter" | "metered-pack";
export type BarbuLearnPathAction = "lesson" | "generated" | "review" | "planned";
export type HeartsLearnPathAction = "object" | "queen" | "avoid" | "pass" | "break" | "moon" | "score";
export type BarbuPracticeAction = "quick" | "fixed" | "domino";
export type HeartsPracticeAction = "quick" | "pass" | "first" | "avoid" | "queen" | "break" | "moon" | "score";

export type TableActionDefinition = {
  id: string;
  label: string;
  destination: string;
};

export type TableScorecardDefinition = {
  label: string;
  unitLabel: string;
  objective: string;
  leaderRule: "high-score" | "low-score";
};

export type TableTabIntroDefinition = {
  eyebrow: string;
  title: string;
  summary: string;
};

export type TableTabDefinition = {
  id: TableTabId;
  label: string;
  panelId: string;
  intro: TableTabIntroDefinition;
  actions: TableActionDefinition[];
};

export type TableLearnDefinition = {
  pathAriaLabel: string;
  pathEyebrow: string;
  pathTitle: string;
  progressAriaLabel: string;
  nextSummary: string;
  completeSummary: string;
  referenceSummary: string;
};

export type GameTableDefinition = {
  id: ActiveGameTable;
  title: string;
  family: string;
  referenceId: string;
  scorecard: TableScorecardDefinition;
  learn: TableLearnDefinition;
  defaultTab: TableTabId;
  tabs: Record<TableTabId, TableTabDefinition>;
};

type CreateGameTableInput = Omit<GameTableDefinition, "tabs"> & {
  tabIntros: Record<TableTabId, TableTabIntroDefinition>;
  actionsByTab: Partial<Record<TableTabId, TableActionDefinition[]>>;
};

export type CatalogEntry = {
  id: CatalogGameId;
  family: string;
  title: string;
  status: CatalogStatus;
  access: CatalogAccess;
  accessModel: CatalogAccessModel;
  summary: string;
  lessonCount: number;
  detailLabel?: string;
};

export type CatalogDefinitionInput = {
  barbuLessonCount: number;
};

export type LearnPathStep<Action extends string = string> = {
  id: string;
  step: string;
  title: string;
  summary: string;
  action: Action;
};

export type BarbuLearnPathStep = LearnPathStep<BarbuLearnPathAction> & {
  lessonId?: string;
};

export type HeartsLearnPathStep = LearnPathStep<HeartsLearnPathAction>;

export type PracticeEntry<Action extends string = string> = {
  id: string;
  label: string;
  title: string;
  summary: string;
  action: Action;
};

export type BarbuPracticeEntry = PracticeEntry<BarbuPracticeAction> & {
  group: "practice-actions" | "fixed-drills" | "full-hands";
};
export type HeartsPracticeEntry = PracticeEntry<HeartsPracticeAction> & {
  group: "practice-actions" | "fixed-drills";
};

export type PracticeGroupLayout = "action-list" | "entry-grid" | "lesson-grid";

export type PracticeGroup<Action extends string = string> = {
  id: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  layout: PracticeGroupLayout;
  entries?: PracticeEntry<Action>[];
  lessonSource?: "barbu-fixed-lessons";
};

export type BarbuPracticeGroup = PracticeGroup<BarbuPracticeAction>;
export type HeartsPracticeGroup = PracticeGroup<HeartsPracticeAction>;

export const monetizationPolicy = {
  model: "free-usage-then-unlock",
  freeStarterIds: ["hearts", "barbu", "whist"],
  paidUnlocks: ["individual-pack", "subscription"],
  meteredFreeUsage: {
    unitLimit: "tbd",
    windowHours: 3
  }
} as const;

const tabLabels: Record<TableTabId, string> = {
  learn: "Learn",
  practice: "Practice",
  play: "Play",
  perfect: "Perfect"
};

function createLearnPathStep<Action extends string>(step: LearnPathStep<Action>): LearnPathStep<Action> {
  return step;
}

function createBarbuLearnPathStep(step: BarbuLearnPathStep): BarbuLearnPathStep {
  return step;
}

export const barbuLearnPathSteps: BarbuLearnPathStep[] = [
  createBarbuLearnPathStep({
    id: "meet-contract",
    step: "Concept",
    title: "Meet the contract",
    summary: "Barbu names the danger cards and the object before play begins.",
    action: "lesson",
    lessonId: "barbu-no-hearts"
  }),
  createBarbuLearnPathStep({
    id: "spot-danger",
    step: "Example",
    title: "Spot the danger",
    summary: "Read the table, identify who is likely to take the penalty, then choose.",
    action: "lesson",
    lessonId: "barbu-no-queens"
  }),
  createBarbuLearnPathStep({
    id: "play-trick",
    step: "Guided trick",
    title: "Play the trick",
    summary: "Make the legal play and get immediate feedback from Barbu.",
    action: "lesson",
    lessonId: "barbu-king-of-hearts"
  }),
  createBarbuLearnPathStep({
    id: "contract-no-last-two",
    step: "Contract",
    title: "Avoid the final tricks",
    summary: "Learn why the final two tricks change the hand.",
    action: "lesson",
    lessonId: "barbu-no-last-two"
  }),
  createBarbuLearnPathStep({
    id: "contract-no-tricks",
    step: "Contract",
    title: "Avoid every trick",
    summary: "Practice ducking under the current winner.",
    action: "lesson",
    lessonId: "barbu-no-tricks"
  }),
  createBarbuLearnPathStep({
    id: "contract-hearts-trumps",
    step: "Contract",
    title: "Use trumps",
    summary: "See when a heart can cut the led suit.",
    action: "lesson",
    lessonId: "barbu-hearts-trumps"
  }),
  createBarbuLearnPathStep({
    id: "contract-domino",
    step: "Layout",
    title: "Build Domino",
    summary: "Place sevens and extend suit lanes.",
    action: "lesson",
    lessonId: "barbu-domino"
  }),
  createBarbuLearnPathStep({
    id: "generated-drill",
    step: "Practice",
    title: "Practice table",
    summary: "Run generated practice decisions and review the next repetition.",
    action: "generated"
  }),
  createBarbuLearnPathStep({
    id: "review",
    step: "Review",
    title: "Review the hand",
    summary: "Review your latest table and choose what to practice next.",
    action: "review"
  })
];

export const heartsLearnPathSteps: HeartsLearnPathStep[] = [
  createLearnPathStep({
    id: "hearts-object",
    step: "Concept",
    title: "Object of Hearts",
    summary: "Avoid penalty points. Hearts are small; Queen of Spades is large.",
    action: "object"
  }),
  createLearnPathStep({
    id: "hearts-queen",
    step: "Example",
    title: "Queen of Spades",
    summary: "Read whether Queen of Spades is moving into your trick or safely away.",
    action: "queen"
  }),
  createLearnPathStep({
    id: "hearts-avoid",
    step: "Guided trick",
    title: "Avoid hearts",
    summary: "Follow suit and let heart points move away.",
    action: "avoid"
  }),
  createLearnPathStep({
    id: "hearts-pass",
    step: "Before play",
    title: "Pass three",
    summary: "Move obvious danger cards before the first trick starts.",
    action: "pass"
  }),
  createLearnPathStep({
    id: "hearts-break",
    step: "Rule",
    title: "Break hearts",
    summary: "Learn when hearts can legally be led.",
    action: "break"
  }),
  createLearnPathStep({
    id: "hearts-moon",
    step: "Tactic",
    title: "Stop the moon",
    summary: "Take danger on purpose when one player is collecting everything.",
    action: "moon"
  }),
  createLearnPathStep({
    id: "hearts-score",
    step: "Review",
    title: "Score a hand",
    summary: "Find why Queen of Spades makes a trick much more expensive.",
    action: "score"
  })
];

function createPracticeEntry<Action extends string>(entry: PracticeEntry<Action>): PracticeEntry<Action> {
  return entry;
}

function createBarbuPracticeEntry(entry: BarbuPracticeEntry): BarbuPracticeEntry {
  return entry;
}

function createHeartsPracticeEntry(entry: HeartsPracticeEntry): HeartsPracticeEntry {
  return entry;
}

function createPracticeGroup<Action extends string>(group: PracticeGroup<Action>): PracticeGroup<Action> {
  return group;
}

export const barbuPracticeEntries: BarbuPracticeEntry[] = [
  createBarbuPracticeEntry({
    id: "quick-drill",
    label: "Practice",
    title: "Quick drill",
    summary: "Run a short mixed-contract loop with immediate feedback.",
    action: "quick",
    group: "practice-actions"
  }),
  createBarbuPracticeEntry({
    id: "fixed-drills",
    label: "Fixed drills",
    title: "Practice one contract pattern.",
    summary: "Repeat one authored decision when a specific contract rule feels weak.",
    action: "fixed",
    group: "fixed-drills"
  }),
  createBarbuPracticeEntry({
    id: "domino-hand",
    label: "Domino",
    title: "Play a full layout hand",
    summary: "Use the same Domino table as Play Barbu: open suits, pass only when blocked, and race to go out.",
    action: "domino",
    group: "full-hands"
  })
];

export const heartsPracticeEntries: HeartsPracticeEntry[] = [
  createHeartsPracticeEntry({
    id: "quick-drill",
    label: "Practice",
    title: "Quick drill",
    summary: "Run a short mixed Hearts loop with immediate feedback.",
    action: "quick",
    group: "practice-actions"
  }),
  createHeartsPracticeEntry({
    id: "pass-three",
    label: "Passing",
    title: "Pass three",
    summary: "Choose the three danger cards before the hand begins.",
    action: "pass",
    group: "fixed-drills"
  }),
  createHeartsPracticeEntry({
    id: "first-trick",
    label: "Opening",
    title: "First trick",
    summary: "Follow clubs on the opening trick instead of dumping penalties.",
    action: "first",
    group: "fixed-drills"
  }),
  createHeartsPracticeEntry({
    id: "avoid-hearts",
    label: "Hearts",
    title: "Avoid hearts",
    summary: "Follow suit and avoid taking heart penalties when another card can duck.",
    action: "avoid",
    group: "fixed-drills"
  }),
  createHeartsPracticeEntry({
    id: "queen-danger",
    label: "Queen of Spades",
    title: "Queen of Spades danger",
    summary: "Practice the Queen of Spades habit: avoid winning when the danger card is loaded.",
    action: "queen",
    group: "fixed-drills"
  }),
  createHeartsPracticeEntry({
    id: "break-hearts",
    label: "Play restriction",
    title: "Break hearts",
    summary: "Decide whether a heart lead is legal before hearts have been broken.",
    action: "break",
    group: "fixed-drills"
  }),
  createHeartsPracticeEntry({
    id: "stop-the-moon",
    label: "Moon defense",
    title: "Stop the moon",
    summary: "Take a loaded trick when that is the only way to stop a moon threat.",
    action: "moon",
    group: "fixed-drills"
  }),
  createHeartsPracticeEntry({
    id: "score-a-hand",
    label: "Scorecard",
    title: "Score a hand",
    summary: "Identify why Queen of Spades makes a Hearts trick much more expensive.",
    action: "score",
    group: "fixed-drills"
  })
];

export const barbuPracticeGroups: BarbuPracticeGroup[] = [
  createPracticeGroup({
    id: "practice-actions",
    ariaLabel: "Barbu table actions",
    eyebrow: "Practice",
    title: "Practice actions",
    layout: "action-list",
    entries: barbuPracticeEntries.filter((entry) => entry.group === "practice-actions")
  }),
  createPracticeGroup({
    id: "fixed-drills",
    ariaLabel: "Fixed contract drills",
    eyebrow: "Fixed drills",
    title: "Practice one contract pattern.",
    layout: "lesson-grid",
    lessonSource: "barbu-fixed-lessons"
  }),
  createPracticeGroup({
    id: "full-hands",
    ariaLabel: "Full hand practice",
    eyebrow: "Full hands",
    title: "Practice the table surface.",
    layout: "entry-grid",
    entries: barbuPracticeEntries.filter((entry) => entry.group === "full-hands")
  })
];

export const heartsPracticeGroups: HeartsPracticeGroup[] = [
  createPracticeGroup({
    id: "practice-actions",
    ariaLabel: "Hearts table actions",
    eyebrow: "Practice",
    title: "Practice actions",
    layout: "action-list",
    entries: heartsPracticeEntries.filter((entry) => entry.group === "practice-actions")
  }),
  createPracticeGroup({
    id: "fixed-drills",
    ariaLabel: "Hearts practice drills",
    eyebrow: "Practice set",
    title: "Practice one Hearts pattern.",
    layout: "entry-grid",
    entries: heartsPracticeEntries.filter((entry) => entry.group === "fixed-drills")
  })
];

export function createGameTableDefinition(config: CreateGameTableInput): GameTableDefinition {
  return {
    ...config,
    tabs: Object.fromEntries(
      tableTabIds.map((tab) => [
        tab,
        {
          id: tab,
          label: tabLabels[tab],
          panelId: `${config.id}-${tab}-panel`,
          intro: config.tabIntros[tab],
          actions: config.actionsByTab[tab] ?? []
        }
      ])
    ) as Record<TableTabId, TableTabDefinition>
  };
}

export function tableTabLabel(tab: TableTabId) {
  return tabLabels[tab];
}

export function tableTabsFor(table: GameTableDefinition) {
  return tableTabIds.map((tab) => table.tabs[tab]);
}

export function catalogDetailLabel(entry: CatalogEntry) {
  if (entry.detailLabel) {
    return entry.detailLabel;
  }

  if (entry.lessonCount > 0) {
    return `${entry.lessonCount} ${entry.lessonCount === 1 ? "lesson" : "lessons"}`;
  }

  return "No lessons yet";
}

function createCatalogEntry(entry: CatalogEntry): CatalogEntry {
  return entry;
}

export function createCatalogEntries({ barbuLessonCount }: CatalogDefinitionInput): CatalogEntry[] {
  return [
    createCatalogEntry({
      id: "hearts",
      family: "Hearts",
      title: "Hearts",
      status: "Ready",
      access: "Free",
      accessModel: "free-starter",
      summary: "Black Lady style penalty play.",
      lessonCount: heartsLearnPathSteps.length,
      detailLabel: "MVP hand"
    }),
    createCatalogEntry({
      id: "barbu",
      family: "Hearts",
      title: "Barbu",
      status: "Ready",
      access: "Free",
      accessModel: "free-starter",
      summary: "Contract trick-taking against the King of Cards.",
      lessonCount: barbuLessonCount
    }),
    createCatalogEntry({
      id: "whist",
      family: "Whist",
      title: "Whist",
      status: "Planned",
      access: "Free",
      accessModel: "free-starter",
      summary: "Partnership trick play and long-suit development.",
      lessonCount: 0
    }),
    createCatalogEntry({
      id: "card-counting",
      family: "Skill pack",
      title: "Card Counting",
      status: "Ready",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Fast minigames for tracking trumps, court cards, and what remains.",
      lessonCount: 0,
      detailLabel: "4 minigames"
    }),
    createCatalogEntry({
      id: "solitaire",
      family: "Patience",
      title: "Solitaire",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Solo card play for practicing order, suits, and patience habits.",
      lessonCount: 0
    }),
    createCatalogEntry({
      id: "bridge",
      family: "Bridge",
      title: "Bridge",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Declarer play, defense, and bidding concepts.",
      lessonCount: 0
    }),
    createCatalogEntry({
      id: "gin-rummy",
      family: "Rummy",
      title: "Gin Rummy",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Draw, discard, meld, and read what the opponent is collecting.",
      lessonCount: 0
    }),
    createCatalogEntry({
      id: "canasta",
      family: "Rummy",
      title: "Canasta",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Partnership meld-building with wild cards, packs, and bonuses.",
      lessonCount: 0
    })
  ];
}

// Canonical table metadata for the shared Learn | Practice | Play | Perfect shell.
// UI screens should consume this shape instead of inventing one-off tab copy per game.
export const gameTableDefinitions = {
  hearts: createGameTableDefinition({
    id: "hearts",
    title: "Hearts table",
    family: "Hearts",
    referenceId: "hearts",
    scorecard: {
      label: "Hearts scorecard",
      unitLabel: "Penalty",
      objective: "Low score leads",
      leaderRule: "low-score"
    },
    learn: {
      pathAriaLabel: "Hearts lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Hearts table",
      progressAriaLabel: "Hearts course progress",
      nextSummary: "Return to the next short Hearts decision.",
      completeSummary: "Replay any Hearts lesson or move into practice.",
      referenceSummary: "Check the current MVP rules, names, scoring, and documented simplifications."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn the Hearts table.",
        summary: "Move through short card decisions before playing full hands."
      },
      practice: {
        eyebrow: "Practice",
        title: "Repeat the Hearts habits.",
        summary:
          "Use short drills for the danger cards, then move into live-hand practice for broken hearts, moon defense, and score reading."
      },
      play: {
        eyebrow: "Play",
        title: "Play a Hearts match.",
        summary:
          "Hearts plays repeated hands to 100 points with rotating passes, 2C opening, Queen of Spades at 13, and shoot-the-moon scoring."
      },
      perfect: {
        eyebrow: "Perfect",
        title: "Card sense will connect here later.",
        summary: "Trump and court-card memory should eventually feed Hearts, Whist, Bridge, and Barbu practice."
      }
    },
    defaultTab: "play",
    actionsByTab: {
      learn: [
        { id: "object", label: "Object", destination: "Hearts object concept" },
        { id: "queen-danger", label: "Queen of Spades", destination: "Queen of Spades concept" },
        { id: "passing", label: "Pass three", destination: "Hearts passing concept" },
        { id: "score-reading", label: "Score reading", destination: "Hearts score concept" },
        { id: "reference", label: "Reference", destination: "Hearts reference" }
      ],
      practice: heartsPracticeEntries.map((entry) => ({
        id: entry.id,
        label: entry.title,
        destination: `Hearts practice: ${entry.title}`
      })),
      play: [{ id: "play-hearts", label: "Play Hearts", destination: "Hearts rotating-pass match" }]
    }
  }),
  barbu: createGameTableDefinition({
    id: "barbu",
    title: "Barbu's table",
    family: "Hearts",
    referenceId: "barbu",
    scorecard: {
      label: "Barbu scorecard",
      unitLabel: "Score",
      objective: "High score leads",
      leaderRule: "high-score"
    },
    learn: {
      pathAriaLabel: "Barbu lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Barbu table",
      progressAriaLabel: "Barbu course progress",
      nextSummary: "Return to the next short card decision.",
      completeSummary: "Look over the first Barbu table before another pass.",
      referenceSummary: "Check the baseline rules, scoring, and variants."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn the Barbu table.",
        summary: "Start with compact guided card decisions, then move into drills and a full table session."
      },
      practice: {
        eyebrow: "Practice",
        title: "Sharpen one decision at a time.",
        summary: "Use short mixed drills when you want rhythm, or isolate one contract pattern when a rule feels weak."
      },
      play: {
        eyebrow: "Play",
        title: "Challenge the table.",
        summary: "Play the current local Barbu run: contracts in sequence, cumulative score, and a final table result."
      },
      perfect: {
        eyebrow: "Perfect",
        title: "Train the skills behind strong card play.",
        summary:
          "Short minigames for card-counting habits: remembering trumps, court cards, and cards that have left the deck."
      }
    },
    defaultTab: "learn",
    actionsByTab: {
      learn: [
        { id: "review-results", label: "Review results", destination: "Barbu review" },
        { id: "reset-path", label: "Reset path", destination: "Barbu Learn" },
        { id: "continue-path", label: "Continue with next lesson", destination: "Next Barbu learning step" },
        { id: "reference", label: "Reference", destination: "Barbu reference" },
        { id: "contracts", label: "Barbu contracts", destination: "Barbu contract map" }
      ],
      practice: barbuPracticeEntries.map((entry) => ({
        id: entry.id,
        label: entry.title,
        destination: `Barbu practice: ${entry.title}`
      })),
      play: [
        { id: "continue-play-barbu", label: "Continue Play Barbu", destination: "Saved Play Barbu run" },
        { id: "play-barbu", label: "Play Barbu", destination: "New Play Barbu run" }
      ],
      perfect: [
        { id: "count-trumps", label: "Count trumps", destination: "Count trumps minigame" },
        { id: "trump-memory", label: "Trump memory hand", destination: "Trump memory hand" },
        { id: "court-cards", label: "Track court cards", destination: "Court-card memory minigame" },
        { id: "danger-cards", label: "Danger cards", destination: "Danger-card memory minigame" }
      ]
    }
  })
} satisfies Record<ActiveGameTable, GameTableDefinition>;
