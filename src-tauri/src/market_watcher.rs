use std::sync::Arc;
use dashmap::DashSet;
use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};
use ts_rs::TS;
use std::time::Duration;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MarketTick {
    pub id: String,
    pub price: f64,
    pub change_percent: f64,
    pub refreshed_ts: i64,
    pub closes: Vec<f64>,
    pub avg_prices: Vec<f64>,
    pub previous_close: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MarketIndicators {
    pub id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", content = "payload")]
#[ts(export)]
pub enum MarketEvent {
    Tick(MarketTick),
    Indicators(MarketIndicators),
}

pub struct MarketManager {
    // 使用 DashSet 提供線程安全的訂閱管理
    pub active_symbols: Arc<DashSet<String>>,
    // 記錄最後一次被封鎖的時間 (Atomic 或 Mutex)
    pub last_blocked_at: std::sync::Mutex<Option<std::time::Instant>>,
}

impl MarketManager {
    pub fn new() -> Self {
        Self {
            active_symbols: Arc::new(DashSet::new()),
            last_blocked_at: std::sync::Mutex::new(None),
        }
    }

    /// 檢查是否處於封鎖冷卻期 (5 分鐘)
    pub fn is_in_cooldown(&self) -> bool {
        if let Ok(last) = self.last_blocked_at.lock() {
            if let Some(instant) = *last {
                return instant.elapsed() < Duration::from_secs(300); // 5 分鐘
            }
        }
        false
    }

    /// 標記進入冷卻期
    pub fn enter_cooldown(&self) {
        if let Ok(mut last) = self.last_blocked_at.lock() {
            *last = Some(std::time::Instant::now());
        }
    }

    pub fn subscribe(&self, symbol: String) {
        self.active_symbols.insert(symbol);
    }

    pub fn unsubscribe(&self, symbol: String) {
        self.active_symbols.remove(&symbol);
    }

    pub fn get_active_symbols(&self) -> Vec<String> {
        self.active_symbols.iter().map(|s| s.clone()).collect()
    }
}

pub fn init(app: AppHandle) -> Arc<MarketManager> {
    let manager = Arc::new(MarketManager::new());
    let manager_clone = Arc::clone(&manager);
    let app_clone = app.clone();

    // 啟動即時報價輪詢 (Tick) - 每 20 秒
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            
            // 檢查是否處於熔斷冷卻期
            if manager_clone.is_in_cooldown() {
                log::warn!("System is in cooldown, skipping update cycle...");
                continue;
            }

            let symbols = manager_clone.get_active_symbols();
            if symbols.is_empty() {
                continue;
            }

            // 分類：台灣股票與全球指數
            let mut tw_stocks = Vec::new();
            let mut other_indices = Vec::new();

            for s in symbols {
                if s.contains("^") || s.contains("=") {
                    other_indices.push(s);
                } else {
                    tw_stocks.push(s);
                }
            }

            // 1. 處理全球指數 (單獨請求，因為 API 不同)
            for symbol in other_indices {
                log::info!("Updating market index: {}", symbol);
                let app_handle = app_clone.clone();
                match fetch_ticks_batched(&[symbol.clone()]).await {
                    Ok(ticks) => {
                        for tick in ticks {
                            let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                        }
                    },
                    Err(e) => {
                        if e.to_string().contains("API_BLOCKED") {
                            manager_clone.enter_cooldown();
                            let _ = app_handle.emit("api-blocked", true);
                        }
                        log::error!("Failed to fetch index {}: {:?}", symbol, e);
                    },
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            }

            // 2. 處理台灣股票 (批量請求，每 5 檔一組)
            for chunk in tw_stocks.chunks(5) {
                log::info!("Fetching batch of {} symbols: {:?}", chunk.len(), chunk);
                let app_handle = app_clone.clone();
                match fetch_ticks_batched(chunk).await {
                    Ok(ticks) => {
                        for tick in ticks {
                            let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                        }
                    },
                    Err(e) => {
                        if e.to_string().contains("API_BLOCKED") {
                            manager_clone.enter_cooldown();
                            let _ = app_handle.emit("api-blocked", true);
                        }
                        log::error!("Failed to fetch batch {:?}: {:?}", chunk, e);
                    },
                }
                // 批次間隔，避免突發流量
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        }
    });

    manager
}

pub(crate) async fn fetch_ticks_batched(symbols: &[String]) -> Result<Vec<MarketTick>, AppError> {
    if symbols.is_empty() {
        return Ok(Vec::new());
    }

    // 如果只有一個且是全球指數，走全球 API
    let is_global = symbols.len() == 1 && (symbols[0].contains("^") || symbols[0].contains("="));
    
    let url = if is_global {
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1m&range=1d", symbols[0])
    } else {
        // 台灣股票批量 API
        let symbols_str = symbols.iter()
            .map(|s| format!("\"{}\"", s))
            .collect::<Vec<_>>()
            .join(",");
        format!("https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=[{}];type=tick", symbols_str)
    };
    
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    let res = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    // 檢查是否被封鎖 (429 Too Many Requests 或 403 Forbidden)
    if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS || res.status() == reqwest::StatusCode::FORBIDDEN {
        log::warn!("Yahoo API blocked our request (Status: {})", res.status());
        // 通知前端顯示提示，這裡我們需要 AppHandle
        // 注意：這裡 fetch_ticks_batched 沒有 AppHandle，我們可以在調用處處理，
        // 或者直接讓它返回特定的錯誤。
        return Err(AppError::Unknown("API_BLOCKED".to_string()));
    }

    let body = res.text().await.map_err(|e| AppError::Unknown(e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    let mut results = Vec::new();

    // 處理回傳數據 (可能是 Array 或單一 Object)
    let items = if v.is_array() {
        v.as_array().unwrap().clone()
    } else {
        vec![v]
    };

    for item in items {
        let chart = &item["chart"];
        if chart.is_null() { continue; }

        let result_node = if !chart["result"].is_null() && chart["result"].is_array() && !chart["result"][0].is_null() {
            &chart["result"][0]
        } else {
            chart
        };

        let meta = &result_node["meta"];
        let indicators = &result_node["indicators"]["quote"][0];
        let yahoo_symbol = meta["symbol"].as_str().unwrap_or("unknown").to_string();

        // ID 匹配邏輯：尋找這筆數據是對應到哪一個請求的代碼
        // 例如：請求 "6274"，Yahoo 回傳 "6274.TWO"，我們應發送 "6274" 給前端
        let matched_id = symbols.iter()
            .find(|&s| yahoo_symbol.starts_with(s) || s.starts_with(&yahoo_symbol))
            .cloned()
            .unwrap_or(yahoo_symbol);

        let quote = if !chart["quote"].is_null() {
            &chart["quote"]
        } else if !result_node["quote"].is_null() {
            &result_node["quote"]
        } else {
            meta
        };

        let price = meta["regularMarketPrice"].as_f64()
            .or_else(|| meta["price"].as_f64())
            .or_else(|| quote["price"].as_f64())
            .unwrap_or(0.0);

        let previous_close = meta["previousClose"].as_f64()
            .or_else(|| quote["previousClose"].as_f64())
            .unwrap_or(price);

        let change_percent = if previous_close != 0.0 {
            ((price - previous_close) / previous_close) * 100.0
        } else {
            meta["regularMarketChangePercent"].as_f64()
                .or_else(|| meta["changePercent"].as_f64())
                .or_else(|| quote["changePercent"].as_f64())
                .unwrap_or(0.0)
        };
        let change_percent = (change_percent * 100.0).round() / 100.0;

        let refreshed_ts = meta["regularMarketTime"].as_i64()
            .or_else(|| quote["refreshedTs"].as_i64())
            .or_else(|| meta["refreshedTs"].as_i64())
            .unwrap_or(0);
        
        let closes: Vec<f64> = indicators["close"].as_array()
            .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
            .unwrap_or_default();
        
        let highs: Vec<f64> = indicators["high"].as_array()
            .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
            .unwrap_or_default();
            
        let mut pre = 0.0;
        let avg_prices: Vec<f64> = highs.iter().enumerate().map(|(i, &h)| {
            pre += h;
            pre / (i + 1) as f64
        }).collect();

        results.push(MarketTick {
            id: matched_id,
            price,
            change_percent,
            refreshed_ts,
            closes,
            avg_prices,
            previous_close,
        });
    }

    Ok(results)
}
