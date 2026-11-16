import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { hasPremiumAccess, premiumOfflineWindowMs, readPremiumSnapshot, type PremiumSnapshot } from "../../src/domain/premiumAccess";
import { createPremiumFeature, type BillingAdapter, type BillingOperation } from "../../src/features/premium/premiumFeature";
import { hasReleasedGameAccess } from "../../src/games/accessPolicy";
import { isCatalogGameAvailable } from "../../src/games/tableFactory";

const now = 1_800_000_000_000;
const active: PremiumSnapshot = { verification: "verified", entitlement: "premium", active: true,
  checkedAt: now, expiresAt: now + 30 * premiumOfflineWindowMs, willRenew: true };
const inactive: PremiumSnapshot = { ...active, active: false, expiresAt: null, willRenew: false };
const offers = [{ id: "monthly", price: "EUR 2.49", period: "month" }];

test("verified access expires and cancellation retains the paid-through period", () => {
  expect(hasPremiumAccess(active, now)).toBe(true);
  expect(hasPremiumAccess({ ...active, willRenew: false }, now)).toBe(true);
  expect(hasPremiumAccess({ ...active, active: false }, now)).toBe(false);
  expect(hasPremiumAccess({ ...active, expiresAt: now }, now)).toBe(false);
  expect(hasPremiumAccess(active, now + premiumOfflineWindowMs)).toBe(false);
  expect(hasPremiumAccess(active, now - 10 * 60_000)).toBe(false);
  expect(hasPremiumAccess(active, NaN)).toBe(false);
  expect(hasReleasedGameAccess("hearts", inactive, now)).toBe(true);
  expect(hasReleasedGameAccess("canasta", active, now)).toBe(true);
  expect(isCatalogGameAvailable("canasta", { customer: active }, now)).toBe(false);
  expect(isCatalogGameAvailable("canasta", { customer: active, premiumAvailable: true }, now)).toBe(true);
  expect(isCatalogGameAvailable("canasta", { customer: inactive, premiumAvailable: true }, now)).toBe(false);
  expect(hasReleasedGameAccess("unknown", active, now)).toBe(false);
});

test("malformed, unsigned and unrelated entitlement payloads cannot grant access", () => {
  for (const value of [null, true, {}, { ...active, verification: "failed" }, { ...active, verification: "VERIFIED_ON_DEVICE" },
    { ...active, entitlement: "other" }, { ...active, active: "true" }, { ...active, expiresAt: null },
    { ...active, expiresAt: Infinity }, { ...active, checkedAt: "2026" }]) {
    expect(() => readPremiumSnapshot(value)).toThrow();
  }
  expect(readPremiumSnapshot(inactive)).toEqual(inactive);
});

function harness(overrides: Partial<Record<BillingOperation, unknown>> = {}) {
  const calls: BillingOperation[] = [];
  const responses: Partial<Record<BillingOperation, unknown>> = {
    availability: { available: true, purchasesEnabled: true }, customer: { customer: inactive },
    offers: { offers }, restore: { customer: active }, purchase: { outcome: "purchased", customer: active }, ...overrides
  };
  const adapter: BillingAdapter = { async request(operation) {
    calls.push(operation);
    const response = responses[operation];
    if (response instanceof Error) throw response;
    return response ?? {};
  } };
  let clock = now;
  return { feature: createPremiumFeature(adapter, () => clock), responses, calls, advance: (value: number) => { clock = value; } };
}

test("purchase and restoration use verified snapshots; raw failures never leak into UI", async () => {
  const h = harness();
  await h.feature.initialize();
  await h.feature.purchase("monthly");
  expect(h.calls).not.toContain("purchase");
  await h.feature.loadOffers();
  await h.feature.purchase("unknown");
  expect(h.calls).not.toContain("purchase");
  await h.feature.purchase("monthly");
  expect(get(h.feature).active).toBe(true);
  expect(get(h.feature).message).toBe("Premium is ready.");
  await h.feature.purchase("monthly");
  expect(h.calls.filter(call => call === "purchase")).toHaveLength(1);
  h.responses.customer = new Error("secret token or provider diagnostics");
  await h.feature.refresh();
  expect(get(h.feature).active).toBe(true);
  expect(get(h.feature).error).not.toContain("secret");
  h.advance(now + premiumOfflineWindowMs);
  h.feature.tick();
  expect(get(h.feature).active).toBe(false);
  h.responses.restore = { customer: { ...active, checkedAt: now + premiumOfflineWindowMs } };
  await h.feature.restore();
  expect(get(h.feature).active).toBe(true);
  h.responses.customer = { customer: { ...inactive, checkedAt: now + premiumOfflineWindowMs + 1 } };
  await h.feature.refresh();
  expect(get(h.feature).active).toBe(false);
  h.responses.customer = { customer: active };
  await h.feature.refresh();
  expect(get(h.feature).active).toBe(false);
});

test("pending, cancelled and unverifiable purchases never unlock Premium", async () => {
  for (const response of [{ outcome: "pending" }, { outcome: "cancelled" }, { outcome: "purchased", customer: { ...active, verification: "failed" } }]) {
    const h = harness({ purchase: response });
    await h.feature.initialize();
    await h.feature.loadOffers();
    await h.feature.purchase("monthly");
    expect(get(h.feature).active).toBe(false);
    expect(get(h.feature).busy).toBe(false);
    expect(get(h.feature).message || get(h.feature).error).not.toBe("");
  }
});

test("disabled configuration makes no purchase requests and malformed offers are discarded", async () => {
  const unavailable = harness({ availability: { available: false, purchasesEnabled: false } });
  await unavailable.feature.initialize();
  await unavailable.feature.restore();
  expect(unavailable.calls).toEqual(["availability"]);
  const h = harness({ availability: { available: true, purchasesEnabled: false } });
  await h.feature.initialize();
  await h.feature.loadOffers();
  await h.feature.purchase("monthly");
  expect(h.calls).not.toContain("purchase");
  await h.feature.restore();
  expect(get(h.feature).active).toBe(true);
  h.responses.offers = { offers: [...offers, ...offers] };
  await h.feature.loadOffers();
  expect(get(h.feature).offers).toEqual([]);
});

test("duplicate taps are ignored while the native purchase sheet is open", async () => {
  let finish!: (value: unknown) => void;
  let count = 0;
  const feature = createPremiumFeature({ async request(operation) {
    if (operation === "availability") return { available: true, purchasesEnabled: true };
    if (operation === "customer") return { customer: inactive };
    if (operation === "offers") return { offers };
    count++;
    return new Promise(resolve => { finish = resolve; });
  } }, () => now);
  await feature.initialize();
  await feature.loadOffers();
  const purchase = feature.purchase("monthly");
  await feature.purchase("monthly");
  await feature.refresh();
  expect(count).toBe(1);
  finish({ outcome: "purchased", customer: active });
  await purchase;
  expect(get(feature).active).toBe(true);
});
