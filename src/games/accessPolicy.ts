export const freeGameIds = [
  "hearts", "barbu", "whist", "spades", "bridge", "gin-rummy", "card-counting"
] as const;

export type GameAccess = "Free" | "Premium" | "Unassigned";

export const monetizationPolicy = {
  model: "free-catalog-and-premium-subscription",
  freeGameIds,
  premiumGameIds: ["canasta", "euchre", "cribbage"],
  purchaseProvider: "revenuecat"
} as const;

export function gameAccess(id: string): GameAccess {
  if (freeGameIds.some(game => game === id)) return "Free";
  if (monetizationPolicy.premiumGameIds.some(game => game === id)) return "Premium";
  return "Unassigned";
}

// Catalog visibility and the development-only preview remain separate from purchase access.
export function hasReleasedGameAccess(id: string, customer?: PremiumSnapshot | null, now = Date.now()): boolean {
  const access = gameAccess(id);
  return access === "Free" || (access === "Premium" && hasPremiumAccess(customer, now));
}
import { hasPremiumAccess, type PremiumSnapshot } from "../domain/premiumAccess";
