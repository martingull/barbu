#[tauri::command]
fn current_game() -> GameSummary {
    let lesson = barbu_core::barbu_learning_path();

    GameSummary {
        id: lesson.id,
        title: lesson.title,
        family: lesson.family,
        players: lesson.players,
        contract_count: lesson.contracts.len(),
    }
}

#[tauri::command]
fn generate_no_hearts_follow_suit(seed: u64) -> PracticeScenarioDto {
    let scenario = barbu_core::generate_no_hearts_follow_suit(seed);
    PracticeScenarioDto::from_core(&scenario)
}

#[tauri::command]
fn generate_daily_drill_set(seed: u64) -> PracticeDrillSetDto {
    let drill_set = barbu_core::generate_daily_drill_set(seed);
    PracticeDrillSetDto::from_core(&drill_set)
}

#[tauri::command]
fn generate_hearts_pass_practice(seed: u64) -> HeartsPassScenarioDto {
    let scenario = barbu_core::generate_hearts_pass_practice(seed);
    HeartsPassScenarioDto::from_core(&scenario)
}

#[tauri::command]
fn start_no_hearts_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_no_hearts_hand(seed);
    FullHandDto::from_core(&state, "No Hearts", "point")
}

#[tauri::command]
fn play_no_hearts_hand_card(state: FullHandDto, card_id: String) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_no_hearts_card(state, card)?;

    Ok(FullHandDto::from_core(&next_state, "No Hearts", "point"))
}

#[tauri::command]
fn start_hearts_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_hearts_hand(seed);
    FullHandDto::from_core(&state, "Hearts", "point")
}

#[tauri::command]
fn start_hearts_passing_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_hearts_passing_hand(seed);
    FullHandDto::from_core(&state, "Hearts", "point")
}

#[tauri::command]
fn apply_hearts_pass(state: FullHandDto, card_ids: Vec<String>) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let cards = card_ids
        .iter()
        .map(|card_id| card_from_label(card_id))
        .collect::<Result<Vec<_>, _>>()?;
    let next_state = barbu_core::apply_hearts_pass(state, cards)?;

    Ok(FullHandDto::from_core(&next_state, "Hearts", "point"))
}

#[tauri::command]
fn play_hearts_hand_card(state: FullHandDto, card_id: String) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_hearts_card(state, card)?;

    Ok(FullHandDto::from_core(&next_state, "Hearts", "point"))
}

#[tauri::command]
fn start_no_queens_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_no_queens_hand(seed);
    FullHandDto::from_core(&state, "No Queens", "point")
}

#[tauri::command]
fn play_no_queens_hand_card(state: FullHandDto, card_id: String) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_no_queens_card(state, card)?;

    Ok(FullHandDto::from_core(&next_state, "No Queens", "point"))
}

#[tauri::command]
fn start_no_last_two_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_no_last_two_hand(seed);
    FullHandDto::from_core(&state, "No Last Two", "point")
}

#[tauri::command]
fn play_no_last_two_hand_card(state: FullHandDto, card_id: String) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_no_last_two_card(state, card)?;

    Ok(FullHandDto::from_core(&next_state, "No Last Two", "point"))
}

#[tauri::command]
fn start_no_tricks_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_no_tricks_hand(seed);
    FullHandDto::from_core(&state, "No Tricks", "point")
}

#[tauri::command]
fn play_no_tricks_hand_card(state: FullHandDto, card_id: String) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_no_tricks_card(state, card)?;

    Ok(FullHandDto::from_core(&next_state, "No Tricks", "point"))
}

#[tauri::command]
fn start_positive_tricks_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_positive_tricks_hand(seed);
    FullHandDto::from_core(&state, "Hearts Trumps", "point")
}

#[tauri::command]
fn play_positive_tricks_hand_card(
    state: FullHandDto,
    card_id: String,
) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_positive_tricks_card(state, card)?;

    Ok(FullHandDto::from_core(
        &next_state,
        "Hearts Trumps",
        "point",
    ))
}

#[tauri::command]
fn start_king_of_hearts_hand(seed: u64) -> FullHandDto {
    let state = barbu_core::start_king_of_hearts_hand(seed);
    FullHandDto::from_core(&state, "King of Hearts", "point")
}

#[tauri::command]
fn play_king_of_hearts_hand_card(
    state: FullHandDto,
    card_id: String,
) -> Result<FullHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_king_of_hearts_card(state, card)?;

    Ok(FullHandDto::from_core(
        &next_state,
        "King of Hearts",
        "point",
    ))
}

#[tauri::command]
fn start_domino_hand(seed: u64) -> DominoHandDto {
    let state = barbu_core::start_domino_hand(seed);
    DominoHandDto::from_core(&state)
}

#[tauri::command]
fn play_domino_card(state: DominoHandDto, card_id: String) -> Result<DominoHandDto, String> {
    let state = state.to_core()?;
    let card = card_from_label(&card_id)?;
    let next_state = barbu_core::play_domino_card(state, card)?;

    Ok(DominoHandDto::from_core(&next_state))
}

#[tauri::command]
fn pass_domino_turn(state: DominoHandDto) -> Result<DominoHandDto, String> {
    let state = state.to_core()?;
    let next_state = barbu_core::pass_domino_turn(state)?;

    Ok(DominoHandDto::from_core(&next_state))
}

#[derive(serde::Serialize)]
struct GameSummary {
    id: &'static str,
    title: &'static str,
    family: &'static str,
    players: u8,
    contract_count: usize,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PracticeDrillSetDto {
    id: String,
    title: String,
    scenarios: Vec<PracticeScenarioDto>,
}

impl PracticeDrillSetDto {
    fn from_core(drill_set: &barbu_core::PracticeDrillSet) -> Self {
        Self {
            id: drill_set.id.clone(),
            title: drill_set.title.clone(),
            scenarios: drill_set
                .scenarios
                .iter()
                .map(PracticeScenarioDto::from_core)
                .collect(),
        }
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PracticeScenarioDto {
    id: String,
    title: String,
    contract: String,
    led_suit: String,
    prompt: String,
    table_before_choice: Vec<PlayedCardDto>,
    player_hand: Vec<CardDto>,
    table_after_choice: Vec<PlayedCardDto>,
    legal_card_ids: Vec<String>,
    outcomes: Vec<PracticeOutcomeDto>,
}

impl PracticeScenarioDto {
    fn from_core(scenario: &barbu_core::PracticeScenario) -> Self {
        Self {
            id: scenario.id.clone(),
            title: scenario.title.clone(),
            contract: scenario.contract.clone(),
            led_suit: scenario.led_suit.short_name().to_string(),
            prompt: scenario.prompt.clone(),
            table_before_choice: scenario
                .table_before_choice
                .iter()
                .copied()
                .map(PlayedCardDto::from_core)
                .collect(),
            player_hand: scenario
                .player_hand
                .iter()
                .copied()
                .map(CardDto::from_core)
                .collect(),
            table_after_choice: scenario
                .table_after_choice
                .iter()
                .copied()
                .map(PlayedCardDto::from_core)
                .collect(),
            legal_card_ids: scenario
                .legal_player_cards()
                .iter()
                .map(ToString::to_string)
                .collect(),
            outcomes: scenario
                .player_hand
                .iter()
                .copied()
                .map(|card| PracticeOutcomeDto::from_core(scenario.outcome_for(card)))
                .collect(),
        }
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct HeartsPassScenarioDto {
    id: String,
    title: String,
    prompt: String,
    player_hand: Vec<CardDto>,
    recommended_pass: Vec<CardDto>,
    explanation: String,
}

impl HeartsPassScenarioDto {
    fn from_core(scenario: &barbu_core::HeartsPassScenario) -> Self {
        Self {
            id: scenario.id.clone(),
            title: scenario.title.clone(),
            prompt: scenario.prompt.clone(),
            player_hand: scenario
                .player_hand
                .iter()
                .copied()
                .map(CardDto::from_core)
                .collect(),
            recommended_pass: scenario
                .recommended_pass
                .iter()
                .copied()
                .map(CardDto::from_core)
                .collect(),
            explanation: scenario.explanation.clone(),
        }
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PracticeOutcomeDto {
    card_id: String,
    outcome_kind: String,
    reason: String,
    is_legal: bool,
    winner: Option<String>,
    penalty: Option<i32>,
    explanation: String,
    completed_trick: Option<Vec<PlayedCardDto>>,
}

impl PracticeOutcomeDto {
    fn from_core(outcome: barbu_core::PracticeOutcome) -> Self {
        Self {
            card_id: outcome.player_card.to_string(),
            outcome_kind: outcome.outcome_kind.as_str().to_string(),
            reason: outcome.reason.as_str().to_string(),
            is_legal: outcome.is_legal,
            winner: outcome.winner.map(player_name).map(str::to_string),
            penalty: outcome.penalty,
            explanation: outcome.explanation,
            completed_trick: outcome.completed_trick.map(|played_cards| {
                played_cards
                    .into_iter()
                    .map(PlayedCardDto::from_core)
                    .collect()
            }),
        }
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FullHandDto {
    id: String,
    contract: String,
    hands: Vec<Vec<CardDto>>,
    current_player_index: usize,
    current_player: String,
    current_trick: Vec<PlayedCardDto>,
    completed_tricks: Vec<CompletedTrickDto>,
    player_hand: Vec<CardDto>,
    legal_card_ids: Vec<String>,
    player_penalty: i32,
    total_penalty: i32,
    cards_remaining: usize,
    trick_number: usize,
    status: String,
    prompt: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DominoHandDto {
    id: String,
    contract: String,
    hands: Vec<Vec<CardDto>>,
    current_player_index: usize,
    current_player: String,
    start_rank: Option<String>,
    layout: Vec<Vec<CardDto>>,
    passed_players: Vec<String>,
    out_order: Vec<String>,
    player_hand: Vec<CardDto>,
    legal_card_ids: Vec<String>,
    scores: Vec<i32>,
    cards_remaining: usize,
    status: String,
    prompt: String,
}

impl DominoHandDto {
    fn from_core(state: &barbu_core::DominoHandState) -> Self {
        let scores = state.scores();

        Self {
            id: state.id.clone(),
            contract: "Domino".to_string(),
            hands: state
                .hands
                .iter()
                .map(|hand| hand.iter().copied().map(CardDto::from_core).collect())
                .collect(),
            current_player_index: state.current_player,
            current_player: player_name(state.current_player).to_string(),
            start_rank: Some(state.start_rank.short_name().to_string()),
            layout: state
                .layout
                .iter()
                .map(|lane| lane.iter().copied().map(CardDto::from_core).collect())
                .collect(),
            passed_players: state
                .passed_players
                .iter()
                .copied()
                .map(player_name)
                .map(str::to_string)
                .collect(),
            out_order: state
                .out_order
                .iter()
                .copied()
                .map(player_name)
                .map(str::to_string)
                .collect(),
            player_hand: state.hands[2]
                .iter()
                .copied()
                .map(CardDto::from_core)
                .collect(),
            legal_card_ids: state
                .legal_cards_for_player(2)
                .iter()
                .map(ToString::to_string)
                .collect(),
            scores: scores.to_vec(),
            cards_remaining: state.hands.iter().map(Vec::len).sum(),
            status: state.status.as_str().to_string(),
            prompt: domino_prompt(state),
        }
    }

    fn to_core(&self) -> Result<barbu_core::DominoHandState, String> {
        let hands = hands_from_dto(&self.hands)?;
        let layout = hands_from_dto(&self.layout)?;
        let mut layout_array = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];

        for (index, lane) in layout.into_iter().enumerate().take(4) {
            layout_array[index] = lane;
        }

        Ok(barbu_core::DominoHandState {
            id: self.id.clone(),
            hands,
            current_player: self.current_player_index,
            start_rank: rank_from_label(
                self.start_rank
                    .as_deref()
                    .unwrap_or(barbu_core::DOMINO_START_RANK.short_name()),
            )?,
            layout: layout_array,
            passed_players: self
                .passed_players
                .iter()
                .map(|player| player_index(player))
                .collect::<Result<Vec<_>, _>>()?,
            out_order: self
                .out_order
                .iter()
                .map(|player| player_index(player))
                .collect::<Result<Vec<_>, _>>()?,
            status: match self.status.as_str() {
                "in_progress" => barbu_core::DominoStatus::InProgress,
                "complete" => barbu_core::DominoStatus::Complete,
                _ => return Err(format!("Unknown Domino status: {}", self.status)),
            },
        })
    }
}

impl FullHandDto {
    fn from_core(
        state: &barbu_core::TrickTakingHandState,
        contract: &'static str,
        penalty_name: &'static str,
    ) -> Self {
        Self {
            id: state.id.clone(),
            contract: contract.to_string(),
            hands: state
                .hands
                .iter()
                .map(|hand| hand.iter().copied().map(CardDto::from_core).collect())
                .collect(),
            current_player_index: state.current_player,
            current_player: player_name(state.current_player).to_string(),
            current_trick: state
                .current_trick
                .iter()
                .copied()
                .map(PlayedCardDto::from_core)
                .collect(),
            completed_tricks: state
                .completed_tricks
                .iter()
                .enumerate()
                .map(|(index, trick)| CompletedTrickDto::from_core(trick, contract, index + 1))
                .collect(),
            player_hand: state.hands[2]
                .iter()
                .copied()
                .map(CardDto::from_core)
                .collect(),
            legal_card_ids: state
                .legal_player_cards()
                .iter()
                .map(ToString::to_string)
                .collect(),
            player_penalty: state.player_penalty(),
            total_penalty: state.total_penalty(),
            cards_remaining: state.cards_remaining(),
            trick_number: state.trick_number(),
            status: state.status.as_str().to_string(),
            prompt: hand_prompt(state, penalty_name),
        }
    }

    fn to_core(&self) -> Result<barbu_core::TrickTakingHandState, String> {
        let hands = hands_from_dto(&self.hands)?;

        Ok(barbu_core::TrickTakingHandState {
            id: self.id.clone(),
            hands,
            current_player: self.current_player_index,
            current_trick: self
                .current_trick
                .iter()
                .map(PlayedCardDto::to_core)
                .collect::<Result<Vec<_>, _>>()?,
            completed_tricks: self
                .completed_tricks
                .iter()
                .map(CompletedTrickDto::to_core)
                .collect::<Result<Vec<_>, _>>()?,
            status: match self.status.as_str() {
                "in_progress" => barbu_core::HandStatus::InProgress,
                "complete" => barbu_core::HandStatus::Complete,
                _ => return Err(format!("Unknown hand status: {}", self.status)),
            },
        })
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CompletedTrickDto {
    cards: Vec<PlayedCardDto>,
    winner: String,
    winner_index: usize,
    penalty: i32,
    outcome: String,
    #[serde(default)]
    tactical_tags: Vec<String>,
}

impl CompletedTrickDto {
    fn from_core(trick: &barbu_core::CompletedTrick, contract: &str, trick_number: usize) -> Self {
        Self {
            cards: trick
                .cards
                .iter()
                .copied()
                .map(PlayedCardDto::from_core)
                .collect(),
            winner: player_name(trick.winner).to_string(),
            winner_index: trick.winner,
            penalty: trick.penalty,
            outcome: trick.player_outcome().as_str().to_string(),
            tactical_tags: barbu_core::completed_trick_tactical_tags(contract, trick_number, trick)
                .into_iter()
                .map(str::to_string)
                .collect(),
        }
    }

    fn to_core(&self) -> Result<barbu_core::CompletedTrick, String> {
        Ok(barbu_core::CompletedTrick {
            cards: self
                .cards
                .iter()
                .map(PlayedCardDto::to_core)
                .collect::<Result<Vec<_>, _>>()?,
            winner: self.winner_index,
            penalty: self.penalty,
        })
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
struct PlayedCardDto {
    seat: String,
    card: CardDto,
}

impl PlayedCardDto {
    fn from_core(played: barbu_core::PlayedCard) -> Self {
        Self {
            seat: player_name(played.player).to_string(),
            card: CardDto::from_core(played.card),
        }
    }
}

impl PlayedCardDto {
    fn to_core(&self) -> Result<barbu_core::PlayedCard, String> {
        Ok(barbu_core::PlayedCard::new(
            player_index(&self.seat)?,
            self.card.to_core()?,
        ))
    }
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct CardDto {
    id: String,
    rank: String,
    suit: String,
    label: String,
}

impl CardDto {
    fn from_core(card: barbu_core::Card) -> Self {
        let label = card.to_string();

        Self {
            id: label.clone(),
            rank: card.rank.short_name().to_string(),
            suit: card.suit.short_name().to_string(),
            label,
        }
    }

    fn to_core(&self) -> Result<barbu_core::Card, String> {
        card_from_label(&self.label)
    }
}

fn hands_from_dto(hands: &[Vec<CardDto>]) -> Result<[Vec<barbu_core::Card>; 4], String> {
    if hands.len() != 4 {
        return Err("Expected four hands.".to_string());
    }

    Ok([
        cards_from_dto(&hands[0])?,
        cards_from_dto(&hands[1])?,
        cards_from_dto(&hands[2])?,
        cards_from_dto(&hands[3])?,
    ])
}

fn cards_from_dto(cards: &[CardDto]) -> Result<Vec<barbu_core::Card>, String> {
    cards.iter().map(CardDto::to_core).collect()
}

fn card_from_label(label: &str) -> Result<barbu_core::Card, String> {
    if label.len() < 2 {
        return Err(format!("Invalid card label: {label}"));
    }

    let (rank_label, suit_label) = label.split_at(label.len() - 1);
    let rank = rank_from_label(rank_label)?;
    let suit = match suit_label {
        "C" => barbu_core::Suit::Clubs,
        "D" => barbu_core::Suit::Diamonds,
        "H" => barbu_core::Suit::Hearts,
        "S" => barbu_core::Suit::Spades,
        _ => return Err(format!("Invalid card suit: {suit_label}")),
    };

    Ok(barbu_core::Card::new(rank, suit))
}

fn rank_from_label(rank_label: &str) -> Result<barbu_core::Rank, String> {
    Ok(match rank_label {
        "2" => barbu_core::Rank::Two,
        "3" => barbu_core::Rank::Three,
        "4" => barbu_core::Rank::Four,
        "5" => barbu_core::Rank::Five,
        "6" => barbu_core::Rank::Six,
        "7" => barbu_core::Rank::Seven,
        "8" => barbu_core::Rank::Eight,
        "9" => barbu_core::Rank::Nine,
        "10" => barbu_core::Rank::Ten,
        "J" => barbu_core::Rank::Jack,
        "Q" => barbu_core::Rank::Queen,
        "K" => barbu_core::Rank::King,
        "A" => barbu_core::Rank::Ace,
        _ => return Err(format!("Invalid card rank: {rank_label}")),
    })
}

fn hand_prompt(state: &barbu_core::TrickTakingHandState, penalty_name: &str) -> String {
    if state.status == barbu_core::HandStatus::Complete {
        let plural = if state.player_penalty() == 1 {
            penalty_name.to_string()
        } else {
            format!("{penalty_name}s")
        };

        return format!(
            "Hand complete. You took {} {}.",
            state.player_penalty(),
            plural
        );
    }

    if state.current_trick.is_empty() {
        return "You won the last trick. Lead any card to the next trick.".to_string();
    }

    let led_suit = state
        .current_trick
        .first()
        .map(|played| suit_name(played.card.suit))
        .unwrap_or("the led suit");

    format!("{} were led. Follow suit if you can.", led_suit)
}

fn domino_prompt(state: &barbu_core::DominoHandState) -> String {
    if state.status == barbu_core::DominoStatus::Complete {
        let scores = state.scores();
        return format!(
            "Domino complete. You scored {} points.",
            scores.get(2).copied().unwrap_or(0)
        );
    }

    if state.legal_cards_for_player(2).is_empty() {
        return "No legal placement. Pass and wait for the layout to open.".to_string();
    }

    format!(
        "Play a {} to start a suit, or extend a suit by one rank.",
        state.start_rank.short_name()
    )
}

fn suit_name(suit: barbu_core::Suit) -> &'static str {
    match suit {
        barbu_core::Suit::Clubs => "Clubs",
        barbu_core::Suit::Diamonds => "Diamonds",
        barbu_core::Suit::Hearts => "Hearts",
        barbu_core::Suit::Spades => "Spades",
    }
}

fn player_name(player: barbu_core::PlayerIndex) -> &'static str {
    match player {
        0 => "Tutor",
        1 => "Right",
        2 => "You",
        3 => "Left",
        _ => "Unknown",
    }
}

fn player_index(player: &str) -> Result<barbu_core::PlayerIndex, String> {
    match player {
        "Tutor" => Ok(0),
        "Right" => Ok(1),
        "You" => Ok(2),
        "Left" => Ok(3),
        _ => Err(format!("Unknown player: {player}")),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            apply_hearts_pass,
            current_game,
            generate_daily_drill_set,
            generate_hearts_pass_practice,
            generate_no_hearts_follow_suit,
            pass_domino_turn,
            play_domino_card,
            play_hearts_hand_card,
            play_king_of_hearts_hand_card,
            play_no_hearts_hand_card,
            play_no_last_two_hand_card,
            play_no_queens_hand_card,
            play_no_tricks_hand_card,
            play_positive_tricks_hand_card,
            start_domino_hand,
            start_hearts_hand,
            start_hearts_passing_hand,
            start_king_of_hearts_hand,
            start_no_hearts_hand,
            start_no_last_two_hand,
            start_no_queens_hand,
            start_no_tricks_hand,
            start_positive_tricks_hand
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
