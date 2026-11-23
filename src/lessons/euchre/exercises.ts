import { euchreDeck, euchreEffectiveSuit, euchreTrickWinner, legalEuchreCards, scoreEuchreHand } from "../../domain/euchreRules";
import { evaluateEuchreAnswer, euchreQuestionPosition, euchreRecommendedChoice, type EuchreQuestion } from "../../domain/euchreLearning";
import { euchreCallChoices } from "../../domain/euchrePolicy";
import { formatCardLabel, suitSymbol } from "../../presentation/cardDisplay";
import { euchreSeatNames, euchreSuitNames } from "../../presentation/euchreDisplay";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";

export const euchreCards = (ids: string) => ids ? ids.split(" ").map(id => {
  const card = euchreDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown Euchre card: ${id}`);
  return card;
}) : [];
export type EuchreExerciseStep = EuchreQuestion & { id: string; title: string; teaching?: Teaching; followUp?: EuchreExerciseStep };
const step = (id: string, title: string, kind: EuchreQuestion["kind"], trump: EuchreQuestion["trump"], hand: string,
  extra: Partial<EuchreQuestion> = {}): EuchreExerciseStep => ({ id, title, kind, trump, hand: euchreCards(hand), ...extra });
const trick = (ids: string) => euchreCards(ids).map((card, index) => ({ seat: ([3, 0, 1] as const)[index], card }));
export const euchreExercises: Record<string, EuchreExerciseStep[]> = {
  bowers: [
    step("b1", "The trump jack comes first", "bower", "H", "JH JD AH 9C KS"),
    step("b2", "The other black jack", "bower", "S", "JC AS KS QD 10H"),
    step("b3", "Read the new trump", "bower", "D", "AD QD JD JH AC")
  ],
  follow: [
    step("f1", "A heart in disguise", "follow", "H", "JD 9C QS AD KS", { trick: [{ seat: 1, card: euchreCards("9H")[0] }] }),
    step("f2", "A printed diamond is not enough", "follow", "H", "JD 10D AC KS 9S", { trick: [{ seat: 1, card: euchreCards("KD")[0] }] }),
    step("f3", "The left bower leads", "follow", "S", "9S AH 10D KC QD", { trick: [{ seat: 1, card: euchreCards("JC")[0] }] })
  ],
  order: [
    step("o1", "Call with trump control", "call", "H", "JH JD AH AC 9S", { upcard: euchreCards("QH")[0], round: 1, dealer: 1 }),
    step("o2", "Passing is a decision", "call", "S", "9S QH 10D KC 9H", { upcard: euchreCards("KS")[0], round: 1, dealer: 1 }),
    step("o3", "Return to five cards", "discard", "S", "JS JC AS AH 9D KD", { dealer: 2 })
  ],
  second: [
    step("s1", "Find another strong suit", "call", "H", "JH JD AH AC 9S", { upcard: euchreCards("KC")[0], round: 2, dealer: 1 }),
    step("s2", "The rejected suit stays out", "call", "S", "JS JC AS 9H 10D", { upcard: euchreCards("QH")[0], round: 2, dealer: 1 }),
    step("s3", "You may still pass", "call", "D", "9C 10D QH KS 9H", { upcard: euchreCards("AC")[0], round: 2, dealer: 1 })
  ],
  partner: [
    step("p1", "Let North keep the winner", "partner", "H", "9C AC 9H JD KS", { trick: trick("QC KC 10C") }),
    step("p2", "Win the trick cheaply", "partner", "S", "QS AS 9H JC KD", { trick: trick("KC 10C 10S") }),
    step("p3", "Keep a secure bower", "partner", "D", "9D AD AC KS 10S", { trick: trick("KD JD QD") })
  ],
  score: [
    step("c1", "Make your call", "score", "H", "", { contract: { maker: 2, trump: "H", alone: false }, makerTricks: 3 }),
    step("c2", "A lone-hand sweep", "score", "S", "", { contract: { maker: 0, trump: "S", alone: true }, makerTricks: 5 }),
    step("c3", "Euchre the makers", "score", "D", "", { contract: { maker: 1, trump: "D", alone: false }, makerTricks: 2 })
  ]
};
const followUps: Record<string, EuchreExerciseStep[]> = {
  bowers: [
    step("b1r", "The other red trump", "bower", "D", "JD JH AD 9S KC"),
    step("b2r", "The other black bower", "bower", "C", "JS AC KC QH 10D"),
    step("b3r", "A jack outranks an ace", "bower", "C", "AC QC JC JS AH")
  ],
  follow: [
    step("f1r", "A club in disguise", "follow", "C", "JS 9H QD AC KH", { trick: [{ seat: 1, card: euchreCards("9C")[0] }] }),
    step("f2r", "Follow the real spade", "follow", "C", "JS 10S AH KD 9D", { trick: [{ seat: 1, card: euchreCards("KS")[0] }] }),
    step("f3r", "Another left-bower lead", "follow", "D", "9D AS 10C KH QC", { trick: [{ seat: 1, card: euchreCards("JH")[0] }] })
  ],
  order: [
    step("o1r", "Control the black trumps", "call", "C", "JC JS AC AD 9H", { upcard: euchreCards("QC")[0], round: 1, dealer: 1 }),
    step("o2r", "Do not call on hope alone", "call", "D", "9D QS 10C KH 9S", { upcard: euchreCards("KD")[0], round: 1, dealer: 1 }),
    step("o3r", "Keep the red bowers", "discard", "H", "JH JD AH AC 9S KS", { dealer: 2 })
  ],
  second: [
    step("s1r", "Name a different trump", "call", "C", "JC JS AC AD 9H", { upcard: euchreCards("KH")[0], round: 2, dealer: 1 }),
    step("s2r", "Compare three available suits", "call", "D", "JD JH AD 9S 10C", { upcard: euchreCards("QS")[0], round: 2, dealer: 1 }),
    step("s3r", "Passing twice is allowed", "call", "S", "9D 10C QS KH 9S", { upcard: euchreCards("AD")[0], round: 2, dealer: 1 })
  ],
  partner: [
    step("p1r", "Save another secure winner", "partner", "C", "9D AD 9C JS KH", { trick: trick("QD KD 10D") }),
    step("p2r", "The left bower can win", "partner", "H", "10H QH KD 9C JD", { trick: trick("KS 10S AH") }),
    step("p3r", "North's right bower holds", "partner", "S", "9S AS AD KH 10H", { trick: trick("KS JS QS") })
  ],
  score: [
    step("c1r", "Sweep as a partnership", "score", "C", "", { contract: { maker: 1, trump: "C", alone: false }, makerTricks: 5 }),
    step("c2r", "A lone call still needs five for four", "score", "H", "", { contract: { maker: 2, trump: "H", alone: true }, makerTricks: 4 }),
    step("c3r", "A lone call can be euchred", "score", "S", "", { contract: { maker: 0, trump: "S", alone: true }, makerTricks: 1 })
  ]
};
export function euchreExerciseChoices(question: EuchreQuestion) {
  if (question.kind === "call") return [{ id: "pass", label: "Pass" },
    ...(question.round === 1 ? [question.upcard!.suit] : ["C", "D", "H", "S"] as const).map(suit => ({ id: suit, label: `Call ${suitSymbol(suit)}` }))];
  if (question.kind === "score") {
    const answer = euchreRecommendedChoice(question), [side, points] = answer.split(":").map(Number);
    return [...new Set([answer, `${1 - side}:${points}`, `${side}:${points === 4 ? 2 : points === 2 ? 1 : 2}`])]
      .sort().map(id => ({ id, label: `${id[0] === "0" ? "Your side" : "Opponents"} +${id.slice(2)}` }));
  }
  return question.hand.map(card => ({ id: card.id, label: formatCardLabel(card) }));
}
export function euchreExercisePrompt(question: EuchreQuestion): string {
  return question.kind === "bower" ? `Trump is ${suitSymbol(question.trump)}. Which is the highest trump shown?`
    : question.kind === "follow" ? `Trump is ${suitSymbol(question.trump)}. Which card may you legally play after this lead?`
    : question.kind === "call" ? question.round === 1 ? `${euchreSeatNames[question.dealer ?? 1]} is dealer. Accept the upcard suit or pass? Choose the stronger plan from this hand.`
      : `${suitSymbol(question.upcard!.suit)} was turned down. Which call, or pass, is the stronger plan?`
    : question.kind === "discard" ? `You are dealer. Trump is ${suitSymbol(question.trump)}. Which discard keeps the strongest control?`
    : question.kind === "partner" ? `Trump is ${suitSymbol(question.trump)}. South plays last. Support your side without wasting a winner.`
    : `${euchreSeatNames[question.contract!.maker]} called ${suitSymbol(question.trump)}${question.contract!.alone ? " alone" : " with partner"}. Makers took ${question.makerTricks} of 5 tricks. Who scores?`;
}
export function euchreExerciseFeedback(question: EuchreQuestion, selected: string): string {
  const answer = evaluateEuchreAnswer(question, selected), recommendation = euchreExerciseChoices(question).find(choice => choice.id === answer.recommended)!.label;
  if (question.kind === "score") {
    const result = scoreEuchreHand(question.contract!, question.makerTricks!);
    return `${result.makerTricks} maker tricks: ${result.kind === "euchred" ? "fewer than three, so defenders score 2" : result.kind === "lone-march" ? "all five alone scores 4" : result.kind === "march" ? "all five with partner scores 2" : "three or four scores 1"}. ${recommendation}.`;
  }
  if (question.kind === "bower") return `${recommendation} is the highest trump shown. The trump jack ranks first; the other jack of the same colour ranks second and belongs to trump. Both beat the ace.`;
  if (question.kind === "follow") {
    const led = euchreEffectiveSuit(question.trick![0].card, question.trump);
    return `${answer.illegal ? "That does not follow the effective suit." : "That is a legal card."} ${euchreSuitNames[led]} were led. Legal choices: ${legalEuchreCards(question.hand, question.trick!, question.trump).map(formatCardLabel).join(", ")}. The left bower counts as trump even when its printed suit differs.`;
  }
  if (question.kind === "call") {
    if (answer.illegal) return `The turned-down suit, ${suitSymbol(question.upcard!.suit)}, cannot be called in round two. Choose one of the other suits or pass.`;
    const best = euchreCallChoices(euchreQuestionPosition(question))[0];
    return `${recommendation} is the conservative recommendation from the visible hand. ${best.score >= 4 ? "Bowers, trump length and outside aces provide control for the three-trick target." : "There is too little trump control to confidently promise three tricks."} Another available call or pass is legal, but carries a different risk; this is advice, not a forced bidding rule.`;
  }
  if (question.kind === "discard") return `${recommendation} is the recommended discard: preserve trump control and outside aces, and consider making a void. Other owned cards are legal discards; they may weaken the hand.`;
  const selectedCard = question.hand.find(card => card.id === selected)!;
  if (answer.illegal) return "Follow the effective led suit first. Being able to win with a trump does not make an off-suit play legal.";
  const winner = euchreTrickWinner([...question.trick!, { seat: 2, card: selectedCard }], question.trump)!;
  return `${euchreSeatNames[winner]} wins this completed trick. ${recommendation} ${question.trick!.some(play => play.seat === 0) && euchreTrickWinner(question.trick!, question.trump) === 0
    ? "leaves North's secure winner in place without spending extra control" : "wins with the least costly available winner"}. Only the visible cards were used; no unseen reply is assumed.`;
}
export function euchreExerciseBreakdown(question: EuchreQuestion): FeedbackBreakdown {
  const contract = question.contract;
  return { label: "Euchre position", rows: [
    { label: "Trump", value: question.kind === "call" ? "Not chosen" : euchreSuitNames[question.trump] },
    ...(question.kind === "call" ? [{ label: "Round", value: String(question.round) }, { label: "Dealer", value: euchreSeatNames[question.dealer ?? 1] }] : []),
    ...(question.kind === "score" && contract ? [
      { label: "Makers", value: contract.maker % 2 === 0 ? "You and North" : "East and West" },
      { label: "Format", value: contract.alone ? "Lone hand" : "Partnership" },
      { label: "Maker tricks", value: `${question.makerTricks} of 5` }
    ] : [{ label: "Maker target", value: "At least 3 of 5 tricks" }])
  ] };
}
export function euchreLearningSteps(action: string): EuchreExerciseStep[] {
  const pool = euchreExercises[action];
  if (!pool) throw Error("Unknown Euchre topic.");
  const supportedGuidance: Record<EuchreQuestion["kind"], string> = {
    bower: "Find trump's own jack first, then the other jack of the same colour. Both outrank the ace.",
    follow: "Treat the left bower as trump. Check which cards really belong to the led suit before choosing.",
    call: "Compare bowers, trump length and outside aces against the three-trick target. Passing is legal; the rejected suit is unavailable in round two.",
    discard: "Keep five after pickup. Preserve trump control and outside aces; consider discarding a singleton to make a void.",
    partner: "Follow suit first, then read the current winner. You play last: can your partner keep this trick without spending another winner?",
    score: "Identify the makers and count their tricks. A lone-hand bonus needs all five; fewer than three gives two points to the defenders."
  };
  return pool.map((question, index) => ({ ...question, teaching: { stage: teachingStages[index],
    guidance: index === 0 ? `Choose ${euchreExerciseChoices(question).find(choice => choice.id === euchreRecommendedChoice(question))!.label}. ${euchreExerciseFeedback(question, euchreRecommendedChoice(question))}`
      : index === 1 ? supportedGuidance[question.kind] : undefined },
    followUp: { ...followUps[action][index], teaching: { stage: "reinforcement" } } }));
}
export const euchreExerciseGroups = (question: EuchreQuestion) => [
  ...(question.upcard ? [{ label: question.round === 2 ? "Turned-down upcard" : "Upcard", cards: [question.upcard] }] : []),
  ...(question.trick?.length ? [{ label: "Table before your choice", cards: question.trick.map(play => play.card),
    captions: Object.fromEntries(question.trick.map((play, index) => [play.card.id, `${euchreSeatNames[play.seat]}${index === 0 ? " (led)" : ""}`])) }] : []),
  ...(question.hand.length ? [{ label: question.kind === "discard" ? "Your six cards after pickup" : "Your cards", cards: question.hand }] : [])
];
