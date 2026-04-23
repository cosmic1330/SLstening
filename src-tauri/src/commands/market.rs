use tauri::{AppHandle, Emitter, State};
use crate::market_watcher::{MarketManager, MarketEvent, fetch_ticks_batched};
use std::sync::Arc;

#[tauri::command]
pub async fn subscribe_stock(
    symbol: String,
    app: AppHandle,
    manager: State<'_, Arc<MarketManager>>,
) -> Result<(), String> {
    manager.subscribe(symbol.clone());
    
    // 如果處於冷卻期，就不進行立即抓取，避免雪上加霜
    if manager.is_in_cooldown() {
        return Ok(());
    }

    // 立即抓取一次並發送事件，讓前端不需要等 20 秒
    let sym = symbol.clone();
    tauri::async_runtime::spawn(async move {
        match fetch_ticks_batched(&[sym]).await {
            Ok(ticks) => {
                if let Some(tick) = ticks.into_iter().next() {
                    let _ = app.emit("market-update", MarketEvent::Tick(tick));
                }
            }
            Err(e) => {
                if e.to_string().contains("API_BLOCKED") {
                    let _ = app.emit("api-blocked", true);
                }
            }
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
