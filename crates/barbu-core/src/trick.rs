use crate::cards::{Card, Rank, Suit};

pub type PlayerIndex = usize;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PlayedCard {
    pub player: PlayerIndex,
    pub card: Card,
}

impl PlayedCard {
    pub const fn new(player: PlayerIndex, card: Card) -> Self {
        Self { player, card }
    }
}

pub fn legal_cards(hand: &[Card], led_suit: Option<Suit>) -> Vec<Card> {
    let Some(led_suit) = led_suit else {
        return hand.to_vec();
    };

    let suited_cards: Vec<Card> = hand
        .iter()
        .copied()
        .filter(|card| card.suit == led_suit)
        .collect();

    if suited_cards.is_empty() {
        hand.to_vec()
    } else {
        suited_cards
    }
}

pub fn trick_winner(played_cards: &[PlayedCard]) -> Option<PlayerIndex> {
    let first_card = played_cards.first()?.card;

    played_cards
        .iter()
        .copied()
        .filter(|played| played.card.suit == first_card.suit)
        .max_by_key(|played| played.card.rank)
        .map(|played| played.player)
}

pub fn score_no_hearts_trick(played_cards: &[PlayedCard]) -> i32 {
    played_cards
        .iter()
        .filter(|played| played.card.suit == Suit::Hearts)
        .map(|played| {
            if played.card.rank == Rank::Ace {
                6
            } else {
                2
            }
        })
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cards::{Rank, Suit};

    fn card(rank: Rank, suit: Suit) -> Card {
        Card::new(rank, suit)
    }

    #[test]
    fn player_must_follow_suit_when_possible() {
        let hand = [
            card(Rank::Two, Suit::Clubs),
            card(Rank::Ace, Suit::Hearts),
            card(Rank::King, Suit::Clubs),
        ];

        assert_eq!(
            legal_cards(&hand, Some(Suit::Clubs)),
            vec![card(Rank::Two, Suit::Clubs), card(Rank::King, Suit::Clubs)]
        );
    }

    #[test]
    fn player_may_play_anything_when_void() {
        let hand = [
            card(Rank::Ace, Suit::Hearts),
            card(Rank::Queen, Suit::Spades),
        ];

        assert_eq!(legal_cards(&hand, Some(Suit::Clubs)), hand);
    }

    #[test]
    fn highest_card_in_led_suit_wins_trick() {
        let trick = [
            PlayedCard::new(0, card(Rank::Nine, Suit::Diamonds)),
            PlayedCard::new(1, card(Rank::Ace, Suit::Diamonds)),
            PlayedCard::new(2, card(Rank::Two, Suit::Spades)),
            PlayedCard::new(3, card(Rank::King, Suit::Diamonds)),
        ];

        assert_eq!(trick_winner(&trick), Some(1));
    }

    #[test]
    fn no_hearts_contract_scores_two_points_per_heart_and_six_for_ace() {
        let trick = [
            PlayedCard::new(0, card(Rank::Nine, Suit::Diamonds)),
            PlayedCard::new(1, card(Rank::Ace, Suit::Hearts)),
            PlayedCard::new(2, card(Rank::Two, Suit::Spades)),
            PlayedCard::new(3, card(Rank::King, Suit::Hearts)),
        ];

        assert_eq!(score_no_hearts_trick(&trick), 8);
    }
}
