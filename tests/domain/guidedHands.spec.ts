import { test, expect } from "@playwright/test";
import { get } from "svelte/store";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";
import { createGinGuidedSession, transitionGinGuidedSession, replayGinGuidedSession, ginGuidedRecap } from "../../src/domain/ginRummyLearning";
import { advanceGinOpponent, chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import { transitionGinSession } from "../../src/domain/ginRummySession";
import { ginGuidance, ginGuidedReview } from "../../src/features/gin-rummy/ginGuidance";
import { ginCards } from "../../src/lessons/gin-rummy/exercises";

test("guided Gin plays the normal engine and opponents, pauses for feedback, and stops after one hand", () => {
  for (const seed of [1, 2, 3, 12, 32]) {
    let state = createGinGuidedSession(seed);
    const initial = structuredClone(state);
    let decisions = 0;
    while (state.session.hand.phase !== "complete" && decisions++ < 100) {
      const action = chooseGinAction(ginObservation(state.session));
      if (action.type === "next") throw Error("Unexpected next hand");
      const expected = advanceGinOpponent(transitionGinSession(state.session, action));
      state = transitionGinGuidedSession(state, action);
      expect(state.session).toEqual(expected);
      expect(transitionGinGuidedSession(state, action)).toBe(state);
      const acknowledged = transitionGinGuidedSession(state, { type: "continue" });
      expect(acknowledged.session).toBe(state.session);
      state = acknowledged;
    }
    expect(state.session.hand.phase).toBe("complete");
    expect(state.session.handNumber).toBe(1);
    expect(state.moments).toHaveLength(decisions);
    expect(ginGuidedRecap(state.moments).length).toBeLessThanOrEqual(3);
    expect(ginGuidedRecap(state.moments).at(-1)?.decision).toBe(decisions);
    expect(replayGinGuidedSession(state)).toEqual(initial);
    expect(transitionGinGuidedSession(state, { type: "draw", source: "stock" })).toBe(state);
  }
});

test("guided controller isolates instances, reports illegal moves and resets selection and review on replay", () => {
  const adapter = { create: createGinGuidedSession, transition: transitionGinGuidedSession, replay: replayGinGuidedSession };
  const first = createGuidedHandFeature(1, adapter), second = createGuidedHandFeature(1, adapter);
  first.select("AC");
  first.dispatch({ type: "draw", source: "stock" });
  expect(get(first).error).toContain("upcard");
  expect(get(first).session).toEqual(get(second).session);
  first.dispatch({ type: "draw", source: "discard" });
  expect(get(first).selectedCardId).toBe("");
  expect(get(first).session.review).not.toBeNull();
  first.dispatch({ type: "continue" });
  const cardId = get(first).session.session.hand.blockedDiscard;
  first.dispatch({ type: "discard", cardId });
  expect(get(first).error).toContain("upcard");
  expect(get(second).session.moments).toEqual([]);
  first.replay();
  expect(get(first)).toEqual(get(second));
});

test("Gin coaching cannot see the stock or opponent's hidden cards and explains selected discards", () => {
  let state = createGinGuidedSession(1);
  const hidden = structuredClone(state.session);
  [hidden.hand.hands[1][0], hidden.hand.stock[0]] = [hidden.hand.stock[0], hidden.hand.hands[1][0]];
  expect(ginGuidance(ginObservation(state.session), "")).toEqual(ginGuidance(ginObservation(hidden), ""));
  expect(ginGuidance(ginObservation(state.session), "").tip).toContain("unknown");
  state = transitionGinGuidedSession(state, { type: "draw", source: "discard" });
  expect(ginGuidedReview(state.review!).explanation).toContain("must keep the upcard");
  expect(ginGuidance(ginObservation(state.session), state.session.hand.blockedDiscard).tip).toContain("choose another card");
  const legal = state.session.hand.hands[0].find(card => card.id !== state.session.hand.blockedDiscard)!;
  expect(ginGuidance(ginObservation(state.session), legal.id).tip).toContain("deadwood");
});

test("all Gin finishing outcomes use normal settlement and retain the finishing decision", () => {
  for (const kind of ["knock", "gin", "undercut", "draw"] as const) {
    const state = createGinGuidedSession(1);
    state.session.hand.phase = "discard";
    state.session.hand.hands = [
      ginCards(kind === "gin" ? "3C 4C 5C 6C 7D 7H 7S 9H 10H JH KS" : "3C 4C 5C 7D 7H 7S 9H 10H JH 2D KS"),
      ginCards(kind === "undercut" ? "AS 2S 3S 4H 5H 6H 8D 9D 10D 2H" : "AC 2C 6D 6H 6S 8D 9D 10D QC KC")
    ];
    if (kind === "draw") state.session.hand.stock = state.session.hand.stock.slice(0, 2);
    const action = { type: "discard" as const, cardId: "KS", knock: kind !== "draw" };
    const finished = transitionGinGuidedSession(state, action);
    expect(finished.session.hand.result?.kind).toBe(kind);
    expect(finished.session).toEqual(transitionGinSession(state.session, action));
    expect(finished.review).toBeNull();
    expect(ginGuidedRecap(finished.moments)[0].moment.action).toEqual(action);
  }
});
