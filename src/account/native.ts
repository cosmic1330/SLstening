import { invoke } from "@tauri-apps/api/core";
import type { Session } from "@supabase/supabase-js";
import type {
  AccountSnapshot,
  LegacyImportResult,
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
  expectedRevision: number,
  data: AccountSnapshot,
  operationId: string,
): Promise<NativeAccountWriteResult> {
  return invoke<NativeAccountWriteResult>("account_update_state", {
    expectedEpoch,
    expectedRevision,
    data,
    operationId,
  });
}

export async function importNativeLegacyState(
  expectedEpoch: number,
  data: AccountSnapshot,
  operationId: string,
): Promise<LegacyImportResult> {
  return invoke<LegacyImportResult>("account_import_legacy", {
    expectedEpoch,
    data,
    operationId,
  });
}

export interface AgentGatewayConfig {
  endpoint: string;
  discoveryPath: string;
  bridgePath: string;
  protocolVersion: string;
}

export async function getAgentGatewayConfig(): Promise<AgentGatewayConfig | null> {
  if (!isNativeRuntime()) return null;
  return invoke<AgentGatewayConfig>("agent_get_config");
}
