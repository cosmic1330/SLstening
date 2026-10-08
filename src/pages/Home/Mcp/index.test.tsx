/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clipboard = vi.hoisted(() => ({ writeText: vi.fn() }));
const gateway = vi.hoisted(() => ({
  config: null as Record<string, unknown> | null,
  status: "unavailable" as "unavailable" | "ready" | "active",
}));

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ writeText: clipboard.writeText }));
vi.mock("../../../store/mcp.store", () => ({
  default: (selector: (state: typeof gateway) => unknown) => selector(gateway),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; time?: string; status?: string }) => {
      const suffix = options?.count !== undefined ? `:${options.count}` : options?.time ? `:${options.time}` : options?.status ? `:${options.status}` : "";
      return `${key}${suffix}`;
    },
  }),
}));

import McpPage, { buildCodexMcpConfig, buildGenericMcpConfig, escapeTomlBasicString } from ".";
import { MCP_TOOL_GROUPS } from "./toolCatalog";

describe("MCP setup page", () => {
  beforeEach(() => {
    clipboard.writeText.mockReset().mockResolvedValue(undefined);
    gateway.config = null;
    gateway.status = "unavailable";
  });

  it("escapes bridge paths for Codex TOML and generic JSON", () => {
    const path = "C:\\Program Files\\SL\"stening\\bridge.mjs";
    expect(escapeTomlBasicString(path)).toBe("C:\\\\Program Files\\\\SL\\\"stening\\\\bridge.mjs");
    expect(buildCodexMcpConfig(path)).toContain(`args = ["${escapeTomlBasicString(path)}"]`);
    expect(JSON.parse(buildGenericMcpConfig(path))).toEqual({
      mcpServers: { slistening: { command: "node", args: [path] } },
    });
  });

  it("shows unavailable state and disables copying outside the desktop gateway", () => {
    render(<McpPage />);
    expect(screen.getByText("mcp.status.unavailable")).toBeTruthy();
    expect(screen.getByText("mcp.desktopOnly")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "mcp.copyConfig" }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it("uses one page heading without nesting another main landmark", () => {
    render(<McpPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "mcp.status.unavailable" })).toBeTruthy();
    expect(screen.getByTestId("mcp-page").tagName).toBe("SECTION");
    expect(screen.queryByRole("main")).toBeNull();
  });

  it("renders the exact backend tool catalog in read and manage groups", () => {
    render(<McpPage />);
    const readTools = MCP_TOOL_GROUPS.find((group) => group.id === "read")?.tools;
    const manageTools = MCP_TOOL_GROUPS.find((group) => group.id === "manage")?.tools;
    const allTools = [...(readTools ?? []), ...(manageTools ?? [])];
    expect(readTools).toHaveLength(7);
    expect(manageTools).toHaveLength(9);
    expect(allTools).toEqual([
      "get_context",
      "list_watchlists",
      "get_quotes",
      "get_history",
      "get_technical_indicators",
      "get_chip_analysis",
      "get_analysis_snapshot",
      "add_stock",
      "remove_stock",
      "create_category",
      "rename_category",
      "delete_category",
      "set_category_members",
      "reorder_category",
      "update_indicator_settings",
      "reset_indicator_settings",
    ]);
    expect(screen.getByRole("heading", { level: 2, name: "mcp.tools.title" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "mcp.tools.read.title" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "mcp.tools.manage.title" })).toBeTruthy();
    for (const tool of allTools) expect(screen.getByText(tool)).toBeTruthy();
    expect(screen.getByText("mcp.tools.read.count:7")).toBeTruthy();
    expect(screen.getByText("mcp.tools.manage.count:9")).toBeTruthy();
  });

  it("hides low-value bridge implementation details while keeping client config", () => {
    gateway.config = {
      available: true,
      bridgePath: "/tmp/bridge.mjs",
      protocolVersion: "2025-06-18",
      lastClientActivityAt: null,
    };
    render(<McpPage />);
    expect(screen.queryByText("mcp.nodeRequirement")).toBeNull();
    expect(screen.queryByText(/2025-06-18/)).toBeNull();
    expect(screen.queryByText("mcp.bridgePath")).toBeNull();
    expect(screen.getByText(/mcp_servers\.slistening/)).toBeTruthy();
  });

  it("copies the generated Codex config without including a token", async () => {
    gateway.config = {
      available: true,
      bridgePath: "/tmp/bridge.mjs",
      protocolVersion: "2025-06-18",
      lastClientActivityAt: null,
    };
    gateway.status = "ready";
    render(<McpPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "mcp.copyConfig" })[0]);
    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledTimes(1));
    expect(clipboard.writeText.mock.calls[0][0]).toBe(buildCodexMcpConfig("/tmp/bridge.mjs"));
    expect(clipboard.writeText.mock.calls[0][0]).not.toContain("token");
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
