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

export type CoursePracticeTarget =
  | { kind: "guided-lesson"; game: "barbu"; lessonId: string }
  | { kind: "practice"; game: "hearts"; action: string }
  | { kind: "practice"; game: "whist"; action: string }
  | { kind: "practice"; game: "spades"; action: string };

export type CourseContent = {
  id: string;
  game: "barbu" | "hearts" | "whist" | "spades";
  pathStepId: string;
  practiceTarget: CoursePracticeTarget;
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

export function courseTargetsGuidedLesson(course: CourseContent, lessonId: string) {
  return course.practiceTarget.kind === "guided-lesson" && course.practiceTarget.lessonId === lessonId;
}

export const courseCatalog: CourseContent[] = [
  {
    id: "no-hearts",
    game: "barbu",
    pathStepId: "meet-contract",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-no-hearts" },
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
    game: "barbu",
    pathStepId: "spot-danger",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-no-queens" },
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
    game: "barbu",
    pathStepId: "play-trick",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-king-of-hearts" },
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
    game: "barbu",
    pathStepId: "contract-no-last-two",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-no-last-two" },
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
    game: "barbu",
    pathStepId: "contract-no-tricks",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-no-tricks" },
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
    game: "barbu",
    pathStepId: "contract-hearts-trumps",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-hearts-trumps" },
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
    game: "barbu",
    pathStepId: "contract-domino",
    practiceTarget: { kind: "guided-lesson", game: "barbu", lessonId: "barbu-domino" },
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
  },
  {
    id: "hearts-object",
    game: "hearts",
    pathStepId: "hearts-object",
    practiceTarget: { kind: "practice", game: "hearts", action: "avoid" },
    contract: "Hearts",
    title: "Object of Hearts",
    concept: {
      heading: "Take as few penalty points as possible.",
      body:
        "Hearts is a trick-avoidance game in the Black Lady style. Each heart is one penalty point, the queen of spades is thirteen, and the low score wins.",
      points: [
        { marker: "1", text: "Duck tricks when hearts or the queen of spades are likely to land there." },
        { marker: "2", text: "Follow suit when you can; danger cards matter when someone is void." },
        { marker: "3", text: "Sometimes taking a small penalty stops one player from taking all of them." }
      ]
    },
    example: {
      heading: "Right leads clubs and a heart lands off-suit.",
      body:
        "The heart is a penalty point, but it only hurts the player who wins the trick. First find the current winner, then choose a card that keeps the point away from you.",
      sequence: [
        { label: "Lead", text: "Right plays 9C, so clubs are led." },
        { label: "Danger", text: "Left is void and discards 7H into the trick." },
        { label: "Your turn", text: "Follow clubs low if it keeps you under the winner." }
      ],
      ariaLabel: "Hearts object example table",
      tableCards: [
        { seat: "Right", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Left", card: { id: "7H", rank: "7", suit: "H", label: "7H" } },
        { seat: "Tutor", card: { id: "KC", rank: "K", suit: "C", label: "KC" } }
      ],
      pendingBySeat: { You: "duck" }
    },
    review: {
      heading: "Hearts starts with locating the penalty and the winner.",
      body:
        "You practiced seeing that penalty points attach to the trick winner, not to the player who discarded them.",
      points: [
        { marker: "OK", text: "Low score is good." },
        { marker: "OK", text: "Hearts and queen of spades are penalties." },
        { marker: "OK", text: "The trick winner collects the danger cards." }
      ]
    }
  },
  {
    id: "hearts-queen",
    game: "hearts",
    pathStepId: "hearts-queen",
    practiceTarget: { kind: "practice", game: "hearts", action: "queen" },
    contract: "Hearts",
    title: "Queen of Spades",
    concept: {
      heading: "The Black Lady is the expensive card.",
      body:
        "The queen of spades is thirteen penalty points. In many hands, the main question is whether that card can be forced into a trick you win.",
      points: [
        { marker: "1", text: "Notice when spades are led and high spades are still live." },
        { marker: "2", text: "Avoid winning a spade trick that may contain the queen." },
        { marker: "3", text: "Dump the queen only when someone else is clearly winning." }
      ]
    },
    example: {
      heading: "Spades are led and the queen can move.",
      body:
        "If you win this trick, you may collect the queen of spades. The safe card is often the one that follows suit without becoming the winner.",
      sequence: [
        { label: "Lead", text: "Left plays JS, so spades are led." },
        { label: "Danger", text: "Right can still place QS if void or forced." },
        { label: "Your turn", text: "Stay below the current winner when you can." }
      ],
      ariaLabel: "Queen of Spades example table",
      tableCards: [
        { seat: "Left", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
        { seat: "Tutor", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
        { seat: "Right", card: { id: "5S", rank: "5", suit: "S", label: "5S" } }
      ],
      pendingBySeat: { You: "avoid queen" }
    },
    review: {
      heading: "The queen changes the value of a trick.",
      body:
        "You practiced treating the queen of spades as a separate danger from ordinary hearts.",
      points: [
        { marker: "OK", text: "Queen of spades is thirteen points." },
        { marker: "OK", text: "Winning a clean trick is different from winning the queen." },
        { marker: "OK", text: "Dumping the queen is good only when someone else wins." }
      ]
    }
  },
  {
    id: "hearts-avoid",
    game: "hearts",
    pathStepId: "hearts-avoid",
    practiceTarget: { kind: "practice", game: "hearts", action: "avoid" },
    contract: "Hearts",
    title: "Avoid hearts",
    concept: {
      heading: "A heart is small, but every point matters.",
      body:
        "When hearts are in the trick, your goal is usually to avoid winning. Follow suit legally, then choose the card that keeps the penalty moving away from you.",
      points: [
        { marker: "1", text: "Find the led suit." },
        { marker: "2", text: "Find who is currently winning." },
        { marker: "3", text: "Play below that winner if the rules allow it." }
      ]
    },
    example: {
      heading: "A heart has been discarded into a club trick.",
      body:
        "Clubs were led, so a higher club wins the trick. If you have a low club, duck under the current winner and let that player take the heart.",
      sequence: [
        { label: "Lead", text: "Barbu leads 10C." },
        { label: "Penalty", text: "Right discards 4H." },
        { label: "Your turn", text: "Follow clubs without overtaking if possible." }
      ],
      ariaLabel: "Avoid hearts example table",
      tableCards: [
        { seat: "Tutor", card: { id: "10C", rank: "10", suit: "C", label: "10C" } },
        { seat: "Right", card: { id: "4H", rank: "4", suit: "H", label: "4H" } },
        { seat: "Left", card: { id: "7C", rank: "7", suit: "C", label: "7C" } }
      ],
      pendingBySeat: { You: "duck" }
    },
    review: {
      heading: "Avoiding hearts is a repeated table habit.",
      body:
        "You practiced checking the winner before reacting to the penalty card.",
      points: [
        { marker: "OK", text: "Hearts score against the trick winner." },
        { marker: "OK", text: "Following suit low can be the best defense." },
        { marker: "OK", text: "The right move is often quiet, not flashy." }
      ]
    }
  },
  {
    id: "hearts-pass",
    game: "hearts",
    pathStepId: "hearts-pass",
    practiceTarget: { kind: "practice", game: "hearts", action: "pass" },
    contract: "Hearts",
    title: "Pass three",
    concept: {
      heading: "Before play, move three cards out of your hand.",
      body:
        "Passing is your first defensive decision. Move obvious danger cards, or shape your hand so one suit becomes easier to run out of.",
      points: [
        { marker: "1", text: "Queen of spades and high hearts are common pass candidates." },
        { marker: "2", text: "A long suit can be useful, so do not break it casually." },
        { marker: "3", text: "Passing should make the first tricks easier to survive." }
      ]
    },
    example: {
      heading: "You hold the queen of spades and high hearts.",
      body:
        "That hand carries obvious danger. Passing Q S, A H, and K H removes cards that can trap you in expensive tricks.",
      sequence: [
        { label: "Danger", text: "QS can cost thirteen points." },
        { label: "Hearts", text: "AH and KH can win heart tricks later." },
        { label: "Pass", text: "Move the danger before play starts." }
      ],
      ariaLabel: "Pass three example table",
      tableCards: [
        { seat: "You", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
        { seat: "You", card: { id: "AH", rank: "A", suit: "H", label: "AH" } },
        { seat: "You", card: { id: "KH", rank: "K", suit: "H", label: "KH" } }
      ],
      pendingBySeat: { You: "pass three" }
    },
    review: {
      heading: "Passing shapes the hand before the first trick.",
      body:
        "You practiced choosing three cards for a defensive plan, not just removing random high cards.",
      points: [
        { marker: "OK", text: "Move obvious danger when the hand asks for it." },
        { marker: "OK", text: "Preserving a long suit can be part of the plan." },
        { marker: "OK", text: "The pass should make later choices easier." }
      ]
    }
  },
  {
    id: "hearts-break",
    game: "hearts",
    pathStepId: "hearts-break",
    practiceTarget: { kind: "practice", game: "hearts", action: "break" },
    contract: "Hearts",
    title: "Break hearts",
    concept: {
      heading: "Hearts cannot be led until they are broken.",
      body:
        "In this Hearts table, hearts become open after a heart has been discarded into a trick. Until then, you do not lead hearts unless your hand leaves no alternative.",
      points: [
        { marker: "1", text: "Track whether any heart has appeared off-suit." },
        { marker: "2", text: "Before hearts are broken, lead a non-heart if you can." },
        { marker: "3", text: "When only hearts remain, leading hearts is legal." }
      ]
    },
    example: {
      heading: "Hearts are not broken yet.",
      body:
        "If you are on lead and still hold clubs, diamonds, or spades, choose one of those suits before leading a heart.",
      sequence: [
        { label: "State", text: "No heart has been discarded yet." },
        { label: "Hand", text: "You still have a club." },
        { label: "Lead", text: "Lead the club, not a heart." }
      ],
      ariaLabel: "Break hearts example table",
      tableCards: [
        { seat: "You", card: { id: "8C", rank: "8", suit: "C", label: "8C" } },
        { seat: "You", card: { id: "9H", rank: "9", suit: "H", label: "9H" } },
        { seat: "You", card: { id: "3H", rank: "3", suit: "H", label: "3H" } }
      ],
      pendingBySeat: { You: "lead legal suit" }
    },
    review: {
      heading: "The broken-hearts rule controls early leads.",
      body:
        "You practiced checking the table state before leading a heart.",
      points: [
        { marker: "OK", text: "Hearts open after a heart is discarded." },
        { marker: "OK", text: "Lead another suit while you can." },
        { marker: "OK", text: "All-hearts hands are the exception." }
      ]
    }
  },
  {
    id: "hearts-moon",
    game: "hearts",
    pathStepId: "hearts-moon",
    practiceTarget: { kind: "practice", game: "hearts", action: "moon" },
    contract: "Hearts",
    title: "Stop the moon",
    concept: {
      heading: "Sometimes you take points to stop a bigger swing.",
      body:
        "If one player is collecting every penalty, they may shoot the moon: they score zero and everyone else scores twenty-six. Taking one penalty yourself can stop that.",
      points: [
        { marker: "1", text: "Notice when one player has taken all penalties so far." },
        { marker: "2", text: "If they may take the rest, stop the moon." },
        { marker: "3", text: "A small penalty can save the table twenty-six points." }
      ]
    },
    example: {
      heading: "Left has every penalty so far.",
      body:
        "If Left keeps collecting, the moon may succeed. Winning one heart yourself can be the defensive move.",
      sequence: [
        { label: "Threat", text: "Left has all current hearts and QS." },
        { label: "Decision", text: "You can win a small heart." },
        { label: "Defense", text: "Take the point to break the moon." }
      ],
      ariaLabel: "Stop the moon example table",
      tableCards: [
        { seat: "Left", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
        { seat: "Tutor", card: { id: "7H", rank: "7", suit: "H", label: "7H" } },
        { seat: "Right", card: { id: "4H", rank: "4", suit: "H", label: "4H" } }
      ],
      pendingBySeat: { You: "stop moon" }
    },
    review: {
      heading: "Moon defense is the exception to pure avoidance.",
      body:
        "You practiced taking a controlled penalty when avoiding everything would help one opponent score zero.",
      points: [
        { marker: "OK", text: "Shooting the moon changes all scores." },
        { marker: "OK", text: "One captured penalty blocks the moon." },
        { marker: "OK", text: "Avoidance still matters when no moon threat exists." }
      ]
    }
  },
  {
    id: "hearts-score",
    game: "hearts",
    pathStepId: "hearts-score",
    practiceTarget: { kind: "practice", game: "hearts", action: "score" },
    contract: "Hearts",
    title: "Score a hand",
    concept: {
      heading: "Count penalties, not tricks.",
      body:
        "Hearts scoring ignores clean tricks. Count one point for each heart, thirteen for the queen of spades, and then add the hand to the match score.",
      points: [
        { marker: "1", text: "Find the hearts captured by each seat." },
        { marker: "2", text: "Add thirteen if that seat captured queen of spades." },
        { marker: "3", text: "Low total is the current leader." }
      ]
    },
    example: {
      heading: "One trick can be worth thirteen or more.",
      body:
        "A trick with queen of spades and a heart is fourteen points. A clean trick is zero. That difference is why card danger matters more than trick count.",
      sequence: [
        { label: "Clean", text: "No hearts and no QS means zero." },
        { label: "Heart", text: "Each heart adds one." },
        { label: "Queen", text: "QS adds thirteen." }
      ],
      ariaLabel: "Hearts scoring example table",
      tableCards: [
        { seat: "Left", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
        { seat: "Right", card: { id: "7H", rank: "7", suit: "H", label: "7H" } },
        { seat: "Tutor", card: { id: "4C", rank: "4", suit: "C", label: "4C" } }
      ],
      pendingBySeat: { You: "count points" }
    },
    review: {
      heading: "The scorecard explains why a safe-looking trick may be bad.",
      body:
        "You practiced valuing the captured cards, not just counting how many tricks someone won.",
      points: [
        { marker: "OK", text: "Each heart is one point." },
        { marker: "OK", text: "Queen of spades is thirteen." },
        { marker: "OK", text: "Lowest match score leads." }
      ]
    }
  },
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
  },
  {
    id: "whist-object",
    game: "whist",
    pathStepId: "whist-object",
    practiceTarget: { kind: "practice", game: "whist", action: "follow" },
    contract: "Whist",
    title: "Win tricks together",
    concept: {
      heading: "Whist is partnership trick-taking.",
      body:
        "You and Barbu sit opposite each other. Your side scores only after winning more than six tricks, so every early decision should help the partnership win control later.",
      points: [
        { marker: "1", text: "Read the table as two sides: You + Barbu against Left + Right." },
        { marker: "2", text: "Follow suit first; trump matters only when someone is void." },
        { marker: "3", text: "Seven tricks is the first point. The rest are extra odd tricks." }
      ]
    },
    example: {
      heading: "Left leads clubs. Barbu is your partner across the table.",
      body:
        "Before choosing a card, ask which side is winning. If Barbu already controls the trick, you usually avoid wasting a higher card.",
      sequence: [
        { label: "Lead", text: "Left plays 9C, so clubs are the led suit." },
        { label: "Partner", text: "Barbu plays KC and is winning for your side." },
        { label: "Your turn", text: "Follow clubs without overtaking your partner." }
      ],
      ariaLabel: "Whist partnership example table",
      tableCards: [
        { seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Tutor", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
        { seat: "Right", card: { id: "4C", rank: "4", suit: "C", label: "4C" } }
      ],
      pendingBySeat: { You: "support partner" }
    },
    review: {
      heading: "Whist starts with partnership awareness.",
      body:
        "You practiced reading the current winner as a partnership result, not just as an individual trick. That is the table habit behind the rest of Whist.",
      points: [
        { marker: "OK", text: "You and Barbu score together." },
        { marker: "OK", text: "Partner winning can make a low card correct." },
        { marker: "OK", text: "Odd tricks are tricks above six." }
      ]
    }
  },
  {
    id: "whist-follow-suit",
    game: "whist",
    pathStepId: "whist-follow-suit",
    practiceTarget: { kind: "practice", game: "whist", action: "follow" },
    contract: "Whist",
    title: "Follow suit",
    concept: {
      heading: "The led suit controls the trick until trump appears.",
      body:
        "Whist begins like most trick-taking games: if you have the led suit, you must follow it. You can only trump or discard after you are void in that suit.",
      points: [
        { marker: "1", text: "Identify the first card led." },
        { marker: "2", text: "Check whether your hand contains that suit." },
        { marker: "3", text: "Only consider trump or discard when you cannot follow." }
      ]
    },
    example: {
      heading: "Barbu leads diamonds and you still have diamonds.",
      body:
        "Even if you hold trump, diamonds were led and you can follow. The legal Whist decision starts with the led suit.",
      sequence: [
        { label: "Lead", text: "Barbu plays JD, so diamonds are led." },
        { label: "Then", text: "Right follows with 6D." },
        { label: "Your turn", text: "You have diamonds, so you must follow diamonds." }
      ],
      ariaLabel: "Whist follow suit example table",
      tableCards: [
        { seat: "Tutor", card: { id: "JD", rank: "J", suit: "D", label: "JD" } },
        { seat: "Right", card: { id: "6D", rank: "6", suit: "D", label: "6D" } },
        { seat: "Left", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }
      ],
      pendingBySeat: { You: "follow diamonds" }
    },
    review: {
      heading: "Following suit keeps the table readable.",
      body:
        "You practiced finding the legal suit first. That discipline makes later trump and partnership decisions much clearer.",
      points: [
        { marker: "OK", text: "The first card sets the led suit." },
        { marker: "OK", text: "Trump is not a shortcut when you can follow." },
        { marker: "OK", text: "Legal play comes before tactics." }
      ]
    }
  },
  {
    id: "whist-trumps",
    game: "whist",
    pathStepId: "whist-trumps",
    practiceTarget: { kind: "practice", game: "whist", action: "trump" },
    contract: "Whist",
    title: "Trump wins",
    concept: {
      heading: "A small trump can beat a high plain-suit card.",
      body:
        "The dealer's last card sets trump. When you are void in the led suit, a trump can cut the trick and beat every non-trump card on the table.",
      points: [
        { marker: "1", text: "Check the trump suit before play begins." },
        { marker: "2", text: "Trump only matters when a player cannot follow." },
        { marker: "3", text: "Spend trump when winning the trick helps your side." }
      ]
    },
    example: {
      heading: "Spades are trump and hearts were led.",
      body:
        "Right is winning with AH, but you are void in hearts. A small spade can take the whole trick because spades are trump.",
      sequence: [
        { label: "Trump", text: "Spades are trump this hand." },
        { label: "Lead", text: "Left leads 8H and Right plays AH." },
        { label: "Your turn", text: "Void in hearts, you may cut with a spade." }
      ],
      ariaLabel: "Whist trump example table",
      tableCards: [
        { seat: "Left", card: { id: "8H", rank: "8", suit: "H", label: "8H" } },
        { seat: "Tutor", card: { id: "4H", rank: "4", suit: "H", label: "4H" } },
        { seat: "Right", card: { id: "AH", rank: "A", suit: "H", label: "AH" } }
      ],
      pendingBySeat: { You: "cut or discard" }
    },
    review: {
      heading: "Trump is control, not decoration.",
      body:
        "You practiced using trump when it changes the winner. The next step is deciding whether that control is worth spending now.",
      points: [
        { marker: "OK", text: "A trump beats plain suits." },
        { marker: "OK", text: "You must be void before trumping off-suit." },
        { marker: "OK", text: "Partner winning may mean you save trump." }
      ]
    }
  },
  {
    id: "whist-partner",
    game: "whist",
    pathStepId: "whist-partner",
    practiceTarget: { kind: "practice", game: "whist", action: "third" },
    contract: "Whist",
    title: "Read your partner",
    concept: {
      heading: "Third hand often supports the lead.",
      body:
        "When Barbu leads and you play third, your job is often to help the partnership win the trick without wasting more strength than needed.",
      points: [
        { marker: "1", text: "Notice whether Barbu is your partner in the trick." },
        { marker: "2", text: "Play high enough when opponents are winning." },
        { marker: "3", text: "Avoid overtaking partner without a reason." }
      ]
    },
    example: {
      heading: "Barbu leads clubs and Right overtakes.",
      body:
        "Your partner started the suit, but the opponent is now winning. Third hand high means spending enough strength to bring the trick back to your side.",
      sequence: [
        { label: "Partner", text: "Barbu leads JC." },
        { label: "Opponent", text: "Right plays QC and is winning." },
        { label: "Your turn", text: "Play high enough if you can win for the partnership." }
      ],
      ariaLabel: "Whist third hand example table",
      tableCards: [
        { seat: "Tutor", card: { id: "JC", rank: "J", suit: "C", label: "JC" } },
        { seat: "Right", card: { id: "QC", rank: "Q", suit: "C", label: "QC" } },
        { seat: "Left", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }
      ],
      pendingBySeat: { You: "support" }
    },
    review: {
      heading: "Partnership play asks who your card helps.",
      body:
        "You practiced spending strength when it wins for your side and preserving it when Barbu is already safe.",
      points: [
        { marker: "OK", text: "Third hand high is about partnership control." },
        { marker: "OK", text: "Do not fight Barbu for the same trick." },
        { marker: "OK", text: "Win when opponents are currently ahead." }
      ]
    }
  },
  {
    id: "whist-opening-lead",
    game: "whist",
    pathStepId: "whist-opening-lead",
    practiceTarget: { kind: "practice", game: "whist", action: "lead" },
    contract: "Whist",
    title: "Opening leads",
    concept: {
      heading: "Use the opening lead to invite your strongest suit.",
      body:
        "When you open, you can tell Barbu what suit you want back. Lead your strongest plain suit, and usually lead the highest card in that suit to make the message clear.",
      points: [
        { marker: "1", text: "Choose your strongest plain suit." },
        { marker: "2", text: "Lead your highest card in that suit." },
        { marker: "3", text: "Avoid spending trump before partner knows your plan." }
      ]
    },
    example: {
      heading: "Hearts are trump and spades are your best plain suit.",
      body:
        "Leading QS tells Barbu that spades are your strongest suit and that QS is your highest spade. If Barbu gets lead, spades are the natural return.",
      sequence: [
        { label: "Trump", text: "Hearts are trump, so avoid opening trump casually." },
        { label: "Shape", text: "Your best plain suit is spades." },
        { label: "Invite", text: "Lead QS to show your highest spade." }
      ],
      ariaLabel: "Whist opening lead example table",
      tableCards: [
        { seat: "You", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
        { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
        { seat: "Tutor", card: { id: "AS", rank: "A", suit: "S", label: "AS" } }
      ],
      pendingBySeat: { Right: "follows" }
    },
    review: {
      heading: "A good opening lead gives partner useful information.",
      body:
        "You practiced showing Barbu both the suit you want developed and the highest card you hold in that suit.",
      points: [
        { marker: "OK", text: "The lead can be a partnership invitation." },
        { marker: "OK", text: "Highest card in your strongest suit is clear." },
        { marker: "OK", text: "Trump control can wait until it has a purpose." }
      ]
    }
  },
  {
    id: "whist-suit-invite",
    game: "whist",
    pathStepId: "whist-suit-invite",
    practiceTarget: { kind: "practice", game: "whist", action: "return" },
    contract: "Whist",
    title: "Invite a suit",
    concept: {
      heading: "Return the suit your partner invited.",
      body:
        "When Barbu leads a strong plain suit, treat it as information. If you later gain the lead, returning that suit often lets partner's remaining strength work.",
      points: [
        { marker: "1", text: "Remember the suit Barbu led from strength." },
        { marker: "2", text: "When you gain lead, consider returning that suit." },
        { marker: "3", text: "Do not switch suits without a stronger reason." }
      ]
    },
    example: {
      heading: "Barbu invited diamonds earlier.",
      body:
        "You are now on lead. Returning diamonds gives Barbu a chance to use the strength they already showed.",
      sequence: [
        { label: "Earlier", text: "Barbu led KD, showing diamond strength." },
        { label: "Now", text: "You win a trick and lead next." },
        { label: "Return", text: "Lead diamonds back unless another plan is clearly better." }
      ],
      ariaLabel: "Whist suit return example table",
      tableCards: [
        { seat: "You", card: { id: "7D", rank: "7", suit: "D", label: "7D" } },
        { seat: "Tutor", card: { id: "KD", rank: "K", suit: "D", label: "KD" } },
        { seat: "Right", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }
      ],
      pendingBySeat: { Left: "follows" }
    },
    review: {
      heading: "Suit invitations make Whist feel like a partnership game.",
      body:
        "You practiced using partner's earlier lead as a signal, then returning the suit when you had the chance.",
      points: [
        { marker: "OK", text: "A lead can name the suit partner wants back." },
        { marker: "OK", text: "Returning partner's suit develops shared winners." },
        { marker: "OK", text: "Ignoring the signal should be a deliberate choice." }
      ]
    }
  },
  {
    id: "whist-odd-tricks",
    game: "whist",
    pathStepId: "whist-odd-tricks",
    practiceTarget: { kind: "practice", game: "whist", action: "odd" },
    contract: "Whist",
    title: "Count odd tricks",
    concept: {
      heading: "Only tricks above six score.",
      body:
        "A Whist side needs seven tricks before it scores anything. The seventh trick is one point, the eighth is two, and so on.",
      points: [
        { marker: "1", text: "Count your partnership's tricks." },
        { marker: "2", text: "Subtract six from the winning side's trick count." },
        { marker: "3", text: "The result is the number of odd tricks scored." }
      ]
    },
    example: {
      heading: "Your side has six tricks and this trick is live.",
      body:
        "Winning this trick would create the first odd trick for You + Barbu. Losing it keeps your side at zero points for now.",
      sequence: [
        { label: "Score", text: "Your side has six tricks." },
        { label: "Target", text: "The seventh trick is the first point." },
        { label: "Decision", text: "Spend enough strength if it wins the odd trick." }
      ],
      ariaLabel: "Whist odd trick example table",
      tableCards: [
        { seat: "Left", card: { id: "9S", rank: "9", suit: "S", label: "9S" } },
        { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
        { seat: "Right", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } }
      ],
      pendingBySeat: { You: "win odd trick" }
    },
    review: {
      heading: "Odd tricks explain why one trick can matter.",
      body:
        "You practiced seeing the scoring threshold, not just the current trick. A seventh trick changes the score; a sixth trick does not.",
      points: [
        { marker: "OK", text: "Six tricks is the baseline." },
        { marker: "OK", text: "Seven tricks scores one." },
        { marker: "OK", text: "More tricks above six add more points." }
      ]
    }
  }
];
