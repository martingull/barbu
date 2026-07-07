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
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  Whist: {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  "No Hearts": {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  "No Queens": {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  "King of Hearts": {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  "No Last Two": {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  "No Tricks": {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  "Hearts Trumps": {
    startCommand: "start_hand",
    playCommand: "play_hand_card"
  },
  Domino: {
    startCommand: "start_domino_hand",
    playCommand: "play_domino_card"
  }
};
