/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";
import WatchlistToolbar from "./WatchlistToolbar";

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
});

const props = {
  activeName: "Default",
  stockCount: 2,
  query: "",
  onOpenPicker: vi.fn(),
  onOpenAdd: vi.fn(),
  onOpenManage: vi.fn(),
  onQueryChange: vi.fn(),
  onClearQuery: vi.fn(),
};

describe("WatchlistToolbar", () => {
  it("opens the category picker, add-stock flow, and category manager", () => {
    render(<WatchlistToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: i18n.t("watchlist.openCategoryPicker", { name: props.activeName }) }));
    fireEvent.click(screen.getByRole("button", { name: i18n.t("watchlist.addStock") }));
    fireEvent.click(screen.getByRole("button", { name: i18n.t("watchlist.manage") }));

    expect(props.onOpenPicker).toHaveBeenCalledOnce();
    expect(props.onOpenAdd).toHaveBeenCalledOnce();
    expect(props.onOpenManage).toHaveBeenCalledOnce();
  });

  it("forwards filter updates and clears an active query", () => {
    render(<WatchlistToolbar {...props} query="2330" />);

    fireEvent.change(screen.getByLabelText(i18n.t("watchlist.filterStocks")), { target: { value: "tsmc" } });
    fireEvent.click(screen.getByRole("button", { name: i18n.t("watchlist.clearStockFilter") }));

    expect(props.onQueryChange).toHaveBeenCalledWith("tsmc");
    expect(props.onClearQuery).toHaveBeenCalledOnce();
  });
});
