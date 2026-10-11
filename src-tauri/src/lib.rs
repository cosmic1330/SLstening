mod account;
mod agent_gateway;
mod commands;
mod csv_processor;
mod diagnostics;
mod error;
mod legacy_settings;
mod local_preferences;
mod market_watcher;
mod models;
mod updater;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        // Keep the frontend plugin commands, while the native logger owns live
        // size-based rotation (the plugin only checks size when it starts).
        .plugin(tauri_plugin_log::Builder::new().skip_logger().build())
        .setup(|app| {
            let handle = app.handle().clone();
            let log_dir = handle.path().app_log_dir()?;
            diagnostics::init_local_logger(log_dir).map_err(std::io::Error::other)?;
            let release = format!("slistening@{}", app.package_info().version);
            diagnostics::init(&release);

            let account_manager =
                account::AccountManager::new().map_err(|error| std::io::Error::other(error))?;
            app.manage(account_manager.clone());
            let local_preferences = local_preferences::LocalPreferencesManager::new(handle.clone());
            app.manage(local_preferences.clone());
            app.manage(legacy_settings::LegacySettingsManager::new(handle.clone()));

            // 監聽更新
            tauri::async_runtime::spawn(async move {
                if let Err(e) = updater::update(handle).await {
                    log::warn!("Update check failed: {:?}", e);
                }
            });

            // 初始化市場觀察者 (Market Watcher)
            let market_manager = market_watcher::init(app.handle().clone());
            app.manage(market_manager.clone());

            let gateway = match agent_gateway::start(
                app.handle(),
                account_manager,
                market_manager,
                local_preferences,
            ) {
                Ok(gateway) => {
                    log::info!("SLstening Agent gateway ready at {}", gateway.endpoint);
                    gateway
                }
                Err(error) => {
                    // MCP is an optional local integration. A bind, path, or
                    // thread failure must not prevent the stock app from
                    // starting, and the command remains available so clients
                    // can see a safe unavailable status.
                    log::warn!("SLstening Agent gateway unavailable: {error}");
                    agent_gateway::AgentGateway::unavailable(app.handle(), error)
                }
            };
            app.manage(gateway);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::common::greet,
            commands::account::account_set_session,
            commands::account::account_clear_session,
            commands::account::account_invalidate_session,
            commands::account::account_get_session,
            commands::account::agent_get_config,
            commands::account::diagnostics_open_log_dir,
            commands::account::legacy_settings_status,
            commands::account::legacy_settings_keep,
            commands::account::legacy_settings_delete,
            commands::account::account_get_state,
            commands::account::account_update_state,
            commands::account::account_get_indicator_settings,
            commands::account::account_update_indicator_settings,
            commands::account::account_reset_indicator_settings,
            commands::export::create_csv_from_json,
            commands::market::subscribe_stock,
            commands::market::unsubscribe_stock,
            commands::market::get_market_data,
            commands::chip::get_chip_data
        ])
        .run(tauri::generate_context!())
    {
        log::error!("error while running tauri application: {}", e);
    }
}
