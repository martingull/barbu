export const tableTabIds = ["learn", "practice", "play", "perfect"] as const;

export type TableTabId = (typeof tableTabIds)[number];
export type ActiveGameTable = "barbu" | "hearts";

export type TableActionDefinition = {
  id: string;
  label: string;
  destination: string;
};

export type TableTabDefinition = {
  id: TableTabId;
  label: string;
  panelId: string;
  actions: TableActionDefinition[];
};

export type GameTableDefinition = {
  id: ActiveGameTable;
  title: string;
  family: string;
  referenceId: string;
  defaultTab: TableTabId;
  tabs: Record<TableTabId, TableTabDefinition>;
};

type CreateGameTableInput = Omit<GameTableDefinition, "tabs"> & {
  actionsByTab: Partial<Record<TableTabId, TableActionDefinition[]>>;
};

const tabLabels: Record<TableTabId, string> = {
  learn: "Learn",
  practice: "Practice",
  play: "Play",
  perfect: "Perfect"
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

export const gameTableDefinitions = {
  hearts: createGameTableDefinition({
    id: "hearts",
    title: "Hearts table",
    family: "Hearts",
    referenceId: "hearts",
    defaultTab: "practice",
    actionsByTab: {
      learn: [{ id: "reference", label: "Reference", destination: "Hearts reference" }],
      practice: [{ id: "avoid-hearts", label: "Avoid hearts", destination: "Hearts avoid-hearts drill" }],
      play: [{ id: "play-hearts", label: "Play Hearts", destination: "Hearts MVP hand" }]
    }
  }),
  barbu: createGameTableDefinition({
    id: "barbu",
    title: "Barbu's table",
    family: "Hearts",
    referenceId: "barbu",
    defaultTab: "learn",
    actionsByTab: {
      learn: [
        { id: "review-results", label: "Review results", destination: "Barbu review" },
        { id: "reset-path", label: "Reset path", destination: "Barbu Learn" },
        { id: "continue-path", label: "Continue with next lesson", destination: "Next Barbu learning step" },
        { id: "reference", label: "Reference", destination: "Barbu reference" },
        { id: "contracts", label: "Barbu contracts", destination: "Barbu contract map" }
      ],
      practice: [
        { id: "quick-drill", label: "Quick drill", destination: "Mixed Barbu quick drill" },
        { id: "fixed-drills", label: "Contract drill", destination: "Fixed contract drill" },
        { id: "domino-hand", label: "Play a full layout hand", destination: "Domino full hand practice" }
      ],
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
