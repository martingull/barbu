import type { CourseContent } from "../courseTypes";

export const whistCourses: CourseContent[] = [
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
        "You and Barbu sit opposite each other, against Left and Right. Each player receives thirteen cards. Play goes clockwise: the player on the dealer's left opens, then each trick winner leads next. There is no bidding.",
      points: [
        { marker: "1", text: "Read the table as two sides: You + Barbu against Left + Right." },
        { marker: "2", text: "Follow suit first. The highest trump wins; otherwise the highest card of the led suit wins." },
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
        { seat: "Right", card: { id: "6D", rank: "6", suit: "D", label: "6D" } }
      ],
      pendingBySeat: { You: "follow diamonds", Left: "plays after you" }
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
        "The dealer's last card is turned face up to set trump and stays exposed until the dealer's first play. Trump may be led from the start. When you cannot follow a plain suit, you may trump or discard; neither trumping nor overtrumping is compulsory.",
      points: [
        { marker: "1", text: "Check the trump suit before play begins." },
        { marker: "2", text: "Follow trump if trump is led. Otherwise you must be void in the led suit to trump." },
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
        { marker: "1", text: "Barbu is always your partner; Left still plays after you in third hand." },
        { marker: "2", text: "Third hand high allows for unseen honours. Use the cheapest of equally strong cards." },
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
        { seat: "Right", card: { id: "QC", rank: "Q", suit: "C", label: "QC" } }
      ],
      pendingBySeat: { You: "support", Left: "plays after you" }
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
        "An opening lead can invite a suit back. From a long plain suit without a touching honour sequence, start low, often fourth highest. From a sequence such as K-Q-J, lead the king. These are partnership conventions, not rules of legality.",
      points: [
        { marker: "1", text: "Choose your strongest plain suit." },
        { marker: "2", text: "Lead low from broken length, high from an honour sequence." },
        { marker: "3", text: "Draw trumps when length and control give you a reason." }
      ]
    },
    example: {
      heading: "Hearts are trump and spades are your best plain suit.",
      body:
        "From Q-10-8-5-2 of spades, lead 5S, your fourth highest. Keep the queen to work with partner's honours. A low lead invites spades without promising a sequence.",
      sequence: [
        { label: "Trump", text: "Hearts are trump, so avoid opening trump casually." },
        { label: "Shape", text: "Your best plain suit is spades." },
        { label: "Invite", text: "Lead 5S, fourth highest from Q-10-8-5-2." }
      ],
      ariaLabel: "Whist opening lead example table",
      tableCards: [
        { seat: "You", card: { id: "5S", rank: "5", suit: "S", label: "5S" } },
        { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
        { seat: "Tutor", card: { id: "AS", rank: "A", suit: "S", label: "AS" } }
      ],
      pendingBySeat: { Right: "follows" }
    },
    review: {
      heading: "A good opening lead gives partner useful information.",
      body:
        "You practiced choosing a suit to develop and a lead that fits its honour pattern. Return partner's suit when useful, but reconsider when opponents can ruff it or the suit is exhausted.",
      points: [
        { marker: "OK", text: "The lead can be a partnership invitation." },
        { marker: "OK", text: "Low from broken length; top of an honour sequence." },
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
        "When Barbu leads a suit, treat it as information from card play, not spoken advice about hidden cards. Returning it often develops partner's strength, including trumps. Reconsider if opponents can ruff the suit or partner has run out.",
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
        { seat: "Left", card: { id: "4D", rank: "4", suit: "D", label: "4D" } },
        { seat: "Tutor", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } }
      ],
      pendingBySeat: { Right: "follows" }
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
        "After all thirteen tricks, only the side with more than six scores: seven tricks earns one point, eight earns two, and so on. Points accumulate across deals until a side reaches five or more. Honours are not scored at this table.",
      points: [
        { marker: "1", text: "Count your partnership's tricks." },
        { marker: "2", text: "Subtract six from the winning side's trick count." },
        { marker: "3", text: "A single game ends at five points. A rubber ends when a side wins two games, with points reset between games." }
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
        { marker: "OK", text: "Deal moves clockwise; five points wins a game, two games wins a rubber." }
      ]
    }
  }
];
