/** @vitest-environment jsdom */
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarketIndexItemLayout } from "./MarketIndexBox";

const baseProps = {
  name: "TAIEX",
  price: 20000,
  percent: 1,
  change: 200,
  mainColor: "#ff5252",
  marketSession: "open" as const,
  ariaLabel: "Open TAIEX",
  containerRef: createRef<HTMLDivElement>(),
};

describe("MarketIndexItemLayout", () => {
  it("keeps the primary action and retry as semantic siblings", () => {
    const open = vi.fn();
    const retry = vi.fn();
    render(
      <MarketIndexItemLayout
        {...baseProps}
        onClick={open}
        primaryActionEnabled
      >
        <button type="button" onClick={retry}>Retry</button>
      </MarketIndexItemLayout>,
    );

    const primary = screen.getByRole("button", { name: "Open TAIEX" });
    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(primary.contains(retryButton)).toBe(false);

    fireEvent.click(primary);
    expect(open).toHaveBeenCalledTimes(1);

    fireEvent.click(retryButton);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("does not expose a primary action when no usable data exists", () => {
    render(
      <MarketIndexItemLayout
        {...baseProps}
        onClick={vi.fn()}
        primaryActionEnabled={false}
      >
        <button type="button">Retry</button>
      </MarketIndexItemLayout>,
    );

    expect(screen.queryByRole("button", { name: "Open TAIEX" })).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("shows a closed badge before the market name only while the market is closed", () => {
    const view = render(
      <MarketIndexItemLayout
        {...baseProps}
        marketSession="closed"
        onClick={vi.fn()}
        primaryActionEnabled
      >
        <div />
      </MarketIndexItemLayout>,
    );

    const badge = screen.getByText("Closed");
    const name = screen.getByText("TAIEX");
    expect(badge.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    view.rerender(
      <MarketIndexItemLayout
        {...baseProps}
        marketSession="open"
        onClick={vi.fn()}
        primaryActionEnabled
      >
        <div />
      </MarketIndexItemLayout>,
    );
    expect(screen.queryByText("Closed")).toBeNull();
  });
});
