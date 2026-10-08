mod account;
mod agent_gateway;
mod commands;
mod csv_processor;
mod error;
mod market_watcher;
mod models;
mod sqlite;
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
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:schoice.db", sqlite::migrations::value())
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

            let account_manager =
                account::AccountManager::new().map_err(|error| std::io::Error::other(error))?;
            app.manage(account_manager.clone());

            // 監聽更新
            tauri::async_runtime::spawn(async move {
                if let Err(e) = updater::update(handle).await {
                    log::error!("Update check failed: {:?}", e);
                }
            });

            // 初始化市場觀察者 (Market Watcher)
            let market_manager = market_watcher::init(app.handle().clone());
            app.manage(market_manager.clone());

            let gateway = match agent_gateway::start(app.handle(), account_manager, market_manager)
            {
                Ok(gateway) => {
                    log::info!("SLstening Agent gateway ready at {}", gateway.endpoint);
                    gateway
                }
                Err(error) => {
                    // MCP is an optional local integration. A bind, path, or
                    // thread failure must not prevent the stock app from
                    // starting, and the command remains available so clients
                    // can see a safe unavailable status.
                    log::error!("SLstening Agent gateway unavailable: {error}");
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
            commands::account::account_get_state,
            commands::account::account_update_state,
            commands::account::account_import_legacy,
            commands::export::create_csv_from_json,
            commands::storage::get_db_size,
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
