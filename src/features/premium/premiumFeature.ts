import { writable } from "svelte/store";
import { hasPremiumAccess, readPremiumSnapshot, type PremiumSnapshot } from "../../domain/premiumAccess";

export type PremiumOffer = { id: string; price: string; period: "month" | "year" };
export type BillingOperation = "availability" | "customer" | "offers" | "purchase" | "restore" | "manage" | "terms" | "privacy";
export type BillingAdapter = { request: (operation: BillingOperation, packageId?: string) => Promise<unknown> };
type State = { available: boolean; purchasesEnabled: boolean; busy: boolean; customer: PremiumSnapshot | null;
  active: boolean; offers: PremiumOffer[]; message: string; error: string };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid purchase response");
  return value as Record<string, unknown>;
}

function readOffers(value: unknown): PremiumOffer[] {
  if (!Array.isArray(value)) throw new Error("Subscription prices are unavailable");
  const ids = new Set<string>();
  return value.map(item => {
    const offer = object(item);
    if (typeof offer.id !== "string" || !offer.id || ids.has(offer.id) || typeof offer.price !== "string" || !offer.price
      || (offer.period !== "month" && offer.period !== "year")) throw new Error("Invalid subscription price");
    ids.add(offer.id);
    return { id: offer.id, price: offer.price, period: offer.period };
  });
}

export function createPremiumFeature(adapter: BillingAdapter, now = Date.now) {
  let state: State = { available: false, purchasesEnabled: false, busy: false, customer: null,
    active: false, offers: [], message: "", error: "" };
  const store = writable(state);
  let initialization: Promise<void> | undefined;
  function update(change: Partial<State> = {}) {
    state = { ...state, ...change };
    state.active = hasPremiumAccess(state.customer, now());
    store.set(state);
  }
  function customer(value: unknown) {
    const next = readPremiumSnapshot(value);
    // An older asynchronous response must not undo a newer revocation or renewal.
    if (!state.customer || next.checkedAt >= state.customer.checkedAt) update({ customer: next });
  }
  async function run(operation: BillingOperation, packageId?: string) {
    if (state.busy || (operation !== "availability" && !state.available)) return;
    if (operation === "purchase" && (!state.purchasesEnabled || state.active || !state.offers.some(offer => offer.id === packageId))) return;
    update({ busy: true, error: "", ...(operation === "customer" ? {} : { message: "" }) });
    try {
      const result = object(await adapter.request(operation, packageId));
      if (operation === "availability") {
        if (typeof result.available !== "boolean" || typeof result.purchasesEnabled !== "boolean") throw new Error("Invalid purchase configuration");
        update({ available: result.available, purchasesEnabled: result.available && result.purchasesEnabled });
      } else if (operation === "offers") {
        update({ offers: readOffers(result.offers) });
      } else if (operation === "customer" || operation === "restore") {
        customer(result.customer);
        if (operation === "restore") update({ message: state.active ? "Premium access restored." : "No active Premium subscription was found." });
      } else if (operation === "purchase") {
        if (result.outcome === "purchased") {
          customer(result.customer);
          update({ message: state.active ? "Premium is ready." : "Payment received; Premium access could not yet be confirmed. Restore purchases before buying again." });
        } else if (result.outcome === "pending") update({ message: "Payment is pending. Premium will unlock once payment is confirmed." });
        else if (result.outcome === "cancelled") update({ message: "Purchase cancelled." });
        else throw new Error("Purchase status could not be confirmed. Restore purchases before trying again.");
      }
    } catch {
      if (operation === "offers") update({ offers: [] });
      update({ error: operation === "purchase"
        ? "Purchase could not be confirmed. Restore purchases before trying again if you were charged."
        : "Could not connect to the purchase service. Please reconnect and try again." });
    } finally { update({ busy: false }); }
  }
  return {
    subscribe: store.subscribe,
    initialize() {
      initialization ??= (async () => { await run("availability"); await run("customer"); })();
      return initialization;
    },
    refresh: () => run("customer"),
    async loadOffers() { await initialization; await run("offers"); },
    purchase: (id: string) => run("purchase", id),
    restore: () => run("restore"),
    manage: () => run("manage"),
    openLegal: (page: "terms" | "privacy") => run(page),
    tick() { if (state.active !== hasPremiumAccess(state.customer, now())) update(); }
  };
}
