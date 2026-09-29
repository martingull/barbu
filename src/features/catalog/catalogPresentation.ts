import type { SavedPlayBarbuRun } from "../../persistence/barbuSave";
import type { SavedGinRun } from "../../persistence/ginRummySave";
import type { SavedCanastaRun } from "../../persistence/canastaSave";
import { isCatalogGameAvailable } from "../../games/tableFactory";
import { savedPlayBarbuRunSummary } from "../../persistence/barbuSave";
import type { SavedHeartsRun } from "../../persistence/heartsSave";
import { savedHeartsRunSummary } from "../../persistence/heartsSave";
import type { SavedWhistRun } from "../../persistence/whistSave";
import { savedWhistRunSummary } from "../../persistence/whistSave";
import type { SavedSpadesRun } from "../../persistence/spadesSave";
import { savedSpadesRunSummary } from "../spades/spadesPresentation";
import type { SavedBridgeRun } from "../../persistence/bridgeSave";
import { savedBridgeRunSummary } from "../bridge/bridgePresentation";

type SavedGames = {
  barbu: SavedPlayBarbuRun | null;
  hearts: SavedHeartsRun | null;
  whist: SavedWhistRun | null;
  spades: SavedSpadesRun | null;
  bridge: SavedBridgeRun | null;
  "gin-rummy"?: SavedGinRun | null;
  canasta?: SavedCanastaRun | null;
};
export type SavedGameId = keyof SavedGames;
export type ContinueGame = { id: SavedGameId; title: string; summary: string; savedAt: string };

// Use the feature controllers' validated saves, including their in-memory updates.
export function continueGames(saved: SavedGames): ContinueGame[] {
  const entries: ContinueGame[] = [];
  if (saved.canasta) {
    const game = saved.canasta;
    entries.push({ id: "canasta", title: "Canasta", summary: `Hand ${game.handNumber}, Us ${game.scores[0]} - Them ${game.scores[1]}`, savedAt: game.savedAt });
  }
  if (saved["gin-rummy"]) {
    const gin = saved["gin-rummy"];
    entries.push({ id: "gin-rummy", title: "Gin Rummy", summary: `Hand ${gin.handNumber}, You ${gin.scores[0]} - Barbu ${gin.scores[1]}`, savedAt: gin.savedAt });
  }
  if (saved.hearts) entries.push({ id: "hearts", title: "Hearts", summary: savedHeartsRunSummary(saved.hearts), savedAt: saved.hearts.savedAt });
  if (saved.whist) entries.push({ id: "whist", title: "Whist", summary: savedWhistRunSummary(saved.whist), savedAt: saved.whist.savedAt });
  if (saved.spades) entries.push({ id: "spades", title: "Spades", summary: savedSpadesRunSummary(saved.spades), savedAt: saved.spades.savedAt });
  if (saved.bridge) entries.push({ id: "bridge", title: "Bridge", summary: savedBridgeRunSummary(saved.bridge), savedAt: saved.bridge.savedAt });
  if (saved.barbu) entries.push({ id: "barbu", title: "Barbu", summary: savedPlayBarbuRunSummary(saved.barbu), savedAt: saved.barbu.savedAt });
  const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  return entries.filter(entry => isCatalogGameAvailable(entry.id))
    .sort((a, b) => timestamp(b.savedAt) - timestamp(a.savedAt));
}
