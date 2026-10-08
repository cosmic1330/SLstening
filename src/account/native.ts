import { invoke } from "@tauri-apps/api/core";
import type { Session } from "@supabase/supabase-js";
import type {
  AccountSnapshot,
  IndicatorSettings,
  LegacySettingsStatus,
  NativeAccountState,
  NativeAccountWriteResult,
  NativeSessionResult,
} from "./types";

export const isNativeRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function establishNativeSession(session: Session, transitionId: number): Promise<NativeSessionResult | null> {
  if (!isNativeRuntime()) return null;
  try {
    return await invoke<NativeSessionResult>("account_set_session", {
      transitionId,
      accessToken: session.access_token,
      userId: session.user.id,
      email: session.user.email ?? null,
      expiresAt: session.expires_at ?? null,
    });
  } catch (error) {
    // A rejected session replacement must fail closed. The old gateway
    // session is invalidated before the caller renders the next account.
    try { await invalidateNativeSession(transitionId); } catch { /* preserve original error */ }
    throw error;
  }
}

export async function clearNativeSession(transitionId: number): Promise<void> {
  if (!isNativeRuntime()) return;
  try {
    await invoke("account_clear_session", { transitionId });
  } catch (error) {
    // Keep a separate idempotent kill-switch command so a failed normal
    // transition cannot leave the local agent gateway authenticated.
    try {
      await invalidateNativeSession(transitionId);
    } catch {
      throw error;
    }
  }
}

export async function invalidateNativeSession(transitionId: number): Promise<void> {
  if (!isNativeRuntime()) return;
  await invoke("account_invalidate_session", { transitionId });
}

export async function getNativeAccountState(expectedEpoch: number): Promise<NativeAccountState | null> {
  if (!isNativeRuntime()) return null;
  return invoke<NativeAccountState>("account_get_state", { expectedEpoch });
}

export async function updateNativeAccountState(
  expectedEpoch: number,
  data: AccountSnapshot,
): Promise<NativeAccountWriteResult> {
  return invoke<NativeAccountWriteResult>("account_update_state", {
    expectedEpoch,
    data,
  });
}

export async function getLegacySettingsStatus(): Promise<LegacySettingsStatus | null> {
  if (!isNativeRuntime()) return null;
  return invoke<LegacySettingsStatus>("legacy_settings_status");
}

export async function keepLegacySettings(): Promise<LegacySettingsStatus | null> {
  if (!isNativeRuntime()) return null;
  return invoke<LegacySettingsStatus>("legacy_settings_keep");
}

export async function deleteLegacySettings(): Promise<LegacySettingsStatus | null> {
  if (!isNativeRuntime()) return null;
  return invoke<LegacySettingsStatus>("legacy_settings_delete");
}

export async function getNativeIndicatorSettings(expectedEpoch: number): Promise<IndicatorSettings | null> {
  if (!isNativeRuntime()) return null;
  return invoke<IndicatorSettings | null>("account_get_indicator_settings", { expectedEpoch });
}

export async function updateNativeIndicatorSettings(
  expectedEpoch: number,
  settings: Partial<IndicatorSettings>,
  base: IndicatorSettings,
): Promise<IndicatorSettings> {
  return invoke<IndicatorSettings>("account_update_indicator_settings", {
    expectedEpoch,
    settings,
    base,
  });
}

export async function resetNativeIndicatorSettings(expectedEpoch: number): Promise<IndicatorSettings> {
  return invoke<IndicatorSettings>("account_reset_indicator_settings", { expectedEpoch });
}

export interface AgentGatewayConfig {
  available: boolean;
  endpoint: string;
  discoveryPath: string;
  bridgePath: string;
  protocolVersion: string;
  error: string | null;
  lastClientActivityAt: number | null;
}

export async function getAgentGatewayConfig(): Promise<AgentGatewayConfig | null> {
  if (!isNativeRuntime()) return null;
  return invoke<AgentGatewayConfig>("agent_get_config");
}
