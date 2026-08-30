/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import type { MarketResourceState } from "../../utils/marketResourceState";
import MarketDataStatus from ".";

let reducedMotion = false;

beforeEach(async () => {
  reducedMotion = false;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: reducedMotion,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  await i18n.changeLanguage("en");
});

const state = (overrides: Partial<MarketResourceState>): MarketResourceState => ({
  phase: "ready",
  freshness: "fresh",
  isRefreshing: false,
  marketSession: "open",
  ...overrides,
});

describe("MarketDataStatus", () => {
  it("keeps concurrent stale, refreshing, closed, and timestamp feedback visible", () => {
    const retry = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <MarketDataStatus
          state={state({
            freshness: "stale",
            isRefreshing: true,
            marketSession: "closed",
            error: new Error("offline"),
            updatedAt: new Date("2024-01-01T01:02:00Z").getTime(),
          })}
          retry={retry}
          compact
          overlay
        />
      </div>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Refreshing…")).toBeTruthy();
    expect(screen.getByText("Update failed. Showing the last available data.")).toBeTruthy();
    expect(screen.getByText("Market closed")).toBeTruthy();
    expect(screen.getByText(/Updated/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("distinguishes successful empty data from a request error", () => {
    const view = render(<MarketDataStatus state={state({ phase: "empty", freshness: "unknown" })} retry={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("No market data is available.");

    view.rerender(<MarketDataStatus state={state({ phase: "error", freshness: "unknown", error: new Error("offline") })} retry={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("Market data could not be updated.");
  });

  it("formats the last-updated time with the active locale", () => {
    const formatTime = vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("09:02 AM");

    render(<MarketDataStatus state={state({ freshness: "stale", updatedAt: new Date("2024-01-01T01:02:00Z").getTime() })} />);

    expect(formatTime).toHaveBeenCalledWith("en", { hour: "2-digit", minute: "2-digit" });
    expect(screen.getByText("Updated 09:02 AM")).toBeTruthy();
    formatTime.mockRestore();
  });

  it("uses a static loading icon when reduced motion is requested", () => {
    reducedMotion = true;
    render(<MarketDataStatus state={state({ phase: "loading", freshness: "unknown" })} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByLabelText("Loading market data…")).toBeTruthy();
  });
});
