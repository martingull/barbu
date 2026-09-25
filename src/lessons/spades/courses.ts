import type { CourseContent } from "../courseTypes";

export const spadesCourses: CourseContent[] = [
  {
    id: "spades-object",
    game: "spades",
    pathStepId: "spades-object",
    practiceTarget: { kind: "practice", game: "spades", action: "follow" },
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
      heading: "Your side bid five books and the hand is just starting.",
      body:
        "The first job is not to win every trick. The first job is to see the target, protect any nil, and help the partnership reach its bid without drifting into extra bags.",
      sequence: [
        { label: "Sides", text: "You and Barbu share one score." },
        { label: "Bid", text: "Five books means your side needs at least five tricks." },
        { label: "Plan", text: "Win needed tricks, then stop feeding extras when you can." }
      ],
      ariaLabel: "Spades object example table",
      tableCards: [
        { seat: "You", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
        { seat: "Tutor", card: { id: "KH", rank: "K", suit: "H", label: "KH" } },
        { seat: "Right", card: { id: "9H", rank: "9", suit: "H", label: "9H" } }
      ],
      pendingBySeat: { Left: "follows" }
    },
    review: {
      heading: "The bid gives every Spades hand its plan.",
      body:
        "You practiced treating the hand as a partnership target. That target explains when to win, when to protect partner, and when an extra trick becomes a bag.",
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
        "When a suit is led, you must play that suit if you have it. A spade is only available when you are void in the led suit.",
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
      heading: "Your hand has AS, KS, AH, and a protected KD.",
      body:
        "That is not a nil shape. A beginner estimate would count AS and AH, give credit for KS, and consider KD safer if diamonds are not short.",
      sequence: [
        { label: "Sure", text: "Aces usually point to books." },
        { label: "Spades", text: "High spades can win late control." },
        { label: "Nil check", text: "Too many winners means do not bid nil." }
      ],
      ariaLabel: "Spades bidding example table",
      tableCards: [
        { seat: "You", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
        { seat: "Tutor", card: { id: "KD", rank: "K", suit: "D", label: "KD" } },
        { seat: "Left", card: { id: "4C", rank: "4", suit: "C", label: "4C" } },
        { seat: "Right", card: { id: "8H", rank: "8", suit: "H", label: "8H" } }
      ],
      pendingBySeat: { You: "estimate bid" }
    },
    review: {
      heading: "A practical bid is an estimate, not a promise of perfect control.",
      body:
        "You practiced counting likely winners and ruling out nil when your hand contains too many obvious tricks.",
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
  }
];
