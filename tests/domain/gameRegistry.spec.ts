import { expect, test } from "@playwright/test";
import { GameRegistry, registry } from "../../src/games/gameRegistry";
import { createGameTableDefinition, getCatalogCategories, tableTabsFor, type TableTabId } from "../../src/games/tableFactory";
import { cardCountingDef } from "../../src/games/cardCounting";
import "../../src/games";

function tableConfig() {
  const { table } = cardCountingDef;
  return { ...table, tabIntros: { learn: table.tabs.learn.intro, play: table.tabs.play.intro, perfect: table.tabs.perfect.intro }, actionsByTab: {} };
}

test("registry rejects mismatched and duplicate ids without overwriting a registered game", () => {
  const games = new GameRegistry();
  expect(() => games.register("wrong-id", cardCountingDef)).toThrow("registry key must match");
  expect(() => games.register("", cardCountingDef)).toThrow("registry key must match");
  expect(games.getAll()).toEqual([]);
  games.register("card-counting", cardCountingDef);
  expect(() => games.register("card-counting", { ...cardCountingDef, learnSteps: [] })).toThrow("already registered");
  expect(games.get("card-counting")).toBe(cardCountingDef);
  expect(games.get("missing")).toBeUndefined();
  expect(games.getAll()).toEqual([cardCountingDef]);
});

test("factory validates visible modes while preserving the standard Learn/Play template", () => {
  const config = tableConfig();
  for (const availableTabs of [[], ["learn", "learn"], ["learn", "perfect"], ["learn", "unknown"]]) {
    expect(() => createGameTableDefinition({ ...config, availableTabs: availableTabs as Array<"learn" | "play"> })).toThrow("unique Learn/Play");
  }
  for (const defaultTab of ["perfect", "unknown"] as TableTabId[]) {
    expect(() => createGameTableDefinition({ ...config, availableTabs: undefined, defaultTab })).toThrow("default table tab must be available");
  }
  for (const mode of ["learn", "play"] as const) {
    const single = createGameTableDefinition({ ...config, availableTabs: [mode], defaultTab: mode });
    expect(tableTabsFor(single).map(tab => tab.id)).toEqual([mode]);
  }
  const standard = createGameTableDefinition({ ...config, availableTabs: undefined, defaultTab: "play" });
  expect(tableTabsFor(standard).map(tab => tab.id)).toEqual(["learn", "play"]);
});

test("registered definitions keep unique progress keys and unambiguous activity dispatch", () => {
  const progressKeys: string[] = [];
  const panelIds: string[] = [];
  for (const definition of registry.getAll()) {
    const { table, learnSteps, practiceGroups } = definition;
    expect(registry.get(table.id)).toBe(definition);
    progressKeys.push(...learnSteps.map(step => step.id));
    panelIds.push(...Object.values(table.tabs).map(tab => tab.panelId));
    expect(new Set(practiceGroups.map(group => group.id)).size).toBe(practiceGroups.length);
    const entries = practiceGroups.flatMap(group => group.entries ?? []);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
    expect(new Set(entries.map(entry => entry.action)).size).toBe(entries.length);
    for (const group of practiceGroups) for (const entry of group.entries ?? []) expect(entry.group).toBe(group.id);
  }
  expect(new Set(progressKeys).size).toBe(progressKeys.length);
  expect(new Set(panelIds).size).toBe(panelIds.length);
});

test("every catalog game has a registered definition, including the Premium candidate", () => {
  const entries = getCatalogCategories({ premiumAvailable: true }).flatMap(category => category.entries);
  expect(new Set(entries.map(entry => entry.id))).toEqual(new Set(registry.getAll().map(definition => definition.table.id)));
  for (const entry of entries) expect(registry.get(entry.id)?.table.id).toBe(entry.id);
});
