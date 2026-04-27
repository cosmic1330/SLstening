use std::sync::Arc;
use dashmap::DashSet;
use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};
use ts_rs::TS;
use std::time::Duration;
use crate::error::AppError;
use dashmap::DashMap;
use urlencoding::{decode, encode};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MarketTick {
    pub id: String,
    pub name: Option<String>,
    pub price: f64,
    pub change_percent: f64,
    #[ts(type = "number")]
    pub refreshed_ts: i64,
    pub closes: Vec<f64>,
    pub avg_prices: Vec<f64>,
    pub previous_close: f64,
    #[ts(type = "number[]")]
    pub timestamps: Vec<i64>,
    pub volume: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct HistoryPoint {
    #[ts(type = "number")]
    pub t: i64,
    pub o: f64,
    pub h: f64,
    pub l: f64,
    pub c: f64,
    pub v: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MarketHistory {
    pub id: String,
    pub name: Option<String>,
    pub data: Vec<HistoryPoint>,
    pub price: f64,
    pub change: Option<f64>,
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
    History(MarketHistory),
    Indicators(MarketIndicators),
}

pub struct MarketCacheItem {
    pub tick: MarketTick,
    pub timestamp: std::time::Instant,
}

pub struct MarketManager {
    // 使用 DashSet 提供線程安全的訂閱管理
    pub active_symbols: Arc<DashSet<String>>,
    // 記錄最後一次被封鎖的時間
    pub last_blocked_at: std::sync::Mutex<Option<std::time::Instant>>,
    // 簡單的資料快取 (Symbol -> (Tick, Timestamp))
    pub cache: DashMap<String, MarketCacheItem>,
    // 正在進行中的請求，避免重複發送
    pub in_flight: DashSet<String>,
}

impl MarketManager {
    pub fn new() -> Self {
        Self {
            active_symbols: Arc::new(DashSet::new()),
            last_blocked_at: std::sync::Mutex::new(None),
            cache: DashMap::new(),
            in_flight: DashSet::new(),
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

    /// 檢查是否處於封鎖冷卻期 (5 分鐘)
    pub fn is_in_cooldown(&self) -> bool {
        if let Ok(last) = self.last_blocked_at.lock() {
            if let Some(instant) = *last {
                return instant.elapsed() < Duration::from_secs(300);
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

    /// 從快取中獲取資料 (10 秒有效)
    pub fn get_from_cache(&self, symbol: &str) -> Option<MarketTick> {
        if let Some(item) = self.cache.get(symbol) {
            if item.timestamp.elapsed() < Duration::from_secs(10) {
                return Some(item.tick.clone());
            }
        }
        None
    }

    /// 更新快取
    pub fn update_cache(&self, tick: MarketTick) {
        self.cache.insert(tick.id.clone(), MarketCacheItem {
            tick,
            timestamp: std::time::Instant::now(),
        });
    }
}

pub fn init(app: AppHandle) -> Arc<MarketManager> {
    let manager = Arc::new(MarketManager::new());
    let manager_clone = Arc::clone(&manager);
    let app_clone = app.clone();

    // 啟動即時報價輪詢 (Tick) - 每 30 秒 (大盤指數則依前端需求更頻繁)
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

            // 分類
            let mut tw_batch = Vec::new();
            let mut other_indices = Vec::new();

            for s in symbols {
                // 檢查是否有有效快取
                if manager_clone.get_from_cache(&s).is_some() {
                    continue;
                }
                
                // 檢查是否正在抓取中
                if manager_clone.in_flight.contains(&s) {
                    continue;
                }

                if s == "^TWII" || s == "^TWOII" {
                    tw_batch.push(s);
                } else if s.contains("^") || s.contains("=") {
                    other_indices.push(s);
                } else {
                    tw_batch.push(s);
                }
            }

            // 1. 處理全球指數
            for symbol in other_indices {
                manager_clone.in_flight.insert(symbol.clone());
                let app_handle = app_clone.clone();
                let m = Arc::clone(&manager_clone);
                let sym = symbol.clone();
                
                tauri::async_runtime::spawn(async move {
                    log::info!("Updating market index: {}", sym);
                    match fetch_ticks_batched(&[sym.clone()]).await {
                        Ok(ticks) => {
                            for tick in ticks {
                                m.update_cache(tick.clone());
                                let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                            }
                        },
                        Err(e) => {
                            if e.to_string().contains("API_BLOCKED") {
                                m.enter_cooldown();
                                let _ = app_handle.emit("api-blocked", true);
                            }
                        },
                    }
                    m.in_flight.remove(&sym);
                });
                tokio::time::sleep(Duration::from_millis(300)).await;
            }

            // 2. 處理台灣股票/指數 (批量請求)
            for chunk in tw_batch.chunks(10) {
                let symbols_to_fetch: Vec<String> = chunk.to_vec();
                for s in &symbols_to_fetch {
                    manager_clone.in_flight.insert(s.clone());
                }

                let app_handle = app_clone.clone();
                let m = Arc::clone(&manager_clone);
                
                tauri::async_runtime::spawn(async move {
                    log::info!("Fetching batch of {} symbols: {:?}", symbols_to_fetch.len(), symbols_to_fetch);
                    match fetch_ticks_batched(&symbols_to_fetch).await {
                        Ok(ticks) => {
                            for tick in ticks {
                                m.update_cache(tick.clone());
                                let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                            }
                        },
                        Err(e) => {
                            if e.to_string().contains("API_BLOCKED") {
                                m.enter_cooldown();
                                let _ = app_handle.emit("api-blocked", true);
                            }
                        },
                    }
                    for s in &symbols_to_fetch {
                        m.in_flight.remove(s);
                    }
                });
                tokio::time::sleep(Duration::from_millis(800)).await;
            }
        }
    });

    manager
}

pub(crate) async fn fetch_history_data(symbol: &str, period: &str) -> Result<MarketHistory, AppError> {
    // Decode then encode to handle both raw symbols and already-encoded symbols
    let decoded_symbol = decode(symbol).unwrap_or(std::borrow::Cow::Borrowed(symbol));
    let encoded_symbol = encode(&decoded_symbol);
    
    // Determine if it's a Global symbol (Indices/Futures) or a Taiwan symbol
    // Taiwan stocks (e.g. "2330") and Taiwan indices ("^TWII", "^TWOII") use Yahoo Taiwan API.
    // Global symbols (e.g. "^IXIC", "NQ=F") use Yahoo Finance's international API.
    let is_global = (decoded_symbol.starts_with("^") || decoded_symbol.contains("=")) && 
                    decoded_symbol != "^TWII" && 
                    decoded_symbol != "^TWOII";

    let url = if !is_global {
        // Taiwan stocks and indices use Yahoo Taiwan's API
        format!("https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period={};symbols=[\"{}\"]", period, encoded_symbol)
    } else {
        // Global indices and futures use Yahoo Finance's international chart API
        let (interval, range) = match period {
            "1m" => ("1m", "1d"),
            "5m" => ("5m", "5d"),
            "15m" => ("15m", "5d"),
            "30m" => ("30m", "5d"),
            "60m" | "1h" => ("1h", "730d"),
            "d" => ("1d", "10y"),
            "w" => ("1wk", "10y"),
            "m" => ("1mo", "10y"),
            _ => ("1d", "10y"),
        };
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval={}&range={}", encoded_symbol, interval, range)
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    let res = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS || res.status() == reqwest::StatusCode::FORBIDDEN {
        return Err(AppError::Unknown("API_BLOCKED".to_string()));
    }

    let body = res.text().await.map_err(|e| AppError::Unknown(e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    let item = if v.is_array() { &v[0] } else { &v };
    let chart = &item["chart"];
    if chart.is_null() {
        return Err(AppError::Unknown("No chart data found".to_string()));
    }

    let result_node = if !chart["result"].is_null() && chart["result"].is_array() && !chart["result"][0].is_null() {
        &chart["result"][0]
    } else {
        chart
    };

    let meta = &result_node["meta"];
    let indicators = &result_node["indicators"]["quote"][0];
    
    let opens = indicators["open"].as_array();
    let closes = indicators["close"].as_array();
    let highs = indicators["high"].as_array();
    let lows = indicators["low"].as_array();
    let volumes = indicators["volume"].as_array();
    let ts = result_node["timestamp"].as_array();
    
    let mut history_data = Vec::new();
    if let (Some(o), Some(c), Some(h), Some(l), Some(v), Some(t)) = (opens, closes, highs, lows, volumes, ts) {
        for i in 0..o.len() {
            if let (Some(open), Some(close), Some(high), Some(low), Some(vol), Some(time)) = 
                (o[i].as_f64(), c[i].as_f64(), h[i].as_f64(), l[i].as_f64(), v[i].as_f64(), t[i].as_i64()) {
                history_data.push(HistoryPoint {
                    t: time,
                    o: open,
                    h: high,
                    l: low,
                    c: close,
                    v: vol,
                });
            }
        }
    }

    let price = meta["regularMarketPrice"].as_f64().unwrap_or(0.0);
    let change = meta["regularMarketChange"].as_f64();
    let name = meta["longName"].as_str()
        .or_else(|| meta["shortName"].as_str())
        .map(|s| s.to_string());

    Ok(MarketHistory {
        id: symbol.to_string(),
        name,
        data: history_data,
        price,
        change,
    })
}

pub(crate) async fn fetch_ticks_batched(symbols: &[String]) -> Result<Vec<MarketTick>, AppError> {
    if symbols.is_empty() {
        return Ok(Vec::new());
    }

    // 判斷是否為「非台灣」的全球指數
    let is_global_index = symbols.len() == 1 && 
        (symbols[0].contains("^") || symbols[0].contains("=")) && 
        symbols[0] != "^TWII" && symbols[0] != "^TWOII";
    
    let url = if is_global_index {
        let decoded = decode(&symbols[0]).unwrap_or(std::borrow::Cow::Borrowed(&symbols[0]));
        let encoded = encode(&decoded);
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1m&range=1d", encoded)
    } else {
        // 台灣股票/指數批量 API
        let symbols_str = symbols.iter()
            .map(|s| {
                let decoded = decode(s).unwrap_or(std::borrow::Cow::Borrowed(s));
                format!("\"{}\"", encode(&decoded))
            })
            .collect::<Vec<_>>()
            .join(",");
        format!("https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=[{}];type=tick", symbols_str)
    };
    
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    let res = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS || res.status() == reqwest::StatusCode::FORBIDDEN {
        return Err(AppError::Unknown("API_BLOCKED".to_string()));
    }

    let body = res.text().await.map_err(|e| AppError::Unknown(e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    let mut results = Vec::new();
    let items = if v.is_array() { v.as_array().unwrap().clone() } else { vec![v] };

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

        // ID 匹配邏輯 (解碼後比較以確保 WTX&.TW 等符號匹配成功)
        let decoded_yahoo = decode(&yahoo_symbol).unwrap_or(std::borrow::Cow::Borrowed(&yahoo_symbol));
        let matched_id = symbols.iter()
            .find(|&s| {
                let decoded_s = decode(s).unwrap_or(std::borrow::Cow::Borrowed(s));
                decoded_yahoo.starts_with(decoded_s.as_ref()) || decoded_s.starts_with(decoded_yahoo.as_ref())
            })
            .cloned()
            .unwrap_or(yahoo_symbol);

        let quote = if !chart["quote"].is_null() { &chart["quote"] } else if !result_node["quote"].is_null() { &result_node["quote"] } else { meta };

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
            meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0)
        };
        let change_percent = (change_percent * 100.0).round() / 100.0;

        let refreshed_ts = meta["regularMarketTime"].as_i64()
            .or_else(|| quote["refreshedTs"].as_i64())
            .unwrap_or(0);

        let timestamps_raw = result_node["timestamp"].as_array();
        let closes_raw = indicators["close"].as_array();
        let highs_raw = indicators["high"].as_array();
        let volumes_raw = indicators["volume"].as_array();

        let mut timestamps = Vec::new();
        let mut closes = Vec::new();
        let mut highs = Vec::new();
        let mut volume = None;

        if let (Some(ts_arr), Some(cl_arr), Some(hi_arr)) = (timestamps_raw, closes_raw, highs_raw) {
            for ((ts_val, cl_val), hi_val) in ts_arr.iter().zip(cl_arr.iter()).zip(hi_arr.iter()) {
                if let (Some(ts), Some(cl), Some(hi)) = (ts_val.as_i64(), cl_val.as_f64(), hi_val.as_f64()) {
                    timestamps.push(ts);
                    closes.push(cl);
                    highs.push(hi);
                }
            }
        }
        
        if let Some(v_arr) = volumes_raw {
            if let Some(last_v) = v_arr.last() {
                volume = last_v.as_f64();
            }
        } else if let Some(v) = meta["regularMarketVolume"].as_f64() {
            volume = Some(v);
        }
            
        let mut pre = 0.0;
        let avg_prices: Vec<f64> = highs.iter().enumerate().map(|(i, &h)| { pre += h; pre / (i + 1) as f64 }).collect();

        let name = meta["longName"].as_str()
            .or_else(|| meta["shortName"].as_str())
            .or_else(|| quote["longName"].as_str())
            .or_else(|| quote["shortName"].as_str())
            .map(|s| s.to_string());

        results.push(MarketTick {
            id: matched_id,
            name,
            price,
            change_percent,
            refreshed_ts,
            closes,
            avg_prices,
            previous_close,
            timestamps,
            volume,
        });
    }

    Ok(results)
}
