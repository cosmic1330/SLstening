/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";

const reorderHandlers = vi.hoisted(() => ({
  onReorder: null as ((ids: string[]) => void) | null,
  onDragEnd: null as (() => void) | null,
}));

const storeState = vi.hoisted(() => ({
  categories: [
    { id: "category-tech", name: "Tech", stockIds: ["2330", "2317"] },
  ],
  menu: [
    { id: "2330", name: "TSMC", group: "Semiconductor", type: "stock" },
    { id: "2317", name: "Hon Hai", group: "Electronics", type: "stock" },
    { id: "2454", name: "MediaTek", group: "Semiconductor", type: "stock" },
  ],
  stocks: [
    { id: "2330", name: "TSMC", group: "Semiconductor", type: "stock" },
    { id: "2317", name: "Hon Hai", group: "Electronics", type: "stock" },
  ],
  addStockToCategory: vi.fn(),
  removeStockFromCategory: vi.fn(),
  updateStockOrder: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  Reorder: {
    Group: ({
      children,
      onReorder,
    }: {
      children: ReactNode;
      onReorder: (ids: string[]) => void;
    }) => {
      reorderHandlers.onReorder = onReorder;
      return <ul data-testid="reorder-group">{children}</ul>;
    },
    Item: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd?: () => void;
    }) => {
      reorderHandlers.onDragEnd = onDragEnd ?? null;
      return <li>{children}</li>;
    },
  },
  useDragControls: () => ({ start: vi.fn() }),
  useReducedMotion: () => false,
}));

vi.mock("../../../../store/Stock.store", () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

import AddStockDialog from "./AddStockDialog";

const renderDialog = () =>
  render(
    <AddStockDialog
      open
      activeCategoryId="category-tech"
      onClose={vi.fn()}
    />,
  );

const chooseStock = async (query: string, optionName: RegExp) => {
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: query } });
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.click(option);
};

describe("AddStockDialog category stock management", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    storeState.categories = [
      { id: "category-tech", name: "Tech", stockIds: ["2330", "2317"] },
    ];
    storeState.stocks = storeState.menu.filter((stock) => stock.id !== "2454");
    storeState.addStockToCategory.mockReset().mockResolvedValue(undefined);
    storeState.removeStockFromCategory.mockReset().mockResolvedValue(undefined);
    storeState.updateStockOrder.mockReset().mockResolvedValue(undefined);
    reorderHandlers.onReorder = null;
    reorderHandlers.onDragEnd = null;
  });

  it("renders the current category in stored order with the management title", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Manage category stocks" })).toBeTruthy();
    const searchHeading = screen.getByRole("heading", { name: "Search and add a stock" });
    const currentHeading = screen.getByRole("heading", { name: "Stocks in this category" });
    expect(
      searchHeading.compareDocumentPosition(currentHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const rows = within(screen.getByTestId("reorder-group")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("2330"),
      expect.stringContaining("2317"),
    ]);
  });

  it("removes a stock from the active category immediately without confirmation", async () => {
    renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Hon Hai from this category" }),
    );

    await waitFor(() =>
      expect(storeState.removeStockFromCategory).toHaveBeenCalledWith(
        "category-tech",
        "2317",
      ),
    );
    expect(screen.getByRole("heading", { name: "Manage category stocks" })).toBeTruthy();
  });

  it("adds a searched stock to the active category and keeps the dialog open", async () => {
    renderDialog();
    await chooseStock("2454", /2454.*MediaTek.*Add to this category/);

    await waitFor(() =>
      expect(storeState.addStockToCategory).toHaveBeenCalledWith(
        "category-tech",
        "2454",
      ),
    );
    expect(screen.getByRole("heading", { name: "Manage category stocks" })).toBeTruthy();
  });

  it("moves an existing searched stock to the first position without changing memberships", async () => {
    renderDialog();
    await chooseStock("2317", /2317.*Hon Hai.*Move to top/);

    await waitFor(() =>
      expect(storeState.updateStockOrder).toHaveBeenCalledWith(
        "category-tech",
        ["2317", "2330"],
      ),
    );
    expect(storeState.addStockToCategory).not.toHaveBeenCalled();
  });

  it("does not write when the searched stock is already first", async () => {
    renderDialog();
    await chooseStock("2330", /2330.*TSMC.*Move to top/);

    expect(storeState.updateStockOrder).not.toHaveBeenCalled();
    expect(storeState.addStockToCategory).not.toHaveBeenCalled();
  });

  it("persists one drag result on drag end and restores the order on failure", async () => {
    storeState.updateStockOrder.mockRejectedValueOnce(new Error("write failed"));
    renderDialog();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Reorder TSMC" }));
    act(() => reorderHandlers.onReorder?.(["2317", "2330"]));
    act(() => reorderHandlers.onDragEnd?.());

    await waitFor(() => {
      expect(storeState.updateStockOrder).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save the order. The previous order was restored.",
      );
    });
    const rows = within(screen.getByTestId("reorder-group")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("2330"),
      expect.stringContaining("2317"),
    ]);
  });
});
