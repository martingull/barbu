import type { CourseContent } from "../courseTypes";

export const heartsCourses: CourseContent[] = [
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
        { marker: "1", text: "High spades without low cover can trap you with the queen." },
        { marker: "2", text: "A long suit can be useful, so do not break it casually." },
        { marker: "3", text: "Emptying a suit can open discards, unless incoming cards refill it." }
      ]
    },
    example: {
      heading: "Your only spades are queen, king and ace.",
      body:
        "Passing only the queen leaves ace and king without low cover. Passing all three spades removes that risk; the three cards you receive may change your plan.",
      sequence: [
        { label: "Danger", text: "QS can cost thirteen points." },
        { label: "Cover", text: "AS and KS can catch the queen after you pass it." },
        { label: "Pass", text: "Move QS, KS and AS together." }
      ],
      ariaLabel: "Pass three example table",
      tableCards: [
        { seat: "You", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
        { seat: "You", card: { id: "KS", rank: "K", suit: "S", label: "KS" } },
        { seat: "You", card: { id: "AS", rank: "A", suit: "S", label: "AS" } }
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
        "The first heart played breaks hearts, including a lead from an all-heart hand. Before that, lead another suit if you can. Afterward, any suit may be led.",
      points: [
        { marker: "1", text: "Follow the led suit whenever you hold it, even hearts." },
        { marker: "2", text: "Before hearts are broken, lead a non-heart if you can." },
        { marker: "3", text: "When only hearts remain, leading hearts is legal." }
      ]
    },
    example: {
      heading: "Hearts are not broken yet.",
      body:
        "If you are on lead and still hold clubs, diamonds, or spades, choose one of those suits before leading a heart.",
      sequence: [
        { label: "State", text: "No heart has been played yet." },
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
        "Breaking hearts permits heart leads. It never requires the next leader to choose hearts, and it never removes the duty to follow suit.",
      points: [
        { marker: "OK", text: "An all-heart hand may lead hearts before they are broken." },
        { marker: "OK", text: "Follow hearts if you have them; discard freely only when void." },
        { marker: "OK", text: "After hearts break, the next leader may choose any suit." }
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
  }
];
