pub mod cards;
pub mod guided;
pub mod hand;
pub mod learning;
pub mod practice;
pub mod trick;

pub use cards::{Card, Rank, Suit};
pub use guided::{
    first_no_hearts_trick, no_hearts_guided_tricks, second_no_hearts_trick, GuidedNoHeartsTrick,
    GuidedTrickResult, Seat,
};
pub use hand::{
    play_king_of_hearts_card, play_no_hearts_card, play_no_queens_card, play_trick_taking_card,
    start_king_of_hearts_hand, start_no_hearts_hand, start_no_queens_hand, start_trick_taking_hand,
    CompletedTrick, HandStatus, HandTrickOutcome, KingOfHeartsHandState, NoHeartsHandState,
    NoQueensHandState, OpponentPolicyFn, TrickScoreFn, TrickTakingHandState,
};
pub use learning::{barbu_learning_path, ContractLesson, GameLesson, LessonStep};
pub use practice::{
    generate_daily_drill_set, generate_king_of_hearts_capture, generate_king_of_hearts_practice,
    generate_king_of_hearts_void_discard, generate_no_hearts_follow_suit,
    generate_no_hearts_practice, generate_no_hearts_void_discard, generate_no_queens_capture,
    generate_no_queens_practice, generate_no_queens_void_discard, PracticeContractKind,
    PracticeDrillSet, PracticeOutcome, PracticeOutcomeKind, PracticeOutcomeReason,
    PracticeScenario,
};
pub use trick::{legal_cards, score_no_hearts_trick, trick_winner, PlayedCard, PlayerIndex};
