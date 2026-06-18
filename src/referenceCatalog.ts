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
          "The reference table uses four seats: Tutor at the top, You at the bottom, Right on the right, and Left on the left. Seat names are fixed to the screen so examples stay readable.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Current app order", value: "Tutor -> Right -> You -> Left when Tutor leads" }
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
          "A full reference deal belongs to the core game rules layer. The teaching path currently begins after a deal, with small table positions chosen to teach one rule or contract idea at a time.",
        facts: [
          { label: "App scope now", value: "Guided tricks and generated drills" },
          { label: "Later scope", value: "Full hands and contract sequencing" }
        ]
      },
      {
        id: "play",
        title: "Play Direction",
        body:
          "The leader plays the first card to a trick. Play then passes clockwise around the table. A player who can follow the led suit must do so; only a player void in that suit may discard another suit.",
        facts: [
          { label: "Led suit", value: "Set by the first card in the trick" },
          { label: "Tutor lead order", value: "Tutor, Right, You, Left" },
          { label: "Follow-suit rule", value: "Follow the led suit when you can" }
        ]
      },
      {
        id: "scoring",
        title: "Scoring",
        body:
          "Scoring depends on the contract. In avoidance contracts, penalty cards count against the player who wins the trick containing them.",
        facts: [
          { label: "No Hearts", value: "Hearts penalize the trick winner" },
          { label: "No Queens", value: "Queens penalize the trick winner" },
          { label: "King of Hearts", value: "The king of hearts is the danger card" },
          { label: "No Last Two", value: "The final two tricks penalize their winners" },
          { label: "No Tricks", value: "Every trick penalizes its winner" }
        ]
      }
    ],
    contracts: [
      {
        id: "no-hearts",
        title: "No Hearts",
        objective: "Avoid winning tricks that contain hearts.",
        scoring: "Each heart in a trick belongs to the trick winner as a penalty.",
        lesson: "First learn to separate a scary discard from the player who actually wins the trick."
      },
      {
        id: "no-queens",
        title: "No Queens",
        objective: "Avoid winning tricks that contain queens.",
        scoring: "A queen penalizes the player who wins the trick containing it.",
        lesson: "A lower legal card can be better than taking control of a queen trick."
      },
      {
        id: "king-of-hearts",
        title: "King of Hearts",
        objective: "Avoid capturing the king of hearts.",
        scoring: "The player who wins the trick containing the king of hearts takes the contract penalty.",
        lesson: "Watch whether your card captures the trick or safely leaves the danger with someone else."
      },
      {
        id: "no-last-two",
        title: "No Last Two",
        objective: "Avoid winning either of the final two tricks.",
        scoring: "Each of the last two tricks belongs to its winner as a penalty.",
        lesson: "Early tricks are setup; late leads and high cards become dangerous when only two tricks remain."
      },
      {
        id: "no-tricks",
        title: "No Tricks",
        objective: "Avoid winning tricks.",
        scoring: "Each trick belongs to its winner as a penalty.",
        lesson: "Low cards and ducking matter because taking control of any trick costs you."
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
        note: "Reference, guided course, full hand, and Barbu run support exist; generated practice is still later."
      },
      {
        id: "no-tricks",
        title: "No Tricks",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Reference, guided course, full hand, and Barbu run support exist; generated practice is still later."
      },
      {
        id: "positive-tricks",
        title: "Positive Tricks",
        coreStatus: "Core candidate",
        appStatus: "Not built",
        note: "Verify Parlett's exact contract treatment before adding rules, scoring, or UI."
      },
      {
        id: "domino",
        title: "Domino",
        coreStatus: "Core candidate",
        appStatus: "Not built",
        note: "Likely needs a different play surface from trick-taking contracts; verify baseline first."
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
  }
];
