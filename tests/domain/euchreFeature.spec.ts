import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createEuchreFeature } from "../../src/features/euchre/euchreFeature";
import { createEuchreSession, euchreComplete, euchrePosition, transitionEuchreSession } from "../../src/domain/euchreSession";
import { advanceEuchreOpponents, chooseEuchreAction } from "../../src/domain/euchrePolicy";
import { createEuchreSaveStore, saveEuchreSession } from "../../src/persistence/euchreSave";

test("Euchre feature uses public opponents and preserves trick review and saved state", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const options = { storage: () => storage, nextSeed: () => 1 };
  const feature = createEuchreFeature(options);
  await feature.start();
  expect(get(feature).session).toEqual(advanceEuchreOpponents(createEuchreSession(1)));
  feature.act({ type: "call", trump: get(feature).session!.hand.upcard.suit });
  const hand = get(feature).session!.hand;
  feature.act(chooseEuchreAction(euchrePosition(hand, 2)));
  const session = get(feature).session!;
  expect(session.hand.phase).toBe("review");
  const resumed = createEuchreFeature(options);
  resumed.resume();
  expect(get(resumed).session).toEqual(session);
  feature.act({ type: "play-card", cardId: "AS" });
  expect(get(feature).session).toBe(session);
  feature.act({ type: "next-trick" });
  expect(get(feature).session!.hand.phase).toBe("playing");
  expect(get(resumed).session).toEqual(session);
});

test("Euchre shared selection commits a double tap once and rejects missing cards", async () => {
  const feature = createEuchreFeature({ storage: () => undefined, nextSeed: () => 1, now: () => 100 });
  await feature.start();
  feature.act({ type: "call", trump: get(feature).session!.hand.upcard.suit });
  const hand = get(feature).session!.hand;
  const action = chooseEuchreAction(euchrePosition(hand, 2));
  if (action.type !== "play-card") throw Error("Expected a card choice");
  feature.select("2C");
  expect(get(feature).selectedCardId).toBe("");
  feature.select(action.cardId);
  expect(get(feature).selectedCardId).toBe(action.cardId);
  feature.select(action.cardId);
  expect(get(feature).session!.hand.completedTricks).toHaveLength(1);
  feature.select(action.cardId);
  expect(get(feature).session!.hand.completedTricks).toHaveLength(1);
});

test("Euchre feature supports an inactive South and stops at each trick review", () => {
  const initial = createEuchreSession(40, 3);
  const session = transitionEuchreSession(initial, { type: "call", trump: initial.hand.upcard.suit, alone: true });
  const saved = saveEuchreSession(session, "2026-11-23T12:00:00.000Z");
  const storage = { getItem: () => JSON.stringify(saved), setItem: () => {}, removeItem: () => {} };
  const feature = createEuchreFeature({ storage: () => storage, nextSeed: () => 42 });
  feature.resume();
  expect(get(feature).session!.hand.inactiveSeat).toBe(2);
  for (let trick = 1; trick <= 4; trick++) {
    expect(get(feature).session!.hand.phase).toBe("review");
    expect(get(feature).session!.hand.completedTricks).toHaveLength(trick);
    feature.act({ type: "next-trick" });
  }
  expect(get(feature).session!.hand.phase).toBe("complete");
});

test("Euchre feature can finish a saved match without depending on storage", async () => {
  let seed = 1;
  const feature = createEuchreFeature({ storage: () => undefined, nextSeed: () => seed++ });
  await feature.start();
  for (let decisions = 0; !euchreComplete(get(feature).session!); decisions++) {
    expect(decisions).toBeLessThan(1000);
    const session = get(feature).session!;
    if (session.hand.phase === "complete" || session.hand.phase === "passed_out") await feature.start(true);
    else if (session.hand.phase === "review") feature.act({ type: "next-trick" });
    else feature.act(chooseEuchreAction(euchrePosition(session.hand, 2)));
  }
  expect(get(feature).error).toBe("");
  expect(get(feature).session!.scores.some(score => score >= 10)).toBe(true);
  expect(createEuchreSaveStore(() => undefined).load()).toBeNull();
});
