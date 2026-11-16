import { expect, test } from "@playwright/test";
import { freeGameIds, gameAccess, hasReleasedGameAccess, monetizationPolicy } from "../../src/games/accessPolicy";
import { getCatalogCategories, isCatalogGameAvailable } from "../../src/games/tableFactory";

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
