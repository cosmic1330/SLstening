use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DataEntity {
    Deal(Deal),
    Skills(Skills),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Deal {
    pub stock_id: String, // 股票代號
    pub t: String,        // 日期
    pub c: f64,           // 收盤價
    pub o: f64,           // 開盤價
    pub h: f64,           // 最高價
    pub l: f64,           // 最低價
    pub v: i64,           // 成交量
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Skills {
    pub stock_id: String, // 股票代號
    pub t: String,        // 日期
    pub ma5: f64,         // 5日均線
    pub ma5_ded: f64,     // 5日扣抵
    pub ma10: f64,        // 10日均線
    pub ma10_ded: f64,    // 10日扣抵
    pub ma20: f64,        // 20日均線
    pub ma20_ded: f64,    // 20日扣抵
    pub ma60: f64,        // 60日均線
    pub ma60_ded: f64,    // 60日扣抵
    pub ma120: f64,       // 120日均線
    pub ma120_ded: f64,   // 120日扣抵
    pub macd: f64,        // MACD
    pub dif: f64,         // DIF
    pub osc: f64,         // OSC
    pub k: f64,           // K
    pub d: f64,           // D
    pub rsi5: f64,        // RSI5
    pub rsi10: f64,       // RSI10
    pub boll_ub: f64,      // Bollinger Upper Band
    pub boll_ma: f64,      // Bollinger Middle Band
    pub boll_lb: f64,      // Bollinger Lower Band
    pub obv: f64,         // OBV
    pub obv5: f64,        // OBV5
}
