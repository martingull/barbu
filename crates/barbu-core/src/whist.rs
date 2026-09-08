use crate::cards::{Card, Rank, Suit};
use crate::hand::CompletedTrick;
use crate::trick::{legal_cards, PlayedCard, PlayerIndex};

#[derive(Debug, PartialEq)]
pub struct WhistSettlement {
    pub points: [u32; 2],
    pub games: [u32; 2],
    pub game_complete: bool,
    pub complete: bool,
    pub next_scores: [u32; 2],
}

/// Classic five-point games, optionally best of three. Honours are not counted.
pub fn settle_whist_hand(
    scores: [u32; 2],
    mut games: [u32; 2],
    odd_tricks: [u32; 2],
    rubber: bool,
) -> WhistSettlement {
    let points = [scores[0] + odd_tricks[0], scores[1] + odd_tricks[1]];
    let game_complete = points.iter().any(|score| *score >= 5);
    if game_complete {
        games[usize::from(points[1] > points[0])] += 1;
    }
    let complete = game_complete && (!rubber || games.iter().any(|won| *won >= 2));
    WhistSettlement {
        points,
        games,
        game_complete,
        complete,
        next_scores: if game_complete { [0, 0] } else { points },
    }
}

/// Only the acting hand and public information belong in a Whist decision.
pub struct WhistPosition<'a> {
    pub hand: &'a [Card],
    pub player: PlayerIndex,
    pub trump: Suit,
    pub trick: &'a [PlayedCard],
    pub history: &'a [CompletedTrick],
    pub turned_trump: Option<(PlayerIndex, Card)>,
}

impl WhistPosition<'_> {
    fn seen(&self, card: Card) -> bool {
        self.trick
            .iter()
            .chain(self.history.iter().flat_map(|trick| trick.cards.iter()))
            .any(|play| play.card == card)
    }

    fn outside(&self, suit: Suit) -> Vec<Card> {
        Rank::ALL
            .into_iter()
            .map(|rank| Card::new(rank, suit))
            .filter(|card| !self.hand.contains(card) && !self.seen(*card))
            .collect()
    }

    fn master(&self, card: Card) -> bool {
        self.outside(card.suit)
            .iter()
            .all(|other| other.rank < card.rank)
    }

    fn void(&self, player: PlayerIndex, suit: Suit) -> bool {
        self.history
            .iter()
            .map(|trick| trick.cards.as_slice())
            .chain(std::iter::once(self.trick))
            .any(|trick| {
                trick.first().is_some_and(|lead| lead.card.suit == suit)
                    && trick
                        .iter()
                        .any(|play| play.player == player && play.card.suit != suit)
            })
    }

    fn opponents_can_ruff(&self, suit: Suit) -> bool {
        suit != self.trump
            && !self.outside(self.trump).is_empty()
            && (0..4).any(|player| {
                player % 2 != self.player % 2
                    && self.void(player, suit)
                    && !self.void(player, self.trump)
            })
    }

    fn winner(&self, trick: &[PlayedCard]) -> Option<PlayedCard> {
        let led = trick.first()?.card.suit;
        trick.iter().copied().max_by_key(|play| {
            (
                if play.card.suit == self.trump {
                    2
                } else if play.card.suit == led {
                    1
                } else {
                    0
                },
                play.card.rank,
            )
        })
    }

    fn wins(&self, card: Card) -> bool {
        let mut trick = self.trick.to_vec();
        trick.push(PlayedCard::new(self.player, card));
        self.winner(&trick)
            .is_some_and(|play| play.player == self.player)
    }

    fn lowest(&self, cards: &[Card]) -> Option<Card> {
        cards
            .iter()
            .copied()
            .min_by_key(|card| (card.rank, card.suit.sort_order()))
    }

    fn discard(&self, cards: &[Card]) -> Option<Card> {
        let plain: Vec<Card> = cards
            .iter()
            .copied()
            .filter(|card| card.suit != self.trump)
            .collect();
        let candidates = if plain.is_empty() { cards } else { &plain };
        candidates.iter().copied().min_by_key(|card| {
            let length = self
                .hand
                .iter()
                .filter(|other| other.suit == card.suit)
                .count();
            (
                usize::from(self.master(*card)) * 300 + (card.rank as usize).pow(2) + length * 3,
                card.suit.sort_order(),
            )
        })
    }

    fn lead_suit(&self, suit: Suit, returning: bool) -> Option<Card> {
        let mut cards: Vec<Card> = self
            .hand
            .iter()
            .copied()
            .filter(|card| card.suit == suit)
            .collect();
        cards.sort_by_key(|card| std::cmp::Reverse(card.rank));
        let top = *cards.first()?;
        if self.master(top)
            || (top.rank >= Rank::Ten
                && cards.get(1).is_some_and(|next| {
                    !self
                        .outside(suit)
                        .iter()
                        .any(|card| card.rank > next.rank && card.rank < top.rank)
                }))
            || (returning && cards.len() == 2)
        {
            return Some(top);
        }
        // Fourth highest from length; a small card when returning a longer suit.
        if !returning && cards.len() >= 4 {
            Some(cards[3])
        } else {
            self.lowest(&cards)
        }
    }

    fn lead(&self) -> Option<Card> {
        let partner = (self.player + 2) % 4;
        for trick in self.history.iter().rev() {
            if let Some(lead) = trick.cards.first().filter(|play| play.player == partner) {
                let suit = lead.card.suit;
                let worthwhile = if suit == self.trump {
                    !self.outside(suit).is_empty()
                        && (0..4).any(|p| p % 2 != self.player % 2 && !self.void(p, suit))
                } else {
                    !self.opponents_can_ruff(suit) && !self.void(partner, suit)
                };
                if worthwhile {
                    if let Some(card) = self.lead_suit(suit, true) {
                        return Some(card);
                    }
                }
            }
        }
        let trumps: Vec<Card> = self
            .hand
            .iter()
            .copied()
            .filter(|card| card.suit == self.trump)
            .collect();
        if trumps.len() >= 5
            && trumps.iter().any(|card| self.master(*card))
            && !self.outside(self.trump).is_empty()
            && (0..4).any(|p| p % 2 != self.player % 2 && !self.void(p, self.trump))
        {
            return self.lead_suit(self.trump, false);
        }
        let suit = Suit::ALL
            .into_iter()
            .filter(|suit| *suit != self.trump)
            .filter(|suit| self.hand.iter().any(|card| card.suit == *suit))
            .max_by_key(|suit| {
                let length = self.hand.iter().filter(|card| card.suit == *suit).count() as i32;
                let honours = self
                    .hand
                    .iter()
                    .filter(|card| card.suit == *suit && card.rank >= Rank::Jack)
                    .count() as i32;
                (
                    length * 10 + honours * 3 - i32::from(self.opponents_can_ruff(*suit)) * 100,
                    std::cmp::Reverse(suit.sort_order()),
                )
            })
            .unwrap_or(self.trump);
        self.lead_suit(suit, false)
    }
}

pub fn choose_whist_card(position: &WhistPosition<'_>) -> Option<Card> {
    let led = position.trick.first().map(|play| play.card.suit);
    let legal = legal_cards(position.hand, led);
    if legal.is_empty() {
        return None;
    }
    if position.trick.is_empty() {
        return position.lead();
    }
    let winner = position.winner(position.trick)?;
    let partner_winning = winner.player % 2 == position.player % 2;
    let following = legal[0].suit == led?;
    let winners: Vec<Card> = legal
        .iter()
        .copied()
        .filter(|card| position.wins(*card))
        .collect();
    if following {
        if position.trick.len() == 3 {
            return if partner_winning {
                position.lowest(&legal)
            } else {
                position
                    .lowest(&winners)
                    .or_else(|| position.lowest(&legal))
            };
        }
        if position.trick.len() == 1 {
            let cover: Vec<Card> = winners
                .iter()
                .copied()
                .filter(|card| {
                    winner.card.rank >= Rank::Jack
                        && card.rank as u8 == winner.card.rank as u8 + 1
                        && legal.len() > 1
                })
                .collect();
            return position.lowest(&cover).or_else(|| position.lowest(&legal));
        }
        let fourth = (position.player + 1) % 4;
        let known_fourth = position
            .turned_trump
            .filter(|(owner, card)| *owner == fourth && !position.seen(*card));
        if partner_winning
            && (position.master(winner.card)
                || (position.void(fourth, winner.card.suit)
                    && (winner.card.suit == position.trump
                        || position.void(fourth, position.trump))))
        {
            return position.lowest(&legal);
        }
        let best = winners.iter().copied().max_by_key(|card| card.rank);
        if let Some(best) = best {
            if known_fourth.is_some_and(|(_, card)| card.suit == best.suit && card.rank > best.rank)
            {
                return position.lowest(&legal);
            }
            // Spend the lowest equivalent honour, but do not offer fourth hand a cheap trick.
            let equivalents: Vec<Card> = winners
                .iter()
                .copied()
                .filter(|card| {
                    !position
                        .outside(best.suit)
                        .iter()
                        .any(|other| other.rank > card.rank && other.rank < best.rank)
                })
                .collect();
            return position.lowest(&equivalents);
        }
        return position.lowest(&legal);
    }
    if partner_winning {
        return position.discard(&legal);
    }
    position
        .lowest(&winners)
        .or_else(|| position.discard(&legal))
}
