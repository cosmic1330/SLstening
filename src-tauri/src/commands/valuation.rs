use chrono::{Duration as ChronoDuration, Local};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::{Duration, Instant};

const FINMIND_DATA_URL: &str = "https://api.finmindtrade.com/api/v4/data";
static CACHE: OnceLock<DashMap<String, (PeRiverData, Instant)>> = OnceLock::new();

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeRiverPoint {
    pub date: String,
    pub close: f64,
    pub per: f64,
    pub p10: f64,
    pub p30: f64,
    pub p50: f64,
    pub p70: f64,
    pub p90: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeRiverData {
    pub symbol: String,
    pub points: Vec<PeRiverPoint>,
    pub current_per: f64,
    pub median_per: f64,
    pub percentile: f64,
    pub as_of: String,
}

#[derive(Deserialize)]
struct FinMindResponse<T> {
    data: Vec<T>,
    #[serde(default)]
    status: u16,
    #[serde(default)]
    msg: String,
}

#[derive(Deserialize)]
struct PriceRow {
    date: String,
    close: f64,
}

#[derive(Deserialize)]
struct PerRow {
    date: String,
    #[serde(rename = "PER")]
    per: Option<f64>,
}

async fn fetch_dataset<T: for<'de> Deserialize<'de>>(
    client: &reqwest::Client,
    dataset: &str,
    symbol: &str,
    start_date: &str,
) -> Result<Vec<T>, String> {
    let response = client
        .get(FINMIND_DATA_URL)
        .query(&[
            ("dataset", dataset),
            ("data_id", symbol),
            ("start_date", start_date),
        ])
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("FinMind HTTP {}", response.status()));
    }
    let payload = response
        .json::<FinMindResponse<T>>()
        .await
        .map_err(|error| error.to_string())?;
    if payload.status >= 400 {
        return Err(payload.msg);
    }
    Ok(payload.data)
}

fn quantile(sorted: &[f64], fraction: f64) -> f64 {
    let index = (sorted.len() - 1) as f64 * fraction;
    let lower = index.floor() as usize;
    let upper = index.ceil() as usize;
    sorted[lower] + (sorted[upper] - sorted[lower]) * index.fract()
}

fn build_river(
    symbol: String,
    prices: Vec<PriceRow>,
    ratios: Vec<PerRow>,
) -> Result<PeRiverData, String> {
    let closes: HashMap<String, f64> = prices
        .into_iter()
        .filter(|row| row.close.is_finite() && row.close > 0.0)
        .map(|row| (row.date, row.close))
        .collect();
    let mut joined: Vec<(String, f64, f64)> = ratios
        .into_iter()
        .filter_map(|row| {
            let per = row.per?;
            let close = *closes.get(&row.date)?;
            (per.is_finite() && per > 0.0).then_some((row.date, close, per))
        })
        .collect();
    joined.sort_unstable_by(|left, right| left.0.cmp(&right.0));
    if joined.len() < 20 {
        return Err("PE_RIVER_INSUFFICIENT_DATA".to_string());
    }
    let mut sorted_per: Vec<f64> = joined.iter().map(|row| row.2).collect();
    sorted_per.sort_by(f64::total_cmp);
    let levels = [0.1, 0.3, 0.5, 0.7, 0.9].map(|fraction| quantile(&sorted_per, fraction));
    let (as_of, _, current_per) = joined.last().expect("joined has at least 20 rows").clone();
    let below = sorted_per.partition_point(|per| *per < current_per);
    let at_or_below = sorted_per.partition_point(|per| *per <= current_per);
    let percentile = (below + at_or_below) as f64 / (2 * sorted_per.len()) as f64 * 100.0;
    let points = joined
        .into_iter()
        .map(|(date, close, per)| {
            let eps = close / per;
            PeRiverPoint {
                date,
                close,
                per,
                p10: eps * levels[0],
                p30: eps * levels[1],
                p50: eps * levels[2],
                p70: eps * levels[3],
                p90: eps * levels[4],
            }
        })
        .collect();
    Ok(PeRiverData {
        symbol,
        points,
        current_per,
        median_per: levels[2],
        percentile,
        as_of,
    })
}

#[tauri::command]
pub async fn get_pe_river_data(symbol: String) -> Result<PeRiverData, String> {
    if symbol.is_empty() || !symbol.chars().all(|character| character.is_ascii_digit()) {
        return Err("PE_RIVER_TW_ONLY".to_string());
    }
    let cache = CACHE.get_or_init(DashMap::new);
    if let Some(entry) = cache.get(&symbol) {
        if entry.value().1.elapsed() < Duration::from_secs(3600) {
            return Ok(entry.value().0.clone());
        }
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(25))
        .user_agent("SLstening/0.0.72")
        .build()
        .map_err(|error| error.to_string())?;
    let start_date = (Local::now().date_naive() - ChronoDuration::days(365 * 3))
        .format("%Y-%m-%d")
        .to_string();
    let (prices, ratios) = tokio::join!(
        fetch_dataset::<PriceRow>(&client, "TaiwanStockPrice", &symbol, &start_date),
        fetch_dataset::<PerRow>(&client, "TaiwanStockPER", &symbol, &start_date),
    );
    let data = build_river(symbol.clone(), prices?, ratios?)?;
    cache.insert(symbol, (data.clone(), Instant::now()));
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_price_bands_and_skips_invalid_per() {
        let prices = (1..=26)
            .map(|day| PriceRow {
                date: format!("2026-10-{day:02}"),
                close: 100.0,
            })
            .collect();
        let ratios = (1..=26)
            .map(|day| PerRow {
                date: format!("2026-10-{day:02}"),
                per: (day != 26).then_some(day as f64),
            })
            .collect();
        let river = build_river("2330".into(), prices, ratios).unwrap();
        assert_eq!(river.points.len(), 25);
        assert_eq!(river.median_per, 13.0);
        assert_eq!(river.current_per, 25.0);
        assert!(river.points[24].p10 < river.points[24].p30);
        assert!(river.points[24].p90 < river.points[24].close);
    }

    #[test]
    fn identical_ratios_are_at_the_middle_percentile() {
        let prices = (1..=20)
            .map(|day| PriceRow {
                date: format!("2026-10-{day:02}"),
                close: 100.0,
            })
            .collect();
        let ratios = (1..=20)
            .map(|day| PerRow {
                date: format!("2026-10-{day:02}"),
                per: Some(20.0),
            })
            .collect();
        let river = build_river("2330".into(), prices, ratios).unwrap();
        assert_eq!(river.percentile, 50.0);
    }
}
