import { create } from "zustand";
import { getAgentGatewayConfig } from "../account/native";
import type { AgentGatewayConfig } from "../account/native";

export const MCP_ACTIVITY_WINDOW_MS = 60_000;

export type McpGatewayStatus = "unavailable" | "ready" | "active";

export interface McpGatewayState {
  config: AgentGatewayConfig | null;
  status: McpGatewayStatus;
  error: string | null;
  lastCheckedAt: number | null;
  refresh: () => Promise<void>;
}

export function deriveMcpGatewayStatus(
  config: AgentGatewayConfig | null,
  now = Date.now(),
): McpGatewayStatus {
  if (!config?.available) return "unavailable";
  const activityAt = config.lastClientActivityAt;
  if (typeof activityAt !== "number" || !Number.isFinite(activityAt) || now - activityAt > MCP_ACTIVITY_WINDOW_MS) return "ready";
  return "active";
}

const safeGatewayError = () => "MCP_STATUS_UNAVAILABLE";
let refreshInFlight: Promise<void> | null = null;

const refreshGateway = async (set: (state: Partial<McpGatewayState>) => void) => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const config = await getAgentGatewayConfig();
      set({
        config,
        status: deriveMcpGatewayStatus(config),
        error: config?.available ? null : config?.error ?? null,
        lastCheckedAt: Date.now(),
      });
    } catch {
      // Polling is background UI work. Keep failures visible as unavailable
      // without allowing an unhandled rejection to escape the timer.
      set({
        config: null,
        status: "unavailable",
        error: safeGatewayError(),
        lastCheckedAt: Date.now(),
      });
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

const useMcpGatewayStore = create<McpGatewayState>((set) => ({
  config: null,
  status: "unavailable",
  error: null,
  lastCheckedAt: null,
  refresh: () => refreshGateway(set),
}));

export default useMcpGatewayStore;
