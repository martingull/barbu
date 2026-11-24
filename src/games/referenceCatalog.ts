import { ginRummyReference } from "./ginRummyReference";
import { canastaReference } from "./canastaReference";
import { euchreReference } from "./euchreReference";

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
  baselineLabel?: string;
  overview: string;
  sections: ReferenceSection[];
  contracts: ReferenceContract[];
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
    variants: [
      {
        id: "training-table",
        title: "Seven-Contract Training Table",
        note:
          "Play follows a fixed sequence of seven contracts. Hearts are trump for Hearts Trumps, and Domino starts from sevens. This training format does not use dealer-selected contracts, doubling, or full-table settlement."
      },
      {
        id: "learning-table",
        title: "Teaching Variety",
        note:
          "Short card decisions use the same contract rules as full hands, with fewer cards so you can focus on one idea at a time."
      },
      {
        id: "table-varieties",
        title: "Table Customs",
        note:
          "Barbu tables can differ in contract choice, trump selection, scoring, and doubling agreements. Agree on the rules before playing at a new table."
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
          "A match rotates pass direction: left, right, across, then no pass. The queen of spades may be passed. The holder of 2♣ opens the first trick with 2♣. Everyone else must follow the led suit when possible. First-trick penalty dumps are blocked when safe cards exist. Hearts cannot be led until a heart has already been played, unless a player has only hearts.",
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
    variants: [
      {
        id: "black-lady",
        title: "Black Lady / Queen of Spades",
        note:
          "Black Lady is the Hearts style used here: hearts are penalties, and the queen of spades is the large penalty card."
      },
      {
        id: "house-rule-boundary",
        title: "House Rules",
        note:
          "Some tables restrict passing high spades, award a bonus for the jack of diamonds, or use a different pass schedule. This table allows any card to be passed, counts only hearts and the queen of spades as penalties, and rotates left, right, across, and hold."
      }
    ]
  },
  {
    id: "whist",
    title: "Whist",
    family: "Whist",
    baseline: "David Parlett structure, classic partnership Whist with Pagat cross-check",
    overview:
      "This table teaches classic four-player partnership Whist, without bidding or honours scoring. The dealer's last card sets trump. Partners sit opposite, follow suit when able and score tricks above six. A club's whist-drive format may use different trump and scoring arrangements.",
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
        id: "club-formats",
        title: "Before Playing At A Club",
        body:
          "Ask how trumps are chosen, how many deals are played and how scores are recorded. A whist drive may use scheduled trumps, a fixed number of deals and movement between tables, rather than our first-to-five game. Bid Whist and Solo Whist are different games, not just different scores. Learn the partnership and follow-suit habits here, then check the club's format before sitting down.",
        facts: [
          { label: "This table", value: "Classic partnership Whist; no bidding; honours off" },
          { label: "Ask the organiser", value: "Trump schedule, deals, scoring and table movement" },
          { label: "At the table", value: "Communicate through cards, not advice about concealed hands" }
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
          "Start by identifying the winning card, which partnership takes the trick and who leads next. Then practise following suit, trump or discard, supporting partner, opening leads, returning a suit and scoring odd tricks. A guided thirteen-trick hand brings those habits together before independent play.",
        facts: [
          { label: "First step", value: "Concept: win tricks together" },
          { label: "Practice", value: "Compact Whist habits" },
          { label: "Play", value: "Single game or best-of-three rubber" }
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
    baseline: "Partnership Spades, Pagat-based nil and bags scoring",
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
          { label: "Key ideas", value: "Bids, books, and bags" }
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
          "Deal clockwise, thirteen cards each. The dealer moves clockwise after each hand; the player to the dealer's left leads first. At this table, you see your hand before bidding and may adjust only your own bid. The other three bids are hand-based estimates shown together, rather than a turn-by-turn club auction. Positive bids combine into partnership totals; nil is an individual promise to take no tricks.",
        facts: [
          { label: "Deal", value: "13 cards each" },
          { label: "Opening lead", value: "Player to dealer's left" },
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
          "A made bid scores ten points per bid book plus one point for each overtrick bag. A failed bid scores minus ten points per bid book. Nil scores +100 for no tricks and -100 otherwise. Under this table's Pagat-based rule, failed-nil tricks cannot fulfil the partner's bid: they count as bags, worth one point each, even if the partner is set. Every tenth accumulated bag costs 100 points. After all thirteen tricks are scored, the match ends if a partnership has at least 500 points. The higher score wins; equal scores at or above 500 require another hand.",
        facts: [
          { label: "Made bid", value: "10 per bid book + bags" },
          { label: "Failed bid", value: "-10 per bid book" },
          { label: "Nil", value: "+100 if made, -100 if missed" },
          { label: "Failed-nil tricks", value: "Bags, not partner's bid books" },
          { label: "Ten bags", value: "-100 point penalty" },
          { label: "Match target", value: "500 points" }
        ]
      },
      {
        id: "app-learning",
        title: "Learning Path",
        body:
          "Identify a book's winner, partnership and next leader. Practise following suit, trumping and choosing legal spade leads, then estimate bids from thirteen-card hands. Learn to play your own nil, protect partner and avoid bags. Score made and missed bids, successful and failed nil, and the ten-bag penalty. Each topic has three short decisions, with a fresh example after a mistake, before a guided hand or full match.",
        facts: [
          { label: "First step", value: "Concept: win your books" },
          { label: "Practice", value: "Three short scripted decisions per topic" },
          { label: "Topics", value: "Nine, including nil play, legal leads and scoring" },
          { label: "Play", value: "Partnership match to 500 points" }
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
    variants: [
      {
        id: "blind-nil",
        title: "Blind Nil",
        note:
          "Blind nil is a bid to take no tricks made before looking at the hand. This table uses ordinary nil: you see your cards before choosing your bid."
      }
    ]
  },
  {
    id: "bridge",
    title: "Bridge",
    family: "Bridge",
    baseline: "Contract Bridge local table with auction, declarer play, dummy, vulnerability, and duplicate scoring",
    overview:
      "Bridge is a four-player partnership trick-taking game with an auction, a contract, declarer play, an exposed dummy, and two defenders. Bid for a contract, then play as declarer with dummy or defend with your partner.",
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
          "The Bridge path teaches bidding, declarer play, dummy handling, and defense through short decisions. Choose Standard American Foundation or Acol Foundation before learning or starting a board. Play uses those agreements, the standard sixteen-board dealer and vulnerability cycle, and duplicate contract scores. Passed-out boards score zero and advance the session. Session totals add the contract points from each board; they are not matchpoints or IMPs.",
        facts: [
          { label: "Play", value: "Auction into scored contract hand" },
          { label: "Practice", value: "Short scripted decisions" },
          { label: "Session score", value: "Total contract points" }
        ]
      },
      {
        id: "bidding-agreements",
        title: "Earlier Saved Boards: Barbu Natural",
        body:
          "Open a five-card major with 13+ high-card points; otherwise choose the better minor, preferring clubs with three cards in each minor. Balanced hands open 1NT with 15-17 or 2NT with 20-21. Strong 2 clubs shows 22+ and asks for 2 diamonds waiting. A subsequent 2NT rebid shows 22-24 and may be passed; a suit rebid keeps the partnership moving toward game. Weak two openings in diamonds, hearts, or spades show 5-11 points and six cards.",
        facts: [
          { label: "Over 1NT", value: "2NT invites with 8-9; 3NT shows 10+. Two of a major is a natural sign-off, not a transfer." },
          { label: "Major raises", value: "Three-card support: raise to two with 6-9, three with 10-12, or game with 13+." },
          { label: "New suits", value: "One-level responses show 6+ points and four cards; two-level responses show 10+ and length." },
          { label: "Takeout", value: "Low-level doubles of suit openings need opening strength, shortness in the bid suit, and support for unbid suits." },
          { label: "Not included", value: "Stayman, transfers, Blackwood, and a full competitive convention system. Barbu Natural is not SAYC." }
        ]
      },
      {
        id: "american-agreements",
        title: "Standard American Foundation Agreements",
        body:
          "SAYC-based beginner agreements, not full SAYC or 2/1 Game Forcing. Open five-card majors or the better minor with opening strength; balanced notrump openings are 15-17 at 1NT, 20-21 at 2NT and 25-27 at 3NT. Stayman and Jacoby major-suit transfers are used after 1NT and 2NT, including the balanced 2NT rebid after strong 2 clubs. All four seats use the same profile. Check your club's system card before playing with a real partner.",
        facts: [
          { label: "Stayman", value: "2♣ over 1NT asks for a four-card major, here with 8+ HCP. Reply 2♦ without a major, 2♥ with hearts (possibly spades too), otherwise 2♠." },
          { label: "Transfers", value: "2♦ asks for hearts; 2♥ asks for spades. Shows five cards, not strength. After acceptance, pass weak hands, invite with 8-9, choose game with 10+. With exactly five trumps use notrump to describe strength; opener judges the fit." },
          { label: "After 2NT", value: "3♣ Stayman, 3♦ transfer to hearts, 3♥ transfer to spades. These teaching decisions use game-going strength." },
          { label: "Major support", value: "Balanced three-card support: simple raise 6-10, limit raise 11-12, game 13+ HCP. With four-card support and 13+, unpassed responder uses Jacoby 2NT, game forcing. Shape can change real-table judgment." },
          { label: "Balanced rebids", value: "After opening a suit and hearing a one-level response: 1NT 12-14 or 2NT 18-19, unless a major fit can be shown." },
          { label: "Other responses", value: "Strong 2♣ allows 2♦ waiting or an 8+ positive response. 2NT over a weak two asks for a feature; over a minor opening it shows 13-15 balanced and forces game. Two-over-one responses require another bid, not an automatic game force." },
          { label: "Scope", value: "No minor-suit transfer system, ace-asking, quantitative slam investigation, negative doubles or complete competitive continuations. This is not the complete published SAYC system. HCP guides and computer continuations remain simplified." }
        ]
      },
      {
        id: "acol-agreements",
        title: "Acol Foundation Agreements",
        body:
          "This beginner Acol profile uses four-card majors, a balanced 12-14 1NT and 12+ HCP suit openings. Open the longest suit; with two four-card majors prefer hearts. With 4-4-4-1 shape, open hearts with a singleton club, clubs with a singleton diamond, otherwise diamonds. Balanced major-support examples need four trumps. Acol agreements vary between clubs: check your partner's system card.",
        facts: [
          { label: "Over 1NT", value: "Without a four-card major: pass these balanced 0-10 HCP hands, invite with 11-12, bid 3NT with 13-19. Opener accepts invitations with 14." },
          { label: "Stayman", value: "Uncontested 1NT-2♣ asks for a major, here with 11+ HCP. Reply 2♦ without a four-card major, 2♥ with hearts (possibly spades too), otherwise 2♠ with spades." },
          { label: "Weak takeout", value: "2♦/2♥/2♠ over 1NT are natural weak five-card or longer suits, not transfers. Opener passes." },
          { label: "Balanced rebids", value: "After a one-level new-suit response: 1NT shows 15-16, 2NT 17-18, 3NT 19, unless supporting partner's major." },
          { label: "Stronger openings", value: "2NT 20-22 balanced; 2♣ 23+ with a simplified 2♦ waiting response. Weak two openings in ♦/♥/♠ show 6-10 HCP and six cards." },
          { label: "Scope", value: "A teaching profile, not the entire Standard English system: no weak Stayman, transfers, Rule of 20 openings, slam investigation or complete competitive conventions. Suit raises use simple HCP guides rather than distributional evaluation." }
        ]
      }
    ],
    contracts: [
      {
        id: "starter-1nt",
        title: "Contract hand",
        objective: "Take at least six plus the contract level as declarer.",
        scoring: "Duplicate scoring accounts for made contracts, undertricks, overtricks, doubles, redoubles, game, slam, and vulnerability.",
        lesson: "Start by planning sure tricks, using dummy, establishing long suits, and timing stoppers."
      }
    ],
    variants: [
      {
        id: "local-contract-play",
        title: "Local Contract Play",
        note:
          "Play individual boards against computer opponents using Standard American Foundation or Acol Foundation agreements. Earlier saved boards retain Barbu Natural. Each board earns its duplicate contract score. Matchpoints and IMPs compare results from other tables; this local session does not make those comparisons."
      }
    ]
  },
  ginRummyReference,
  canastaReference,
  euchreReference
];
