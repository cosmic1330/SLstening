use crate::market_watcher::{MarketEvent, MarketManager};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

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

    // 檢查是否有最近的快取，如果有就直接發送，不需要抓取
    if let Some(tick) = manager.get_from_cache(&symbol) {
        let _ = app.emit("market-update", MarketEvent::Tick(tick));
        return Ok(());
    }

    // 如果正在抓取中，也不重複觸發
    if manager.in_flight.contains(&symbol) {
        return Ok(());
    }

    // 立即抓取一次並發送事件
    let sym = symbol.clone();
    let manager_clone = manager.inner().clone();

    tauri::async_runtime::spawn(async move {
        match manager_clone.fetch_ticks_gated(&[sym.clone()]).await {
            Ok(ticks) => {
                if let Some(tick) = ticks.into_iter().next() {
                    let _ = app.emit("market-update", MarketEvent::Tick(tick));
                }
            }
            Err(e) => {
                if e.to_string().contains("API_BLOCKED") {
                    manager_clone.enter_cooldown();
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

#[tauri::command]
pub async fn get_market_data(
    symbol: String,
    data_type: String, // "tick" or "history"
    period: Option<String>,
    manager: State<'_, Arc<MarketManager>>,
) -> Result<MarketEvent, String> {
    // 檢查冷卻期
    if manager.is_in_cooldown() {
        return Err("API_BLOCKED".to_string());
    }

    if data_type == "tick" {
        // 先查快取
        if let Some(tick) = manager.get_from_cache(&symbol) {
            return Ok(MarketEvent::Tick(tick));
        }

        match manager.fetch_ticks_gated(&[symbol.clone()]).await {
            Ok(ticks) => ticks
                .into_iter()
                .next()
                .map(MarketEvent::Tick)
                .ok_or_else(|| "No data".to_string()),
            Err(e) if e.to_string().contains("REQUEST_IN_FLIGHT") => {
                for _ in 0..200 {
                    if let Some(tick) = manager.get_from_cache(&symbol) {
                        return Ok(MarketEvent::Tick(tick));
                    }
                    if !manager.in_flight.contains(&symbol) {
                        return Err("No data".to_string());
                    }
                    tokio::time::sleep(Duration::from_millis(50)).await;
                }
                Err("REQUEST_IN_FLIGHT".to_string())
            }
            Err(e) => Err(e.to_string()),
        }
    } else {
        // 歷史資料 (K線)
        let p = period.unwrap_or_else(|| "d".to_string());

        // 1. 檢查快取
        if let Some(history) = manager.get_history_from_cache(&symbol, &p) {
            return Ok(MarketEvent::History(history));
        }

        match manager.fetch_history_gated(&symbol, &p).await {
            Ok(history) => Ok(MarketEvent::History(history)),
            Err(e) if e.to_string().contains("REQUEST_IN_FLIGHT") => {
                let cache_key = (symbol.clone(), p.clone());
                for _ in 0..200 {
                    if let Some(history) = manager.get_history_from_cache(&symbol, &p) {
                        return Ok(MarketEvent::History(history));
                    }
                    if !manager.in_flight_history.contains(&cache_key) {
                        return Err("No data".to_string());
                    }
                    tokio::time::sleep(Duration::from_millis(50)).await;
                }
                Err("REQUEST_IN_FLIGHT".to_string())
            }
            Err(e) => Err(e.to_string()),
        }
    }
}
