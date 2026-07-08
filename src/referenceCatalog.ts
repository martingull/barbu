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
    baseline: "David Parlett structure, Wikipedia-style 2C opening convention",
    overview:
      "Hearts is presented here in the Black Lady style; the main danger card is the queen of spades. The reference structure follows the Parlett-style object, play, and scoring format, while the current opening convention follows the common Wikipedia-described rule that 2C opens the first trick. The app currently plays repeated hands to 100 points with rotating pass directions and shooting the moon enabled.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Avoid winning tricks that contain penalty cards. A clean trick may be legal, but it is still a decision to think about because taking the lead can expose you later.",
        facts: [
          { label: "Main danger", value: "Queen of Spades" },
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
          "The current match rotates pass direction: left, right, across, then no pass. The holder of the two of clubs opens the first trick with 2C, following a common Wikipedia-described Hearts convention. Everyone else must follow the led suit when possible. First-trick penalty dumps are blocked when safe cards exist. Hearts cannot be led until a heart has already been played, unless a player has only hearts.",
        facts: [
          { label: "Pass", value: "Left, right, across, hold" },
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
          "Hearts scores each heart as one penalty point and the queen of spades as thirteen penalty points. The trick winner receives all penalty cards in that trick. If one seat captures all 26 points in a hand, that seat shoots the moon and scores 0 while every other seat scores 26. Hands repeat until one seat reaches 100 points; low score wins the match.",
        facts: [
          { label: "Heart", value: "1 penalty point" },
          { label: "Queen of Spades", value: "13 penalty points" },
          { label: "Points in play", value: "26 per hand" },
          { label: "Shoot the moon", value: "Shooter 0, others 26" },
          { label: "Match target", value: "100 points" }
        ]
      }
    ],
    contracts: [
      {
        id: "black-lady-match",
        title: "Hearts Match",
        objective: "Rotate the pass, then avoid hearts and the queen of spades across repeated hands.",
        scoring: "Hearts are 1 penalty point each; the queen of spades is 13; shooting the moon scores 0 for the shooter and 26 for the others.",
        lesson: "Start by reading who wins the trick, then manage the cumulative score over several hands."
      }
    ],
    contractRoadmap: [
      {
        id: "black-lady-match",
        title: "Focused local match",
        coreStatus: "Current variant",
        appStatus: "Playable",
        note: "The shared trick-taking table supports rotating pass directions, 2C opening, follow-suit legality, first-trick penalty restrictions, hearts-broken lead restrictions, trick winners, hearts, queen-of-spades scoring, shoot-the-moon scoring, and a 100-point local match."
      },
      {
        id: "passing",
        title: "Rotating pass",
        coreStatus: "Hearts v1",
        appStatus: "Playable",
        note: "The current table rotates left, right, across, and hold. The queen of spades is passable by default; locked danger spades can be a later house rule."
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
        appStatus: "Playable",
        note: "If one seat captures all 26 points in a hand, that seat scores 0 and the other seats score 26. Trick feedback calls out an active moon threat before the hand ends."
      },
      {
        id: "match-scoring",
        title: "Multi-hand match scoring",
        coreStatus: "Hearts v2",
        appStatus: "Playable",
        note: "The local match repeats hands until one seat reaches 100 penalty points. Low score wins."
      }
    ],
    variants: [
      {
        id: "black-lady",
        title: "Black Lady / Queen of Spades",
        note:
          "Black Lady is the named Hearts style the app currently plays: hearts are penalties, and the queen of spades is the large penalty card."
      },
      {
        id: "current-boundary",
        title: "Current Rule Boundary",
        note:
          "The app currently teaches rotating passes, the core trick loop, Hearts opening restrictions, penalty scoring, shooting the moon, and a 100-point local match before adding richer Hearts varieties such as locked danger spades or bonus-jack rules."
      }
    ]
  },
  {
    id: "whist",
    title: "Whist",
    family: "Whist",
    baseline: "David Parlett structure, classic Whist baseline with Wikipedia cross-check",
    overview:
      "Whist is a classic four-player partnership trick-taking game. Fixed partners sit opposite each other, the dealer's last card sets trump, players follow suit when able, and each partnership scores odd tricks above six.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Win tricks with your partner. Unlike Hearts, Whist is not a trick-avoidance game; unlike Barbu, the object does not change by contract. Your side tries to build enough tricks that the tricks above six become points.",
        facts: [
          { label: "Game type", value: "Partnership trick-taking" },
          { label: "Scoring unit", value: "Odd tricks above six" }
        ]
      },
      {
        id: "players",
        title: "Players And Partnerships",
        body:
          "Whist is played by four players in two partnerships. Partners sit opposite each other, so the player across the table is on your side and the side seats are your opponents.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Teams", value: "Two partnerships" },
          { label: "Table idea", value: "Partner opposite you" }
        ]
      },
      {
        id: "cards",
        title: "Cards",
        body:
          "Whist uses a standard fifty-two card pack. Aces are high, then kings, queens, jacks, tens, and down to twos.",
        facts: [
          { label: "Pack", value: "52 cards" },
          { label: "Rank", value: "A K Q J 10 9 8 7 6 5 4 3 2" }
        ]
      },
      {
        id: "deal",
        title: "Deal And Trump",
        body:
          "Each player receives thirteen cards. The dealer's last card sets trump for the hand. This table teaches the classic no-bidding form before moving into Whist-family varieties.",
        facts: [
          { label: "Cards per player", value: "13" },
          { label: "Trump", value: "Dealer's last card" },
          { label: "Style", value: "Classic Whist" }
        ]
      },
      {
        id: "play",
        title: "Play",
        body:
          "The player to dealer's left leads first. Play moves clockwise. A player who can follow the led suit must do so. A player who is void may discard or play a trump. The highest trump wins if any trump is played; otherwise the highest card of the led suit wins. The trick winner leads next.",
        facts: [
          { label: "Opening lead", value: "Player left of dealer" },
          { label: "Legal play", value: "Follow suit when possible" },
          { label: "Trick winner", value: "Highest trump, otherwise highest led-suit card" }
        ]
      },
      {
        id: "scoring",
        title: "Scoring",
        body:
          "A partnership scores one point for each trick above six. Seven tricks scores one point, eight tricks scores two, and so on. The phone table uses a short five-point match so a session fits comfortably in one sitting.",
        facts: [
          { label: "Six tricks", value: "Book, no points yet" },
          { label: "Seven tricks", value: "1 point" },
          { label: "Table target", value: "First partnership to 5 points" }
        ]
      },
      {
        id: "signals",
        title: "Silent Partnership Signals",
        body:
          "Whist communication happens through legal card play. Lead a strong or long suit to invite partner's help. Return partner's suit when it makes sense. Support partner's lead by playing high in third hand, and avoid spending strength too early in second hand.",
        facts: [
          { label: "Lead", value: "Show a strong or long suit" },
          { label: "Partner return", value: "Lead partner's suit back when useful" },
          { label: "Basic habits", value: "Second hand low, third hand high" }
        ]
      },
      {
        id: "app-learning",
        title: "App Learning Path",
        body:
          "The Whist lessons start with the partnership object, then move into compact table decisions. The first habits are follow suit, trump or discard, third hand high, returning partner's suit, inviting with a strong suit, and counting odd tricks.",
        facts: [
          { label: "First step", value: "Concept: win tricks together" },
          { label: "Practice", value: "Compact Whist habits" },
          { label: "Play", value: "Playable local match with resume" }
        ]
      }
    ],
    contracts: [
      {
        id: "classic-whist",
        title: "Classic Whist",
        objective: "Win tricks with your partner and score the tricks your side wins above six.",
        scoring: "Each odd trick above six is one point for the partnership.",
        lesson: "Start by learning follow-suit, trumping, partner support, and odd-trick counting."
      }
    ],
    contractRoadmap: [
      {
        id: "whist-reference",
        title: "Reference baseline",
        coreStatus: "Core",
        appStatus: "Defined",
        note: "Classic four-player partnership Whist is defined for object, players, cards, deal, trump, play, scoring, and table signals."
      },
      {
        id: "whist-learn",
        title: "Learning path",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The path teaches object, follow-suit, trumps, partner reading, suit invitation, and odd-trick scoring."
      },
      {
        id: "whist-play",
        title: "Playable hand",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Playable Whist has partnership seating, trump selection from dealer's last card, thirteen-trick play, partnership scoring, and local resume state."
      },
      {
        id: "whist-table-habits",
        title: "Table habits",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The table emphasizes opening leads, partner returns, third-hand support, trump use, and odd-trick awareness."
      }
    ],
    variants: [
      {
        id: "classic-baseline",
        title: "Classic Baseline",
        note:
          "Classic Whist uses fixed partnerships, dealer-last-card trump, and odd-trick scoring."
      },
      {
        id: "whist-family-varieties",
        title: "Whist-Family Varieties",
        note:
          "Bid Whist, Knock-out Whist, honours, rubber scoring, and Amerikaner-style auction play are related varieties that should be introduced as named tables or variants."
      }
    ]
  },
  {
    id: "spades",
    title: "Spades",
    family: "Whist",
    baseline: "Whist-family starter, Spades fixed-trump baseline",
    overview:
      "Spades is the app's next Whist-family partnership table. The starter version shares the Whist hand surface: You and Barbu play against Left and Right, players follow suit when able, and spades are always trump.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Win tricks with your partner while treating spades as the permanent trump suit. The full game adds bidding so each side tries to make the number of tricks it promised.",
        facts: [
          { label: "Game type", value: "Partnership trick-taking" },
          { label: "Current focus", value: "Fixed spades trump" }
        ]
      },
      {
        id: "players",
        title: "Players And Partnerships",
        body:
          "The app uses the same partnership seating as Whist. You sit opposite Barbu, and the side seats play as the opposing partnership.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Partner", value: "Barbu" }
        ]
      },
      {
        id: "play",
        title: "Play",
        body:
          "A player who can follow the led suit must follow. A player who is void may discard or play a spade. If any spade is played, the highest spade wins the trick; otherwise the highest card of the led suit wins.",
        facts: [
          { label: "Trump", value: "Spades are always trump" },
          { label: "Legal play", value: "Follow suit when possible" },
          { label: "Trick winner", value: "Highest spade, otherwise highest led-suit card" }
        ]
      },
      {
        id: "scoring",
        title: "Scoring Boundary",
        body:
          "The first app version plays a starter hand and counts partnership tricks. Bids, nil bids, bags, and match settlement are planned next before this table is considered a complete Spades game.",
        facts: [
          { label: "Now", value: "Playable fixed-trump hand" },
          { label: "Next", value: "Bidding, nil, bags, match score" }
        ]
      }
    ],
    contracts: [
      {
        id: "starter-spades",
        title: "Starter Spades",
        objective: "Win partnership tricks with spades fixed as trump.",
        scoring: "The starter table counts tricks and odd-trick style match points until bidding is added.",
        lesson: "Start by recognizing when you must follow suit and when a spade can cut the trick."
      }
    ],
    contractRoadmap: [
      {
        id: "spades-reference",
        title: "Reference baseline",
        coreStatus: "Starter",
        appStatus: "Defined",
        note: "Spades is defined as a Whist-family partnership game with fixed spades trump."
      },
      {
        id: "spades-play",
        title: "Playable starter hand",
        coreStatus: "Starter",
        appStatus: "Playable",
        note: "The first implementation reuses the partnership full-hand table and fixes trump to spades."
      },
      {
        id: "spades-scoring",
        title: "Bidding and bags",
        coreStatus: "Core",
        appStatus: "Planned",
        note: "Full Spades needs bids, nil, overtrick bags, and match settlement before production readiness."
      }
    ],
    variants: [
      {
        id: "starter-boundary",
        title: "Starter Boundary",
        note:
          "This is not yet full Spades. It is the first playable foundation so the table, trump logic, and partnership UI can settle before bidding is added."
      }
    ]
  }
];
