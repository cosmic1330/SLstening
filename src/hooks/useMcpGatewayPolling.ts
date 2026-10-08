import { useEffect } from "react";
import useMcpGatewayStore from "../store/mcp.store";

export const MCP_GATEWAY_POLL_INTERVAL_MS = 5_000;

export function startMcpGatewayPolling() {
  const refresh = useMcpGatewayStore.getState().refresh;
  void refresh();
  const timer = window.setInterval(() => {
    void useMcpGatewayStore.getState().refresh();
  }, MCP_GATEWAY_POLL_INTERVAL_MS);
  return () => window.clearInterval(timer);
}

export default function useMcpGatewayPolling() {
  useEffect(() => startMcpGatewayPolling(), []);
}
