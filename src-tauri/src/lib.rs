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

#[derive(serde::Serialize)]
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

#[derive(serde::Serialize)]
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            current_game,
            generate_daily_drill_set,
            generate_no_hearts_follow_suit
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
