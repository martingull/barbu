export type ReferenceFact = {
  label: string;
  value: string;
};

export type ReferenceSection = {
  id: string;
  title: string;
  body: string;
  facts?: ReferenceFact[];
};

export type ReferenceContract = {
  id: string;
  title: string;
  objective: string;
  scoring: string;
  lesson: string;
};

export type ReferenceContractRoadmapItem = {
  id: string;
  title: string;
  coreStatus: string;
  appStatus: string;
  note: string;
};

export type ReferenceVariant = {
  id: string;
  title: string;
  note: string;
};

export type GameReference = {
  id: string;
  title: string;
  family: string;
  baseline: string;
  overview: string;
  sections: ReferenceSection[];
  contracts: ReferenceContract[];
  contractRoadmap: ReferenceContractRoadmapItem[];
  variants: ReferenceVariant[];
};

export const referenceCatalog: GameReference[] = [
  {
    id: "barbu",
    title: "Barbu",
    family: "Hearts",
    baseline: "David Parlett, The Penguin Book of Card Games",
    overview:
      "Barbu is a core contract trick-taking game. The app teaches the core game first, then keeps varieties separate as documented changes to rules, scoring, deal order, or table customs.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Each deal is played under a contract. The contract changes what is dangerous, so the object is not simply to win tricks. In the early lessons, success means avoiding tricks that contain penalty cards.",
        facts: [
          { label: "Learning focus", value: "Avoidance before full hand management" },
          { label: "Decision unit", value: "One trick at a time" }
        ]
      },
      {
        id: "players",
        title: "Players And Seats",
        body:
          "The reference table uses four seats: Barbu at the top, You at the bottom, Right on the right, and Left on the left. Seat names are fixed to the screen so examples stay readable.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Current app order", value: "Barbu -> Right -> You -> Left when Barbu leads" }
        ]
      },
      {
        id: "cards",
        title: "Cards",
        body:
          "Barbu uses a standard fifty-two card pack. Suits matter because the first card played to a trick establishes the led suit.",
        facts: [
          { label: "Pack", value: "52 cards" },
          { label: "Suits", value: "Clubs, diamonds, hearts, spades" }
        ]
      },
      {
        id: "deal",
        title: "Deal",
        body:
          "A full reference deal belongs to the core game rules layer. The teaching path begins with small table positions, while practice and Play Barbu now include local full-hand contracts.",
        facts: [
          { label: "App scope now", value: "Guided tricks and generated drills" },
          { label: "App scope now", value: "Full hands and Play Barbu sequencing" },
          { label: "Later scope", value: "Full settlement and broader game families" }
        ]
      },
      {
        id: "play",
        title: "Play Direction",
        body:
          "The leader plays the first card to a trick. Play then passes clockwise around the table. A player who can follow the led suit must do so; only a player void in that suit may discard another suit.",
        facts: [
          { label: "Led suit", value: "Set by the first card in the trick" },
          { label: "Barbu lead order", value: "Barbu, Right, You, Left" },
          { label: "Follow-suit rule", value: "Follow the led suit when you can" }
        ]
      },
      {
        id: "scoring",
        title: "Scoring",
        body:
          "Scoring depends on the contract. Avoidance contracts score against the trick winner, Hearts Trumps rewards tricks won, and Domino scores the order players empty their hands.",
        facts: [
          { label: "No Hearts", value: "Hearts penalize the trick winner" },
          { label: "No Queens", value: "Queens penalize the trick winner" },
          { label: "King of Hearts", value: "The king of hearts is the danger card" },
          { label: "No Last Two", value: "The final two tricks penalize their winners" },
          { label: "No Tricks", value: "Every trick penalizes its winner" },
          { label: "Hearts Trumps", value: "Every trick won scores positive points" },
          { label: "Domino", value: "Order out scores positive and negative points" }
        ]
      }
    ],
    contracts: [
      {
        id: "no-hearts",
        title: "No Hearts",
        objective: "Avoid winning tricks that contain hearts.",
        scoring: "Each ordinary heart is 2 penalty points; the ace of hearts is 6.",
        lesson: "First learn to separate a scary discard from the player who actually wins the trick."
      },
      {
        id: "no-queens",
        title: "No Queens",
        objective: "Avoid winning tricks that contain queens.",
        scoring: "Each queen is 6 penalty points for the trick winner.",
        lesson: "A lower legal card can be better than taking control of a queen trick."
      },
      {
        id: "king-of-hearts",
        title: "King of Hearts",
        objective: "Avoid capturing the king of hearts.",
        scoring: "The king of hearts is 20 penalty points for the trick winner.",
        lesson: "Watch whether your card captures the trick or safely leaves the danger with someone else."
      },
      {
        id: "no-last-two",
        title: "No Last Two",
        objective: "Avoid winning either of the final two tricks.",
        scoring: "The penultimate trick is 10 penalty points; the final trick is 20.",
        lesson: "Early tricks are setup; late leads and high cards become dangerous when only two tricks remain."
      },
      {
        id: "no-tricks",
        title: "No Tricks",
        objective: "Avoid winning tricks.",
        scoring: "Each trick is 2 penalty points for its winner.",
        lesson: "Low cards and ducking matter because taking control of any trick costs you."
      },
      {
        id: "hearts-trumps",
        title: "Hearts Trumps",
        objective: "Win tricks while hearts act as trumps.",
        scoring: "Each trick won is 5 positive points; hearts beat non-heart led-suit cards.",
        lesson: "This contract flips the avoidance habit: a heart can cut the trick and take control."
      },
      {
        id: "domino",
        title: "Domino",
        objective: "Empty your hand by building each suit outward from the starting rank.",
        scoring: "The first four players out score +45, +20, +5, and -5 in order.",
        lesson: "Open a suit with a seven in v1, then extend the low or high end by one rank when you can."
      }
    ],
    contractRoadmap: [
      {
        id: "no-hearts",
        title: "No Hearts",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Reference, learning path, generated practice, full hand, and Barbu run support exist."
      },
      {
        id: "no-queens",
        title: "No Queens",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Reference, learning path, generated practice, full hand, and Barbu run support exist."
      },
      {
        id: "king-of-hearts",
        title: "King of Hearts",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The app currently names the Barbu contract by its danger card for beginner clarity."
      },
      {
        id: "no-last-two",
        title: "No Last Two",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Reference, guided course, generated practice, full hand, and Barbu run support exist."
      },
      {
        id: "no-tricks",
        title: "No Tricks",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Reference, guided course, generated practice, full hand, and Barbu run support exist."
      },
      {
        id: "hearts-trumps",
        title: "Hearts Trumps",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Reference, guided course, generated practice, full hand, trump trick resolution, and Barbu run support exist."
      },
      {
        id: "domino",
        title: "Domino",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Opening-rank state exists but the app currently defaults to fixed-seven layout v1; guided course, generated practice, full hand, and Barbu run support exist. Chooser/declarer-selected starting rank is later."
      }
    ],
    variants: [
      {
        id: "parlett-baseline",
        title: "Core Baseline",
        note:
          "The core Barbu game starts from Parlett for rules, terminology, play direction, and contract descriptions before the app adapts them into lessons."
      },
      {
        id: "learning-table",
        title: "Teaching Variety",
        note:
          "The current app uses small authored positions and generated drills before full deals. Any simplification should preserve the baseline rule being taught."
      },
      {
        id: "future-varieties",
        title: "Future Varieties Of Play",
        note:
          "Later game varieties can change contract order, scoring, or table customs, but those differences should be documented in this reference layer."
      }
    ]
  },
  {
    id: "hearts",
    title: "Hearts",
    family: "Hearts",
    baseline: "David Parlett structure, Wikipedia-style MVP opening convention",
    overview:
      "The MVP Hearts table is the Queen of Spades style known in some places as the woman of spades. The reference structure follows the Parlett-style object, play, and scoring format, while the current opening convention follows the common Wikipedia-described rule that 2C opens the first trick. The app currently plays repeated hands to 50 points.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Avoid winning tricks that contain penalty cards. A clean trick may be legal, but it is still a decision to think about because taking the lead can expose you later.",
        facts: [
          { label: "Main danger", value: "Queen of spades" },
          { label: "Other danger", value: "Any heart" }
        ]
      },
      {
        id: "players",
        title: "Players And Seats",
        body:
          "The Hearts table uses the same four-seat trick-taking surface as Barbu: Barbu teaches from the top, You play from the bottom, and the side seats complete the table.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Tutor", value: "Barbu, the King of Cards" }
        ]
      },
      {
        id: "play",
        title: "Play",
        body:
          "The MVP hand starts by passing three cards left. The holder of the two of clubs opens the first trick with 2C, following a common Wikipedia-described Hearts convention. Everyone else must follow the led suit when possible. First-trick penalty dumps are blocked when safe cards exist. Hearts cannot be led until a heart has already been played, unless a player has only hearts.",
        facts: [
          { label: "Pass", value: "Three cards left" },
          { label: "Opening lead", value: "Holder of 2C leads 2C" },
          { label: "Opening source", value: "Wikipedia-style Hearts convention" },
          { label: "Led suit", value: "Set by the first card in the trick" },
          { label: "Legal play", value: "Follow suit when you can" },
          { label: "Heart leads", value: "Blocked until hearts are broken" },
          { label: "Trick winner", value: "Highest card in the led suit wins" }
        ]
      },
      {
        id: "scoring",
        title: "Scoring",
        body:
          "MVP Hearts scores each heart as one penalty point and the queen of spades as thirteen penalty points. The trick winner receives all penalty cards in that trick. Hands repeat until one seat reaches 50 points; low score wins the match.",
        facts: [
          { label: "Heart", value: "1 penalty point" },
          { label: "Queen of spades", value: "13 penalty points" },
          { label: "Points in play", value: "26 per hand" },
          { label: "MVP target", value: "50 points" }
        ]
      }
    ],
    contracts: [
      {
        id: "mvp-hand",
        title: "MVP Hearts Match",
        objective: "Pass three cards, then avoid hearts and the queen of spades across repeated hands.",
        scoring: "Hearts are 1 penalty point each; the queen of spades is 13.",
        lesson: "Start by reading who wins the trick, then manage the cumulative score over several hands."
      }
    ],
    contractRoadmap: [
      {
        id: "mvp-hand",
        title: "Focused local match",
        coreStatus: "MVP",
        appStatus: "Playable",
        note: "The shared trick-taking table supports 2C opening, follow-suit legality, first-trick penalty restrictions, hearts-broken lead restrictions, trick winners, hearts, queen-of-spades scoring, and a 50-point local match."
      },
      {
        id: "passing",
        title: "Pass three left",
        coreStatus: "Hearts v1",
        appStatus: "Playable",
        note: "The MVP passes three cards left before the first trick. Rotating pass directions can wait until the hand loop is stronger."
      },
      {
        id: "hearts-broken",
        title: "Hearts-broken lead restriction",
        coreStatus: "Hearts v1",
        appStatus: "Playable",
        note: "Heart leads are blocked until hearts are broken unless the player has only hearts."
      },
      {
        id: "shooting-moon",
        title: "Shooting the moon",
        coreStatus: "Hearts v2",
        appStatus: "Later",
        note: "Moon scoring is intentionally excluded until normal penalty avoidance is clear."
      },
      {
        id: "match-scoring",
        title: "Multi-hand match scoring",
        coreStatus: "Hearts v2",
        appStatus: "Later",
        note: "The MVP focuses on a single hand rather than a match to a target score."
      }
    ],
    variants: [
      {
        id: "queen-of-spades",
        title: "Queen Of Spades / Woman Of Spades",
        note:
          "This is the named danger-card style the MVP starts from: hearts are penalties, and the queen of spades is the large penalty card."
      },
      {
        id: "mvp-simplification",
        title: "MVP Boundary",
        note:
          "The app currently teaches pass-left, the core trick loop, Hearts opening restrictions, and penalty scoring before adding rotating pass directions, moon scoring, or longer match structure."
      }
    ]
  }
];
