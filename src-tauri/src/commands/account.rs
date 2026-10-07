use crate::account::{
    AccountManager, AccountSnapshot, AccountStateResult, AccountWriteResult, SessionResult,
};
use crate::agent_gateway::{AgentGateway, AgentGatewayConfig};
use tauri::State;

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
pub async fn account_get_state(
    expected_epoch: u64,
    manager: State<'_, AccountManager>,
) -> Result<AccountStateResult, String> {
    manager.get_state(expected_epoch).await
}

#[tauri::command]
pub async fn account_update_state(
    expected_epoch: u64,
    expected_revision: u64,
    data: AccountSnapshot,
    operation_id: String,
    manager: State<'_, AccountManager>,
) -> Result<AccountWriteResult, String> {
    manager
        .update_state(expected_epoch, expected_revision, data, operation_id)
        .await
}

#[tauri::command]
pub async fn account_import_legacy(
    expected_epoch: u64,
    data: AccountSnapshot,
    operation_id: String,
    manager: State<'_, AccountManager>,
) -> Result<AccountWriteResult, String> {
    manager
        .import_legacy(expected_epoch, data, operation_id)
        .await
}
