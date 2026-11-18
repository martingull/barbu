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
const supportId = "$RCAnonymousID:0123456789abcdef0123456789abcdef";

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
    { ...active, expiresAt: Infinity }, { ...active, checkedAt: "2026" },
    { ...active, expiresAt: Number.MAX_SAFE_INTEGER }, { ...active, checkedAt: Number.MAX_SAFE_INTEGER }]) {
    expect(() => readPremiumSnapshot(value)).toThrow();
  }
  expect(readPremiumSnapshot(inactive)).toEqual(inactive);
});

function harness(overrides: Partial<Record<BillingOperation, unknown>> = {}) {
  const calls: BillingOperation[] = [];
  const responses: Partial<Record<BillingOperation, unknown>> = {
    availability: { available: true, purchasesEnabled: true }, customer: { customer: inactive },
    supportInfo: { supportId }, copySupportId: { supportId }, support: { supportId },
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
    if (operation === "supportInfo") return { supportId };
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

test("failed startup verification cannot be bypassed by loading offers or restarting", async () => {
  const h = harness({ customer: new Error("network unavailable") });
  await h.feature.initialize();
  await h.feature.loadOffers();
  expect(get(h.feature).verificationNeeded).toBe(true);
  expect(get(h.feature).offers).toEqual(offers);
  await h.feature.purchase("monthly");
  expect(h.calls).not.toContain("purchase");
  h.responses.customer = { customer: active };
  await h.feature.refresh();
  expect(get(h.feature).active).toBe(true);
  expect(get(h.feature).verificationNeeded).toBe(false);

  const restarted = harness({ customer: new Error("still offline") });
  await restarted.feature.initialize();
  expect(get(restarted.feature).active).toBe(false);
  expect(get(restarted.feature).verificationNeeded).toBe(true);
});

test("a failed refresh keeps bounded access but never treats unknown access as an invitation to buy", async () => {
  const h = harness({ customer: { customer: active } });
  await h.feature.initialize();
  await h.feature.loadOffers();
  h.responses.customer = new Error("offline");
  await h.feature.refresh();
  expect(get(h.feature).active).toBe(true);
  expect(get(h.feature).verificationNeeded).toBe(true);
  h.advance(now + premiumOfflineWindowMs);
  h.feature.tick();
  expect(get(h.feature).active).toBe(false);
  await h.feature.purchase("monthly");
  expect(h.calls).not.toContain("purchase");
  h.responses.customer = { customer: { ...inactive, checkedAt: now + premiumOfflineWindowMs } };
  await h.feature.refresh();
  expect(get(h.feature).verificationNeeded).toBe(false);
  await h.feature.purchase("monthly");
  expect(h.calls).toContain("purchase");
});

test("stale inactive checks and unconfirmed payments require verification before another checkout", async () => {
  const h = harness();
  await h.feature.initialize();
  await h.feature.loadOffers();
  h.advance(now + premiumOfflineWindowMs);
  h.feature.tick();
  expect(get(h.feature).verificationNeeded).toBe(true);
  await h.feature.purchase("monthly");
  expect(h.calls).not.toContain("purchase");

  for (const response of [{ outcome: "pending" }, { outcome: "purchased", customer: inactive }]) {
    const payment = harness({ purchase: response });
    await payment.feature.initialize();
    await payment.feature.loadOffers();
    await payment.feature.purchase("monthly");
    expect(get(payment.feature).verificationNeeded).toBe(true);
    await payment.feature.purchase("monthly");
    expect(payment.calls.filter(call => call === "purchase")).toHaveLength(1);
  }
});

test("check access retries an unavailable service and operation errors explain the correct recovery", async () => {
  const h = harness({ availability: new Error("configuration not ready") });
  await h.feature.initialize();
  h.responses.availability = { available: true, purchasesEnabled: true };
  await h.feature.refresh();
  expect(get(h.feature).available).toBe(true);
  expect(get(h.feature).verificationNeeded).toBe(false);
  h.responses.manage = new Error("native error");
  await h.feature.manage();
  expect(get(h.feature).error).toContain("Play Store > Payments and subscriptions > Subscriptions");
  h.responses.restore = new Error("native error");
  await h.feature.restore();
  expect(get(h.feature).verificationNeeded).toBe(true);
  expect(get(h.feature).error).not.toContain("No active");
});

test("support identity is available without verified access and never grants Premium", async () => {
  const h = harness({ customer: new Error("offline") });
  await h.feature.initialize();
  const verificationError = get(h.feature).error;
  expect(get(h.feature).supportId).toBe(supportId);
  await h.feature.copySupportId();
  expect(get(h.feature).supportMessage).toBe("Billing reference copied.");
  expect(get(h.feature).error).toBe(verificationError);
  expect(get(h.feature).verificationNeeded).toBe(true);
  await h.feature.contactSupport();
  expect(get(h.feature).supportMessage).toContain("Email app opened");
  expect(get(h.feature).active).toBe(false);
  expect(h.calls).not.toContain("purchase");
});

test("invalid support responses are rejected without changing access or exposing their contents", async () => {
  const h = harness({ customer: { customer: active } });
  await h.feature.initialize();
  for (const id of [null, "", "private@example.org", "goog_secret", `${supportId}\nInjected`, "$RCAnonymousID:bad"]) {
    h.responses.supportInfo = { supportId: id, customer: inactive };
    await h.feature.loadSupportInfo();
    expect(get(h.feature).active).toBe(true);
    expect(get(h.feature).supportId).toBe(supportId);
    expect(get(h.feature).supportError).toBe("Billing reference is unavailable. Please try again.");
  }
  h.responses.copySupportId = new Error("provider secret");
  await h.feature.copySupportId();
  expect(get(h.feature).supportError).toContain("Select and copy");
  expect(get(h.feature).supportError).not.toContain("secret");
  h.responses.support = new Error("no email handler");
  await h.feature.contactSupport();
  expect(get(h.feature).supportError).toContain("Email martin@insilicoveritas.org");
  expect(get(h.feature).active).toBe(true);
});

test("support recovery retains pending-payment feedback and refreshes only the native reference", async () => {
  const h = harness({ supportInfo: new Error("reference unavailable"), purchase: { outcome: "pending" } });
  await h.feature.initialize();
  expect(get(h.feature).supportId).toBeNull();
  await h.feature.loadOffers();
  await h.feature.purchase("monthly");
  const pendingMessage = get(h.feature).message;
  const changedId = "$RCAnonymousID:abcdef0123456789abcdef0123456789";
  h.responses.copySupportId = { supportId: changedId, customer: active };
  await h.feature.copySupportId();
  expect(get(h.feature).supportId).toBe(changedId);
  expect(get(h.feature).message).toBe(pendingMessage);
  expect(get(h.feature).active).toBe(false);
  expect(get(h.feature).verificationNeeded).toBe(true);
});
