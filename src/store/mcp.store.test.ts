import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ getAgentGatewayConfig: vi.fn() }));
vi.mock("../account/native", () => ({ getAgentGatewayConfig: native.getAgentGatewayConfig }));

import useMcpGatewayStore, { deriveMcpGatewayStatus, MCP_ACTIVITY_WINDOW_MS } from "./mcp.store";

const availableConfig = (lastClientActivityAt: number | null) => ({
  available: true,
  endpoint: "http://127.0.0.1:1234/mcp",
  discoveryPath: "/tmp/slstening-agent.json",
  bridgePath: "/tmp/slstening-agent-bridge.mjs",
  protocolVersion: "2025-06-18",
  error: null,
  lastClientActivityAt,
});

describe("MCP gateway status", () => {
  beforeEach(() => {
    native.getAgentGatewayConfig.mockReset();
    useMcpGatewayStore.setState({ config: null, status: "unavailable", error: null, lastCheckedAt: null });
  });

  it("uses unavailable, ready, and active states at the 60-second boundary", () => {
    const now = 1_000_000;
    expect(deriveMcpGatewayStatus(null, now)).toBe("unavailable");
    expect(deriveMcpGatewayStatus({ ...availableConfig(null) }, now)).toBe("ready");
    expect(deriveMcpGatewayStatus({ ...availableConfig(now - MCP_ACTIVITY_WINDOW_MS) }, now)).toBe("active");
    expect(deriveMcpGatewayStatus({ ...availableConfig(now - MCP_ACTIVITY_WINDOW_MS - 1) }, now)).toBe("ready");
  });

  it("refreshes a successful config without exposing a token", async () => {
    const activityAt = Date.now();
    native.getAgentGatewayConfig.mockResolvedValue(availableConfig(activityAt));
    await useMcpGatewayStore.getState().refresh();
    const state = useMcpGatewayStore.getState();
    expect(state.status).toBe("active");
    expect(state.config?.lastClientActivityAt).toBe(activityAt);
    expect(JSON.stringify(state.config)).not.toContain("token");
  });

  it("turns polling errors into a settled unavailable state", async () => {
    native.getAgentGatewayConfig.mockRejectedValue(new Error("transport failed"));
    await expect(useMcpGatewayStore.getState().refresh()).resolves.toBeUndefined();
    expect(useMcpGatewayStore.getState().status).toBe("unavailable");
    expect(useMcpGatewayStore.getState().error).toBe("MCP_STATUS_UNAVAILABLE");
  });
});
