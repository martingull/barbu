/// <reference types="vite/client" />
import type { Card } from "../domain/types";
import { gameAccess, hasReleasedGameAccess, type GameAccess } from "./accessPolicy";
import type { PremiumSnapshot } from "../domain/premiumAccess";

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
  referenceTitle: string;
  guidedHandGoal?: string;
};

export const gameRulesCopy = {
  referenceTitle: "Game rules",
  referenceSummary: "Read the rules, scoring and variations."
} as const;

export type GameTableDefinition = {
  id: string;
  title: string;
  family: string;
  referenceId: string;
  scorecard: TableScorecardDefinition;
  learn: TableLearnDefinition;
  defaultTab: TableTabId;
  availableTabs?: ReadonlyArray<Exclude<TableTabId, "perfect">>;
  tabs: Record<TableTabId, TableTabDefinition>;
};

type CreateGameTableInput = Omit<GameTableDefinition, "tabs" | "learn"> & {
  learn: Omit<TableLearnDefinition, keyof typeof gameRulesCopy>;
  tabIntros: Record<TableTabId, TableTabIntroDefinition>;
  actionsByTab: Partial<Record<TableTabId, TableActionDefinition[]>>;
};

export type CatalogEntry = {
  id: CatalogGameId;
  family: string;
  title: string;
  status: CatalogStatus;
  access: GameAccess;
  preview?: boolean;
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
  decisionFirst?: boolean;
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

const tabLabels: Record<TableTabId, string> = {
  learn: "Learn",
  play: "Play",
  perfect: "Pro"
};

export function createGameTableDefinition(config: CreateGameTableInput): GameTableDefinition {
  const available = config.availableTabs ?? ["learn", "play"];
  if (!available.length || new Set(available).size !== available.length || available.some(tab => tab !== "learn" && tab !== "play")) {
    throw Error("Available table tabs must be unique Learn/Play modes.");
  }
  if (!available.some(tab => tab === config.defaultTab)) {
    throw Error("The default table tab must be available.");
  }
  return {
    ...config,
    learn: { ...config.learn, ...gameRulesCopy },
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
  return tableTabIds.filter(tab => tab !== "perfect" && (!table.availableTabs || table.availableTabs.some(available => available === tab)))
    .map(tab => table.tabs[tab]);
}

function createCatalogEntry(entry: Omit<CatalogEntry, "access">): CatalogEntry {
  return { ...entry, access: gameAccess(entry.id), preview: isGamePreview(entry.id) };
}

export function isGamePreview(id: string): boolean {
  const flags: Record<string, string | undefined> = { canasta: import.meta.env?.VITE_CANASTA_PREVIEW, euchre: import.meta.env?.VITE_EUCHRE_PREVIEW };
  return (import.meta.env?.DEV === true && Object.hasOwn(flags, id)
      && (flags[id] === "1" || typeof location !== "undefined" && new URL(location.href).searchParams.get("preview") === id))
    || (id === "canasta" && import.meta.env?.MODE === "canasta-internal" && import.meta.env?.TAURI_ENV_PLATFORM === "ios");
}

export type CatalogCategory = {
  id: string;
  title: string;
  summary: string;
  entries: CatalogEntry[];
};

export type CatalogAccessContext = { customer?: PremiumSnapshot | null; premiumAvailable?: boolean };

export function getCatalogCategories(context: CatalogAccessContext = {}): CatalogCategory[] {
  const categories: CatalogCategory[] = [
    {
      id: "hearts-contracts",
      title: "Hearts & changing contracts",
      summary: "Avoid penalties, then try a new objective each hand.",
      entries: [
        createCatalogEntry({
          id: "hearts",
          family: "Hearts",
          title: "Hearts",
          card: { rank: "Q", suit: "S" },
          status: "Ready",
          summary: "Keep hearts and the queen of spades out of your tricks."
        }),
        createCatalogEntry({
          id: "barbu",
          family: "Hearts",
          title: "Barbu",
          card: { rank: "K", suit: "H" },
          status: "Ready",
          summary: "Seven contracts, with a new objective each hand."
        })
      ]
    },
    {
      id: "partners-tricks",
      title: "Partners & tricks",
      summary: "Work together, from winning tricks to bidding contracts.",
      entries: [
        createCatalogEntry({
          id: "whist",
          family: "Whist",
          title: "Whist",
          card: { rank: "A", suit: "C" },
          status: "Ready",
          summary: "Win tricks together with a partner."
        }),
        createCatalogEntry({
          id: "spades",
          family: "Whist",
          title: "Spades",
          card: { rank: "A", suit: "S" },
          status: "Ready",
          summary: "Bid your tricks. Spades are always trump."
        }),
        createCatalogEntry({
          id: "bridge",
          family: "Bridge",
          title: "Bridge",
          card: { rank: "K", suit: "D" },
          status: "Ready",
          summary: "Bid a contract, then play as declarer or defend."
        }),
        createCatalogEntry({
          id: "euchre", family: "Euchre", title: "Euchre", card: { rank: "J", suit: "D" },
          status: isGamePreview("euchre") || context.premiumAvailable ? "Ready" : "Planned",
          summary: "Call trump. Win three of five tricks with your partner."
        })
      ]
    },
    {
      id: "rummy",
      title: "Rummy games",
      summary: "Collect sets and runs. Choose what to keep and discard.",
      entries: [
        createCatalogEntry({
          id: "gin-rummy",
          family: "Rummy",
          title: "Gin Rummy",
          card: { rank: "7", suit: "D" },
          status: "Ready",
          summary: "Build sets and runs. Knock before your opponent."
        }),
        createCatalogEntry({
          id: "canasta",
          family: "Rummy",
          title: "Canasta",
          card: { rank: "2", suit: "H" },
          status: isGamePreview("canasta") || context.premiumAvailable ? "Ready" : "Planned",
          summary: "Build canastas with your partner. Take the pile at the right moment."
        })
      ]
    },
    {
      id: "skill-packs",
      title: "Card Skills",
      summary: "Remember what has been played. Plan what comes next.",
      entries: [
        createCatalogEntry({
          id: "card-counting",
          family: "Card skills",
          title: "Card Counting I",
          card: { rank: "J", suit: "C" },
          status: "Ready",
          summary: "Remember trumps, high cards and danger cards."
        }),
        createCatalogEntry({
          id: "card-counting-ii",
          family: "Skill pack",
          title: "Card Counting II",
          card: { rank: "J", suit: "S" },
          status: "Planned",
          summary: "Bridge-oriented counting for suits, high cards, and table inference."
        }),
        createCatalogEntry({
          id: "solitaire",
          family: "Patience",
          title: "Solitaire",
          card: { rank: "A", suit: "D" },
          status: "Planned",
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

export function isCatalogGameAvailable(id: string, context: CatalogAccessContext = {}, now = Date.now()): boolean {
  return getCatalogCategories(context).some(category => category.entries.some(entry => entry.id === id))
    && (hasReleasedGameAccess(id, context.customer, now) || isGamePreview(id));
}
