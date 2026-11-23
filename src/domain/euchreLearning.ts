import { euchreCardRank, euchreEffectiveSuit, euchreSide, legalEuchreCards, scoreEuchreHand,
  type EuchreContract, type EuchrePlay } from "./euchreRules";
import { advanceEuchreOpponents, chooseEuchreAction, euchreCallChoices, euchreCardCost, euchreDiscardOrder } from "./euchrePolicy";
import { createEuchreSession, euchrePosition, transitionEuchreSession, type EuchreAction, type EuchrePosition, type EuchreSession } from "./euchreSession";
import type { Card, Suit } from "./types";

export type EuchreQuestion = {
  kind: "bower" | "follow" | "call" | "discard" | "partner" | "score";
  hand: Card[]; trump: Suit; upcard?: Card; round?: 1 | 2; dealer?: 0 | 1 | 2 | 3;
  trick?: EuchrePlay[]; contract?: EuchreContract; makerTricks?: number;
};
export type EuchreAnswer = { good: boolean; illegal: boolean; reason: "followed_suit" | "off_suit" | "trick_winner" | "bid_selection" | "contract_target"; recommended: string };
export function euchreQuestionPosition(question: EuchreQuestion): EuchrePosition {
  return { viewer: 2, dealer: question.dealer ?? 1, turn: 2, phase: question.kind === "call" ? "calling" : question.kind === "discard" ? "discard" : "playing",
    round: question.round ?? 1, hand: question.hand, upcard: question.upcard ?? question.hand[0],
    contract: question.contract ?? { maker: 2, trump: question.trump, alone: false }, inactiveSeat: null,
    calls: [], currentTrick: question.trick ?? [], completedTricks: [], cardsRemaining: [5, 5, question.hand.length, 5] };
}
export function euchreRecommendedChoice(question: EuchreQuestion): string {
  if (question.kind === "bower") {
    const trumps = question.hand.filter(card => euchreEffectiveSuit(card, question.trump) === question.trump);
    if (!trumps.length) throw Error("A bower question needs at least one trump.");
    return [...trumps].sort((a, b) => euchreCardRank(b, question.trump) - euchreCardRank(a, question.trump))[0].id;
  }
  if (question.kind === "follow") return legalEuchreCards(question.hand, question.trick ?? [], question.trump)[0].id;
  if (question.kind === "discard") return euchreDiscardOrder(question.hand, question.trump)[0].id;
  if (question.kind === "score") {
    if (!question.contract || question.makerTricks === undefined) throw Error("A score question needs the full contract and trick total.");
    const result = scoreEuchreHand(question.contract, question.makerTricks);
    return `${result.winner}:${result.points}`;
  }
  const action = chooseEuchreAction(euchreQuestionPosition(question));
  return action.type === "pass" ? "pass" : action.type === "call" ? action.trump : action.type === "play-card" ? action.cardId : "";
}
export function evaluateEuchreAnswer(question: EuchreQuestion, selected: string): EuchreAnswer {
  const recommended = euchreRecommendedChoice(question);
  const legal = question.kind === "call" ? selected === "pass" || euchreCallChoices(euchreQuestionPosition(question)).some(choice => choice.trump === selected)
    : question.kind === "follow" || question.kind === "partner" ? legalEuchreCards(question.hand, question.trick ?? [], question.trump).some(card => card.id === selected)
    : question.kind === "score" ? /^[01]:[124]$/.test(selected) : question.hand.some(card => card.id === selected);
  const reason = question.kind === "call" || question.kind === "discard" ? "bid_selection"
    : question.kind === "score" ? "contract_target" : question.kind === "bower" ? "trick_winner" : legal ? "followed_suit" : "off_suit";
  let good = legal && selected === recommended;
  if (question.kind === "follow") good = legal;
  if (question.kind === "partner" && legal) {
    const position = euchreQuestionPosition(question);
    const bestCost = euchreCardCost(question.hand.find(card => card.id === recommended)!, question.trump);
    good = euchreCardCost(question.hand.find(card => card.id === selected)!, question.trump) === bestCost;
    // Keep the position public; never grade by inventing the remaining hands.
    if (position.currentTrick.length !== 3) throw Error("Partnership exercises require South to act last.");
  }
  return { good, illegal: !legal, reason, recommended };
}

export type EuchreGuidedEvent = Exclude<EuchreAction, { type: "next-hand" }>;
export type EuchreGuidedSession = { session: EuchreSession };
export function createEuchreGuidedSession(seed: number): EuchreGuidedSession {
  // The first teaching deal starts with South's call; subsequent replay keeps it.
  return { session: advanceEuchreOpponents(createEuchreSession(seed, 1)) };
}
export function transitionEuchreGuidedSession(state: EuchreGuidedSession, action: EuchreGuidedEvent): EuchreGuidedSession {
  if (["complete", "passed_out"].includes(state.session.hand.phase)) return state;
  if (action.type !== "next-trick" && state.session.hand.turn !== 2) throw Error("Wait for your turn.");
  return { session: advanceEuchreOpponents(transitionEuchreSession(state.session, action)) };
}
export const replayEuchreGuidedSession = (state: EuchreGuidedSession) => createEuchreGuidedSession(state.session.initialSeed);

export function euchreGuidance(position: EuchrePosition) {
  const suitNames = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
  if (position.phase === "calling") {
    const choice = chooseEuchreAction(position);
    const best = euchreCallChoices(position)[0];
    return { rule: position.round === 1 ? "Accept the upcard suit or pass. The dealer picks up and discards."
      : "The rejected suit cannot be called. You may pass or choose another suit.",
      tip: choice.type === "pass" ? "Your hand has limited trump control. Passing is the conservative plan; it is not a forced rule."
      : `Count the bowers, trump length and outside aces. ${suitNames[best.trump]} has the strongest visible control; calling commits your side to three tricks.` };
  }
  if (position.phase === "discard") return { rule: "As dealer, discard one card face down to return to five cards.",
    tip: "Keep bowers, trumps and outside aces. Discarding a singleton can leave a suit void so you can trump it later." };
  const trump = position.contract!.trump;
  const lead = position.currentTrick[0];
  return { rule: lead ? `Follow the effective led suit (${suitNames[euchreEffectiveSuit(lead.card, trump)]}). The left bower belongs to trump.`
    : "Lead any card. The highest trump wins; without trump, the highest card of the led suit wins.",
    tip: euchreSide(position.contract!.maker) === 0 ? "Your side made trump: aim for three tricks, then consider whether a sweep is still possible. Save a secure partner's winner."
    : "You are defending: taking three tricks euchres the makers and earns your side two points. Do not spend a winner to beat a secure partner." };
}
