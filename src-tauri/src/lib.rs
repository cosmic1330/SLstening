mod csv_processor;
mod models; // 匯入 models 模組
mod sqlite;

use csv_processor::write_entities_to_csv;
use models::{DataEntity, Deal, Skills};
use serde_json::from_str;
use std::fs;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let version = &update.version;

        let ans = app
            .dialog()
            .message(&format!("Update available: v{}", version))
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancel)
            .blocking_show();

        let mut downloaded = 0;
        if ans {
            if let Err(e) = update
                .download_and_install(
                    |chunk_length, content_length| {
                        downloaded += chunk_length;

                        // 修正進度顯示格式
                        let progress = match content_length {
                            Some(total) => {
                                format!(
                                    "downloaded {:.2}%",
                                    (downloaded as f64 / total as f64) * 100.0
                                )
                            }
                            None => format!("{} bytes", downloaded),
                        };
                        println!("{}", progress);
                    },
                    || {
                        println!("download finished");
                    },
                )
                .await
            {
                println!("Download Update failed message: {}", e);
                app.dialog()
                    .message(&format!("Download Update failed: {}", e))
                    .kind(MessageDialogKind::Warning)
                    .buttons(MessageDialogButtons::Ok)
                    .blocking_show();
            } else {
                // 下載完成後，顯示訊息框詢問是否重新啟動應用程式
                let restart_ans = app
                    .dialog()
                    .message("Update downloaded. Restart now?")
                    .kind(MessageDialogKind::Info)
                    .buttons(MessageDialogButtons::OkCancel)
                    .blocking_show();

                if restart_ans {
                    app.restart();
                }
            }
        } else {
            println!("User canceled the update.");
        }
    } else {
        println!("No updates available.");
    }

    Ok(())
}

#[tauri::command]
fn create_csv_from_json(
    app_handle: tauri::AppHandle,
    json_data: String,
    csv_name: String,
    data_type: String,
) -> Result<(), String> {
    // 获取应用程序数据目录
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let temp_dir = app_data_dir.join("temp");

    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir).map_err(|e| format!("無法創建 temp 資料夾: {}", e))?;
    }

    let csv_path = temp_dir.join(&csv_name);

    // 如果檔案已存在，先刪除
    if csv_path.exists() {
        fs::remove_file(&csv_path).map_err(|e| format!("無法刪除已存在的檔案: {}", e))?;
    }

    // 解析 JSON 資料
    let entities: Vec<DataEntity> = match data_type.as_str() {
        "Deal" => from_str::<Vec<Deal>>(&json_data)
            .map(|deals| deals.into_iter().map(DataEntity::Deal).collect())
            .map_err(|e| format!("JSON 解析失敗 (Deal): {}，表: {}", e, &csv_name)),
        "Skills" => from_str::<Vec<Skills>>(&json_data)
            .map(|skills| skills.into_iter().map(DataEntity::Skills).collect())
            .map_err(|e| format!("JSON 解析失敗 (Skills): {}，表:  {}", e, &csv_name)),
        _ => return Err(format!("未知的 data_type: {}", data_type)),
    }?;

    write_entities_to_csv(&entities, &csv_path).map_err(|e| format!("CSV 創建失敗: {:?}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:slistening.db", sqlite::migrations::value())
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_csv_from_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
