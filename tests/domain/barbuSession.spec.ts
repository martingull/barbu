import { test, expect } from "@playwright/test";
import { createBarbuSession, transitionBarbuSession as step, barbuSessionComplete, barbuSeatTotals,
  barbuSeedForContract, type BarbuSession } from "../../src/domain/barbuSession";
import { createBarbuSaveStore, normalizeBarbuSave, restoreBarbuSession, saveBarbuSession } from "../../src/persistence/barbuSave";
import { fullHandContracts } from "../../src/domain/contractRegistry";
import { nativeBarbuHands, nativeBarbuHand, compactBarbuHand } from "../fixtures/barbuHandFixture";
import { dominoFixtures, inflateDominoHand } from "../fixtures/dominoHandFixture";

function advance(session: BarbuSession): BarbuSession {
  if (session.fullHandReviewTrickCount) return step(session, { type: "next-trick" });
  const hand = session.fullHand ?? session.dominoHand!;
  return step(session, hand.legalCardIds.length ? { type: "play-card", cardId: hand.legalCardIds[0] } : { type: "pass" });
}
function finish(session: BarbuSession) {
  for (let i = 0; i < 100 && (session.fullHand ?? session.dominoHand)?.status !== "complete"; i++) session = advance(session);
  expect((session.fullHand ?? session.dominoHand)?.status).toBe("complete");
  return session;
}
function roundTrip(session: BarbuSession) {
  const saved = saveBarbuSession(session, "now")!;
  const normalized = normalizeBarbuSave(JSON.parse(JSON.stringify(saved)));
  expect(normalized).not.toBeNull();
  expect(restoreBarbuSession(normalized!)).toEqual(session);
}

test("Barbu runs all seven contracts, settles once and terminates without mutating previous states", () => {
  for (let seed = 1; seed <= 8; seed++) {
    let session = createBarbuSession(seed);
    for (const [index, contract] of fullHandContracts.entries()) {
      expect(session.pendingContract).toBe(contract);
      expect(session.view).toBe("runContractIntro");
      roundTrip(session);
      session = step(session, { type: "start-hand" });
      expect(step(session, { type: "start-hand" })).toBe(session);
      expect(step(session, { type: "next-contract" })).toBe(session);
      expect(step(session, { type: "play-card", cardId: "missing" })).toBe(session);
      for (let turn = 0; turn < 100 && (session.fullHand ?? session.dominoHand)?.status !== "complete"; turn++) {
        const before = JSON.stringify(session);
        const next = advance(session);
        expect(JSON.stringify(session)).toBe(before);
        session = next;
        if (!barbuSessionComplete(session)) roundTrip(session);
      }
      expect(session.results).toHaveLength(index + 1);
      expect(new Set(session.results.map(r => r.contract)).size).toBe(index + 1);
      const totals = barbuSeatTotals(session.results);
      const noOp = advance(session);
      expect(barbuSeatTotals(noOp.results)).toEqual(totals);
      if (index < 6) {
        const next = step(session, { type: "next-contract" });
        expect(step(next, { type: "next-contract" })).toBe(next);
        session = next;
      }
    }
    expect(barbuSessionComplete(session)).toBe(true);
    expect(Object.values(barbuSeatTotals(session.results)).reduce((a, b) => a + b)).toBe(0);
    expect(saveBarbuSession(session, "done")).toBeNull();
    for (const type of ["start-hand", "next-contract", "replay", "pass"] as const) expect(step(session, { type })).toBe(session);
  }
});

test("Barbu review gates play and replay removes only the current result with the same deal", () => {
  let session = step(createBarbuSession(8), { type: "start-hand" });
  const initial = session.fullHand;
  session = advance(session);
  expect(session.fullHandReviewTrickCount).toBe(1);
  expect(step(session, { type: "play-card", cardId: session.fullHand!.legalCardIds[0] })).toBe(session);
  roundTrip(session);
  session = finish(session);
  const replay = step(session, { type: "replay" });
  expect(replay.results).toEqual([]);
  expect(replay.fullHand).toEqual(initial);
  expect(replay.fullHandReviewTrickCount).toBe(0);
  session = step(session, { type: "next-contract" });
  session = finish(step(session, { type: "start-hand" }));
  expect(step(session, { type: "replay" }).results.map(r => r.contract)).toEqual(["No Hearts"]);
});

test("Barbu legacy native and browser hand saves retain their deal, review and completion", () => {
  for (const fixture of nativeBarbuHands) {
    const saved = { ...createBarbuSession(fixture.seed || 1), version: 1, usingBrowserFullHand: false,
      pendingContract: fixture.contract, view: "fullHand", fullHand: nativeBarbuHand(fixture) };
    const restored = normalizeBarbuSave(saved)!;
    expect(compactBarbuHand(restored.fullHand!)).toEqual(fixture.initial);
    roundTrip(restoreBarbuSession(restored));
  }
  for (const fixture of [...dominoFixtures.native, ...dominoFixtures.browser]) {
    const saved = { ...createBarbuSession(fixture.seed || 1), version: 1, pendingContract: "Domino",
      view: "dominoHand", usingBrowserDomino: false, dominoHand: inflateDominoHand(fixture, "mid") };
    let session = restoreBarbuSession(normalizeBarbuSave(saved)!);
    const initialHands = session.dominoHand!.initialHands;
    session = finish(session);
    expect(session.results).toHaveLength(1);
    expect(step(session, { type: "replay" }).dominoHand!.initialHands).toEqual(initialHands);
    const missingResult = normalizeBarbuSave({ ...session, version: 1, results: [] })!;
    expect(missingResult.results).toEqual(session.results);
  }
});

test("Barbu save boundary rejects malformed results and mismatched hands", () => {
  const session = finish(step(createBarbuSession(8), { type: "start-hand" }));
  const saved = saveBarbuSession(session, "now")!;
  const result = session.results[0];
  for (const bad of [null, {}, { ...saved, version: 2 }, { ...saved, pendingContract: "Hearts" },
    { ...saved, pendingContract: "Domino" }, { ...saved, fullHand: null },
    { ...saved, results: [result, result] }, { ...saved, results: [{ ...result, seatPenalties: null }] },
    { ...saved, results: [{ ...result, playerPenalty: 999 }] },
    { ...saved, results: [{ ...result, seatPenalties: { You: 0 } }] },
    { ...saved, view: "runContractIntro" }]) expect(normalizeBarbuSave(bad)).toBeNull();
  expect(normalizeBarbuSave({ ...saved, seed: -1 })!.seed).toBe(1);
  expect(barbuSeedForContract(8, "No Hearts")).toBe(((Math.imul(8, 1_103_515_245) + 12_345) >>> 0) || 1);
  expect(() => createBarbuSession(0)).toThrow();
});

test("Barbu save store tolerates blocked reads but surfaces failed writes and removal", () => {
  const store = createBarbuSaveStore(() => ({ getItem() { throw Error("blocked"); },
    setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } }));
  expect(store.load()).toBeNull();
  expect(() => store.write(saveBarbuSession(createBarbuSession(8), "now"))).toThrow("blocked");
  expect(() => store.write(null)).toThrow("blocked");
});
