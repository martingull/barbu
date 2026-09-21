import fixture from "./bridge-legacy-save.json" with { type: "json" };
import type { SavedBridgeRun } from "../../src/persistence/bridgeSave";
import type { FullHandState, Suit } from "../../src/lessonTypes";

function expand(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(expand);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expand(item)]));
  if (typeof value === "string" && /^@(?:[2-9]|10|J|Q|K|A)[CDHS]$/.test(value)) {
    const id = value.slice(1);
    return { id, rank: id.slice(0, -1), suit: id.at(-1) as Suit, label: id };
  }
  return value;
}
export const bridgeLegacyCases = expand(fixture.cases) as { saved: SavedBridgeRun; cardId: string; next: FullHandState }[];
