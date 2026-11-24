export const cribbagePointsSheet = {
  values: "A = 1. Cards 2 to 10 = their number. J, Q and K = 10. These values build the count; they are not points earned.",
  sections: [
    { title: "While playing (pegging)", rows: [
      { label: "Make exactly 15", points: "2" },
      { label: "Make exactly 31", points: "2" },
      { label: "Last two cards are a pair", points: "2" },
      { label: "Three equal ranks in a row", points: "6" },
      { label: "Four equal ranks in a row", points: "12" },
      { label: "Run of 3 or more recent cards", points: "1 per card" },
      { label: "Go or last card (not after 31)", points: "1" }
    ], note: "A run has neighbouring ranks with no gaps, even if played out of order. Suits do not matter. Add points when one play makes more than one combination." },
    { title: "Count four cards + starter", rows: [
      { label: "Each different group adding to 15", points: "2" },
      { label: "Each pair", points: "2" },
      { label: "Each longest run of 3 or more", points: "1 per card" },
      { label: "Four kept cards in one suit", points: "4" },
      { label: "All five cards in one suit", points: "5" },
      { label: "Held jack in the starter's suit (nobs)", points: "1" }
    ], note: "Count repeated runs separately: two runs of three score 2 × 3 = 6. Count only the longest runs, not shorter runs inside them. A crib flush needs all five cards in one suit; four alone score nothing." },
    { title: "When the starter is turned", rows: [
      { label: "Jack starter (heels), for the dealer", points: "2" }
    ], note: "Heels is scored immediately, not again in the hand total. Count non-dealer's hand, dealer's hand, then the crib. First to 121 wins immediately." }
  ]
} as const;
