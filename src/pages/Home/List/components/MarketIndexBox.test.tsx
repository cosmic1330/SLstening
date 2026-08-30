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
});
