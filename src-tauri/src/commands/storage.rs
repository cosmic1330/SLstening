use crate::error::AppError;
use tauri::Manager;

#[tauri::command]
pub fn get_db_size(app_handle: tauri::AppHandle) -> Result<(u64, String), AppError> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    let db_path = app_data_dir.join("schoice.db");
    let size = std::fs::metadata(&db_path)
        .map(|meta| meta.len())?;
    Ok((size, db_path.to_string_lossy().to_string()))
}
