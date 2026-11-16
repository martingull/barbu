export type PremiumSnapshot = {
  verification: "verified";
  entitlement: "premium";
  active: boolean;
  checkedAt: number;
  expiresAt: number | null;
  willRenew: boolean;
};

export const premiumOfflineWindowMs = 24 * 60 * 60 * 1000;

// Accept only the native verification adapter's narrow response, never a saved-game flag.
export function readPremiumSnapshot(value: unknown): PremiumSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid purchase verification response");
  const data = value as Record<string, unknown>;
  if (data.verification !== "verified" || data.entitlement !== "premium"
    || typeof data.active !== "boolean" || typeof data.willRenew !== "boolean"
    || typeof data.checkedAt !== "number" || !Number.isSafeInteger(data.checkedAt) || data.checkedAt <= 0
    || (data.expiresAt !== null && (typeof data.expiresAt !== "number" || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= 0))
    || (data.active && data.expiresAt === null)) throw new Error("Could not verify Premium access");
  return { verification: "verified", entitlement: "premium", active: data.active,
    checkedAt: data.checkedAt, expiresAt: data.expiresAt as number | null, willRenew: data.willRenew };
}

export function hasPremiumAccess(snapshot: PremiumSnapshot | null | undefined, now: number): boolean {
  return !!snapshot && snapshot.verification === "verified" && snapshot.entitlement === "premium"
    && snapshot.active && Number.isFinite(now) && now >= snapshot.checkedAt - 5 * 60 * 1000
    && now < snapshot.checkedAt + premiumOfflineWindowMs
    && snapshot.expiresAt !== null && now < snapshot.expiresAt;
}
