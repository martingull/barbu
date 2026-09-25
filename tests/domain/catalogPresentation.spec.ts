import { expect, test } from "@playwright/test";
import { continueGames } from "../../src/features/catalog/catalogPresentation";
import { createHeartsSession } from "../../src/domain/heartsSession";
import { createWhistSession } from "../../src/domain/whistSession";
import { createSpadesSession } from "../../src/domain/spadesSession";
import { createBridgeSession } from "../../src/domain/bridgeSession";
import { createBarbuSession } from "../../src/domain/barbuSession";
import { saveHeartsSession } from "../../src/persistence/heartsSave";
import { saveWhistSession } from "../../src/persistence/whistSave";
import { saveSpadesSession } from "../../src/persistence/spadesSave";
import { saveBridgeSession } from "../../src/persistence/bridgeSave";
import { saveBarbuSession } from "../../src/persistence/barbuSave";

test("home orders validated saves by recency without changing them", () => {
  const saved = {
    hearts: saveHeartsSession(createHeartsSession(1), "2026-09-25T10:00:00Z"),
    whist: saveWhistSession(createWhistSession(1), "2026-09-25T11:00:00Z"),
    spades: saveSpadesSession(createSpadesSession(1), "legacy"),
    bridge: saveBridgeSession(createBridgeSession(1), "2026-09-25T12:00:00Z"),
    barbu: saveBarbuSession(createBarbuSession(1), "")
  };
  const before = structuredClone(saved);
  const entries = continueGames(saved);
  expect(entries.map(entry => entry.id)).toEqual(["bridge", "whist", "hearts", "spades", "barbu"]);
  expect(entries.every(entry => entry.title && entry.summary)).toBe(true);
  expect(saved).toEqual(before);
  expect(continueGames({ ...saved, bridge: null }).map(entry => entry.id)).not.toContain("bridge");
  expect(continueGames({ hearts: null, whist: null, spades: null, bridge: null, barbu: null })).toEqual([]);
});
