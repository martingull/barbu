import type { CourseContent } from "../courseTypes";

export const spadesCourses: CourseContent[] = [
  {
    id: "spades-object",
    game: "spades",
    pathStepId: "spades-object",
    practiceTarget: { kind: "practice", game: "spades", action: "object" },
    contract: "Spades",
    title: "Win your books",
    concept: {
      heading: "Spades is partnership trick-taking with a promised target.",
      body:
        "You and Barbu bid as partners, Left and Right bid as partners, and each side tries to win at least the number of books it promised. Every trick is one book.",
      points: [
        { marker: "1", text: "Read the table as You + Barbu against Left + Right." },
        { marker: "2", text: "Count books against the partnership bid, not just your own cards." },
        { marker: "3", text: "Nil is a separate promise: the nil bidder must win zero tricks." }
      ]
    },
    example: {
      heading: "Barbu wins a club trick for your side.",
      body:
        "Left led clubs and Barbu's king is highest. No spade was played. Barbu takes one book for your partnership and leads next. If your side bid five and this is its first bid book, four more are needed.",
      sequence: [
        { label: "Sides", text: "You and Barbu share one score." },
        { label: "Bid", text: "Five books means your side needs at least five tricks." },
        { label: "Plan", text: "Win needed tricks, then stop feeding extras when you can." }
      ],
      ariaLabel: "Spades object example table",
      tableCards: [
        { seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Tutor", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
        { seat: "Right", card: { id: "4C", rank: "4", suit: "C", label: "4C" } },
        { seat: "You", card: { id: "3C", rank: "3", suit: "C", label: "3C" } }
      ],
      pendingBySeat: {}
    },
    review: {
      heading: "The bid gives every Spades hand its plan.",
      body:
        "You identified who won, which partnership took the book, and who leads next. Use those facts to track the partnership target.",
      points: [
        { marker: "OK", text: "Each trick is one book." },
        { marker: "OK", text: "Partners combine tricks for the side bid." },
        { marker: "OK", text: "Nil means the bidder must avoid every trick." }
      ]
    }
  },
  {
    id: "spades-follow-suit",
    game: "spades",
    pathStepId: "spades-follow-suit",
    practiceTarget: { kind: "practice", game: "spades", action: "follow" },
    contract: "Spades",
    title: "Follow suit first",
    concept: {
      heading: "Spades are trump, but the led suit still controls legal play.",
      body:
        "When a suit is led, you must play that suit if you have it. On a plain-suit lead, a spade is only available when you are void. If spades are led, you must follow spades when possible.",
      points: [
        { marker: "1", text: "Identify the first card led to the trick." },
        { marker: "2", text: "Check whether your hand contains that suit." },
        { marker: "3", text: "Only think about trump after you know you are void." }
      ]
    },
    example: {
      heading: "Left leads clubs and you still hold clubs.",
      body:
        "Even with a tempting spade in hand, clubs were led and you can follow clubs. The legal Spades decision starts with the led suit.",
      sequence: [
        { label: "Lead", text: "Left plays 10C, so clubs are led." },
        { label: "Then", text: "Barbu follows with 7C." },
        { label: "Your turn", text: "You have clubs, so you must follow clubs." }
      ],
      ariaLabel: "Spades follow suit example table",
      tableCards: [
        { seat: "Left", card: { id: "10C", rank: "10", suit: "C", label: "10C" } },
        { seat: "Tutor", card: { id: "7C", rank: "7", suit: "C", label: "7C" } },
        { seat: "Right", card: { id: "3C", rank: "3", suit: "C", label: "3C" } }
      ],
      pendingBySeat: { You: "follow clubs" }
    },
    review: {
      heading: "Following suit keeps trump honest.",
      body:
        "You practiced checking legality before tactics. That habit prevents illegal spades and makes every later trump decision clearer.",
      points: [
        { marker: "OK", text: "The first card sets the led suit." },
        { marker: "OK", text: "You must follow suit when you can." },
        { marker: "OK", text: "Spades matter after you are void." }
      ]
    }
  },
  {
    id: "spades-trump",
    game: "spades",
    pathStepId: "spades-trump",
    practiceTarget: { kind: "practice", game: "spades", action: "trump" },
    contract: "Spades",
    title: "Spades always trump",
    concept: {
      heading: "A low spade can beat every plain-suit card.",
      body:
        "Spades are fixed trump for the whole hand. When you cannot follow the led suit, a spade can cut the trick and beat all clubs, diamonds, and hearts.",
      points: [
        { marker: "1", text: "Confirm you are void in the led suit." },
        { marker: "2", text: "Ask whether winning this trick helps the bid or protects nil." },
        { marker: "3", text: "Save spades when partner already has the trick under control." }
      ]
    },
    example: {
      heading: "Hearts were led and Right is winning with AH.",
      body:
        "You are void in hearts. Playing a spade cuts the trick; discarding a plain suit lets Right keep it. The right choice depends on the bid target.",
      sequence: [
        { label: "Lead", text: "Left plays 9H and Right plays AH." },
        { label: "Void", text: "You have no hearts." },
        { label: "Choice", text: "A spade wins; a plain-suit discard does not." }
      ],
      ariaLabel: "Spades trump example table",
      tableCards: [
        { seat: "Left", card: { id: "9H", rank: "9", suit: "H", label: "9H" } },
        { seat: "Tutor", card: { id: "4H", rank: "4", suit: "H", label: "4H" } },
        { seat: "Right", card: { id: "AH", rank: "A", suit: "H", label: "AH" } }
      ],
      pendingBySeat: { You: "cut or discard" }
    },
    review: {
      heading: "Trump is a tool for the contract, not an automatic play.",
      body:
        "You practiced seeing when a spade changes the winner and when saving it keeps your side flexible for later tricks.",
      points: [
        { marker: "OK", text: "Any spade beats a non-spade." },
        { marker: "OK", text: "You can trump only when you cannot follow suit." },
        { marker: "OK", text: "Spend trump for the bid, partner, or nil defense." }
      ]
    }
  },
  {
    id: "spades-bidding",
    game: "spades",
    pathStepId: "spades-books",
    practiceTarget: { kind: "practice", game: "spades", action: "bid" },
    contract: "Spades",
    title: "Count books",
    concept: {
      heading: "Bid from likely winners, then check whether nil is realistic.",
      body:
        "A simple card-club estimate starts with high cards and spade length: aces, protected kings, high spades, and long spade control. Nil needs the opposite: few forced winners and enough low cards to duck.",
      points: [
        { marker: "A", text: "Count most aces as likely books." },
        { marker: "K", text: "Count protected kings more than lonely kings." },
        { marker: "S", text: "Add strength for high spades and long spade suits." }
      ]
    },
    example: {
      heading: "An excerpt: two high spades, an ace and a protected king.",
      body:
        "A♠ and K♠, A♥, and K♦ protected by 8♦ suggest four likely books. Check the rest of your hand for extra spade length and other winners before deciding. This is not a nil shape.",
      sequence: [
        { label: "Sure", text: "Aces usually point to books." },
        { label: "Spades", text: "High spades can win late control." },
        { label: "Nil check", text: "Too many winners means do not bid nil." }
      ],
      ariaLabel: "Spades bidding example table",
      tableCards: [
        { seat: "You", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
        { seat: "You", card: { id: "KS", rank: "K", suit: "S", label: "KS" } },
        { seat: "You", card: { id: "AH", rank: "A", suit: "H", label: "AH" } },
        { seat: "You", card: { id: "KD", rank: "K", suit: "D", label: "KD" } },
        { seat: "You", card: { id: "8D", rank: "8", suit: "D", label: "8D" } }
      ],
      pendingBySeat: {}
    },
    review: {
      heading: "A practical bid is an estimate, not a promise of perfect control.",
      body:
        "You estimated bids from full thirteen-card hands and considered nil separately. The starter estimate is a practical guideline, not a guaranteed trick count.",
      points: [
        { marker: "OK", text: "Aces and high spades are the first count." },
        { marker: "OK", text: "Protected kings can add books." },
        { marker: "OK", text: "Nil asks whether you can avoid every trick." }
      ]
    }
  },
  {
    id: "spades-bags",
    game: "spades",
    pathStepId: "spades-bags",
    practiceTarget: { kind: "practice", game: "spades", action: "bags" },
    contract: "Spades",
    title: "Avoid extra bags",
    concept: {
      heading: "Making the bid is good; taking too many extras creates bag pressure.",
      body:
        "Extra books still add small points, but they also become bags. When a side reaches ten bags, the score takes a penalty, so good Spades play knows when to stop winning.",
      points: [
        { marker: "1", text: "Track how many books your side already has." },
        { marker: "2", text: "After making the bid, avoid unnecessary winners." },
        { marker: "3", text: "Use safe discards when partner or opponents can take the trick." }
      ]
    },
    example: {
      heading: "Your side bid five and already has five books.",
      body:
        "Another trick is not free. It may be right to duck a winner now, especially if your side is carrying bags from earlier hands.",
      sequence: [
        { label: "Target", text: "Bid five, won five." },
        { label: "Risk", text: "The next extra book becomes a bag." },
        { label: "Plan", text: "Let safe tricks go when the contract is already made." }
      ],
      ariaLabel: "Spades bags example table",
      tableCards: [
        { seat: "Left", card: { id: "8D", rank: "8", suit: "D", label: "8D" } },
        { seat: "Tutor", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } },
        { seat: "Right", card: { id: "AD", rank: "A", suit: "D", label: "AD" } }
      ],
      pendingBySeat: { You: "duck if safe" }
    },
    review: {
      heading: "Bags turn extra tricks into a long-term scoring problem.",
      body:
        "You practiced changing gears after the bid is safe. Strong club players make the contract, then avoid handing themselves future penalties.",
      points: [
        { marker: "OK", text: "Extra books are bags." },
        { marker: "OK", text: "Ten bags trigger a score penalty." },
        { marker: "OK", text: "After the bid, ducking can be the best play." }
      ]
    }
  },
  {
    id: "spades-scoring", game: "spades", pathStepId: "spades-scoring",
    practiceTarget: { kind: "practice", game: "spades", action: "score" }, contract: "Spades", title: "Score a hand",
    concept: {
      heading: "Keep the bid, nil and bags separate.",
      body: "A made contract earns ten points per bid book; a failed contract loses ten per bid book. Bags add one point each, but ten accumulated bags cost 100 points.",
      points: [
        { marker: "Bid", text: "Add partners' positive bids. Only tricks taken by non-nil bidders count toward this target." },
        { marker: "Nil", text: "Nil earns +100 for zero tricks or -100 for any trick. Failed-nil tricks become bags even when partner misses the bid." },
        { marker: "Bags", text: "Add this hand's bags to the carried total. Subtract 100 per ten bags and carry the remainder. Play to 500; a tie at the target continues." }
      ]
    },
    example: {
      heading: "A failed nil cannot rescue partner's contract.",
      body: "You bid nil and take one trick. Barbu bids four but takes only three. The contract loses 40, nil loses 100, and your nil trick adds one bag point: -139 for the hand before any ten-bag penalty.",
      sequence: [{ label: "Separate", text: "Barbu's three books do not meet the bid of four. Your nil trick is a bag, not the fourth bid book." }],
      ariaLabel: "Spades scoring example", tableCards: [], pendingBySeat: {}
    },
    review: {
      heading: "Check each part of the hand score.",
      body: "Score the contract, add bags and nil, then subtract any ten-bag penalty. Nil tricks never fulfil partner's bid.",
      points: [{ marker: "OK", text: "A made bid is ten points per book; a failed bid loses the same amount." },
        { marker: "OK", text: "Nil is scored separately from the contract." }, { marker: "OK", text: "Keep the remaining bags for the next hand." }]
    }
  }
];
