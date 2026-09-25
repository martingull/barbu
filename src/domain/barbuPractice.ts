import content from "../../content/barbu-practice.json" with { type: "json" };
import type { Card, GeneratedDrillSet, GeneratedPracticeOutcome, GeneratedPracticeScenario, Seat, Suit, TableCard } from "./types";
import { barbuTrickContracts, barbuTrickPoints, type BarbuTrickContract } from "./barbuRules";
import { isLegalDominoPlacement } from "./dominoRules";
import { cardRank, legalCards, trickWinner } from "./trickTakingRules";

export const barbuPracticeTopics = [...barbuTrickContracts, "Domino"] as const;
export type BarbuPracticeTopic = typeof barbuPracticeTopics[number];
type Template = {
  id: string; title: string; ledSuit: string; prompt: string; trickNumber?: number;
  draws: Record<string, string[] | undefined>;
  otherSuits?: Record<string, string[] | undefined>;
  rankMaps?: Record<string, { from: string; values: Record<string, string> } | undefined>;
  hand: string[]; before: string[][]; after: string[][];
};
const topics: { contract: string; scenarios: Template[] }[] = content.topics;
const suitNames = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
const suitOrder = { C: 0, D: 1, S: 2, H: 3 };

function checkSeed(seed: number): bigint {
  if (!Number.isSafeInteger(seed) || seed < 0) throw Error("Practice seed must be a non-negative safe integer.");
  return BigInt(seed);
}

export function generateBarbuPracticeSet(seed: number, focus?: BarbuPracticeTopic): GeneratedDrillSet {
  const baseSeed = checkSeed(seed);
  if (focus !== undefined && !barbuPracticeTopics.includes(focus)) throw Error("Unknown Barbu practice topic.");
  const scenarios: GeneratedPracticeScenario[] = [];
  for (let round = 0; round < 4; round++) {
    topics.forEach(({ contract, scenarios: templates }, index) => {
      if (focus && contract !== focus) return;
      const scenarioSeed = baseSeed * 97n + BigInt(index + round * 7);
      scenarios.push(createScenario(templates[Number(scenarioSeed % 4n)], contract as BarbuPracticeTopic, scenarioSeed));
    });
  }
  return { id: `play-barbu-${seed}`, title: "Play Barbu", scenarios };
}

export function generateNoHeartsFollowSuit(seed: number): GeneratedPracticeScenario {
  return createScenario(topics[0].scenarios[0], "No Hearts", checkSeed(seed));
}

function createScenario(template: Template, contract: BarbuPracticeTopic, seed: bigint): GeneratedPracticeScenario {
  const variables: Record<string, string> = {};
  let state = seed ^ 0x9e3779b97f4a7c15n;
  const render = (text: string) => text.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (variables[name] === undefined) throw Error(`Unknown practice variable: ${name}`);
    return variables[name];
  });
  // Draw order and wrapping arithmetic preserve the former native seeded generator.
  for (const [name, choices] of Object.entries(template.draws)) {
    if (!choices) continue;
    state = BigInt.asUintN(64, state * 6364136223846793005n + 1n);
    variables[name] = choices[Number(state % BigInt(choices.length))];
  }
  for (const [name, exclusions] of Object.entries(template.otherSuits ?? {})) {
    if (!exclusions) continue;
    const excluded = exclusions.map(render);
    variables[name] = ["C", "D", "H", "S"].find(suit => !excluded.includes(suit))!;
  }
  for (const [name, mapping] of Object.entries(template.rankMaps ?? {})) {
    if (!mapping) continue;
    variables[name] = mapping.values[variables[mapping.from]];
  }
  const card = (token: string): Card => {
    const id = render(token);
    return { id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Suit };
  };
  const table = (entries: string[][]): TableCard[] => entries.map(([seat, token]) => ({ seat: seat as Seat, card: card(token) }));
  const ledSuit = render(template.ledSuit) as Suit;
  variables.ledName = suitNames[ledSuit];
  const playerHand = template.hand.map(card).sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || cardRank(a) - cardRank(b));
  const tableBeforeChoice = table(template.before);
  const legal = contract === "Domino"
    ? playerHand.filter(card => isLegalDominoPlacement(tableBeforeChoice.filter(p => p.card.suit === card.suit).map(p => p.card), card))
    : legalCards(playerHand, ledSuit);
  const scenario: GeneratedPracticeScenario = {
    id: `${template.id}-${seed}`, title: template.title, contract, ledSuit, prompt: render(template.prompt),
    playerHand, tableBeforeChoice, tableAfterChoice: table(template.after), legalCardIds: legal.map(c => c.id), outcomes: []
  };
  scenario.outcomes = playerHand.map(card => evaluateChoice(scenario, contract, template.trickNumber ?? 1, card));
  return scenario;
}

function evaluateChoice(s: GeneratedPracticeScenario, contract: BarbuPracticeTopic, trickNumber: number, card: Card): GeneratedPracticeOutcome {
  const outcome: GeneratedPracticeOutcome = {
    cardId: card.id, outcomeKind: "good", reason: "followed_suit", isLegal: s.legalCardIds.includes(card.id),
    winner: null, penalty: null, completedTrick: null, explanation: ""
  };
  const led = suitNames[s.ledSuit];
  if (!outcome.isLegal) {
    const choices = s.legalCardIds.join(" or ") || "none";
    return { ...outcome, outcomeKind: "illegal", reason: "off_suit", explanation: contract === "Domino"
      ? `${card.id} is not legal because it does not start or extend a suit. Legal placement: ${choices}.`
      : `${card.id} is not legal because ${led} were led and you still hold ${choices}.` };
  }
  if (contract === "Domino") {
    return { ...outcome, penalty: 0, explanation: `${card.id} fits the Domino layout. Keep opening sevens or extending a suit by one rank.` };
  }
  const completedTrick = [...s.tableBeforeChoice, { seat: "You" as const, card }, ...s.tableAfterChoice];
  const positive = contract === "Hearts Trumps";
  const winner = trickWinner(completedTrick, positive ? "H" : undefined)!.seat;
  const penalty = barbuTrickPoints(contract, completedTrick, trickNumber);
  const won = winner === "You";
  const offSuit = card.suit !== s.ledSuit;
  const outcomeKind = positive ? won ? "good" : "risky" : won ? penalty > 0 ? "penalty" : "risky" : "good";
  const reason = positive ? won ? "won_clean_trick" : offSuit ? "void_discard" : "followed_suit"
    : won && penalty > 0 ? "captured_penalty" : !won && penalty > 0 ? "avoided_penalty"
      : won ? "won_clean_trick" : offSuit ? "void_discard" : "followed_suit";
  const points = pointsLabel(contract, penalty);
  let explanation: string;
  if (positive) {
    explanation = won ? `${card.id} ${card.suit === "H" ? "is trump" : "takes control"}. ${winner} wins the trick and scores ${points}.`
      : offSuit ? `${card.id} is legal because you are void in ${led}. ${winner} wins the trick.`
        : `${card.id} follows ${led}. ${winner} wins the trick.`;
  } else if (contract === "No Last Two") {
    explanation = penalty === 0
      ? won ? `${card.id} follows ${led} and wins a clean trick. That is risky here because you may lead into the final two tricks.`
        : `${card.id} follows ${led} and stays out of the lead before the final two tricks. That setup matters in No Last Two.`
      : won ? `${card.id} follows ${led}. You win the late trick and take ${points}.`
        : `${card.id} follows ${led} and loses the late trick. That is good in No Last Two because ${winner} takes ${points} instead.`;
  } else {
    const action = offSuit ? `is a legal discard because you are void in ${led}` : `follows ${led}`;
    explanation = penalty === 0
      ? `${card.id} ${action}. ${winner} wins the trick, and no penalty card was captured.`
      : `${card.id} ${action}. ${winner} wins the trick and takes ${points}.`;
  }
  return { ...outcome, outcomeKind, reason, winner, penalty, completedTrick, explanation };
}

function pointsLabel(contract: BarbuTrickContract, points: number): string {
  const labels: Record<BarbuTrickContract, string> = {
    "No Hearts": "heart penalty points", "No Queens": "queen penalty points", "King of Hearts": "king of hearts penalty points",
    "No Last Two": "late-trick penalty points", "No Tricks": "trick penalty points", "Hearts Trumps": "trick points"
  };
  return `${contract === "King of Hearts" ? 20 : points} ${labels[contract]}`;
}
