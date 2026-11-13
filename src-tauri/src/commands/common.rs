use crate::updater;
use tauri::AppHandle;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_auto_update_enabled(app: AppHandle) -> bool {
    updater::auto_update_enabled(&app)
}

#[tauri::command]
pub fn set_auto_update_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    updater::set_auto_update_enabled(&app, enabled)
}
