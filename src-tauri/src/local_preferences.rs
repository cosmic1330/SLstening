use crate::account::{validate_indicator_settings, AccountManager, IndicatorSettings};
use serde_json::{Map, Value};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const LOCAL_PREFERENCES_FILE: &str = "preferences.json";
const INDICATOR_SETTINGS_KEY_PREFIX: &str = "account:";
const INDICATOR_SETTINGS_KEY_SUFFIX: &str = ":indicator-settings";

/// Owns account-scoped preferences that are deliberately kept on the device.
///
/// The mutex covers the complete read/modify/write transaction. Frontend
/// commands and the local agent gateway share this manager, so an MCP patch
/// cannot be lost when the UI changes a different indicator at the same time.
#[derive(Clone)]
pub struct LocalPreferencesManager {
    app: AppHandle,
    transaction: Arc<Mutex<()>>,
}

impl LocalPreferencesManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            transaction: Arc::new(Mutex::new(())),
        }
    }

    pub fn read_indicator_settings(
        &self,
        account: &AccountManager,
        user_id: &str,
        epoch: u64,
        deadline: Instant,
    ) -> Result<Option<IndicatorSettings>, String> {
        self.check(account, epoch, deadline)?;
        let _guard = self
            .transaction
            .lock()
            .map_err(|_| "LOCAL_PREFERENCES_LOCK".to_string())?;
        self.check(account, epoch, deadline)?;
        let result = self.read_indicator_settings_unlocked(user_id);
        self.check(account, epoch, deadline)?;
        result
    }

    /// Apply a partial update atomically. `base` initializes a clean account
    /// preference record when this is the first write for the account.
    pub fn patch_indicator_settings(
        &self,
        account: &AccountManager,
        user_id: &str,
        epoch: u64,
        patch: Map<String, Value>,
        base: &IndicatorSettings,
        deadline: Instant,
    ) -> Result<IndicatorSettings, String> {
        self.check(account, epoch, deadline)?;
        validate_indicator_settings(base)?;
        let _guard = self
            .transaction
            .lock()
            .map_err(|_| "LOCAL_PREFERENCES_LOCK".to_string())?;
        self.check(account, epoch, deadline)?;
        let current = self
            .read_indicator_settings_unlocked(user_id)?
            .unwrap_or_else(|| base.clone());
        let updated = apply_indicator_patch(&current, patch)?;
        self.write_indicator_settings_unlocked(user_id, &updated)?;
        self.check(account, epoch, deadline)?;
        Ok(updated)
    }

    pub fn reset_indicator_settings(
        &self,
        account: &AccountManager,
        user_id: &str,
        epoch: u64,
        deadline: Instant,
    ) -> Result<IndicatorSettings, String> {
        self.check(account, epoch, deadline)?;
        let _guard = self
            .transaction
            .lock()
            .map_err(|_| "LOCAL_PREFERENCES_LOCK".to_string())?;
        self.check(account, epoch, deadline)?;
        let updated = default_indicator_settings();
        self.write_indicator_settings_unlocked(user_id, &updated)?;
        self.check(account, epoch, deadline)?;
        Ok(updated)
    }

    fn check(&self, account: &AccountManager, epoch: u64, deadline: Instant) -> Result<(), String> {
        account.active_session(epoch).map(|_| ())?;
        deadline
            .checked_duration_since(Instant::now())
            .filter(|remaining| !remaining.is_zero())
            .map(|_| ())
            .ok_or_else(|| "DEADLINE_EXCEEDED".to_string())
    }

    fn read_indicator_settings_unlocked(
        &self,
        user_id: &str,
    ) -> Result<Option<IndicatorSettings>, String> {
        let store = self
            .app
            .store(LOCAL_PREFERENCES_FILE)
            .map_err(|_| "LOCAL_PREFERENCES_UNAVAILABLE".to_string())?;
        let Some(value) = store.get(indicator_settings_key(user_id)) else {
            return Ok(None);
        };
        let settings = serde_json::from_value(value)
            .map_err(|_| "LOCAL_INDICATOR_SETTINGS_CORRUPT".to_string())?;
        validate_indicator_settings(&settings)
            .map_err(|_| "LOCAL_INDICATOR_SETTINGS_INVALID".to_string())?;
        Ok(Some(settings))
    }

    fn write_indicator_settings_unlocked(
        &self,
        user_id: &str,
        settings: &IndicatorSettings,
    ) -> Result<(), String> {
        validate_indicator_settings(settings)?;
        let value = serde_json::to_value(settings)
            .map_err(|_| "LOCAL_PREFERENCES_SERIALIZE_FAILED".to_string())?;
        let store = self
            .app
            .store(LOCAL_PREFERENCES_FILE)
            .map_err(|_| "LOCAL_PREFERENCES_UNAVAILABLE".to_string())?;
        store.set(indicator_settings_key(user_id), value);
        store
            .save()
            .map_err(|_| "LOCAL_PREFERENCES_WRITE_FAILED".to_string())
    }
}

pub(crate) fn indicator_settings_key(user_id: &str) -> String {
    format!("{INDICATOR_SETTINGS_KEY_PREFIX}{user_id}{INDICATOR_SETTINGS_KEY_SUFFIX}")
}

pub(crate) fn apply_indicator_patch(
    current: &IndicatorSettings,
    patch: Map<String, Value>,
) -> Result<IndicatorSettings, String> {
    let mut value =
        serde_json::to_value(current).map_err(|_| "INVALID_INDICATOR_SETTINGS".to_string())?;
    let target = value
        .as_object_mut()
        .ok_or_else(|| "INVALID_INDICATOR_SETTINGS".to_string())?;
    for (key, value) in patch {
        target.insert(key, value);
    }
    let updated =
        serde_json::from_value(value).map_err(|_| "INVALID_INDICATOR_SETTINGS".to_string())?;
    validate_indicator_settings(&updated)?;
    Ok(updated)
}

fn default_indicator_settings() -> IndicatorSettings {
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

#[cfg(test)]
mod tests {
    use super::{apply_indicator_patch, default_indicator_settings};
    use serde_json::json;
    use std::sync::{Arc, Mutex};
    use std::thread;

    #[test]
    fn concurrent_indicator_patches_preserve_different_fields() {
        let settings = Arc::new(Mutex::new(default_indicator_settings()));
        thread::scope(|scope| {
            for patch in [json!({"ma5": 7.0}), json!({"rsi": 22.0})] {
                let settings = Arc::clone(&settings);
                scope.spawn(move || {
                    let mut current = settings.lock().expect("preference transaction");
                    let patch = patch.as_object().expect("patch").clone();
                    *current = apply_indicator_patch(&current, patch).expect("valid patch");
                });
            }
        });
        let result = settings.lock().expect("preference transaction").clone();
        assert_eq!(result.ma5, 7.0);
        assert_eq!(result.rsi, 22.0);
    }

    #[test]
    fn invalid_indicator_patch_is_rejected_without_partial_state() {
        let current = default_indicator_settings();
        let result =
            apply_indicator_patch(&current, json!({"ma5": -1.0}).as_object().unwrap().clone());
        assert!(result.is_err());
        assert_eq!(current.ma5, 5.0);
    }

    #[test]
    fn empty_patch_preserves_a_newer_keyed_value() {
        let mut keyed = default_indicator_settings();
        keyed.ma5 = 17.0;
        let migrated = apply_indicator_patch(&keyed, serde_json::Map::new())
            .expect("empty migration patch remains valid");
        assert_eq!(migrated.ma5, 17.0);
    }
}
