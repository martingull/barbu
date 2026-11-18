export type PremiumSnapshot = {
  verification: "verified";
  entitlement: "premium";
  active: boolean;
  checkedAt: number;
  expiresAt: number | null;
  willRenew: boolean;
};

export const premiumOfflineWindowMs = 24 * 60 * 60 * 1000;

function validTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    && Number.isFinite(new Date(value).getTime());
}

// Accept only the native verification adapter's narrow response, never a saved-game flag.
export function readPremiumSnapshot(value: unknown): PremiumSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid purchase verification response");
  const data = value as Record<string, unknown>;
  if (data.verification !== "verified" || data.entitlement !== "premium"
    || typeof data.active !== "boolean" || typeof data.willRenew !== "boolean"
    || !validTimestamp(data.checkedAt)
    || (data.expiresAt !== null && !validTimestamp(data.expiresAt))
    || (data.active && data.expiresAt === null)) throw new Error("Could not verify Premium access");
  return { verification: "verified", entitlement: "premium", active: data.active,
    checkedAt: data.checkedAt, expiresAt: data.expiresAt as number | null, willRenew: data.willRenew };
}

export function hasPremiumAccess(snapshot: PremiumSnapshot | null | undefined, now: number): boolean {
  return hasRecentPremiumVerification(snapshot, now) && !!snapshot?.active
    && snapshot.expiresAt !== null && now < snapshot.expiresAt;
}

export function hasRecentPremiumVerification(snapshot: PremiumSnapshot | null | undefined, now: number): boolean {
  return !!snapshot && snapshot.verification === "verified" && snapshot.entitlement === "premium"
    && Number.isFinite(now) && now >= snapshot.checkedAt - 5 * 60 * 1000
    && now < snapshot.checkedAt + premiumOfflineWindowMs;
}
