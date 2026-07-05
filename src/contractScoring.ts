import type { FullHandContract } from "./lessonTypes";

export type ContractScoringKind = "avoidance" | "reward" | "layout";

export type ContractScoreMeta = {
  kind: ContractScoringKind;
  runSign: 1 | -1;
  unitName: string;
  unitPlural: string;
  totalValue: number;
  inPlayLabel: string;
  playerValueLabel: string;
  resultVerb: string;
  bestLabel: string;
  weakestLabel: string;
};

export const contractScoreModel: Record<FullHandContract, ContractScoreMeta> = {
  Hearts: {
    kind: "avoidance",
    runSign: -1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 26,
    inPlayLabel: "points in play",
    playerValueLabel: "Your penalty",
    resultVerb: "took",
    bestLabel: "Best duck",
    weakestLabel: "Costliest trick"
  },
  Whist: {
    kind: "reward",
    runSign: 1,
    unitName: "trick",
    unitPlural: "tricks",
    totalValue: 13,
    inPlayLabel: "tricks played",
    playerValueLabel: "Your tricks",
    resultVerb: "won",
    bestLabel: "Best partnership trick",
    weakestLabel: "Missed odd trick"
  },
  "No Hearts": {
    kind: "avoidance",
    runSign: -1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 30,
    inPlayLabel: "points in play",
    playerValueLabel: "Your penalty",
    resultVerb: "took",
    bestLabel: "Best escape",
    weakestLabel: "Costliest trick"
  },
  "No Queens": {
    kind: "avoidance",
    runSign: -1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 24,
    inPlayLabel: "points in play",
    playerValueLabel: "Your penalty",
    resultVerb: "took",
    bestLabel: "Best escape",
    weakestLabel: "Costliest trick"
  },
  "King of Hearts": {
    kind: "avoidance",
    runSign: -1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 20,
    inPlayLabel: "points in play",
    playerValueLabel: "Your penalty",
    resultVerb: "took",
    bestLabel: "Best escape",
    weakestLabel: "Costliest trick"
  },
  "No Last Two": {
    kind: "avoidance",
    runSign: -1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 30,
    inPlayLabel: "points in play",
    playerValueLabel: "Your penalty",
    resultVerb: "took",
    bestLabel: "Best escape",
    weakestLabel: "Costliest trick"
  },
  "No Tricks": {
    kind: "avoidance",
    runSign: -1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 26,
    inPlayLabel: "points in play",
    playerValueLabel: "Your penalty",
    resultVerb: "took",
    bestLabel: "Best escape",
    weakestLabel: "Costliest trick"
  },
  "Hearts Trumps": {
    kind: "reward",
    runSign: 1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 65,
    inPlayLabel: "points available",
    playerValueLabel: "Your score",
    resultVerb: "won",
    bestLabel: "Best trump",
    weakestLabel: "Missed trick"
  },
  Domino: {
    kind: "layout",
    runSign: 1,
    unitName: "point",
    unitPlural: "points",
    totalValue: 65,
    inPlayLabel: "order-out value",
    playerValueLabel: "Your score",
    resultVerb: "scored",
    bestLabel: "Best lane",
    weakestLabel: "Blocked lane"
  }
};

export function contractScoreMeta(contract: FullHandContract) {
  return contractScoreModel[contract];
}

export function contractRunScore(contract: FullHandContract, value: number) {
  return contractScoreMeta(contract).runSign * value;
}

export function formatContractValue(contract: FullHandContract, value: number) {
  const meta = contractScoreMeta(contract);
  return `${value} ${value === 1 ? meta.unitName : meta.unitPlural}`;
}
