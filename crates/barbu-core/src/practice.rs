use crate::cards::{Card, Rank, Suit};
use crate::trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PracticeScenario {
    pub id: String,
    pub title: String,
    pub contract: String,
    pub led_suit: Suit,
    pub prompt: String,
    pub table_before_choice: Vec<PlayedCard>,
    pub player_hand: Vec<Card>,
    pub table_after_choice: Vec<PlayedCard>,
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
        let penalty = score_no_hearts_trick(&completed_trick);
        let winner_name = player_name(winner);

        PracticeOutcome {
            player_card,
            is_legal: true,
            legal_cards,
            winner: Some(winner),
            penalty: Some(penalty),
            completed_trick: Some(completed_trick),
            explanation: if penalty == 0 {
                format!(
                    "{} follows {}. {} wins the trick, and no hearts were played.",
                    player_card,
                    suit_name(self.led_suit),
                    winner_name
                )
            } else {
                format!(
                    "{} follows {}. {} wins the trick and takes {} heart penalty.",
                    player_card,
                    suit_name(self.led_suit),
                    winner_name,
                    penalty
                )
            },
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PracticeOutcome {
    pub player_card: Card,
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
        led_suit,
        prompt: format!(
            "Tutor led {lead_card}. Left is void in {} and discarded {heart_card}. Choose a legal card.",
            suit_name(led_suit)
        ),
        table_before_choice: vec![PlayedCard::new(0, lead_card), PlayedCard::new(1, heart_card)],
        player_hand,
        table_after_choice: vec![PlayedCard::new(3, right_card)],
    }
}

fn choose(rng: &mut DeterministicRng, values: &[Rank]) -> Rank {
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

fn player_name(player: PlayerIndex) -> &'static str {
    match player {
        0 => "Tutor",
        1 => "Left",
        2 => "You",
        3 => "Right",
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
        assert!(outcome.explanation.contains("not legal"));
    }

    #[test]
    fn generated_follow_suit_drill_scores_the_completed_trick() {
        let scenario = generate_no_hearts_follow_suit(17);
        let legal_card = scenario.legal_player_cards()[0];
        let outcome = scenario.outcome_for(legal_card);

        assert!(outcome.is_legal);
        assert_eq!(outcome.winner, Some(3));
        assert_eq!(outcome.penalty, Some(1));
        assert!(outcome.explanation.contains("heart penalty"));
    }
}
