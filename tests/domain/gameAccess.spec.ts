import { expect, test } from "@playwright/test";
import { freeGameIds, gameAccess, hasReleasedGameAccess, monetizationPolicy } from "../../src/games/accessPolicy";
import { getCatalogCategories, isCatalogGameAvailable } from "../../src/games/tableFactory";
import { registry } from "../../src/games/gameRegistry";
import "../../src/games";

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
