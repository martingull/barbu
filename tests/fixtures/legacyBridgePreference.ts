import type { Page } from "@playwright/test";

// Frozen lesson/deal fixtures exercise the earlier agreement, not the new default.
export async function legacyBridgePreference(page: Page) {
  await page.addInitScript(() => localStorage.setItem("barbu.bridgeBiddingSystem.v1", JSON.stringify("barbu-natural")));
}
