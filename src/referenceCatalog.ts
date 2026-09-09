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
      "Barbu is a contract trick-taking game. Each deal is governed by a contract, so the best play changes from one hand to the next. This reference treats the core contracts as the main table and keeps varieties separate as named rule or scoring changes.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Each deal is played under a contract. The contract changes what is dangerous, so the object is not simply to win tricks. A good Barbu player first identifies the contract, then decides whether to duck, capture, trump, or build a layout.",
        facts: [
          { label: "Game type", value: "Contract trick-taking" },
          { label: "Decision habit", value: "Read the contract first" }
        ]
      },
      {
        id: "players",
        title: "Players And Seats",
        body:
          "Barbu is played by four players. The table view keeps Barbu at the top, You at the bottom, Right on the right, and Left on the left so examples and full hands stay easy to read.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Clockwise order", value: "Barbu -> Right -> You -> Left when Barbu leads" }
        ]
      },
      {
        id: "cards",
        title: "Cards",
        body:
          "Barbu uses a standard fifty-two card pack. Suits matter because the first card played to a trick establishes the led suit, and every player who can follow that suit must do so.",
        facts: [
          { label: "Pack", value: "52 cards" },
          { label: "Suits", value: "Clubs, diamonds, hearts, spades" }
        ]
      },
      {
        id: "deal",
        title: "Deal",
        body:
          "Each player receives a hand from the standard pack. The table can teach a single decision, a full contract hand, or a sequence of contracts, but the rule being practiced is always the same: follow suit when able and score according to the active contract.",
        facts: [
          { label: "Pack", value: "52 cards" },
          { label: "Table size", value: "Four hands" },
          { label: "Rule anchor", value: "Contract determines scoring" }
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
        lesson: "Open a suit with a seven, then extend the low or high end by one rank when you can."
      }
    ],
    contractRoadmap: [
      {
        id: "no-hearts",
        title: "No Hearts",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Read who will win the trick before worrying about which penalty cards have been played."
      },
      {
        id: "no-queens",
        title: "No Queens",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Queens are dangerous only when they land in a trick you win."
      },
      {
        id: "king-of-hearts",
        title: "King of Hearts",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The contract centers on one danger card: the king of hearts."
      },
      {
        id: "no-last-two",
        title: "No Last Two",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Early tricks shape the endgame; the final two tricks are the scoring danger."
      },
      {
        id: "no-tricks",
        title: "No Tricks",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Every trick is costly, so ducking and preserving low exits matter from the first lead."
      },
      {
        id: "hearts-trumps",
        title: "Hearts Trumps",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Hearts become trumps, so a heart can cut a plain-suit trick and take control."
      },
      {
        id: "domino",
        title: "Domino",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Domino uses a layout surface rather than a trick-taking surface: open suits with sevens, then build outward by rank."
      }
    ],
    variants: [
      {
        id: "parlett-baseline",
        title: "Core Baseline",
        note:
          "The core Barbu game starts from Parlett for rules, terminology, play direction, and contract descriptions before Barbu adapts them into lessons."
      },
      {
        id: "learning-table",
        title: "Teaching Variety",
        note:
          "Small authored positions and generated drills are teaching forms of the same contracts. They should preserve the baseline rule being taught."
      },
      {
        id: "future-varieties",
        title: "Future Varieties Of Play",
        note:
          "Named varieties can change contract order, scoring, or table customs. Those differences should be documented as varieties rather than mixed into the core contract reference."
      }
    ]
  },
  {
    id: "hearts",
    title: "Hearts",
    family: "Hearts",
    baseline: "David Parlett structure, Wikipedia-style 2♣ opening convention",
    overview:
      "Hearts is presented here in the Black Lady style: hearts are penalty cards, and the queen of spades is the large danger card. The reference follows a Parlett-style structure, while the opening convention uses the common Hearts rule that the holder of 2♣ opens the first trick.",
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
          "Hearts is played by four players. Barbu teaches from the top of the table, You play from the bottom, and the side seats complete the trick-taking table.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Tutor", value: "Barbu, the King of Cards" }
        ]
      },
      {
        id: "play",
        title: "Play",
        body:
          "A match rotates pass direction: left, right, across, then no pass. The holder of 2♣ opens the first trick with 2♣. Everyone else must follow the led suit when possible. First-trick penalty dumps are blocked when safe cards exist. Hearts cannot be led until a heart has already been played, unless a player has only hearts.",
        facts: [
          { label: "Pass", value: "Left, right, across, hold" },
          { label: "Opening lead", value: "Holder of 2♣ leads 2♣" },
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
          "Each heart is one penalty point and the queen of spades is thirteen penalty points. The trick winner receives all penalty cards in that trick. If one seat captures all 26 points in a hand, that seat shoots the moon and scores 0 while every other seat scores 26. Finish all thirteen tricks, then apply any moon score. If anyone has reached 100 or more points, the match ends and the lowest score wins; otherwise deal another hand.",
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
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The match uses rotating pass directions, 2♣ opening, follow-suit legality, first-trick penalty restrictions, hearts-broken lead restrictions, trick winners, hearts, queen-of-spades scoring, shoot-the-moon scoring, and a 100-point target."
      },
      {
        id: "passing",
        title: "Rotating pass",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The table rotates left, right, across, and hold. The queen of spades is passable by default; locked danger spades belong to a named house-rule variant."
      },
      {
        id: "hearts-broken",
        title: "Hearts-broken lead restriction",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Heart leads are blocked until hearts are broken unless the player has only hearts."
      },
      {
        id: "shooting-moon",
        title: "Shooting the moon",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "If one seat captures all 26 points in a hand, that seat scores 0 and the other seats score 26."
      },
      {
        id: "match-scoring",
        title: "Multi-hand match scoring",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The local match repeats hands until one seat reaches 100 penalty points. Low score wins."
      }
    ],
    variants: [
      {
        id: "black-lady",
        title: "Black Lady / Queen of Spades",
        note:
          "Black Lady is the Hearts style used here: hearts are penalties, and the queen of spades is the large penalty card."
      },
      {
        id: "house-rule-boundary",
        title: "House-Rule Boundary",
        note:
          "Locked danger spades, bonus-jack scoring, alternate pass schedules, and other table customs should be introduced as named Hearts varieties rather than merged into the Black Lady baseline."
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
          "Each player receives thirteen cards. The dealer's last card is turned face up to set trump and remains exposed until the dealer's first play. The deal passes clockwise after each hand. This table uses classic Whist without bidding.",
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
          "A partnership scores one point for each trick above six. Seven tricks scores one point, eight tricks scores two, and so on. A classic game ends when a side reaches five points. Choose a single game or a best-of-three rubber: points reset between games, and the first side to win two games wins the rubber. Honours and stake settlement are not counted at this table.",
        facts: [
          { label: "Six tricks", value: "Book, no points yet" },
          { label: "Seven tricks", value: "1 point" },
          { label: "Game target", value: "First partnership to 5 points" },
          { label: "Rubber", value: "First partnership to win 2 games" }
        ]
      },
      {
        id: "signals",
        title: "Silent Partnership Signals",
        body:
          "Whist communication happens through legal card play, not discussion of concealed cards. Lead low, often fourth highest, from broken length; lead the top of a touching honour sequence. Return partner's suit when useful, including trumps, but reconsider known ruffs or exhausted suits. Second hand low and third hand high are starting habits, not absolute rules: cover a supported honour when useful and avoid overtaking a secure partner winner.",
        facts: [
          { label: "Lead", value: "Show a strong or long suit" },
          { label: "Partner return", value: "Lead partner's suit back when useful" },
          { label: "Basic habits", value: "Second hand low, third hand high" }
        ]
      },
      {
        id: "app-learning",
        title: "Learning Path",
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
        note: "Playable Whist has a visible turned trump, clockwise dealer rotation, thirteen-trick play, five-point games, optional best-of-three rubbers, and local resume. Computer players use public-information heuristics, not expert search."
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
          "Honours, traditional rubber stake settlement, whist drives, Bid Whist, and Knock-out Whist are not part of this table. Club formats vary; the selected baseline is classic Whist, honours off, with optional best-of-three games."
      }
    ]
  },
  {
    id: "spades",
    title: "Spades",
    family: "Whist",
    baseline: "Whist-family partnership game, Spades fixed-trump baseline",
    overview:
      "Spades is a Whist-family partnership table. You and Barbu play against Left and Right, players follow suit when able, spades are always trump, and each side tries to meet its bid while managing nil and bags.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "Win tricks with your partner while treating spades as the permanent trump suit. Each side has a bid, so the goal is to take at least that many books without drifting into unnecessary bags.",
        facts: [
          { label: "Game type", value: "Partnership trick-taking" },
          { label: "Current focus", value: "Bids, books, and bags" }
        ]
      },
      {
        id: "players",
        title: "Players And Partnerships",
        body:
          "The Spades table uses the same partnership seating as Whist. You sit opposite Barbu, and the side seats play as the opposing partnership.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Partner", value: "Barbu" }
        ]
      },
      {
        id: "cards",
        title: "Cards",
        body:
          "Spades uses a standard fifty-two card pack. Aces are high, then kings, queens, jacks, tens, and down to twos. The suit names matter because the led suit controls legal play and spades are the fixed trump suit.",
        facts: [
          { label: "Pack", value: "52 cards" },
          { label: "Cards per player", value: "13" },
          { label: "Rank", value: "A K Q J 10 9 8 7 6 5 4 3 2" }
        ]
      },
      {
        id: "deal-and-bid",
        title: "Deal And Bid",
        body:
          "Each player receives thirteen cards. At the Spades table, you see your hand before bidding, the table estimates the hidden hands, and you may adjust only your own bid. Individual bids combine into partnership totals, while nil remains an individual promise to take no tricks.",
        facts: [
          { label: "Deal", value: "13 cards each" },
          { label: "Player control", value: "You adjust only your own bid" },
          { label: "Hidden seats", value: "Barbu, Left, and Right use hand-based estimates" },
          { label: "Nil", value: "Individual bid to win zero tricks" }
        ]
      },
      {
        id: "play",
        title: "Play",
        body:
          "A player who can follow the led suit must follow. A player who is void may discard or play a spade. Spades cannot be led until spades have been broken, unless the leader has only spades. If any spade is played, the highest spade wins the trick; otherwise the highest card of the led suit wins.",
        facts: [
          { label: "Trump", value: "Spades are always trump" },
          { label: "Legal play", value: "Follow suit when possible" },
          { label: "Spade leads", value: "Blocked until spades are broken unless only spades remain" },
          { label: "Trick winner", value: "Highest spade, otherwise highest led-suit card" }
        ]
      },
      {
        id: "bidding-heuristic",
        title: "Bidding Heuristic",
        body:
          "The starter estimate uses a simple card-club player heuristic: count likely books from aces, protected non-spade kings, high spades, and extra spade length. Nil is suggested only when the hand has no obvious aces, high spades, or protected kings and enough low cards to duck.",
        facts: [
          { label: "Aces", value: "Usually count as likely books" },
          { label: "Kings", value: "Protected kings count more than lonely kings" },
          { label: "Spades", value: "High spades and long spade length add control" },
          { label: "Nil check", value: "No clear winners and limited spade danger" }
        ]
      },
      {
        id: "scoring",
        title: "Scoring",
        body:
          "A made bid scores ten points per bid book plus one point for each overtrick bag. A failed bid scores minus ten points per bid book. A nil bid scores 100 when that player takes no tricks and -100 when they take any trick. Every tenth accumulated bag costs 100 points. After scoring all thirteen tricks, including nil and bag penalties, the match ends if a partnership has at least 500 points. The higher score wins; equal scores at or above 500 require another hand.",
        facts: [
          { label: "Made bid", value: "10 per bid book + bags" },
          { label: "Failed bid", value: "-10 per bid book" },
          { label: "Nil", value: "+100 if made, -100 if missed" },
          { label: "Ten bags", value: "-100 point penalty" },
          { label: "Match target", value: "500 points" }
        ]
      },
      {
        id: "app-learning",
        title: "App Learning Path",
        body:
          "The Spades lessons reuse the shared game-table course flow used by Hearts and Whist. The path starts with the partnership object, then practices follow-suit legality, fixed trump, bidding from a visible hand, nil awareness, and bag management through short scripted decisions before moving into full local play.",
        facts: [
          { label: "First step", value: "Concept: win your books" },
          { label: "Practice", value: "Three short scripted decisions per topic" },
          { label: "Play", value: "Playable local match with resume" }
        ]
      }
    ],
    contracts: [
      {
        id: "starter-spades",
        title: "Spades",
        objective: "Meet your partnership bid with spades fixed as trump.",
        scoring: "Made bids score 10 per bid book plus overtrick bags; failed bids lose 10 per bid book; nil scores +100 or -100; every tenth bag costs 100.",
        lesson: "Start by recognizing when you must follow suit, when a spade can cut the trick, when nil needs protection, and when an extra book becomes a bag."
      }
    ],
    contractRoadmap: [
      {
        id: "spades-reference",
        title: "Reference baseline",
        coreStatus: "Core",
        appStatus: "Defined",
        note: "Spades is defined as a Whist-family partnership game with fixed spades trump, bids, books, and bags."
      },
      {
        id: "spades-learn",
        title: "Learning path",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The path uses the shared course template and teaches object, follow-suit legality, fixed trump, bidding, nil awareness, and bag management."
      },
      {
        id: "spades-play",
        title: "Playable scored hand",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The current implementation reuses the partnership full-hand table, shows your hand before bidding, estimates each hidden bid from that hand, lets the player adjust only their own bid, and scores nil, bags, ten-bag penalties, and matches."
      },
      {
        id: "spades-resume",
        title: "Local match resume",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Local play saves match score, bag count, bids, hand state, and the pre-play bid/table toggle so Spades can resume like Hearts and Whist."
      },
      {
        id: "spades-variants",
        title: "Advanced variants",
        coreStatus: "Variant",
        appStatus: "Planned",
        note: "Blind nil, alternate bag penalties, jokers, partnership bidding conventions, and table-specific scoring should be introduced as named Spades variants."
      }
    ],
    variants: [
      {
        id: "nil-boundary",
        title: "Nil Boundary",
        note:
          "The current table teaches ordinary individual bids, partnership totals, nil, bags, and the ten-bag penalty. The opening bid estimate counts aces, protected kings, high spades, and spade length, then suggests nil only for hands with no clear winners. Blind nil should be introduced as a named variant once the core hand feels settled."
      }
    ]
  },
  {
    id: "bridge",
    title: "Bridge",
    family: "Bridge",
    baseline: "Contract Bridge local table with auction, declarer play, dummy, vulnerability, and duplicate scoring",
    overview:
      "Bridge is a four-player partnership trick-taking game with an auction, a contract, declarer play, an exposed dummy, and two defenders. The Bridge table now plays a local contract hand from a rotating auction into declarer/dummy play or defense.",
    sections: [
      {
        id: "object",
        title: "Object",
        body:
          "One side declares a contract and tries to take enough tricks to make it. The defenders try to defeat that contract. The Bridge table runs a rotating auction, then derives the contract, declarer, dummy, opening leader, vulnerability, and duplicate score.",
        facts: [
          { label: "Game type", value: "Contract partnership trick-taking" },
          { label: "Auction", value: "Rotating calls with pass, double, and redouble" },
          { label: "Declarer target", value: "6 plus contract level" }
        ]
      },
      {
        id: "players",
        title: "Players And Partnerships",
        body:
          "Bridge uses four players in two partnerships. Partners sit opposite one another. Depending on the auction, South may declare with North as dummy, play dummy for North, or defend against an opponent contract.",
        facts: [
          { label: "Players", value: "Four" },
          { label: "Partner", value: "North" },
          { label: "Opponents", value: "East and West" }
        ]
      },
      {
        id: "cards-and-play",
        title: "Cards And Play",
        body:
          "Bridge uses a standard fifty-two card pack with aces high. A player who can follow the led suit must follow. In no trump, the highest card of the led suit wins. In a suit contract, trump can beat the led suit. The trick winner leads next.",
        facts: [
          { label: "Pack", value: "52 cards" },
          { label: "Cards per player", value: "13" },
          { label: "Winner", value: "Highest led-suit card, unless trumped" }
        ]
      },
      {
        id: "dummy",
        title: "The Dummy",
        body:
          "After the opening lead, declarer's partner becomes dummy and their hand is played face up. Declarer chooses cards from both declarer's hand and dummy. The Bridge table keeps dummy hidden until the opening lead, then exposes the correct dummy for the contract.",
        facts: [
          { label: "Dummy", value: "Declarer's partner" },
          { label: "Control", value: "Declarer plays both hands" },
          { label: "Table role", value: "You declare, play dummy, or defend based on the auction" }
        ]
      },
      {
        id: "habits",
        title: "Starter Habits",
        body:
          "The first Bridge lessons focus on club-table habits that carry into real play: count sure winners, establish long suits, lead toward honors for finesses, hold up in no trump when defender communication matters, and lead length on defense.",
        facts: [
          { label: "Declarer", value: "Plan winners before playing fast" },
          { label: "Dummy", value: "Use the exposed hand as a resource" },
          { label: "Defense", value: "Build tricks in a long suit" }
        ]
      },
      {
        id: "app-learning",
        title: "Learning Path",
        body:
          "The Bridge path teaches declarer play, dummy handling, and defense through short decisions, plus a playable local hand with auction, vulnerability, dummy reveal, and duplicate scoring. Stronger bidding systems and duplicate movement remain later layers.",
        facts: [
          { label: "Play", value: "Auction into scored contract hand" },
          { label: "Practice", value: "Short scripted decisions" },
          { label: "Future", value: "Stronger systems and movement" }
        ]
      }
    ],
    contracts: [
      {
        id: "starter-1nt",
        title: "Contract hand",
        objective: "Take at least six plus the contract level as declarer.",
        scoring: "Duplicate-style scoring is active for made contracts, undertricks, overtricks, doubles, redoubles, game, slam, and vulnerability.",
        lesson: "Start by planning sure tricks, using dummy, establishing long suits, and timing stoppers."
      }
    ],
    contractRoadmap: [
      {
        id: "bridge-reference",
        title: "Reference baseline",
        coreStatus: "Core",
        appStatus: "Defined",
        note: "Bridge is defined as contract partnership play with auction, declarer, dummy, defense, and contract scoring layers."
      },
      {
        id: "bridge-learn",
        title: "Learning path",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The current path teaches declarer planning, dummy handling, and defense through short table decisions."
      },
      {
        id: "bridge-play",
        title: "Playable contract hand",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "The Bridge table runs a rotating auction, derives declarer/dummy/opening lead, hides dummy until the opening lead, and scores the completed contract."
      },
      {
        id: "bridge-auction",
        title: "Auction and scoring",
        coreStatus: "Core",
        appStatus: "Playable",
        note: "Pass, double, redouble, vulnerability, duplicate scoring, and simple rule-based opponent calls are active. Strong natural bidding agreements and duplicate movement remain future layers."
      }
    ],
    variants: [
      {
        id: "starter-boundary",
        title: "Current Boundary",
        note:
          "The current table is playable club-style contract Bridge for local practice, but the bidding and cardplay AI are still simple heuristics rather than a full partnership system."
      }
    ]
  }
];
