import type { FullHandContract } from "./lessonTypes";

export type FullHandContractCommands = {
  startCommand: string;
  playCommand: string;
};

export const fullHandContracts: FullHandContract[] = [
  "No Hearts",
  "No Queens",
  "King of Hearts",
  "No Last Two",
  "No Tricks",
  "Hearts Trumps",
  "Domino"
];

export const fullHandContractCommands: Record<FullHandContract, FullHandContractCommands> = {
  Hearts: {
    startCommand: "start_hearts_hand",
    playCommand: "play_hearts_hand_card"
  },
  "No Hearts": {
    startCommand: "start_no_hearts_hand",
    playCommand: "play_no_hearts_hand_card"
  },
  "No Queens": {
    startCommand: "start_no_queens_hand",
    playCommand: "play_no_queens_hand_card"
  },
  "King of Hearts": {
    startCommand: "start_king_of_hearts_hand",
    playCommand: "play_king_of_hearts_hand_card"
  },
  "No Last Two": {
    startCommand: "start_no_last_two_hand",
    playCommand: "play_no_last_two_hand_card"
  },
  "No Tricks": {
    startCommand: "start_no_tricks_hand",
    playCommand: "play_no_tricks_hand_card"
  },
  "Hearts Trumps": {
    startCommand: "start_positive_tricks_hand",
    playCommand: "play_positive_tricks_hand_card"
  },
  Domino: {
    startCommand: "start_domino_hand",
    playCommand: "play_domino_card"
  }
};
