use crate::error::AppError;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

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
                            log::info!("downloaded {:.2}%", (downloaded as f64 / total as f64) * 100.0);
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
