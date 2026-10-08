/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ status: "ready" as const }));
vi.mock("../../../hooks/useMcpGatewayPolling", () => ({ default: vi.fn() }));
vi.mock("../../../store/mcp.store", () => ({
  default: (selector: (state: typeof gateway) => unknown) => selector(gateway),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { status?: string }) => options?.status ? `${key}:${options.status}` : key,
  }),
}));

import BottomBar from "./BottomBar";

function RouteProbe() {
  const location = useLocation();
  return <div data-testid="route">route:{location.pathname}</div>;
}

describe("BottomBar MCP destination", () => {
  beforeEach(() => { gateway.status = "ready"; });

  it("shows a fourth accessible destination with status text and navigates to MCP", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="*" element={<><BottomBar /><RouteProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: "navigation.mcpWithStatus:mcp.status.ready" });
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(button.getAttribute("title")).toBe("navigation.mcpWithStatus:mcp.status.ready");
    expect(screen.getByText("navigation.mcp")).toBeTruthy();

    fireEvent.click(button);
    expect(screen.getByTestId("route").textContent).toBe("route:/dashboard/mcp");
  });
});
