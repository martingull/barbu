use std::fmt;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum Suit {
    Clubs,
    Diamonds,
    Hearts,
    Spades,
}

impl Suit {
    pub const ALL: [Suit; 4] = [Suit::Clubs, Suit::Diamonds, Suit::Hearts, Suit::Spades];

    pub fn short_name(self) -> &'static str {
        match self {
            Suit::Clubs => "C",
            Suit::Diamonds => "D",
            Suit::Hearts => "H",
            Suit::Spades => "S",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub enum Rank {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14,
}

impl Rank {
    pub const ALL: [Rank; 13] = [
        Rank::Two,
        Rank::Three,
        Rank::Four,
        Rank::Five,
        Rank::Six,
        Rank::Seven,
        Rank::Eight,
        Rank::Nine,
        Rank::Ten,
        Rank::Jack,
        Rank::Queen,
        Rank::King,
        Rank::Ace,
    ];

    pub fn short_name(self) -> &'static str {
        match self {
            Rank::Two => "2",
            Rank::Three => "3",
            Rank::Four => "4",
            Rank::Five => "5",
            Rank::Six => "6",
            Rank::Seven => "7",
            Rank::Eight => "8",
            Rank::Nine => "9",
            Rank::Ten => "10",
            Rank::Jack => "J",
            Rank::Queen => "Q",
            Rank::King => "K",
            Rank::Ace => "A",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub struct Card {
    pub rank: Rank,
    pub suit: Suit,
}

impl Card {
    pub const fn new(rank: Rank, suit: Suit) -> Self {
        Self { rank, suit }
    }
}

impl fmt::Display for Card {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}{}", self.rank.short_name(), self.suit.short_name())
    }
}

pub fn standard_deck() -> Vec<Card> {
    let mut cards = Vec::with_capacity(52);

    for suit in Suit::ALL {
        for rank in Rank::ALL {
            cards.push(Card::new(rank, suit));
        }
    }

    cards
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_deck_contains_52_cards() {
        let deck = standard_deck();

        assert_eq!(deck.len(), 52);
        assert_eq!(deck[0], Card::new(Rank::Two, Suit::Clubs));
        assert_eq!(deck[51], Card::new(Rank::Ace, Suit::Spades));
    }

    #[test]
    fn card_formats_with_ascii_names() {
        assert_eq!(Card::new(Rank::Ace, Suit::Spades).to_string(), "AS");
        assert_eq!(Card::new(Rank::Ten, Suit::Hearts).to_string(), "10H");
    }
}
