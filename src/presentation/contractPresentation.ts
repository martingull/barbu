import type { FullHandContract } from "../domain/types";
import { contractScoreMeta } from "../domain/contractScoring";

export function formatContractValue(contract: FullHandContract, value: number) {
  const meta = contractScoreMeta(contract);
  return `${value} ${value === 1 ? meta.unitName : meta.unitPlural}`;
}
