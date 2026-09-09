use crate::cards::{Card, Rank, Suit};
use crate::hand::CompletedTrick;
use crate::trick::{trick_winner, PlayedCard, PlayerIndex};

/// A Hearts opponent sees its own hand and public play, never other hands.
pub struct HeartsPosition<'a> {
    pub hand: &'a [Card],
    pub legal: &'a [Card],
    pub player: PlayerIndex,
    pub trick: &'a [PlayedCard],
    pub history: &'a [CompletedTrick],
}

fn penalty(card: Card) -> i32 {
    if card == Card::new(Rank::Queen, Suit::Spades) {
        13
    } else if card.suit == Suit::Hearts {
        1
    } else {
        0
    }
}

fn low(cards: impl Iterator<Item = Card>) -> Option<Card> {
    cards.min_by_key(|c| (c.rank, c.suit.sort_order()))
}

fn high(cards: impl Iterator<Item = Card>) -> Option<Card> {
    cards.max_by_key(|c| (c.rank, c.suit.sort_order()))
}

impl HeartsPosition<'_> {
    fn seen(&self, card: Card) -> bool {
        self.history
            .iter()
            .flat_map(|t| &t.cards)
            .chain(self.trick)
            .any(|play| play.card == card)
    }

    fn queen_outside(&self) -> bool {
        let queen = Card::new(Rank::Queen, Suit::Spades);
        !self.hand.contains(&queen) && !self.seen(queen)
    }

    fn master(&self, card: Card) -> bool {
        Rank::ALL
            .into_iter()
            .filter(|rank| *rank > card.rank)
            .map(|rank| Card::new(rank, card.suit))
            .all(|higher| self.hand.contains(&higher) || self.seen(higher))
    }

    fn void_count(&self, suit: Suit) -> usize {
        (0..4)
            .filter(|player| {
                *player != self.player
                    && self.history.iter().any(|trick| {
                        trick
                            .cards
                            .first()
                            .is_some_and(|lead| lead.card.suit == suit)
                            && trick
                                .cards
                                .iter()
                                .any(|play| play.player == *player && play.card.suit != suit)
                    })
            })
            .count()
    }

    fn moon_threat(&self) -> Option<(PlayerIndex, i32)> {
        let mut points = [0; 4];
        for trick in self.history {
            points[trick.winner] += trick.penalty;
        }
        let total: i32 = points.iter().sum();
        // A first stray heart is not evidence of a committed moon attempt.
        if total < 8 {
            return None;
        }
        points
            .iter()
            .position(|score| *score == total)
            .map(|player| (player, total))
    }

    fn moon_attempt(&self) -> bool {
        self.moon_threat().is_some_and(|(player, points)| {
            player == self.player
                && (points >= 20
                    || self
                        .hand
                        .iter()
                        .filter(|card| card.suit == Suit::Hearts && self.master(**card))
                        .count()
                        >= 2)
        })
    }

    fn wins(&self, card: Card) -> bool {
        let mut trick = self.trick.to_vec();
        trick.push(PlayedCard::new(self.player, card));
        trick_winner(&trick) == Some(self.player)
    }

    fn discard_value(&self, card: Card) -> i32 {
        let rank = card.rank as i32;
        if penalty(card) == 13 {
            1000
        } else if card.suit == Suit::Spades && rank > 12 && self.queen_outside() {
            900 + rank
        } else if card.suit == Suit::Hearts && rank >= 11 {
            600 + rank
        } else if rank >= 11 {
            400 + rank
        } else if card.suit == Suit::Hearts {
            200 + rank
        } else {
            rank
        }
    }
}

pub fn choose_hearts_card(p: &HeartsPosition<'_>) -> Option<Card> {
    if p.trick.is_empty() {
        if p.moon_attempt() {
            return high(
                p.legal
                    .iter()
                    .copied()
                    .filter(|card| card.suit == Suit::Hearts && p.master(*card)),
            )
            .or_else(|| high(p.legal.iter().copied().filter(|card| p.master(*card))))
            .or_else(|| low(p.legal.iter().copied()));
        }
        return p
            .legal
            .iter()
            .copied()
            .filter(|card| {
                penalty(*card) == 0
                    && !(card.suit == Suit::Spades && card.rank > Rank::Queen && p.queen_outside())
            })
            .min_by_key(|card| {
                let voids = p.void_count(card.suit);
                (
                    voids,
                    p.hand.iter().filter(|held| held.suit == card.suit).count(),
                    if voids > 0 {
                        card.rank as i32
                    } else {
                        -(card.rank as i32)
                    },
                    card.suit.sort_order(),
                )
            })
            .or_else(|| {
                low(p
                    .legal
                    .iter()
                    .copied()
                    .filter(|card| card.suit == Suit::Hearts))
            })
            .or_else(|| low(p.legal.iter().copied()));
    }

    let winner = trick_winner(p.trick);
    let loaded = p.trick.iter().any(|play| penalty(play.card) > 0);
    let threat_winning = p
        .moon_threat()
        .is_some_and(|(player, _)| player != p.player && winner == Some(player));
    let follows = p.legal.iter().any(|card| card.suit == p.trick[0].card.suit);
    if !follows {
        if threat_winning {
            return high(p.legal.iter().copied().filter(|card| penalty(*card) == 0)).or_else(
                || {
                    p.legal
                        .iter()
                        .copied()
                        .min_by_key(|card| (penalty(*card), card.rank, card.suit.sort_order()))
                },
            );
        }
        // Every seat is an opponent: never save the queen for the human player.
        return p
            .legal
            .iter()
            .copied()
            .max_by_key(|card| (p.discard_value(*card), card.suit.sort_order()));
    }
    if loaded && (threat_winning || p.moon_attempt()) {
        if let Some(card) = low(p.legal.iter().copied().filter(|card| p.wins(*card))) {
            return Some(card);
        }
    }
    // Last seat can shed a high card on a clean trick without risking a later dump.
    if p.trick.len() == 3 && !loaded {
        if let Some(card) = high(p.legal.iter().copied().filter(|card| penalty(*card) == 0)) {
            return Some(card);
        }
    }
    p.legal
        .iter()
        .copied()
        .filter(|card| !p.wins(*card))
        .max_by_key(|card| (penalty(*card), card.rank, card.suit.sort_order()))
        .or_else(|| {
            if p.trick.len() == 3 {
                high(p.legal.iter().copied())
            } else {
                low(p.legal.iter().copied().filter(|card| penalty(*card) == 0))
                    .or_else(|| low(p.legal.iter().copied()))
            }
        })
}

pub fn choose_hearts_pass(hand: &[Card]) -> Vec<Card> {
    let mut remaining = hand.to_vec();
    let mut passed = Vec::new();
    for _ in 0..3 {
        let selected = remaining.iter().copied().max_by_key(|card| {
            let rank = card.rank as i32;
            let length = remaining
                .iter()
                .filter(|held| held.suit == card.suit)
                .count();
            let value = if penalty(*card) == 13 {
                if length <= 3 {
                    1000
                } else {
                    120
                }
            } else if card.suit == Suit::Spades && rank > 12 {
                if length <= 3 {
                    900 + rank
                } else {
                    350 + rank
                }
            } else if card.suit == Suit::Hearts && rank >= 11 {
                400 + rank * 5
            } else if rank >= 11 {
                300 + rank * 5 + if length <= 3 { 60 } else { 0 }
            } else if matches!(card.suit, Suit::Clubs | Suit::Diamonds) && length <= 3 {
                200 + rank
            } else if card.suit == Suit::Hearts {
                20 + rank
            } else {
                rank
            };
            (value, card.suit.sort_order())
        });
        if let Some(card) = selected {
            remaining.retain(|held| *held != card);
            passed.push(card);
        }
    }
    passed
}
