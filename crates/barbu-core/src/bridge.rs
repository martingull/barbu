use crate::cards::{Card, Rank, Suit};
use crate::trick::PlayerIndex;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeStrain {
    Clubs,
    Diamonds,
    Hearts,
    Spades,
    NoTrump,
}

impl BridgeStrain {
    pub const ALL: [BridgeStrain; 5] = [
        BridgeStrain::Clubs,
        BridgeStrain::Diamonds,
        BridgeStrain::Hearts,
        BridgeStrain::Spades,
        BridgeStrain::NoTrump,
    ];

    pub fn short_name(self) -> &'static str {
        match self {
            BridgeStrain::Clubs => "C",
            BridgeStrain::Diamonds => "D",
            BridgeStrain::Hearts => "H",
            BridgeStrain::Spades => "S",
            BridgeStrain::NoTrump => "NT",
        }
    }

    pub fn long_name(self) -> &'static str {
        match self {
            BridgeStrain::Clubs => "Clubs",
            BridgeStrain::Diamonds => "Diamonds",
            BridgeStrain::Hearts => "Hearts",
            BridgeStrain::Spades => "Spades",
            BridgeStrain::NoTrump => "No Trump",
        }
    }

    pub fn from_label(label: &str) -> Option<Self> {
        let normalized = label
            .trim()
            .to_ascii_uppercase()
            .replace("NO TRUMPS", "NT")
            .replace("NO TRUMP", "NT")
            .replace("CLUBS", "C")
            .replace("CLUB", "C")
            .replace("DIAMONDS", "D")
            .replace("DIAMOND", "D")
            .replace("HEARTS", "H")
            .replace("HEART", "H")
            .replace("SPADES", "S")
            .replace("SPADE", "S")
            .replace('♣', "C")
            .replace('♦', "D")
            .replace('♥', "H")
            .replace('♠', "S")
            .replace(' ', "");

        match normalized.as_str() {
            "C" => Some(Self::Clubs),
            "D" => Some(Self::Diamonds),
            "H" => Some(Self::Hearts),
            "S" => Some(Self::Spades),
            "NT" => Some(Self::NoTrump),
            _ => None,
        }
    }

    fn order(self) -> u8 {
        match self {
            BridgeStrain::Clubs => 0,
            BridgeStrain::Diamonds => 1,
            BridgeStrain::Hearts => 2,
            BridgeStrain::Spades => 3,
            BridgeStrain::NoTrump => 4,
        }
    }

    fn from_suit(suit: Suit) -> Self {
        match suit {
            Suit::Clubs => Self::Clubs,
            Suit::Diamonds => Self::Diamonds,
            Suit::Hearts => Self::Hearts,
            Suit::Spades => Self::Spades,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeVulnerability {
    None,
    NorthSouth,
    EastWest,
    Both,
}

impl BridgeVulnerability {
    pub fn from_label(label: &str) -> Option<Self> {
        match label {
            "None" => Some(Self::None),
            "NS" => Some(Self::NorthSouth),
            "EW" => Some(Self::EastWest),
            "Both" => Some(Self::Both),
            _ => None,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            BridgeVulnerability::None => "None",
            BridgeVulnerability::NorthSouth => "NS",
            BridgeVulnerability::EastWest => "EW",
            BridgeVulnerability::Both => "Both",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeSide {
    NorthSouth,
    EastWest,
}

impl BridgeSide {
    pub fn label(self) -> &'static str {
        match self {
            BridgeSide::NorthSouth => "NS",
            BridgeSide::EastWest => "EW",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BridgeBid {
    pub level: u8,
    pub strain: BridgeStrain,
}

impl BridgeBid {
    pub fn new(level: u8, strain: BridgeStrain) -> Option<Self> {
        if (1..=7).contains(&level) {
            Some(Self { level, strain })
        } else {
            None
        }
    }

    pub fn id(self) -> String {
        format!("{}{}", self.level, self.strain.short_name())
    }

    pub fn long_label(self) -> String {
        format!("{} {}", self.level, self.strain.long_name())
    }

    fn target(self) -> u8 {
        self.level + 6
    }

    fn order(self) -> u8 {
        (self.level - 1) * 5 + self.strain.order()
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeCall {
    Pass,
    Double,
    Redouble,
    Bid(BridgeBid),
}

impl BridgeCall {
    pub fn id(self) -> String {
        match self {
            Self::Pass => "Pass".to_string(),
            Self::Double => "Double".to_string(),
            Self::Redouble => "Redouble".to_string(),
            Self::Bid(bid) => bid.id(),
        }
    }

    pub fn from_label(label: &str) -> Option<Self> {
        let trimmed = label.trim();
        let upper = trimmed.to_ascii_uppercase();

        match upper.as_str() {
            "P" | "PASS" => return Some(Self::Pass),
            "X" | "DOUBLE" => return Some(Self::Double),
            "XX" | "REDOUBLE" => return Some(Self::Redouble),
            _ => {}
        }

        let normalized = upper
            .replace("NO TRUMPS", "NT")
            .replace("NO TRUMP", "NT")
            .replace("CLUBS", "C")
            .replace("CLUB", "C")
            .replace("DIAMONDS", "D")
            .replace("DIAMOND", "D")
            .replace("HEARTS", "H")
            .replace("HEART", "H")
            .replace("SPADES", "S")
            .replace("SPADE", "S")
            .replace('♣', "C")
            .replace('♦', "D")
            .replace('♥', "H")
            .replace('♠', "S")
            .replace(' ', "");

        let mut chars = normalized.chars();
        let level = chars.next()?.to_digit(10)? as u8;
        let strain_label = chars.as_str();
        let strain = BridgeStrain::from_label(strain_label)?;

        BridgeBid::new(level, strain).map(Self::Bid)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BridgeAuctionCall {
    pub seat: PlayerIndex,
    pub call: BridgeCall,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BridgeAuctionStatus {
    pub current_seat: PlayerIndex,
    pub complete: bool,
    pub passed_out: bool,
    pub doubled: bool,
    pub redoubled: bool,
    pub last_bid: Option<BridgeAuctionCall>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BridgeContract {
    pub level: u8,
    pub strain: BridgeStrain,
    pub label: String,
    pub declarer: PlayerIndex,
    pub dummy: PlayerIndex,
    pub target: u8,
    pub vulnerability: BridgeVulnerability,
    pub doubled: bool,
    pub redoubled: bool,
    pub declarer_side: BridgeSide,
    pub dealer: PlayerIndex,
    pub opening_leader: PlayerIndex,
}

pub fn bridge_side_for_seat(seat: PlayerIndex) -> BridgeSide {
    if seat % 2 == 0 {
        BridgeSide::NorthSouth
    } else {
        BridgeSide::EastWest
    }
}

pub fn bridge_auction_status(
    calls: &[BridgeAuctionCall],
    dealer: PlayerIndex,
) -> BridgeAuctionStatus {
    let current_seat = (dealer + calls.len()) % 4;
    let last_bid_index = calls
        .iter()
        .rposition(|call| matches!(call.call, BridgeCall::Bid(_)));
    let last_bid = last_bid_index.map(|index| calls[index]);
    let passed_out = last_bid_index.is_none()
        && calls.len() >= 4
        && calls
            .iter()
            .rev()
            .take(4)
            .all(|call| call.call == BridgeCall::Pass);
    let complete = passed_out
        || last_bid_index.is_some_and(|index| {
            calls.len() >= index + 4
                && calls[calls.len().saturating_sub(3)..]
                    .iter()
                    .all(|call| call.call == BridgeCall::Pass)
        });
    let (doubled, redoubled) = last_bid_index
        .map(|index| contract_modifier(&calls[index + 1..]))
        .unwrap_or((false, false));

    BridgeAuctionStatus {
        current_seat,
        complete,
        passed_out,
        doubled,
        redoubled,
        last_bid,
    }
}

pub fn bridge_legal_calls(
    calls: &[BridgeAuctionCall],
    seat: PlayerIndex,
    dealer: PlayerIndex,
) -> Vec<BridgeCall> {
    let status = bridge_auction_status(calls, dealer);

    if status.complete || status.current_seat != seat {
        return Vec::new();
    }

    let mut legal = vec![BridgeCall::Pass];

    if bridge_can_double(calls, seat, dealer) {
        legal.push(BridgeCall::Double);
    }
    if bridge_can_redouble(calls, seat, dealer) {
        legal.push(BridgeCall::Redouble);
    }

    for level in 1..=7 {
        for strain in BridgeStrain::ALL {
            let bid = BridgeBid { level, strain };
            if bridge_can_bid(bid, calls) {
                legal.push(BridgeCall::Bid(bid));
            }
        }
    }

    legal
}

pub fn bridge_finalize_contract(
    calls: &[BridgeAuctionCall],
    dealer: PlayerIndex,
    vulnerability: BridgeVulnerability,
) -> Option<BridgeContract> {
    let last_bid_call = calls
        .iter()
        .rev()
        .copied()
        .find(|call| matches!(call.call, BridgeCall::Bid(_)))?;
    let BridgeCall::Bid(bid) = last_bid_call.call else {
        return None;
    };

    let declarer_side = bridge_side_for_seat(last_bid_call.seat);
    let declarer = calls
        .iter()
        .copied()
        .find(|call| {
            bridge_side_for_seat(call.seat) == declarer_side
                && matches!(call.call, BridgeCall::Bid(first_bid) if first_bid.strain == bid.strain)
        })
        .map(|call| call.seat)
        .unwrap_or(last_bid_call.seat);
    let dummy = (declarer + 2) % 4;
    let opening_leader = (declarer + 1) % 4;
    let status = bridge_auction_status(calls, dealer);
    let suffix = if status.redoubled {
        " redoubled"
    } else if status.doubled {
        " doubled"
    } else {
        ""
    };

    Some(BridgeContract {
        level: bid.level,
        strain: bid.strain,
        label: format!("{}{}", bid.long_label(), suffix),
        declarer,
        dummy,
        target: bid.target(),
        vulnerability,
        doubled: status.doubled,
        redoubled: status.redoubled,
        declarer_side,
        dealer,
        opening_leader,
    })
}

pub fn bridge_duplicate_score(contract: &BridgeContract, declarer_tricks: u8) -> i32 {
    let overtricks = declarer_tricks as i32 - contract.target as i32;

    if overtricks < 0 {
        return -bridge_undertrick_penalty(contract, -overtricks);
    }

    let contract_points = bridge_contract_trick_points(contract);
    let game_bonus = if contract_points >= 100 {
        if bridge_contract_is_vulnerable(contract) {
            500
        } else {
            300
        }
    } else {
        50
    };
    let slam_bonus = match contract.level {
        6 if bridge_contract_is_vulnerable(contract) => 750,
        6 => 500,
        7 if bridge_contract_is_vulnerable(contract) => 1500,
        7 => 1000,
        _ => 0,
    };
    let insult = if contract.redoubled {
        100
    } else if contract.doubled {
        50
    } else {
        0
    };

    contract_points
        + game_bonus
        + slam_bonus
        + insult
        + bridge_overtrick_points(contract, overtricks)
}

pub fn bridge_suggest_call(
    hand: &[Card],
    seat: PlayerIndex,
    calls: &[BridgeAuctionCall],
    dealer: PlayerIndex,
) -> BridgeCall {
    let points = bridge_high_card_points(hand);
    let legal = bridge_legal_calls(calls, seat, dealer);
    let last_bid = bridge_last_bid(calls);
    if last_bid.is_none() {
        return opening_bid_for_hand(hand)
            .filter(|bid| legal.contains(&BridgeCall::Bid(*bid)))
            .map(BridgeCall::Bid)
            .unwrap_or(BridgeCall::Pass);
    }

    natural_response(hand, seat, calls, points, &legal)
}

// Same agreements and priority order as src/bridgeBidding.ts. Shared fixtures
// exercise both implementations, including seat rotations and interrupted auctions.
fn natural_response(
    hand: &[Card],
    seat: PlayerIndex,
    calls: &[BridgeAuctionCall],
    points: u8,
    legal: &[BridgeCall],
) -> BridgeCall {
    use BridgeStrain::{Clubs as C, Diamonds as D, Hearts as H, NoTrump as NT, Spades as S};
    let suits = [S, H, D, C];
    let count = |suit| bridge_strain_count(hand, suit);
    let balanced = bridge_is_balanced(hand);
    let suit = BridgeStrain::from_suit(bridge_longest_suit(hand));
    let partner = (seat + 2) % 4;
    let bids: Vec<_> = calls
        .iter()
        .enumerate()
        .filter_map(|(index, call)| match call.call {
            BridgeCall::Bid(bid) => Some((index, call.seat, bid)),
            _ => None,
        })
        .collect();
    let ours: Vec<_> = bids.iter().filter(|bid| bid.1 == seat).collect();
    let partners: Vec<_> = bids.iter().filter(|bid| bid.1 == partner).collect();
    let opponents: Vec<_> = bids
        .iter()
        .filter(|bid| bid.1 != seat && bid.1 != partner)
        .collect();
    let own = ours.last().copied();
    let partner_bid = partners.last().copied();
    let last = bids.last().unwrap().2;
    let choose = |level, strain| {
        let call = BridgeCall::Bid(BridgeBid { level, strain });
        if legal.contains(&call) {
            call
        } else {
            BridgeCall::Pass
        }
    };
    let game = |strain| {
        if strain == NT {
            3
        } else if strain == H || strain == S {
            4
        } else {
            5
        }
    };
    let stopped = opponents.iter().all(|bid| {
        hand.iter().any(|card| {
            BridgeStrain::from_suit(card.suit) == bid.2.strain
                && (card.rank == Rank::Ace
                    || (card.rank == Rank::King && count(bid.2.strain) >= 2)
                    || (card.rank == Rank::Queen && count(bid.2.strain) >= 3))
        })
    });
    if legal.is_empty() {
        return BridgeCall::Pass;
    }
    let partner_action = calls
        .iter()
        .rev()
        .find(|call| call.seat == partner && call.call != BridgeCall::Pass);
    if own.is_none()
        && partner_bid.is_none()
        && partner_action.is_some_and(|call| call.call == BridgeCall::Double)
        && last.level <= 2
    {
        let mut unbid: Vec<_> = suits
            .into_iter()
            .filter(|suit| !opponents.iter().any(|bid| bid.2.strain == *suit))
            .collect();
        unbid.sort_by_key(|suit| std::cmp::Reverse(count(*suit)));
        for suit in unbid {
            if let Some(bid) = all_bridge_bids().into_iter().find(|bid| {
                bid.strain == suit && bid.level <= 3 && legal.contains(&BridgeCall::Bid(*bid))
            }) {
                return BridgeCall::Bid(bid);
            }
        }
    }
    if own.is_none() {
        if let Some((_, _, bid)) = partner_bid {
            if partners[0].2
                == (BridgeBid {
                    level: 2,
                    strain: C,
                })
            {
                return choose(2, D);
            }
            if bid.strain == NT {
                if bid.level >= 3 {
                    return BridgeCall::Pass;
                }
                let base = if bid.level == 1 { 15 } else { 20 };
                if let Some(major) = [S, H].into_iter().find(|major| count(*major) >= 6) {
                    if points + base >= 25 {
                        return choose(4, major);
                    }
                }
                if points + base >= 25 && stopped {
                    return choose(3, NT);
                }
                if bid.level == 1 && points >= 8 && stopped {
                    return choose(2, NT);
                }
                if bid.level == 1 && count(suit) >= 5 && (suit == S || suit == H) {
                    return choose(2, suit);
                }
                return BridgeCall::Pass;
            }
            if bid.level == 2 {
                return if count(bid.strain) >= 3 && points >= 15 {
                    choose(game(bid.strain), bid.strain)
                } else {
                    BridgeCall::Pass
                };
            }
            if bid.level != 1 || points < 6 {
                return BridgeCall::Pass;
            }
            if (bid.strain == H || bid.strain == S) && count(bid.strain) >= 3 {
                return choose(
                    if points >= 13 {
                        4
                    } else if points >= 10 {
                        3
                    } else {
                        2
                    },
                    bid.strain,
                );
            }
            let majors = if count(S) >= 5 && count(S) >= count(H) {
                [S, H]
            } else {
                [H, S]
            };
            for major in majors {
                if count(major) >= 4 && choose(1, major) != BridgeCall::Pass {
                    return choose(1, major);
                }
            }
            if points >= 10
                && count(suit) >= 5
                && suit != bid.strain
                && choose(2, suit) != BridgeCall::Pass
            {
                return choose(2, suit);
            }
            if points >= 13 && balanced && stopped {
                return choose(3, NT);
            }
            if points >= 10 && balanced && stopped {
                return choose(2, NT);
            }
            if count(bid.strain) >= 5 {
                return choose(if points >= 10 { 3 } else { 2 }, bid.strain);
            }
            return if stopped {
                choose(1, NT)
            } else {
                BridgeCall::Pass
            };
        }
    }
    if let (Some((own_index, _, own)), Some((partner_index, _, bid))) = (own, partner_bid) {
        if partner_index > own_index {
            let opened = bids[0].1 == seat;
            if opened
                && ours.len() == 1
                && *own
                    == (BridgeBid {
                        level: 2,
                        strain: C,
                    })
                && *bid
                    == (BridgeBid {
                        level: 2,
                        strain: D,
                    })
            {
                return if balanced {
                    choose(if points >= 25 { 3 } else { 2 }, NT)
                } else {
                    choose(if suit == H || suit == S { 2 } else { 3 }, suit)
                };
            }
            if !opened
                && partners[0].2
                    == (BridgeBid {
                        level: 2,
                        strain: C,
                    })
            {
                if bid.strain == NT {
                    return if points >= 3 {
                        choose(3, NT)
                    } else {
                        BridgeCall::Pass
                    };
                }
                if count(bid.strain) >= 3 {
                    return choose(game(bid.strain), bid.strain);
                }
                return choose(3, NT);
            }
            if bid.level >= game(bid.strain) {
                return BridgeCall::Pass;
            }
            if own.strain == NT
                && *bid
                    == (BridgeBid {
                        level: 2,
                        strain: NT,
                    })
            {
                return if points >= if opened { 17 } else { 12 } {
                    choose(3, NT)
                } else {
                    BridgeCall::Pass
                };
            }
            if own.strain == bid.strain {
                let needed = if opened {
                    if bid.level == 2 {
                        19
                    } else {
                        15
                    }
                } else {
                    13
                };
                return if points >= needed {
                    choose(game(own.strain), own.strain)
                } else {
                    BridgeCall::Pass
                };
            }
            if own.strain == NT {
                return BridgeCall::Pass;
            }
            if opened
                && *bid
                    == (BridgeBid {
                        level: 2,
                        strain: NT,
                    })
            {
                return if points >= 15 {
                    choose(3, NT)
                } else {
                    BridgeCall::Pass
                };
            }
            if (bid.strain == H || bid.strain == S)
                && count(bid.strain) >= if opened { 4 } else { 3 }
            {
                return choose(
                    if points >= if opened { 19 } else { 13 } {
                        4
                    } else if points >= if opened { 17 } else { 10 } {
                        3
                    } else {
                        2
                    },
                    bid.strain,
                );
            }
            if balanced && stopped {
                return if opened {
                    let rebid = choose(if points >= 18 { 2 } else { 1 }, NT);
                    if rebid == BridgeCall::Pass {
                        choose(2, own.strain)
                    } else {
                        rebid
                    }
                } else if points >= 13 {
                    choose(3, NT)
                } else if points >= 11 {
                    choose(2, NT)
                } else {
                    BridgeCall::Pass
                };
            }
            if count(own.strain) >= 6 {
                return choose(2, own.strain);
            }
            if opened {
                for second in suits {
                    if second == own.strain || count(second) < 4 {
                        continue;
                    }
                    if let Some(bid) = all_bridge_bids().into_iter().find(|bid| {
                        bid.strain == second
                            && bid.level <= 2
                            && legal.contains(&BridgeCall::Bid(*bid))
                    }) {
                        if bid.level == 1 || second.order() < own.strain.order() || points >= 17 {
                            return BridgeCall::Bid(bid);
                        }
                    }
                }
                return choose(2, own.strain);
            }
            return BridgeCall::Pass;
        }
    }
    if own.is_none() && partner_bid.is_none() && !opponents.is_empty() {
        if last.strain != NT
            && last.level <= 2
            && points >= 12
            && count(last.strain) <= 2
            && suits
                .into_iter()
                .filter(|suit| *suit != last.strain)
                .all(|suit| count(suit) >= 3)
            && legal.contains(&BridgeCall::Double)
        {
            return BridgeCall::Double;
        }
        if balanced && (15..=18).contains(&points) && stopped && choose(1, NT) != BridgeCall::Pass {
            return choose(1, NT);
        }
        if count(suit) >= 5 && points >= 10 {
            if let Some(bid) = all_bridge_bids().into_iter().find(|bid| {
                bid.strain == suit
                    && (bid.level == 1 || (bid.level == 2 && points >= 13))
                    && legal.contains(&BridgeCall::Bid(*bid))
            }) {
                return BridgeCall::Bid(bid);
            }
        }
    }
    BridgeCall::Pass
}

pub fn bridge_high_card_points(cards: &[Card]) -> u8 {
    cards
        .iter()
        .map(|card| match card.rank {
            Rank::Ace => 4,
            Rank::King => 3,
            Rank::Queen => 2,
            Rank::Jack => 1,
            _ => 0,
        })
        .sum()
}

fn opening_bid_for_hand(hand: &[Card]) -> Option<BridgeBid> {
    let points = bridge_high_card_points(hand);
    let balanced = bridge_is_balanced(hand);

    if points >= 22 {
        return BridgeBid::new(2, BridgeStrain::Clubs);
    }
    if balanced && (20..=21).contains(&points) {
        return BridgeBid::new(2, BridgeStrain::NoTrump);
    }
    if balanced && (15..=17).contains(&points) {
        return BridgeBid::new(1, BridgeStrain::NoTrump);
    }
    if points >= 13 {
        // Simple 5-card major logic or longest minor
        let spades = bridge_strain_count(hand, BridgeStrain::Spades);
        let hearts = bridge_strain_count(hand, BridgeStrain::Hearts);
        let diamonds = bridge_strain_count(hand, BridgeStrain::Diamonds);
        let clubs = bridge_strain_count(hand, BridgeStrain::Clubs);

        if spades >= 5 && spades >= hearts {
            return BridgeBid::new(1, BridgeStrain::Spades);
        } else if hearts >= 5 {
            return BridgeBid::new(1, BridgeStrain::Hearts);
        } else if diamonds > clubs || (diamonds == clubs && diamonds >= 4) {
            return BridgeBid::new(1, BridgeStrain::Diamonds);
        } else {
            return BridgeBid::new(1, BridgeStrain::Clubs);
        }
    }

    // Weak two
    let longest_suit = BridgeStrain::from_suit(bridge_longest_suit(hand));
    if (5..=11).contains(&points)
        && bridge_strain_count(hand, longest_suit) >= 6
        && longest_suit != BridgeStrain::Clubs
    {
        return BridgeBid::new(2, longest_suit);
    }

    None
}

fn bridge_can_bid(bid: BridgeBid, calls: &[BridgeAuctionCall]) -> bool {
    match bridge_last_bid(calls) {
        Some(last_bid) => bid.order() > last_bid.order(),
        None => true,
    }
}

fn bridge_can_double(calls: &[BridgeAuctionCall], seat: PlayerIndex, dealer: PlayerIndex) -> bool {
    let status = bridge_auction_status(calls, dealer);
    let Some(last_bid_call) = status.last_bid else {
        return false;
    };

    !status.complete
        && !status.doubled
        && !status.redoubled
        && bridge_side_for_seat(last_bid_call.seat) != bridge_side_for_seat(seat)
}

fn bridge_can_redouble(
    calls: &[BridgeAuctionCall],
    seat: PlayerIndex,
    dealer: PlayerIndex,
) -> bool {
    let status = bridge_auction_status(calls, dealer);
    let Some(last_bid_call) = status.last_bid else {
        return false;
    };

    !status.complete
        && status.doubled
        && !status.redoubled
        && bridge_side_for_seat(last_bid_call.seat) == bridge_side_for_seat(seat)
}

fn bridge_last_bid(calls: &[BridgeAuctionCall]) -> Option<BridgeBid> {
    calls.iter().rev().find_map(|call| match call.call {
        BridgeCall::Bid(bid) => Some(bid),
        _ => None,
    })
}

fn bridge_contract_is_vulnerable(contract: &BridgeContract) -> bool {
    match contract.vulnerability {
        BridgeVulnerability::Both => true,
        BridgeVulnerability::NorthSouth => contract.declarer_side == BridgeSide::NorthSouth,
        BridgeVulnerability::EastWest => contract.declarer_side == BridgeSide::EastWest,
        BridgeVulnerability::None => false,
    }
}

fn bridge_contract_trick_points(contract: &BridgeContract) -> i32 {
    let base = match contract.strain {
        BridgeStrain::Clubs | BridgeStrain::Diamonds => 20,
        BridgeStrain::Hearts | BridgeStrain::Spades | BridgeStrain::NoTrump => 30,
    };
    let no_trump_bonus = if contract.strain == BridgeStrain::NoTrump {
        10
    } else {
        0
    };
    let undoubled = contract.level as i32 * base + no_trump_bonus;

    undoubled
        * if contract.redoubled {
            4
        } else if contract.doubled {
            2
        } else {
            1
        }
}

fn bridge_overtrick_points(contract: &BridgeContract, overtricks: i32) -> i32 {
    if overtricks <= 0 {
        return 0;
    }

    if contract.redoubled {
        return overtricks
            * if bridge_contract_is_vulnerable(contract) {
                400
            } else {
                200
            };
    }
    if contract.doubled {
        return overtricks
            * if bridge_contract_is_vulnerable(contract) {
                200
            } else {
                100
            };
    }

    overtricks
        * match contract.strain {
            BridgeStrain::Clubs | BridgeStrain::Diamonds => 20,
            BridgeStrain::Hearts | BridgeStrain::Spades | BridgeStrain::NoTrump => 30,
        }
}

fn bridge_undertrick_penalty(contract: &BridgeContract, undertricks: i32) -> i32 {
    if undertricks <= 0 {
        return 0;
    }

    if !contract.doubled && !contract.redoubled {
        return undertricks
            * if bridge_contract_is_vulnerable(contract) {
                100
            } else {
                50
            };
    }

    let doubled_penalty = (0..undertricks).fold(0, |total, index| {
        total
            + if bridge_contract_is_vulnerable(contract) {
                if index == 0 {
                    200
                } else {
                    300
                }
            } else if index == 0 {
                100
            } else if index <= 2 {
                200
            } else {
                300
            }
    });

    if contract.redoubled {
        doubled_penalty * 2
    } else {
        doubled_penalty
    }
}

fn bridge_is_balanced(cards: &[Card]) -> bool {
    let mut counts = Suit::ALL.map(|suit| suit_count(cards, suit));
    counts.sort_unstable();

    counts[0] >= 2 && counts[3] <= 5
}

fn bridge_longest_suit(cards: &[Card]) -> Suit {
    Suit::ALL
        .into_iter()
        .max_by_key(|suit| {
            (
                suit_count(cards, *suit),
                BridgeStrain::from_suit(*suit).order(),
            )
        })
        .unwrap_or(Suit::Clubs)
}

fn bridge_strain_count(cards: &[Card], strain: BridgeStrain) -> usize {
    match strain {
        BridgeStrain::Clubs => suit_count(cards, Suit::Clubs),
        BridgeStrain::Diamonds => suit_count(cards, Suit::Diamonds),
        BridgeStrain::Hearts => suit_count(cards, Suit::Hearts),
        BridgeStrain::Spades => suit_count(cards, Suit::Spades),
        BridgeStrain::NoTrump => 0,
    }
}

fn suit_count(cards: &[Card], suit: Suit) -> usize {
    cards.iter().filter(|card| card.suit == suit).count()
}

fn contract_modifier(calls_after_last_bid: &[BridgeAuctionCall]) -> (bool, bool) {
    calls_after_last_bid
        .iter()
        .fold((false, false), |(doubled, redoubled), call| {
            match call.call {
                BridgeCall::Double => (true, false),
                BridgeCall::Redouble => (false, true),
                _ => (doubled, redoubled),
            }
        })
}

fn all_bridge_bids() -> Vec<BridgeBid> {
    let mut bids = Vec::with_capacity(35);
    for level in 1..=7 {
        for strain in BridgeStrain::ALL {
            bids.push(BridgeBid { level, strain });
        }
    }
    bids
}

#[cfg(test)]
mod tests {
    use super::*;

    fn card(rank: Rank, suit: Suit) -> Card {
        Card::new(rank, suit)
    }

    fn bid(level: u8, strain: BridgeStrain) -> BridgeCall {
        BridgeCall::Bid(BridgeBid { level, strain })
    }

    fn contract(
        level: u8,
        strain: BridgeStrain,
        vulnerability: BridgeVulnerability,
    ) -> BridgeContract {
        BridgeContract {
            level,
            strain,
            label: BridgeBid { level, strain }.long_label(),
            declarer: 2,
            dummy: 0,
            target: level + 6,
            vulnerability,
            doubled: false,
            redoubled: false,
            declarer_side: BridgeSide::NorthSouth,
            dealer: 2,
            opening_leader: 3,
        }
    }

    #[test]
    fn duplicate_score_awards_non_vulnerable_major_game() {
        let score = bridge_duplicate_score(
            &contract(4, BridgeStrain::Spades, BridgeVulnerability::None),
            10,
        );

        assert_eq!(score, 420);
    }

    #[test]
    fn duplicate_score_awards_vulnerable_notrump_game() {
        let score = bridge_duplicate_score(
            &contract(3, BridgeStrain::NoTrump, BridgeVulnerability::NorthSouth),
            9,
        );

        assert_eq!(score, 600);
    }

    #[test]
    fn duplicate_score_counts_doubled_overtricks_and_insult() {
        let mut contract = contract(2, BridgeStrain::Hearts, BridgeVulnerability::None);
        contract.doubled = true;

        assert_eq!(bridge_duplicate_score(&contract, 9), 570);
    }

    #[test]
    fn duplicate_score_penalizes_vulnerable_doubled_undertricks() {
        let mut contract = contract(4, BridgeStrain::Spades, BridgeVulnerability::NorthSouth);
        contract.doubled = true;

        assert_eq!(bridge_duplicate_score(&contract, 8), -500);
    }

    #[test]
    fn auction_passes_out_after_four_passes() {
        let calls = [
            BridgeAuctionCall {
                seat: 2,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 3,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 0,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 1,
                call: BridgeCall::Pass,
            },
        ];

        let status = bridge_auction_status(&calls, 2);

        assert!(status.complete);
        assert!(status.passed_out);
    }

    #[test]
    fn contract_declarer_is_first_partnership_bidder_in_strain() {
        let calls = [
            BridgeAuctionCall {
                seat: 2,
                call: bid(1, BridgeStrain::Hearts),
            },
            BridgeAuctionCall {
                seat: 3,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 0,
                call: bid(2, BridgeStrain::Hearts),
            },
            BridgeAuctionCall {
                seat: 1,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 2,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 3,
                call: BridgeCall::Pass,
            },
        ];

        let contract =
            bridge_finalize_contract(&calls, 2, BridgeVulnerability::None).expect("contract");

        assert_eq!(contract.declarer, 2);
        assert_eq!(contract.dummy, 0);
        assert_eq!(contract.opening_leader, 3);
        assert_eq!(contract.label, "2 Hearts");
    }

    #[test]
    fn contract_keeps_double_after_closing_passes() {
        let calls = [
            BridgeAuctionCall {
                seat: 2,
                call: bid(1, BridgeStrain::Spades),
            },
            BridgeAuctionCall {
                seat: 3,
                call: BridgeCall::Double,
            },
            BridgeAuctionCall {
                seat: 0,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 1,
                call: BridgeCall::Pass,
            },
            BridgeAuctionCall {
                seat: 2,
                call: BridgeCall::Pass,
            },
        ];

        let status = bridge_auction_status(&calls, 2);
        let contract =
            bridge_finalize_contract(&calls, 2, BridgeVulnerability::None).expect("contract");

        assert!(status.complete);
        assert!(contract.doubled);
        assert_eq!(contract.label, "1 Spades doubled");
    }

    #[test]
    fn double_and_redouble_legality_follow_partnerships() {
        let calls = [BridgeAuctionCall {
            seat: 2,
            call: bid(1, BridgeStrain::Spades),
        }];

        assert!(bridge_legal_calls(&calls, 3, 2).contains(&BridgeCall::Double));
        assert!(!bridge_legal_calls(&calls, 0, 2).contains(&BridgeCall::Double));

        let doubled = [
            calls[0],
            BridgeAuctionCall {
                seat: 3,
                call: BridgeCall::Double,
            },
        ];

        assert!(bridge_legal_calls(&doubled, 0, 2).contains(&BridgeCall::Redouble));
        assert!(!bridge_legal_calls(&doubled, 1, 2).contains(&BridgeCall::Redouble));
    }

    #[test]
    fn natural_opening_recommends_one_of_longest_major() {
        let hand = [
            card(Rank::Ace, Suit::Spades),
            card(Rank::King, Suit::Spades),
            card(Rank::Queen, Suit::Spades),
            card(Rank::Ten, Suit::Spades),
            card(Rank::Two, Suit::Spades),
            card(Rank::Ace, Suit::Hearts),
            card(Rank::Three, Suit::Hearts),
            card(Rank::Four, Suit::Diamonds),
            card(Rank::Five, Suit::Diamonds),
            card(Rank::Six, Suit::Clubs),
            card(Rank::Seven, Suit::Clubs),
            card(Rank::Eight, Suit::Clubs),
            card(Rank::Nine, Suit::Clubs),
        ];

        assert_eq!(
            bridge_suggest_call(&hand, 2, &[], 2),
            bid(1, BridgeStrain::Spades)
        );
    }

    #[test]
    fn natural_opening_passes_light_hands() {
        let hand = [
            card(Rank::Two, Suit::Clubs),
            card(Rank::Three, Suit::Clubs),
            card(Rank::Four, Suit::Clubs),
            card(Rank::Five, Suit::Diamonds),
            card(Rank::Six, Suit::Diamonds),
            card(Rank::Seven, Suit::Diamonds),
            card(Rank::Eight, Suit::Hearts),
            card(Rank::Nine, Suit::Hearts),
            card(Rank::Ten, Suit::Hearts),
            card(Rank::Two, Suit::Spades),
            card(Rank::Three, Suit::Spades),
            card(Rank::Four, Suit::Spades),
            card(Rank::Five, Suit::Spades),
        ];

        assert_eq!(bridge_suggest_call(&hand, 2, &[], 2), BridgeCall::Pass);
    }

    #[test]
    fn standard_opening_passes_twelve_count_hands() {
        let hand = [
            card(Rank::Ace, Suit::Spades),
            card(Rank::King, Suit::Spades),
            card(Rank::Queen, Suit::Spades),
            card(Rank::Two, Suit::Spades),
            card(Rank::King, Suit::Hearts),
            card(Rank::Three, Suit::Hearts),
            card(Rank::Four, Suit::Hearts),
            card(Rank::Two, Suit::Diamonds),
            card(Rank::Three, Suit::Diamonds),
            card(Rank::Four, Suit::Diamonds),
            card(Rank::Five, Suit::Clubs),
            card(Rank::Six, Suit::Clubs),
            card(Rank::Seven, Suit::Clubs),
        ];

        assert_eq!(bridge_suggest_call(&hand, 2, &[], 2), BridgeCall::Pass);
    }

    #[test]
    fn standard_opening_prefers_five_card_major() {
        let hand = [
            card(Rank::Ace, Suit::Spades),
            card(Rank::King, Suit::Spades),
            card(Rank::Queen, Suit::Spades),
            card(Rank::Two, Suit::Spades),
            card(Rank::Three, Suit::Spades),
            card(Rank::Ace, Suit::Hearts),
            card(Rank::Two, Suit::Hearts),
            card(Rank::Two, Suit::Diamonds),
            card(Rank::Three, Suit::Diamonds),
            card(Rank::Four, Suit::Diamonds),
            card(Rank::Five, Suit::Clubs),
            card(Rank::Six, Suit::Clubs),
            card(Rank::Seven, Suit::Clubs),
        ];

        assert_eq!(
            bridge_suggest_call(&hand, 2, &[], 2),
            bid(1, BridgeStrain::Spades)
        );
    }

    #[test]
    fn weak_two_opens_six_card_major_below_opening_strength() {
        let hand = [
            card(Rank::King, Suit::Spades),
            card(Rank::Queen, Suit::Spades),
            card(Rank::Jack, Suit::Spades),
            card(Rank::Ten, Suit::Spades),
            card(Rank::Nine, Suit::Spades),
            card(Rank::Two, Suit::Spades),
            card(Rank::Three, Suit::Hearts),
            card(Rank::Four, Suit::Hearts),
            card(Rank::Five, Suit::Diamonds),
            card(Rank::Six, Suit::Diamonds),
            card(Rank::Seven, Suit::Clubs),
            card(Rank::Eight, Suit::Clubs),
            card(Rank::Nine, Suit::Clubs),
        ];

        assert_eq!(
            bridge_suggest_call(&hand, 2, &[], 2),
            bid(2, BridgeStrain::Spades)
        );
    }
}
