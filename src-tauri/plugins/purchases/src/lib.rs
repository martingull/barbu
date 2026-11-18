use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(target_os = "android")]
use tauri::Manager;
use tauri::{plugin::TauriPlugin, Runtime};

#[cfg(target_os = "android")]
struct Purchases<R: Runtime>(tauri::plugin::PluginHandle<R>);

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub android_api_key: String,
    pub purchases_enabled: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Operation {
    Availability,
    Customer,
    Offers,
    Purchase,
    Restore,
    Manage,
    Terms,
    Privacy,
    SupportInfo,
    CopySupportId,
    Support,
}

#[tauri::command]
async fn request<R: Runtime>(
    _app: tauri::AppHandle<R>,
    operation: Operation,
    package_id: Option<String>,
) -> Result<Value, String> {
    #[cfg(target_os = "android")]
    {
        let handle = _app.state::<Purchases<R>>().0.clone();
        tauri::async_runtime::spawn_blocking(move || {
            handle.run_mobile_plugin::<Value>(
                "request",
                json!({ "operation": operation, "packageId": package_id }),
            )
        })
        .await
        .map_err(|_| "Purchase service unavailable".to_string())?
        .map_err(|error| error.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = package_id;
        match operation {
            Operation::Availability => Ok(json!({ "available": false, "purchasesEnabled": false })),
            _ => Err("Purchases are not supported on this platform".into()),
        }
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R, Config> {
    tauri::plugin::Builder::<R, Config>::new("barbu-purchases")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            _app.manage(Purchases(
                _api.register_android_plugin("com.martin.barbu.purchases", "PurchasesPlugin")?,
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![request])
        .build()
}
