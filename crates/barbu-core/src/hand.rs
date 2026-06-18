use crate::cards::{standard_deck, Card, Rank, Suit};
use crate::trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};

pub type TrickScoreFn = fn(&TrickTakingHandState, &[PlayedCard]) -> i32;
pub type OpponentPolicyFn = fn(&TrickTakingHandState) -> Option<Card>;
pub type NoHeartsHandState = TrickTakingHandState;
pub type NoQueensHandState = TrickTakingHandState;
pub type KingOfHeartsHandState = TrickTakingHandState;
pub type NoLastTwoHandState = TrickTakingHandState;
pub type NoTricksHandState = TrickTakingHandState;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrickTakingHandState {
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

impl TrickTakingHandState {
    pub fn legal_cards_for_player(&self, player: PlayerIndex) -> Vec<Card> {
        if self.status == HandStatus::Complete || self.current_player != player {
            return Vec::new();
        }

        legal_cards(&self.hands[player], self.led_suit())
    }

    pub fn legal_player_cards(&self) -> Vec<Card> {
        self.legal_cards_for_player(2)
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

pub fn start_trick_taking_hand(
    id: String,
    seed: u64,
    starting_player: PlayerIndex,
) -> TrickTakingHandState {
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

    TrickTakingHandState {
        id,
        hands,
        current_player: starting_player,
        current_trick: Vec::new(),
        completed_tricks: Vec::new(),
        status: HandStatus::InProgress,
    }
}

pub fn start_no_hearts_hand(seed: u64) -> NoHeartsHandState {
    let state = start_trick_taking_hand(format!("no-hearts-hand-{seed}"), seed, 0);
    advance_to_player_turn(
        state,
        2,
        score_no_hearts_hand_trick,
        choose_no_hearts_opponent_card,
    )
}

pub fn play_no_hearts_card(
    state: NoHeartsHandState,
    player_card: Card,
) -> Result<NoHeartsHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_no_hearts_hand_trick,
        choose_no_hearts_opponent_card,
    )
}

pub fn start_no_queens_hand(seed: u64) -> NoQueensHandState {
    let state = start_trick_taking_hand(format!("no-queens-hand-{seed}"), seed, 0);
    advance_to_player_turn(
        state,
        2,
        score_no_queens_trick,
        choose_no_queens_opponent_card,
    )
}

pub fn play_no_queens_card(
    state: NoQueensHandState,
    player_card: Card,
) -> Result<NoQueensHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_no_queens_trick,
        choose_no_queens_opponent_card,
    )
}

pub fn start_king_of_hearts_hand(seed: u64) -> KingOfHeartsHandState {
    let state = start_trick_taking_hand(format!("king-of-hearts-hand-{seed}"), seed, 0);
    advance_to_player_turn(
        state,
        2,
        score_king_of_hearts_trick,
        choose_king_of_hearts_opponent_card,
    )
}

pub fn play_king_of_hearts_card(
    state: KingOfHeartsHandState,
    player_card: Card,
) -> Result<KingOfHeartsHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_king_of_hearts_trick,
        choose_king_of_hearts_opponent_card,
    )
}

pub fn start_no_last_two_hand(seed: u64) -> NoLastTwoHandState {
    let state = start_trick_taking_hand(format!("no-last-two-hand-{seed}"), seed, 0);
    advance_to_player_turn(
        state,
        2,
        score_no_last_two_trick,
        choose_no_last_two_opponent_card,
    )
}

pub fn play_no_last_two_card(
    state: NoLastTwoHandState,
    player_card: Card,
) -> Result<NoLastTwoHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_no_last_two_trick,
        choose_no_last_two_opponent_card,
    )
}

pub fn start_no_tricks_hand(seed: u64) -> NoTricksHandState {
    let state = start_trick_taking_hand(format!("no-tricks-hand-{seed}"), seed, 0);
    advance_to_player_turn(state, 2, score_no_tricks_trick, choose_no_tricks_opponent_card)
}

pub fn play_no_tricks_card(
    state: NoTricksHandState,
    player_card: Card,
) -> Result<NoTricksHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_no_tricks_trick,
        choose_no_tricks_opponent_card,
    )
}

pub fn play_trick_taking_card(
    mut state: TrickTakingHandState,
    player_card: Card,
    player_index: PlayerIndex,
    score_trick: TrickScoreFn,
    choose_opponent_card: OpponentPolicyFn,
) -> Result<TrickTakingHandState, String> {
    if state.status == HandStatus::Complete {
        return Err("The hand is already complete.".to_string());
    }

    if state.current_player != player_index {
        return Err("It is not your turn.".to_string());
    }

    let legal_player_cards = state.legal_cards_for_player(player_index);

    if !legal_player_cards.contains(&player_card) {
        return Err(format!(
            "{} is not legal. You must play {}.",
            player_card,
            join_cards(&legal_player_cards)
        ));
    }

    play_card_for_current_player(&mut state, player_card, score_trick)?;
    Ok(advance_to_player_turn(
        state,
        player_index,
        score_trick,
        choose_opponent_card,
    ))
}

fn advance_to_player_turn(
    mut state: TrickTakingHandState,
    player_index: PlayerIndex,
    score_trick: TrickScoreFn,
    choose_opponent_card: OpponentPolicyFn,
) -> TrickTakingHandState {
    while state.status == HandStatus::InProgress && state.current_player != player_index {
        let Some(card) = choose_opponent_card(&state) else {
            state.status = HandStatus::Complete;
            break;
        };

        if play_card_for_current_player(&mut state, card, score_trick).is_err() {
            state.status = HandStatus::Complete;
            break;
        }
    }

    state
}

fn play_card_for_current_player(
    state: &mut TrickTakingHandState,
    card: Card,
    score_trick: TrickScoreFn,
) -> Result<(), String> {
    let player = state.current_player;
    let hand = &mut state.hands[player];
    let position = hand
        .iter()
        .position(|held_card| *held_card == card)
        .ok_or_else(|| format!("{} is not in player {}'s hand.", card, player))?;

    hand.remove(position);
    state.current_trick.push(PlayedCard::new(player, card));

    if state.current_trick.len() == 4 {
        complete_trick(state, score_trick);
    } else {
        state.current_player = (state.current_player + 1) % 4;
    }

    Ok(())
}

fn complete_trick(state: &mut TrickTakingHandState, score_trick: TrickScoreFn) {
    let cards = state.current_trick.clone();
    let winner = trick_winner(&cards).expect("a four-card trick should have a winner");
    let penalty = score_trick(state, &cards);

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

fn choose_no_hearts_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return lowest_card_matching(&legal, |card| card.suit != Suit::Hearts)
            .or_else(|| lowest_card(&legal));
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if !follows_suit {
        return highest_card_matching(&legal, |card| card.suit == Suit::Hearts)
            .or_else(|| highest_card(&legal));
    }

    if state
        .current_trick
        .iter()
        .any(|played| played.card.suit == Suit::Hearts)
    {
        return highest_card_matching(&legal, |card| !card_would_win_trick(state, card))
            .or_else(|| lowest_card(&legal));
    }

    lowest_card(&legal)
}

fn choose_no_queens_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return lowest_card_matching(&legal, |card| card.rank != Rank::Queen)
            .or_else(|| lowest_card(&legal));
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if !follows_suit {
        return highest_card_matching(&legal, |card| card.rank == Rank::Queen)
            .or_else(|| highest_card(&legal));
    }

    if state
        .current_trick
        .iter()
        .any(|played| played.card.rank == Rank::Queen)
    {
        return highest_card_matching(&legal, |card| !card_would_win_trick(state, card))
            .or_else(|| lowest_card(&legal));
    }

    lowest_card(&legal)
}

fn choose_king_of_hearts_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return lowest_card_matching(&legal, |card| !is_king_of_hearts(card))
            .or_else(|| lowest_card(&legal));
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if !follows_suit {
        return highest_card_matching(&legal, is_king_of_hearts).or_else(|| highest_card(&legal));
    }

    if state
        .current_trick
        .iter()
        .any(|played| is_king_of_hearts(played.card))
    {
        return highest_card_matching(&legal, |card| !card_would_win_trick(state, card))
            .or_else(|| lowest_card(&legal));
    }

    lowest_card(&legal)
}

fn choose_no_last_two_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return lowest_card(&legal);
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if !follows_suit {
        return highest_card(&legal);
    }

    if state.completed_tricks.len() >= 11 {
        return highest_card_matching(&legal, |card| !card_would_win_trick(state, card))
            .or_else(|| lowest_card(&legal));
    }

    lowest_card(&legal)
}

fn choose_no_tricks_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return lowest_card(&legal);
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if !follows_suit {
        return highest_card(&legal);
    }

    highest_card_matching(&legal, |card| !card_would_win_trick(state, card))
        .or_else(|| lowest_card(&legal))
}

fn score_no_hearts_hand_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    score_no_hearts_trick(cards)
}

fn score_no_queens_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .filter(|played| played.card.rank == Rank::Queen)
        .count() as i32
}

fn score_king_of_hearts_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .filter(|played| is_king_of_hearts(played.card))
        .count() as i32
}

fn score_no_last_two_trick(state: &TrickTakingHandState, _cards: &[PlayedCard]) -> i32 {
    if state.completed_tricks.len() >= 11 {
        1
    } else {
        0
    }
}

fn score_no_tricks_trick(_state: &TrickTakingHandState, _cards: &[PlayedCard]) -> i32 {
    1
}

fn is_king_of_hearts(card: Card) -> bool {
    card.rank == Rank::King && card.suit == Suit::Hearts
}

fn card_would_win_trick(state: &TrickTakingHandState, card: Card) -> bool {
    let Some(led_suit) = state.led_suit() else {
        return true;
    };

    if card.suit != led_suit {
        return false;
    }

    let Some(current_winner) = state
        .current_trick
        .iter()
        .filter(|played| played.card.suit == led_suit)
        .max_by_key(|played| played.card.rank)
    else {
        return true;
    };

    card.rank > current_winner.card.rank
}

fn lowest_card(cards: &[Card]) -> Option<Card> {
    cards.iter().copied().min_by_key(card_sort_key)
}

fn highest_card(cards: &[Card]) -> Option<Card> {
    cards.iter().copied().max_by_key(card_sort_key)
}

fn lowest_card_matching(cards: &[Card], predicate: impl Fn(Card) -> bool) -> Option<Card> {
    cards
        .iter()
        .copied()
        .filter(|card| predicate(*card))
        .min_by_key(card_sort_key)
}

fn highest_card_matching(cards: &[Card], predicate: impl Fn(Card) -> bool) -> Option<Card> {
    cards
        .iter()
        .copied()
        .filter(|card| predicate(*card))
        .max_by_key(card_sort_key)
}

fn card_sort_key(card: &Card) -> (u8, &'static str) {
    (card.rank as u8, card.suit.short_name())
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
    fn generic_trick_taking_engine_deals_without_contract_rules() {
        let state = start_trick_taking_hand("generic-hand".to_string(), 19, 1);

        assert_eq!(state.id, "generic-hand");
        assert_eq!(state.hands.iter().map(Vec::len).sum::<usize>(), 52);
        assert_eq!(state.current_player, 1);
        assert_eq!(state.current_trick.len(), 0);
        assert_eq!(state.completed_tricks.len(), 0);
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
    fn opponent_leads_lowest_non_heart() {
        let state = NoHeartsHandState {
            id: "opponent-lead".to_string(),
            hands: [
                vec![
                    Card::new(Rank::King, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Diamonds),
                    Card::new(Rank::Three, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            current_player: 0,
            current_trick: Vec::new(),
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_hearts_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Diamonds))
        );
    }

    #[test]
    fn opponent_ducks_heart_loaded_trick_when_possible() {
        let state = NoHeartsHandState {
            id: "opponent-duck".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Four, Suit::Hearts)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_hearts_opponent_card(&state),
            Some(Card::new(Rank::Six, Suit::Clubs))
        );
    }

    #[test]
    fn opponent_discards_highest_heart_when_void() {
        let state = NoHeartsHandState {
            id: "opponent-discard-heart".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
                    Card::new(Rank::Three, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_hearts_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Hearts))
        );
    }

    #[test]
    fn no_queens_trick_scores_one_penalty_per_queen() {
        let state = start_trick_taking_hand("score-no-queens".to_string(), 3, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Queen, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Two, Suit::Clubs)),
            PlayedCard::new(2, Card::new(Rank::Queen, Suit::Hearts)),
            PlayedCard::new(3, Card::new(Rank::Ace, Suit::Clubs)),
        ];

        assert_eq!(score_no_queens_trick(&state, &trick), 2);
    }

    #[test]
    fn no_queens_opponent_leads_lowest_non_queen() {
        let state = NoQueensHandState {
            id: "opponent-lead-no-queens".to_string(),
            hands: [
                vec![
                    Card::new(Rank::Queen, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Diamonds),
                    Card::new(Rank::Three, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            current_player: 0,
            current_trick: Vec::new(),
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_queens_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Diamonds))
        );
    }

    #[test]
    fn no_queens_opponent_ducks_queen_loaded_trick_when_possible() {
        let state = NoQueensHandState {
            id: "opponent-duck-no-queens".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Queen, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_queens_opponent_card(&state),
            Some(Card::new(Rank::Six, Suit::Clubs))
        );
    }

    #[test]
    fn no_queens_opponent_discards_highest_queen_when_void() {
        let state = NoQueensHandState {
            id: "opponent-discard-queen".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Hearts),
                    Card::new(Rank::Queen, Suit::Spades),
                    Card::new(Rank::Three, Suit::Diamonds),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_queens_opponent_card(&state),
            Some(Card::new(Rank::Queen, Suit::Spades))
        );
    }

    #[test]
    fn king_of_hearts_trick_scores_only_the_king_of_hearts() {
        let state = start_trick_taking_hand("score-king-of-hearts".to_string(), 5, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Queen, Suit::Hearts)),
            PlayedCard::new(1, Card::new(Rank::King, Suit::Hearts)),
            PlayedCard::new(2, Card::new(Rank::King, Suit::Spades)),
            PlayedCard::new(3, Card::new(Rank::Ace, Suit::Hearts)),
        ];

        assert_eq!(score_king_of_hearts_trick(&state, &trick), 1);
    }

    #[test]
    fn king_of_hearts_opponent_leads_lowest_non_king_of_hearts() {
        let state = KingOfHeartsHandState {
            id: "opponent-lead-king-of-hearts".to_string(),
            hands: [
                vec![
                    Card::new(Rank::King, Suit::Hearts),
                    Card::new(Rank::Two, Suit::Diamonds),
                    Card::new(Rank::Three, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            current_player: 0,
            current_trick: Vec::new(),
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_king_of_hearts_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Diamonds))
        );
    }

    #[test]
    fn king_of_hearts_opponent_ducks_king_loaded_trick_when_possible() {
        let state = KingOfHeartsHandState {
            id: "opponent-duck-king-of-hearts".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Hearts),
                    Card::new(Rank::Ace, Suit::Hearts),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Hearts)),
                PlayedCard::new(1, Card::new(Rank::King, Suit::Hearts)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_king_of_hearts_opponent_card(&state),
            Some(Card::new(Rank::Six, Suit::Hearts))
        );
    }

    #[test]
    fn king_of_hearts_opponent_discards_king_of_hearts_when_void() {
        let state = KingOfHeartsHandState {
            id: "opponent-discard-king-of-hearts".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::King, Suit::Hearts),
                    Card::new(Rank::Queen, Suit::Hearts),
                    Card::new(Rank::Three, Suit::Diamonds),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_king_of_hearts_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Hearts))
        );
    }

    #[test]
    fn king_of_hearts_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_king_of_hearts_hand(23);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state =
                play_king_of_hearts_card(state, legal_card).expect("first legal card should play");
        }

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(state.cards_remaining(), 0);
        assert_eq!(state.total_penalty(), 1);
    }

    #[test]
    fn no_queens_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_no_queens_hand(17);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state = play_no_queens_card(state, legal_card).expect("first legal card should play");
        }

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(state.cards_remaining(), 0);
        assert_eq!(state.total_penalty(), 4);
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

    #[test]
    fn no_last_two_scores_only_the_final_two_tricks() {
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
            PlayedCard::new(2, Card::new(Rank::Four, Suit::Clubs)),
            PlayedCard::new(3, Card::new(Rank::Five, Suit::Clubs)),
        ];
        let mut state = start_trick_taking_hand("score-no-last-two".to_string(), 29, 0);

        state.completed_tricks = repeat_clean_tricks(10);
        assert_eq!(score_no_last_two_trick(&state, &trick), 0);

        state.completed_tricks = repeat_clean_tricks(11);
        assert_eq!(score_no_last_two_trick(&state, &trick), 1);

        state.completed_tricks = repeat_clean_tricks(12);
        assert_eq!(score_no_last_two_trick(&state, &trick), 1);
    }

    #[test]
    fn no_last_two_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_no_last_two_hand(31);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state = play_no_last_two_card(state, legal_card).expect("first legal card should play");
        }

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(state.cards_remaining(), 0);
        assert_eq!(state.total_penalty(), 2);
    }

    #[test]
    fn no_tricks_scores_every_trick() {
        let state = start_trick_taking_hand("score-no-tricks".to_string(), 37, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
            PlayedCard::new(2, Card::new(Rank::Four, Suit::Clubs)),
            PlayedCard::new(3, Card::new(Rank::Five, Suit::Clubs)),
        ];

        assert_eq!(score_no_tricks_trick(&state, &trick), 1);
    }

    #[test]
    fn no_tricks_opponent_ducks_when_possible() {
        let state = NoTricksHandState {
            id: "opponent-duck-no-tricks".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_tricks_opponent_card(&state),
            Some(Card::new(Rank::Six, Suit::Clubs))
        );
    }

    #[test]
    fn no_tricks_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_no_tricks_hand(41);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state = play_no_tricks_card(state, legal_card).expect("first legal card should play");
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

    fn repeat_clean_tricks(count: usize) -> Vec<CompletedTrick> {
        (0..count)
            .map(|_| CompletedTrick {
                cards: Vec::new(),
                winner: 0,
                penalty: 0,
            })
            .collect()
    }
}
