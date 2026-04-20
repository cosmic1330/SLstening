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
}

impl MarketManager {
    pub fn new() -> Self {
        Self {
            active_symbols: Arc::new(DashSet::new()),
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
    // 使用 Tauri 內建的 async_runtime
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(20));
        loop {
            interval.tick().await;
            
            let symbols = manager_clone.get_active_symbols();
            if symbols.is_empty() {
                continue;
            }

            for symbol in symbols {
                let app_handle = app_clone.clone();
                let sym = symbol.clone();
                
                // 異步獲取數據，不阻塞 runtime
                match fetch_tick(&sym).await {
                    Ok(tick) => {
                        let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                    },
                    Err(e) => {
                        log::error!("Failed to fetch tick for {}: {:?}", sym, e);
                    }
                }

                // 請求間隔避免頻率過高
                tokio::time::sleep(Duration::from_millis(200)).await;
            }
        }
    });

    manager
}

pub(crate) async fn fetch_tick(symbol: &str) -> Result<MarketTick, AppError> {
    let url = if symbol.contains("^") || symbol.contains("=") {
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1m&range=1d", symbol)
    } else {
        format!("https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=[\"{}\"];type=tick", symbol)
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

    let body = res.text().await.map_err(|e| AppError::Unknown(e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    let chart_data = if v.is_array() {
        &v[0]["chart"]
    } else {
        &v["chart"]
    };

    if chart_data.is_null() {
        return Err(AppError::Unknown(format!("Invalid data format for {}", symbol)));
    }

    let result = if !chart_data["result"].is_null() {
        if chart_data["result"][0].is_null() {
            return Err(AppError::Unknown(format!("Invalid data format for {}", symbol)));
        }
        &chart_data["result"][0]
    } else {
        if chart_data["meta"].is_null() {
            return Err(AppError::Unknown(format!("Invalid data format for {}", symbol)));
        }
        chart_data
    };
    let meta = &result["meta"];
    let indicators = &result["indicators"]["quote"][0];
    let quote = &chart_data["quote"];

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
        .or_else(|| meta["refreshedTs"].as_i64())
        .unwrap_or(0);
    
    let closes: Vec<f64> = indicators["close"].as_array()
        .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
        .unwrap_or_default();
    
    let highs: Vec<f64> = indicators["high"].as_array()
        .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
        .unwrap_or_default();
        
    let mut pre = 0.0;
    let avg_prices = highs.iter().enumerate().map(|(i, &h)| {
        pre += h;
        pre / (i + 1) as f64
    }).collect();

    Ok(MarketTick {
        id: symbol.to_string(),
        price,
        change_percent,
        refreshed_ts,
        closes,
        avg_prices,
        previous_close,
    })
}
