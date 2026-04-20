use tauri::{AppHandle, Emitter, State};
use crate::market_watcher::{MarketManager, MarketEvent, fetch_tick};
use std::sync::Arc;

#[tauri::command]
pub async fn subscribe_stock(
    symbol: String,
    app: AppHandle,
    manager: State<'_, Arc<MarketManager>>,
) -> Result<(), String> {
    manager.subscribe(symbol.clone());
    
    // 立即抓取一次並發送事件，讓前端不需要等 20 秒
    let sym = symbol.clone();
    tauri::async_runtime::spawn(async move {
        if let Ok(tick) = fetch_tick(&sym).await {
            let _ = app.emit("market-update", MarketEvent::Tick(tick));
        }
    });
    
    Ok(())
}

#[tauri::command]
pub async fn unsubscribe_stock(
    symbol: String,
    manager: State<'_, Arc<MarketManager>>,
) -> Result<(), String> {
    manager.unsubscribe(symbol);
    Ok(())
}
