export const tableTabIds = ["learn", "practice", "play", "perfect"] as const;

export type TableTabId = (typeof tableTabIds)[number];
export type ActiveGameTable = "barbu" | "hearts" | "whist" | "spades" | string;
export type CatalogGameId =
  | ActiveGameTable
  | "amerikaner"
  | "solitaire"
  | "card-counting"
  | "card-counting-ii"
  | "bridge"
  | "gin-rummy"
  | "canasta";
export type CatalogStatus = "Ready" | "Planned";
export type CatalogAccess = "Free" | "Pack";
export type CatalogAccessModel = "free-starter" | "metered-pack";

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
  id: string;
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
};

export type LearnPathStep<Action extends string = string> = {
  id: string;
  step: string;
  title: string;
  summary: string;
  action: Action;
  lessonId?: string;
};

export type PracticeEntry<Action extends string = string> = {
  id: string;
  label: string;
  title: string;
  summary: string;
  action: Action;
  group: string;
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

export const monetizationPolicy = {
  model: "free-usage-then-unlock",
  freeStarterIds: ["hearts", "barbu", "whist", "spades"],
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
  perfect: "Pro"
};

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

function createCatalogEntry(entry: CatalogEntry): CatalogEntry {
  return entry;
}

export function createCatalogEntries(): CatalogEntry[] {
  return [
    createCatalogEntry({
      id: "hearts",
      family: "Hearts",
      title: "Hearts",
      status: "Ready",
      access: "Free",
      accessModel: "free-starter",
      summary: "Black Lady style penalty play."
    }),
    createCatalogEntry({
      id: "barbu",
      family: "Hearts",
      title: "Barbu",
      status: "Ready",
      access: "Free",
      accessModel: "free-starter",
      summary: "Seven-contract table play with changing objectives."
    }),
    createCatalogEntry({
      id: "whist",
      family: "Whist",
      title: "Whist",
      status: "Ready",
      access: "Free",
      accessModel: "free-starter",
      summary: "Partnership trick play and silent suit signals."
    }),
    createCatalogEntry({
      id: "spades",
      family: "Whist",
      title: "Spades",
      status: "Ready",
      access: "Free",
      accessModel: "free-starter",
      summary: "Partnership trick play with spades always trump."
    }),
    createCatalogEntry({
      id: "amerikaner",
      family: "Whist",
      title: "Amerikaner",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Scandinavian auction-whist play with bidding before the hand."
    }),
    createCatalogEntry({
      id: "card-counting",
      family: "Skill pack",
      title: "Card Counting I",
      status: "Ready",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "4 minigames for real-hand memory: trumps, court cards, and danger cards."
    }),
    createCatalogEntry({
      id: "card-counting-ii",
      family: "Skill pack",
      title: "Card Counting II",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Bridge-oriented counting for suits, high cards, and table inference."
    }),
    createCatalogEntry({
      id: "solitaire",
      family: "Patience",
      title: "Solitaire",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Solo card play for practicing order, suits, and patience habits."
    }),
    createCatalogEntry({
      id: "bridge",
      family: "Bridge",
      title: "Bridge",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Declarer play, defense, and bidding concepts."
    }),
    createCatalogEntry({
      id: "gin-rummy",
      family: "Rummy",
      title: "Gin Rummy",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Draw, discard, meld, and read what the opponent is collecting."
    }),
    createCatalogEntry({
      id: "canasta",
      family: "Rummy",
      title: "Canasta",
      status: "Planned",
      access: "Pack",
      accessModel: "metered-pack",
      summary: "Partnership meld-building with wild cards, packs, and bonuses."
    })
  ];
}
