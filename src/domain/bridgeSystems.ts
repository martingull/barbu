export type BridgeBiddingSystemId = "barbu-natural" | "acol-foundation";
export const defaultBridgeSystem: BridgeBiddingSystemId = "barbu-natural";

export const bridgeBiddingSystems = {
  "barbu-natural": {
    id: "barbu-natural", name: "Barbu Natural", oneNt: [15, 17], twoNt: [20, 21],
    openingPoints: 13, majorLength: 5, raiseSupport: 3, strongTwo: 22, weakTwo: [5, 11],
    summary: "Five-card majors; 15-17 1NT. Natural weak major responses, no Stayman or transfers. Not Acol or complete SAYC; check your club's agreements.",
  },
  "acol-foundation": {
    id: "acol-foundation", name: "Acol Foundation", oneNt: [12, 14], twoNt: [20, 22],
    openingPoints: 12, majorLength: 4, raiseSupport: 4, strongTwo: 23, weakTwo: [6, 10],
    summary: "Four-card majors; 12-14 1NT. Stayman and natural weak takeouts, no transfers. Check your club's agreements.",
  },
} as const;

export function isBridgeSystem(value: unknown): value is BridgeBiddingSystemId {
  return value === "barbu-natural" || value === "acol-foundation";
}

export const bridgeSystemAgreement = (id: BridgeBiddingSystemId) => {
  const system = bridgeBiddingSystems[id];
  return `${system.name}: ${system.summary}`;
};

