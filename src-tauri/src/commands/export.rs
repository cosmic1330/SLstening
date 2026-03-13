use crate::error::AppError;
use crate::csv_processor::write_entities_to_csv;
use crate::models::{DataEntity, Deal, Skills};
use serde_json::from_str;
use std::fs;
use tauri::Manager;

#[tauri::command]
pub fn create_csv_from_json(
    app_handle: tauri::AppHandle,
    json_data: String,
    csv_name: String,
    data_type: String,
) -> Result<(), AppError> {
    let app_data_dir = app_handle.path().app_data_dir()?;

    let temp_dir = app_data_dir.join("temp");

    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir)?;
    }

    let csv_path = temp_dir.join(&csv_name);

    if csv_path.exists() {
        fs::remove_file(&csv_path)?;
    }

    let entities: Vec<DataEntity> = match data_type.as_str() {
        "Deal" => from_str::<Vec<Deal>>(&json_data)
            .map(|deals| deals.into_iter().map(DataEntity::Deal).collect())
            .map_err(|e| AppError::Database(format!("JSON 解析失敗 (Deal): {}，表: {}", e, &csv_name)))?,
        "Skills" => from_str::<Vec<Skills>>(&json_data)
            .map(|skills| skills.into_iter().map(DataEntity::Skills).collect())
            .map_err(|e| AppError::Database(format!("JSON 解析失敗 (Skills): {}，表:  {}", e, &csv_name)))?,
        _ => return Err(AppError::Unknown(format!("未知的 data_type: {}", data_type))),
    };

    write_entities_to_csv(&entities, &csv_path)?;
    Ok(())
}
