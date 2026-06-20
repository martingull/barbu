use crate::cards::{Card, Rank, Suit};
use crate::trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PracticeScenario {
    pub id: String,
    pub title: String,
    pub contract: String,
    pub contract_kind: PracticeContractKind,
    pub led_suit: Suit,
    pub prompt: String,
    pub table_before_choice: Vec<PlayedCard>,
    pub player_hand: Vec<Card>,
    pub table_after_choice: Vec<PlayedCard>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PracticeContractKind {
    NoHearts,
    NoQueens,
    KingOfHearts,
    NoLastTwo,
    NoTricks,
    HeartsTrumps,
    Domino,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PracticeOutcomeKind {
    Good,
    Risky,
    Penalty,
    Illegal,
}

impl PracticeOutcomeKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            PracticeOutcomeKind::Good => "good",
            PracticeOutcomeKind::Risky => "risky",
            PracticeOutcomeKind::Penalty => "penalty",
            PracticeOutcomeKind::Illegal => "illegal",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PracticeOutcomeReason {
    FollowedSuit,
    VoidDiscard,
    AvoidedPenalty,
    CapturedPenalty,
    WonCleanTrick,
    OffSuit,
}

impl PracticeOutcomeReason {
    pub const fn as_str(self) -> &'static str {
        match self {
            PracticeOutcomeReason::FollowedSuit => "followed_suit",
            PracticeOutcomeReason::VoidDiscard => "void_discard",
            PracticeOutcomeReason::AvoidedPenalty => "avoided_penalty",
            PracticeOutcomeReason::CapturedPenalty => "captured_penalty",
            PracticeOutcomeReason::WonCleanTrick => "won_clean_trick",
            PracticeOutcomeReason::OffSuit => "off_suit",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PracticeDrillSet {
    pub id: String,
    pub title: String,
    pub scenarios: Vec<PracticeScenario>,
}

impl PracticeScenario {
    pub fn legal_player_cards(&self) -> Vec<Card> {
        if self.contract_kind == PracticeContractKind::Domino {
            return self
                .player_hand
                .iter()
                .copied()
                .filter(|card| is_legal_domino_practice_card(&self.table_before_choice, *card))
                .collect();
        }

        legal_cards(&self.player_hand, Some(self.led_suit))
    }

    pub fn completed_trick(&self, player_card: Card) -> Option<Vec<PlayedCard>> {
        if self.contract_kind == PracticeContractKind::Domino {
            return None;
        }

        if !self.legal_player_cards().contains(&player_card) {
            return None;
        }

        let mut played = self.table_before_choice.clone();
        played.push(PlayedCard::new(2, player_card));
        played.extend(self.table_after_choice.iter().copied());
        Some(played)
    }

    pub fn outcome_for(&self, player_card: Card) -> PracticeOutcome {
        let legal_cards = self.legal_player_cards();

        if !legal_cards.contains(&player_card) {
            let explanation = if self.contract_kind == PracticeContractKind::Domino {
                format!(
                    "{} is not legal because it does not start or extend a suit. Legal placement: {}.",
                    player_card,
                    join_cards(&legal_cards)
                )
            } else {
                format!(
                    "{} is not legal because {} were led and you still hold {}.",
                    player_card,
                    suit_name(self.led_suit),
                    join_cards(&legal_cards)
                )
            };

            return PracticeOutcome {
                player_card,
                outcome_kind: PracticeOutcomeKind::Illegal,
                reason: PracticeOutcomeReason::OffSuit,
                is_legal: false,
                legal_cards,
                winner: None,
                penalty: None,
                completed_trick: None,
                explanation,
            };
        }

        if self.contract_kind == PracticeContractKind::Domino {
            return PracticeOutcome {
                player_card,
                outcome_kind: PracticeOutcomeKind::Good,
                reason: PracticeOutcomeReason::FollowedSuit,
                is_legal: true,
                legal_cards,
                winner: None,
                penalty: Some(0),
                completed_trick: None,
                explanation: format!(
                    "{} fits the Domino layout. Keep opening sevens or extending a suit by one rank.",
                    player_card
                ),
            };
        }

        let completed_trick = self
            .completed_trick(player_card)
            .expect("legal card should complete the trick");
        let winner = practice_trick_winner(self.contract_kind, &completed_trick)
            .expect("completed trick should have a winner");
        let penalty = score_practice_trick(self.contract_kind, &completed_trick);
        let winner_name = player_name(winner);

        PracticeOutcome {
            player_card,
            outcome_kind: practice_outcome_kind(self.contract_kind, winner, penalty),
            reason: practice_outcome_reason(
                self.contract_kind,
                self.led_suit,
                player_card,
                winner,
                penalty,
            ),
            is_legal: true,
            legal_cards,
            winner: Some(winner),
            penalty: Some(penalty),
            completed_trick: Some(completed_trick),
            explanation: if self.contract_kind == PracticeContractKind::HeartsTrumps {
                if winner == 2 {
                    let control_text = if player_card.suit == Suit::Hearts {
                        "is trump"
                    } else {
                        "takes control"
                    };
                    format!(
                        "{player_card} {control_text}. {winner_name} wins the trick and scores {}.",
                        penalty_label(self.contract_kind, penalty)
                    )
                } else {
                    format!(
                        "{} is legal because you are void in {}. {} wins the trick.",
                        player_card,
                        suit_name(self.led_suit),
                        winner_name
                    )
                }
            } else if self.contract_kind == PracticeContractKind::NoLastTwo && winner != 2 {
                format!(
                    "{} follows {} and loses the late trick. That is good in No Last Two because {} takes {} instead.",
                    player_card,
                    suit_name(self.led_suit),
                    winner_name,
                    penalty_label(self.contract_kind, penalty)
                )
            } else if self.contract_kind == PracticeContractKind::NoLastTwo {
                format!(
                    "{} follows {}. You win the late trick and take {}.",
                    player_card,
                    suit_name(self.led_suit),
                    penalty_label(self.contract_kind, penalty)
                )
            } else if penalty == 0 {
                format!(
                    "{} follows {}. {} wins the trick, and no penalty card was captured.",
                    player_card,
                    suit_name(self.led_suit),
                    winner_name
                )
            } else {
                format!(
                    "{} follows {}. {} wins the trick and takes {}.",
                    player_card,
                    suit_name(self.led_suit),
                    winner_name,
                    penalty_label(self.contract_kind, penalty)
                )
            },
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PracticeOutcome {
    pub player_card: Card,
    pub outcome_kind: PracticeOutcomeKind,
    pub reason: PracticeOutcomeReason,
    pub is_legal: bool,
    pub legal_cards: Vec<Card>,
    pub winner: Option<PlayerIndex>,
    pub penalty: Option<i32>,
    pub completed_trick: Option<Vec<PlayedCard>>,
    pub explanation: String,
}

pub fn generate_no_hearts_follow_suit(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suits = [Suit::Clubs, Suit::Diamonds, Suit::Spades];
    let led_suit = led_suits[rng.next_usize(led_suits.len())];
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_rank = choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine, Rank::Ten]);
    let heart_rank = choose(&mut rng, &[Rank::Four, Rank::Five, Rank::Six, Rank::Seven]);
    let low_player_rank = choose(&mut rng, &[Rank::Two, Rank::Three, Rank::Four, Rank::Five]);
    let high_player_rank = choose(&mut rng, &[Rank::Jack, Rank::Queen, Rank::King]);
    let off_rank = choose(&mut rng, &[Rank::Nine, Rank::Ten, Rank::Jack, Rank::Queen]);

    let lead_card = Card::new(lead_rank, led_suit);
    let heart_card = Card::new(heart_rank, Suit::Hearts);
    let right_card = Card::new(Rank::Ace, led_suit);

    let mut player_hand = vec![
        Card::new(low_player_rank, led_suit),
        Card::new(high_player_rank, led_suit),
        Card::new(Rank::Eight, Suit::Hearts),
        Card::new(off_rank, off_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-hearts-follow-suit-{seed}"),
        title: "Follow suit with a heart at risk".to_string(),
        contract: "No Hearts".to_string(),
        contract_kind: PracticeContractKind::NoHearts,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right is void in {} and discarded {heart_card}. Choose a legal card.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, heart_card)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, right_card)],
    }
}

pub fn generate_no_hearts_practice(seed: u64) -> PracticeScenario {
    match seed % 3 {
        0 => generate_no_hearts_follow_suit(seed),
        1 => generate_no_hearts_void_discard(seed),
        _ => generate_no_hearts_void_dump_danger(seed),
    }
}

pub fn generate_no_hearts_void_dump_danger(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
        led_suit,
    );
    let tutor_card = Card::new(
        choose(&mut rng, &[Rank::Ten, Rank::Jack, Rank::Queen]),
        led_suit,
    );
    let right_card = Card::new(Rank::Ace, led_suit);

    let mut player_hand = vec![
        Card::new(Rank::Ace, Suit::Hearts),
        Card::new(Rank::Queen, Suit::Hearts),
        Card::new(Rank::Two, discard_suit),
        Card::new(Rank::King, discard_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-hearts-void-dump-danger-{seed}"),
        title: "Dump hearts under a locked winner".to_string(),
        contract: "No Hearts".to_string(),
        contract_kind: PracticeContractKind::NoHearts,
        led_suit,
        prompt: format!(
            "Left led {lead_card}. Tutor followed {tutor_card}. Right is winning with {right_card}. You have no {}, so you can unload danger.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_no_hearts_void_discard(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
        led_suit,
    );
    let right_card = Card::new(
        choose(&mut rng, &[Rank::Nine, Rank::Ten, Rank::Jack]),
        led_suit,
    );
    let left_card = Card::new(Rank::Ace, led_suit);
    let heart_card = Card::new(
        choose(&mut rng, &[Rank::Four, Rank::Five, Rank::Six]),
        Suit::Hearts,
    );
    let discard_card = Card::new(
        choose(&mut rng, &[Rank::Two, Rank::Three, Rank::Four]),
        discard_suit,
    );

    let mut player_hand = vec![
        discard_card,
        Card::new(Rank::Queen, discard_suit),
        heart_card,
        Card::new(Rank::Eight, Suit::Hearts),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-hearts-void-discard-{seed}"),
        title: "Discard while void in the led suit".to_string(),
        contract: "No Hearts".to_string(),
        contract_kind: PracticeContractKind::NoHearts,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right followed {right_card}. You have no {}. Choose a discard.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![
            PlayedCard::new(0, lead_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_no_queens_capture(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suits = [Suit::Clubs, Suit::Diamonds, Suit::Spades];
    let led_suit = led_suits[rng.next_usize(led_suits.len())];
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_rank = choose(&mut rng, &[Rank::Five, Rank::Six, Rank::Seven, Rank::Eight]);
    let right_rank = choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine, Rank::Ten]);
    let low_player_rank = choose(&mut rng, &[Rank::Two, Rank::Three, Rank::Four]);
    let high_player_rank = choose(&mut rng, &[Rank::King, Rank::Ace]);
    let off_rank = choose(&mut rng, &[Rank::Four, Rank::Five, Rank::Six, Rank::Seven]);

    let lead_card = Card::new(lead_rank, led_suit);
    let queen_card = Card::new(Rank::Queen, led_suit);
    let right_card = Card::new(right_rank, led_suit);

    let mut player_hand = vec![
        Card::new(low_player_rank, led_suit),
        Card::new(high_player_rank, led_suit),
        Card::new(Rank::Nine, Suit::Hearts),
        Card::new(off_rank, off_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-queens-capture-{seed}"),
        title: "Duck the queen trick".to_string(),
        contract: "No Queens".to_string(),
        contract_kind: PracticeContractKind::NoQueens,
        led_suit,
        prompt: format!(
            "Left led {lead_card}. Tutor played {queen_card}. Right followed {right_card}. Choose without capturing the queen."
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, queen_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_no_queens_practice(seed: u64) -> PracticeScenario {
    match seed % 3 {
        0 => generate_no_queens_capture(seed),
        1 => generate_no_queens_void_discard(seed),
        _ => generate_no_queens_void_dump_queen(seed),
    }
}

pub fn generate_no_queens_void_dump_queen(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
        led_suit,
    );
    let tutor_card = Card::new(
        choose(&mut rng, &[Rank::Nine, Rank::Ten, Rank::Jack]),
        led_suit,
    );
    let right_card = Card::new(Rank::Ace, led_suit);

    let mut player_hand = vec![
        Card::new(Rank::Queen, Suit::Hearts),
        Card::new(Rank::Queen, discard_suit),
        Card::new(Rank::Two, discard_suit),
        Card::new(Rank::King, discard_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-queens-void-dump-queen-{seed}"),
        title: "Dump a queen under a locked winner".to_string(),
        contract: "No Queens".to_string(),
        contract_kind: PracticeContractKind::NoQueens,
        led_suit,
        prompt: format!(
            "Left led {lead_card}. Tutor followed {tutor_card}. Right is winning with {right_card}. You have no {}, so a queen discard is safe for you.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_no_queens_void_discard(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Five, Rank::Six, Rank::Seven]),
        led_suit,
    );
    let queen_card = Card::new(Rank::Queen, led_suit);
    let left_card = Card::new(Rank::Ace, led_suit);
    let discard_card = Card::new(
        choose(&mut rng, &[Rank::Two, Rank::Three, Rank::Four]),
        discard_suit,
    );

    let mut player_hand = vec![
        discard_card,
        Card::new(Rank::King, discard_suit),
        Card::new(Rank::Queen, Suit::Hearts),
        Card::new(Rank::Eight, Suit::Hearts),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-queens-void-discard-{seed}"),
        title: "Discard when the queen is already loose".to_string(),
        contract: "No Queens".to_string(),
        contract_kind: PracticeContractKind::NoQueens,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right played {queen_card}. You are void in {}. Choose a discard.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, queen_card)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_king_of_hearts_capture(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);

    let lead_rank = choose(&mut rng, &[Rank::Nine, Rank::Ten, Rank::Jack]);
    let low_player_rank = choose(&mut rng, &[Rank::Two, Rank::Three, Rank::Four, Rank::Five]);
    let off_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let off_rank = choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine, Rank::Ten]);

    let lead_card = Card::new(lead_rank, Suit::Hearts);
    let king_card = Card::new(Rank::King, Suit::Hearts);
    let left_card = Card::new(Rank::Queen, Suit::Hearts);

    let mut player_hand = vec![
        Card::new(low_player_rank, Suit::Hearts),
        Card::new(Rank::Ace, Suit::Hearts),
        Card::new(Rank::Queen, Suit::Spades),
        Card::new(off_rank, off_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("king-of-hearts-capture-{seed}"),
        title: "Stay under the king".to_string(),
        contract: "King of Hearts".to_string(),
        contract_kind: PracticeContractKind::KingOfHearts,
        led_suit: Suit::Hearts,
        prompt: format!(
            "Tutor led {lead_card}. Right played {king_card}, the contract card. Choose a heart without capturing it."
        ),
        table_before_choice: vec![
            PlayedCard::new(0, lead_card),
            PlayedCard::new(1, king_card),
        ],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_king_of_hearts_practice(seed: u64) -> PracticeScenario {
    match seed % 3 {
        0 => generate_king_of_hearts_capture(seed),
        1 => generate_king_of_hearts_void_discard(seed),
        _ => generate_king_of_hearts_void_dump_king(seed),
    }
}

pub fn generate_king_of_hearts_void_dump_king(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
        led_suit,
    );
    let tutor_card = Card::new(
        choose(&mut rng, &[Rank::Nine, Rank::Ten, Rank::Jack]),
        led_suit,
    );
    let right_card = Card::new(Rank::Ace, led_suit);

    let mut player_hand = vec![
        Card::new(Rank::King, Suit::Hearts),
        Card::new(Rank::Queen, Suit::Hearts),
        Card::new(Rank::Two, discard_suit),
        Card::new(Rank::King, discard_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("king-of-hearts-void-dump-king-{seed}"),
        title: "Dump Barbu under a locked winner".to_string(),
        contract: "King of Hearts".to_string(),
        contract_kind: PracticeContractKind::KingOfHearts,
        led_suit,
        prompt: format!(
            "Left led {lead_card}. Tutor followed {tutor_card}. Right is winning with {right_card}. You are void in {}, so KH can be unloaded safely.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_king_of_hearts_void_discard(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let first_discard_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let second_discard_suit = first_non_matching_suit(first_discard_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Eight, Rank::Nine, Rank::Ten]),
        Suit::Hearts,
    );
    let first_discard = Card::new(
        choose(&mut rng, &[Rank::Two, Rank::Three, Rank::Four]),
        first_discard_suit,
    );
    let second_discard = Card::new(
        choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine]),
        second_discard_suit,
    );

    let mut player_hand = vec![
        first_discard,
        second_discard,
        Card::new(Rank::Queen, Suit::Spades),
        Card::new(Rank::Ace, Suit::Clubs),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("king-of-hearts-void-discard-{seed}"),
        title: "Escape the king when you are void".to_string(),
        contract: "King of Hearts".to_string(),
        contract_kind: PracticeContractKind::KingOfHearts,
        led_suit: Suit::Hearts,
        prompt: format!(
            "Tutor led {lead_card}. Right played KH. You have no hearts, so choose any discard."
        ),
        table_before_choice: vec![
            PlayedCard::new(0, lead_card),
            PlayedCard::new(1, Card::new(Rank::King, Suit::Hearts)),
        ],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, Card::new(Rank::Ace, Suit::Hearts))],
    }
}

pub fn generate_no_last_two_duck(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
        led_suit,
    );
    let tutor_card = Card::new(Rank::Jack, led_suit);
    let right_card = Card::new(
        choose(&mut rng, &[Rank::Three, Rank::Four, Rank::Five]),
        led_suit,
    );

    let mut player_hand = vec![
        Card::new(Rank::Two, led_suit),
        Card::new(Rank::Queen, led_suit),
        Card::new(
            choose(&mut rng, &[Rank::Five, Rank::Six, Rank::Seven]),
            off_suit,
        ),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-last-two-duck-{seed}"),
        title: "Duck the twelfth trick".to_string(),
        contract: "No Last Two".to_string(),
        contract_kind: PracticeContractKind::NoLastTwo,
        led_suit,
        prompt: format!(
            "This is trick 12. Left led {lead_card}. Tutor played {tutor_card}. Right followed {right_card}. Avoid winning the late trick."
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_no_last_two_forced_win(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Four, Rank::Five, Rank::Six]),
        led_suit,
    );
    let tutor_card = Card::new(
        choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine]),
        led_suit,
    );
    let right_card = Card::new(Rank::Ten, led_suit);

    let mut player_hand = vec![
        Card::new(Rank::King, led_suit),
        Card::new(Rank::Three, off_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-last-two-forced-win-{seed}"),
        title: "Forced late winner".to_string(),
        contract: "No Last Two".to_string(),
        contract_kind: PracticeContractKind::NoLastTwo,
        led_suit,
        prompt: format!(
            "This is trick 13. Left led {lead_card}. Tutor played {tutor_card}. Right followed {right_card}. Your only led-suit card is dangerous."
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_no_last_two_practice(seed: u64) -> PracticeScenario {
    if seed % 2 == 0 {
        generate_no_last_two_duck(seed)
    } else {
        generate_no_last_two_forced_win(seed)
    }
}

pub fn generate_no_tricks_duck(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine]),
        led_suit,
    );
    let right_card = Card::new(Rank::King, led_suit);
    let left_card = Card::new(
        choose(&mut rng, &[Rank::Three, Rank::Four, Rank::Five]),
        led_suit,
    );

    let mut player_hand = vec![
        Card::new(Rank::Two, led_suit),
        Card::new(Rank::Ace, led_suit),
        Card::new(
            choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
            off_suit,
        ),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-tricks-duck-{seed}"),
        title: "Duck the trick".to_string(),
        contract: "No Tricks".to_string(),
        contract_kind: PracticeContractKind::NoTricks,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right followed with {right_card}. Avoid taking control of the trick."
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, right_card)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_no_tricks_forced_win(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Four, Rank::Five, Rank::Six]),
        led_suit,
    );
    let tutor_card = Card::new(choose(&mut rng, &[Rank::Seven, Rank::Eight]), led_suit);
    let right_card = Card::new(Rank::Nine, led_suit);

    let mut player_hand = vec![
        Card::new(Rank::King, led_suit),
        Card::new(Rank::Three, off_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-tricks-forced-win-{seed}"),
        title: "Forced trick winner".to_string(),
        contract: "No Tricks".to_string(),
        contract_kind: PracticeContractKind::NoTricks,
        led_suit,
        prompt: format!(
            "Left led {lead_card}. Tutor played {tutor_card}. Right followed {right_card}. Your only led-suit card wins."
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_no_tricks_practice(seed: u64) -> PracticeScenario {
    match seed % 3 {
        0 => generate_no_tricks_duck(seed),
        1 => generate_no_tricks_forced_win(seed),
        _ => generate_no_tricks_void_discard(seed),
    }
}

pub fn generate_no_tricks_void_discard(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);
    let second_discard_suit = Suit::ALL
        .into_iter()
        .find(|suit| *suit != led_suit && *suit != discard_suit)
        .expect("there should be a second discard suit");

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Six, Rank::Seven, Rank::Eight]),
        led_suit,
    );
    let tutor_card = Card::new(
        choose(&mut rng, &[Rank::Ten, Rank::Jack, Rank::Queen]),
        led_suit,
    );
    let right_card = Card::new(Rank::Ace, led_suit);

    let mut player_hand = vec![
        Card::new(Rank::Two, discard_suit),
        Card::new(Rank::King, discard_suit),
        Card::new(Rank::Four, second_discard_suit),
        Card::new(Rank::Queen, second_discard_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("no-tricks-void-discard-{seed}"),
        title: "Discard under a locked winner".to_string(),
        contract: "No Tricks".to_string(),
        contract_kind: PracticeContractKind::NoTricks,
        led_suit,
        prompt: format!(
            "Left led {lead_card}. Tutor followed {tutor_card}. Right is winning with {right_card}. You have no {}, so any discard stays clear.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![
            PlayedCard::new(3, lead_card),
            PlayedCard::new(0, tutor_card),
            PlayedCard::new(1, right_card),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_hearts_trumps_cut(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let first_off_suit = first_non_matching_suit(led_suit, Suit::Hearts);
    let second_off_suit = Suit::ALL
        .into_iter()
        .find(|suit| *suit != led_suit && *suit != first_off_suit && *suit != Suit::Hearts)
        .expect("there should be a second non-heart discard suit");

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Nine, Rank::Ten, Rank::Jack]),
        led_suit,
    );
    let right_card = Card::new(Rank::Ace, led_suit);
    let left_card = Card::new(
        choose(&mut rng, &[Rank::Three, Rank::Four, Rank::Five]),
        first_off_suit,
    );
    let heart_trump = Card::new(
        choose(&mut rng, &[Rank::Four, Rank::Five, Rank::Six]),
        Suit::Hearts,
    );
    let low_discard = Card::new(choose(&mut rng, &[Rank::Two, Rank::Three]), first_off_suit);
    let high_discard = Card::new(Rank::King, second_off_suit);

    let mut player_hand = vec![
        heart_trump,
        Card::new(Rank::Seven, Suit::Hearts),
        low_discard,
        high_discard,
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("hearts-trumps-cut-{seed}"),
        title: "Find the trump trick".to_string(),
        contract: "Hearts Trumps".to_string(),
        contract_kind: PracticeContractKind::HeartsTrumps,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right followed {right_card}. Hearts are trumps, and you have no {}.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, right_card)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_hearts_trumps_follow_to_win(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let off_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Seven, Rank::Eight, Rank::Nine]),
        led_suit,
    );
    let right_card = Card::new(choose(&mut rng, &[Rank::Jack, Rank::Queen]), led_suit);
    let left_card = Card::new(
        choose(&mut rng, &[Rank::Three, Rank::Four, Rank::Five]),
        led_suit,
    );

    let mut player_hand = vec![
        Card::new(Rank::Two, led_suit),
        Card::new(Rank::Ace, led_suit),
        Card::new(Rank::Seven, Suit::Hearts),
        Card::new(Rank::King, off_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("hearts-trumps-follow-win-{seed}"),
        title: "Win while following suit".to_string(),
        contract: "Hearts Trumps".to_string(),
        contract_kind: PracticeContractKind::HeartsTrumps,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right followed {right_card}. You can follow {} and still chase the trick.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, right_card)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_hearts_trumps_overtrump(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let led_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Spades]);
    let discard_suit = first_non_matching_suit(led_suit, Suit::Hearts);

    let lead_card = Card::new(
        choose(&mut rng, &[Rank::Eight, Rank::Nine, Rank::Ten]),
        led_suit,
    );
    let right_trump = Card::new(choose(&mut rng, &[Rank::Five, Rank::Six]), Suit::Hearts);
    let left_card = Card::new(choose(&mut rng, &[Rank::Three, Rank::Four]), led_suit);

    let mut player_hand = vec![
        Card::new(Rank::Three, Suit::Hearts),
        Card::new(Rank::Queen, Suit::Hearts),
        Card::new(Rank::Four, discard_suit),
        Card::new(Rank::King, discard_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("hearts-trumps-overtrump-{seed}"),
        title: "Overtrump for the trick".to_string(),
        contract: "Hearts Trumps".to_string(),
        contract_kind: PracticeContractKind::HeartsTrumps,
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Right already trumped with {right_trump}. You are void in {}, so choose whether to overtrump.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, right_trump)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, left_card)],
    }
}

pub fn generate_hearts_trumps_practice(seed: u64) -> PracticeScenario {
    match seed % 3 {
        0 => generate_hearts_trumps_cut(seed),
        1 => generate_hearts_trumps_follow_to_win(seed),
        _ => generate_hearts_trumps_overtrump(seed),
    }
}

pub fn generate_domino_open_or_extend(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let low_spade = choose(&mut rng, &[Rank::Five, Rank::Six]);
    let high_spade = if low_spade == Rank::Five {
        Rank::Six
    } else {
        Rank::Eight
    };
    let legal_spade = if low_spade == Rank::Five {
        Rank::Four
    } else {
        Rank::Nine
    };

    let mut player_hand = vec![
        Card::new(Rank::Seven, Suit::Hearts),
        Card::new(legal_spade, Suit::Spades),
        Card::new(Rank::Ten, Suit::Clubs),
        Card::new(Rank::Queen, Suit::Diamonds),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("domino-placement-{seed}"),
        title: "Place into the Domino layout".to_string(),
        contract: "Domino".to_string(),
        contract_kind: PracticeContractKind::Domino,
        led_suit: Suit::Spades,
        prompt:
            "Domino is open on spades from the current lane, and unopened suits need a seven. Choose a legal placement."
                .to_string(),
        table_before_choice: vec![
            PlayedCard::new(0, Card::new(Rank::Seven, Suit::Spades)),
            PlayedCard::new(1, Card::new(low_spade, Suit::Spades)),
            PlayedCard::new(3, Card::new(high_spade, Suit::Spades)),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_domino_two_lane_choice(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let low_spade = choose(&mut rng, &[Rank::Five, Rank::Six]);
    let high_spade = if low_spade == Rank::Five {
        Rank::Six
    } else {
        Rank::Eight
    };
    let legal_spade = if low_spade == Rank::Five {
        Rank::Four
    } else {
        Rank::Nine
    };

    let mut player_hand = vec![
        Card::new(legal_spade, Suit::Spades),
        Card::new(Rank::Six, Suit::Hearts),
        Card::new(Rank::Eight, Suit::Hearts),
        Card::new(Rank::Queen, Suit::Diamonds),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("domino-two-lane-choice-{seed}"),
        title: "Choose between open lanes".to_string(),
        contract: "Domino".to_string(),
        contract_kind: PracticeContractKind::Domino,
        led_suit: Suit::Spades,
        prompt:
            "Spades and hearts are both open. Choose a card that extends one current lane by one rank."
                .to_string(),
        table_before_choice: vec![
            PlayedCard::new(0, Card::new(Rank::Seven, Suit::Spades)),
            PlayedCard::new(1, Card::new(low_spade, Suit::Spades)),
            PlayedCard::new(3, Card::new(high_spade, Suit::Spades)),
            PlayedCard::new(0, Card::new(Rank::Seven, Suit::Hearts)),
        ],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_domino_open_new_suit(seed: u64) -> PracticeScenario {
    let mut rng = DeterministicRng::new(seed);
    let open_suit = choose_suit(&mut rng, &[Suit::Clubs, Suit::Diamonds, Suit::Hearts]);
    let gap_suit = first_non_matching_suit(open_suit, Suit::Spades);

    let mut player_hand = vec![
        Card::new(Rank::Seven, open_suit),
        Card::new(Rank::Six, Suit::Spades),
        Card::new(Rank::Ten, gap_suit),
        Card::new(Rank::Queen, gap_suit),
    ];
    player_hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));

    PracticeScenario {
        id: format!("domino-open-new-suit-{seed}"),
        title: "Open a new suit".to_string(),
        contract: "Domino".to_string(),
        contract_kind: PracticeContractKind::Domino,
        led_suit: open_suit,
        prompt:
            "Only spades are open. A new suit must start with its seven; otherwise extend the spade lane by one rank."
                .to_string(),
        table_before_choice: vec![PlayedCard::new(0, Card::new(Rank::Seven, Suit::Spades))],
        player_hand,
        table_after_choice: vec![],
    }
}

pub fn generate_domino_practice(seed: u64) -> PracticeScenario {
    match seed % 3 {
        0 => generate_domino_open_or_extend(seed),
        1 => generate_domino_two_lane_choice(seed),
        _ => generate_domino_open_new_suit(seed),
    }
}

const DAILY_DRILL_POOL_ROUNDS: u64 = 3;

type PracticeScenarioGenerator = fn(u64) -> PracticeScenario;

struct PracticeScenarioTemplate {
    id: &'static str,
    contract_kind: PracticeContractKind,
    generate: PracticeScenarioGenerator,
}

const PRACTICE_SCENARIO_TEMPLATES: [PracticeScenarioTemplate; 7] = [
    PracticeScenarioTemplate {
        id: "no-hearts",
        contract_kind: PracticeContractKind::NoHearts,
        generate: generate_no_hearts_practice,
    },
    PracticeScenarioTemplate {
        id: "no-queens",
        contract_kind: PracticeContractKind::NoQueens,
        generate: generate_no_queens_practice,
    },
    PracticeScenarioTemplate {
        id: "king-of-hearts",
        contract_kind: PracticeContractKind::KingOfHearts,
        generate: generate_king_of_hearts_practice,
    },
    PracticeScenarioTemplate {
        id: "no-last-two",
        contract_kind: PracticeContractKind::NoLastTwo,
        generate: generate_no_last_two_practice,
    },
    PracticeScenarioTemplate {
        id: "no-tricks",
        contract_kind: PracticeContractKind::NoTricks,
        generate: generate_no_tricks_practice,
    },
    PracticeScenarioTemplate {
        id: "hearts-trumps",
        contract_kind: PracticeContractKind::HeartsTrumps,
        generate: generate_hearts_trumps_practice,
    },
    PracticeScenarioTemplate {
        id: "domino",
        contract_kind: PracticeContractKind::Domino,
        generate: generate_domino_practice,
    },
];

pub fn generate_daily_drill_set(seed: u64) -> PracticeDrillSet {
    let mut scenarios = Vec::new();

    for round in 0..DAILY_DRILL_POOL_ROUNDS {
        for (contract_index, template) in PRACTICE_SCENARIO_TEMPLATES.iter().enumerate() {
            let scenario = (template.generate)(drill_pool_seed(seed, contract_index as u64, round));
            debug_assert_eq!(scenario.contract_kind, template.contract_kind, "{}", template.id);
            scenarios.push(scenario);
        }
    }

    PracticeDrillSet {
        id: format!("play-barbu-{seed}"),
        title: "Play Barbu".to_string(),
        scenarios,
    }
}

fn drill_pool_seed(seed: u64, contract_index: u64, round: u64) -> u64 {
    seed.saturating_mul(97)
        .saturating_add(contract_index)
        .saturating_add(round.saturating_mul(7))
}

fn choose(rng: &mut DeterministicRng, values: &[Rank]) -> Rank {
    values[rng.next_usize(values.len())]
}

fn choose_suit(rng: &mut DeterministicRng, values: &[Suit]) -> Suit {
    values[rng.next_usize(values.len())]
}

fn first_non_matching_suit(led_suit: Suit, excluded_suit: Suit) -> Suit {
    Suit::ALL
        .into_iter()
        .find(|suit| *suit != led_suit && *suit != excluded_suit)
        .expect("there should be a non-matching suit")
}

fn join_cards(cards: &[Card]) -> String {
    if cards.is_empty() {
        return "none".to_string();
    }

    cards
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<String>>()
        .join(" or ")
}

fn score_practice_trick(contract_kind: PracticeContractKind, played_cards: &[PlayedCard]) -> i32 {
    match contract_kind {
        PracticeContractKind::NoHearts => score_no_hearts_trick(played_cards),
        PracticeContractKind::NoQueens => played_cards
            .iter()
            .filter(|played| played.card.rank == Rank::Queen)
            .count() as i32,
        PracticeContractKind::KingOfHearts => {
            if played_cards
                .iter()
                .any(|played| played.card == Card::new(Rank::King, Suit::Hearts))
            {
                1
            } else {
                0
            }
        }
        PracticeContractKind::NoLastTwo | PracticeContractKind::NoTricks => 1,
        PracticeContractKind::HeartsTrumps => 1,
        PracticeContractKind::Domino => 0,
    }
}

fn penalty_label(contract_kind: PracticeContractKind, penalty: i32) -> String {
    match contract_kind {
        PracticeContractKind::NoHearts => format!("{penalty} heart penalty"),
        PracticeContractKind::NoQueens => format!("{penalty} queen penalty"),
        PracticeContractKind::KingOfHearts => "the king of hearts penalty".to_string(),
        PracticeContractKind::NoLastTwo => "the last-trick penalty".to_string(),
        PracticeContractKind::NoTricks => "1 trick penalty".to_string(),
        PracticeContractKind::HeartsTrumps => format!("{penalty} trick point"),
        PracticeContractKind::Domino => "0 points".to_string(),
    }
}

fn practice_trick_winner(
    contract_kind: PracticeContractKind,
    played_cards: &[PlayedCard],
) -> Option<PlayerIndex> {
    if contract_kind == PracticeContractKind::HeartsTrumps {
        return hearts_trumps_practice_winner(played_cards);
    }

    trick_winner(played_cards)
}

fn hearts_trumps_practice_winner(played_cards: &[PlayedCard]) -> Option<PlayerIndex> {
    let heart_winner = played_cards
        .iter()
        .filter(|played| played.card.suit == Suit::Hearts)
        .max_by_key(|played| played.card.rank);

    if let Some(winner) = heart_winner {
        return Some(winner.player);
    }

    trick_winner(played_cards)
}

fn practice_outcome_kind(
    contract_kind: PracticeContractKind,
    winner: PlayerIndex,
    penalty: i32,
) -> PracticeOutcomeKind {
    if contract_kind == PracticeContractKind::HeartsTrumps {
        return if winner == 2 {
            PracticeOutcomeKind::Good
        } else {
            PracticeOutcomeKind::Risky
        };
    }

    if winner == 2 && penalty > 0 {
        PracticeOutcomeKind::Penalty
    } else if winner == 2 {
        PracticeOutcomeKind::Risky
    } else {
        PracticeOutcomeKind::Good
    }
}

fn practice_outcome_reason(
    contract_kind: PracticeContractKind,
    led_suit: Suit,
    player_card: Card,
    winner: PlayerIndex,
    penalty: i32,
) -> PracticeOutcomeReason {
    if contract_kind == PracticeContractKind::HeartsTrumps {
        return if winner == 2 {
            PracticeOutcomeReason::WonCleanTrick
        } else if player_card.suit != led_suit {
            PracticeOutcomeReason::VoidDiscard
        } else {
            PracticeOutcomeReason::FollowedSuit
        };
    }

    if winner == 2 && penalty > 0 {
        PracticeOutcomeReason::CapturedPenalty
    } else if winner != 2 && penalty > 0 {
        PracticeOutcomeReason::AvoidedPenalty
    } else if winner == 2 {
        PracticeOutcomeReason::WonCleanTrick
    } else if player_card.suit != led_suit {
        PracticeOutcomeReason::VoidDiscard
    } else {
        PracticeOutcomeReason::FollowedSuit
    }
}

fn is_legal_domino_practice_card(layout: &[PlayedCard], card: Card) -> bool {
    let mut lane_cards = layout
        .iter()
        .filter(|played| played.card.suit == card.suit)
        .map(|played| played.card)
        .collect::<Vec<_>>();

    if lane_cards.is_empty() {
        return card.rank == Rank::Seven;
    }

    lane_cards.sort_by_key(|lane_card| lane_card.rank as u8);
    let low = lane_cards.first().map(|lane_card| lane_card.rank);
    let high = lane_cards.last().map(|lane_card| lane_card.rank);

    rank_above(card.rank) == low || rank_below(card.rank) == high
}

fn rank_below(rank: Rank) -> Option<Rank> {
    match rank {
        Rank::Three => Some(Rank::Two),
        Rank::Four => Some(Rank::Three),
        Rank::Five => Some(Rank::Four),
        Rank::Six => Some(Rank::Five),
        Rank::Seven => Some(Rank::Six),
        Rank::Eight => Some(Rank::Seven),
        Rank::Nine => Some(Rank::Eight),
        Rank::Ten => Some(Rank::Nine),
        Rank::Jack => Some(Rank::Ten),
        Rank::Queen => Some(Rank::Jack),
        Rank::King => Some(Rank::Queen),
        Rank::Ace => Some(Rank::King),
        Rank::Two => None,
    }
}

fn rank_above(rank: Rank) -> Option<Rank> {
    match rank {
        Rank::Two => Some(Rank::Three),
        Rank::Three => Some(Rank::Four),
        Rank::Four => Some(Rank::Five),
        Rank::Five => Some(Rank::Six),
        Rank::Six => Some(Rank::Seven),
        Rank::Seven => Some(Rank::Eight),
        Rank::Eight => Some(Rank::Nine),
        Rank::Nine => Some(Rank::Ten),
        Rank::Ten => Some(Rank::Jack),
        Rank::Jack => Some(Rank::Queen),
        Rank::Queen => Some(Rank::King),
        Rank::King => Some(Rank::Ace),
        Rank::Ace => None,
    }
}

fn player_name(player: PlayerIndex) -> &'static str {
    match player {
        0 => "Tutor",
        1 => "Right",
        2 => "You",
        3 => "Left",
        _ => "The winner",
    }
}

fn suit_name(suit: Suit) -> &'static str {
    match suit {
        Suit::Clubs => "clubs",
        Suit::Diamonds => "diamonds",
        Suit::Hearts => "hearts",
        Suit::Spades => "spades",
    }
}

#[derive(Clone, Copy, Debug)]
struct DeterministicRng {
    state: u64,
}

impl DeterministicRng {
    fn new(seed: u64) -> Self {
        Self {
            state: seed ^ 0x9e37_79b9_7f4a_7c15,
        }
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1);
        self.state
    }

    fn next_usize(&mut self, upper_bound: usize) -> usize {
        assert!(upper_bound > 0, "upper bound must be positive");
        (self.next_u64() as usize) % upper_bound
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_hearts_follow_suit_generator_is_deterministic() {
        assert_eq!(
            generate_no_hearts_follow_suit(42),
            generate_no_hearts_follow_suit(42)
        );
    }

    #[test]
    fn daily_drill_set_generator_is_deterministic() {
        assert_eq!(generate_daily_drill_set(9), generate_daily_drill_set(9));
    }

    #[test]
    fn daily_drill_set_contains_all_playable_generated_scenarios() {
        let drill_set = generate_daily_drill_set(13);

        assert_eq!(drill_set.scenarios.len(), 21);
        assert_eq!(drill_set.scenarios[0].contract, "No Hearts");
        assert_eq!(drill_set.scenarios[1].contract, "No Queens");
        assert_eq!(drill_set.scenarios[2].contract, "King of Hearts");
        assert_eq!(drill_set.scenarios[3].contract, "No Last Two");
        assert_eq!(drill_set.scenarios[4].contract, "No Tricks");
        assert_eq!(drill_set.scenarios[5].contract, "Hearts Trumps");
        assert_eq!(drill_set.scenarios[6].contract, "Domino");
    }

    #[test]
    fn daily_drill_set_varies_scenario_patterns_by_seed() {
        let first_set = generate_daily_drill_set(13);
        let next_set = generate_daily_drill_set(14);

        assert_ne!(first_set.scenarios, next_set.scenarios);

        let no_hearts_patterns = first_set
            .scenarios
            .iter()
            .filter(|scenario| scenario.contract == "No Hearts")
            .map(|scenario| scenario_pattern_id(&scenario.id))
            .collect::<std::collections::BTreeSet<_>>();
        let no_last_two_patterns = first_set
            .scenarios
            .iter()
            .filter(|scenario| scenario.contract == "No Last Two")
            .map(|scenario| scenario_pattern_id(&scenario.id))
            .collect::<std::collections::BTreeSet<_>>();
        let domino_patterns = first_set
            .scenarios
            .iter()
            .filter(|scenario| scenario.contract == "Domino")
            .map(|scenario| scenario_pattern_id(&scenario.id))
            .collect::<std::collections::BTreeSet<_>>();

        assert_eq!(no_hearts_patterns.len(), 3);
        assert_eq!(no_last_two_patterns.len(), 2);
        assert_eq!(domino_patterns.len(), 3);
    }

    fn scenario_pattern_id(id: &str) -> String {
        id.rsplit_once('-')
            .map(|(pattern, _)| pattern.to_string())
            .unwrap_or_else(|| id.to_string())
    }

    #[test]
    fn generated_hearts_trumps_drill_allows_trumping_when_void() {
        let scenario = generate_hearts_trumps_cut(42);
        let legal_cards = scenario.legal_player_cards();

        assert_eq!(scenario.contract, "Hearts Trumps");
        assert_eq!(legal_cards, scenario.player_hand);

        let heart = scenario
            .player_hand
            .iter()
            .copied()
            .find(|card| card.suit == Suit::Hearts)
            .expect("scenario should include a trump card");
        let outcome = scenario.outcome_for(heart);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::WonCleanTrick);
        assert_eq!(outcome.winner, Some(2));
    }

    #[test]
    fn generated_hearts_trumps_drill_can_win_by_following_suit() {
        let scenario = generate_hearts_trumps_follow_to_win(43);
        let ace = scenario
            .player_hand
            .iter()
            .copied()
            .find(|card| card.rank == Rank::Ace && card.suit == scenario.led_suit)
            .expect("scenario should include a led-suit ace");
        let outcome = scenario.outcome_for(ace);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::WonCleanTrick);
        assert!(outcome.explanation.contains("takes control"));
    }

    #[test]
    fn generated_hearts_trumps_drill_can_require_an_overtrump() {
        let scenario = generate_hearts_trumps_overtrump(44);
        let low_heart = Card::new(Rank::Three, Suit::Hearts);
        let queen_heart = Card::new(Rank::Queen, Suit::Hearts);

        assert_eq!(
            scenario.outcome_for(low_heart).outcome_kind,
            PracticeOutcomeKind::Risky
        );
        assert_eq!(
            scenario.outcome_for(queen_heart).outcome_kind,
            PracticeOutcomeKind::Good
        );
    }

    #[test]
    fn generated_domino_drill_allows_sevens_and_adjacent_extensions() {
        let scenario = generate_domino_open_or_extend(45);
        let legal_cards = scenario.legal_player_cards();

        assert_eq!(scenario.contract, "Domino");
        assert!(legal_cards.contains(&Card::new(Rank::Seven, Suit::Hearts)));
        assert_eq!(legal_cards.len(), 2);

        let outcome = scenario.outcome_for(legal_cards[0]);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.winner, None);
        assert_eq!(outcome.completed_trick, None);
    }

    #[test]
    fn generated_domino_drill_can_offer_two_lane_extensions() {
        let scenario = generate_domino_two_lane_choice(46);
        let legal_cards = scenario.legal_player_cards();

        assert_eq!(scenario.contract, "Domino");
        assert!(legal_cards.iter().any(|card| card.suit == Suit::Spades));
        assert!(legal_cards.iter().any(|card| card.suit == Suit::Hearts));
        assert_eq!(legal_cards.len(), 3);
    }

    #[test]
    fn generated_domino_drill_can_open_a_new_suit() {
        let scenario = generate_domino_open_new_suit(47);
        let legal_cards = scenario.legal_player_cards();

        assert_eq!(scenario.contract, "Domino");
        assert!(legal_cards.iter().any(|card| card.rank == Rank::Seven));
        assert!(legal_cards.contains(&Card::new(Rank::Six, Suit::Spades)));
        assert_eq!(legal_cards.len(), 2);
    }

    #[test]
    fn generated_follow_suit_drill_requires_led_suit() {
        let scenario = generate_no_hearts_follow_suit(7);
        let legal_cards = scenario.legal_player_cards();

        assert_eq!(legal_cards.len(), 2);
        assert!(legal_cards
            .iter()
            .all(|card| card.suit == scenario.led_suit));
    }

    #[test]
    fn generated_follow_suit_drill_rejects_off_suit_cards() {
        let scenario = generate_no_hearts_follow_suit(11);
        let off_suit_card = scenario
            .player_hand
            .iter()
            .copied()
            .find(|card| card.suit != scenario.led_suit)
            .expect("generated scenario should include an off-suit card");
        let outcome = scenario.outcome_for(off_suit_card);

        assert!(!outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Illegal);
        assert_eq!(outcome.reason, PracticeOutcomeReason::OffSuit);
        assert!(outcome.explanation.contains("not legal"));
    }

    #[test]
    fn generated_follow_suit_drill_scores_the_completed_trick() {
        let scenario = generate_no_hearts_follow_suit(17);
        let legal_card = scenario.legal_player_cards()[0];
        let outcome = scenario.outcome_for(legal_card);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_eq!(outcome.winner, Some(3));
        assert_eq!(outcome.penalty, Some(1));
        assert!(outcome.explanation.contains("heart penalty"));
    }

    #[test]
    fn generated_no_hearts_void_drill_allows_any_discard() {
        let scenario = generate_no_hearts_void_discard(31);
        let legal_cards = scenario.legal_player_cards();
        let discard = legal_cards
            .iter()
            .copied()
            .find(|card| card.suit != Suit::Hearts)
            .expect("void scenario should include a non-heart discard");
        let outcome = scenario.outcome_for(discard);

        assert_eq!(legal_cards, scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::VoidDiscard);
        assert_ne!(outcome.winner, Some(2));
    }

    #[test]
    fn generated_no_hearts_void_dump_danger_rewards_heart_discard() {
        let scenario = generate_no_hearts_void_dump_danger(32);
        let heart = scenario
            .legal_player_cards()
            .into_iter()
            .find(|card| card.suit == Suit::Hearts)
            .expect("dump scenario should include a heart");
        let outcome = scenario.outcome_for(heart);

        assert_eq!(scenario.legal_player_cards(), scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_eq!(outcome.winner, Some(1));
        assert_eq!(outcome.penalty, Some(1));
    }

    #[test]
    fn generated_outcome_can_be_risky_without_penalty() {
        let scenario = PracticeScenario {
            id: "risky-clean-win".to_string(),
            title: "Win a clean trick".to_string(),
            contract: "No Hearts".to_string(),
            contract_kind: PracticeContractKind::NoHearts,
            led_suit: Suit::Clubs,
            prompt: "Clubs were led and no heart is in the trick.".to_string(),
            table_before_choice: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
            ],
            player_hand: vec![
                Card::new(Rank::Ace, Suit::Clubs),
                Card::new(Rank::Two, Suit::Spades),
            ],
            table_after_choice: vec![PlayedCard::new(3, Card::new(Rank::Nine, Suit::Clubs))],
        };
        let outcome = scenario.outcome_for(Card::new(Rank::Ace, Suit::Clubs));

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Risky);
        assert_eq!(outcome.reason, PracticeOutcomeReason::WonCleanTrick);
        assert_eq!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(0));
    }

    #[test]
    fn generated_outcome_tracks_void_discard() {
        let scenario = PracticeScenario {
            id: "void-discard".to_string(),
            title: "Discard while void".to_string(),
            contract: "No Queens".to_string(),
            contract_kind: PracticeContractKind::NoQueens,
            led_suit: Suit::Clubs,
            prompt: "Clubs were led and you are void.".to_string(),
            table_before_choice: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
            ],
            player_hand: vec![
                Card::new(Rank::Two, Suit::Diamonds),
                Card::new(Rank::Queen, Suit::Hearts),
            ],
            table_after_choice: vec![PlayedCard::new(3, Card::new(Rank::Ace, Suit::Clubs))],
        };
        let outcome = scenario.outcome_for(Card::new(Rank::Two, Suit::Diamonds));

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::VoidDiscard);
        assert_eq!(outcome.winner, Some(3));
    }

    #[test]
    fn generated_no_queens_drill_can_penalize_player_capture() {
        let scenario = generate_no_queens_capture(23);
        let high_card = scenario
            .legal_player_cards()
            .into_iter()
            .find(|card| card.rank > Rank::Queen)
            .expect("scenario should include a queen-capturing card");
        let outcome = scenario.outcome_for(high_card);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Penalty);
        assert_eq!(outcome.reason, PracticeOutcomeReason::CapturedPenalty);
        assert_eq!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(1));
        assert!(outcome.explanation.contains("queen penalty"));
    }

    #[test]
    fn generated_no_queens_void_drill_avoids_the_queen_trick() {
        let scenario = generate_no_queens_void_discard(33);
        let discard = scenario.legal_player_cards()[0];
        let outcome = scenario.outcome_for(discard);

        assert_eq!(scenario.legal_player_cards(), scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_ne!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(1));
    }

    #[test]
    fn generated_no_queens_void_dump_queen_rewards_queen_discard() {
        let scenario = generate_no_queens_void_dump_queen(34);
        let queen = scenario
            .legal_player_cards()
            .into_iter()
            .find(|card| card.rank == Rank::Queen)
            .expect("dump scenario should include a queen");
        let outcome = scenario.outcome_for(queen);

        assert_eq!(scenario.legal_player_cards(), scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_eq!(outcome.winner, Some(1));
        assert_eq!(outcome.penalty, Some(1));
    }

    #[test]
    fn generated_king_of_hearts_drill_can_penalize_player_capture() {
        let scenario = generate_king_of_hearts_capture(29);
        let outcome = scenario.outcome_for(Card::new(Rank::Ace, Suit::Hearts));

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Penalty);
        assert_eq!(outcome.reason, PracticeOutcomeReason::CapturedPenalty);
        assert_eq!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(1));
        assert!(outcome.explanation.contains("king of hearts penalty"));
    }

    #[test]
    fn generated_king_of_hearts_void_drill_allows_any_discard() {
        let scenario = generate_king_of_hearts_void_discard(35);
        let discard = scenario.legal_player_cards()[0];
        let outcome = scenario.outcome_for(discard);

        assert_eq!(scenario.legal_player_cards(), scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_eq!(outcome.winner, Some(3));
        assert_eq!(outcome.penalty, Some(1));
    }

    #[test]
    fn generated_king_of_hearts_void_dump_king_rewards_king_discard() {
        let scenario = generate_king_of_hearts_void_dump_king(36);
        let king = Card::new(Rank::King, Suit::Hearts);
        let outcome = scenario.outcome_for(king);

        assert_eq!(scenario.legal_player_cards(), scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_eq!(outcome.winner, Some(1));
        assert_eq!(outcome.penalty, Some(1));
    }

    #[test]
    fn generated_no_last_two_duck_can_avoid_late_trick() {
        let scenario = generate_no_last_two_duck(41);
        let low_card = scenario
            .legal_player_cards()
            .into_iter()
            .find(|card| card.rank == Rank::Two)
            .expect("duck scenario should include a low legal card");
        let outcome = scenario.outcome_for(low_card);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_ne!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(1));
        assert!(outcome.explanation.contains("loses the late trick"));
        assert!(outcome.explanation.contains("good in No Last Two"));
    }

    #[test]
    fn generated_no_last_two_duck_penalizes_overtaking_late_trick() {
        let scenario = generate_no_last_two_duck(41);
        let high_card = scenario
            .legal_player_cards()
            .into_iter()
            .find(|card| card.rank == Rank::Queen)
            .expect("duck scenario should include a high legal card");
        let outcome = scenario.outcome_for(high_card);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Penalty);
        assert_eq!(outcome.reason, PracticeOutcomeReason::CapturedPenalty);
        assert_eq!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(1));
        assert!(outcome.explanation.contains("win the late trick"));
    }

    #[test]
    fn generated_no_last_two_duck_rejects_off_suit_when_led_suit_is_held() {
        let scenario = generate_no_last_two_duck(41);
        let off_suit_card = scenario
            .player_hand
            .iter()
            .copied()
            .find(|card| card.suit != scenario.led_suit)
            .expect("duck scenario should include an off-suit card");
        let outcome = scenario.outcome_for(off_suit_card);

        assert!(!outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Illegal);
        assert_eq!(outcome.reason, PracticeOutcomeReason::OffSuit);
    }

    #[test]
    fn generated_no_tricks_duck_penalizes_overtaking() {
        let scenario = generate_no_tricks_duck(44);
        let high_card = scenario
            .legal_player_cards()
            .into_iter()
            .find(|card| card.rank == Rank::Ace)
            .expect("duck scenario should include an overtaking card");
        let outcome = scenario.outcome_for(high_card);

        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Penalty);
        assert_eq!(outcome.reason, PracticeOutcomeReason::CapturedPenalty);
        assert_eq!(outcome.winner, Some(2));
        assert_eq!(outcome.penalty, Some(1));
    }

    #[test]
    fn generated_no_tricks_void_discard_stays_clear_when_void() {
        let scenario = generate_no_tricks_void_discard(45);
        let discard = scenario.legal_player_cards()[0];
        let outcome = scenario.outcome_for(discard);

        assert_eq!(scenario.legal_player_cards(), scenario.player_hand);
        assert!(outcome.is_legal);
        assert_eq!(outcome.outcome_kind, PracticeOutcomeKind::Good);
        assert_eq!(outcome.reason, PracticeOutcomeReason::AvoidedPenalty);
        assert_eq!(outcome.winner, Some(1));
        assert_eq!(outcome.penalty, Some(1));
    }
}
