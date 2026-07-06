import type { Seat, TableCard } from "./lessonTypes";

export type CourseStage = "concept" | "example" | "review";

type CoursePanel = {
  heading: string;
  body: string;
};

type CoursePoint = {
  marker: string;
  text: string;
};

type CourseSequenceStep = {
  label: string;
  text: string;
};

export type CourseContent = {
  id: string;
  pathStepId: string;
  lessonId: string;
  contract: string;
  title: string;
  concept: CoursePanel & { points: CoursePoint[] };
  example: CoursePanel & {
    sequence: CourseSequenceStep[];
    ariaLabel: string;
    tableCards: TableCard[];
    pendingBySeat: Partial<Record<Seat, string>>;
  };
  review: CoursePanel & { points: CoursePoint[] };
};

export const courseCatalog: CourseContent[] = [
  {
    id: "no-hearts",
    pathStepId: "meet-contract",
    lessonId: "barbu-no-hearts",
    contract: "No Hearts",
    title: "Meet the contract",
    concept: {
      heading: "In No Hearts, hearts are cargo you do not want to collect.",
      body:
        "A heart only hurts the player who wins the trick containing it. Your first job is to follow suit legally while steering heart tricks toward someone else.",
      points: [
        { marker: "1", text: "Follow the led suit when you can." },
        { marker: "2", text: "Do not panic when someone else throws a heart." },
        { marker: "3", text: "Ask who is winning before choosing your card." }
      ]
    },
    example: {
      heading: "Barbu leads clubs. Right discards a heart into that trick.",
      body:
        "The first card in a trick sets the suit everyone must follow when they can. Right did not open hearts here; Right failed to follow clubs and threw a heart away.",
      sequence: [
        { label: "Lead", text: "Barbu plays 9C, so clubs are the led suit." },
        { label: "Then", text: "Right has no club and discards 4H." },
        { label: "Your turn", text: "You still have clubs, so you must follow clubs." }
      ],
      ariaLabel: "No Hearts example table",
      tableCards: [
        { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Right", card: { id: "4H", rank: "4", suit: "H", label: "4H" } },
        { seat: "Left", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }
      ],
      pendingBySeat: { You: "follow clubs" }
    },
    review: {
      heading: "No Hearts starts with one habit: locate the trick winner before worrying about the heart.",
      body:
        "You followed suit, watched who controlled the trick, and avoided taking the heart yourself. That is the first Barbu table habit.",
      points: [
        { marker: "OK", text: "Hearts score against the trick winner." },
        { marker: "OK", text: "Following suit can still be safe." },
        { marker: "OK", text: "Winning a clean trick is different from winning a heart trick." }
      ]
    }
  },
  {
    id: "no-queens",
    pathStepId: "spot-danger",
    lessonId: "barbu-no-queens",
    contract: "No Queens",
    title: "Spot the danger",
    concept: {
      heading: "In No Queens, queens are only dangerous when they land in a trick you win.",
      body:
        "A queen sitting on the table is not automatically your penalty. Before you play, identify the current winner and whether your card would overtake the trick.",
      points: [
        { marker: "1", text: "Follow suit first." },
        { marker: "2", text: "Find the highest card in the led suit." },
        { marker: "3", text: "Avoid becoming the player who captures the queen." }
      ]
    },
    example: {
      heading: "Barbu leads diamonds. Right follows with QD, loading the trick.",
      body:
        "The first card sets diamonds as the led suit. The queen is dangerous, but only the player who wins the trick takes the queen penalty.",
      sequence: [
        { label: "Lead", text: "Barbu plays 8D, so diamonds are the led suit." },
        { label: "Then", text: "Right follows diamonds with QD." },
        { label: "Your turn", text: "You must follow diamonds without taking control." }
      ],
      ariaLabel: "No Queens example table",
      tableCards: [
        { seat: "Tutor", card: { id: "8D", rank: "8", suit: "D", label: "8D" } },
        { seat: "Right", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } },
        { seat: "Left", card: { id: "AD", rank: "A", suit: "D", label: "AD" } }
      ],
      pendingBySeat: { You: "follow diamonds" }
    },
    review: {
      heading: "No Queens rewards patience: do not overtake a queen trick unless the rules force you.",
      body:
        "You practiced separating the scary card from the player who actually wins the trick. That is the key tactical idea behind No Queens.",
      points: [
        { marker: "OK", text: "Queens are penalties only for the trick winner." },
        { marker: "OK", text: "A lower card can be the best legal card." },
        { marker: "OK", text: "Forced queen captures should be anticipated earlier." }
      ]
    }
  },
  {
    id: "king-of-hearts",
    pathStepId: "play-trick",
    lessonId: "barbu-king-of-hearts",
    contract: "King of Hearts",
    title: "Avoid the king",
    concept: {
      heading: "In King of Hearts, one card carries the danger.",
      body:
        "The king of hearts only hurts the player who wins the trick containing it. Your job is to notice when KH is on the table, then avoid becoming the trick winner.",
      points: [
        { marker: "1", text: "Follow suit when you can." },
        { marker: "2", text: "Track whether KH is in the trick." },
        { marker: "3", text: "Duck under KH or discard it when someone else is winning." }
      ]
    },
    example: {
      heading: "Barbu leads hearts. Right plays KH into the trick.",
      body:
        "Hearts are the led suit, so hearts must be followed. The danger is not holding a heart; the danger is winning the trick that contains KH.",
      sequence: [
        { label: "Lead", text: "Barbu plays 10H, so hearts are the led suit." },
        { label: "Then", text: "Right follows with KH, the contract card." },
        { label: "Your turn", text: "You can follow low and leave KH with Right." }
      ],
      ariaLabel: "King of Hearts example table",
      tableCards: [
        { seat: "Tutor", card: { id: "10H", rank: "10", suit: "H", label: "10H" } },
        { seat: "Right", card: { id: "KH", rank: "K", suit: "H", label: "KH" } },
        { seat: "Left", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } }
      ],
      pendingBySeat: { You: "follow hearts" }
    },
    review: {
      heading: "King of Hearts is about one dangerous capture, not every heart.",
      body:
        "You practiced ducking under KH and unloading it when you are void. The table habit is simple: locate KH, then ask who wins this trick.",
      points: [
        { marker: "OK", text: "KH penalizes the player who wins its trick." },
        { marker: "OK", text: "A low heart can be the best legal card." },
        { marker: "OK", text: "Discarding KH is strong when another player already controls the trick." }
      ]
    }
  },
  {
    id: "no-last-two",
    pathStepId: "contract-no-last-two",
    lessonId: "barbu-no-last-two",
    contract: "No Last Two",
    title: "Avoid the final tricks",
    concept: {
      heading: "In No Last Two, the danger appears late.",
      body:
        "The first eleven tricks are setup. Tricks 12 and 13 score against their winners, so your late high cards become dangerous.",
      points: [
        { marker: "1", text: "Count how close the hand is to the final two tricks." },
        { marker: "2", text: "Keep a low card for the last suits when you can." },
        { marker: "3", text: "Winning early can be fine; winning late is the danger." }
      ]
    },
    example: {
      heading: "Trick 12 starts with spades. Barbu is already winning.",
      body:
        "When only two tricks remain, staying under the current winner is often the whole decision. A high card that was safe earlier can now score against you.",
      sequence: [
        { label: "Late hand", text: "This is trick 12, so the trick winner takes a penalty." },
        { label: "Lead", text: "Left plays 7S and Barbu overtakes with JS." },
        { label: "Your turn", text: "You can follow low and leave the penalty with Barbu." }
      ],
      ariaLabel: "No Last Two example table",
      tableCards: [
        { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
        { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
        { seat: "Right", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
      ],
      pendingBySeat: { You: "follow low" }
    },
    review: {
      heading: "No Last Two is a timing contract.",
      body:
        "You practiced treating early tricks as setup and late tricks as danger. The key habit is counting the hand before choosing whether to overtake.",
      points: [
        { marker: "OK", text: "Only tricks 12 and 13 are penalties." },
        { marker: "OK", text: "Low legal cards are precious near the end." },
        { marker: "OK", text: "A forced late win usually means the setup happened earlier." }
      ]
    }
  },
  {
    id: "no-tricks",
    pathStepId: "contract-no-tricks",
    lessonId: "barbu-no-tricks",
    contract: "No Tricks",
    title: "Avoid every trick",
    concept: {
      heading: "In No Tricks, control is the thing you avoid.",
      body:
        "Every trick you win counts against you. The simple move is to follow suit with the lowest card that keeps someone else ahead.",
      points: [
        { marker: "1", text: "Follow the led suit when you can." },
        { marker: "2", text: "Compare your card to the current winner." },
        { marker: "3", text: "Duck under the winner unless the rules force you to win." }
      ]
    },
    example: {
      heading: "Barbu leads clubs. Right takes control with KC.",
      body:
        "In No Tricks, Right winning is good for you. The danger is overtaking with a higher club and taking the trick yourself.",
      sequence: [
        { label: "Lead", text: "Barbu plays 9C, so clubs are the led suit." },
        { label: "Then", text: "Right plays KC and becomes the current winner." },
        { label: "Your turn", text: "You can follow with 2C and avoid taking control." }
      ],
      ariaLabel: "No Tricks example table",
      tableCards: [
        { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Right", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
        { seat: "Left", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }
      ],
      pendingBySeat: { You: "duck" }
    },
    review: {
      heading: "No Tricks turns every win into a cost.",
      body:
        "You practiced ducking under the current winner and recognizing forced wins. The key habit is asking whether your legal card takes control.",
      points: [
        { marker: "OK", text: "Every trick winner scores in this contract." },
        { marker: "OK", text: "A low legal card can be the strongest play." },
        { marker: "OK", text: "Forced wins are legal, but they still count." }
      ]
    }
  },
  {
    id: "hearts-trumps",
    pathStepId: "contract-hearts-trumps",
    lessonId: "barbu-hearts-trumps",
    contract: "Hearts Trumps",
    title: "Use trumps",
    concept: {
      heading: "In Hearts Trumps, hearts can beat the led suit.",
      body:
        "The follow-suit rule still comes first. If you can follow the led suit, you must. When you are void, a heart can trump and win the trick.",
      points: [
        { marker: "1", text: "Check whether you can follow the led suit." },
        { marker: "2", text: "If you are void, a heart can cut the trick." },
        { marker: "3", text: "This is a winning contract: taking tricks is good." }
      ]
    },
    example: {
      heading: "Barbu leads clubs. You have no clubs, but you have hearts.",
      body:
        "Because clubs were led and you are void in clubs, you may play any card. A heart is trump, so it beats the club trick.",
      sequence: [
        { label: "Lead", text: "Barbu plays 9C, so clubs are the led suit." },
        { label: "Then", text: "Right follows with AC and is winning for now." },
        { label: "Your turn", text: "You are void in clubs, so 5H can trump." }
      ],
      ariaLabel: "Hearts Trumps example table",
      tableCards: [
        { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Right", card: { id: "AC", rank: "A", suit: "C", label: "AC" } },
        { seat: "Left", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }
      ],
      pendingBySeat: { You: "trump" }
    },
    review: {
      heading: "Hearts Trumps flips the usual Barbu habit.",
      body:
        "You practiced using a heart to take control when you are void. The important rule is that trumping is powerful only after follow-suit has been checked.",
      points: [
        { marker: "OK", text: "Follow suit still comes first." },
        { marker: "OK", text: "A heart can trump when you are void." },
        { marker: "OK", text: "Winning tricks is the goal in this contract." }
      ]
    }
  },
  {
    id: "domino",
    pathStepId: "contract-domino",
    lessonId: "barbu-domino",
    contract: "Domino",
    title: "Build Domino",
    concept: {
      heading: "Domino is a layout, not a trick.",
      body:
        "No one leads a suit and no trick is won. A suit opens with a seven, then grows outward one rank at a time toward the ace and the two.",
      points: [
        { marker: "1", text: "Open an empty suit with its seven." },
        { marker: "2", text: "Extend an open suit by exactly one rank." },
        { marker: "3", text: "Pass only when no card in your hand fits." }
      ]
    },
    example: {
      heading: "The spade lane is open around 7S.",
      body:
        "The lane already contains 6S, 7S, and 8S. You may place 5S below 6S, 9S above 8S, or open another suit with a seven.",
      sequence: [
        { label: "Lane", text: "Spades show 6S 7S 8S." },
        { label: "Legal", text: "5S extends the low end; 7H opens hearts." },
        { label: "Blocked", text: "10C cannot open clubs before 7C." }
      ],
      ariaLabel: "Domino example layout",
      tableCards: [
        { seat: "Right", card: { id: "6S", rank: "6", suit: "S", label: "6S" } },
        { seat: "Tutor", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
        { seat: "Left", card: { id: "8S", rank: "8", suit: "S", label: "8S" } }
      ],
      pendingBySeat: { You: "place" }
    },
    review: {
      heading: "Domino asks what fits the layout right now.",
      body:
        "You practiced reading a suit lane instead of reading a trick. The next habit is simple: scan for sevens, then scan the open ends of each suit.",
      points: [
        { marker: "OK", text: "Empty suits start with sevens." },
        { marker: "OK", text: "Open suits grow one rank at a time." },
        { marker: "OK", text: "Passing is only correct when nothing fits." }
      ]
    }
  }
];
