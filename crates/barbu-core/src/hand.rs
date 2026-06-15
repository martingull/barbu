use crate::cards::{standard_deck, Card, Suit};
use crate::trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NoHeartsHandState {
    pub id: String,
    pub hands: [Vec<Card>; 4],
    pub current_player: PlayerIndex,
    pub current_trick: Vec<PlayedCard>,
    pub completed_tricks: Vec<CompletedTrick>,
    pub status: HandStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompletedTrick {
    pub cards: Vec<PlayedCard>,
    pub winner: PlayerIndex,
    pub penalty: i32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HandTrickOutcome {
    CapturedPenalty,
    AvoidedPenalty,
    WonCleanTrick,
    StayedClear,
}

impl HandTrickOutcome {
    pub const fn as_str(self) -> &'static str {
        match self {
            HandTrickOutcome::CapturedPenalty => "captured_penalty",
            HandTrickOutcome::AvoidedPenalty => "avoided_penalty",
            HandTrickOutcome::WonCleanTrick => "won_clean_trick",
            HandTrickOutcome::StayedClear => "stayed_clear",
        }
    }
}

impl CompletedTrick {
    pub fn player_outcome(&self) -> HandTrickOutcome {
        if self.winner == 2 && self.penalty > 0 {
            HandTrickOutcome::CapturedPenalty
        } else if self.winner != 2 && self.penalty > 0 {
            HandTrickOutcome::AvoidedPenalty
        } else if self.winner == 2 {
            HandTrickOutcome::WonCleanTrick
        } else {
            HandTrickOutcome::StayedClear
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HandStatus {
    InProgress,
    Complete,
}

impl HandStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            HandStatus::InProgress => "in_progress",
            HandStatus::Complete => "complete",
        }
    }
}

impl NoHeartsHandState {
    pub fn legal_player_cards(&self) -> Vec<Card> {
        if self.status == HandStatus::Complete || self.current_player != 2 {
            return Vec::new();
        }

        legal_cards(&self.hands[2], self.led_suit())
    }

    pub fn player_penalty(&self) -> i32 {
        self.completed_tricks
            .iter()
            .filter(|trick| trick.winner == 2)
            .map(|trick| trick.penalty)
            .sum()
    }

    pub fn total_penalty(&self) -> i32 {
        self.completed_tricks
            .iter()
            .map(|trick| trick.penalty)
            .sum()
    }

    pub fn cards_remaining(&self) -> usize {
        self.hands.iter().map(Vec::len).sum()
    }

    pub fn trick_number(&self) -> usize {
        (self.completed_tricks.len() + 1).min(13)
    }

    fn led_suit(&self) -> Option<Suit> {
        self.current_trick.first().map(|played| played.card.suit)
    }
}

pub fn start_no_hearts_hand(seed: u64) -> NoHeartsHandState {
    let mut deck = standard_deck();
    let mut rng = DeterministicRng::new(seed);

    for index in (1..deck.len()).rev() {
        let swap_index = rng.next_usize(index + 1);
        deck.swap(index, swap_index);
    }

    let mut hands = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];

    for (index, card) in deck.into_iter().enumerate() {
        hands[index % 4].push(card);
    }

    for hand in &mut hands {
        sort_hand(hand);
    }

    let state = NoHeartsHandState {
        id: format!("no-hearts-hand-{seed}"),
        hands,
        current_player: 0,
        current_trick: Vec::new(),
        completed_tricks: Vec::new(),
        status: HandStatus::InProgress,
    };

    advance_to_player_turn(state)
}

pub fn play_no_hearts_card(
    mut state: NoHeartsHandState,
    player_card: Card,
) -> Result<NoHeartsHandState, String> {
    if state.status == HandStatus::Complete {
        return Err("The hand is already complete.".to_string());
    }

    if state.current_player != 2 {
        return Err("It is not your turn.".to_string());
    }

    let legal_player_cards = state.legal_player_cards();

    if !legal_player_cards.contains(&player_card) {
        return Err(format!(
            "{} is not legal. You must play {}.",
            player_card,
            join_cards(&legal_player_cards)
        ));
    }

    play_card_for_current_player(&mut state, player_card)?;
    Ok(advance_to_player_turn(state))
}

fn advance_to_player_turn(mut state: NoHeartsHandState) -> NoHeartsHandState {
    while state.status == HandStatus::InProgress && state.current_player != 2 {
        let Some(card) = choose_opponent_card(&state) else {
            state.status = HandStatus::Complete;
            break;
        };

        if play_card_for_current_player(&mut state, card).is_err() {
            state.status = HandStatus::Complete;
            break;
        }
    }

    state
}

fn play_card_for_current_player(state: &mut NoHeartsHandState, card: Card) -> Result<(), String> {
    let player = state.current_player;
    let hand = &mut state.hands[player];
    let position = hand
        .iter()
        .position(|held_card| *held_card == card)
        .ok_or_else(|| format!("{} is not in player {}'s hand.", card, player))?;

    hand.remove(position);
    state.current_trick.push(PlayedCard::new(player, card));

    if state.current_trick.len() == 4 {
        complete_trick(state);
    } else {
        state.current_player = (state.current_player + 1) % 4;
    }

    Ok(())
}

fn complete_trick(state: &mut NoHeartsHandState) {
    let cards = state.current_trick.clone();
    let winner = trick_winner(&cards).expect("a four-card trick should have a winner");
    let penalty = score_no_hearts_trick(&cards);

    state.completed_tricks.push(CompletedTrick {
        cards,
        winner,
        penalty,
    });
    state.current_trick.clear();
    state.current_player = winner;

    if state.cards_remaining() == 0 {
        state.status = HandStatus::Complete;
    }
}

fn choose_opponent_card(state: &NoHeartsHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());

    if state.led_suit().is_none() {
        return legal
            .iter()
            .copied()
            .find(|card| card.suit != Suit::Hearts)
            .or_else(|| legal.first().copied());
    }

    legal.first().copied()
}

fn sort_hand(hand: &mut [Card]) {
    hand.sort_by_key(|card| (card.suit.short_name(), card.rank as u8));
}

fn join_cards(cards: &[Card]) -> String {
    cards
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<String>>()
        .join(" or ")
}

#[derive(Clone, Copy, Debug)]
struct DeterministicRng {
    state: u64,
}

impl DeterministicRng {
    fn new(seed: u64) -> Self {
        Self {
            state: seed ^ 0xa076_1d64_78bd_642f,
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
    use crate::cards::Rank;

    #[test]
    fn no_hearts_hand_deals_thirteen_cards_to_each_player() {
        let state = start_no_hearts_hand(7);

        assert_eq!(state.hands.iter().map(Vec::len).sum::<usize>(), 50);
        assert_eq!(state.current_trick.len(), 2);
        assert_eq!(state.hands[2].len(), 13);
        assert_eq!(state.current_player, 2);
        assert_eq!(state.status, HandStatus::InProgress);
    }

    #[test]
    fn no_hearts_hand_rejects_illegal_off_suit_card() {
        let state = NoHeartsHandState {
            id: "test-hand".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::Ace, Suit::Hearts),
                ],
                Vec::new(),
            ],
            current_player: 2,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        let result = play_no_hearts_card(state, Card::new(Rank::Ace, Suit::Hearts));

        assert!(result.is_err());
    }

    #[test]
    fn no_hearts_hand_advances_after_player_play() {
        let state = start_no_hearts_hand(11);
        let legal_card = state.legal_player_cards()[0];
        let next_state = play_no_hearts_card(state, legal_card).expect("legal card should play");

        assert!(!next_state.completed_tricks.is_empty());
        assert_eq!(
            next_state.total_penalty(),
            score_completed_tricks(&next_state)
        );
    }

    #[test]
    fn completed_trick_classifies_player_feedback_outcome() {
        let captured = CompletedTrick {
            cards: Vec::new(),
            winner: 2,
            penalty: 1,
        };
        let avoided = CompletedTrick {
            cards: Vec::new(),
            winner: 1,
            penalty: 2,
        };
        let won_clean = CompletedTrick {
            cards: Vec::new(),
            winner: 2,
            penalty: 0,
        };
        let stayed_clear = CompletedTrick {
            cards: Vec::new(),
            winner: 3,
            penalty: 0,
        };

        assert_eq!(captured.player_outcome(), HandTrickOutcome::CapturedPenalty);
        assert_eq!(avoided.player_outcome(), HandTrickOutcome::AvoidedPenalty);
        assert_eq!(won_clean.player_outcome(), HandTrickOutcome::WonCleanTrick);
        assert_eq!(stayed_clear.player_outcome(), HandTrickOutcome::StayedClear);
    }

    #[test]
    fn no_hearts_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_no_hearts_hand(13);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state = play_no_hearts_card(state, legal_card).expect("first legal card should play");
        }

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(state.cards_remaining(), 0);
        assert_eq!(state.total_penalty(), 13);
    }

    fn score_completed_tricks(state: &NoHeartsHandState) -> i32 {
        state
            .completed_tricks
            .iter()
            .map(|trick| score_no_hearts_trick(&trick.cards))
            .sum()
    }
}
