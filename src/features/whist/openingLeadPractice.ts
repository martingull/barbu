import { formatCardLabel } from "../../cardDisplay";
import { whistTrumpSuitFromHandId } from "../../whistPresentation";
import type { Card, FullHandState, Suit, CompletedHandTrick } from "../../lessonTypes";

type WhistOpeningLeadPracticeDeal = {
  id: string;
  trumpSuit: Suit;
  focusSuit: Suit;
  recommendedLead: string;
  explanation: string;
  prompt: string;
  hands: Card[][];
};



export const whistOpeningLeadPracticeMaxRounds = 3;

function appCard(rank: string, suit: Suit): Card {
  const label = `${rank}${suit}`;
  return { id: label, rank, suit, label };
}


function cardFromId(cardId: string): Card {
  const suit = cardId.at(-1) as Suit;
  return appCard(cardId.slice(0, -1), suit);
}


function whistOpeningLeadPracticeDeals(): WhistOpeningLeadPracticeDeal[] {
  return [
    {
      id: "long-spades",
      trumpSuit: "H",
      focusSuit: "S",
      recommendedLead: "5S",
      explanation: "5S is fourth highest from Q-10-8-5-2. It invites spades while preserving the queen.",
      prompt:
        "Lead 1 of 3. Hearts are trumps. Show Barbu spades with fourth highest from Q-10-8-5-2.",
      hands: [
        ["AS", "KS", "9S", "4S", "2D", "QD", "5D", "AC", "9C", "6C", "AH", "10H", "4H"].map(cardFromId),
        ["JS", "7S", "3S", "KD", "10D", "8D", "3D", "QC", "8C", "5C", "KH", "9H", "2H"].map(cardFromId),
        ["8S", "AD", "QS", "9D", "10S", "6D", "5S", "JH", "2S", "7H", "KC", "3H", "4C"].map(cardFromId),
        ["6S", "JD", "7D", "4D", "JC", "10C", "7C", "3C", "2C", "QH", "8H", "6H", "5H"].map(cardFromId)
      ]
    },
    {
      id: "strong-clubs",
      trumpSuit: "D",
      focusSuit: "C",
      recommendedLead: "KC",
      explanation: "KC leads the top of the K-Q-J honour sequence, showing supported strength.",
      prompt:
        "Lead 2 of 3. Diamonds are trumps. Show Barbu clubs with the top of K-Q-J.",
      hands: [
        ["KS", "10S", "7S", "2S", "AC", "10C", "3C", "AH", "QH", "8H", "4H", "AD", "KD"].map(cardFromId),
        ["QS", "JS", "9S", "5S", "8C", "7C", "5C", "KH", "9H", "5H", "2H", "QD", "JD"].map(cardFromId),
        ["KC", "7D", "QC", "10H", "JC", "6H", "9C", "3H", "6C", "2C", "AS", "8S", "4S"].map(cardFromId),
        ["6S", "3S", "4C", "JH", "7H", "10D", "9D", "8D", "6D", "5D", "4D", "3D", "2D"].map(cardFromId)
      ]
    },
    {
      id: "strong-clubs-save-trump",
      trumpSuit: "S",
      focusSuit: "C",
      recommendedLead: "AC",
      explanation: "AC cashes a winner in your long plain suit while keeping AS and KS for control.",
      prompt:
        "Lead 3 of 3. Spades are trumps. Show Barbu clubs: cash the ace and retain your two top trumps.",
      hands: [
        ["QS", "JS", "7S", "4S", "AD", "KD", "10D", "AH", "KH", "QH", "5H", "KC", "JC"].map(cardFromId),
        ["10S", "9S", "6S", "3S", "QD", "JD", "5D", "JH", "9H", "6H", "3H", "10C", "9C"].map(cardFromId),
        ["9D", "AS", "8D", "KS", "6D", "AC", "4D", "QC", "2C", "5C", "10H", "3C", "7H"].map(cardFromId),
        ["8S", "5S", "2S", "7D", "3D", "8H", "4H", "2H", "8C", "7C", "6C", "4C", "2D"].map(cardFromId)
      ]
    }
  ];
}


export function whistOpeningLeadPracticeDealFor(round: number) {
  const deals = whistOpeningLeadPracticeDeals();
  return deals[round % deals.length];
}


export function buildWhistOpeningLeadPracticeHand(round: number): FullHandState {
  const deal = whistOpeningLeadPracticeDealFor(round);
  const playerHand = deal.hands[2];

  return {
    id: `whist-opening-lead-practice-${deal.id}-${deal.trumpSuit}`,
    contract: "Whist",
    hands: deal.hands,
    currentPlayerIndex: 2,
    currentPlayer: "You",
    currentTrick: [],
    completedTricks: [],
    playerHand,
    legalCardIds: playerHand.map((card) => card.id),
    playerPenalty: 0,
    totalPenalty: 0,
    cardsRemaining: 52,
    trickNumber: 1,
    status: "in_progress",
    prompt: deal.prompt
  };
}


function suitNameFromId(suit: Suit) {
  return { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" }[suit];
}


function rankValue(rank: string) {
  const values: Record<string, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14
  };

  return values[rank] ?? 0;
}



export function whistOpeningLeadPracticeFeedback(trick: CompletedHandTrick, hand: FullHandState, round: number) {
  const lead = trick.cards[0];
  if (!lead) {
    return "";
  }

  const leadCard = lead.card;
  const leadLabel = formatCardLabel(leadCard);
  const leadSuit = suitNameFromId(leadCard.suit).toLowerCase();
  const trumpSuit = whistTrumpSuitFromHandId(hand.id);
  const deal = whistOpeningLeadPracticeDealFor(round);
  const focusSuit = deal.focusSuit;
  const focusSuitLabel = suitNameFromId(focusSuit).toLowerCase();
  const winnerIsPlayerSide = trick.winnerIndex === 0 || trick.winnerIndex === 2;

  if (lead.seat !== "You") {
    return `${(lead.seat === "Tutor" ? "Barbu" : lead.seat)} opened ${leadLabel}. Follow suit, support Barbu, and count trump.`;
  }

  if (leadCard.suit === trumpSuit) {
    return `${leadLabel} opened trump. Here it spends control before inviting ${focusSuitLabel}.`;
  }

  if (leadCard.suit === focusSuit) {
    if (leadCard.id !== deal.recommendedLead) {
      return `${leadLabel} shows ${focusSuitLabel}. ${deal.explanation}`;
    }

    return deal.explanation;
  }

  if (rankValue(leadCard.rank) >= rankValue("J")) {
    return winnerIsPlayerSide
      ? `${leadLabel} opened strong ${leadSuit}, but the target invite was ${focusSuitLabel}.`
      : `${leadLabel} opened strong ${leadSuit}, hiding the ${focusSuitLabel} plan.`;
  }

  return winnerIsPlayerSide
    ? `${leadLabel} opened ${leadSuit}. Cleaner message: invite ${focusSuitLabel}.`
    : `${leadLabel} opened ${leadSuit}. Legal, but it does not invite ${focusSuitLabel}.`;
}

