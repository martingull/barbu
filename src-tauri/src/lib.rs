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

#[derive(serde::Serialize)]
struct GameSummary {
    id: &'static str,
    title: &'static str,
    family: &'static str,
    players: u8,
    contract_count: usize,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![current_game])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
