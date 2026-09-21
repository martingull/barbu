#[tauri::command]
async fn open_privacy_policy(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    app.opener()
        .open_url(
            "https://martingull.github.io/barbu/privacy-policy.html",
            None::<&str>,
        )
        .map_err(|error| error.to_string())
}

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
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            open_privacy_policy,
            current_game,
            pass_domino_turn,
            play_domino_card,
            start_domino_hand,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domino_completes_through_serialized_command_adapters() {
        for seed in [1, 8, 42] {
            let mut state = start_domino_hand(seed);
            for _ in 0..100 {
                state = serde_json::from_value(serde_json::to_value(&state).unwrap()).unwrap();
                if state.status == "complete" {
                    break;
                }
                state = if let Some(card) = state.legal_card_ids.first().cloned() {
                    play_domino_card(state, card).unwrap()
                } else {
                    pass_domino_turn(state).unwrap()
                };
            }
            assert_eq!(state.status, "complete");
            assert_eq!(state.cards_remaining, 0);
            assert!(state.layout.iter().all(|lane| lane.len() == 13));
            state.scores.sort();
            assert_eq!(state.scores, vec![-5, 5, 20, 45]);
        }
    }
}
