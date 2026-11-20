import { expect, test } from "@playwright/test";
import { freeGameIds, gameAccess, hasReleasedGameAccess, monetizationPolicy } from "../../src/games/accessPolicy";
import { createGameTableDefinition, getCatalogCategories, isCatalogGameAvailable, tableTabsFor } from "../../src/games/tableFactory";
import { registry } from "../../src/games/gameRegistry";
import "../../src/games";

test("table metadata gives skill activities one mode without changing game navigation", () => {
  for (const { table } of registry.getAll()) {
    expect(tableTabsFor(table).map(tab => tab.id)).toEqual(table.id === "card-counting" ? ["learn"] : ["learn", "play"]);
    expect(tableTabsFor(table).some(tab => tab.id === table.defaultTab)).toBe(true);
  }
  const { table, practiceGroups, learnSteps } = registry.get("card-counting")!;
  expect(table.defaultTab).toBe("learn");
  expect(learnSteps).toEqual([]);
  expect(practiceGroups.map(group => [group.title, group.entries?.length])).toEqual([["Warm up", 1], ["Practise in a hand", 4]]);
  const actions = practiceGroups.flatMap(group => group.entries!.map(entry => entry.action));
  expect(new Set(actions).size).toBe(5);
  const config = { ...table, availableTabs: ["learn"] as const, defaultTab: "play" as const,
    tabIntros: { learn: table.tabs.learn.intro, play: table.tabs.play.intro, perfect: table.tabs.perfect.intro }, actionsByTab: {} };
  expect(() => createGameTableDefinition(config)).toThrow("default table tab must be available");
});

test("every game derives the same rules label and description from the table factory", () => {
  expect(registry.getAll()).toHaveLength(8);
  for (const { table } of registry.getAll()) {
    expect(table.learn.referenceTitle).toBe("Game rules");
    expect(table.learn.referenceSummary).toBe("Read the rules, scoring and variations.");
    for (const tab of Object.values(table.tabs)) {
      for (const action of tab.actions.filter(action => action.id === "reference")) {
        expect(action.label).toBe(table.learn.referenceTitle);
        expect(action.destination).toMatch(/ rules$/);
      }
    }
  }
});

test("the existing seven games remain free without billing or usage limits", () => {
  expect(freeGameIds).toEqual(["hearts", "barbu", "whist", "spades", "bridge", "gin-rummy", "card-counting"]);
  for (const id of freeGameIds) {
    expect(gameAccess(id)).toBe("Free");
    expect(hasReleasedGameAccess(id)).toBe(true);
    expect(isCatalogGameAvailable(id)).toBe(true);
  }
  expect(monetizationPolicy.model).toBe("free-catalog-and-premium-subscription");
  expect(monetizationPolicy.purchaseProvider).toBe("revenuecat");
});

test("premium intent does not grant access and unassigned games fail closed", () => {
  expect(gameAccess("canasta")).toBe("Premium");
  for (const id of ["canasta", "solitaire", "card-counting-ii", "unknown", "", "toString"]) {
    expect(hasReleasedGameAccess(id)).toBe(false);
    expect(isCatalogGameAvailable(id)).toBe(false);
  }
  expect(gameAccess("unknown")).toBe("Unassigned");
});

test("released catalog access comes from the shared policy", () => {
  const entries = getCatalogCategories().flatMap(category => category.entries);
  expect(entries).toHaveLength(7);
  for (const entry of entries) expect(entry.access).toBe(gameAccess(entry.id));
});
