use crate::error::AppError;
use dashmap::DashMap;
use dashmap::DashSet;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::hash::Hash;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::{Notify, Semaphore};
use ts_rs::TS;
use urlencoding::{decode, encode};

/// The short window used to collect symbols that become visible together.
/// Keeping this small makes the first quote responsive while allowing one
/// request to serve a row of newly-mounted stock cards.
pub const WARMUP_COALESCE_WINDOW_MS: u64 = 200;
/// Yahoo's Taiwan tick endpoint accepts multiple symbols. Keep the batch
/// bounded so one visible burst cannot turn into an oversized request.
pub const WARMUP_TAIWAN_BATCH_SIZE: usize = 10;
/// Space sequential warm-up requests to avoid a burst even when many cards
/// become visible at once. The global request gate still serializes all
/// history and tick requests.
pub const WARMUP_BATCH_PACING_MS: u64 = 300;
/// Minimum spacing between the start of any two Yahoo requests owned by one
/// market manager. Tick and history requests share this limiter.
pub const MIN_REQUEST_START_SPACING_MS: u64 = 300;
/// Number of transient warm-up retries after the initial attempt.
pub const WARMUP_MAX_RETRY_ATTEMPTS: usize = 3;
pub const WARMUP_RETRY_BASE_DELAY_MS: u64 = 500;

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
    /// Wall-clock time at which the provider response was stored. `Instant`
    /// remains the freshness TTL; this field is safe to expose in envelopes.
    pub fetched_at: i64,
}

pub struct MarketHistoryCacheItem {
    pub history: MarketHistory,
    pub timestamp: std::time::Instant,
    pub fetched_at: i64,
}

struct InFlightGuard<K>
where
    K: Eq + Hash + Clone,
{
    set: Arc<DashSet<K>>,
    keys: Vec<K>,
    released: bool,
}

impl<K> InFlightGuard<K>
where
    K: Eq + Hash + Clone,
{
    fn new(set: Arc<DashSet<K>>, keys: Vec<K>) -> Self {
        Self {
            set,
            keys,
            released: false,
        }
    }

    fn release(&mut self) {
        if self.released {
            return;
        }
        for key in &self.keys {
            self.set.remove(key);
        }
        self.released = true;
    }
}

impl<K> Drop for InFlightGuard<K>
where
    K: Eq + Hash + Clone,
{
    fn drop(&mut self) {
        self.release();
    }
}

#[derive(Default)]
struct WarmupQueue {
    symbols: VecDeque<String>,
    queued: HashSet<String>,
}

impl WarmupQueue {
    fn push(&mut self, symbol: String) -> bool {
        if self.queued.insert(symbol.clone()) {
            self.symbols.push_back(symbol);
            true
        } else {
            false
        }
    }

    fn drain(&mut self) -> Vec<String> {
        let drained: Vec<String> = self.symbols.drain(..).collect();
        for symbol in &drained {
            self.queued.remove(symbol);
        }
        drained
    }

    fn requeue<I>(&mut self, symbols: I)
    where
        I: IntoIterator<Item = String>,
    {
        for symbol in symbols {
            self.push(symbol);
        }
    }

    fn is_empty(&self) -> bool {
        self.symbols.is_empty()
    }
}

#[derive(Debug, PartialEq, Eq)]
struct WarmupBatches {
    /// Taiwan stocks and Taiwan indices can be requested in chunks.
    taiwan: Vec<Vec<String>>,
    /// Global indices/futures must use the single-symbol endpoint.
    global: Vec<String>,
}

fn is_global_tick_symbol(symbol: &str) -> bool {
    // Keep warm-up, polling, and direct agent requests on the same market
    // classifier. AAPL must never be routed through the Taiwan batch API.
    is_global_symbol(symbol)
}

/// Deduplicate and classify queued symbols without touching the network.
/// Taiwan symbols are grouped into requests of at most ten; global symbols
/// remain one request each because their Yahoo endpoint is single-symbol.
fn classify_warmup_symbols(symbols: &[String]) -> WarmupBatches {
    let mut seen = HashSet::new();
    let mut taiwan_symbols = Vec::new();
    let mut global = Vec::new();

    for symbol in symbols {
        if !seen.insert(symbol.clone()) {
            continue;
        }
        if is_global_tick_symbol(symbol) {
            global.push(symbol.clone());
        } else {
            taiwan_symbols.push(symbol.clone());
        }
    }

    let taiwan = taiwan_symbols
        .chunks(WARMUP_TAIWAN_BATCH_SIZE)
        .map(|chunk| chunk.to_vec())
        .collect();

    WarmupBatches { taiwan, global }
}

#[derive(Debug, PartialEq, Eq)]
struct WarmupRetryPlan {
    retry: Vec<(String, Duration)>,
    exhausted: Vec<String>,
}

#[derive(Default)]
struct WarmupRetryState {
    attempts: HashMap<String, usize>,
}

impl WarmupRetryState {
    fn plan(&mut self, symbols: &[String]) -> WarmupRetryPlan {
        let mut seen = HashSet::new();
        let mut retry = Vec::new();
        let mut exhausted = Vec::new();

        for symbol in symbols {
            if !seen.insert(symbol.clone()) {
                continue;
            }

            let attempt = self.attempts.get(symbol).copied().unwrap_or(0);
            if attempt >= WARMUP_MAX_RETRY_ATTEMPTS {
                self.attempts.remove(symbol);
                exhausted.push(symbol.clone());
                continue;
            }

            let delay = warmup_retry_delay(attempt);
            self.attempts.insert(symbol.clone(), attempt + 1);
            retry.push((symbol.clone(), delay));
        }

        WarmupRetryPlan { retry, exhausted }
    }

    fn clear(&mut self, symbol: &str) {
        self.attempts.remove(symbol);
    }

    fn retain<F>(&mut self, mut keep: F)
    where
        F: FnMut(&str) -> bool,
    {
        self.attempts.retain(|symbol, _| keep(symbol));
    }
}

fn warmup_retry_delay(attempt: usize) -> Duration {
    let multiplier = 1_u64
        .checked_shl(attempt.min(16) as u32)
        .unwrap_or(u64::MAX);
    Duration::from_millis(WARMUP_RETRY_BASE_DELAY_MS.saturating_mul(multiplier))
}

/// Reserve the next request start without sleeping while holding a mutex.
/// Returning the updated deadline lets callers reserve a slot atomically and
/// then await outside the lock.
fn request_spacing_decision(
    now: std::time::Instant,
    next_allowed_at: Option<std::time::Instant>,
    spacing: Duration,
) -> (Duration, std::time::Instant) {
    let start_at = next_allowed_at
        .map(|next| if next > now { next } else { now })
        .unwrap_or(now);
    (start_at.saturating_duration_since(now), start_at + spacing)
}

pub struct MarketManager {
    // 使用 DashSet 提供線程安全的活躍訂閱管理。
    pub active_symbols: Arc<DashSet<String>>,
    // 同一 symbol 可能同時被多張卡片訂閱；只有最後一個訂閱者離開時
    // 才會從 active_symbols 移除。
    pub subscriber_counts: DashMap<String, usize>,
    subscription_lock: std::sync::Mutex<()>,
    // 記錄最後一次被封鎖的時間
    pub last_blocked_at: std::sync::Mutex<Option<std::time::Instant>>,
    // 簡單的資料快取 (Symbol -> (Tick, Timestamp))
    pub cache: DashMap<String, MarketCacheItem>,
    // 正在進行中的請求，避免重複發送
    pub in_flight: Arc<DashSet<String>>,
    // 歷史資料快取 ((Symbol, Period) -> (History, Timestamp))
    pub history_cache: DashMap<(String, String), MarketHistoryCacheItem>,
    // 正在進行中的歷史資料請求，避免重複發送
    pub in_flight_history: Arc<DashSet<(String, String)>>,
    /// A single permit serializes every Yahoo request issued by this manager.
    pub request_gate: Arc<Semaphore>,
    /// Reserved request-start slots shared by tick and history requests.
    request_next_allowed_at: std::sync::Mutex<Option<std::time::Instant>>,
    /// Symbols waiting for the initial visible-card warm-up request.
    warmup_queue: std::sync::Mutex<WarmupQueue>,
    warmup_notify: Arc<Notify>,
}

impl MarketManager {
    pub fn new() -> Self {
        Self {
            active_symbols: Arc::new(DashSet::new()),
            subscriber_counts: DashMap::new(),
            subscription_lock: std::sync::Mutex::new(()),
            last_blocked_at: std::sync::Mutex::new(None),
            cache: DashMap::new(),
            in_flight: Arc::new(DashSet::new()),
            history_cache: DashMap::new(),
            in_flight_history: Arc::new(DashSet::new()),
            request_gate: Arc::new(Semaphore::new(1)),
            request_next_allowed_at: std::sync::Mutex::new(None),
            warmup_queue: std::sync::Mutex::new(WarmupQueue::default()),
            warmup_notify: Arc::new(Notify::new()),
        }
    }

    pub fn subscribe(&self, symbol: String) {
        use dashmap::mapref::entry::Entry;

        let _lock = self
            .subscription_lock
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        match self.subscriber_counts.entry(symbol.clone()) {
            Entry::Occupied(mut entry) => {
                *entry.get_mut() += 1;
            }
            Entry::Vacant(entry) => {
                entry.insert(1);
                self.active_symbols.insert(symbol);
            }
        }
    }

    pub fn unsubscribe(&self, symbol: String) {
        use dashmap::mapref::entry::Entry;

        let _lock = self
            .subscription_lock
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        match self.subscriber_counts.entry(symbol.clone()) {
            Entry::Occupied(entry) if *entry.get() <= 1 => {
                entry.remove();
                self.active_symbols.remove(&symbol);
            }
            Entry::Occupied(mut entry) => {
                *entry.get_mut() -= 1;
            }
            Entry::Vacant(_) => {
                // An unmatched unsubscribe should not affect a later
                // subscriber for the same symbol.
            }
        }
    }

    pub fn get_active_symbols(&self) -> Vec<String> {
        self.active_symbols.iter().map(|s| s.clone()).collect()
    }

    pub fn subscriber_count(&self, symbol: &str) -> usize {
        self.subscriber_counts
            .get(symbol)
            .map(|count| *count)
            .unwrap_or(0)
    }

    fn has_subscribers(&self, symbol: &str) -> bool {
        self.subscriber_count(symbol) > 0
    }

    /// Add a symbol to the initial warm-up queue. The queue itself performs
    /// deduplication, while Notify wakes the single worker responsible for
    /// draining it.
    pub fn queue_warmup(&self, symbol: String) {
        let queued = self
            .warmup_queue
            .lock()
            .map(|mut queue| queue.push(symbol))
            .unwrap_or(false);
        if queued {
            self.warmup_notify.notify_one();
        }
    }

    fn has_warmup_work(&self) -> bool {
        self.warmup_queue
            .lock()
            .map(|queue| !queue.is_empty())
            .unwrap_or(false)
    }

    fn drain_warmup_queue(&self) -> Vec<String> {
        self.warmup_queue
            .lock()
            .map(|mut queue| queue.drain())
            .unwrap_or_default()
    }

    fn requeue_warmup_symbols(&self, symbols: Vec<String>) {
        let queued = self
            .warmup_queue
            .lock()
            .map(|mut queue| {
                let before = queue.symbols.len();
                queue.requeue(symbols);
                queue.symbols.len() > before
            })
            .unwrap_or(false);
        if queued {
            self.warmup_notify.notify_one();
        }
    }

    fn select_active_uncached(&self, symbols: &[String]) -> Vec<String> {
        // Keep in-flight symbols eligible. fetch_ticks_gated will join the
        // existing owner through its pending path; if that owner fails, the
        // worker can apply its bounded retry policy to the symbol.
        symbols
            .iter()
            .filter(|symbol| self.has_subscribers(symbol) && self.get_from_cache(symbol).is_none())
            .cloned()
            .collect()
    }

    fn active_warmup_batch(&self, batch: Vec<String>) -> Vec<String> {
        self.select_active_uncached(&batch)
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

    fn cooldown_remaining(&self) -> Option<Duration> {
        let last = self.last_blocked_at.lock().ok().and_then(|last| *last)?;
        let cooldown = Duration::from_secs(300);
        Some(cooldown.saturating_sub(last.elapsed()))
    }

    async fn wait_for_request_start(&self) {
        let wait = {
            let mut next_allowed = self
                .request_next_allowed_at
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            let (wait, reserved_until) = request_spacing_decision(
                std::time::Instant::now(),
                *next_allowed,
                Duration::from_millis(MIN_REQUEST_START_SPACING_MS),
            );
            *next_allowed = Some(reserved_until);
            wait
        };

        if !wait.is_zero() {
            tokio::time::sleep(wait).await;
        }
    }

    /// 標記進入冷卻期
    pub fn enter_cooldown(&self) {
        if let Ok(mut last) = self.last_blocked_at.lock() {
            *last = Some(std::time::Instant::now());
        }
    }

    /// 從快取中獲取資料 (10 秒有效)
    pub fn get_from_cache(&self, symbol: &str) -> Option<MarketTick> {
        self.get_from_cache_with_fetched_at(symbol)
            .map(|(tick, _)| tick)
    }

    pub fn get_from_cache_with_fetched_at(&self, symbol: &str) -> Option<(MarketTick, i64)> {
        if let Some(item) = self.cache.get(symbol) {
            if item.timestamp.elapsed() < Duration::from_secs(10) {
                return Some((item.tick.clone(), item.fetched_at));
            }
        }
        None
    }

    /// 更新快取
    pub fn update_cache(&self, tick: MarketTick) {
        self.cache.insert(
            tick.id.clone(),
            MarketCacheItem {
                tick,
                timestamp: std::time::Instant::now(),
                fetched_at: wall_clock_millis(),
            },
        );
    }

    /// 從快取中獲取歷史資料 (盤中 60 秒有效，盤後 300 秒有效)
    pub fn get_history_from_cache(&self, symbol: &str, period: &str) -> Option<MarketHistory> {
        self.get_history_from_cache_with_fetched_at(symbol, period)
            .map(|(history, _)| history)
    }

    pub fn get_history_from_cache_with_fetched_at(
        &self,
        symbol: &str,
        period: &str,
    ) -> Option<(MarketHistory, i64)> {
        let key = (symbol.to_string(), period.to_string());
        if let Some(item) = self.history_cache.get(&key) {
            let is_open = is_any_market_open_for_symbol(symbol);
            let lifetime = if is_open {
                Duration::from_secs(60)
            } else {
                Duration::from_secs(300)
            };
            if item.timestamp.elapsed() < lifetime {
                return Some((item.history.clone(), item.fetched_at));
            }
        }
        None
    }

    /// 更新歷史資料快取
    pub fn update_history_cache(&self, symbol: &str, period: &str, history: MarketHistory) {
        let key = (symbol.to_string(), period.to_string());
        self.history_cache.insert(
            key,
            MarketHistoryCacheItem {
                history,
                timestamp: std::time::Instant::now(),
                fetched_at: wall_clock_millis(),
            },
        );
    }

    fn claim_tick_symbols(
        &self,
        symbols: &[String],
    ) -> (Vec<String>, Vec<String>, Vec<MarketTick>) {
        let mut owned = Vec::new();
        let mut pending = Vec::new();
        let mut cached = Vec::new();
        for symbol in symbols {
            if let Some(tick) = self.get_from_cache(symbol) {
                cached.push(tick);
            } else if self.in_flight.insert(symbol.clone()) {
                owned.push(symbol.clone());
            } else {
                pending.push(symbol.clone());
            }
        }
        (owned, pending, cached)
    }

    /// Fetch ticks through the global Yahoo gate. Cache and cooldown are checked
    /// again after the permit is acquired so queued work cannot create a burst.
    pub async fn fetch_ticks_gated(&self, symbols: &[String]) -> Result<Vec<MarketTick>, AppError> {
        self.fetch_ticks_gated_with_meta(symbols)
            .await
            .map(|(ticks, _fetched)| ticks)
    }

    /// Same operation as fetch_ticks_gated, while reporting whether this
    /// caller actually owned a provider fetch. A caller that joined another
    /// request is deliberately reported as cached/coalesced by the agent.
    pub async fn fetch_ticks_gated_with_meta(
        &self,
        symbols: &[String],
    ) -> Result<(Vec<MarketTick>, bool), AppError> {
        if symbols.is_empty() {
            return Ok((Vec::new(), false));
        }
        if self.is_in_cooldown() {
            return Err(AppError::Unknown("API_BLOCKED".to_string()));
        }

        let (owned, pending, mut cached) = self.claim_tick_symbols(symbols);

        if owned.is_empty() {
            return self
                .wait_for_pending_ticks(pending, cached)
                .await
                .map(|ticks| (ticks, false));
        }

        let mut ownership = InFlightGuard::new(self.in_flight.clone(), owned.clone());

        let permit = match self.request_gate.clone().acquire_owned().await {
            Ok(permit) => permit,
            Err(_) => {
                return Err(AppError::Unknown("Market request gate closed".to_string()));
            }
        };
        if self.is_in_cooldown() {
            drop(permit);
            return Err(AppError::Unknown("API_BLOCKED".to_string()));
        }

        let mut to_fetch = Vec::new();
        for symbol in &owned {
            if let Some(tick) = self.get_from_cache(&symbol) {
                cached.push(tick);
            } else {
                to_fetch.push(symbol.clone());
            }
        }
        if to_fetch.is_empty() {
            ownership.release();
            drop(permit);
            return self
                .wait_for_pending_ticks(pending, cached)
                .await
                .map(|ticks| (ticks, false));
        }

        self.wait_for_request_start().await;
        if self.is_in_cooldown() {
            drop(permit);
            return Err(AppError::Unknown("API_BLOCKED".to_string()));
        }

        let mut still_to_fetch = Vec::new();
        for symbol in to_fetch {
            if let Some(tick) = self.get_from_cache(&symbol) {
                cached.push(tick);
            } else {
                still_to_fetch.push(symbol);
            }
        }
        if still_to_fetch.is_empty() {
            ownership.release();
            drop(permit);
            return self
                .wait_for_pending_ticks(pending, cached)
                .await
                .map(|ticks| (ticks, false));
        }

        let result = fetch_ticks_batched(&still_to_fetch).await;

        match result {
            Ok(ticks) => {
                for tick in &ticks {
                    self.update_cache(tick.clone());
                }
                cached.extend(ticks);
                ownership.release();
                drop(permit);
                self.wait_for_pending_ticks(pending, cached)
                    .await
                    .map(|ticks| (ticks, true))
            }
            Err(error) => {
                if error.to_string().contains("API_BLOCKED") {
                    self.enter_cooldown();
                }
                ownership.release();
                drop(permit);
                Err(error)
            }
        }
    }

    async fn wait_for_pending_ticks(
        &self,
        pending: Vec<String>,
        mut cached: Vec<MarketTick>,
    ) -> Result<Vec<MarketTick>, AppError> {
        for symbol in pending {
            let mut resolved = false;
            for _ in 0..200 {
                if let Some(tick) = self.get_from_cache(&symbol) {
                    cached.push(tick);
                    resolved = true;
                    break;
                }
                if self.is_in_cooldown() {
                    return Err(AppError::Unknown("API_BLOCKED".to_string()));
                }
                if !self.in_flight.contains(&symbol) {
                    return Err(AppError::Unknown("No data".to_string()));
                }
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
            if !resolved {
                return Err(AppError::Unknown("REQUEST_IN_FLIGHT".to_string()));
            }
        }
        Ok(cached)
    }

    /// Fetch one history series through the same global Yahoo gate.
    pub async fn fetch_history_gated(
        &self,
        symbol: &str,
        period: &str,
    ) -> Result<MarketHistory, AppError> {
        self.fetch_history_gated_with_meta(symbol, period)
            .await
            .map(|(history, _fetched)| history)
    }

    /// Report whether this caller performed the provider fetch. This lets
    /// consumers distinguish a live response from a request coalesced onto a
    /// cache entry populated by another caller.
    pub async fn fetch_history_gated_with_meta(
        &self,
        symbol: &str,
        period: &str,
    ) -> Result<(MarketHistory, bool), AppError> {
        if self.is_in_cooldown() {
            return Err(AppError::Unknown("API_BLOCKED".to_string()));
        }
        if let Some(history) = self.get_history_from_cache(symbol, period) {
            return Ok((history, false));
        }

        let key = (symbol.to_string(), period.to_string());
        if !self.in_flight_history.insert(key.clone()) {
            // Join the existing provider request.  The caller can then label
            // the result cached/coalesced instead of falsely reporting a new
            // live fetch or failing while the cache is about to be filled.
            return self
                .wait_for_pending_history(&key)
                .await
                .map(|history| (history, false));
        }
        let mut ownership = InFlightGuard::new(self.in_flight_history.clone(), vec![key.clone()]);

        let permit = match self.request_gate.clone().acquire_owned().await {
            Ok(permit) => permit,
            Err(_) => {
                return Err(AppError::Unknown("Market request gate closed".to_string()));
            }
        };
        if self.is_in_cooldown() {
            drop(permit);
            return Err(AppError::Unknown("API_BLOCKED".to_string()));
        }
        if let Some(history) = self.get_history_from_cache(symbol, period) {
            ownership.release();
            drop(permit);
            return Ok((history, false));
        }
        self.wait_for_request_start().await;
        if self.is_in_cooldown() {
            drop(permit);
            return Err(AppError::Unknown("API_BLOCKED".to_string()));
        }
        if let Some(history) = self.get_history_from_cache(symbol, period) {
            ownership.release();
            drop(permit);
            return Ok((history, false));
        }

        let result = fetch_history_data(symbol, period).await;
        match result {
            Ok(history) => {
                self.update_history_cache(symbol, period, history.clone());
                ownership.release();
                drop(permit);
                Ok((history, true))
            }
            Err(error) => {
                if error.to_string().contains("API_BLOCKED") {
                    self.enter_cooldown();
                }
                ownership.release();
                drop(permit);
                Err(error)
            }
        }
    }

    async fn wait_for_pending_history(
        &self,
        key: &(String, String),
    ) -> Result<MarketHistory, AppError> {
        for _ in 0..200 {
            if let Some((history, _fetched_at)) =
                self.get_history_from_cache_with_fetched_at(&key.0, &key.1)
            {
                return Ok(history);
            }
            if !self.in_flight_history.contains(key) {
                return Err(AppError::Unknown("No data".to_string()));
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        Err(AppError::Unknown("REQUEST_IN_FLIGHT".to_string()))
    }

    async fn wait_for_warmup_work(&self) {
        loop {
            if self.has_warmup_work() {
                return;
            }

            // Register the notification before checking the queue a second
            // time. If a subscriber arrives between the first check and the
            // await, Notify retains the permit and no wake-up is lost.
            let notified = self.warmup_notify.notified();
            if self.has_warmup_work() {
                return;
            }
            notified.await;
        }
    }

    async fn run_warmup_worker(self: Arc<Self>, app: AppHandle) {
        let mut retry_state = WarmupRetryState::default();

        loop {
            retry_state.retain(|symbol| {
                self.has_subscribers(symbol) && self.get_from_cache(symbol).is_none()
            });
            self.wait_for_warmup_work().await;
            tokio::time::sleep(Duration::from_millis(WARMUP_COALESCE_WINDOW_MS)).await;

            let queued = self.drain_warmup_queue();
            if queued.is_empty() {
                continue;
            }

            let classified = classify_warmup_symbols(&queued);
            let mut batches = classified.taiwan;
            batches.extend(classified.global.into_iter().map(|symbol| vec![symbol]));

            // Retry requests are queued only after their backoff. Keeping the
            // schedule in this worker avoids detached tasks and lets cooldown
            // handling requeue every still-active symbol in one place.
            let mut deferred_retries: Vec<(Duration, Vec<String>)> = Vec::new();
            let mut cooldown_wait = None;
            for (index, batch) in batches.iter().enumerate() {
                retry_state.retain(|symbol| {
                    self.has_subscribers(symbol) && self.get_from_cache(symbol).is_none()
                });
                let active_batch = self.active_warmup_batch(batch.clone());
                if active_batch.is_empty() {
                    continue;
                }

                if self.is_in_cooldown() {
                    let remaining: Vec<String> = batches[index..]
                        .iter()
                        .flatten()
                        .cloned()
                        .chain(
                            deferred_retries
                                .iter()
                                .flat_map(|(_, symbols)| symbols.iter().cloned()),
                        )
                        .collect();
                    self.requeue_warmup_symbols(remaining);
                    cooldown_wait = self.cooldown_remaining();
                    break;
                }

                match self.fetch_ticks_gated(&active_batch).await {
                    Ok(ticks) => {
                        for tick in ticks {
                            retry_state.clear(&tick.id);
                            let _ = app.emit("market-update", MarketEvent::Tick(tick));
                        }

                        // A successful response can still omit one or more
                        // requested symbols. Treat those as transient misses
                        // so an active card is not silently abandoned.
                        let missing = self.select_active_uncached(&active_batch);
                        let plan = retry_state.plan(&missing);
                        for symbol in plan.exhausted {
                            log::warn!(
                                "Warm-up retries exhausted after missing tick response: {}",
                                symbol
                            );
                        }
                        for (symbol, delay) in plan.retry {
                            if let Some((_, symbols)) = deferred_retries
                                .iter_mut()
                                .find(|(scheduled, _)| *scheduled == delay)
                            {
                                symbols.push(symbol);
                            } else {
                                deferred_retries.push((delay, vec![symbol]));
                            }
                        }
                    }
                    Err(error) => {
                        // A mixed pending/owned batch can fetch some symbols
                        // successfully before a pending owner fails. Emit
                        // those cached results before retrying only the
                        // symbols that still have no data.
                        for tick in active_batch
                            .iter()
                            .filter_map(|symbol| self.get_from_cache(symbol))
                        {
                            retry_state.clear(&tick.id);
                            let _ = app.emit("market-update", MarketEvent::Tick(tick));
                        }

                        if error.to_string().contains("API_BLOCKED") {
                            self.enter_cooldown();
                            let _ = app.emit("api-blocked", true);
                            let remaining: Vec<String> = batches[index..]
                                .iter()
                                .flatten()
                                .cloned()
                                .chain(
                                    deferred_retries
                                        .iter()
                                        .flat_map(|(_, symbols)| symbols.iter().cloned()),
                                )
                                .collect();
                            self.requeue_warmup_symbols(remaining);
                            cooldown_wait = self.cooldown_remaining();
                            break;
                        }

                        let retryable = self.select_active_uncached(&active_batch);
                        let plan = retry_state.plan(&retryable);
                        for symbol in plan.exhausted {
                            log::warn!("Warm-up retries exhausted after request error: {}", symbol);
                        }
                        for (symbol, delay) in plan.retry {
                            if let Some((_, symbols)) = deferred_retries
                                .iter_mut()
                                .find(|(scheduled, _)| *scheduled == delay)
                            {
                                symbols.push(symbol);
                            } else {
                                deferred_retries.push((delay, vec![symbol]));
                            }
                        }
                    }
                }

                if index + 1 < batches.len() {
                    tokio::time::sleep(Duration::from_millis(WARMUP_BATCH_PACING_MS)).await;
                }
            }

            // Keep queued symbols during the five-minute cooldown, but sleep
            // until it expires instead of spinning on API_BLOCKED responses.
            if let Some(delay) = cooldown_wait {
                tokio::time::sleep(delay).await;
                continue;
            }

            deferred_retries.sort_by_key(|(delay, _)| *delay);
            for (delay, symbols) in deferred_retries {
                tokio::time::sleep(delay).await;
                retry_state.retain(|symbol| {
                    self.has_subscribers(symbol) && self.get_from_cache(symbol).is_none()
                });
                let eligible: Vec<String> = symbols
                    .into_iter()
                    .filter(|symbol| {
                        self.has_subscribers(symbol) && self.get_from_cache(symbol).is_none()
                    })
                    .collect();
                self.requeue_warmup_symbols(eligible);
            }
        }
    }

    fn start_warmup_worker(manager: Arc<Self>, app: AppHandle) {
        tauri::async_runtime::spawn(async move {
            manager.run_warmup_worker(app).await;
        });
    }
}

/// 判斷是否在任何市場的交易時間內
fn is_any_market_open_for_symbol(symbol: &str) -> bool {
    // Until exchange-calendar support is centralized, use the conservative
    // short cache TTL for global symbols. Reusing Taiwan hours for US data can
    // otherwise label an actively trading US quote as closed-market cache.
    if is_global_symbol(symbol) {
        return true;
    }
    let now = std::time::SystemTime::now();
    let since_the_epoch = now
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let timestamp = since_the_epoch.as_secs();

    // 台北時間是 UTC + 8 小時
    let taipei_timestamp = timestamp + 8 * 3600;

    // 計算星期幾 (Unix epoch 1970-01-01 是星期四)
    let days_since_epoch = taipei_timestamp / 86400;
    let weekday = (days_since_epoch + 4) % 7; // 0: Sunday, 1: Monday, ..., 6: Saturday

    // 計算當天的秒數
    let seconds_in_day = taipei_timestamp % 86400;
    let hour = seconds_in_day / 3600;

    // 判斷是否為週末
    if weekday == 0 || weekday == 6 {
        // 週六 00:00 - 05:00 是週五夜盤交易時段
        if weekday == 6 && hour < 5 {
            return true;
        }
        return false;
    }

    // 週一至週五：
    // 週一的 00:00 - 05:00 沒有夜盤 (基本上這段時間不算交易)
    if weekday == 1 && hour < 5 {
        return false;
    }

    // 星期一至星期五的 08:00 - 24:00 以及 00:00 - 05:00 都算是潛在交易時段
    let is_weekday_trading_hour = (hour >= 8) || (hour < 5);
    is_weekday_trading_hour
}

pub fn init(app: AppHandle) -> Arc<MarketManager> {
    let manager = Arc::new(MarketManager::new());
    let manager_clone = Arc::clone(&manager);
    let app_clone = app.clone();

    // Initial visible-card requests are coalesced by one worker so each
    // subscription remains cheap while the first quote still arrives quickly.
    MarketManager::start_warmup_worker(Arc::clone(&manager), app.clone());

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

                if is_global_symbol(&s) {
                    other_indices.push(s);
                } else {
                    tw_batch.push(s);
                }
            }

            // 1. 處理全球指數
            for symbol in other_indices {
                let app_handle = app_clone.clone();
                let m = Arc::clone(&manager_clone);
                let sym = symbol.clone();

                tauri::async_runtime::spawn(async move {
                    log::info!("Updating market index: {}", sym);
                    match m.fetch_ticks_gated(&[sym.clone()]).await {
                        Ok(ticks) => {
                            for tick in ticks {
                                let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                            }
                        }
                        Err(e) => {
                            if e.to_string().contains("API_BLOCKED") {
                                m.enter_cooldown();
                                let _ = app_handle.emit("api-blocked", true);
                            }
                        }
                    }
                });
                tokio::time::sleep(Duration::from_millis(300)).await;
            }

            // 2. 處理台灣股票/指數 (批量請求)
            for chunk in tw_batch.chunks(WARMUP_TAIWAN_BATCH_SIZE) {
                let symbols_to_fetch: Vec<String> = chunk.to_vec();
                let app_handle = app_clone.clone();
                let m = Arc::clone(&manager_clone);

                tauri::async_runtime::spawn(async move {
                    log::info!(
                        "Fetching batch of {} symbols: {:?}",
                        symbols_to_fetch.len(),
                        symbols_to_fetch
                    );
                    match m.fetch_ticks_gated(&symbols_to_fetch).await {
                        Ok(ticks) => {
                            for tick in ticks {
                                let _ = app_handle.emit("market-update", MarketEvent::Tick(tick));
                            }
                        }
                        Err(e) => {
                            if e.to_string().contains("API_BLOCKED") {
                                m.enter_cooldown();
                                let _ = app_handle.emit("api-blocked", true);
                            }
                        }
                    }
                });
                tokio::time::sleep(Duration::from_millis(800)).await;
            }
        }
    });

    manager
}

pub(crate) async fn fetch_history_data(
    symbol: &str,
    period: &str,
) -> Result<MarketHistory, AppError> {
    // Decode then encode to handle both raw symbols and already-encoded symbols
    let provider = provider_symbol(symbol);
    let decoded_symbol = decode(&provider).unwrap_or(std::borrow::Cow::Borrowed(&provider));
    let encoded_symbol = encode(&decoded_symbol);

    // Determine if it's a Global symbol (Indices/Futures) or a Taiwan symbol
    // Taiwan stocks (e.g. "2330") and Taiwan indices ("^TWII", "^TWOII") use Yahoo Taiwan API.
    // Global symbols (e.g. "^IXIC", "NQ=F") use Yahoo Finance's international API.
    let is_global = is_global_symbol(&decoded_symbol);

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
        format!(
            "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval={}&range={}",
            encoded_symbol, interval, range
        )
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

    if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS
        || res.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(AppError::Unknown("API_BLOCKED".to_string()));
    }

    let body = res
        .text()
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))?;
    let v: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| AppError::Serialization(e.to_string()))?;

    let item = if v.is_array() { &v[0] } else { &v };
    let chart = &item["chart"];
    if chart.is_null() {
        return Err(AppError::Unknown("No chart data found".to_string()));
    }

    let result_node = if !chart["result"].is_null()
        && chart["result"].is_array()
        && !chart["result"][0].is_null()
    {
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
    if let (Some(o), Some(c), Some(h), Some(l), Some(v), Some(t)) =
        (opens, closes, highs, lows, volumes, ts)
    {
        // Provider arrays are not guaranteed to have identical lengths. Walk
        // only the common prefix and skip any row with a missing numeric
        // field. Volume is required by the Rust HistoryPoint contract; using
        // a synthetic zero would corrupt OBV/CMF/MFI downstream.
        let length = [o.len(), c.len(), h.len(), l.len(), v.len(), t.len()]
            .into_iter()
            .min()
            .unwrap_or(0);
        for i in 0..length {
            let row = (
                o.get(i).and_then(serde_json::Value::as_f64),
                c.get(i).and_then(serde_json::Value::as_f64),
                h.get(i).and_then(serde_json::Value::as_f64),
                l.get(i).and_then(serde_json::Value::as_f64),
                v.get(i).and_then(serde_json::Value::as_f64),
                t.get(i).and_then(serde_json::Value::as_i64),
            );
            if let (Some(open), Some(close), Some(high), Some(low), Some(volume), Some(time)) = row
            {
                history_data.push(HistoryPoint {
                    t: time,
                    o: open,
                    h: high,
                    l: low,
                    c: close,
                    v: volume,
                });
            }
        }
    } else {
        return Err(AppError::Unknown("MISSING_OHLCV_DATA".to_string()));
    }

    let mut price = meta["regularMarketPrice"]
        .as_f64()
        .or_else(|| meta["price"].as_f64())
        .unwrap_or(0.0);

    if price == 0.0 && !history_data.is_empty() {
        if let Some(last) = history_data.last() {
            price = last.c;
        }
    }

    let previous_close = meta["regularMarketPreviousClose"]
        .as_f64()
        .or_else(|| meta["previousClose"].as_f64());

    let mut change = meta["regularMarketChange"]
        .as_f64()
        .or_else(|| meta["change"].as_f64());

    if (change.is_none() || change == Some(0.0)) && price != 0.0 {
        if let Some(pc) = previous_close {
            change = Some(price - pc);
        } else if history_data.len() >= 2 {
            // Fallback to previous day's close from history data
            let pc = history_data[history_data.len() - 2].c;
            change = Some(price - pc);
        }
    }

    let name = meta["longName"]
        .as_str()
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

/// Return whether a provider symbol belongs to Yahoo's global endpoint.
/// Taiwan tickers are numeric (or carry an explicit `.TW`/`.TWO` suffix),
/// while US tickers such as `AAPL` are alphabetic and must never be sent to
/// the Taiwan endpoint.
pub(crate) fn is_global_symbol(symbol: &str) -> bool {
    let decoded = decode(symbol).unwrap_or(std::borrow::Cow::Borrowed(symbol));
    let value = decoded.trim().to_ascii_uppercase();
    if value == "^TWII" || value == "^TWOII" || value.starts_with("TW:") {
        return false;
    }
    if value.chars().all(|character| character.is_ascii_digit())
        || value.ends_with(".TW")
        || value.ends_with(".TWO")
    {
        return false;
    }
    value.starts_with('^')
        || value.contains('=')
        || value
            .chars()
            .any(|character| character.is_ascii_alphabetic())
}

fn provider_symbol(symbol: &str) -> String {
    match symbol.split_once(':') {
        Some((market, value))
            if (market.eq_ignore_ascii_case("tw") || market.eq_ignore_ascii_case("us"))
                && !value.trim().is_empty() =>
        {
            value.trim().to_string()
        }
        _ => symbol.trim().to_string(),
    }
}

fn wall_clock_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

pub(crate) async fn fetch_ticks_batched(symbols: &[String]) -> Result<Vec<MarketTick>, AppError> {
    if symbols.is_empty() {
        return Ok(Vec::new());
    }

    // Never mix provider markets in one request. Yahoo's Taiwan endpoint
    // accepts a Taiwan batch, while global tickers require the single-symbol
    // chart endpoint. Preserve the caller's order as far as each provider
    // response allows and keep the explicit market mapping at the boundary.
    let (global_symbols, taiwan_symbols) = split_provider_symbols(symbols);
    if (global_symbols.len() + taiwan_symbols.len()) > 1 && !global_symbols.is_empty() {
        let mut ticks = Vec::new();
        if !taiwan_symbols.is_empty() {
            ticks.extend(Box::pin(fetch_ticks_batched(&taiwan_symbols)).await?);
        }
        for symbol in global_symbols {
            ticks.extend(Box::pin(fetch_ticks_batched(std::slice::from_ref(&symbol))).await?);
        }
        return Ok(ticks);
    }

    // A qualified US ticker such as AAPL must use Yahoo's global endpoint;
    // treating every unqualified symbol as a Taiwan ticker silently returned
    // empty data for US accounts.
    let is_global_index = symbols.len() == 1 && is_global_symbol(&symbols[0]);

    let provider_symbols: Vec<String> = symbols
        .iter()
        .map(|symbol| provider_symbol(symbol))
        .collect();
    let url = if is_global_index {
        let decoded = decode(&provider_symbols[0])
            .unwrap_or(std::borrow::Cow::Borrowed(&provider_symbols[0]));
        let encoded = encode(&decoded);
        format!(
            "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1m&range=1d",
            encoded
        )
    } else {
        // 台灣股票/指數批量 API
        let symbols_str = provider_symbols
            .iter()
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

    if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS
        || res.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(AppError::Unknown("API_BLOCKED".to_string()));
    }

    let body = res
        .text()
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))?;
    let v: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| AppError::Serialization(e.to_string()))?;

    let mut results = Vec::new();
    let items = if v.is_array() {
        v.as_array().unwrap().clone()
    } else {
        vec![v]
    };

    for item in items {
        let chart = &item["chart"];
        if chart.is_null() {
            continue;
        }

        let result_node = if !chart["result"].is_null()
            && chart["result"].is_array()
            && !chart["result"][0].is_null()
        {
            &chart["result"][0]
        } else {
            chart
        };

        let meta = &result_node["meta"];
        let indicators = &result_node["indicators"]["quote"][0];
        let yahoo_symbol = meta["symbol"].as_str().unwrap_or("unknown").to_string();

        // ID 匹配邏輯 (解碼後比較以確保 WTX&.TW 等符號匹配成功)
        let decoded_yahoo =
            decode(&yahoo_symbol).unwrap_or(std::borrow::Cow::Borrowed(&yahoo_symbol));
        let matched_id = symbols
            .iter()
            .zip(provider_symbols.iter())
            .find(|(_, provider)| {
                let decoded_s = decode(provider).unwrap_or(std::borrow::Cow::Borrowed(provider));
                decoded_yahoo.starts_with(decoded_s.as_ref())
                    || decoded_s.starts_with(decoded_yahoo.as_ref())
            })
            .map(|(original, _)| original.clone())
            .unwrap_or(yahoo_symbol);

        let quote = if !chart["quote"].is_null() {
            &chart["quote"]
        } else if !result_node["quote"].is_null() {
            &result_node["quote"]
        } else {
            meta
        };

        let price = meta["regularMarketPrice"]
            .as_f64()
            .or_else(|| meta["price"].as_f64())
            .or_else(|| quote["price"].as_f64())
            .unwrap_or(0.0);

        let previous_close = meta["previousClose"]
            .as_f64()
            .or_else(|| quote["previousClose"].as_f64())
            .unwrap_or(0.0);

        let change_percent = if price > 0.0 && previous_close > 0.0 {
            ((price - previous_close) / previous_close) * 100.0
        } else {
            meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0)
        };
        let change_percent = (change_percent * 100.0).round() / 100.0;

        let refreshed_ts = meta["regularMarketTime"]
            .as_i64()
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

        if let (Some(ts_arr), Some(cl_arr), Some(hi_arr)) = (timestamps_raw, closes_raw, highs_raw)
        {
            for ((ts_val, cl_val), hi_val) in ts_arr.iter().zip(cl_arr.iter()).zip(hi_arr.iter()) {
                if let (Some(ts), Some(cl), Some(hi)) =
                    (ts_val.as_i64(), cl_val.as_f64(), hi_val.as_f64())
                {
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
        let avg_prices: Vec<f64> = highs
            .iter()
            .enumerate()
            .map(|(i, &h)| {
                pre += h;
                pre / (i + 1) as f64
            })
            .collect();

        let name = meta["longName"]
            .as_str()
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

fn split_provider_symbols(symbols: &[String]) -> (Vec<String>, Vec<String>) {
    let mut global = Vec::new();
    let mut taiwan = Vec::new();
    for symbol in symbols {
        if is_global_symbol(symbol) {
            global.push(symbol.clone());
        } else {
            taiwan.push(symbol.clone());
        }
    }
    (global, taiwan)
}

#[cfg(test)]
mod tests {
    use super::{
        classify_warmup_symbols, is_global_symbol, provider_symbol, request_spacing_decision,
        split_provider_symbols, warmup_retry_delay, InFlightGuard, MarketManager, MarketTick,
        WarmupQueue, WarmupRetryState, MIN_REQUEST_START_SPACING_MS, WARMUP_MAX_RETRY_ATTEMPTS,
        WARMUP_RETRY_BASE_DELAY_MS, WARMUP_TAIWAN_BATCH_SIZE,
    };
    use std::time::{Duration, Instant};

    fn tick(id: &str) -> MarketTick {
        MarketTick {
            id: id.to_string(),
            name: None,
            price: 1.0,
            change_percent: 0.0,
            refreshed_ts: 0,
            closes: Vec::new(),
            avg_prices: Vec::new(),
            previous_close: 1.0,
            timestamps: Vec::new(),
            volume: None,
        }
    }

    #[test]
    fn subscription_refcounts_keep_symbol_active_until_last_unsubscribe() {
        let manager = MarketManager::new();

        manager.subscribe("2330".to_string());
        manager.subscribe("2330".to_string());
        assert_eq!(manager.subscriber_count("2330"), 2);
        assert_eq!(manager.get_active_symbols(), vec!["2330".to_string()]);

        manager.unsubscribe("2330".to_string());
        assert_eq!(manager.subscriber_count("2330"), 1);
        assert!(manager.active_symbols.contains("2330"));

        manager.unsubscribe("2330".to_string());
        assert_eq!(manager.subscriber_count("2330"), 0);
        assert!(!manager.active_symbols.contains("2330"));
    }

    #[test]
    fn warmup_queue_deduplicates_and_can_requeue_symbols() {
        let mut queue = WarmupQueue::default();
        assert!(queue.push("2330".to_string()));
        assert!(!queue.push("2330".to_string()));
        assert_eq!(queue.drain(), vec!["2330".to_string()]);

        queue.requeue(vec!["2330".to_string(), "2317".to_string()]);
        assert_eq!(queue.drain(), vec!["2330".to_string(), "2317".to_string()]);
        assert!(queue.is_empty());
    }

    #[test]
    fn warmup_classification_deduplicates_and_limits_taiwan_batches() {
        let symbols: Vec<String> = (0..(WARMUP_TAIWAN_BATCH_SIZE + 1))
            .map(|index| format!("{}", 2300 + index))
            .chain([
                "2300".to_string(),
                "^TWII".to_string(),
                "^IXIC".to_string(),
                "NQ=F".to_string(),
            ])
            .collect();

        let batches = classify_warmup_symbols(&symbols);
        assert_eq!(batches.taiwan.len(), 2);
        assert_eq!(batches.taiwan[0].len(), WARMUP_TAIWAN_BATCH_SIZE);
        assert_eq!(batches.taiwan[1].len(), 2);
        assert_eq!(batches.taiwan[1][0], "2310");
        assert_eq!(batches.taiwan[1][1], "^TWII");
        assert_eq!(
            batches.global,
            vec!["^IXIC".to_string(), "NQ=F".to_string()]
        );
    }

    #[test]
    fn provider_symbol_market_mapping_keeps_us_tickers_off_taiwan_endpoint() {
        assert!(!is_global_symbol("2330"));
        assert!(!is_global_symbol("2330.TW"));
        assert!(!is_global_symbol("^TWII"));
        assert!(is_global_symbol("AAPL"));
        assert!(is_global_symbol("^IXIC"));
        assert!(is_global_symbol("NQ=F"));
        assert_eq!(
            classify_warmup_symbols(&["AAPL".into()]).global,
            vec!["AAPL"]
        );
        let mixed = classify_warmup_symbols(&["2330".into(), "AAPL".into()]);
        assert_eq!(mixed.taiwan, vec![vec!["2330".to_string()]]);
        assert_eq!(mixed.global, vec!["AAPL".to_string()]);
    }

    #[test]
    fn mixed_provider_batches_are_split_before_url_selection() {
        let (global, taiwan) = split_provider_symbols(&[
            "2330".to_string(),
            "AAPL".to_string(),
            "US:MSFT".to_string(),
            "^TWII".to_string(),
        ]);
        assert_eq!(global, vec!["AAPL".to_string(), "US:MSFT".to_string()]);
        assert_eq!(taiwan, vec!["2330".to_string(), "^TWII".to_string()]);
        assert_eq!(provider_symbol("US:MSFT"), "MSFT");
        assert_eq!(provider_symbol("TW:2330"), "2330");
    }

    #[test]
    fn in_flight_active_symbol_remains_eligible_for_pending_resolution() {
        let manager = MarketManager::new();
        manager.subscribe("2330".to_string());
        manager.in_flight.insert("2330".to_string());

        assert_eq!(
            manager.active_warmup_batch(vec!["2330".to_string()]),
            vec!["2330".to_string()]
        );
    }

    #[test]
    fn missing_symbol_selection_keeps_only_active_uncached_symbols() {
        let manager = MarketManager::new();
        manager.subscribe("active".to_string());
        manager.subscribe("cached".to_string());
        manager.subscribe("removed".to_string());
        manager.update_cache(tick("cached"));
        manager.unsubscribe("removed".to_string());

        let missing = manager.select_active_uncached(&[
            "active".to_string(),
            "cached".to_string(),
            "removed".to_string(),
        ]);
        assert_eq!(missing, vec!["active".to_string()]);

        let mut retry_state = WarmupRetryState::default();
        let retry_plan = retry_state.plan(&missing);
        assert_eq!(retry_plan.retry[0].0, "active");
        assert!(retry_plan.exhausted.is_empty());
    }

    #[test]
    fn warmup_retry_plan_uses_exponential_backoff_and_exhausts() {
        let mut state = WarmupRetryState::default();
        let symbol = vec!["2330".to_string()];

        for (attempt, expected_delay) in [500, 1_000, 2_000].into_iter().enumerate() {
            let plan = state.plan(&symbol);
            assert_eq!(plan.retry.len(), 1);
            assert_eq!(plan.retry[0].1, Duration::from_millis(expected_delay));
            assert!(plan.exhausted.is_empty());
            assert_eq!(
                warmup_retry_delay(attempt),
                Duration::from_millis(expected_delay)
            );
        }

        let exhausted = state.plan(&symbol);
        assert!(exhausted.retry.is_empty());
        assert_eq!(exhausted.exhausted, symbol);
        assert!(state.attempts.is_empty());
        assert_eq!(WARMUP_MAX_RETRY_ATTEMPTS, 3);
        assert_eq!(WARMUP_RETRY_BASE_DELAY_MS, 500);

        let mut unsubscribed = WarmupRetryState::default();
        let _ = unsubscribed.plan(&symbol);
        unsubscribed.retain(|_| false);
        assert!(unsubscribed.attempts.is_empty());
    }

    #[test]
    fn request_spacing_decision_reserves_shared_start_slots_without_sleeping() {
        let now = Instant::now();
        let spacing = Duration::from_millis(MIN_REQUEST_START_SPACING_MS);
        let (first_wait, first_reserved) = request_spacing_decision(now, None, spacing);
        assert_eq!(first_wait, Duration::ZERO);
        assert_eq!(first_reserved, now + spacing);

        let (second_wait, second_reserved) = request_spacing_decision(
            now + Duration::from_millis(100),
            Some(first_reserved),
            spacing,
        );
        assert_eq!(second_wait, Duration::from_millis(200));
        assert_eq!(second_reserved, first_reserved + spacing);

        let (late_wait, _) = request_spacing_decision(
            now + Duration::from_millis(700),
            Some(second_reserved),
            spacing,
        );
        assert_eq!(late_wait, Duration::ZERO);
    }

    #[tokio::test]
    async fn request_gate_serializes_external_requests() {
        let manager = MarketManager::new();
        let first = manager.request_gate.clone().acquire_owned().await.unwrap();
        let gate = manager.request_gate.clone();
        let second = tokio::spawn(async move {
            let _permit = gate.acquire_owned().await.unwrap();
            true
        });

        tokio::task::yield_now().await;
        assert!(!second.is_finished());

        drop(first);
        assert!(second.await.unwrap());
    }

    #[test]
    fn duplicate_claim_has_one_owner_and_one_pending_request() {
        let manager = MarketManager::new();
        let symbols = vec!["2330".to_string()];
        let (owned, pending, cached) = manager.claim_tick_symbols(&symbols);
        assert_eq!(owned, symbols);
        assert!(pending.is_empty());
        assert!(cached.is_empty());

        let (second_owned, second_pending, second_cached) = manager.claim_tick_symbols(&symbols);
        assert!(second_owned.is_empty());
        assert_eq!(second_pending, symbols);
        assert!(second_cached.is_empty());

        manager.in_flight.remove("2330");
    }

    #[test]
    fn mixed_claim_partitions_cached_owned_and_pending_symbols() {
        let manager = MarketManager::new();
        manager.update_cache(tick("cached"));
        manager.in_flight.insert("pending".to_string());
        let symbols = vec![
            "cached".to_string(),
            "owned".to_string(),
            "pending".to_string(),
        ];

        let (owned, pending, cached) = manager.claim_tick_symbols(&symbols);
        assert_eq!(owned, vec!["owned".to_string()]);
        assert_eq!(pending, vec!["pending".to_string()]);
        assert_eq!(cached.len(), 1);

        manager.in_flight.remove("owned");
        manager.in_flight.remove("pending");
    }

    #[tokio::test]
    async fn queued_request_rechecks_cooldown_and_cleans_ownership() {
        let manager = MarketManager::new();
        let permit = manager.request_gate.clone().acquire_owned().await.unwrap();
        let task_manager = std::sync::Arc::new(manager);
        let task_manager_clone = task_manager.clone();
        let task = tokio::spawn(async move {
            task_manager_clone
                .fetch_ticks_gated(&["queued".to_string()])
                .await
        });
        for _ in 0..3 {
            tokio::task::yield_now().await;
        }
        assert!(task_manager.in_flight.contains("queued"));
        task_manager.enter_cooldown();
        drop(permit);

        let result = task.await.unwrap();
        assert!(result.unwrap_err().to_string().contains("API_BLOCKED"));
        assert!(!task_manager.in_flight.contains("queued"));
    }

    #[tokio::test]
    async fn cancelling_gate_wait_cleans_tick_and_history_ownership() {
        let manager = std::sync::Arc::new(MarketManager::new());
        let permit = manager.request_gate.clone().acquire_owned().await.unwrap();
        let tick_manager = manager.clone();
        let tick_task = tokio::spawn(async move {
            let _ = tick_manager.fetch_ticks_gated(&["tick".to_string()]).await;
        });
        let history_manager = manager.clone();
        let history_task = tokio::spawn(async move {
            let _ = history_manager.fetch_history_gated("history", "d").await;
        });
        for _ in 0..3 {
            tokio::task::yield_now().await;
        }
        assert!(manager.in_flight.contains("tick"));
        assert!(manager
            .in_flight_history
            .contains(&("history".to_string(), "d".to_string())));
        tick_task.abort();
        history_task.abort();
        let _ = tick_task.await;
        let _ = history_task.await;
        drop(permit);

        assert!(!manager.in_flight.contains("tick"));
        assert!(!manager
            .in_flight_history
            .contains(&("history".to_string(), "d".to_string())));
    }

    #[tokio::test]
    async fn closed_gate_cleans_tick_and_history_ownership() {
        let manager = MarketManager::new();
        manager.request_gate.close();
        assert!(manager
            .fetch_ticks_gated(&["tick".to_string()])
            .await
            .is_err());
        assert!(manager.fetch_history_gated("history", "d").await.is_err());
        assert!(!manager.in_flight.contains("tick"));
        assert!(!manager
            .in_flight_history
            .contains(&("history".to_string(), "d".to_string())));
    }

    #[test]
    fn cache_can_be_observed_before_guard_release() {
        let manager = MarketManager::new();
        manager.in_flight.insert("2330".to_string());
        let mut ownership = InFlightGuard::new(manager.in_flight.clone(), vec!["2330".to_string()]);
        manager.update_cache(tick("2330"));
        assert!(manager.get_from_cache("2330").is_some());
        assert!(manager.in_flight.contains("2330"));
        ownership.release();
        assert!(!manager.in_flight.contains("2330"));
    }
}
