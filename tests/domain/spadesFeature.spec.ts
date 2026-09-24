import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createSpadesFeature } from "../../src/features/spades/spadesFeature";
import { createHeartsFeature } from "../../src/features/hearts/heartsFeature";
import { createSpadesSession, transitionSpadesSession, spadesSessionSettlement } from "../../src/domain/spadesSession";
import { saveSpadesSession, spadesSaveKey } from "../../src/persistence/spadesSave";

function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
  let seed = 8;
  const options = { storage: () => storage, nextSeed: () => seed++, now: () => 1000 };
  return { data, options, feature: createSpadesFeature(options) };
}

test("Spades bids only change You, stay live across toggles and lock before play", async () => {
  const { feature, options, data } = setup();
  await feature.start();
  const initial = get(feature).session!;
  expect(initial.fullHand.hands.map(hand => hand.length)).toEqual([13, 13, 13, 13]);
  feature.select(initial.fullHand.playerHand[0].id);
  expect(get(feature).selectedCardId).toBe("");
  feature.toggleBids();
  feature.setBid(0);
  expect(get(feature).session!.bids).toEqual({ ...initial.bids, You: 0 });
  feature.setBid(99);
  expect(get(feature).session!.bids.You).toBe(13);
  const saved = data.get(spadesSaveKey);
  const hearts = createHeartsFeature(options);
  await hearts.start();
  hearts.selectPass(get(hearts).session!.fullHand.playerHand[0].id);
  expect(data.get(spadesSaveKey)).toBe(saved);
  const restored = createSpadesFeature(options);
  restored.resume();
  expect(get(restored).session!.openingPanel).toBe("bid");
  restored.toggleBids();
  restored.startPlay();
  restored.setBid(0);
  restored.toggleBids();
  expect(get(restored).session!.bids.You).toBe(13);
  expect(get(restored).session!.openingPanel).toBe("table");
  expect(get(restored).session!.fullHand.spadesBids).toEqual(get(restored).session!.bids);
});

test("Spades double taps deal and play once, then review blocks further cards", async () => {
  const { feature } = setup();
  await Promise.all([feature.start(), feature.start()]);
  expect(get(feature).session!.fullHand).toEqual(createSpadesSession(8).fullHand);
  feature.startPlay();
  const id = get(feature).session!.fullHand.legalCardIds[0];
  feature.select(id);
  feature.select(id);
  const reviewed = get(feature).session!;
  expect(reviewed.fullHandReviewTrickCount).toBe(1);
  feature.play(reviewed.fullHand.legalCardIds[0]);
  expect(get(feature).session).toEqual(reviewed);
  feature.nextTrick();
  expect(get(feature).session!.fullHandReviewTrickCount).toBe(0);
});

test("Spades settles once on a double next-hand and remains resumable without storage", async () => {
  const { feature, data } = setup();
  let session = transitionSpadesSession(createSpadesSession(8), { type: "start-play" });
  while (session.fullHand.status !== "complete") {
    session = transitionSpadesSession(session, { type: "next-trick" });
    session = transitionSpadesSession(session, { type: "play-card", cardId: session.fullHand.legalCardIds[0] });
  }
  data.set(spadesSaveKey, JSON.stringify(saveSpadesSession(session, "now")));
  feature.resume();
  await Promise.all([feature.start(true), feature.start(true)]);
  expect(get(feature).session!.results).toHaveLength(1);
  expect(get(feature).session!.scores).toEqual(spadesSessionSettlement(session).scores);
  const blocked = createSpadesFeature({ storage: () => { throw Error("unavailable"); }, nextSeed: () => 8 });
  await blocked.start();
  blocked.setBid(0);
  blocked.toggleBids();
  expect(get(blocked).error).toContain("could not be saved");
  const current = get(blocked).session;
  blocked.openTable();
  blocked.resume();
  expect(get(blocked).session).toEqual(current);
});
