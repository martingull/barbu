use crate::cards::{Card, Rank, Suit};
use crate::trick::{legal_cards, trick_winner, PlayedCard, PlayerIndex};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TrickPolicyContext<'a> {
    pub hand: &'a [Card],
    pub led_suit: Option<Suit>,
    pub current_trick: &'a [PlayedCard],
    pub current_player: PlayerIndex,
}

pub fn choose_no_queens_opponent_card(context: TrickPolicyContext<'_>) -> Option<Card> {
    let legal = legal_cards(context.hand, context.led_suit);

    if legal.is_empty() {
        return None;
    }

    if context.led_suit.is_none() {
        return lowest_card_matching(&legal, |card| card.rank != Rank::Queen)
            .or_else(|| lowest_card(&legal));
    }

    let follows_suit = legal.iter().all(|card| Some(card.suit) == context.led_suit);

    if !follows_suit {
        return highest_card_matching(&legal, |card| card.rank == Rank::Queen)
            .or_else(|| highest_card(&legal));
    }

    if context
        .current_trick
        .iter()
        .any(|played| played.card.rank == Rank::Queen)
    {
        return highest_non_winning_queen(context, &legal)
            .or_else(|| highest_non_winning_card(context, &legal))
            .or_else(|| lowest_card(&legal));
    }

    highest_non_winning_queen(context, &legal)
        .or_else(|| highest_non_winning_card(context, &legal))
        .or_else(|| lowest_card(&legal))
}

fn highest_non_winning_card(context: TrickPolicyContext<'_>, cards: &[Card]) -> Option<Card> {
    highest_card_matching(cards, |card| !card_would_win_plain_trick(context, card))
}

fn highest_non_winning_queen(context: TrickPolicyContext<'_>, legal: &[Card]) -> Option<Card> {
    highest_card_matching(legal, |card| {
        card.rank == Rank::Queen && !card_would_win_plain_trick(context, card)
    })
}

fn card_would_win_plain_trick(context: TrickPolicyContext<'_>, card: Card) -> bool {
    let Some(led_suit) = context.led_suit else {
        return true;
    };

    if card.suit != led_suit {
        return false;
    }

    let mut simulated = context.current_trick.to_vec();
    simulated.push(PlayedCard::new(context.current_player, card));

    trick_winner(&simulated) == Some(context.current_player)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn card(rank: Rank, suit: Suit) -> Card {
        Card::new(rank, suit)
    }

    #[test]
    fn no_queens_policy_leads_lowest_non_queen() {
        let hand = [
            card(Rank::Queen, Suit::Clubs),
            card(Rank::Two, Suit::Diamonds),
            card(Rank::Three, Suit::Hearts),
        ];

        assert_eq!(
            choose_no_queens_opponent_card(TrickPolicyContext {
                hand: &hand,
                led_suit: None,
                current_trick: &[],
                current_player: 0,
            }),
            Some(card(Rank::Two, Suit::Diamonds))
        );
    }

    #[test]
    fn no_queens_policy_dumps_queen_under_locked_winner() {
        let hand = [
            card(Rank::Queen, Suit::Clubs),
            card(Rank::King, Suit::Clubs),
            card(Rank::Two, Suit::Diamonds),
        ];
        let trick = [PlayedCard::new(0, card(Rank::Ace, Suit::Clubs))];

        assert_eq!(
            choose_no_queens_opponent_card(TrickPolicyContext {
                hand: &hand,
                led_suit: Some(Suit::Clubs),
                current_trick: &trick,
                current_player: 3,
            }),
            Some(card(Rank::Queen, Suit::Clubs))
        );
    }

    #[test]
    fn no_queens_policy_uses_lowest_card_when_forced_to_win_loaded_trick() {
        let hand = [card(Rank::King, Suit::Clubs), card(Rank::Ace, Suit::Clubs)];
        let trick = [
            PlayedCard::new(0, card(Rank::Seven, Suit::Clubs)),
            PlayedCard::new(1, card(Rank::Queen, Suit::Clubs)),
        ];

        assert_eq!(
            choose_no_queens_opponent_card(TrickPolicyContext {
                hand: &hand,
                led_suit: Some(Suit::Clubs),
                current_trick: &trick,
                current_player: 3,
            }),
            Some(card(Rank::King, Suit::Clubs))
        );
    }
}
