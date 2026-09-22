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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![open_privacy_policy])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
