use crate::cards::Card;
use crate::hand::{
    play_trick_taking_card, TrickTakingHandState, TrickScoreFn, OpponentPolicyFn,
    start_hearts_hand, play_hearts_card, start_whist_hand, play_whist_card,
    start_no_hearts_hand, play_no_hearts_card,
    start_no_queens_hand, play_no_queens_card,
    start_king_of_hearts_hand, play_king_of_hearts_card,
    start_no_last_two_hand, play_no_last_two_card,
    start_no_tricks_hand, play_no_tricks_card,
    start_positive_tricks_hand, play_positive_tricks_card,
    start_trick_taking_hand,
};
use crate::domino::{DominoHandState, start_domino_hand, play_domino_card, pass_domino_turn};

pub trait Ruleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState;
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String>;
    fn score_type(&self) -> &'static str;
}

pub struct HeartsRuleset;
impl Ruleset for HeartsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_hearts_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_hearts_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub struct WhistRuleset;
impl Ruleset for WhistRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_whist_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_whist_card(state, card)
    }
    fn score_type(&self) -> &'static str { "trick" }
}

pub struct NoHeartsRuleset;
impl Ruleset for NoHeartsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_hearts_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_no_hearts_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub struct NoQueensRuleset;
impl Ruleset for NoQueensRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_queens_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_no_queens_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub struct KingOfHeartsRuleset;
impl Ruleset for KingOfHeartsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_king_of_hearts_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_king_of_hearts_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub struct NoLastTwoRuleset;
impl Ruleset for NoLastTwoRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_last_two_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_no_last_two_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub struct NoTricksRuleset;
impl Ruleset for NoTricksRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_tricks_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_no_tricks_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub struct HeartsTrumpsRuleset;
impl Ruleset for HeartsTrumpsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_positive_tricks_hand(seed)
    }
    fn play_card(&self, state: TrickTakingHandState, card: Card) -> Result<TrickTakingHandState, String> {
        play_positive_tricks_card(state, card)
    }
    fn score_type(&self) -> &'static str { "point" }
}

pub fn get_ruleset(game_id: &str, contract: &str) -> Box<dyn Ruleset> {
    match contract {
        "Hearts" => Box::new(HeartsRuleset),
        "Whist" => Box::new(WhistRuleset),
        "No Hearts" => Box::new(NoHeartsRuleset),
        "No Queens" => Box::new(NoQueensRuleset),
        "King of Hearts" => Box::new(KingOfHeartsRuleset),
        "No Last Two" => Box::new(NoLastTwoRuleset),
        "No Tricks" => Box::new(NoTricksRuleset),
        "Hearts Trumps" => Box::new(HeartsTrumpsRuleset),
        _ => panic!("Unknown contract or not a TrickTaking ruleset: {}", contract),
    }
}
