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
        legal_cards(&self.player_hand, Some(self.led_suit))
    }

    pub fn completed_trick(&self, player_card: Card) -> Option<Vec<PlayedCard>> {
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
            let explanation = format!(
                "{} is not legal because {} were led and you still hold {}.",
                player_card,
                suit_name(self.led_suit),
                join_cards(&legal_cards)
            );

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

        let completed_trick = self
            .completed_trick(player_card)
            .expect("legal card should complete the trick");
        let winner = trick_winner(&completed_trick).expect("completed trick should have a winner");
        let penalty = score_practice_trick(self.contract_kind, &completed_trick);
        let winner_name = player_name(winner);

        PracticeOutcome {
            player_card,
            outcome_kind: practice_outcome_kind(winner, penalty),
            reason: practice_outcome_reason(self.led_suit, player_card, winner, penalty),
            is_legal: true,
            legal_cards,
            winner: Some(winner),
            penalty: Some(penalty),
            completed_trick: Some(completed_trick),
            explanation: if penalty == 0 {
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

pub fn generate_daily_drill_set(seed: u64) -> PracticeDrillSet {
    PracticeDrillSet {
        id: format!("play-barbu-{seed}"),
        title: "Play Barbu".to_string(),
        scenarios: vec![
            generate_no_hearts_follow_suit(seed.saturating_mul(3)),
            generate_no_queens_capture(seed.saturating_mul(3) + 1),
            generate_king_of_hearts_capture(seed.saturating_mul(3) + 2),
        ],
    }
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
    }
}

fn penalty_label(contract_kind: PracticeContractKind, penalty: i32) -> String {
    match contract_kind {
        PracticeContractKind::NoHearts => format!("{penalty} heart penalty"),
        PracticeContractKind::NoQueens => format!("{penalty} queen penalty"),
        PracticeContractKind::KingOfHearts => "the king of hearts penalty".to_string(),
    }
}

fn practice_outcome_kind(winner: PlayerIndex, penalty: i32) -> PracticeOutcomeKind {
    if winner == 2 && penalty > 0 {
        PracticeOutcomeKind::Penalty
    } else if winner == 2 {
        PracticeOutcomeKind::Risky
    } else {
        PracticeOutcomeKind::Good
    }
}

fn practice_outcome_reason(
    led_suit: Suit,
    player_card: Card,
    winner: PlayerIndex,
    penalty: i32,
) -> PracticeOutcomeReason {
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
    fn daily_drill_set_contains_three_generated_scenarios() {
        let drill_set = generate_daily_drill_set(13);

        assert_eq!(drill_set.scenarios.len(), 3);
        assert_eq!(drill_set.scenarios[0].contract, "No Hearts");
        assert_eq!(drill_set.scenarios[1].contract, "No Queens");
        assert_eq!(drill_set.scenarios[2].contract, "King of Hearts");
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
}
