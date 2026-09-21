use crate::cards::Card;
use crate::hand::{
    play_king_of_hearts_card, play_no_hearts_card, play_no_last_two_card, play_no_queens_card,
    play_no_tricks_card, play_positive_tricks_card, start_king_of_hearts_hand,
    start_no_hearts_hand, start_no_last_two_hand, start_no_queens_hand, start_no_tricks_hand,
    start_positive_tricks_hand, TrickTakingHandState,
};

pub trait Ruleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState;
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String>;
    fn score_type(&self) -> &'static str;
}

pub struct NoHeartsRuleset;
impl Ruleset for NoHeartsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_hearts_hand(seed)
    }
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String> {
        play_no_hearts_card(state, card)
    }
    fn score_type(&self) -> &'static str {
        "point"
    }
}

pub struct NoQueensRuleset;
impl Ruleset for NoQueensRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_queens_hand(seed)
    }
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String> {
        play_no_queens_card(state, card)
    }
    fn score_type(&self) -> &'static str {
        "point"
    }
}

pub struct KingOfHeartsRuleset;
impl Ruleset for KingOfHeartsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_king_of_hearts_hand(seed)
    }
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String> {
        play_king_of_hearts_card(state, card)
    }
    fn score_type(&self) -> &'static str {
        "point"
    }
}

pub struct NoLastTwoRuleset;
impl Ruleset for NoLastTwoRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_last_two_hand(seed)
    }
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String> {
        play_no_last_two_card(state, card)
    }
    fn score_type(&self) -> &'static str {
        "point"
    }
}

pub struct NoTricksRuleset;
impl Ruleset for NoTricksRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_no_tricks_hand(seed)
    }
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String> {
        play_no_tricks_card(state, card)
    }
    fn score_type(&self) -> &'static str {
        "point"
    }
}

pub struct HeartsTrumpsRuleset;
impl Ruleset for HeartsTrumpsRuleset {
    fn start_hand(&self, seed: u64) -> TrickTakingHandState {
        start_positive_tricks_hand(seed)
    }
    fn play_card(
        &self,
        state: TrickTakingHandState,
        card: Card,
    ) -> Result<TrickTakingHandState, String> {
        play_positive_tricks_card(state, card)
    }
    fn score_type(&self) -> &'static str {
        "point"
    }
}

// Migrated games must never silently fall back to a different native ruleset.
pub fn get_ruleset(_game_id: &str, contract: &str) -> Result<Box<dyn Ruleset>, String> {
    match contract {
        "Hearts" | "Whist" | "Spades" => {
            Err(format!("{contract} hand play uses the TypeScript engine"))
        }

        "No Hearts" => Ok(Box::new(NoHeartsRuleset)),
        "No Queens" => Ok(Box::new(NoQueensRuleset)),
        "King of Hearts" => Ok(Box::new(KingOfHeartsRuleset)),
        "No Last Two" => Ok(Box::new(NoLastTwoRuleset)),
        "No Tricks" => Ok(Box::new(NoTricksRuleset)),
        "Hearts Trumps" => Ok(Box::new(HeartsTrumpsRuleset)),
        _ => Err(format!("Unsupported native hand contract: {contract}")),
    }
}
