use crate::cards::{standard_deck, Card, Rank, Suit};

pub type PlayerIndex = usize;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DominoHandState {
    pub id: String,
    pub hands: [Vec<Card>; 4],
    pub current_player: PlayerIndex,
    pub layout: [Vec<Card>; 4],
    pub passed_players: Vec<PlayerIndex>,
    pub out_order: Vec<PlayerIndex>,
    pub status: DominoStatus,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DominoStatus {
    InProgress,
    Complete,
}

impl DominoStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            DominoStatus::InProgress => "in_progress",
            DominoStatus::Complete => "complete",
        }
    }
}

pub const DOMINO_START_RANK: Rank = Rank::Seven;
const DOMINO_SCORES: [i32; 4] = [45, 20, 5, -5];

pub fn start_domino_hand(seed: u64) -> DominoHandState {
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

    advance_to_player_turn(DominoHandState {
        id: format!("domino-hand-{seed}"),
        hands,
        current_player: 0,
        layout: [Vec::new(), Vec::new(), Vec::new(), Vec::new()],
        passed_players: Vec::new(),
        out_order: Vec::new(),
        status: DominoStatus::InProgress,
    })
}

pub fn play_domino_card(
    mut state: DominoHandState,
    player_card: Card,
) -> Result<DominoHandState, String> {
    if state.status == DominoStatus::Complete {
        return Err("The hand is already complete.".to_string());
    }
    if state.current_player != 2 {
        return Err("It is not your turn.".to_string());
    }

    let legal_cards = state.legal_cards_for_player(2);
    if !legal_cards.contains(&player_card) {
        return Err(format!(
            "{} is not legal in the Domino layout.",
            player_card
        ));
    }

    play_card_for_current_player(&mut state, player_card)?;
    Ok(advance_to_player_turn(state))
}

pub fn pass_domino_turn(mut state: DominoHandState) -> Result<DominoHandState, String> {
    if state.status == DominoStatus::Complete {
        return Err("The hand is already complete.".to_string());
    }
    if state.current_player != 2 {
        return Err("It is not your turn.".to_string());
    }
    if !state.legal_cards_for_player(2).is_empty() {
        return Err("You have a legal Domino placement.".to_string());
    }

    pass_current_player(&mut state);
    Ok(advance_to_player_turn(state))
}

impl DominoHandState {
    pub fn legal_cards_for_player(&self, player: PlayerIndex) -> Vec<Card> {
        if self.status == DominoStatus::Complete || self.current_player != player {
            return Vec::new();
        }

        self.hands[player]
            .iter()
            .copied()
            .filter(|card| self.is_legal_card(*card))
            .collect()
    }

    pub fn is_legal_card(&self, card: Card) -> bool {
        let lane = &self.layout[suit_index(card.suit)];

        if lane.is_empty() {
            return card.rank == DOMINO_START_RANK;
        }

        let low = lane
            .iter()
            .map(|played| played.rank as i32)
            .min()
            .unwrap_or(7);
        let high = lane
            .iter()
            .map(|played| played.rank as i32)
            .max()
            .unwrap_or(7);
        let rank = card.rank as i32;

        rank == low - 1 || rank == high + 1
    }

    pub fn scores(&self) -> [i32; 4] {
        let mut scores = [0, 0, 0, 0];

        for (index, player) in self.out_order.iter().copied().enumerate() {
            scores[player] = DOMINO_SCORES[index];
        }

        scores
    }
}

fn advance_to_player_turn(mut state: DominoHandState) -> DominoHandState {
    while state.status == DominoStatus::InProgress && state.current_player != 2 {
        let legal = state.legal_cards_for_player(state.current_player);

        if let Some(card) = legal.first().copied() {
            if play_card_for_current_player(&mut state, card).is_err() {
                state.status = DominoStatus::Complete;
            }
        } else {
            pass_current_player(&mut state);
        }
    }

    state
}

fn play_card_for_current_player(state: &mut DominoHandState, card: Card) -> Result<(), String> {
    let player = state.current_player;
    let position = state.hands[player]
        .iter()
        .position(|held_card| *held_card == card)
        .ok_or_else(|| format!("{} is not in player {}'s hand.", card, player))?;

    if !state.is_legal_card(card) {
        return Err(format!("{} is not legal in the Domino layout.", card));
    }

    state.hands[player].remove(position);
    state.layout[suit_index(card.suit)].push(card);
    sort_hand(&mut state.layout[suit_index(card.suit)]);
    state.passed_players.clear();

    if state.hands[player].is_empty() && !state.out_order.contains(&player) {
        state.out_order.push(player);
    }

    advance_turn_or_complete(state);
    Ok(())
}

fn pass_current_player(state: &mut DominoHandState) {
    if !state.passed_players.contains(&state.current_player) {
        state.passed_players.push(state.current_player);
    }

    advance_turn_or_complete(state);
}

fn advance_turn_or_complete(state: &mut DominoHandState) {
    if state.out_order.len() == 4 || state.hands.iter().all(Vec::is_empty) {
        state.status = DominoStatus::Complete;
        return;
    }

    if state.passed_players.len() >= 4 {
        for player in 0..4 {
            if !state.out_order.contains(&player) {
                state.out_order.push(player);
            }
        }
        state.status = DominoStatus::Complete;
        return;
    }

    state.current_player = (state.current_player + 1) % 4;
}

fn suit_index(suit: Suit) -> usize {
    match suit {
        Suit::Clubs => 0,
        Suit::Diamonds => 1,
        Suit::Hearts => 2,
        Suit::Spades => 3,
    }
}

fn sort_hand(hand: &mut [Card]) {
    hand.sort_by_key(|card| (suit_index(card.suit), card.rank as u8));
}

struct DeterministicRng {
    state: u64,
}

impl DeterministicRng {
    const fn new(seed: u64) -> Self {
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
        (self.next_u64() % upper_bound as u64) as usize
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domino_starts_with_only_sevens_legal() {
        let state = DominoHandState {
            id: "domino-test".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Seven, Suit::Clubs),
                    Card::new(Rank::Eight, Suit::Clubs),
                ],
                Vec::new(),
            ],
            current_player: 2,
            layout: [Vec::new(), Vec::new(), Vec::new(), Vec::new()],
            passed_players: Vec::new(),
            out_order: Vec::new(),
            status: DominoStatus::InProgress,
        };

        assert_eq!(
            state.legal_cards_for_player(2),
            vec![Card::new(Rank::Seven, Suit::Clubs)]
        );
    }

    #[test]
    fn domino_extends_suit_outward_from_start_rank() {
        let state = DominoHandState {
            id: "domino-test".to_string(),
            hands: [
                Vec::new(),
                Vec::new(),
                vec![
                    Card::new(Rank::Six, Suit::Clubs),
                    Card::new(Rank::Eight, Suit::Clubs),
                    Card::new(Rank::Nine, Suit::Clubs),
                ],
                Vec::new(),
            ],
            current_player: 2,
            layout: [
                vec![Card::new(Rank::Seven, Suit::Clubs)],
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ],
            passed_players: Vec::new(),
            out_order: Vec::new(),
            status: DominoStatus::InProgress,
        };

        assert_eq!(
            state.legal_cards_for_player(2),
            vec![
                Card::new(Rank::Six, Suit::Clubs),
                Card::new(Rank::Eight, Suit::Clubs)
            ]
        );
    }

    #[test]
    fn domino_scores_by_out_order() {
        let mut state = start_domino_hand(1);
        state.out_order = vec![2, 0, 3, 1];

        assert_eq!(state.scores(), [20, -5, 45, 5]);
    }
}
