use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

pub const CLOUD_ENDPOINT: &str = "https://script.google.com/macros/s/AKfycbwoj0pC8VR26NGWEU4L8gyXCmuLQqRmzV1n4C89egzLTwpzY6qMQ32xM6fR5Q6DcEl4/exec";
pub const SCHEMA_VERSION: u32 = 1;
const MAX_DATA_LENGTH: usize = 45_000;
const MAX_STOCKS: usize = 300;
const MAX_CATEGORIES: usize = 100;

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
    #[serde(default)]
    pub is_default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccountSnapshot {
    pub stocks: Vec<StockRecord>,
    pub categories: Vec<CategoryRecord>,
    pub active_category_id: String,
    pub pinned_category_ids: Vec<String>,
    pub recent_category_ids: Vec<String>,
    pub indicator_settings: IndicatorSettings,
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
    pub revision: u64,
    pub schema_version: u32,
    pub data: Option<AccountSnapshot>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountWriteResult {
    pub user_id: String,
    pub epoch: u64,
    pub revision: u64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone)]
struct SessionContext {
    user_id: String,
    access_token: String,
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
            .user_agent("SLstening/0.0.62")
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
        access_token: String,
        user_id: String,
        _email: Option<String>,
        expires_at: Option<i64>,
    ) -> Result<SessionResult, String> {
        if access_token.trim().len() < 20 {
            return Err("AUTH_REQUIRED".to_string());
        }
        if user_id.trim().is_empty() {
            return Err("INVALID_USER_ID".to_string());
        }
        if token_subject(&access_token).as_deref() != Some(user_id.as_str()) {
            return Err("AUTH_IDENTITY_MISMATCH".to_string());
        }
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
            access_token,
            expires_at,
            epoch: next_epoch,
        });
        Ok(SessionResult {
            user_id,
            epoch: next_epoch,
            expires_at,
        })
    }

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

    pub fn invalidate_session(&self) -> Result<(), String> {
        let transition_id = self.transition.fetch_add(1, Ordering::SeqCst) + 1;
        self.invalidate_session_at(transition_id)
    }

    fn invalidate_session_at(&self, transition_id: u64) -> Result<(), String> {
        // Advance the epoch before acquiring the lock. Even if the lock is
        // poisoned or a caller observes the returned error, every in-flight
        // request now fails its epoch check and the gateway is fail-closed.
        self.epoch.fetch_add(1, Ordering::SeqCst);
        let mut guard = self
            .session
            .write()
            .map_err(|_| "SESSION_LOCK".to_string())?;
        if self.transition.load(Ordering::SeqCst) != transition_id {
            return Err("STALE_SESSION_TRANSITION".to_string());
        }
        // Keep the epoch in a tombstone so a late request can never match a
        // newly established session that happens to reuse a token.
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
            // The atomic epoch is the revocation boundary.  Checking it while
            // the read lock is held prevents a reader that raced with
            // invalidate_session from publishing the old session.
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
        if session.epoch != self.epoch.load(Ordering::SeqCst) {
            return Err("SESSION_CHANGED".to_string());
        }
        if session.epoch != expected_epoch {
            return Err("SESSION_CHANGED".to_string());
        }
        if let Some(expires_at) = session.expires_at {
            let now = unix_seconds();
            if expires_at <= now {
                return Err("SESSION_EXPIRED".to_string());
            }
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
        let response = self
            .post_cloud(
                &session,
                serde_json::json!({
                    "action": "get_state",
                    "access_token": session.access_token,
                }),
            )
            .await?;
        self.session_still_current(&session.user_id, session.epoch)?;
        let data = match response.get("data") {
            Some(value) if !value.is_null() => Some(
                serde_json::from_value(value.clone())
                    .map_err(|_| "CORRUPT_STORED_DATA".to_string())?,
            ),
            _ => None,
        };
        if let Some(snapshot) = data.as_ref() {
            validate_snapshot(snapshot)?;
        }
        Ok(AccountStateResult {
            user_id: session.user_id,
            epoch: session.epoch,
            revision: response_revision(&response)?,
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

    pub async fn update_state(
        &self,
        expected_epoch: u64,
        expected_revision: u64,
        snapshot: AccountSnapshot,
        operation_id: String,
    ) -> Result<AccountWriteResult, String> {
        validate_snapshot(&snapshot)?;
        if operation_id.len() < 8
            || operation_id.len() > 128
            || !operation_id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || ".:_-".contains(c))
        {
            return Err("INVALID_OPERATION_ID".to_string());
        }
        let serialized =
            serde_json::to_string(&snapshot).map_err(|_| "INVALID_DATA".to_string())?;
        if serialized.len() > MAX_DATA_LENGTH {
            return Err("DATA_LIMIT_EXCEEDED".to_string());
        }
        let session = self.session_for_epoch(expected_epoch)?;
        let response = self
            .post_cloud(
                &session,
                serde_json::json!({
                    "action": "update_state",
                    "access_token": session.access_token,
                    "expected_revision": expected_revision,
                    "operation_id": operation_id,
                    "data": snapshot,
                }),
            )
            .await?;
        self.session_still_current(&session.user_id, session.epoch)?;
        Ok(AccountWriteResult {
            user_id: session.user_id,
            epoch: session.epoch,
            revision: response_revision(&response)?,
            updated_at: response
                .get("updated_at")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        })
    }

    pub async fn import_legacy(
        &self,
        expected_epoch: u64,
        snapshot: AccountSnapshot,
        operation_id: String,
    ) -> Result<AccountWriteResult, String> {
        let state = self.get_state(expected_epoch).await?;
        if state.revision != 0 || state.data.is_some() {
            return Err("LEGACY_IMPORT_REFUSED_CLOUD_EXISTS".to_string());
        }
        self.update_state(expected_epoch, 0, snapshot, operation_id)
            .await
    }

    async fn post_cloud(&self, session: &SessionContext, body: Value) -> Result<Value, String> {
        let response = self
            .client
            .post(CLOUD_ENDPOINT)
            .json(&body)
            .send()
            .await
            .map_err(|error| format!("CLOUD_UNAVAILABLE:{error}"))?;
        let status = response.status();
        let payload = response
            .json::<Value>()
            .await
            .map_err(|error| format!("CLOUD_INVALID_RESPONSE:{error}"))?;
        if status != StatusCode::OK {
            return Err(format!("CLOUD_HTTP_{}", status.as_u16()));
        }
        if payload.get("status").and_then(Value::as_str) == Some("error") {
            return Err(payload
                .get("code")
                .and_then(Value::as_str)
                .unwrap_or("CLOUD_ERROR")
                .to_string());
        }
        if payload.get("status").and_then(Value::as_str) != Some("success") {
            return Err("CLOUD_INVALID_RESPONSE".to_string());
        }
        let _ = session;
        Ok(payload)
    }
}

pub fn validate_snapshot(snapshot: &AccountSnapshot) -> Result<(), String> {
    if snapshot.stocks.len() > MAX_STOCKS || snapshot.categories.len() > MAX_CATEGORIES {
        return Err("DATA_LIMIT_EXCEEDED".to_string());
    }
    let mut stocks = HashSet::new();
    for stock in &snapshot.stocks {
        if stock.id.trim().is_empty()
            || stock.id.len() > 20
            || stock.name.len() > 200
            || stock.group.len() > 40
            || stock.stock_type.len() > 40
        {
            return Err("INVALID_STOCK".to_string());
        }
        if !stocks.insert(stock.id.clone()) {
            return Err("DUPLICATE_STOCK".to_string());
        }
    }
    if snapshot.categories.is_empty() || snapshot.categories[0].id != "default-watchlist" {
        return Err("DEFAULT_CATEGORY_REQUIRED".to_string());
    }
    let mut categories = HashSet::new();
    let mut names = HashSet::new();
    for (index, category) in snapshot.categories.iter().enumerate() {
        if category.id.trim().is_empty()
            || category.name.len() > 100
            || !categories.insert(category.id.clone())
        {
            return Err("INVALID_CATEGORY".to_string());
        }
        let is_default = category.id == "default-watchlist" || category.is_default == Some(true);
        if index == 0 && !is_default {
            return Err("DEFAULT_CATEGORY_REQUIRED".to_string());
        }
        if !is_default && !names.insert(category.name.trim().to_lowercase()) {
            return Err("DUPLICATE_CATEGORY_NAME".to_string());
        }
        let mut members = HashSet::new();
        for id in &category.stock_ids {
            if !stocks.contains(id) || !members.insert(id) {
                return Err("INVALID_CATEGORY_MEMBERSHIP".to_string());
            }
        }
    }
    if !categories.contains(&snapshot.active_category_id) {
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
    let encoded = serde_json::to_string(snapshot).map_err(|_| "INVALID_DATA".to_string())?;
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
        if value == "default-watchlist" || !categories.contains(value) || !seen.insert(value) {
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

fn response_revision(response: &Value) -> Result<u64, String> {
    response
        .get("revision")
        .and_then(|value| value.as_u64().or_else(|| value.as_str()?.parse().ok()))
        .ok_or_else(|| "CORRUPT_CLOUD_RESPONSE".to_string())
}

fn token_subject(access_token: &str) -> Option<String> {
    let payload = access_token.split('.').nth(1)?;
    let decoded = URL_SAFE_NO_PAD
        .decode(payload)
        .or_else(|_| URL_SAFE_NO_PAD.decode(format!("{payload}===").trim_end_matches('=')))
        .ok()?;
    serde_json::from_slice::<Value>(&decoded)
        .ok()?
        .get("sub")?
        .as_str()
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Barrier};
    use std::thread;

    fn token_for(user_id: &str) -> String {
        let payload = URL_SAFE_NO_PAD.encode(serde_json::json!({"sub": user_id}).to_string());
        format!("eyJhbGciOiJub25lIn0.{payload}.signature")
    }

    fn snapshot() -> AccountSnapshot {
        AccountSnapshot {
            stocks: vec![StockRecord {
                id: "2330".into(),
                name: "TSMC".into(),
                group: "TW".into(),
                stock_type: "stock".into(),
            }],
            categories: vec![CategoryRecord {
                id: "default-watchlist".into(),
                name: "".into(),
                stock_ids: vec!["2330".into()],
                is_default: Some(true),
            }],
            active_category_id: "default-watchlist".into(),
            pinned_category_ids: vec![],
            recent_category_ids: vec![],
            indicator_settings: IndicatorSettings {
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
            },
        }
    }

    #[test]
    fn validates_default_and_indicator_settings() {
        assert!(validate_snapshot(&snapshot()).is_ok());
    }

    #[test]
    fn rejects_membership_for_unknown_stock() {
        let mut value = snapshot();
        value.categories[0].stock_ids.push("9999".into());
        assert_eq!(
            validate_snapshot(&value),
            Err("INVALID_CATEGORY_MEMBERSHIP".into())
        );
    }

    #[test]
    fn rejects_overlapping_pin_and_recent_category() {
        let mut value = snapshot();
        value.categories.push(CategoryRecord {
            id: "tech".into(),
            name: "Tech".into(),
            stock_ids: vec![],
            is_default: None,
        });
        value.pinned_category_ids = vec!["tech".into()];
        value.recent_category_ids = vec!["tech".into()];
        assert_eq!(
            validate_snapshot(&value),
            Err("CATEGORY_REFERENCE_OVERLAP".into())
        );
    }

    #[test]
    fn logout_and_account_switch_never_reuse_the_previous_epoch() {
        let manager = AccountManager::new().expect("manager");
        let first = manager
            .set_session(token_for("user-a"), "user-a".into(), None, None)
            .expect("first");
        manager.clear_session().expect("clear");
        let second = manager
            .set_session(token_for("user-b"), "user-b".into(), None, None)
            .expect("second");
        assert!(second.epoch > first.epoch);
        assert!(matches!(
            manager.active_session(first.epoch),
            Err(error) if error == "SESSION_CHANGED"
        ));
        assert_eq!(
            manager
                .active_session(second.epoch)
                .expect("active")
                .user_id,
            "user-b"
        );
    }

    #[test]
    fn rejects_a_caller_selected_user_id() {
        let manager = AccountManager::new().expect("manager");
        assert!(matches!(
            manager.set_session(token_for("user-a"), "user-b".into(), None, None),
            Err(error) if error == "AUTH_IDENTITY_MISMATCH"
        ));
    }

    #[test]
    fn expired_session_is_rejected_after_an_await_boundary() {
        let manager = AccountManager::new().expect("manager");
        let session = manager
            .set_session(
                token_for("user-a"),
                "user-a".into(),
                None,
                Some(unix_seconds() - 1),
            )
            .expect("session");
        assert!(matches!(
            manager.active_session(session.epoch),
            Err(error) if error == "SESSION_EXPIRED"
        ));
    }

    #[test]
    fn atomic_invalidation_is_seen_by_current_and_epoch_readers() {
        let manager = Arc::new(AccountManager::new().expect("manager"));
        let session = manager
            .set_session(token_for("user-a"), "user-a".into(), None, None)
            .expect("session");
        let barrier = Arc::new(Barrier::new(2));
        let reader_manager = Arc::clone(&manager);
        let reader_barrier = Arc::clone(&barrier);
        let reader = thread::spawn(move || {
            reader_barrier.wait();
            reader_barrier.wait();
            reader_manager.active_session(session.epoch)
        });

        // Advance the revocation epoch before allowing the reader to acquire
        // its lock. This models the atomic part of invalidate_session even if
        // the write lock is temporarily contended.
        barrier.wait();
        manager.epoch.fetch_add(1, Ordering::SeqCst);
        assert!(manager.current_session().expect("current").is_none());
        barrier.wait();

        assert!(matches!(
            reader.join().expect("reader"),
            Err(error) if error == "SESSION_CHANGED"
        ));
    }

    #[test]
    fn stale_frontend_transition_cannot_replace_or_revoke_the_new_session() {
        let manager = AccountManager::new().expect("manager");
        manager
            .set_session_for_transition(1, token_for("user-a"), "user-a".into(), None, None)
            .expect("session a");
        manager
            .set_session_for_transition(2, token_for("user-b"), "user-b".into(), None, None)
            .expect("session b");

        assert_eq!(
            manager.invalidate_session_for_transition(1),
            Err("STALE_SESSION_TRANSITION".to_string())
        );
        assert!(matches!(
            manager.set_session_for_transition(
                1,
                token_for("user-a"),
                "user-a".into(),
                None,
                None,
            ),
            Err(error) if error == "STALE_SESSION_TRANSITION"
        ));
        assert_eq!(
            manager.current_session().expect("current").unwrap().user_id,
            "user-b"
        );
    }
}
