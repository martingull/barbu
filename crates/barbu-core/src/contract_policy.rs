use crate::cards::{Card, Rank, Suit};
use crate::trick::{legal_cards, trick_winner, PlayedCard, PlayerIndex};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HandPolicy {
    BarbuContract(BarbuContractPolicy),
    HeartsBlackLady,
    HeartsBlackLadyPassing,
}

impl HandPolicy {
    pub fn from_hand_id(id: &str) -> Option<Self> {
        if id.starts_with("hearts-hand-") {
            return Some(Self::HeartsBlackLady);
        }
        if id.starts_with("hearts-passing-hand-") {
            return Some(Self::HeartsBlackLadyPassing);
        }

        BarbuContractPolicy::from_hand_id(id).map(Self::BarbuContract)
    }

    pub fn from_contract_name(contract: &str) -> Option<Self> {
        if contract == "Hearts" {
            return Some(Self::HeartsBlackLady);
        }

        BarbuContractPolicy::from_contract_name(contract).map(Self::BarbuContract)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BarbuContractPolicy {
    NoHearts,
    NoQueens,
    KingOfHearts,
    NoLastTwo,
    NoTricks,
    HeartsTrumps,
}

impl BarbuContractPolicy {
    pub fn from_hand_id(id: &str) -> Option<Self> {
        if id.starts_with("no-hearts-hand-") {
            Some(Self::NoHearts)
        } else if id.starts_with("no-queens-hand-") {
            Some(Self::NoQueens)
        } else if id.starts_with("king-of-hearts-hand-") {
            Some(Self::KingOfHearts)
        } else if id.starts_with("no-last-two-hand-") {
            Some(Self::NoLastTwo)
        } else if id.starts_with("no-tricks-hand-") {
            Some(Self::NoTricks)
        } else if id.starts_with("hearts-trumps-hand-") {
            Some(Self::HeartsTrumps)
        } else {
            None
        }
    }

    pub fn from_contract_name(contract: &str) -> Option<Self> {
        match contract {
            "No Hearts" => Some(Self::NoHearts),
            "No Queens" => Some(Self::NoQueens),
            "King of Hearts" => Some(Self::KingOfHearts),
            "No Last Two" => Some(Self::NoLastTwo),
            "No Tricks" => Some(Self::NoTricks),
            "Hearts Trumps" => Some(Self::HeartsTrumps),
            _ => None,
        }
    }
}

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

    #[test]
    fn hand_policy_distinguishes_hearts_from_hearts_trumps() {
        assert_eq!(
            HandPolicy::from_contract_name("Hearts"),
            Some(HandPolicy::HeartsBlackLady)
        );
        assert_eq!(
            HandPolicy::from_contract_name("Hearts Trumps"),
            Some(HandPolicy::BarbuContract(BarbuContractPolicy::HeartsTrumps))
        );
    }

    #[test]
    fn hand_policy_maps_known_barbu_hand_ids() {
        assert_eq!(
            HandPolicy::from_hand_id("no-queens-hand-7"),
            Some(HandPolicy::BarbuContract(BarbuContractPolicy::NoQueens))
        );
        assert_eq!(
            HandPolicy::from_hand_id("hearts-hand-7"),
            Some(HandPolicy::HeartsBlackLady)
        );
        assert_eq!(
            HandPolicy::from_hand_id("hearts-passing-hand-7"),
            Some(HandPolicy::HeartsBlackLadyPassing)
        );
        assert_eq!(
            HandPolicy::from_hand_id("hearts-trumps-hand-7"),
            Some(HandPolicy::BarbuContract(BarbuContractPolicy::HeartsTrumps))
        );
    }
}
