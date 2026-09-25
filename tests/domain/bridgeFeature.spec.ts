import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createBridgeFeature } from "../../src/features/bridge/bridgeFeature";
import { bridgeActiveHand, bridgeDealerIndex } from "../../src/features/bridge/bridgePresentation";
import { createBridgeSession, transitionBridgeSession } from "../../src/domain/bridgeSession";
import { bridgeAuctionStatus } from "../../src/domain/bridgeAuction";
import { saveBridgeSession, bridgeSaveKey } from "../../src/persistence/bridgeSave";
import { bridgeLegacyCases } from "../fixtures/bridgeLegacy";
import { trickTakingSeats } from "../../src/domain/trickTakingScore";

function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
  let seed = 8;
  const options = { storage: () => storage, nextSeed: () => seed++, now: () => 1000 };
  return { data, options, feature: createBridgeFeature(options) };
}

test("Bridge feature retains auction choices and blocks cards until play starts", async () => {
  const { feature, options } = setup();
  await Promise.all([feature.start(), feature.start()]);
  expect(get(feature).session!.fullHand).toEqual(createBridgeSession(8).fullHand);
  const initial = get(feature).session!;
  feature.select(initial.fullHand.playerHand[0].id);
  feature.play(initial.fullHand.playerHand[0].id);
  expect(get(feature).selectedCardId).toBe("");
  expect(get(feature).session).toBe(initial);
  feature.selectCall("Pass");
  feature.openTable("learn");
  const restored = createBridgeFeature(options);
  restored.resume();
  expect(get(restored).session!.selectedCall).toBe("Pass");
  for (let calls = 0; calls < 40 && get(restored).session!.view === "bridgeAuction"; calls++) {
    await restored.confirmAuction();
  }
  expect(get(restored).session!.view).toBe("fullHand");
  const playing = get(restored).session!;
  restored.selectCall("7NT");
  await restored.confirmAuction();
  expect(get(restored).session).toBe(playing);
});

test("Bridge feature selects only the active hand at every declarer seat", () => {
  for (const fixture of bridgeLegacyCases) {
    const { feature, data } = setup();
    data.set(bridgeSaveKey, JSON.stringify(fixture.saved));
    feature.resume();
    feature.nextTrick();
    const before = get(feature).session!;
    const active = bridgeActiveHand(before.fullHand);
    const foreign = before.fullHand.hands.flat().find(card => !active.cards.some(own => own.id === card.id))!;
    feature.select(foreign.id);
    feature.play(foreign.id);
    expect(get(feature).selectedCardId).toBe("");
    expect(get(feature).session).toBe(before);
    feature.select(fixture.cardId);
    expect(get(feature).selectedCardId).toBe(fixture.cardId);
    feature.select(fixture.cardId);
    expect(get(feature).session!.fullHand).toEqual(fixture.next);
    expect(get(feature).selectedCardId).toBe("");
    let current = get(feature).session!;
    for (let n = 0; n < 3 && !current.fullHandReviewTrickCount; n++) {
      feature.play(bridgeActiveHand(current.fullHand).legalCardIds[0]);
      current = get(feature).session!;
    }
    expect(current.fullHandReviewTrickCount).toBeGreaterThan(0);
    feature.select(bridgeActiveHand(current.fullHand).cards[0].id);
    feature.play(bridgeActiveHand(current.fullHand).legalCardIds[0]);
    expect(get(feature).session).toBe(current);
  }
});

test("Bridge feature advances a passed-out board once and retains its score", async () => {
  const { feature, data } = setup();
  const passed = { ...createBridgeSession(4, 2), scores: { ns: 90, ew: -90 },
    auctionCalls: Array.from({ length: 4 }, (_, i) => ({ seat: trickTakingSeats[(i + 1) % 4], call: "Pass" })) };
  data.set(bridgeSaveKey, JSON.stringify(saveBridgeSession(passed, "now")));
  feature.resume();
  expect(bridgeAuctionStatus(get(feature).session!.auctionCalls, bridgeDealerIndex(passed.fullHand)).passedOut).toBe(true);
  await Promise.all([feature.confirmAuction(), feature.confirmAuction()]);
  const next = get(feature).session!;
  expect(next).toEqual(transitionBridgeSession(passed, { type: "next-hand", seed: 8 }));
  expect(next.results).toHaveLength(1);
  expect(next.scores).toEqual(passed.scores);
});

test("Bridge feature stays resumable when storage is unavailable", async () => {
  const feature = createBridgeFeature({ storage: () => { throw Error("blocked"); }, nextSeed: () => 8 });
  await feature.start();
  feature.selectCall("Pass");
  expect(get(feature).error).toContain("could not be saved");
  const before = get(feature).session!;
  feature.openTable();
  feature.resume();
  expect(get(feature).session).toEqual(before);
  await feature.confirmAuction();
  expect(get(feature).session!.auctionCalls.length).toBeGreaterThan(before.auctionCalls.length);
});
