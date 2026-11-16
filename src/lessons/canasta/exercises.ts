import { canastaDeck, canastaValue, initialCanastaMinimum, scoreCanastaSide, completedCanastas } from "../../domain/canastaRules";
import { createCanastaSession, transitionCanastaSession, type CanastaAction, type CanastaSession } from "../../domain/canastaSession";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";

export function canastaCards(ids: string) {
  const deck = canastaDeck(0);
  return ids.split(" ").map(id => {
    const card = deck.find(card => card.id === id);
    if (!card) throw Error(`Unknown Canasta card: ${id}`);
    return card;
  });
}
export type CanastaExercise = { title: string; prompt: string; session: CanastaSession; action?: CanastaAction; explanation: string;
  teaching?: Teaching; followUp?: CanastaExercise; options?: string[] };
function position(ids: string, opened = true, phase: "draw" | "play" = "play") {
  const session = createCanastaSession(3);
  session.hand.hands[0] = canastaCards(ids); session.hand.sides[0].opened = opened; session.hand.phase = phase;
  session.hand.discards = canastaCards("1-KD");
  return session;
}
function meld(title: string, ids: string, rank: string, selected: string, explanation: string): CanastaExercise {
  return { title, session: position(ids), prompt: `Your team has opened. Can you meld the ${rank === "7" ? "sevens and wild" : rank + " group"}?`,
    action: { type: "meld", groups: [{ rank, cardIds: selected.split(" ") }] }, explanation };
}
function pile(title: string, ids: string, pair: string, opened: boolean, explanation: string): CanastaExercise {
  const session = position(ids, opened, "draw"); session.hand.discards = canastaCards("1-5C 1-QH");
  return { title, session, prompt: "A queen tops the discard pile. Can you take the pile with this hand?",
    action: { type: "pickup", pair: pair.split(" "), groups: [] }, explanation };
}
function finish(title: string, count: number, ids: string, explanation: string): CanastaExercise {
  const session = position(ids);
  session.hand.sides[0].melds = ["8", "9"].slice(0, count).map(rank => ({ rank, cards: canastaDeck(0).filter(card => card.rank === rank).slice(0, 7) }));
  return { title, session, prompt: `Your partnership has ${count} completed canasta${count === 1 ? "" : "s"}. Can discarding the king end the hand?`,
    action: { type: "discard", cardId: ids.split(" ")[0] }, explanation };
}
function opening(title: string, score: number, ids: string, groups: string[][]): CanastaExercise {
  const session = position(ids, false); session.scores[0] = score;
  const action: CanastaAction = { type: "meld", groups: groups.map(([rank, ...cardIds]) => ({ rank, cardIds })) };
  const points = groups.flatMap(([, ...ids]) => canastaCards(ids.join(" "))).reduce((sum, card) => sum + canastaValue(card), 0);
  return { title, session, action, prompt: `Can these proposed groups open your partnership at a match score of ${score}?`,
    explanation: `The groups total ${points} points. Your opening minimum is ${initialCanastaMinimum(score)}. Include a natural or wild meld, and keep a legal discard.` };
}
function scoring(title: string, count: number, ids: string, threes: string, options: string[]): CanastaExercise {
  const session = finish(title, count, ids, "").session;
  session.hand.hands[2] = [];
  session.hand.sides[0].threes = threes ? canastaCards(threes) : [];
  const score = scoreCanastaSide(session.hand.sides[0], [session.hand.hands[0], []], false);
  return { title, session, options, prompt: "The stock has ended the hand; nobody went out. Your partner holds no cards. What is your partnership's hand score?",
    explanation: `${score.bonuses} bonuses + ${score.melds} meld values + ${score.threes} for threes - ${score.penalties} penalties - ${score.inHand} held cards = ${score.total}.` };
}
function values(title: string, ids: string, options: string[], explanation: string): CanastaExercise {
  return { title, session: position(ids), options,
    prompt: "Add the point values of the cards shown. What is their total? This is counting practice, not a proposed meld.", explanation };
}
export const canastaExercises: Record<string, CanastaExercise[]> = {
  values: [
    values("Start with ordinary cards", "0-4C 0-7D 0-8H 0-QS", ["20", "30", "40"], "The four and seven count 5 each. The eight and queen count 10 each: 5 + 5 + 10 + 10 = 30 points."),
    values("Count wild cards at their own value", "0-AC 0-2D 0-JR", ["60", "70", "90"], "The ace counts 20, the two counts 20, and the joker counts 50: 20 + 20 + 50 = 90 points. Wilds keep their own point value."),
    values("Where 150 comes from", "0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB", ["70", "125", "150"], "Three queens count 30. Two kings count 20, and two jokers count 100. Together: 30 + 20 + 100 = 150 card points. The opening lesson checks the meld rules separately.")
  ],
  melds: [
    meld("Match the rank", "0-QC 0-QD 0-QH 0-4C 0-5C", "Q", "0-QC 0-QD 0-QH", "Three natural queens make a legal meld. Two cards remain, so you can discard and continue."),
    meld("Keep sevens natural", "0-7C 0-7D 0-2C 0-4C 0-5C", "7", "0-7C 0-7D 0-2C", "Sevens cannot use wild cards. Keep this pair until another natural seven arrives."),
    meld("The rule of five", "0-QC 0-QD 0-2C 0-4C 0-5C", "Q", "0-QC 0-QD 0-2C", "After your partnership opens, you need five natural cards before adding wilds to this rank.")
  ],
  opening: [
    opening("Combine your groups", 0, "0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C", [["Q", "0-QC", "0-QD", "0-QH"], ["K", "0-KC", "0-KD", "0-JR", "0-JB"]]),
    opening("A higher minimum", 3200, "0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C", [["Q", "0-QC", "0-QD", "0-QH"], ["K", "0-KC", "0-KD", "0-JR", "0-JB"]]),
    opening("Check all opening conditions", 5100, "0-QC 0-QD 0-QH 0-KC 0-KD 0-KH 0-JR 0-JB 0-AC 0-AD 0-AH 0-4C", [["Q", "0-QC", "0-QD", "0-QH"], ["K", "0-KC", "0-KD", "0-KH", "0-JR", "0-JB"], ["A", "0-AC", "0-AD", "0-AH"]])
  ],
  pile: [
    pile("A natural pair", "0-QC 0-QD 0-4C 0-6C", "0-QC 0-QD", true, "Two natural queens let you meld the top queen and take the rest of the pile."),
    pile("A wild is not a pair", "0-QC 0-2C 0-4C 0-6C", "0-QC 0-2C", true, "The pickup pair must be natural. A two cannot stand in for the second queen."),
    pile("Open from your hand", "0-QC 0-QD 0-4C 0-6C", "0-QC 0-QD", false, "Your team has not opened. The matching pair alone does not meet the 125-point opening requirement.")
  ],
  discard: [
    { title: "An empty pile", session: { ...position("0-AC 0-7C 0-4C 0-2C"), hand: { ...position("0-AC 0-7C 0-4C 0-2C").hand, discards: [] } }, prompt: "The pile is empty. Choose a legal discard.", explanation: "Discard the four. Aces and sevens cannot start an empty pile while an ordinary card is available; the two is wild." },
    { title: "Keep the wild", session: position("0-JR 0-2C 0-KC"), prompt: "You are not going out. Choose a legal discard.", explanation: "The king is the only natural card. You cannot throw a wild merely to keep the king." },
    { title: "No ordinary card", session: { ...position("0-AC 0-7C 0-2C"), hand: { ...position("0-AC 0-7C 0-2C").hand, discards: [] } }, prompt: "The pile is empty, but you have only aces, sevens, and a wild. Choose a legal discard.", explanation: "Either the ace or seven is allowed when no ordinary natural discard remains. The two stays in hand." }
  ],
  finish: [
    finish("Two canastas", 2, "0-KC", "With two completed canastas and one card left, discarding goes out for a 100-point bonus."),
    finish("One is not enough", 1, "0-KC", "One canasta is not enough to go out. Keep a card to continue until your partnership completes a second."),
    finish("Cards still in hand", 2, "0-KC 0-4C", "Two canastas permit going out, but discarding the king still leaves a four. The hand continues.")
  ],
  score: [
    scoring("One natural canasta", 1, "0-KC", "", ["560", "500", "570"]),
    scoring("Threes need two canastas", 1, "0-KC 0-4C", "0-3H", ["655", "555", "455"]),
    scoring("Add the partnership score", 2, "0-KC 0-4C", "0-3H", ["1125", "1225", "1235"])
  ]
};

const companions: Record<string, CanastaExercise[]> = {
  values: [
    values("Count another four cards", "0-5D 0-6S 0-9C 0-KH", ["20", "30", "40"], "The five and six count 5 each; the nine and king count 10 each: 5 + 5 + 10 + 10 = 30 points."),
    values("Another wild-card total", "1-AD 1-2C 1-2S 1-JB", ["60", "90", "110"], "The ace and both twos count 20 each; the joker counts 50: 20 + 20 + 20 + 50 = 110 points."),
    values("Add another collection", "0-JC 0-JD 0-JH 0-10C 0-10D 1-JR 1-JB", ["70", "125", "150"], "Three jacks count 30, two tens count 20, and two jokers count 100: 30 + 20 + 100 = 150 points.")
  ],
  melds: [
    meld("Another natural group", "0-JC 0-JD 0-JH 0-5D 0-6D", "J", "0-JC 0-JD 0-JH", "Three natural jacks make a meld; leave cards for your discard and later turn."),
    meld("Another pair of sevens", "1-7H 1-7S 1-JR 0-5D 0-6D", "7", "1-7H 1-7S 1-JR", "A joker cannot complete a sevens meld. Sevens stay natural."),
    meld("Five naturals first", "0-10C 0-10D 0-10H 0-10S 1-10C 0-2D 0-5D 0-6D", "10", "0-10C 0-10D 0-10H 0-10S 1-10C 0-2D", "Five natural tens allow a wild after opening. This six-card meld still needs one more card for a canasta.")
  ],
  opening: [
    opening("Count another opening", 0, "0-JC 0-JD 0-JH 0-10C 0-10D 0-JR 0-2H 0-4D 0-6H", [["J", "0-JC", "0-JD", "0-JH"], ["10", "0-10C", "0-10D", "0-JR", "0-2H"]]),
    opening("Reach 155", 3500, "0-JC 0-JD 0-JH 0-10C 0-10D 0-10H 0-JR 0-JB 0-4D 0-6H", [["J", "0-JC", "0-JD", "0-JH"], ["10", "0-10C", "0-10D", "0-10H", "0-JR", "0-JB"]]),
    opening("Below 180", 5500, "0-JC 0-JD 0-JH 0-10C 0-10D 0-10H 0-JR 0-JB 0-4D 0-6H", [["J", "0-JC", "0-JD", "0-JH"], ["10", "0-10C", "0-10D", "0-10H", "0-JR", "0-JB"]])
  ],
  pile: [
    pile("Another natural pair", "0-QH 0-QS 0-5D 0-6H", "0-QH 0-QS", true, "The natural queens can take the queen-topped pile. The buried cards join your hand."),
    pile("Jokers cannot replace the pair", "0-QS 1-JB 0-5D 0-6H", "0-QS 1-JB", true, "A joker does not qualify as a natural queen. Draw stock instead."),
    pile("The buried cards cannot open", "0-QH 0-QS 0-10D 0-6H", "0-QH 0-QS", false, "Open from cards already in your hand. You cannot borrow cards from inside the pile to qualify.")
  ],
  discard: [
    { title: "Start a different empty pile", session: { ...position("1-AD 1-7D 1-6S 1-2H"), hand: { ...position("1-AD 1-7D 1-6S 1-2H").hand, discards: [] } }, prompt: "Which card can start this empty pile?", explanation: "The six is an ordinary natural card, so discard it rather than the ace, seven or wild." },
    { title: "Another restricted wild", session: position("1-JB 1-2H 1-QS"), prompt: "Choose a legal discard without going out.", explanation: "The queen is the only ordinary natural card; keep the wild cards." },
    { title: "Only restricted naturals remain", session: { ...position("1-AD 1-7H 1-2S"), hand: { ...position("1-AD 1-7H 1-2S").hand, discards: [] } }, prompt: "Choose a legal card for this empty pile.", explanation: "Either the ace or seven is allowed because no ordinary natural discard remains." }
  ],
  finish: [
    finish("Finish with a different king", 2, "1-KD", "Two canastas and the final discard allow going out."),
    finish("Still waiting for a second", 1, "0-KC 0-5D", "One canasta does not allow going out, and a card would remain after discarding."),
    finish("One final card", 2, "1-KH", "With two canastas and only the king left, its discard ends the hand.")
  ],
  score: [
    scoring("Subtract an ace", 1, "0-AC", "", ["550", "570", "590"]),
    scoring("Threes without a canasta", 0, "0-QD", "0-3D", ["90", "-10", "-110"]),
    scoring("Two exposed red threes", 2, "0-QD 0-6H", "0-3H 0-3D", ["1325", "1425", "1440"])
  ]
};

export function canastaExerciseChoices(topic: string, step: CanastaExercise) {
  if (topic === "discard") return step.session.hand.hands[0].map(card => ({ id: card.id, label: card.label }));
  if (topic === "score" || topic === "values") return step.options!.map(id => ({ id, label: `${id} points` }));
  return [{ id: "yes", label: topic === "pile" ? "Take pile" : topic === "finish" ? "Go out" : "Meld" },
    { id: "no", label: topic === "pile" ? "Draw stock" : "Keep cards" }];
}

export function canastaLearningSteps(topic: string): CanastaExercise[] {
  return canastaExercises[topic].map((step, index) => ({ ...step,
    teaching: { stage: teachingStages[index], guidance: index === 0 ? step.explanation : index === 1
      ? topic === "values" ? "Aces and twos count 20; jokers count 50. Add their own values, even when wild."
        : topic === "opening" ? "Count the staged groups and check the opening minimum at this score."
        : "Check the partnership's public position as well as your own cards." : undefined },
    followUp: { ...companions[topic][index], teaching: { stage: "reinforcement", guidance: "Apply the same rule to this position." } }
  }));
}

export function canastaFeedbackBreakdown(topic: string, step: CanastaExercise): FeedbackBreakdown {
  const { hand, scores } = step.session;
  if (topic === "values") return { label: "Card points, not meld legality", rows: [
    ...hand.hands[0].map(card => ({ label: card.rank === "Joker" ? "Joker" : card.rank, value: `${canastaValue(card)} points` })),
    { label: "Total", value: `${hand.hands[0].reduce((sum, card) => sum + canastaValue(card), 0)} points` }
  ] };
  if (topic === "score") {
    const score = scoreCanastaSide(hand.sides[0], [hand.hands[0], hand.hands[2]], false);
    return { label: "Partnership hand score", rows: [
      { label: "Canasta bonuses", value: String(score.bonuses) }, { label: "Meld values", value: String(score.melds) },
      { label: "Threes", value: String(score.threes) }, { label: "Penalties", value: String(-score.penalties) },
      { label: "Cards held", value: String(-score.inHand) }, { label: "Total", value: String(score.total) }] };
  }
  const groups = step.action?.type === "meld" ? step.action.groups : [];
  const ids = groups.flatMap(group => group.cardIds);
  return { label: "Check the position", rows: [
    { label: "Partnership", value: hand.sides[0].opened ? "Already opened" : `Needs ${initialCanastaMinimum(scores[0])}` },
    ...(groups.length ? [{ label: "Proposed cards", value: `${hand.hands[0].filter(card => ids.includes(card.id)).reduce((sum, card) => sum + canastaValue(card), 0)} points` }] : []),
    { label: "Completed canastas", value: String(completedCanastas(hand.sides[0])) }] };
}

export function answerCanastaExercise(topic: string, step: CanastaExercise, answer: string) {
  if (!canastaExerciseChoices(topic, step).some(choice => choice.id === answer)) return { good: false, illegal: true, text: "Choose one of the available answers." };
  if (topic === "values") return { good: answer === String(step.session.hand.hands[0].reduce((sum, card) => sum + canastaValue(card), 0)), illegal: false, text: step.explanation };
  if (topic === "score") return { good: answer === String(scoreCanastaSide(step.session.hand.sides[0], [step.session.hand.hands[0], step.session.hand.hands[2]], false).total), illegal: false, text: step.explanation };
  let legal = false, ends = false;
  try {
    const next = transitionCanastaSession(step.session, topic === "discard" ? { type: "discard", cardId: answer } : step.action!);
    legal = true; ends = next.hand.phase === "complete";
  } catch { /* The lesson asks whether this exact action is permitted. */ }
  const expected = topic === "finish" ? legal && ends : legal;
  return { good: topic === "discard" ? legal : (answer === "yes") === expected,
    illegal: topic === "discard" ? !legal : answer === "yes" && !legal,
    text: step.explanation };
}
