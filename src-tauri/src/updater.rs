use crate::error::AppError;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_store::StoreExt;
use tauri_plugin_updater::UpdaterExt;

const APP_PREFERENCES_FILE: &str = "app-preferences.json";
const AUTO_UPDATE_ENABLED_KEY: &str = "auto-update-enabled";

pub fn auto_update_enabled(app: &tauri::AppHandle) -> bool {
    app.store(APP_PREFERENCES_FILE)
        .ok()
        .and_then(|store| store.get(AUTO_UPDATE_ENABLED_KEY))
        .and_then(|value| value.as_bool())
        .unwrap_or(true)
}

pub fn set_auto_update_enabled(
    app: &tauri::AppHandle,
    enabled: bool,
) -> Result<(), String> {
    let store = app
        .store(APP_PREFERENCES_FILE)
        .map_err(|_| "APP_PREFERENCES_UNAVAILABLE".to_string())?;
    store.set(AUTO_UPDATE_ENABLED_KEY, enabled);
    store
        .save()
        .map_err(|_| "APP_PREFERENCES_WRITE_FAILED".to_string())
}

pub async fn update(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(update) = app.updater()?.check().await? {
        let version = &update.version;

        let ans = app
            .dialog()
            .message(&format!("Update available: v{}", version))
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancel)
            .blocking_show();

        if ans {
            let mut downloaded = 0;
            if let Err(e) = update
                .download_and_install(
                    |chunk_length, content_length| {
                        downloaded += chunk_length;
                        if let Some(total) = content_length {
                            log::info!(
                                "downloaded {:.2}%",
                                (downloaded as f64 / total as f64) * 100.0
                            );
                        } else {
                            log::info!("downloaded {} bytes", downloaded);
                        }
                    },
                    || {
                        log::info!("download finished");
                    },
                )
                .await
            {
                log::error!("Download Update failed: {}", e);
                app.dialog()
                    .message(&format!("Download Update failed: {}", e))
                    .kind(MessageDialogKind::Warning)
                    .buttons(MessageDialogButtons::Ok)
                    .blocking_show();
            } else {
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
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{APP_PREFERENCES_FILE, AUTO_UPDATE_ENABLED_KEY};

    #[test]
    fn preference_names_are_stable() {
        assert_eq!(APP_PREFERENCES_FILE, "app-preferences.json");
        assert_eq!(AUTO_UPDATE_ENABLED_KEY, "auto-update-enabled");
    }
}
