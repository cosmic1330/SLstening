/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";
import WatchlistEmptyState from "./WatchlistEmptyState";

const onAdd = vi.fn();
const onCreateCategory = vi.fn();

const renderState = (props: Partial<ComponentProps<typeof WatchlistEmptyState>> = {}) => render(
  <WatchlistEmptyState
    empty
    noMatches={false}
    hasCategory={false}
    onAdd={onAdd}
    onCreateCategory={onCreateCategory}
    {...props}
  />,
);

describe("WatchlistEmptyState", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    onAdd.mockReset();
    onCreateCategory.mockReset();
  });

  afterEach(cleanup);

  it("shows the category mascot, localized copy, and create action when no categories exist", () => {
    const { container } = renderState();

    expect(screen.getByRole("heading", { name: i18n.t("watchlist.emptyNoCategoriesTitle") })).toBeTruthy();
    expect(screen.getByText(i18n.t("watchlist.emptyNoCategoriesDescription"))).toBeTruthy();
    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toBe("/watchlist-empty-categories.png");
    expect(image?.getAttribute("alt")).toBe("");
    expect(image?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: i18n.t("watchlist.createCategory") }));
    expect(onCreateCategory).toHaveBeenCalledOnce();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows the stock mascot, localized copy, and add action for an empty category", () => {
    const { container } = renderState({ hasCategory: true });

    expect(screen.getByRole("heading", { name: i18n.t("watchlist.emptyNoStocksTitle") })).toBeTruthy();
    expect(screen.getByText(i18n.t("watchlist.emptyNoStocksDescription"))).toBeTruthy();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/watchlist-empty-stocks.png");

    fireEvent.click(screen.getByRole("button", { name: i18n.t("watchlist.addStock") }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onCreateCategory).not.toHaveBeenCalled();
  });

  it("keeps a filter no-results state lightweight without a mascot or action", () => {
    const { container } = renderState({ empty: false, noMatches: true, hasCategory: true });

    expect(screen.getByRole("status").textContent).toContain(i18n.t("watchlist.noStockMatches"));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing when the current category has stocks and no active filter", () => {
    const { container } = renderState({ empty: false, noMatches: false, hasCategory: true });

    expect(container.innerHTML).toBe("");
  });
});
