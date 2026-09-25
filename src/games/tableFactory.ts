import type { Card } from "../domain/types";

export const tableTabIds = ["learn", "play", "perfect"] as const;

export type TableTabId = (typeof tableTabIds)[number];
export type ActiveGameTable = "barbu" | "hearts" | "whist" | "spades" | "bridge" | string;
export type CatalogGameId =
  | ActiveGameTable
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
  card: Pick<Card, "rank" | "suit">;
};

export type LearnPathStep<Action extends string = string> = {
  id: string;
  step: string;
  title: string;
  summary: string;
  action: Action;
  lessonId?: string;
  exerciseAction?: string;
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
  freeStarterIds: ["hearts", "barbu", "whist", "spades", "bridge", "card-counting"],
  paidUnlocks: ["individual-pack", "subscription"],
  meteredFreeUsage: {
    unitLimit: "tbd",
    windowHours: 3
  }
} as const;

const tabLabels: Record<TableTabId, string> = {
  learn: "Learn",
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
  return tableTabIds.filter(tab => tab !== "perfect").map((tab) => table.tabs[tab]);
}

function createCatalogEntry(entry: CatalogEntry): CatalogEntry {
  return entry;
}

export type CatalogCategory = {
  id: string;
  title: string;
  summary: string;
  entries: CatalogEntry[];
};

export function getCatalogCategories(): CatalogCategory[] {
  const categories: CatalogCategory[] = [
    {
      id: "games",
      title: "Choose a table",
      summary: "Classic card club games.",
      entries: [
        createCatalogEntry({
          id: "hearts",
          family: "Hearts",
          title: "Hearts",
          card: { rank: "Q", suit: "S" },
          status: "Ready",
          access: "Free",
          accessModel: "free-starter",
          summary: "Keep hearts and the queen of spades out of your tricks."
        }),
        createCatalogEntry({
          id: "whist",
          family: "Whist",
          title: "Whist",
          card: { rank: "A", suit: "C" },
          status: "Ready",
          access: "Free",
          accessModel: "free-starter",
          summary: "Win tricks together with a partner."
        }),
        createCatalogEntry({
          id: "spades",
          family: "Whist",
          title: "Spades",
          card: { rank: "A", suit: "S" },
          status: "Ready",
          access: "Free",
          accessModel: "free-starter",
          summary: "Bid your tricks. Spades are always trump."
        }),
        createCatalogEntry({
          id: "bridge",
          family: "Bridge",
          title: "Bridge",
          card: { rank: "K", suit: "D" },
          status: "Ready",
          access: "Free",
          accessModel: "free-starter",
          summary: "Bid a contract, then play as declarer or defend."
        }),
        createCatalogEntry({
          id: "barbu",
          family: "Hearts",
          title: "Barbu",
          card: { rank: "K", suit: "H" },
          status: "Ready",
          access: "Free",
          accessModel: "free-starter",
          summary: "Seven contracts, with a new objective each hand."
        }),
        createCatalogEntry({
          id: "gin-rummy",
          family: "Rummy",
          title: "Gin Rummy",
          card: { rank: "7", suit: "D" },
          status: "Planned",
          access: "Pack",
          accessModel: "metered-pack",
          summary: "Draw, discard, meld, and read what the opponent is collecting."
        }),
        createCatalogEntry({
          id: "canasta",
          family: "Rummy",
          title: "Canasta",
          card: { rank: "2", suit: "H" },
          status: "Planned",
          access: "Pack",
          accessModel: "metered-pack",
          summary: "Partnership meld-building with wild cards, packs, and bonuses."
        })
      ]
    },
    {
      id: "skill-packs",
      title: "Card Skills",
      summary: "Solo drills and memory trainers.",
      entries: [
        createCatalogEntry({
          id: "card-counting",
          family: "Card skills",
          title: "Card Counting I",
          card: { rank: "J", suit: "C" },
          status: "Ready",
          access: "Free",
          accessModel: "free-starter",
          summary: "Remember trumps, high cards and danger cards."
        }),
        createCatalogEntry({
          id: "card-counting-ii",
          family: "Skill pack",
          title: "Card Counting II",
          card: { rank: "J", suit: "S" },
          status: "Planned",
          access: "Pack",
          accessModel: "metered-pack",
          summary: "Bridge-oriented counting for suits, high cards, and table inference."
        }),
        createCatalogEntry({
          id: "solitaire",
          family: "Patience",
          title: "Solitaire",
          card: { rank: "A", suit: "D" },
          status: "Planned",
          access: "Pack",
          accessModel: "metered-pack",
          summary: "Solo card play for practicing order, suits, and patience habits."
        })
      ]
    }
  ];

  return categories
    .map((category) => ({
      ...category,
      entries: category.entries.filter((entry) => entry.status === "Ready")
    }))
    .filter((category) => category.entries.length > 0);
}
