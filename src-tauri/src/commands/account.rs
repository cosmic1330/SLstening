use crate::account::{
    AccountManager, AccountSnapshot, AccountStateResult, AccountWriteResult, IndicatorSettings,
    SessionResult,
};
use crate::agent_gateway::{AgentGateway, AgentGatewayConfig};
use crate::legacy_settings::{LegacySettingsManager, LegacySettingsStatus};
use crate::local_preferences::LocalPreferencesManager;
use serde_json::{Map, Value};
use std::time::{Duration, Instant};
use tauri::State;

const LOCAL_PREFERENCES_COMMAND_TIMEOUT: Duration = Duration::from_secs(5);

fn local_preferences_deadline() -> Instant {
    Instant::now() + LOCAL_PREFERENCES_COMMAND_TIMEOUT
}

#[tauri::command]
pub fn account_set_session(
    transition_id: u64,
    access_token: String,
    user_id: String,
    email: Option<String>,
    expires_at: Option<i64>,
    manager: State<'_, AccountManager>,
) -> Result<SessionResult, String> {
    manager.set_session_for_transition(transition_id, access_token, user_id, email, expires_at)
}

#[tauri::command]
pub fn account_clear_session(
    transition_id: u64,
    manager: State<'_, AccountManager>,
) -> Result<(), String> {
    manager.clear_session_for_transition(transition_id)
}

/// Idempotent fail-closed session invalidation used when a UI transition
/// cannot complete its normal clear/set command.
#[tauri::command]
pub fn account_invalidate_session(
    transition_id: u64,
    manager: State<'_, AccountManager>,
) -> Result<(), String> {
    manager.invalidate_session_for_transition(transition_id)
}

#[tauri::command]
pub fn account_get_session(
    manager: State<'_, AccountManager>,
) -> Result<Option<SessionResult>, String> {
    manager.current_session()
}

#[tauri::command]
pub fn agent_get_config(gateway: State<'_, AgentGateway>) -> AgentGatewayConfig {
    gateway.config()
}

#[tauri::command]
pub fn legacy_settings_status(
    manager: State<'_, LegacySettingsManager>,
) -> Result<LegacySettingsStatus, String> {
    manager.status()
}

#[tauri::command]
pub fn legacy_settings_keep(
    manager: State<'_, LegacySettingsManager>,
) -> Result<LegacySettingsStatus, String> {
    manager.keep()
}

#[tauri::command]
pub fn legacy_settings_delete(
    manager: State<'_, LegacySettingsManager>,
) -> Result<LegacySettingsStatus, String> {
    manager.delete()
}

#[tauri::command]
pub async fn account_get_state(
    expected_epoch: u64,
    manager: State<'_, AccountManager>,
) -> Result<AccountStateResult, String> {
    manager.get_state(expected_epoch).await
}

#[tauri::command]
pub async fn account_update_state(
    expected_epoch: u64,
    data: AccountSnapshot,
    manager: State<'_, AccountManager>,
) -> Result<AccountWriteResult, String> {
    manager.sync_state(expected_epoch, data).await
}

#[tauri::command]
pub fn account_get_indicator_settings(
    expected_epoch: u64,
    manager: State<'_, AccountManager>,
    preferences: State<'_, LocalPreferencesManager>,
) -> Result<Option<IndicatorSettings>, String> {
    let session = manager.active_session(expected_epoch)?;
    preferences.read_indicator_settings(
        &manager,
        &session.user_id,
        expected_epoch,
        local_preferences_deadline(),
    )
}

#[tauri::command]
pub fn account_update_indicator_settings(
    expected_epoch: u64,
    settings: Map<String, Value>,
    base: IndicatorSettings,
    manager: State<'_, AccountManager>,
    preferences: State<'_, LocalPreferencesManager>,
) -> Result<IndicatorSettings, String> {
    let session = manager.active_session(expected_epoch)?;
    preferences.patch_indicator_settings(
        &manager,
        &session.user_id,
        expected_epoch,
        settings,
        &base,
        local_preferences_deadline(),
    )
}

#[tauri::command]
pub fn account_reset_indicator_settings(
    expected_epoch: u64,
    manager: State<'_, AccountManager>,
    preferences: State<'_, LocalPreferencesManager>,
) -> Result<IndicatorSettings, String> {
    let session = manager.active_session(expected_epoch)?;
    preferences.reset_indicator_settings(
        &manager,
        &session.user_id,
        expected_epoch,
        local_preferences_deadline(),
    )
}
