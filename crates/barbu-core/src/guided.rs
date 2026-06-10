use crate::cards::{Card, Rank, Suit};
use crate::trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Seat {
    Tutor,
    Left,
    You,
    Right,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GuidedNoHeartsTrick {
    pub title: &'static str,
    pub contract: &'static str,
    pub led_suit: Suit,
    pub table_before_choice: Vec<PlayedCard>,
    pub player_hand: Vec<Card>,
    pub table_after_choice: Vec<PlayedCard>,
}

impl GuidedNoHeartsTrick {
    pub fn legal_player_cards(&self) -> Vec<Card> {
        legal_cards(&self.player_hand, Some(self.led_suit))
    }

    pub fn is_legal_player_card(&self, card: Card) -> bool {
        self.legal_player_cards().contains(&card)
    }

    pub fn completed_trick(&self, player_card: Card) -> Option<Vec<PlayedCard>> {
        if !self.is_legal_player_card(player_card) {
            return None;
        }

        let mut played = self.table_before_choice.clone();
        played.push(PlayedCard::new(2, player_card));
        played.extend(self.table_after_choice.iter().copied());
        Some(played)
    }

    pub fn result_for(&self, player_card: Card) -> Option<GuidedTrickResult> {
        let played = self.completed_trick(player_card)?;
        let winner = trick_winner(&played)?;

        Some(GuidedTrickResult {
            winner,
            penalty: score_no_hearts_trick(&played),
            played,
        })
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GuidedTrickResult {
    pub winner: PlayerIndex,
    pub penalty: i32,
    pub played: Vec<PlayedCard>,
}

pub fn first_no_hearts_trick() -> GuidedNoHeartsTrick {
    GuidedNoHeartsTrick {
        title: "Follow clubs without taking the heart",
        contract: "No Hearts",
        led_suit: Suit::Clubs,
        table_before_choice: vec![
            PlayedCard::new(0, Card::new(Rank::Nine, Suit::Clubs)),
            PlayedCard::new(1, Card::new(Rank::Four, Suit::Hearts)),
        ],
        player_hand: vec![
            Card::new(Rank::Two, Suit::Clubs),
            Card::new(Rank::King, Suit::Clubs),
            Card::new(Rank::Eight, Suit::Hearts),
            Card::new(Rank::Queen, Suit::Spades),
        ],
        table_after_choice: vec![PlayedCard::new(3, Card::new(Rank::Ace, Suit::Clubs))],
    }
}

pub fn second_no_hearts_trick() -> GuidedNoHeartsTrick {
    GuidedNoHeartsTrick {
        title: "When the winner leads the next trick",
        contract: "No Hearts",
        led_suit: Suit::Spades,
        table_before_choice: vec![
            PlayedCard::new(3, Card::new(Rank::Seven, Suit::Spades)),
            PlayedCard::new(0, Card::new(Rank::Jack, Suit::Spades)),
            PlayedCard::new(1, Card::new(Rank::Three, Suit::Spades)),
        ],
        player_hand: vec![
            Card::new(Rank::Two, Suit::Clubs),
            Card::new(Rank::Eight, Suit::Hearts),
            Card::new(Rank::Queen, Suit::Spades),
        ],
        table_after_choice: vec![],
    }
}

pub fn no_hearts_guided_tricks() -> Vec<GuidedNoHeartsTrick> {
    vec![first_no_hearts_trick(), second_no_hearts_trick()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_no_hearts_trick_requires_clubs() {
        let lesson = first_no_hearts_trick();

        assert_eq!(
            lesson.legal_player_cards(),
            vec![
                Card::new(Rank::Two, Suit::Clubs),
                Card::new(Rank::King, Suit::Clubs)
            ]
        );
        assert!(!lesson.is_legal_player_card(Card::new(Rank::Eight, Suit::Hearts)));
    }

    #[test]
    fn first_no_hearts_trick_result_gives_penalty_to_right_player() {
        let lesson = first_no_hearts_trick();
        let result = lesson
            .result_for(Card::new(Rank::King, Suit::Clubs))
            .expect("king of clubs is a legal play");

        assert_eq!(result.winner, 3);
        assert_eq!(result.penalty, 1);
    }

    #[test]
    fn second_no_hearts_trick_requires_spades_and_has_no_penalty() {
        let lesson = second_no_hearts_trick();
        let result = lesson
            .result_for(Card::new(Rank::Queen, Suit::Spades))
            .expect("queen of spades is the only legal play");

        assert_eq!(
            lesson.legal_player_cards(),
            vec![Card::new(Rank::Queen, Suit::Spades)]
        );
        assert_eq!(result.winner, 2);
        assert_eq!(result.penalty, 0);
    }

    #[test]
    fn no_hearts_guided_tricks_contains_two_steps() {
        assert_eq!(no_hearts_guided_tricks().len(), 2);
    }
}
