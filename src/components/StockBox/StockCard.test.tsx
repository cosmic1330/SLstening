/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StockCard from "./StockCard";

const renderCard = (isReady: boolean, onOpen = vi.fn(), onRetry = vi.fn()) => {
  render(
    <StockCard
      ariaLabel="Open stock 2330"
      cardGlow="none"
      isReady={isReady}
      onOpen={onOpen}
      footer={<button type="button" onClick={onRetry}>Retry</button>}
    >
      <span>Stock content</span>
    </StockCard>,
  );
  return { onOpen, onRetry };
};

describe("StockCard primary action", () => {
  it("disables the full-card action until data is ready", () => {
    const { onOpen } = renderCard(false);
    const primary = screen.getByRole("button", { name: "Open stock 2330" });

    expect((primary as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(primary);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("keeps footer retry as a sibling action", () => {
    const { onOpen, onRetry } = renderCard(true);
    const primary = screen.getByRole("button", { name: "Open stock 2330" });
    const retry = screen.getByRole("button", { name: "Retry" });

    expect(primary.parentElement).toBe(retry.parentElement);
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(primary);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
