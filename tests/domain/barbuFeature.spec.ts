import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createBarbuFeature } from "../../src/features/barbu/barbuFeature";
import { barbuSessionComplete, dominoSeatScores } from "../../src/domain/barbuSession";
import { barbuSaveKey } from "../../src/persistence/barbuSave";
import { fullHandContracts } from "../../src/contractRegistry";
import { dominoResultText } from "../../src/features/barbu/barbuPresentation";
import { contractIntro } from "../../src/features/barbu/contractIntros";
import { dominoHandEngine } from "../../src/domain/dominoHand";

function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
  let seed = 8;
  const options = { storage: () => storage, nextSeed: () => seed++, now: () => 1000 };
  return { data, options, feature: createBarbuFeature(options) };
}

test("Barbu feature resumes every contract and review, settles once and clears the completed save", async () => {
  const { feature, options, data } = setup();
  data.set("another-game", "unchanged");
  await Promise.all([feature.start(), feature.start()]);
  expect(get(feature).session!.seed).toBe(8);
  for (const [index, contract] of fullHandContracts.entries()) {
    expect(get(feature).session!.pendingContract).toBe(contract);
    expect(contractIntro(contract).title).toBeTruthy();
    const resumedIntro = createBarbuFeature(options);
    resumedIntro.resume();
    expect(get(resumedIntro).session).toEqual(get(feature).session);
    feature.startHand();
    const initial = get(feature).session;
    feature.startHand();
    feature.nextContract();
    expect(get(feature).session).toBe(initial);
    for (let turn = 0; turn < 100; turn++) {
      const session = get(feature).session!;
      const hand = session.fullHand ?? session.dominoHand!;
      if (hand.status === "complete") break;
      if (session.fullHandReviewTrickCount) {
        feature.select(hand.legalCardIds[0]);
        feature.play(hand.legalCardIds[0]);
        expect(get(feature).session).toBe(session);
        feature.nextTrick();
      } else if (hand.legalCardIds.length) {
        const id = hand.legalCardIds[0];
        feature.select("missing");
        expect(get(feature).selectedCardId).toBe("");
        feature.select(id);
        expect(get(feature).session).toBe(session);
        feature.select(id);
        expect(get(feature).session).not.toBe(session);
      } else feature.pass();
      if (!barbuSessionComplete(get(feature).session!)) {
        const restored = createBarbuFeature(options);
        restored.resume();
        expect(get(restored).session).toEqual(get(feature).session);
      }
    }
    expect(get(feature).session!.results).toHaveLength(index + 1);
    if (index < 6) {
      feature.nextContract();
      const intro = get(feature).session;
      feature.nextContract();
      expect(get(feature).session).toBe(intro);
    }
  }
  expect(barbuSessionComplete(get(feature).session!)).toBe(true);
  expect(data.has(barbuSaveKey)).toBe(false);
  expect(data.get("another-game")).toBe("unchanged");
  const terminal = get(feature).session;
  feature.replay();
  feature.pass();
  feature.nextContract();
  expect(get(feature).session).toBe(terminal);
  await feature.start();
  expect(get(feature).session!.seed).toBe(9);
  expect(get(feature).session!.results).toEqual([]);
});

test("Barbu feature retains in-memory progress when saving is unavailable", async () => {
  const { options } = setup();
  const feature = createBarbuFeature({ ...options, storage: () => { throw Error("blocked"); } });
  await feature.start();
  expect(get(feature).error).toContain("could not be saved");
  feature.startHand();
  feature.play(get(feature).session!.fullHand!.legalCardIds[0]);
  const session = get(feature).session;
  feature.openTable();
  feature.resume();
  expect(get(feature).session).toEqual(session);
  expect(get(feature).session!.fullHandReviewTrickCount).toBe(1);
});

test("Domino result copy maps the leader by engine seat, not display position", () => {
  for (const winner of ["Tutor", "Right", "You", "Left"] as const) {
    const hand = dominoHandEngine.start({ seed: 8 });
    hand.scores = ["Tutor", "Right", "You", "Left"].map(seat => seat === winner ? 45 : -5);
    expect(dominoSeatScores(hand)[winner]).toBe(45);
    expect(dominoResultText(hand)).toContain(winner === "You" ? "You scored +45" : `${winner === "Tutor" ? "Barbu" : winner} led Domino with +45`);
  }
});
