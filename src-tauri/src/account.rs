use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

/// The desktop app deliberately uses the same endpoint and payload as
/// PhoneApp. The endpoint stores an opaque JSON string in the `data` column;
/// desktop-only navigation and indicator settings never cross this boundary.
pub const CLOUD_ENDPOINT: &str = "https://script.google.com/macros/s/AKfycby4MsYs06coRtd2G-sDfqP-mCN0KWWBTSOpkrMnlE4I2pOXZpsGW1K3KprfGXJGDwYP/exec";
pub const SCHEMA_VERSION: u32 = 1;
pub const MAX_DATA_LENGTH: usize = 45_000;
pub const MAX_STOCKS: usize = 300;
pub const MAX_CATEGORIES: usize = 100;
pub const CLIENT_TYPE: &str = "Desktop";

fn pull_request_body(uuid: &str, email: &str) -> Value {
    json!({"action":"pull", "uuid":uuid, "email":email, "type":CLIENT_TYPE})
}

fn sync_request_body(uuid: &str, email: &str, data: String) -> Value {
    json!({"action":"sync", "uuid":uuid, "email":email, "data":data, "type":CLIENT_TYPE})
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IndicatorSettings {
    pub ma5: f64,
    pub ma10: f64,
    pub ma20: f64,
    pub ma60: f64,
    pub boll: f64,
    pub kd: f64,
    pub mfi: f64,
    pub rsi: f64,
    pub ma120: f64,
    pub ma240: f64,
    pub ema_short: f64,
    pub ema_long: f64,
    pub cmf: f64,
    pub cmf_ema: f64,
    pub atr_len: f64,
    pub atr_mult: f64,
    pub donchian: f64,
    pub cci: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StockRecord {
    pub id: String,
    pub name: String,
    pub group: String,
    #[serde(rename = "type")]
    pub stock_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRecord {
    pub id: String,
    pub name: String,
    pub stock_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccountSnapshot {
    pub stocks: Vec<StockRecord>,
    pub categories: Vec<CategoryRecord>,
    /// Empty string is the explicit no-category sentinel.
    pub active_category_id: String,
    pub pinned_category_ids: Vec<String>,
    pub recent_category_ids: Vec<String>,
    pub indicator_settings: IndicatorSettings,
}

/// Exact PhoneApp stock shape. Unknown fields are rejected so a legacy
/// desktop snapshot cannot be mistaken for a PhoneApp payload.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PhoneStockWire {
    symbol: String,
    name: String,
    price: String,
    change: String,
    is_positive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PhoneWatchlistGroupWire {
    id: String,
    name: String,
    stocks: Vec<PhoneStockWire>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionResult {
    pub user_id: String,
    pub epoch: u64,
    pub expires_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountStateResult {
    pub user_id: String,
    pub epoch: u64,
    pub schema_version: u32,
    pub data: Option<AccountSnapshot>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountWriteResult {
    pub user_id: String,
    pub epoch: u64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone)]
struct SessionContext {
    user_id: String,
    email: String,
    expires_at: Option<i64>,
    epoch: u64,
}

#[derive(Debug, Clone)]
pub struct AccountManager {
    session: Arc<RwLock<Option<SessionContext>>>,
    epoch: Arc<AtomicU64>,
    transition: Arc<AtomicU64>,
    client: reqwest::Client,
}

impl AccountManager {
    pub fn new() -> Result<Self, String> {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(std::time::Duration::from_secs(20))
            .user_agent("SLstening/0.0.63")
            .build()
            .map_err(|error| error.to_string())?;
        Ok(Self {
            session: Arc::new(RwLock::new(None)),
            epoch: Arc::new(AtomicU64::new(0)),
            transition: Arc::new(AtomicU64::new(0)),
            client,
        })
    }

    fn accept_transition(&self, transition_id: u64) -> Result<(), String> {
        let mut current = self.transition.load(Ordering::SeqCst);
        loop {
            if transition_id < current {
                return Err("STALE_SESSION_TRANSITION".to_string());
            }
            if transition_id == current {
                return Ok(());
            }
            match self.transition.compare_exchange(
                current,
                transition_id,
                Ordering::SeqCst,
                Ordering::SeqCst,
            ) {
                Ok(_) => return Ok(()),
                Err(actual) => current = actual,
            }
        }
    }

    pub fn set_session_for_transition(
        &self,
        transition_id: u64,
        access_token: String,
        user_id: String,
        email: Option<String>,
        expires_at: Option<i64>,
    ) -> Result<SessionResult, String> {
        self.accept_transition(transition_id)?;
        self.set_session_inner(
            Some(transition_id),
            access_token,
            user_id,
            email,
            expires_at,
        )
    }

    #[cfg(test)]
    pub fn set_session(
        &self,
        access_token: String,
        user_id: String,
        email: Option<String>,
        expires_at: Option<i64>,
    ) -> Result<SessionResult, String> {
        self.set_session_inner(None, access_token, user_id, email, expires_at)
    }

    fn set_session_inner(
        &self,
        expected_transition: Option<u64>,
        _access_token: String,
        user_id: String,
        email: Option<String>,
        expires_at: Option<i64>,
    ) -> Result<SessionResult, String> {
        let user_id = user_id.trim().to_string();
        if user_id.is_empty() || user_id.len() > 200 {
            return Err("INVALID_USER_ID".to_string());
        }
        let email = email
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "Guest".to_string());
        let mut guard = self
            .session
            .write()
            .map_err(|_| "SESSION_LOCK".to_string())?;
        if expected_transition.is_some_and(|value| self.transition.load(Ordering::SeqCst) != value)
        {
            return Err("STALE_SESSION_TRANSITION".to_string());
        }
        let next_epoch = match guard.as_ref() {
            Some(current) if current.user_id == user_id => current.epoch,
            _ => self.epoch.fetch_add(1, Ordering::SeqCst).saturating_add(1),
        };
        self.epoch.fetch_max(next_epoch, Ordering::SeqCst);
        *guard = Some(SessionContext {
            user_id: user_id.clone(),
            email,
            expires_at,
            epoch: next_epoch,
        });
        Ok(SessionResult {
            user_id,
            epoch: next_epoch,
            expires_at,
        })
    }

    #[cfg(test)]
    pub fn clear_session(&self) -> Result<(), String> {
        self.invalidate_session()
    }

    pub fn clear_session_for_transition(&self, transition_id: u64) -> Result<(), String> {
        self.invalidate_session_for_transition(transition_id)
    }

    pub fn invalidate_session_for_transition(&self, transition_id: u64) -> Result<(), String> {
        self.accept_transition(transition_id)?;
        self.invalidate_session_at(transition_id)
    }

    #[cfg(test)]
    pub fn invalidate_session(&self) -> Result<(), String> {
        let transition_id = self.transition.fetch_add(1, Ordering::SeqCst) + 1;
        self.invalidate_session_at(transition_id)
    }

    fn invalidate_session_at(&self, transition_id: u64) -> Result<(), String> {
        let mut guard = self
            .session
            .write()
            .map_err(|_| "SESSION_LOCK".to_string())?;
        if self.transition.load(Ordering::SeqCst) != transition_id {
            return Err("STALE_SESSION_TRANSITION".to_string());
        }
        self.epoch.fetch_add(1, Ordering::SeqCst);
        *guard = None;
        Ok(())
    }

    pub fn current_session(&self) -> Result<Option<SessionResult>, String> {
        let guard = self
            .session
            .read()
            .map_err(|_| "SESSION_LOCK".to_string())?;
        let current_epoch = self.epoch.load(Ordering::SeqCst);
        Ok(guard.as_ref().and_then(|session| {
            (session.epoch == current_epoch).then(|| SessionResult {
                user_id: session.user_id.clone(),
                epoch: session.epoch,
                expires_at: session.expires_at,
            })
        }))
    }

    pub fn active_session(&self, expected_epoch: u64) -> Result<SessionResult, String> {
        let session = self.session_for_epoch(expected_epoch)?;
        Ok(SessionResult {
            user_id: session.user_id,
            epoch: session.epoch,
            expires_at: session.expires_at,
        })
    }

    fn session_for_epoch(&self, expected_epoch: u64) -> Result<SessionContext, String> {
        let guard = self
            .session
            .read()
            .map_err(|_| "SESSION_LOCK".to_string())?;
        let session = guard
            .as_ref()
            .ok_or_else(|| "SESSION_REQUIRED".to_string())?;
        if session.epoch != self.epoch.load(Ordering::SeqCst) || session.epoch != expected_epoch {
            return Err("SESSION_CHANGED".to_string());
        }
        if session
            .expires_at
            .is_some_and(|expires_at| expires_at <= unix_seconds())
        {
            return Err("SESSION_EXPIRED".to_string());
        }
        Ok(session.clone())
    }

    fn session_still_current(&self, user_id: &str, epoch: u64) -> Result<(), String> {
        let guard = self
            .session
            .read()
            .map_err(|_| "SESSION_LOCK".to_string())?;
        let current_epoch = self.epoch.load(Ordering::SeqCst);
        match guard.as_ref() {
            Some(session)
                if session.user_id == user_id
                    && session.epoch == epoch
                    && session.epoch == current_epoch =>
            {
                if session
                    .expires_at
                    .is_some_and(|expires_at| expires_at <= unix_seconds())
                {
                    Err("SESSION_EXPIRED".to_string())
                } else {
                    Ok(())
                }
            }
            _ => Err("SESSION_CHANGED".to_string()),
        }
    }

    pub async fn get_state(&self, expected_epoch: u64) -> Result<AccountStateResult, String> {
        let session = self.session_for_epoch(expected_epoch)?;
        let response = match self
            .post_cloud(pull_request_body(&session.user_id, &session.email))
            .await
        {
            Ok(response) => response,
            Err(error) if error == "BACKUP_NOT_FOUND" => json!({
                "status": "success",
                "data": "[]",
            }),
            Err(error) => return Err(error),
        };
        self.session_still_current(&session.user_id, session.epoch)?;
        let data = Some(decode_pull_data(&response)?);
        Ok(AccountStateResult {
            user_id: session.user_id,
            epoch: session.epoch,
            schema_version: response
                .get("schema_version")
                .and_then(Value::as_u64)
                .unwrap_or(SCHEMA_VERSION as u64) as u32,
            data,
            updated_at: response
                .get("updated_at")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        })
    }

    /// PhoneApp sync is last-write-wins; there is no desktop revision or
    /// operation-id in this request.
    pub async fn sync_state(
        &self,
        expected_epoch: u64,
        snapshot: AccountSnapshot,
    ) -> Result<AccountWriteResult, String> {
        validate_snapshot(&snapshot)?;
        let serialized = build_update_state_data(&snapshot)?;
        if serialized.len() > MAX_DATA_LENGTH {
            return Err("DATA_LIMIT_EXCEEDED".to_string());
        }
        let session = self.session_for_epoch(expected_epoch)?;
        let response = self
            .post_cloud(sync_request_body(&session.user_id, &session.email, serialized))
            .await?;
        self.session_still_current(&session.user_id, session.epoch)?;
        Ok(AccountWriteResult {
            user_id: session.user_id,
            epoch: session.epoch,
            updated_at: response
                .get("updated_at")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        })
    }

    async fn post_cloud(&self, body: Value) -> Result<Value, String> {
        let response = self
            .client
            .post(CLOUD_ENDPOINT)
            .json(&body)
            .send()
            .await
            .map_err(|_| "CLOUD_UNAVAILABLE".to_string())?;
        let status = response.status();
        let body = response
            .bytes()
            .await
            .map_err(|_| "CLOUD_INVALID_RESPONSE:read_body".to_string())?;
        decode_cloud_response(status, &body)
    }
}

fn decode_cloud_response(status: StatusCode, body: &[u8]) -> Result<Value, String> {
    if status != StatusCode::OK {
        return Err(format!("CLOUD_HTTP_{}", status.as_u16()));
    }
    let payload = serde_json::from_slice::<Value>(body)
        .map_err(|_| format!("CLOUD_INVALID_RESPONSE:{}", invalid_body_reason(body)))?;
    match payload.get("status").and_then(Value::as_str) {
        Some("success") => Ok(payload),
        Some("error") => Err(cloud_error_code(&payload)),
        _ => Err("CLOUD_INVALID_RESPONSE:status".to_string()),
    }
}

fn invalid_body_reason(body: &[u8]) -> &'static str {
    let trimmed = body.trim_ascii_start();
    if trimmed.is_empty() {
        return "empty";
    }
    if trimmed.starts_with(b"<") {
        return "html";
    }
    "invalid_json"
}

fn cloud_error_code(payload: &Value) -> String {
    if let Some(code) = payload.get("code").and_then(Value::as_str) {
        if code == "BACKUP_NOT_FOUND" || code == "NOT_FOUND" {
            return "BACKUP_NOT_FOUND".to_string();
        }
        if !code.is_empty()
            && code.len() <= 64
            && code.chars().all(|character| {
                character.is_ascii_uppercase()
                    || character.is_ascii_digit()
                    || matches!(character, '_' | '-')
            })
        {
            return code.to_string();
        }
    }
    let message = payload.get("message").and_then(Value::as_str).unwrap_or("");
    if message.contains("找不到") || message.to_ascii_lowercase().contains("not found") {
        return "BACKUP_NOT_FOUND".to_string();
    }
    "CLOUD_ERROR".to_string()
}

fn decode_pull_data(payload: &Value) -> Result<AccountSnapshot, String> {
    let value = payload
        .get("data")
        .ok_or_else(|| "CLOUD_INVALID:missing_data".to_string())?;
    if value.is_null() {
        return Err("CLOUD_INVALID:missing_data".to_string());
    }
    if !value.is_string() {
        return Err("CLOUD_INVALID:data_type".to_string());
    }
    decode_phone_groups(value)
}

fn decode_phone_groups(value: &Value) -> Result<AccountSnapshot, String> {
    let encoded_len = match value {
        Value::String(encoded) => encoded.len(),
        other => serde_json::to_vec(other)
            .map_err(|_| "CORRUPT_STORED_DATA".to_string())?
            .len(),
    };
    if encoded_len > MAX_DATA_LENGTH {
        return Err("DATA_LIMIT_EXCEEDED".to_string());
    }
    let decoded = match value {
        Value::String(encoded) => {
            serde_json::from_str::<Value>(encoded).map_err(|_| "CORRUPT_STORED_DATA".to_string())?
        }
        other => other.clone(),
    };
    // There is intentionally no legacy AccountSnapshot fallback.
    let groups = serde_json::from_value::<Vec<PhoneWatchlistGroupWire>>(decoded)
        .map_err(|_| "CORRUPT_STORED_DATA".to_string())?;
    phone_groups_to_snapshot(groups)
}

fn phone_groups_to_snapshot(
    groups: Vec<PhoneWatchlistGroupWire>,
) -> Result<AccountSnapshot, String> {
    if groups.len() > MAX_CATEGORIES {
        return Err("DATA_LIMIT_EXCEEDED".to_string());
    }
    let mut stocks = Vec::new();
    let mut stock_index = HashMap::new();
    let mut group_ids = HashSet::new();
    let mut categories = Vec::with_capacity(groups.len());

    for group in groups {
        let id = group.id.trim().to_string();
        if id.is_empty() || id.len() > 200 || !group_ids.insert(id.clone()) {
            return Err("CORRUPT_STORED_DATA".to_string());
        }
        if group.name.len() > 200 {
            return Err("CORRUPT_STORED_DATA".to_string());
        }
        let mut stock_ids = Vec::new();
        for stock in group.stocks {
            let symbol = stock.symbol.trim().to_string();
            if symbol.is_empty() || symbol.len() > 40 || stock.name.len() > 200 {
                return Err("CORRUPT_STORED_DATA".to_string());
            }
            if !stock_ids.iter().any(|id| id == &symbol) {
                stock_ids.push(symbol.clone());
            } else {
                return Err("CORRUPT_STORED_DATA".to_string());
            }
            if !stock_index.contains_key(&symbol) {
                if stocks.len() >= MAX_STOCKS {
                    return Err("DATA_LIMIT_EXCEEDED".to_string());
                }
                stocks.push(StockRecord {
                    id: symbol.clone(),
                    name: stock.name.trim().to_string(),
                    group: infer_market_group(&symbol),
                    stock_type: "stock".to_string(),
                });
                stock_index.insert(symbol, stocks.len() - 1);
            }
        }
        categories.push(CategoryRecord {
            id,
            name: group.name.trim().to_string(),
            stock_ids,
        });
    }

    let active = categories
        .first()
        .map(|category| category.id.clone())
        .unwrap_or_default();
    let snapshot = AccountSnapshot {
        stocks,
        categories,
        active_category_id: active,
        pinned_category_ids: Vec::new(),
        recent_category_ids: Vec::new(),
        indicator_settings: default_indicator_settings(),
    };
    validate_snapshot(&snapshot).map_err(|_| "CORRUPT_STORED_DATA".to_string())?;
    Ok(snapshot)
}

fn snapshot_to_phone_groups(snapshot: &AccountSnapshot) -> Vec<PhoneWatchlistGroupWire> {
    let stocks_by_id: HashMap<&str, &StockRecord> = snapshot
        .stocks
        .iter()
        .map(|stock| (stock.id.as_str(), stock))
        .collect();
    snapshot
        .categories
        .iter()
        .map(|category| PhoneWatchlistGroupWire {
            id: category.id.clone(),
            name: category.name.clone(),
            stocks: category
                .stock_ids
                .iter()
                .filter_map(|stock_id| stocks_by_id.get(stock_id.as_str()))
                .map(|stock| PhoneStockWire {
                    symbol: stock.id.clone(),
                    name: stock.name.clone(),
                    price: "---".to_string(),
                    change: "0.0".to_string(),
                    is_positive: true,
                })
                .collect(),
        })
        .collect()
}

fn build_update_state_data(snapshot: &AccountSnapshot) -> Result<String, String> {
    serde_json::to_string(&snapshot_to_phone_groups(snapshot))
        .map_err(|_| "INVALID_DATA".to_string())
}

fn infer_market_group(symbol: &str) -> String {
    let value = symbol.trim().to_ascii_uppercase();
    if value.starts_with("TW:")
        || value.starts_with("TW-")
        || value.chars().all(|character| character.is_ascii_digit())
        || value.ends_with(".TW")
        || value.ends_with(".TWO")
    {
        "TW".to_string()
    } else {
        "US".to_string()
    }
}

pub fn default_indicator_settings() -> IndicatorSettings {
    IndicatorSettings {
        ma5: 5.0,
        ma10: 10.0,
        ma20: 30.0,
        ma60: 60.0,
        boll: 30.0,
        kd: 9.0,
        mfi: 14.0,
        rsi: 14.0,
        ma120: 120.0,
        ma240: 240.0,
        ema_short: 5.0,
        ema_long: 10.0,
        cmf: 21.0,
        cmf_ema: 5.0,
        atr_len: 10.0,
        atr_mult: 3.0,
        donchian: 20.0,
        cci: 26.0,
    }
}

pub fn validate_snapshot(snapshot: &AccountSnapshot) -> Result<(), String> {
    if snapshot.stocks.len() > MAX_STOCKS || snapshot.categories.len() > MAX_CATEGORIES {
        return Err("DATA_LIMIT_EXCEEDED".to_string());
    }
    let mut stocks = HashSet::new();
    for stock in &snapshot.stocks {
        if stock.id.trim().is_empty()
            || stock.id.len() > 40
            || stock.name.len() > 200
            || stock.group.len() > 40
            || stock.stock_type.len() > 40
            || !stocks.insert(stock.id.clone())
        {
            return Err("INVALID_STOCK".to_string());
        }
    }
    let mut categories = HashSet::new();
    let mut memberships = HashSet::new();
    for category in &snapshot.categories {
        if category.id.trim().is_empty()
            || category.name.len() > 200
            || !categories.insert(category.id.clone())
        {
            return Err("INVALID_CATEGORY".to_string());
        }
        let mut members = HashSet::new();
        for id in &category.stock_ids {
            if !stocks.contains(id) || !members.insert(id) {
                return Err("INVALID_CATEGORY_MEMBERSHIP".to_string());
            }
            memberships.insert(id.clone());
        }
    }
    if memberships.len() != stocks.len() {
        return Err("ORPHAN_STOCK".to_string());
    }
    if !snapshot.active_category_id.is_empty() && !categories.contains(&snapshot.active_category_id)
    {
        return Err("INVALID_ACTIVE_CATEGORY".to_string());
    }
    validate_category_refs(
        &snapshot.pinned_category_ids,
        &categories,
        "INVALID_PINNED_CATEGORIES",
    )?;
    validate_category_refs(
        &snapshot.recent_category_ids,
        &categories,
        "INVALID_RECENT_CATEGORIES",
    )?;
    if snapshot.pinned_category_ids.len() > 5 || snapshot.recent_category_ids.len() > 3 {
        return Err("CATEGORY_LIMIT_EXCEEDED".to_string());
    }
    if snapshot
        .pinned_category_ids
        .iter()
        .any(|id| snapshot.recent_category_ids.contains(id))
    {
        return Err("CATEGORY_REFERENCE_OVERLAP".to_string());
    }
    validate_indicator_settings(&snapshot.indicator_settings)?;
    let encoded = build_update_state_data(snapshot)?;
    if encoded.len() > MAX_DATA_LENGTH {
        return Err("DATA_LIMIT_EXCEEDED".to_string());
    }
    Ok(())
}

fn validate_category_refs(
    values: &[String],
    categories: &HashSet<String>,
    error: &str,
) -> Result<(), String> {
    let mut seen = HashSet::new();
    for value in values {
        if !categories.contains(value) || !seen.insert(value) {
            return Err(error.to_string());
        }
    }
    Ok(())
}

pub fn validate_indicator_settings(settings: &IndicatorSettings) -> Result<(), String> {
    let values = [
        settings.ma5,
        settings.ma10,
        settings.ma20,
        settings.ma60,
        settings.boll,
        settings.kd,
        settings.mfi,
        settings.rsi,
        settings.ma120,
        settings.ma240,
        settings.ema_short,
        settings.ema_long,
        settings.cmf,
        settings.cmf_ema,
        settings.atr_len,
        settings.atr_mult,
        settings.donchian,
        settings.cci,
    ];
    if values
        .iter()
        .any(|value| !value.is_finite() || *value <= 0.0 || *value > 1000.0)
        || settings.atr_mult > 20.0
    {
        return Err("INVALID_INDICATOR_SETTINGS".to_string());
    }
    Ok(())
}

fn unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn groups() -> Value {
        json!([{
            "id": "group-1",
            "name": "追蹤",
            "stocks": [{"symbol":"3010","name":"華立","price":"---","change":"0.0","isPositive":true}]
        }])
    }

    #[test]
    fn phone_groups_are_decoded_without_a_virtual_default() {
        let snapshot = decode_phone_groups(&Value::String(groups().to_string())).expect("groups");
        assert_eq!(snapshot.categories.len(), 1);
        assert_eq!(snapshot.categories[0].id, "group-1");
        assert_eq!(snapshot.active_category_id, "group-1");
        assert_eq!(snapshot.stocks[0].group, "TW");
    }

    #[test]
    fn outbound_shape_has_exact_phone_fields_and_defaults() {
        let snapshot = decode_phone_groups(&groups()).expect("groups");
        let payload = build_update_state_data(&snapshot).expect("payload");
        let value: Value = serde_json::from_str(&payload).expect("json");
        let stock = &value[0]["stocks"][0];
        assert_eq!(
            stock,
            &json!({"symbol":"3010","name":"華立","price":"---","change":"0.0","isPositive":true})
        );
        assert!(stock.get("marketGroup").is_none());
        assert!(stock.get("marketType").is_none());
    }

    #[test]
    fn legacy_account_snapshot_is_rejected() {
        let legacy = json!({"stocks":[],"categories":[],"activeCategoryId":"","pinnedCategoryIds":[],"recentCategoryIds":[],"indicatorSettings":{}});
        assert_eq!(
            decode_phone_groups(&legacy),
            Err("CORRUPT_STORED_DATA".to_string())
        );
    }

    #[test]
    fn malformed_phone_groups_are_rejected_strictly() {
        assert_eq!(
            decode_phone_groups(&json!([{"id":"group-1","name":"追蹤"}])),
            Err("CORRUPT_STORED_DATA".to_string())
        );
        assert_eq!(
            decode_phone_groups(&json!([{"id":"group-1","name":"追蹤","stocks":[
                {"symbol":"3010","name":"華立","price":"---","change":"0.0","isPositive":true},
                {"symbol":"3010","name":"華立","price":"---","change":"0.0","isPositive":true}
            ]}])),
            Err("CORRUPT_STORED_DATA".to_string())
        );
    }

    #[test]
    fn empty_groups_are_valid() {
        let snapshot = decode_phone_groups(&json!([])).expect("empty groups");
        assert!(snapshot.categories.is_empty());
        assert!(snapshot.stocks.is_empty());
        assert_eq!(snapshot.active_category_id, "");
    }

    #[test]
    fn successful_pull_requires_a_serialized_phone_data_string() {
        let empty =
            decode_pull_data(&json!({"status":"success", "data":"[]"})).expect("empty phone data");
        assert!(empty.categories.is_empty());
        for payload in [
            json!({"status":"success"}),
            json!({"status":"success", "data":null}),
            json!({"status":"success", "data":[]}),
        ] {
            assert!(matches!(
                decode_pull_data(&payload),
                Err(error) if error.starts_with("CLOUD_INVALID:")
            ));
        }
    }

    #[test]
    fn cloud_request_bodies_partition_desktop_records() {
        let pull = pull_request_body("user-a", "a@example.com");
        let sync = sync_request_body("user-a", "a@example.com", "[]".to_string());
        assert_eq!(pull["type"], CLIENT_TYPE);
        assert_eq!(sync["type"], CLIENT_TYPE);
        assert_eq!(sync["data"], "[]");
    }

    #[test]
    fn session_switch_keeps_epoch_isolation_without_token_validation() {
        let manager = AccountManager::new().expect("manager");
        let first = manager
            .set_session(
                "not-a-supabase-token".into(),
                "user-a".into(),
                Some("a@example.com".into()),
                None,
            )
            .expect("first");
        manager.clear_session().expect("clear");
        let second = manager
            .set_session("unused".into(), "user-b".into(), None, None)
            .expect("second");
        assert!(second.epoch > first.epoch);
        assert!(
            matches!(manager.active_session(first.epoch), Err(error) if error == "SESSION_CHANGED")
        );
    }
}
