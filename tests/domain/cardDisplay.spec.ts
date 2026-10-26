import { expect, test } from "@playwright/test";
import { formatCardLabel, formatCardText } from "../../src/presentation/cardDisplay";

test("card prose uses suit symbols for every rank and suit without changing internal IDs", () => {
  for (const [suit, symbol] of Object.entries({ S: "♠", H: "♥", C: "♣", D: "♦" })) {
    for (const rank of ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]) {
      const id = `${rank}${suit}`;
      expect(formatCardText(`Play ${id}, not (${id}).`)).toBe(`Play ${rank}${symbol}, not (${rank}${symbol}).`);
      const card = { id, rank, suit: suit as "S" | "H" | "C" | "D" };
      expect(formatCardLabel(card)).toBe(`${rank}${symbol}`);
      expect(card.id).toBe(id);
    }
  }
  expect(formatCardText("Pass QS, KS and AS together.")).toBe("Pass Q♠, K♠ and A♠ together.");
  expect(formatCardText("Q♠ costs 13. Hearts, HCP, NS and EW stay readable."))
    .toBe("Q♠ costs 13. Hearts, HCP, NS and EW stay readable.");
});
