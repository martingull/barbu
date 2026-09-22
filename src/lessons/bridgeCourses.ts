import type { CourseContent } from "../courseContent";

export const bridgeCourses: CourseContent[] = [
  {
    id: "bridge-bidding", game: "bridge", pathStepId: "bridge-bidding",
    practiceTarget: { kind: "practice", game: "bridge", action: "bidding" },
    contract: "Bridge", title: "Opening bids",
    concept: {
      heading: "Describe your hand to partner.",
      body: "An opening bid describes strength and shape, not a promise to win that many tricks alone. Barbu uses a basic natural bidding system.",
      points: [
        { marker: "Count", text: "Ace = 4, king = 3, queen = 2, jack = 1 high-card points." },
        { marker: "Shape", text: "Open 1NT with 15-17 points and a balanced hand." },
        { marker: "Suit", text: "With opening strength, prefer a five-card major. Weak hands can pass." }
      ]
    },
    example: {
      heading: "A balanced 16-point hand opens 1NT.",
      body: "The honors below total 16 points. With the other nine cards giving a balanced shape, 1NT tells partner both the strength range and the shape.",
      ariaLabel: "Bridge bidding example", pendingBySeat: {},
      tableCards: [
        { seat: "You", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
        { seat: "You", card: { id: "AH", rank: "A", suit: "H", label: "AH" } },
        { seat: "You", card: { id: "AD", rank: "A", suit: "D", label: "AD" } },
        { seat: "You", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }
      ],
      sequence: [
        { label: "Strength", text: "Four aces give 16 high-card points." },
        { label: "Shape", text: "A 4-3-3-3 hand is balanced." },
        { label: "Call", text: "Open 1NT. Partner chooses how to continue from their own hand." }
      ]
    },
    review: {
      heading: "Check strength and shape together.",
      body: "The opening bid starts a conversation through legal calls. It does not reveal your cards or guarantee the final contract.",
      points: [
        { marker: "Points", text: "Count your honors before choosing an opening." },
        { marker: "Shape", text: "Distinguish a balanced hand from a long-suit hand." },
        { marker: "Pass", text: "Passing a weak hand is a useful, legal call." }
      ]
    }
  },
  {
    id: "bridge-declarer", game: "bridge", pathStepId: "bridge-declarer",
    practiceTarget: { kind: "practice", game: "bridge", action: "declarer" },
    contract: "Bridge", title: "Declarer play",
    concept: {
      heading: "Make a plan for both hands.",
      body: "Declarer chooses cards from their own hand and dummy. The contract sets the target: a level-one contract needs seven tricks, a level-two contract needs eight.",
      points: [
        { marker: "Target", text: "Add six to the contract level to find the tricks needed." },
        { marker: "Count", text: "Count sure winners before spending high cards." },
        { marker: "Plan", text: "Use long suits, finesses, and entries to develop extra tricks." }
      ]
    },
    example: {
      heading: "Lead toward your ace and queen.",
      body: "North dummy leads a small club. East follows low. South can try the queen, hoping East holds the king, while keeping the ace for later.",
      ariaLabel: "Bridge declarer example", pendingBySeat: { You: "South Declarer", Left: "West Defender" },
      tableCards: [
        { seat: "Tutor", card: { id: "3C", rank: "3", suit: "C", label: "3C" } },
        { seat: "Right", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }
      ],
      sequence: [
        { label: "Lead", text: "North leads toward South's ace-queen holding." },
        { label: "Try", text: "Play the queen after East follows low." },
        { label: "Risk", text: "West can win if West holds the king. A finesse is not guaranteed." }
      ]
    },
    review: {
      heading: "Winning this trick is only part of the plan.",
      body: "Think about how today's play creates or protects later winners. Sometimes conceding a trick is necessary to establish a suit.",
      points: [
        { marker: "Target", text: "Keep the contract's total trick requirement in mind." },
        { marker: "Entries", text: "Keep a way to reach winners in the other hand." },
        { marker: "Timing", text: "Do not cash every high card just because it can win now." }
      ]
    }
  },
  {
    id: "bridge-dummy", game: "bridge", pathStepId: "bridge-dummy",
    practiceTarget: { kind: "practice", game: "bridge", action: "declarer" },
    contract: "Bridge", title: "The Dummy",
    concept: {
      heading: "One player directs two separate hands.",
      body: "After the opening lead, declarer's partner exposes their cards as dummy. Declarer chooses dummy's plays, but the two hands remain separate.",
      points: [
        { marker: "Reveal", text: "Dummy becomes visible only after the opening lead." },
        { marker: "Turn", text: "Play from whichever hand is next in clockwise order." },
        { marker: "Suit", text: "The hand playing must follow suit if that hand can." }
      ]
    },
    example: {
      heading: "West leads. North dummy plays next.",
      body: "South is declarer and North is dummy. After West's opening lead, South selects a card from North's hand, not from South's own cards.",
      ariaLabel: "Bridge dummy example", pendingBySeat: { Tutor: "North Dummy", Right: "East Defender", You: "South Declarer" },
      tableCards: [{ seat: "Left", card: { id: "KH", rank: "K", suit: "H", label: "KH" } }],
      sequence: [
        { label: "West", text: "The opening lead is the king of hearts." },
        { label: "North", text: "Dummy follows with a heart if North has one." },
        { label: "South", text: "Declarer waits for East before playing from South's hand." }
      ]
    },
    review: {
      heading: "Watch the active hand, not just the player.",
      body: "Dummy is not an extra opponent. Declarer coordinates both partnership hands while respecting each hand's own cards and turn.",
      points: [
        { marker: "Separate", text: "A heart in South does not require North to follow hearts." },
        { marker: "Control", text: "Declarer chooses dummy's cards." },
        { marker: "Entries", text: "Plan how to move the lead between the two hands." }
      ]
    }
  },
  {
    id: "bridge-defense", game: "bridge", pathStepId: "bridge-defense",
    practiceTarget: { kind: "practice", game: "bridge", action: "defense" },
    contract: "Bridge", title: "Defense",
    concept: {
      heading: "Defend as a partnership.",
      body: "The two defenders try to stop declarer reaching the contract target. Each defender sees their own hand and dummy, but not partner's cards.",
      points: [
        { marker: "Lead", text: "Against no trump, consider building tricks in a long suit." },
        { marker: "Partner", text: "Use the auction and played cards to read partner's plan." },
        { marker: "Save", text: "Do not spend a high card unnecessarily over partner's winner." }
      ]
    },
    example: {
      heading: "Partner leads low. Dummy plays the eight.",
      body: "North is your partner and East is dummy. From king-jack-three of spades, South can play the king to make declarer spend the ace.",
      ariaLabel: "Bridge defense example", pendingBySeat: { You: "South Defender", Left: "West Declarer" },
      tableCards: [
        { seat: "Tutor", card: { id: "4S", rank: "4", suit: "S", label: "4S" } },
        { seat: "Right", card: { id: "8S", rank: "8", suit: "S", label: "8S" } }
      ],
      sequence: [
        { label: "Partner", text: "North leads a low spade." },
        { label: "Dummy", text: "East's eight is currently winning." },
        { label: "South", text: "Play the king rather than letting declarer win cheaply with the queen." }
      ]
    },
    review: {
      heading: "Build tricks together without wasting winners.",
      body: "Defensive habits depend on the position. Third hand often plays high, but a high card is not needed when partner's card is already certain to win.",
      points: [
        { marker: "Observe", text: "Track the led suit, dummy's cards, and the current winner." },
        { marker: "Support", text: "Help develop partner's suit when the position calls for it." },
        { marker: "Preserve", text: "Keep high cards that can take useful later tricks." }
      ]
    }
  }
];
