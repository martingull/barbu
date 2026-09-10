import type { BridgeVulnerability, Seat } from "./lessonTypes";

const dealers: Seat[] = ["Tutor", "Right", "You", "Left"];
// Laws of Duplicate Bridge, Law 2. Board conditions are independent of the shuffle.
const vulnerability: BridgeVulnerability[] = [
  "None", "NS", "EW", "Both", "NS", "EW", "Both", "None",
  "EW", "Both", "None", "NS", "Both", "None", "NS", "EW"
];

export function bridgeBoardConditions(boardNumber: number) {
  if (!Number.isSafeInteger(boardNumber) || boardNumber < 1) throw new Error("Invalid Bridge board number");
  return { boardNumber, dealer: dealers[(boardNumber - 1) % 4], vulnerability: vulnerability[(boardNumber - 1) % 16] };
}
