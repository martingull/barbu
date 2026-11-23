import { standardDeck } from "../../domain/deck";
import { bestMeldLayout, deadwoodValue } from "../../domain/rummyMelds";
import { scoreGinHand, ginDiscardLayout, transitionGinSession, type GinPlayer, type GinSession } from "../../domain/ginRummySession";
import { defaultGinSettings, ginRulesFor, type GinSettings } from "../../domain/ginRummyRules";
import { createGinLearningTurn } from "../../domain/ginRummyLearning";
import { ginDiscardChoices } from "../../domain/ginRummyPolicy";
import { advanceLearningSession, type LearningSession } from "../../domain/learningSession";
import type { Card } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { formatRummyMeld } from "../../presentation/rummyDisplay";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";

export const ginCards = (ids: string) => ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown Gin example card: ${id}`);
  return card;
});
export type GinExerciseStep = { title: string; hand: Card[]; upcard?: Card; hint?: string; teaching?: Teaching; options?: string[]; followUp?: GinExerciseStep;
  settings?: GinSettings;
  turn?: { question: "draw" | "discard" | "count"; session: GinSession; drawn?: Card; source?: "stock" | "discard"; discarded?: Card };
  settlement?: { opponentHand: Card[]; knocker: GinPlayer; question: "layoff" | "score" } };

function turnStep(step: GinExerciseStep, session: GinSession, drawn?: Card, source?: "stock" | "discard", discarded?: Card): GinExerciseStep {
  const question = step.turn!.question, hand = session.hand.hands[0], points = bestMeldLayout(hand).points;
  const counts = [points, points > 0 ? points - 1 : 1, points + 10], offset = points % counts.length;
  return { ...step, hand, upcard: question === "draw" ? session.hand.discards.at(-1) : undefined,
    options: question === "count" ? [...counts.slice(offset), ...counts.slice(0, offset)].map(String) : undefined,
    turn: { question, session, drawn, source, discarded } };
}

function turnSteps(hand: string, upcard: string, stock: string, discard: string): GinExerciseStep[] {
  const initial = createGinLearningTurn(ginCards(hand), ginCards(upcard)[0], ginCards(stock)[0]);
  const drawn = transitionGinSession(initial, { type: "draw", source: "discard" });
  const finished = transitionGinSession(drawn, { type: "discard", cardId: discard });
  return (["draw", "discard", "count"] as const).map((question, index) => turnStep({
    title: ["Draw a card", "Choose your discard", "Count your deadwood"][index], hand: [],
    hint: index === 1 ? "Keep complete sets and runs together. Discard an unmatched card to leave the lowest deadwood; keep a taken upcard this turn." : undefined,
    turn: { question, session: initial }
  }, [initial, drawn, finished][index], index ? ginCards(upcard)[0] : undefined, index ? "discard" : undefined,
  index === 2 ? ginCards(discard)[0] : undefined));
}
const settlementStep = (title: string, hand: string, opponentHand: string, knocker: GinPlayer, question: "layoff" | "score"): GinExerciseStep =>
  ({ title, hand: ginCards(hand), settlement: { opponentHand: ginCards(opponentHand), knocker, question } });
export const ginExercises: Record<string, GinExerciseStep[]> = {
  melds: [
    { title: "Keep your three combinations", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D KS") },
    { title: "An ace starts a run", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD 4S QH") },
    { title: "Leave one point unmatched", hand: ginCards("8S 9S 10S 4C 4D 4H 6H 7H 8H AD QC") }
  ],
  deadwood: [
    { title: "Count unmatched cards", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D"), options: ["2", "9", "23"],
      hint: "3C-4C-5C, the three sevens and 9H-10H-JH are melds: zero points. Only 2D remains, worth 2." },
    { title: "Count a picture card", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD QH"), options: ["0", "10", "12"],
      hint: "Set aside each complete meld. A queen counts 10, not 12." },
    { title: "Count this hand", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H 2D KS"), options: ["12", "21", "31"] }
  ],
  draw: [
    { title: "Complete a club run", hand: ginCards("3C 4C 7D 7H 7S 9H 10H JH 2D KS"), upcard: ginCards("5C")[0] },
    { title: "An unhelpful queen", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD 4S"), upcard: ginCards("QC")[0] },
    { title: "Extend your hearts", hand: ginCards("2S 3S 4S 6C 6D 6H 8H 9H AD QS"), upcard: ginCards("10H")[0] }
  ],
  turn: turnSteps("3C 4C 7D 7H 7S 9H 10H JH 2D KS", "5C", "QD", "KS"),
  knock: [
    { title: "Can you end the hand?", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D"),
      hint: "Only 2D is unmatched. Two points is within the knock limit of 10, but is not zero." },
    { title: "Check the limit", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H 2D KS"),
      hint: "Two consecutive hearts are not a run. Count them as well as the other unmatched cards." },
    { title: "Your finishing decision", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH KD") }
  ],
  gin: [
    { title: "Your final discard", hand: ginCards("3C 4C 5C 6C 7D 7H 7S 9H 10H JH KS"),
      hint: "The four clubs are a run, the sevens are a set, and the three hearts are a run. Discard KS to leave zero unmatched points." },
    { title: "Keep all three melds", hand: ginCards("8S 9S 10S JS 4C 4D 4H 6H 7H 8H AD"),
      hint: "A run can contain four cards. Keep complete combinations together." },
    { title: "Find a gin finish", hand: ginCards("AC 2C 3C 4C 5D 5H 5S 9D 10D JD KH") }
  ],
  settlement: [
    settlementStep("Lay off a card", "6C 8D 9D 10D QC QD QH 2S 3S 4S", "3C 4C 5C 7D 7H 7S 9H 10H JH 2D", 1, "layoff"),
    settlementStep("A knock can lose", "3C 4C 5C 7D 7H 7S 9H 10H JH 8C", "AC AD AH 3D 4D 5D 8S 9S 10S 2H", 0, "score"),
    settlementStep("Tied deadwood", "3C 4C 5C 7D 7H 7S 9H 10H JH 2D", "AS 2S 3S 4H 5H 6H 8D 9D 10D 2H", 0, "score")
  ]
};
const ginFollowUps: Record<string, GinExerciseStep[]> = {
  melds: [
    { title: "Protect another three melds", hand: ginCards("4D 5D 6D 8C 8H 8S 10S JS QS 3H KC") },
    { title: "Keep the low run together", hand: ginCards("2H 3H 4H 6C 6D 6S 10C JC QC AD 9S") },
    { title: "Find the smaller remainder", hand: ginCards("5S 6S 7S 9C 9D 9H 2C 3C 4C 2D KH") }
  ],
  deadwood: [
    { title: "Set aside the melds again", hand: ginCards("4D 5D 6D 8C 8H 8S 10S JS QS 3H"), options: ["3", "11", "30"] },
    { title: "Count another picture card", hand: ginCards("2H 3H 4H 6C 6D 6S 10C JC QC KH"), options: ["0", "10", "13"] },
    { title: "Two cards are not a run", hand: ginCards("5S 6S 7S 9C 9D 9H 2C 3C KD AD"), options: ["6", "15", "16"] }
  ],
  draw: [
    { title: "Complete a different run", hand: ginCards("4D 5D 8C 8H 8S 10S JS QS 3H KC"), upcard: ginCards("6D")[0] },
    { title: "Does this king help?", hand: ginCards("2H 3H 4H 6C 6D 6S 10C JC QC AD"), upcard: ginCards("KH")[0] },
    { title: "Finish the clubs", hand: ginCards("5S 6S 7S 9C 9D 9H 2C 3C 2D KH"), upcard: ginCards("4C")[0] }
  ],
  turn: turnSteps("4D 5D 8C 8H 8S 10S JS QS 3H KC", "6D", "KD", "KC"),
  knock: [
    { title: "Check another possible finish", hand: ginCards("4D 5D 6D 8C 8H 8S 10S JS QS 3H") },
    { title: "Count before you knock", hand: ginCards("5S 6S 7S 9C 9D 9H 2C 3C KD AD") },
    { title: "At the knock limit", hand: ginCards("2H 3H 4H 6C 6D 6S 10C JC QC KH") }
  ],
  gin: [
    { title: "Find another zero-point finish", hand: ginCards("4D 5D 6D 7D 8C 8H 8S 10S JS QS KC") },
    { title: "Keep the four-card run", hand: ginCards("2H 3H 4H 5H 6C 6D 6S 10C JC QC AD") },
    { title: "Leave every card in a meld", hand: ginCards("5S 6S 7S 8S 9C 9D 9H 2C 3C 4C KH") }
  ],
  settlement: [
    settlementStep("Extend another exposed run", "7D 9C 10C JC KS KH KC 3H 4H 5H", "4D 5D 6D 8C 8H 8S 10S JS QS 3C", 1, "layoff"),
    settlementStep("Count the undercut bonus", "4D 5D 6D 8C 8H 8S 10S JS QS 9D", "2C 3C 4C 5H 6H 7H JD JH JC AD", 0, "score"),
    settlementStep("Another tied knock", "4D 5D 6D 8C 8H 8S 10S JS QS 3C", "AH 2H 3H 5C 5H 5S 9C 10C JC 3S", 0, "score")
  ]
};

export function ginLearningSteps(action: string, settings: GinSettings = defaultGinSettings): GinExerciseStep[] {
  const rules = ginRulesFor(settings);
  const configured = (step: GinExerciseStep): GinExerciseStep => ({ ...step, settings: { ...settings },
    turn: step.turn ? { ...step.turn, session: { ...step.turn.session, settings: { ...settings } } } : undefined });
  return ginExercises[action].map((original, index) => {
    const step = configured(original);
    const choice = ginExerciseChoices(action, step).find(choice => ginExerciseAnswer(action, step, choice.id).good)!;
    const guidance = index === 0 ? step.hint ?? `${ginSelectsDiscard(action) ? "Discard" : "Choose"} ${choice.label}. ${ginExerciseAnswer(action, step, choice.id).text}`
      : index === 1 ? step.hint ?? (action === "settlement" ? `Count both deadwood totals after any layoffs. Equal or lower defending deadwood earns the defender the difference plus the ${rules.undercutBonus}-point undercut bonus.`
        : action === "draw" ? "Look for a complete set or run after taking the upcard and discarding a different card."
        : "Keep complete sets and runs together. Only unmatched cards count as deadwood.") : undefined;
    return { ...step, teaching: { stage: teachingStages[index], guidance },
      followUp: { ...configured(ginFollowUps[action][index]), teaching: { stage: "reinforcement" } } };
  });
}

export function advanceGinLearningSession<R extends { clean: boolean }, V>(
  session: LearningSession<GinExerciseStep, R, V>, selected: string
): LearningSession<GinExerciseStep, R, V> {
  if (session.phase !== "feedback") return session;
  const turn = session.steps[session.index].turn;
  const next = advanceLearningSession(session);
  if (!turn || turn.question === "count" || next.phase === "complete") return next;
  if (turn.question === "draw" && selected !== "stock" && selected !== "upcard") throw Error("Choose a valid Gin draw source.");
  const source = selected === "stock" ? "stock" : "discard";
  const played = transitionGinSession(turn.session, turn.question === "draw"
    ? { type: "draw", source } : { type: "discard", cardId: selected });
  const question = turn.question === "draw" ? "discard" : "count";
  // A missed stage may insert a fresh companion before the linked continuation.
  const target = next.steps.findIndex((step, index) => index >= next.index &&
    step.turn?.question === question && step.teaching?.stage !== "reinforcement");
  if (target < 0) throw Error("Missing Gin turn continuation.");
  const drawn = turn.question === "draw" ? played.hand.hands[0].at(-1) : turn.drawn;
  return { ...next, steps: next.steps.map((step, index) => index === target
    ? turnStep(step, played, drawn, turn.question === "draw" ? source : turn.source,
      turn.question === "discard" ? turn.session.hand.hands[0].find(card => card.id === selected) : undefined)
    : step) };
}

export function ginFeedbackBreakdown(action: string, step: GinExerciseStep, selected: string): FeedbackBreakdown {
  const ginRules = ginRulesFor(step.settings);
  if (step.turn?.question === "draw") return ginFeedbackBreakdown("draw", { ...step, turn: undefined }, selected);
  if (step.settlement) {
    const result = ginSettlementResult(step), { knocker } = step.settlement;
    return { label: "Hand score breakdown", rows: [
      ...result.layouts.map((layout, player) => ({ label: player === 0 ? "Your deadwood" : "Barbu's deadwood", value: `${layout.points} points after layoffs` })),
      ...result.layouts.flatMap((layout, player) => layout.layoffs.map(layoff => ({ label: `${player === 0 ? "Your" : "Barbu's"} layoff`,
        value: `${layoff.cards.map(formatCardLabel).join(", ")} onto ${formatRummyMeld(result.layouts[knocker].melds[layoff.target])}` }))),
      { label: result.kind === "undercut" ? "Undercut bonus" : result.kind === "gin" ? "Gin bonus" : "Bonus",
        value: `${result.kind === "undercut" ? ginRules.undercutBonus : result.kind === "gin" ? ginRules.ginBonus : 0} points` },
      { label: "Hand points", value: `${result.winner === 0 ? "You score" : "Barbu scores"} ${result.points}` }
    ] };
  }
  if (action === "draw" && step.upcard) {
    const withUpcard = [...step.hand, step.upcard];
    const best = Math.min(...step.hand.map(card => bestMeldLayout(withUpcard.filter(item => item.id !== card.id)).points));
    return { label: "Draw breakdown", rows: [
      { label: "Current deadwood", value: `${bestMeldLayout(step.hand).points} points` },
      { label: "With upcard", value: `${best} points after the best permitted discard` },
      { label: "Stock", value: "Unknown card" }
    ] };
  }
  const layout = bestMeldLayout(step.hand.filter(card => !ginSelectsDiscard(action, step) || card.id !== selected));
  return { label: "Deadwood breakdown", rows: [
    ...layout.melds.map(meld => ({ label: meld.kind === "set" ? "Set" : "Run", value: `${formatRummyMeld(meld)} = 0` })),
    { label: "Unmatched", value: layout.deadwood.length ? layout.deadwood.map(card => `${formatCardLabel(card)} (${deadwoodValue(card)})`).join(" + ") : "None" },
    { label: "Deadwood", value: `${layout.points} points` }
  ] };
}

export const ginSelectsDiscard = (action: string, step?: GinExerciseStep) => action === "melds" || action === "gin" || step?.turn?.question === "discard";
export const ginSelectsCard = (action: string, step: GinExerciseStep) => ginSelectsDiscard(action, step) || step.settlement?.question === "layoff";
export function ginSettlementResult(step: GinExerciseStep) {
  if (!step.settlement) throw Error("Expected an exposed Gin settlement.");
  return scoreGinHand([step.hand, step.settlement.opponentHand], step.settlement.knocker, step.settings);
}
const settlementChoice = (winner: GinPlayer | null, points: number) => ({ id: `${winner}:${points}`,
  label: winner === null ? "No score" : `${winner === 0 ? "You score" : "Barbu scores"} ${points}` });
export function ginExerciseChoices(action: string, step: GinExerciseStep) {
  const ginRules = ginRulesFor(step.settings);
  if (step.turn?.question === "draw") return ginExerciseChoices("draw", { ...step, turn: undefined });
  if (step.turn?.question === "count") return ginExerciseChoices("deadwood", { ...step, turn: undefined });
  if (step.turn?.question === "discard") return step.hand.filter(card => ginDiscardLayout(step.turn!.session.hand, card.id))
    .map(card => ({ id: card.id, label: formatCardLabel(card) }));
  if (ginSelectsCard(action, step)) return step.hand.map(card => ({ id: card.id, label: formatCardLabel(card) }));
  if (step.settlement) {
    const result = ginSettlementResult(step);
    return [settlementChoice(0, result.points), settlementChoice(1, result.points),
      settlementChoice(result.points > ginRules.undercutBonus ? result.winner : null, Math.max(0, result.points - ginRules.undercutBonus))];
  }
  if (action === "deadwood") return (step.options ?? []).map(id => ({ id, label: `${id} points` }));
  return action === "draw" ? [{ id: "stock", label: "Draw stock" }, { id: "upcard", label: "Take upcard" }]
    : [{ id: "continue", label: "Keep playing" }, { id: "knock", label: "Knock" }, { id: "gin", label: "Go gin" }];
}
export const ginExercisePrompts: Record<string, string> = {
  melds: "Choose a discard that leaves the fewest deadwood points.",
  deadwood: "These are your ten cards. How many points are outside complete sets and runs?",
  draw: "Would this upcard improve your hand? Choose where to draw.",
  knock: "These ten cards remain after your proposed discard. Which finish is available? Choose Keep playing if neither is allowed.",
  gin: "You have eleven cards. Which discard leaves ten cards in complete melds, allowing you to go gin?",
  settlement: "Both hands are exposed after your knock. After any layoffs, who scores and how many hand points?"
};
export function ginExercisePrompt(action: string, step: GinExerciseStep) {
  if (step.turn?.question === "draw") return "This is a normal turn, after the opening offers. You have ten cards. Choose where to draw; the stock card is unknown.";
  if (step.turn?.question === "discard") return `You ${step.turn.source === "stock" ? "drew" : "took"} ${formatCardLabel(step.turn.drawn!)} and now have eleven cards. Choose a discard that leaves the fewest deadwood points.${step.turn.source === "discard" ? " You must keep the upcard this turn." : " You may discard the stock card you just drew."}`;
  if (step.turn?.question === "count") return `You discarded ${formatCardLabel(step.turn.discarded!)}. These are the ten cards you kept. How many deadwood points remain?`;
  return step.settlement?.question === "layoff"
    ? "Barbu knocked. Which of your unmatched cards can be laid off onto his exposed melds?" : ginExercisePrompts[action];
}
export const ginExerciseGroups = (step: GinExerciseStep) => [
  ...(step.upcard ? [{ label: "Upcard", cards: [step.upcard] }] : []),
  ...(step.turn?.drawn && step.turn.question === "discard" ? [{ label: step.turn.source === "stock" ? "Drawn from stock" : "Taken upcard", cards: [step.turn.drawn] }] : []),
  ...(step.turn?.discarded ? [{ label: "Your discard", cards: [step.turn.discarded] }] : []),
  ...(step.settlement ? [{ label: step.settlement.knocker === 1 ? "Barbu's exposed hand (knocker)" : "Barbu's exposed hand (defender)", cards: step.settlement.opponentHand }] : []),
  { label: step.settlement ? step.settlement.knocker === 0 ? "Your hand (knocker)" : "Your hand (defender)" : "Your hand before your choice", cards: step.hand }
];
export function ginExerciseAnswer(action: string, step: GinExerciseStep, selected: string): { good: boolean; illegal?: boolean; text: string } {
  const ginRules = ginRulesFor(step.settings);
  if (step.turn?.question === "draw") return ginExerciseAnswer("draw", { ...step, turn: undefined }, selected);
  if (step.turn?.question === "count") return ginExerciseAnswer("deadwood", { ...step, turn: undefined }, selected);
  if (step.turn?.question === "discard") {
    const layout = ginDiscardLayout(step.turn.session.hand, selected);
    if (!layout) return { good: false, illegal: true, text: "You must keep the upcard you just took. Choose a different card to discard." };
    const minimum = Math.min(...ginDiscardChoices(step.hand, step.turn.session.hand.blockedDiscard).map(choice => choice.layout.points));
    return { good: layout.points === minimum, text: `After discarding ${formatCardLabel(step.hand.find(card => card.id === selected)!)}, you keep ten cards with ${layout.points} deadwood points. The lowest permitted total is ${minimum}. Next, count the cards you actually kept.` };
  }
  if (step.settlement) {
    const result = ginSettlementResult(step), { knocker } = step.settlement;
    const defender = knocker === 0 ? 1 : 0;
    const laidOff = result.layouts[defender].layoffs.flatMap(layoff => layoff.cards);
    const score = `${result.winner === 0 ? "You score" : "Barbu scores"} ${result.points} hand points.`;
    if (step.settlement.question === "layoff") return {
      good: laidOff.some(card => card.id === selected),
      text: `${laidOff.map(formatCardLabel).join(", ")} extends Barbu's exposed meld and no longer counts as your deadwood. You have ${result.layouts[0].points} deadwood after layoffs against Barbu's ${result.layouts[1].points}. ${score} Layoffs are allowed after a knock, never against gin.`
    };
    const attacking = result.layouts[knocker].points, defending = result.layouts[defender].points;
    return { good: selected === settlementChoice(result.winner, result.points).id,
      text: `${defending} defending deadwood ${defending === attacking ? "equals" : "is below"} your ${attacking}. That is an undercut: the defender earns ${attacking} - ${defending} + ${ginRules.undercutBonus} = ${result.points}. ${score} A legal knock is not a guaranteed win.` };
  }
  const current = bestMeldLayout(step.hand);
  if (action === "deadwood") return { good: selected === String(current.points),
    text: `The unmatched cards total ${current.points} points. Complete sets and runs count zero; aces count 1, number cards their value, and pictures 10.` };
  if (action === "gin") {
    const points = bestMeldLayout(step.hand.filter(card => card.id !== selected)).points;
    return { good: points === 0, text: points === 0
      ? `Every remaining card belongs to a meld: zero deadwood. This discard lets you go gin. Gin adds ${ginRules.ginBonus} points to Barbu's deadwood, with no layoffs.`
      : `This discard leaves ${points} unmatched points, so it is not gin. Keep the complete melds and discard the card outside them.` };
  }
  if (action === "melds") {
    const minimum = Math.min(...step.hand.map(card => bestMeldLayout(step.hand.filter(c => c.id !== card.id)).points));
    const points = bestMeldLayout(step.hand.filter(card => card.id !== selected)).points;
    return { good: points === minimum, text: `That leaves ${points} deadwood points. The lowest possible total is ${minimum}; each card can belong to only one meld.` };
  }
  if (action === "draw" && step.upcard) {
    const nextHand = [...step.hand, step.upcard];
    const best = Math.min(...step.hand.map(card => bestMeldLayout(nextHand.filter(c => c.id !== card.id)).points));
    const useful = best < current.points;
    return { good: selected === (useful ? "upcard" : "stock"), text: useful
      ? `The upcard completes a combination. After a different discard, deadwood can fall from ${current.points} to ${best}.`
      : "This upcard does not reduce deadwood. An unknown stock card gives you another chance without committing to this card." };
  }
  const answer = current.points === 0 ? "gin" : current.points <= 10 ? "knock" : "continue";
  if (selected === "gin" && current.points > 0) return { good: false, illegal: true,
    text: `Gin needs zero deadwood; you still have ${current.points} points. ${current.points <= 10 ? "You may knock instead, or keep playing." : "Keep playing until you have ten or fewer."}` };
  if (selected === "knock" && current.points > 10) return { good: false, illegal: true,
    text: `${current.points} deadwood points is above the knock limit of 10. Keep playing.` };
  return { good: selected === answer, text: current.points === 0
    ? `No deadwood: go gin for ${ginRules.ginBonus} extra points. Barbu cannot lay off cards against a gin hand.`
    : current.points <= 10 ? `${current.points} points: you may knock, but not go gin. Continuing is legal too; this question asks which finish is available. A knock is not a guaranteed win.`
      : `${current.points} deadwood points is above the knock limit of 10. Keep playing.` };
}
