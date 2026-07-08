use crate::cards::{standard_deck, Card, Rank, Suit};
use crate::contract_policy::{
    choose_no_queens_opponent_card as choose_no_queens_policy_card, BarbuContractPolicy,
    HandPolicy, TrickPolicyContext,
};
use crate::trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};

pub type TrickScoreFn = fn(&TrickTakingHandState, &[PlayedCard]) -> i32;
pub type OpponentPolicyFn = fn(&TrickTakingHandState) -> Option<Card>;
pub type NoHeartsHandState = TrickTakingHandState;
pub type NoQueensHandState = TrickTakingHandState;
pub type KingOfHeartsHandState = TrickTakingHandState;
pub type NoLastTwoHandState = TrickTakingHandState;
pub type NoTricksHandState = TrickTakingHandState;
pub type PositiveTricksHandState = TrickTakingHandState;
pub type HeartsHandState = TrickTakingHandState;
pub type WhistHandState = TrickTakingHandState;
pub type SpadesHandState = TrickTakingHandState;
const HEARTS_TRUMP_SUIT: Suit = Suit::Hearts;
const HEARTS_MOON_LEAD_THRESHOLD: i32 = 8;

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

pub fn completed_trick_tactical_tags(
    contract: &str,
    trick_number: usize,
    trick: &CompletedTrick,
) -> Vec<&'static str> {
    let mut tags = Vec::new();
    let policy = HandPolicy::from_contract_name(contract);

    if let (Some(led), Some(player_card)) = (
        trick.cards.first().map(|played| played.card.suit),
        trick
            .cards
            .iter()
            .find(|played| played.player == 2)
            .map(|played| played.card),
    ) {
        if player_card.suit == led {
            tags.push("followed_suit");
        } else {
            tags.push("void_discard");
        }
    }

    match policy {
        Some(HandPolicy::BarbuContract(BarbuContractPolicy::NoLastTwo)) => {
            if trick_number >= 12 {
                tags.push("final_two_trick");
            } else {
                tags.push("setup_trick");
            }
        }
        Some(HandPolicy::BarbuContract(BarbuContractPolicy::HeartsTrumps)) => {
            let trump_cards = trick
                .cards
                .iter()
                .filter(|played| played.card.suit == HEARTS_TRUMP_SUIT)
                .count();
            let winner_used_trump = trick
                .cards
                .iter()
                .find(|played| played.player == trick.winner)
                .is_some_and(|played| played.card.suit == HEARTS_TRUMP_SUIT);

            if winner_used_trump {
                tags.push("trump_won");
            }
            if winner_used_trump && trump_cards > 1 {
                tags.push("overtrumped");
            }
        }
        Some(HandPolicy::Whist) => {
            let player_card = trick
                .cards
                .iter()
                .find(|played| played.player == 2)
                .map(|played| played.card);
            let partner_card = trick
                .cards
                .iter()
                .find(|played| played.player == 0)
                .map(|played| played.card);

            if let Some(winner_card) = trick
                .cards
                .iter()
                .find(|played| played.player == trick.winner)
                .map(|played| played.card)
            {
                if winner_card.suit != led_suit(trick) {
                    tags.push("trump_won");
                }
            }
            if trick.winner == 0 || trick.winner == 2 {
                tags.push("partner_trick");
            } else {
                tags.push("opponent_trick");
            }
            if trick.winner == 0 {
                tags.push("partner_held");
            }
            if trick.cards.first().is_some_and(|played| played.player == 0)
                && (trick.winner == 0 || trick.winner == 2)
            {
                tags.push("partner_supported");
            }
            if trick.cards.get(2).is_some_and(|played| played.player == 2)
                && trick.cards.first().is_some_and(|played| played.player == 0)
            {
                tags.push("third_hand_high");
            }
            if trick.winner == 0
                && player_card
                    .zip(partner_card)
                    .is_some_and(|(player_card, partner_card)| {
                        player_card.suit == partner_card.suit
                            && player_card.rank < partner_card.rank
                    })
            {
                tags.push("avoided_overtake");
            }
        }
        Some(HandPolicy::HeartsBlackLady)
        | Some(HandPolicy::BarbuContract(BarbuContractPolicy::NoHearts))
        | Some(HandPolicy::BarbuContract(BarbuContractPolicy::NoQueens))
        | Some(HandPolicy::BarbuContract(BarbuContractPolicy::KingOfHearts)) => {
            if trick.penalty > 0 {
                tags.push("danger_card_moved");
            }
            if policy == Some(HandPolicy::HeartsBlackLady) {
                if trick.cards.iter().any(|played| {
                    played.card.rank == Rank::Queen && played.card.suit == Suit::Spades
                }) {
                    tags.push("queen_spades_moved");
                }
                if trick
                    .cards
                    .iter()
                    .any(|played| played.card.suit == Suit::Hearts)
                {
                    tags.push("hearts_moved");
                }
                if trick.winner == 2
                    && trick.penalty > 0
                    && trick
                        .cards
                        .iter()
                        .any(|played| played.player != 2 && played.card.suit != led_suit(trick))
                {
                    tags.push("opponent_loaded_player_trick");
                }
                if trick.winner == 2
                    && trick.penalty > 0
                    && trick.cards.first().is_some_and(|played| played.player != 2)
                {
                    tags.push("pressure_lead");
                }
            }
        }
        _ => {}
    }

    tags
}

fn led_suit(trick: &CompletedTrick) -> Suit {
    trick
        .cards
        .first()
        .map(|played| played.card.suit)
        .unwrap_or(Suit::Clubs)
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
    fn policy(&self) -> Option<HandPolicy> {
        HandPolicy::from_hand_id(&self.id)
    }

    pub fn legal_cards_for_player(&self, player: PlayerIndex) -> Vec<Card> {
        if self.status == HandStatus::Complete || self.current_player != player {
            return Vec::new();
        }

        if is_hearts_state(self) {
            return legal_hearts_cards(self, player);
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
    let deck = shuffled_standard_deck(seed);
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

fn shuffled_standard_deck(seed: u64) -> Vec<Card> {
    let mut deck = standard_deck();
    let mut rng = DeterministicRng::new(seed);

    for index in (1..deck.len()).rev() {
        let swap_index = rng.next_usize(index + 1);
        deck.swap(index, swap_index);
    }

    deck
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
    advance_to_player_turn(
        state,
        2,
        score_no_tricks_trick,
        choose_no_tricks_opponent_card,
    )
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

pub fn start_positive_tricks_hand(seed: u64) -> PositiveTricksHandState {
    let state = start_trick_taking_hand(format!("hearts-trumps-hand-{seed}"), seed, 0);
    advance_to_player_turn(
        state,
        2,
        score_positive_tricks_trick,
        choose_positive_tricks_opponent_card,
    )
}

pub fn play_positive_tricks_card(
    state: PositiveTricksHandState,
    player_card: Card,
) -> Result<PositiveTricksHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_positive_tricks_trick,
        choose_positive_tricks_opponent_card,
    )
}

pub fn start_hearts_hand(seed: u64) -> HeartsHandState {
    let starting_player = find_two_of_clubs_player_for_seed(seed);
    let state = start_trick_taking_hand(format!("hearts-hand-{seed}"), seed, starting_player);
    advance_to_player_turn(state, 2, score_hearts_trick, choose_hearts_opponent_card)
}

pub fn start_hearts_passing_hand(seed: u64) -> HeartsHandState {
    start_trick_taking_hand(format!("hearts-passing-hand-{seed}"), seed, 2)
}

pub fn apply_hearts_pass(
    state: HeartsHandState,
    player_cards: Vec<Card>,
) -> Result<HeartsHandState, String> {
    apply_hearts_pass_with_direction(state, player_cards, 1)
}

pub fn apply_hearts_pass_direction(
    state: HeartsHandState,
    player_cards: Vec<Card>,
    direction: usize,
) -> Result<HeartsHandState, String> {
    apply_hearts_pass_with_direction(state, player_cards, direction)
}

pub fn play_hearts_card(
    state: HeartsHandState,
    player_card: Card,
) -> Result<HeartsHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_hearts_trick,
        choose_hearts_opponent_card,
    )
}

pub fn start_whist_hand(seed: u64) -> WhistHandState {
    let deck = shuffled_standard_deck(seed);
    let dealer = whist_dealer_for_seed(seed);
    let leader = (dealer + 1) % 4;
    let trump_card = deck[dealer + 48];
    let mut hands = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];

    for (index, card) in deck.into_iter().enumerate() {
        hands[index % 4].push(card);
    }

    for hand in &mut hands {
        sort_hand(hand);
    }

    let state = WhistHandState {
        id: format!(
            "whist-hand-{seed}-dealer-{dealer}-{}",
            trump_card.suit.short_name()
        ),
        hands,
        current_player: leader,
        current_trick: Vec::new(),
        completed_tricks: Vec::new(),
        status: HandStatus::InProgress,
    };
    advance_to_player_turn(state, 2, score_whist_trick, choose_whist_opponent_card)
}

pub fn play_whist_card(state: WhistHandState, player_card: Card) -> Result<WhistHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_whist_trick,
        choose_whist_opponent_card,
    )
}

pub fn start_spades_hand(seed: u64) -> SpadesHandState {
    let deck = shuffled_standard_deck(seed);
    let dealer = whist_dealer_for_seed(seed);
    let leader = (dealer + 1) % 4;
    let mut hands = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];

    for (index, card) in deck.into_iter().enumerate() {
        hands[index % 4].push(card);
    }

    for hand in &mut hands {
        sort_hand(hand);
    }

    let state = SpadesHandState {
        id: format!("spades-hand-{seed}-dealer-{dealer}-S"),
        hands,
        current_player: leader,
        current_trick: Vec::new(),
        completed_tricks: Vec::new(),
        status: HandStatus::InProgress,
    };
    advance_to_player_turn(state, 2, score_whist_trick, choose_whist_opponent_card)
}

pub fn play_spades_card(
    state: SpadesHandState,
    player_card: Card,
) -> Result<SpadesHandState, String> {
    play_trick_taking_card(
        state,
        player_card,
        2,
        score_whist_trick,
        choose_whist_opponent_card,
    )
}

fn apply_hearts_pass_with_direction(
    mut state: HeartsHandState,
    player_cards: Vec<Card>,
    direction: usize,
) -> Result<HeartsHandState, String> {
    if state.status == HandStatus::Complete {
        return Err("The hand is already complete.".to_string());
    }
    if !state.current_trick.is_empty() || !state.completed_tricks.is_empty() {
        return Err("Cards can only be passed before the first trick.".to_string());
    }
    if direction == 0 || direction >= 4 {
        return Err("Unsupported Hearts pass direction.".to_string());
    }
    if player_cards.len() != 3 {
        return Err("Choose exactly three cards to pass.".to_string());
    }
    if has_duplicate_cards(&player_cards) {
        return Err("Choose three different cards to pass.".to_string());
    }
    for card in &player_cards {
        if !state.hands[2].contains(card) {
            return Err(format!("{card} is not in your hand."));
        }
    }

    let mut passed_cards: [Vec<Card>; 4] = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];
    passed_cards[2] = player_cards;

    for (player, passed) in passed_cards.iter_mut().enumerate() {
        if player != 2 {
            *passed = choose_hearts_pass_cards(&state.hands[player]);
        }
    }

    for (player, passed) in passed_cards.iter().enumerate() {
        for card in passed {
            remove_card_from_hand(&mut state.hands[player], *card)?;
        }
    }

    for (player, passed) in passed_cards.iter().enumerate() {
        let recipient = (player + direction) % 4;
        state.hands[recipient].extend(passed.iter().copied());
    }

    for hand in &mut state.hands {
        sort_hand(hand);
    }

    state.id = state.id.replace("hearts-passing-hand-", "hearts-hand-");
    state.current_player = player_with_card(&state, Card::new(Rank::Two, Suit::Clubs))
        .ok_or_else(|| "The two of clubs is missing from the Hearts hand.".to_string())?;

    Ok(advance_to_player_turn(
        state,
        2,
        score_hearts_trick,
        choose_hearts_opponent_card,
    ))
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
    let winner =
        trick_winner_for_state(state, &cards).expect("a four-card trick should have a winner");
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

fn trick_winner_for_state(
    state: &TrickTakingHandState,
    played_cards: &[PlayedCard],
) -> Option<PlayerIndex> {
    if is_hearts_trumps_state(state) {
        return trump_trick_winner(played_cards, HEARTS_TRUMP_SUIT);
    }
    if is_whist_state(state) {
        return trump_trick_winner(played_cards, whist_trump_suit(state));
    }

    trick_winner(played_cards)
}

fn trump_trick_winner(played_cards: &[PlayedCard], trump_suit: Suit) -> Option<PlayerIndex> {
    let first_card = played_cards.first()?.card;
    let winner = played_cards
        .iter()
        .copied()
        .filter(|played| played.card.suit == trump_suit)
        .max_by_key(|played| played.card.rank)
        .or_else(|| {
            played_cards
                .iter()
                .copied()
                .filter(|played| played.card.suit == first_card.suit)
                .max_by_key(|played| played.card.rank)
        })?;

    Some(winner.player)
}

fn is_hearts_trumps_state(state: &TrickTakingHandState) -> bool {
    matches!(
        state.policy(),
        Some(HandPolicy::BarbuContract(BarbuContractPolicy::HeartsTrumps))
    )
}

fn is_hearts_state(state: &TrickTakingHandState) -> bool {
    matches!(state.policy(), Some(HandPolicy::HeartsBlackLady))
}

fn is_whist_state(state: &TrickTakingHandState) -> bool {
    matches!(state.policy(), Some(HandPolicy::Whist | HandPolicy::Spades))
}

fn whist_trump_suit(state: &TrickTakingHandState) -> Suit {
    whist_trump_suit_from_id(&state.id).unwrap_or(Suit::Spades)
}

fn whist_trump_suit_from_id(id: &str) -> Option<Suit> {
    match id.rsplit('-').next()? {
        "C" => Some(Suit::Clubs),
        "D" => Some(Suit::Diamonds),
        "H" => Some(Suit::Hearts),
        "S" => Some(Suit::Spades),
        _ => None,
    }
}

fn whist_dealer_for_seed(seed: u64) -> PlayerIndex {
    (seed as usize) % 4
}

fn legal_hearts_cards(state: &TrickTakingHandState, player: PlayerIndex) -> Vec<Card> {
    let hand = &state.hands[player];
    let basic_legal = legal_cards(hand, state.led_suit());

    if basic_legal.is_empty() {
        return basic_legal;
    }

    if state.completed_tricks.is_empty() && state.current_trick.is_empty() {
        return basic_legal
            .iter()
            .copied()
            .filter(|card| *card == Card::new(Rank::Two, Suit::Clubs))
            .collect();
    }

    if state.current_trick.is_empty() {
        if hearts_have_been_broken(state) {
            return basic_legal;
        }

        let non_hearts: Vec<Card> = basic_legal
            .iter()
            .copied()
            .filter(|card| card.suit != Suit::Hearts)
            .collect();
        return if non_hearts.is_empty() {
            basic_legal
        } else {
            non_hearts
        };
    }

    if state.completed_tricks.is_empty() {
        let non_penalties: Vec<Card> = basic_legal
            .iter()
            .copied()
            .filter(|card| !is_hearts_penalty_card(*card))
            .collect();
        return if non_penalties.is_empty() {
            basic_legal
        } else {
            non_penalties
        };
    }

    basic_legal
}

fn hearts_have_been_broken(state: &TrickTakingHandState) -> bool {
    state
        .completed_tricks
        .iter()
        .flat_map(|trick| trick.cards.iter())
        .chain(state.current_trick.iter())
        .any(|played| played.card.suit == Suit::Hearts)
}

fn player_with_card(state: &TrickTakingHandState, card: Card) -> Option<PlayerIndex> {
    state
        .hands
        .iter()
        .position(|hand| hand.iter().any(|held| *held == card))
}

fn find_two_of_clubs_player_for_seed(seed: u64) -> PlayerIndex {
    let state = start_trick_taking_hand("hearts-start-preview".to_string(), seed, 0);
    player_with_card(&state, Card::new(Rank::Two, Suit::Clubs)).unwrap_or(0)
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
        return highest_non_winning_card(state, &legal).or_else(|| lowest_card(&legal));
    }

    highest_non_winning_card(state, &legal).or_else(|| lowest_card(&legal))
}

fn choose_no_queens_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    choose_no_queens_policy_card(TrickPolicyContext {
        hand: &state.hands[state.current_player],
        led_suit: state.led_suit(),
        current_trick: &state.current_trick,
        current_player: state.current_player,
    })
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
        return highest_non_winning_card(state, &legal).or_else(|| lowest_card(&legal));
    }

    highest_non_winning_card(state, &legal).or_else(|| lowest_card(&legal))
}

fn choose_no_last_two_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();
    let is_late_penalty_trick = state.completed_tricks.len() >= 11;
    let is_setup_trick = state.completed_tricks.len() >= 10;

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return if is_late_penalty_trick || is_setup_trick {
            lowest_card(&legal)
        } else {
            highest_card(&legal)
        };
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if !follows_suit {
        return highest_card(&legal);
    }

    if is_late_penalty_trick || is_setup_trick {
        return highest_non_winning_card(state, &legal).or_else(|| lowest_card(&legal));
    }

    highest_card(&legal)
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

fn highest_non_winning_card(state: &TrickTakingHandState, cards: &[Card]) -> Option<Card> {
    highest_card_matching(cards, |card| !card_would_win_trick(state, card))
}

fn score_no_hearts_hand_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    score_no_hearts_trick(cards)
}

fn score_hearts_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .map(|played| {
            if played.card.suit == Suit::Hearts {
                1
            } else if played.card.rank == Rank::Queen && played.card.suit == Suit::Spades {
                13
            } else {
                0
            }
        })
        .sum()
}

fn choose_hearts_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let legal = state.legal_cards_for_player(state.current_player);
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return choose_hearts_lead_card(state, &legal);
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);
    let moon_candidate = hearts_moon_candidate(state);
    let current_winner = if state.current_trick.is_empty() {
        None
    } else {
        trick_winner_for_state(state, &state.current_trick)
    };
    let current_trick_is_loaded = hearts_trick_penalty(&state.current_trick) > 0;

    if !follows_suit {
        if let Some(candidate) = moon_candidate {
            if state.current_player != candidate && current_winner == Some(candidate) {
                return lowest_card_matching(&legal, |card| !is_hearts_penalty_card(card))
                    .or_else(|| lowest_card(&legal));
            }
        }

        return choose_hearts_void_discard(&legal, current_winner, current_trick_is_loaded);
    }

    if let Some(candidate) = moon_candidate {
        if current_trick_is_loaded {
            if state.current_player == candidate {
                return lowest_winning_card(state, &legal).or_else(|| lowest_card(&legal));
            }

            if current_winner == Some(candidate) {
                if let Some(card) = lowest_winning_card(state, &legal) {
                    return Some(card);
                }
            }
        }
    }

    if current_winner == Some(2) && !current_trick_is_loaded {
        if let Some(card) = lowest_winning_non_penalty_card(state, &legal) {
            return Some(card);
        }
    }

    if let Some(card) = highest_non_winning_card(state, &legal) {
        return Some(card);
    }

    lowest_card_matching(&legal, |card| !is_hearts_penalty_card(card))
        .or_else(|| lowest_card(&legal))
}

fn choose_hearts_lead_card(state: &TrickTakingHandState, legal: &[Card]) -> Option<Card> {
    if hearts_moon_lead_candidate(state, state.current_player) {
        return highest_card_matching(legal, |card| card.suit == Suit::Hearts)
            .or_else(|| {
                highest_card_from_shortest_suit(legal, |card| !is_hearts_penalty_card(card))
            })
            .or_else(|| highest_card(legal));
    }

    highest_card_from_shortest_suit(legal, |card| {
        !is_hearts_penalty_card(card)
            && !is_dangerous_high_spade_lead(state, state.current_player, card)
    })
    .or_else(|| {
        lowest_card_matching(legal, |card| {
            !is_hearts_penalty_card(card)
                && !is_dangerous_high_spade_lead(state, state.current_player, card)
        })
    })
    .or_else(|| lowest_card_matching(legal, |card| card.suit == Suit::Hearts))
    .or_else(|| lowest_card(legal))
}

fn is_dangerous_high_spade_lead(
    state: &TrickTakingHandState,
    player: PlayerIndex,
    card: Card,
) -> bool {
    card.suit == Suit::Spades
        && card.rank > Rank::Queen
        && queen_spades_is_unresolved_for_player(state, player)
}

fn queen_spades_is_unresolved_for_player(
    state: &TrickTakingHandState,
    player: PlayerIndex,
) -> bool {
    let queen_spades = Card::new(Rank::Queen, Suit::Spades);

    if state.hands[player].contains(&queen_spades) {
        return false;
    }

    !state
        .completed_tricks
        .iter()
        .flat_map(|trick| trick.cards.iter())
        .chain(state.current_trick.iter())
        .any(|played| played.card == queen_spades)
}

fn hearts_moon_lead_candidate(state: &TrickTakingHandState, player: PlayerIndex) -> bool {
    hearts_moon_candidate(state) == Some(player)
        && hearts_player_penalty_so_far(state, player) >= HEARTS_MOON_LEAD_THRESHOLD
}

fn hearts_player_penalty_so_far(state: &TrickTakingHandState, player: PlayerIndex) -> i32 {
    state
        .completed_tricks
        .iter()
        .filter(|trick| trick.winner == player)
        .map(|trick| trick.penalty)
        .sum()
}

fn choose_hearts_void_discard(
    legal: &[Card],
    current_winner: Option<PlayerIndex>,
    current_trick_is_loaded: bool,
) -> Option<Card> {
    let queen_spades = Card::new(Rank::Queen, Suit::Spades);

    if legal.contains(&queen_spades) {
        if current_winner == Some(2) || current_trick_is_loaded {
            return Some(queen_spades);
        }

        return highest_card_matching(legal, |card| card.suit == Suit::Hearts)
            .or_else(|| highest_card_matching(legal, |card| card != queen_spades))
            .or(Some(queen_spades));
    }

    highest_hearts_penalty_discard(legal).or_else(|| highest_card(legal))
}

fn highest_card_from_shortest_suit(
    cards: &[Card],
    predicate: impl Fn(Card) -> bool,
) -> Option<Card> {
    cards
        .iter()
        .copied()
        .filter(|card| predicate(*card))
        .min_by(|left, right| {
            suit_count(cards, left.suit)
                .cmp(&suit_count(cards, right.suit))
                .then_with(|| right.rank.cmp(&left.rank))
                .then_with(|| left.suit.short_name().cmp(right.suit.short_name()))
        })
}

fn suit_count(cards: &[Card], suit: Suit) -> usize {
    cards.iter().filter(|card| card.suit == suit).count()
}

fn hearts_moon_candidate(state: &TrickTakingHandState) -> Option<PlayerIndex> {
    let mut scores = [0, 0, 0, 0];

    for trick in &state.completed_tricks {
        scores[trick.winner] += trick.penalty;
    }

    let total: i32 = scores.iter().sum();

    if total == 0 {
        return None;
    }

    scores
        .iter()
        .enumerate()
        .find_map(|(player, score)| (*score == total).then_some(player))
}

fn hearts_trick_penalty(cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .map(|played| hearts_penalty_weight(played.card))
        .sum()
}

fn lowest_winning_card(state: &TrickTakingHandState, cards: &[Card]) -> Option<Card> {
    lowest_card_matching(cards, |card| card_would_win_trick(state, card))
}

fn lowest_winning_non_penalty_card(state: &TrickTakingHandState, cards: &[Card]) -> Option<Card> {
    lowest_card_matching(cards, |card| {
        card_would_win_trick(state, card) && !is_hearts_penalty_card(card)
    })
}

fn choose_hearts_pass_cards(hand: &[Card]) -> Vec<Card> {
    let mut cards = hand.to_vec();
    cards.sort_by_key(|card| {
        let penalty_priority = if is_hearts_penalty_card(*card) { 3 } else { 0 };
        let queen_spades_priority = if card.rank == Rank::Queen && card.suit == Suit::Spades {
            2
        } else {
            0
        };

        (
            penalty_priority + queen_spades_priority,
            card.rank as u8,
            card.suit.short_name(),
        )
    });
    cards.into_iter().rev().take(3).collect()
}

fn has_duplicate_cards(cards: &[Card]) -> bool {
    cards
        .iter()
        .enumerate()
        .any(|(index, card)| cards.iter().skip(index + 1).any(|other| other == card))
}

fn remove_card_from_hand(hand: &mut Vec<Card>, card: Card) -> Result<(), String> {
    let index = hand
        .iter()
        .position(|held_card| *held_card == card)
        .ok_or_else(|| format!("{card} is not in the hand."))?;

    hand.remove(index);
    Ok(())
}

fn score_no_queens_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .filter(|played| played.card.rank == Rank::Queen)
        .map(|_| 6)
        .sum()
}

fn score_king_of_hearts_trick(_state: &TrickTakingHandState, cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .filter(|played| is_king_of_hearts(played.card))
        .map(|_| 20)
        .sum()
}

fn score_no_last_two_trick(state: &TrickTakingHandState, _cards: &[PlayedCard]) -> i32 {
    match state.completed_tricks.len() {
        11 => 10,
        12 => 20,
        _ => 0,
    }
}

fn score_no_tricks_trick(_state: &TrickTakingHandState, _cards: &[PlayedCard]) -> i32 {
    2
}

fn score_positive_tricks_trick(_state: &TrickTakingHandState, _cards: &[PlayedCard]) -> i32 {
    5
}

fn score_whist_trick(_state: &TrickTakingHandState, _cards: &[PlayedCard]) -> i32 {
    1
}

fn choose_positive_tricks_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let hand = &state.hands[state.current_player];
    let legal = legal_cards(hand, state.led_suit());
    let led_suit = state.led_suit();

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return highest_card_matching(&legal, |card| card.suit == HEARTS_TRUMP_SUIT)
            .or_else(|| highest_card(&legal));
    }

    if let Some(winner) = lowest_card_matching(&legal, |card| card_would_win_trick(state, card)) {
        return Some(winner);
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);
    if !follows_suit {
        return lowest_card_matching(&legal, |card| card.suit != HEARTS_TRUMP_SUIT)
            .or_else(|| lowest_card(&legal));
    }

    lowest_card(&legal)
}

fn choose_whist_opponent_card(state: &TrickTakingHandState) -> Option<Card> {
    let legal = state.legal_cards_for_player(state.current_player);
    let led_suit = state.led_suit();
    let trump_suit = whist_trump_suit(state);

    if legal.is_empty() {
        return None;
    }

    if led_suit.is_none() {
        return whist_lead_card(state, &legal, trump_suit);
    }

    let current_winner = trick_winner_for_state(state, &state.current_trick);
    let partner_is_winning =
        current_winner.is_some_and(|winner| whist_same_partnership(winner, state.current_player));
    let follows_suit = legal.iter().all(|card| Some(card.suit) == led_suit);

    if follows_suit {
        if partner_is_winning {
            return lowest_card(&legal);
        }

        return lowest_card_matching(&legal, |card| card_would_win_whist_trick(state, card))
            .or_else(|| lowest_card(&legal));
    }

    if partner_is_winning {
        return lowest_card_matching(&legal, |card| card.suit != trump_suit)
            .or_else(|| lowest_card(&legal));
    }

    lowest_card_matching(&legal, |card| {
        card.suit == trump_suit && card_would_win_whist_trick(state, card)
    })
    .or_else(|| highest_card_matching(&legal, |card| card.suit != trump_suit))
    .or_else(|| lowest_card(&legal))
}

fn whist_lead_card(state: &TrickTakingHandState, legal: &[Card], trump_suit: Suit) -> Option<Card> {
    if let Some(partner_suit) = whist_partner_signal_suit(state) {
        if partner_suit != trump_suit {
            if let Some(card) = highest_card_matching(legal, |card| card.suit == partner_suit) {
                return Some(card);
            }
        }
    }

    if state.current_player == 0 {
        return highest_card_from_longest_suit(legal, |card| card.suit != trump_suit)
            .or_else(|| highest_card(legal));
    }

    highest_card_from_longest_suit(legal, |card| card.suit != trump_suit)
        .or_else(|| lowest_card_matching(legal, |card| card.suit == trump_suit))
        .or_else(|| lowest_card(legal))
}

fn whist_partner_signal_suit(state: &TrickTakingHandState) -> Option<Suit> {
    let partner = (state.current_player + 2) % 4;

    state.completed_tricks.iter().rev().find_map(|trick| {
        let led = trick.cards.first()?;
        if led.player == partner && whist_same_partnership(trick.winner, state.current_player) {
            Some(led.card.suit)
        } else {
            None
        }
    })
}

fn whist_same_partnership(left: PlayerIndex, right: PlayerIndex) -> bool {
    left % 2 == right % 2
}

fn is_king_of_hearts(card: Card) -> bool {
    card.rank == Rank::King && card.suit == Suit::Hearts
}

fn is_hearts_penalty_card(card: Card) -> bool {
    card.suit == Suit::Hearts || (card.rank == Rank::Queen && card.suit == Suit::Spades)
}

fn hearts_penalty_weight(card: Card) -> i32 {
    if card.rank == Rank::Queen && card.suit == Suit::Spades {
        13
    } else if card.suit == Suit::Hearts {
        1
    } else {
        0
    }
}

fn highest_hearts_penalty_discard(cards: &[Card]) -> Option<Card> {
    cards
        .iter()
        .copied()
        .filter(|card| is_hearts_penalty_card(*card))
        .max_by_key(|card| (hearts_penalty_weight(*card), card.rank as u8))
}

fn card_would_win_trick(state: &TrickTakingHandState, card: Card) -> bool {
    if is_hearts_trumps_state(state) {
        return card_would_win_trump_trick(state, card, HEARTS_TRUMP_SUIT);
    }
    if is_whist_state(state) {
        return card_would_win_whist_trick(state, card);
    }

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

fn card_would_win_whist_trick(state: &TrickTakingHandState, card: Card) -> bool {
    card_would_win_trump_trick(state, card, whist_trump_suit(state))
}

fn card_would_win_trump_trick(state: &TrickTakingHandState, card: Card, trump_suit: Suit) -> bool {
    let Some(led_suit) = state.led_suit() else {
        return true;
    };
    let mut simulated = state.current_trick.clone();
    simulated.push(PlayedCard::new(state.current_player, card));
    let Some(winner) = trump_trick_winner(&simulated, trump_suit) else {
        return true;
    };

    if card.suit != led_suit && card.suit != trump_suit {
        return false;
    }

    winner == state.current_player
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

fn highest_card_from_longest_suit(
    cards: &[Card],
    predicate: impl Fn(Card) -> bool,
) -> Option<Card> {
    cards
        .iter()
        .copied()
        .filter(|card| predicate(*card))
        .max_by(|left, right| {
            suit_count(cards, left.suit)
                .cmp(&suit_count(cards, right.suit))
                .then_with(|| left.rank.cmp(&right.rank))
                .then_with(|| left.suit.short_name().cmp(right.suit.short_name()))
        })
}

fn card_sort_key(card: &Card) -> (u8, &'static str) {
    (card.rank as u8, card.suit.short_name())
}

fn sort_hand(hand: &mut [Card]) {
    hand.sort_by_key(|card| (card.suit.sort_order(), card.rank as u8));
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
    fn whist_hand_deals_with_trump_and_advances_to_player() {
        let state = start_whist_hand(8);
        let dealer = whist_dealer_for_seed(8);
        let leader = (dealer + 1) % 4;
        let trump_card = shuffled_standard_deck(8)[dealer + 48];

        assert_eq!(
            state.id,
            format!(
                "whist-hand-8-dealer-{dealer}-{}",
                trump_card.suit.short_name()
            )
        );
        assert_eq!(state.hands.iter().map(Vec::len).sum::<usize>(), 51);
        assert_eq!(state.current_player, 2);
        assert_eq!(state.current_trick.len(), 1);
        assert_eq!(state.current_trick[0].player, leader);
        assert_eq!(state.status, HandStatus::InProgress);
    }

    #[test]
    fn whist_dealer_left_leads_when_player_is_left_of_dealer() {
        let state = start_whist_hand(9);
        let dealer = whist_dealer_for_seed(9);
        let leader = (dealer + 1) % 4;
        let trump_card = shuffled_standard_deck(9)[dealer + 48];

        assert_eq!(dealer, 1);
        assert_eq!(leader, 2);
        assert_eq!(
            state.id,
            format!(
                "whist-hand-9-dealer-{dealer}-{}",
                trump_card.suit.short_name()
            )
        );
        assert_eq!(state.current_player, 2);
        assert!(state.current_trick.is_empty());
        assert_eq!(state.hands.iter().map(Vec::len).sum::<usize>(), 52);
    }

    #[test]
    fn spades_hand_uses_spades_as_fixed_trump() {
        let state = start_spades_hand(8);

        assert!(state.id.ends_with("-S"));

        let trick = vec![
            PlayedCard::new(1, Card::new(Rank::Ace, Suit::Hearts)),
            PlayedCard::new(2, Card::new(Rank::Two, Suit::Spades)),
            PlayedCard::new(3, Card::new(Rank::King, Suit::Hearts)),
            PlayedCard::new(0, Card::new(Rank::Three, Suit::Hearts)),
        ];

        assert_eq!(trick_winner_for_state(&state, &trick), Some(2));
    }

    #[test]
    fn whist_player_must_follow_suit() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::King, Suit::Clubs),
                ],
                Vec::new(),
            ],
            current_player: 2,
            current_trick: vec![PlayedCard::new(1, Card::new(Rank::Nine, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            state.legal_player_cards(),
            vec![
                Card::new(Rank::Two, Suit::Clubs),
                Card::new(Rank::King, Suit::Clubs)
            ]
        );
    }

    #[test]
    fn whist_trump_can_win_against_led_suit() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [Vec::new(), Vec::new(), Vec::new(), Vec::new()],
            current_player: 2,
            current_trick: Vec::new(),
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };
        let trick = vec![
            PlayedCard::new(1, Card::new(Rank::Ace, Suit::Hearts)),
            PlayedCard::new(2, Card::new(Rank::Two, Suit::Spades)),
            PlayedCard::new(3, Card::new(Rank::King, Suit::Hearts)),
            PlayedCard::new(0, Card::new(Rank::Three, Suit::Hearts)),
        ];

        assert_eq!(trick_winner_for_state(&state, &trick), Some(2));
    }

    #[test]
    fn whist_opponent_preserves_trump_when_partner_is_winning() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Spades),
                    Card::new(Rank::Nine, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(1, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
                PlayedCard::new(0, Card::new(Rank::Queen, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_whist_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Diamonds))
        );
    }

    #[test]
    fn whist_opponent_cuts_with_low_trump_when_opponents_are_winning() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Spades),
                    Card::new(Rank::Nine, Suit::Spades),
                    Card::new(Rank::Queen, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(1, Card::new(Rank::King, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(0, Card::new(Rank::Queen, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_whist_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Spades))
        );
    }

    #[test]
    fn whist_opponent_follows_low_when_partner_is_winning() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::Queen, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(1, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
                PlayedCard::new(0, Card::new(Rank::Nine, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_whist_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Clubs))
        );
    }

    #[test]
    fn whist_opponent_follows_high_enough_when_opponents_are_winning() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(1, Card::new(Rank::Nine, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Queen, Suit::Clubs)),
                PlayedCard::new(0, Card::new(Rank::Ten, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_whist_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Clubs))
        );
    }

    #[test]
    fn whist_partner_returns_player_suit_when_leading() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                vec![
                    Card::new(Rank::Ace, Suit::Clubs),
                    Card::new(Rank::Three, Suit::Diamonds),
                    Card::new(Rank::Two, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            current_player: 0,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
                    PlayedCard::new(3, Card::new(Rank::Two, Suit::Clubs)),
                    PlayedCard::new(0, Card::new(Rank::Ten, Suit::Clubs)),
                    PlayedCard::new(1, Card::new(Rank::Four, Suit::Clubs)),
                ],
                winner: 2,
                penalty: 1,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_whist_opponent_card(&state),
            Some(Card::new(Rank::Ace, Suit::Clubs))
        );
    }

    #[test]
    fn whist_partner_signal_does_not_return_trump_on_lead() {
        let state = WhistHandState {
            id: "whist-hand-test-S".to_string(),
            hands: [
                vec![
                    Card::new(Rank::Ace, Suit::Clubs),
                    Card::new(Rank::Three, Suit::Diamonds),
                    Card::new(Rank::Two, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            current_player: 0,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(2, Card::new(Rank::King, Suit::Spades)),
                    PlayedCard::new(3, Card::new(Rank::Two, Suit::Spades)),
                    PlayedCard::new(0, Card::new(Rank::Ten, Suit::Spades)),
                    PlayedCard::new(1, Card::new(Rank::Four, Suit::Spades)),
                ],
                winner: 2,
                penalty: 1,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_whist_opponent_card(&state),
            Some(Card::new(Rank::Ace, Suit::Clubs))
        );
    }

    #[test]
    fn whist_completed_trick_tags_partner_support_and_overtake_avoidance() {
        let trick = CompletedTrick {
            cards: vec![
                PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Two, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
                PlayedCard::new(3, Card::new(Rank::Three, Suit::Clubs)),
            ],
            winner: 0,
            penalty: 1,
        };

        let tags = completed_trick_tactical_tags("Whist", 1, &trick);

        assert!(tags.contains(&"partner_trick"));
        assert!(tags.contains(&"partner_held"));
        assert!(tags.contains(&"partner_supported"));
        assert!(tags.contains(&"third_hand_high"));
        assert!(tags.contains(&"avoided_overtake"));
    }

    #[test]
    fn whist_completed_hand_has_odd_tricks_for_one_partnership() {
        let mut state = start_whist_hand(8);

        while state.status != HandStatus::Complete {
            let card = state
                .legal_player_cards()
                .first()
                .copied()
                .expect("player should have a legal Whist card while the hand is in progress");
            state = play_whist_card(state, card).expect("legal Whist card should play");
        }

        let player_side_tricks = state
            .completed_tricks
            .iter()
            .filter(|trick| trick.winner == 0 || trick.winner == 2)
            .count();
        let opponent_side_tricks = state
            .completed_tricks
            .iter()
            .filter(|trick| trick.winner == 1 || trick.winner == 3)
            .count();

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(player_side_tricks + opponent_side_tricks, 13);
        assert!(
            player_side_tricks > 6 || opponent_side_tricks > 6,
            "one Whist partnership should always score odd tricks in a completed 13-trick hand"
        );
    }

    #[test]
    fn hearts_first_trick_must_open_with_two_of_clubs() {
        let state = HeartsHandState {
            id: "hearts-hand-test".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::Queen, Suit::Spades),
                ],
                Vec::new(),
            ],
            current_player: 2,
            current_trick: Vec::new(),
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            state.legal_player_cards(),
            vec![Card::new(Rank::Two, Suit::Clubs)]
        );
    }

    #[test]
    fn hearts_first_trick_blocks_penalties_when_void_and_safe_cards_exist() {
        let state = HeartsHandState {
            id: "hearts-hand-test".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Three, Suit::Diamonds),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::Queen, Suit::Spades),
                ],
                Vec::new(),
            ],
            current_player: 2,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            state.legal_player_cards(),
            vec![Card::new(Rank::Three, Suit::Diamonds)]
        );
    }

    #[test]
    fn hearts_cannot_be_led_before_broken_when_non_hearts_exist() {
        let state = HeartsHandState {
            id: "hearts-hand-test".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::Ace, Suit::Spades),
                ],
                Vec::new(),
            ],
            current_player: 2,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
                    PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
                    PlayedCard::new(2, Card::new(Rank::Four, Suit::Clubs)),
                    PlayedCard::new(3, Card::new(Rank::Five, Suit::Clubs)),
                ],
                winner: 3,
                penalty: 0,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            state.legal_player_cards(),
            vec![Card::new(Rank::Ace, Suit::Spades)]
        );
    }

    #[test]
    fn hearts_can_be_led_after_hearts_are_broken() {
        let state = HeartsHandState {
            id: "hearts-hand-test".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::Ace, Suit::Spades),
                ],
                Vec::new(),
            ],
            current_player: 2,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
                    PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
                    PlayedCard::new(2, Card::new(Rank::Four, Suit::Hearts)),
                    PlayedCard::new(3, Card::new(Rank::Five, Suit::Clubs)),
                ],
                winner: 3,
                penalty: 1,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            state.legal_player_cards(),
            vec![
                Card::new(Rank::Two, Suit::Hearts),
                Card::new(Rank::Ace, Suit::Spades)
            ]
        );
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
    fn completed_trick_tags_void_discard_and_moved_danger_card() {
        let trick = CompletedTrick {
            cards: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Queen, Suit::Diamonds)),
                PlayedCard::new(2, Card::new(Rank::Two, Suit::Hearts)),
                PlayedCard::new(3, Card::new(Rank::Four, Suit::Clubs)),
            ],
            winner: 0,
            penalty: 6,
        };

        let tags = completed_trick_tactical_tags("No Queens", 4, &trick);

        assert!(tags.contains(&"void_discard"));
        assert!(tags.contains(&"danger_card_moved"));
    }

    #[test]
    fn completed_trick_tags_no_last_two_phase() {
        let trick = CompletedTrick {
            cards: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Two, Suit::Clubs)),
                PlayedCard::new(3, Card::new(Rank::Four, Suit::Clubs)),
            ],
            winner: 1,
            penalty: 0,
        };

        assert!(completed_trick_tactical_tags("No Last Two", 11, &trick).contains(&"setup_trick"));
        assert!(
            completed_trick_tactical_tags("No Last Two", 12, &trick).contains(&"final_two_trick")
        );
    }

    #[test]
    fn completed_trick_tags_trump_wins_and_overtrumps() {
        let trick = CompletedTrick {
            cards: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Four, Suit::Hearts)),
                PlayedCard::new(2, Card::new(Rank::Two, Suit::Clubs)),
                PlayedCard::new(3, Card::new(Rank::Nine, Suit::Hearts)),
            ],
            winner: 3,
            penalty: 5,
        };

        let tags = completed_trick_tactical_tags("Hearts Trumps", 2, &trick);

        assert!(tags.contains(&"trump_won"));
        assert!(tags.contains(&"overtrumped"));
    }

    #[test]
    fn hearts_tactical_tags_identify_queen_and_heart_pressure() {
        let trick = CompletedTrick {
            cards: vec![
                PlayedCard::new(1, Card::new(Rank::King, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(3, Card::new(Rank::Queen, Suit::Spades)),
                PlayedCard::new(0, Card::new(Rank::Two, Suit::Hearts)),
            ],
            winner: 2,
            penalty: 14,
        };

        let tags = completed_trick_tactical_tags("Hearts", 6, &trick);

        assert!(tags.contains(&"danger_card_moved"));
        assert!(tags.contains(&"queen_spades_moved"));
        assert!(tags.contains(&"hearts_moved"));
        assert!(tags.contains(&"opponent_loaded_player_trick"));
        assert!(tags.contains(&"pressure_lead"));
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
    fn opponent_ducks_clean_avoidance_trick_with_highest_loser() {
        let state = NoHeartsHandState {
            id: "opponent-duck-clean".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Clubs),
                    Card::new(Rank::Nine, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Ten, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_hearts_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Clubs))
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
    fn no_hearts_hand_scores_ace_as_six_and_other_hearts_as_two() {
        let state = start_trick_taking_hand("score-no-hearts".to_string(), 3, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Ace, Suit::Hearts)),
            PlayedCard::new(1, Card::new(Rank::Two, Suit::Hearts)),
            PlayedCard::new(2, Card::new(Rank::Queen, Suit::Spades)),
            PlayedCard::new(3, Card::new(Rank::King, Suit::Hearts)),
        ];

        assert_eq!(score_no_hearts_hand_trick(&state, &trick), 10);
    }

    #[test]
    fn hearts_hand_scores_hearts_and_queen_of_spades() {
        let state = start_trick_taking_hand("score-hearts".to_string(), 3, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Ace, Suit::Hearts)),
            PlayedCard::new(1, Card::new(Rank::Queen, Suit::Spades)),
            PlayedCard::new(2, Card::new(Rank::Two, Suit::Hearts)),
            PlayedCard::new(3, Card::new(Rank::Four, Suit::Clubs)),
        ];

        assert_eq!(score_hearts_trick(&state, &trick), 15);
    }

    #[test]
    fn hearts_passing_hand_starts_before_first_trick() {
        let state = start_hearts_passing_hand(61);

        assert_eq!(state.hands.iter().map(Vec::len).sum::<usize>(), 52);
        assert_eq!(state.current_player, 2);
        assert_eq!(state.current_trick.len(), 0);
        assert_eq!(state.completed_tricks.len(), 0);
        assert_eq!(state.legal_player_cards().len(), 13);
    }

    #[test]
    fn hearts_pass_moves_three_player_cards_left_then_starts_play() {
        let state = start_hearts_passing_hand(61);
        let passed_cards = state.hands[2].iter().copied().take(3).collect::<Vec<_>>();
        let left_before = state.hands[3].clone();
        let next_state =
            apply_hearts_pass(state, passed_cards.clone()).expect("three cards should pass");

        for card in passed_cards {
            assert!(!next_state.hands[2].contains(&card));
            assert!(next_state.hands[3].contains(&card));
        }

        assert_eq!(next_state.hands[2].len(), 13);
        assert_eq!(next_state.hands[3].len(), 13);
        assert!(left_before
            .iter()
            .any(|card| !next_state.hands[3].contains(card)));
        assert_eq!(next_state.current_player, 2);
        assert!(!next_state.current_trick.is_empty());
    }

    #[test]
    fn hearts_pass_can_move_right_or_across() {
        fn player_still_controls_card(
            state: &HeartsHandState,
            player: PlayerIndex,
            card: Card,
        ) -> bool {
            state.hands[player].contains(&card)
                || state
                    .current_trick
                    .iter()
                    .any(|played| played.player == player && played.card == card)
        }

        let right_state = start_hearts_passing_hand(61);
        let right_cards = right_state.hands[2]
            .iter()
            .copied()
            .take(3)
            .collect::<Vec<_>>();
        let right_next = apply_hearts_pass_direction(right_state, right_cards.clone(), 3)
            .expect("three cards should pass right");

        for card in right_cards {
            assert!(!right_next.hands[2].contains(&card));
            assert!(player_still_controls_card(&right_next, 1, card));
        }

        let across_state = start_hearts_passing_hand(62);
        let across_cards = across_state.hands[2]
            .iter()
            .copied()
            .take(3)
            .collect::<Vec<_>>();
        let across_next = apply_hearts_pass_direction(across_state, across_cards.clone(), 2)
            .expect("three cards should pass across");

        for card in across_cards {
            assert!(!across_next.hands[2].contains(&card));
            assert!(player_still_controls_card(&across_next, 0, card));
        }
    }

    #[test]
    fn hearts_pass_requires_three_distinct_player_cards() {
        let state = start_hearts_passing_hand(61);
        let one_card = state.hands[2][0];
        let result = apply_hearts_pass(state.clone(), vec![one_card, one_card, one_card]);

        assert!(result.is_err());

        let result = apply_hearts_pass(state, vec![one_card]);

        assert!(result.is_err());
    }

    #[test]
    fn hearts_opponent_leads_high_from_short_safe_suit() {
        let state = HeartsHandState {
            id: "hearts-pressure-short-suit".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                    Card::new(Rank::Five, Suit::Diamonds),
                    Card::new(Rank::Nine, Suit::Spades),
                    Card::new(Rank::Ace, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
                    PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
                    PlayedCard::new(2, Card::new(Rank::Four, Suit::Clubs)),
                    PlayedCard::new(3, Card::new(Rank::Five, Suit::Clubs)),
                ],
                winner: 3,
                penalty: 0,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Spades))
        );
    }

    #[test]
    fn hearts_opponent_avoids_high_heart_lead_without_moon_plan() {
        let state = HeartsHandState {
            id: "hearts-avoid-casual-ace-heart-lead".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
                    Card::new(Rank::Nine, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Four, Suit::Diamonds)),
                    PlayedCard::new(1, Card::new(Rank::Six, Suit::Diamonds)),
                    PlayedCard::new(2, Card::new(Rank::Ace, Suit::Hearts)),
                    PlayedCard::new(3, Card::new(Rank::Seven, Suit::Diamonds)),
                ],
                winner: 3,
                penalty: 1,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Spades))
        );
    }

    #[test]
    fn hearts_opponent_avoids_ace_spades_lead_while_queen_spades_is_live() {
        let state = HeartsHandState {
            id: "hearts-avoid-ace-spades-lead-with-queen-live".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Ace, Suit::Spades),
                    Card::new(Rank::King, Suit::Diamonds),
                    Card::new(Rank::Nine, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Hearts),
                ],
                vec![Card::new(Rank::Queen, Suit::Spades)],
                Vec::new(),
            ],
            current_player: 1,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Four, Suit::Diamonds)),
                    PlayedCard::new(1, Card::new(Rank::Six, Suit::Diamonds)),
                    PlayedCard::new(2, Card::new(Rank::Ace, Suit::Hearts)),
                    PlayedCard::new(3, Card::new(Rank::Seven, Suit::Diamonds)),
                ],
                winner: 3,
                penalty: 1,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Diamonds))
        );
    }

    #[test]
    fn hearts_opponent_can_lead_ace_spades_after_queen_spades_is_known() {
        let state = HeartsHandState {
            id: "hearts-ace-spades-safe-after-queen".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Ace, Suit::Spades),
                    Card::new(Rank::King, Suit::Diamonds),
                    Card::new(Rank::Nine, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Four, Suit::Spades)),
                    PlayedCard::new(1, Card::new(Rank::Queen, Suit::Spades)),
                    PlayedCard::new(2, Card::new(Rank::Ace, Suit::Hearts)),
                    PlayedCard::new(3, Card::new(Rank::Seven, Suit::Spades)),
                ],
                winner: 3,
                penalty: 14,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Ace, Suit::Spades))
        );
    }

    #[test]
    fn hearts_opponent_forced_to_lead_hearts_uses_lowest_heart_without_moon_plan() {
        let state = HeartsHandState {
            id: "hearts-forced-low-heart-lead".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::Ace, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(0, Card::new(Rank::Four, Suit::Diamonds)),
                    PlayedCard::new(1, Card::new(Rank::Six, Suit::Diamonds)),
                    PlayedCard::new(2, Card::new(Rank::Ace, Suit::Hearts)),
                    PlayedCard::new(3, Card::new(Rank::Seven, Suit::Diamonds)),
                ],
                winner: 3,
                penalty: 1,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Hearts))
        );
    }

    #[test]
    fn hearts_serious_moon_candidate_can_lead_high_heart() {
        let state = HeartsHandState {
            id: "hearts-moon-candidate-leads-high-heart".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::Nine, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: Vec::new(),
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(1, Card::new(Rank::Queen, Suit::Spades)),
                    PlayedCard::new(2, Card::new(Rank::Ace, Suit::Hearts)),
                    PlayedCard::new(3, Card::new(Rank::Seven, Suit::Diamonds)),
                    PlayedCard::new(0, Card::new(Rank::Six, Suit::Diamonds)),
                ],
                winner: 1,
                penalty: 14,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Ace, Suit::Hearts))
        );
    }

    #[test]
    fn hearts_opponent_void_avoids_feeding_player_moon_candidate() {
        let state = HeartsHandState {
            id: "hearts-stop-feeding-player-moon".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Spades),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::Two, Suit::Diamonds),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(2, Card::new(Rank::Ace, Suit::Clubs))],
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
                    PlayedCard::new(3, Card::new(Rank::Queen, Suit::Spades)),
                    PlayedCard::new(0, Card::new(Rank::Two, Suit::Hearts)),
                    PlayedCard::new(1, Card::new(Rank::Three, Suit::Hearts)),
                ],
                winner: 2,
                penalty: 15,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Diamonds))
        );
    }

    #[test]
    fn hearts_opponent_takes_loaded_trick_away_from_moon_candidate() {
        let state = HeartsHandState {
            id: "hearts-steal-loaded-player-moon".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Ace, Suit::Clubs),
                    Card::new(Rank::Three, Suit::Clubs),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![
                PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
                PlayedCard::new(3, Card::new(Rank::Two, Suit::Hearts)),
            ],
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(2, Card::new(Rank::Queen, Suit::Clubs)),
                    PlayedCard::new(3, Card::new(Rank::Queen, Suit::Spades)),
                    PlayedCard::new(0, Card::new(Rank::Three, Suit::Hearts)),
                    PlayedCard::new(1, Card::new(Rank::Four, Suit::Hearts)),
                ],
                winner: 2,
                penalty: 15,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Ace, Suit::Clubs))
        );
    }

    #[test]
    fn hearts_opponent_moon_candidate_captures_loaded_trick() {
        let state = HeartsHandState {
            id: "hearts-opponent-pursues-moon".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::King, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Clubs),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Ten, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Two, Suit::Hearts)),
            ],
            completed_tricks: vec![CompletedTrick {
                cards: vec![
                    PlayedCard::new(1, Card::new(Rank::Queen, Suit::Clubs)),
                    PlayedCard::new(2, Card::new(Rank::Queen, Suit::Spades)),
                    PlayedCard::new(3, Card::new(Rank::Three, Suit::Hearts)),
                    PlayedCard::new(0, Card::new(Rank::Four, Suit::Hearts)),
                ],
                winner: 1,
                penalty: 15,
            }],
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Clubs))
        );
    }

    #[test]
    fn hearts_opponent_takes_clean_trick_from_player_with_lowest_safe_winner() {
        let state = HeartsHandState {
            id: "hearts-pressure-player-clean-trick".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Nine, Suit::Clubs),
                    Card::new(Rank::Ace, Suit::Clubs),
                    Card::new(Rank::Queen, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(2, Card::new(Rank::Seven, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Clubs))
        );
    }

    #[test]
    fn hearts_opponent_does_not_take_loaded_trick_from_player_without_moon_pressure() {
        let state = HeartsHandState {
            id: "hearts-avoid-player-loaded-trick".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::Nine, Suit::Clubs),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![
                PlayedCard::new(2, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(3, Card::new(Rank::Two, Suit::Hearts)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Clubs))
        );
    }

    #[test]
    fn hearts_opponent_holds_queen_of_spades_on_clean_opponent_trick() {
        let state = HeartsHandState {
            id: "hearts-hold-queen-spades".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Spades),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
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
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Ace, Suit::Hearts))
        );
    }

    #[test]
    fn hearts_opponent_dumps_queen_of_spades_on_player_winning_trick() {
        let state = HeartsHandState {
            id: "hearts-dump-queen-spades-on-player".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Spades),
                    Card::new(Rank::Ace, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Ace, Suit::Clubs)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Queen, Suit::Spades))
        );
    }

    #[test]
    fn hearts_opponent_avoids_winning_with_queen_of_spades_when_possible() {
        let state = HeartsHandState {
            id: "hearts-avoid-queen-spades-win".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Spades),
                    Card::new(Rank::King, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Jack, Suit::Spades))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Spades))
        );
    }

    #[test]
    fn hearts_opponent_dumps_queen_of_spades_under_higher_spade() {
        let state = HeartsHandState {
            id: "hearts-dump-queen-under-ace".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Three, Suit::Spades),
                    Card::new(Rank::Queen, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Ace, Suit::Spades))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_hearts_opponent_card(&state),
            Some(Card::new(Rank::Queen, Suit::Spades))
        );
    }

    #[test]
    fn no_queens_trick_scores_six_points_per_queen() {
        let state = start_trick_taking_hand("score-no-queens".to_string(), 3, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Queen, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Two, Suit::Clubs)),
            PlayedCard::new(2, Card::new(Rank::Queen, Suit::Hearts)),
            PlayedCard::new(3, Card::new(Rank::Ace, Suit::Clubs)),
        ];

        assert_eq!(score_no_queens_trick(&state, &trick), 12);
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
    fn no_queens_opponent_ducks_clean_trick_before_loading_queen() {
        let state = NoQueensHandState {
            id: "opponent-duck-clean-no-queens".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Diamonds),
                    Card::new(Rank::Nine, Suit::Diamonds),
                    Card::new(Rank::Queen, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Ten, Suit::Diamonds))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_queens_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Diamonds))
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
    fn no_queens_opponent_dumps_queen_under_locked_winner() {
        let state = NoQueensHandState {
            id: "opponent-dump-queen-under-ace".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_queens_opponent_card(&state),
            Some(Card::new(Rank::Queen, Suit::Clubs))
        );
    }

    #[test]
    fn no_queens_opponent_dumps_queen_under_king() {
        let state = NoQueensHandState {
            id: "opponent-dump-queen-under-king".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Queen, Suit::Clubs),
                    Card::new(Rank::Nine, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::King, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_queens_opponent_card(&state),
            Some(Card::new(Rank::Queen, Suit::Clubs))
        );
    }

    #[test]
    fn no_queens_opponent_uses_lowest_card_when_forced_to_win_loaded_trick() {
        let state = NoQueensHandState {
            id: "opponent-forced-win-loaded-queen".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::King, Suit::Clubs),
                    Card::new(Rank::Ace, Suit::Clubs),
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
            Some(Card::new(Rank::King, Suit::Clubs))
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

        assert_eq!(score_king_of_hearts_trick(&state, &trick), 20);
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
    fn king_of_hearts_opponent_sheds_king_under_locked_ace() {
        let state = KingOfHeartsHandState {
            id: "opponent-shed-king-under-ace".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::King, Suit::Hearts),
                    Card::new(Rank::Queen, Suit::Hearts),
                    Card::new(Rank::Two, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Ace, Suit::Hearts))],
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
        assert_eq!(state.total_penalty(), 20);
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
        assert_eq!(state.total_penalty(), 24);
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
        assert_eq!(state.total_penalty(), 30);
    }

    #[test]
    fn hearts_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_hearts_hand(61);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state = play_hearts_card(state, legal_card).expect("first legal card should play");
        }

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(state.cards_remaining(), 0);
        assert_eq!(state.total_penalty(), 26);
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
        assert_eq!(score_no_last_two_trick(&state, &trick), 10);

        state.completed_tricks = repeat_clean_tricks(12);
        assert_eq!(score_no_last_two_trick(&state, &trick), 20);
    }

    #[test]
    fn no_last_two_opponent_sheds_high_cards_before_final_two() {
        let state = NoLastTwoHandState {
            id: "opponent-shed-high-no-last-two".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
            ],
            completed_tricks: repeat_clean_tricks(8),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_last_two_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Clubs))
        );
    }

    #[test]
    fn no_last_two_opponent_ducks_final_two_when_possible() {
        let state = NoLastTwoHandState {
            id: "opponent-duck-late-no-last-two".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
            ],
            completed_tricks: repeat_clean_tricks(11),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_last_two_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Clubs))
        );
    }

    #[test]
    fn no_last_two_opponent_ducks_trick_eleven_to_avoid_leading_penalty_tricks() {
        let state = NoLastTwoHandState {
            id: "opponent-setup-late-no-last-two".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Seven, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Eight, Suit::Clubs)),
            ],
            completed_tricks: repeat_clean_tricks(10),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_last_two_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Clubs))
        );
    }

    #[test]
    fn no_last_two_opponent_leads_low_on_setup_trick() {
        let state = NoLastTwoHandState {
            id: "opponent-lead-low-setup-no-last-two".to_string(),
            hands: [
                vec![
                    Card::new(Rank::Two, Suit::Clubs),
                    Card::new(Rank::King, Suit::Spades),
                ],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            current_player: 0,
            current_trick: Vec::new(),
            completed_tricks: repeat_clean_tricks(10),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_no_last_two_opponent_card(&state),
            Some(Card::new(Rank::Two, Suit::Clubs))
        );
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
        assert_eq!(state.total_penalty(), 30);
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

        assert_eq!(score_no_tricks_trick(&state, &trick), 2);
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
        assert_eq!(state.total_penalty(), 26);
    }

    #[test]
    fn positive_tricks_scores_every_trick() {
        let state = start_trick_taking_hand("score-positive-tricks".to_string(), 37, 0);
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
            PlayedCard::new(2, Card::new(Rank::Four, Suit::Clubs)),
            PlayedCard::new(3, Card::new(Rank::Five, Suit::Clubs)),
        ];

        assert_eq!(score_positive_tricks_trick(&state, &trick), 5);
    }

    #[test]
    fn hearts_trumps_opponent_leads_highest_heart() {
        let state = PositiveTricksHandState {
            id: "hearts-trumps-hand-opponent-lead".to_string(),
            hands: [
                vec![
                    Card::new(Rank::Ace, Suit::Spades),
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
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
            choose_positive_tricks_opponent_card(&state),
            Some(Card::new(Rank::King, Suit::Hearts))
        );
    }

    #[test]
    fn hearts_trumps_opponent_uses_lowest_winning_trump_when_void() {
        let state = PositiveTricksHandState {
            id: "hearts-trumps-hand-opponent-trump".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Diamonds),
                    Card::new(Rank::Three, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
                ],
                Vec::new(),
                Vec::new(),
            ],
            current_player: 1,
            current_trick: vec![PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs))],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_positive_tricks_opponent_card(&state),
            Some(Card::new(Rank::Three, Suit::Hearts))
        );
    }

    #[test]
    fn hearts_trumps_opponent_overtrumps_with_lowest_winning_heart() {
        let state = PositiveTricksHandState {
            id: "hearts-trumps-hand-opponent-overtrump".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Diamonds),
                    Card::new(Rank::Six, Suit::Hearts),
                    Card::new(Rank::Eight, Suit::Hearts),
                    Card::new(Rank::King, Suit::Hearts),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Three, Suit::Clubs)),
                PlayedCard::new(2, Card::new(Rank::Seven, Suit::Hearts)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_positive_tricks_opponent_card(&state),
            Some(Card::new(Rank::Eight, Suit::Hearts))
        );
    }

    #[test]
    fn hearts_trumps_opponent_preserves_trump_when_it_cannot_overtrump() {
        let state = PositiveTricksHandState {
            id: "hearts-trumps-hand-opponent-preserve-trump".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Two, Suit::Hearts),
                    Card::new(Rank::Three, Suit::Diamonds),
                ],
            ],
            current_player: 3,
            current_trick: vec![
                PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs)),
                PlayedCard::new(1, Card::new(Rank::Ace, Suit::Hearts)),
            ],
            completed_tricks: Vec::new(),
            status: HandStatus::InProgress,
        };

        assert_eq!(
            choose_positive_tricks_opponent_card(&state),
            Some(Card::new(Rank::Three, Suit::Diamonds))
        );
    }

    #[test]
    fn hearts_trumps_opponent_uses_lowest_winning_led_suit_card() {
        let state = PositiveTricksHandState {
            id: "hearts-trumps-hand-opponent-led-suit-winner".to_string(),
            hands: [
                Vec::new(),
                vec![
                    Card::new(Rank::Nine, Suit::Clubs),
                    Card::new(Rank::King, Suit::Clubs),
                    Card::new(Rank::Two, Suit::Hearts),
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
            choose_positive_tricks_opponent_card(&state),
            Some(Card::new(Rank::Nine, Suit::Clubs))
        );
    }

    #[test]
    fn hearts_trumps_uses_led_suit_when_no_trump_appears() {
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Two, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::King, Suit::Clubs)),
            PlayedCard::new(2, Card::new(Rank::Ace, Suit::Spades)),
            PlayedCard::new(3, Card::new(Rank::Queen, Suit::Clubs)),
        ];

        assert_eq!(trump_trick_winner(&trick, Suit::Hearts), Some(1));
    }

    #[test]
    fn hearts_trumps_heart_beats_led_suit() {
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Two, Suit::Hearts)),
            PlayedCard::new(2, Card::new(Rank::King, Suit::Clubs)),
            PlayedCard::new(3, Card::new(Rank::Queen, Suit::Clubs)),
        ];

        assert_eq!(trump_trick_winner(&trick, Suit::Hearts), Some(1));
    }

    #[test]
    fn hearts_trumps_highest_heart_wins_when_multiple_trumps_appear() {
        let trick = vec![
            PlayedCard::new(0, Card::new(Rank::Ace, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Two, Suit::Hearts)),
            PlayedCard::new(2, Card::new(Rank::King, Suit::Hearts)),
            PlayedCard::new(3, Card::new(Rank::Queen, Suit::Clubs)),
        ];

        assert_eq!(trump_trick_winner(&trick, Suit::Hearts), Some(2));
    }

    #[test]
    fn positive_tricks_hand_can_be_completed_by_playing_first_legal_card() {
        let mut state = start_positive_tricks_hand(43);

        while state.status == HandStatus::InProgress {
            let legal_card = state.legal_player_cards()[0];
            state =
                play_positive_tricks_card(state, legal_card).expect("first legal card should play");
        }

        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(state.cards_remaining(), 0);
        assert_eq!(state.total_penalty(), 65);
    }

    fn score_completed_tricks(state: &NoHeartsHandState) -> i32 {
        state
            .completed_tricks
            .iter()
            .map(|trick| crate::trick::score_no_hearts_trick(&trick.cards))
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
