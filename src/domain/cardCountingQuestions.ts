import type { Card, Seat, Suit, TableCard } from "../lessonTypes";
export type MemoryExercise = "heart-memory" | "high-card-memory" | "danger-count" | "whist-memory";
export type CountingExercise = MemoryExercise | "trump-count";
export type MemoryAnswer = number | boolean | Seat;
export type CardMemoryQuestion =
  | { kind: "count"; prompt: string; answer: number; options: number[] }
  | { kind: "specific"; prompt: string; answer: boolean; targetCard: Card };
export type WhistMemoryQuestion =
  | { kind: "trump_count"; prompt: string; answer: number; options: number[]; trumpSuit: Suit }
  | { kind: "trump_specific" | "boss_card"; prompt: string; answer: boolean; targetCard: Card }
  | { kind: "void_spotter"; prompt: string; answer: Seat; targetSuit: Suit };
export type MemoryQuestion = CardMemoryQuestion | WhistMemoryQuestion;
export type CountMemoryQuestion = CardMemoryQuestion & { startTrick: number; endTrick: number };
export type TrumpCountRound = { trumpSuit: Suit; tricks: TableCard[][]; questions: CountMemoryQuestion[] };
const countingTrickSeats: Seat[] = ["Tutor", "Right", "You", "Left"];
const countingRanks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const countingSuits: Suit[] = ["C", "D", "H", "S"];
const suitNames: Record<Suit, string> = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
export const heartMemoryCheckpoints = [3, 7, 11];
export const whistMemoryCheckpoints = [3, 7, 10];
const dangerCardMemoryConfig = {
  countPrompt: "How many queens have been played so far?",
  specificPrompt: "Has this queen been played yet?",
  countMax: 4,
  targetCards: countingSuits.map(suit => ({ id: `Q${suit}`, rank: "Q", suit, label: `Q${suit}` })),
  isTrackedCard: (card: Card) => card.rank === "Q"
};

export function buildTrumpCountRound(seed: number): TrumpCountRound {
  const deck = shuffleCountingDeck(seed);
  const trickCount = 13;
  const tricks = Array.from({ length: trickCount }, (_, trickIndex) =>
    countingTrickSeats.map((seat, seatIndex) => ({
      seat,
      card: deck[trickIndex * countingTrickSeats.length + seatIndex]
    }))
  );
  const trumpSuit: Suit = "H";
  const questionRanges = [
    [0, 3],
    [4, 7],
    [8, 12]
  ] as const;
  const trumpCards = deck.filter((card) => card.suit === trumpSuit);
  const questions = questionRanges.map(([startTrick, endTrick], questionIndex): CountMemoryQuestion => {
    const segmentCards = tricks
      .slice(startTrick, endTrick + 1)
      .flatMap((trick) => trick.map((play) => play.card));
    const segmentTrumpCards = segmentCards.filter((card) => card.suit === trumpSuit);
    const shouldAskSpecific = (seed + questionIndex) % 2 === 1;

    if (shouldAskSpecific) {
      const seenTargets = segmentTrumpCards;
      const unseenTargets = trumpCards.filter((card) => !segmentCards.some((segmentCard) => segmentCard.id === card.id));
      const answer = (seed + questionIndex) % 4 !== 0 && seenTargets.length > 0;
      const targetPool = answer ? seenTargets : unseenTargets.length > 0 ? unseenTargets : seenTargets;
      const targetCard = targetPool[(seed + questionIndex * 3) % Math.max(1, targetPool.length)] ?? trumpCards[0];

      return {
        kind: "specific",
        prompt: `The cards from tricks ${startTrick + 1}-${endTrick + 1} are hidden. Did this heart appear in that segment?`,
        answer,
        targetCard,
        startTrick,
        endTrick
      };
    }

    const answer = segmentTrumpCards.length;

    return {
      kind: "count",
      prompt: `The cards from tricks ${startTrick + 1}-${endTrick + 1} are hidden. How many hearts appeared in that segment?`,
      answer,
      options: countOptions(answer, seed + questionIndex, 13),
      startTrick,
      endTrick
    };
  });

  return { trumpSuit, tricks, questions };
}


export function buildWhistMemoryQuestion(tricks: TableCard[][], trumpSuit: Suit, seed: number): WhistMemoryQuestion {
  const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
  const trumpSeen = seenCards.filter((card) => card.suit === trumpSuit).length;

  // Detect voids
  const voids: { seat: Seat; suit: Suit }[] = [];
  tricks.forEach((trick) => {
    const leadSuit = trick[0].card.suit;
    trick.forEach((play) => {
      if (play.card.suit !== leadSuit) {
        voids.push({ seat: play.seat, suit: leadSuit });
      }
    });
  });

  const voidSpotterValid = voids.filter(v => v.seat !== "You").length > 0;
  const lastTrick = tricks.length > 0 ? tricks[tricks.length - 1] : null;
  const ledSuit = lastTrick ? lastTrick[0].card.suit : null;
  const bossCardValid = ledSuit !== null && ledSuit !== trumpSuit;

  const availableKinds = ["trump_count", "trump_specific"];
  if (bossCardValid) availableKinds.push("boss_card");
  if (voidSpotterValid) availableKinds.push("void_spotter");

  const kind = availableKinds[seed % availableKinds.length];

  if (kind === "void_spotter") {
    const targetVoid = voids.filter(v => v.seat !== "You")[seed % voids.filter(v => v.seat !== "You").length];
    return {
      kind: "void_spotter",
      prompt: `Who is officially out of ${suitNames[targetVoid.suit]}?`,
      answer: targetVoid.seat,
      targetSuit: targetVoid.suit
    };
  } else if (kind === "boss_card") {
    // Find the highest unplayed card of ledSuit
    const allSuitCards = countingRanks.map((rank) => ({ id: `${rank}${ledSuit}`, rank, suit: ledSuit as Suit, label: `${rank}${ledSuit}` }));
    const unplayed = allSuitCards.filter(c => !seenCards.some(sc => sc.id === c.id));
    const boss = unplayed.length > 0 ? unplayed.reduce((max, c) => countingRanks.indexOf(c.rank) > countingRanks.indexOf(max.rank) ? c : max) : allSuitCards[allSuitCards.length - 1];

    return {
      kind: "boss_card",
      prompt: `Is this now the boss card in ${suitNames[boss.suit]}?`,
      answer: true, // Retain the existing positive-only boss-card exercise.
      targetCard: boss
    };
  } else if (kind === "trump_count") {
    return {
      kind: "trump_count",
      prompt: `How many ${suitNames[trumpSuit]} trumps have appeared?`,
      answer: trumpSeen,
      options: countOptions(trumpSeen, seed, 13),
      trumpSuit
    };
  } else {
    const allTrumps = countingRanks.map((rank) => ({ id: `${rank}${trumpSuit}`, rank, suit: trumpSuit as Suit, label: `${rank}${trumpSuit}` }));
    const targetCard = allTrumps[(seed + trumpSeen) % allTrumps.length];
    return {
      kind: "trump_specific",
      prompt: "Has this trump been played so far?",
      answer: seenCards.some((card) => card.id === targetCard.id),
      targetCard
    };
  }
}


export function buildTrumpMemoryQuestion(tricks: TableCard[][], seed: number): CardMemoryQuestion {
  const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
  const trumpSeen = seenCards.filter((card) => card.suit === "H").length;

  if (seed % 2 === 0) {
    return {
      kind: "count",
      prompt: "How many hearts have been played so far?",
      answer: trumpSeen,
      options: countOptions(trumpSeen, seed, 13)
    };
  }

  const hearts = countingRanks.map((rank) => ({ id: `${rank}H`, rank, suit: "H" as Suit, label: `${rank}H` }));
  const targetCard = hearts[(seed + trumpSeen) % hearts.length];

  return {
    kind: "specific",
    prompt: "Has this heart been played so far?",
    answer: seenCards.some((card) => card.id === targetCard.id),
    targetCard
  };
}


export function buildCourtMemoryQuestion(tricks: TableCard[][], seed: number): CardMemoryQuestion {
  const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
  const courtSeen = seenCards.filter((card) => isCourtCard(card)).length;

  if (seed % 2 === 0) {
    return {
      kind: "count",
      prompt: "How many high cards have been played so far?",
      answer: courtSeen,
      options: countOptions(courtSeen, seed, 12)
    };
  }

  const courtCards = countingSuits.flatMap((suit) =>
    ["J", "Q", "K"].map((rank) => ({
      id: `${rank}${suit}`,
      rank,
      suit,
      label: `${rank}${suit}`
    }))
  );
  const targetCard = courtCards[(seed + courtSeen) % courtCards.length];

  return {
    kind: "specific",
    prompt: "Has this high card been played so far?",
    answer: seenCards.some((card) => card.id === targetCard.id),
    targetCard
  };
}


export function buildDangerMemoryQuestion(tricks: TableCard[][], seed: number): CardMemoryQuestion {
  const seenCards = tricks.flatMap((trick) => trick.map((play) => play.card));
  const dangerSeen = seenCards.filter(dangerCardMemoryConfig.isTrackedCard).length;
  const checkpointIndex = Math.max(0, heartMemoryCheckpoints.indexOf(tricks.length));

  if ((seed + checkpointIndex) % 2 === 0) {
    return {
      kind: "count",
      prompt: dangerCardMemoryConfig.countPrompt,
      answer: dangerSeen,
      options: countOptions(dangerSeen, seed, dangerCardMemoryConfig.countMax)
    };
  }

  const targetCard = dangerCardMemoryConfig.targetCards[(seed + checkpointIndex * 2) % dangerCardMemoryConfig.targetCards.length];

  return {
    kind: "specific",
    prompt: dangerCardMemoryConfig.specificPrompt,
    answer: seenCards.some((card) => card.id === targetCard.id),
    targetCard
  };
}


export function shuffleCountingDeck(seed: number) {
  const deck = countingSuits.flatMap((suit) =>
    countingRanks.map((rank) => ({
      id: `${rank}${suit}`,
      rank,
      suit,
      label: `${rank}${suit}`
    }))
  );
  let randomSeed = seed || 1;

  for (let index = deck.length - 1; index > 0; index -= 1) {
    randomSeed = (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = randomSeed % (index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}


export function countOptions(answer: number, seed: number, max: number) {
  const offsets = seed % 2 === 0 ? [-2, -1, 0, 1] : [-1, 0, 1, 2];
  const options = offsets.map((offset) => Math.max(0, Math.min(max, answer + offset)));

  for (let value = 0; new Set(options).size < 4 && value <= max; value += 1) {
    options.push(value);
  }

  return Array.from(new Set(options)).slice(0, 4).sort((left, right) => left - right);
}


export function isCourtCard(card: Card) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}
