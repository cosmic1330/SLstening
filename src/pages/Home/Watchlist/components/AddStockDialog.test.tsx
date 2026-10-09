/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";

const reorderHandlers = vi.hoisted(() => ({
  onReorder: null as ((ids: string[]) => void) | null,
  onDragEnd: null as (() => void) | null,
}));

const motionState = vi.hoisted(() => ({ reduced: false }));
const downloadState = vi.hoisted(() => ({
  disable: false,
  handleDownloadMenu: vi.fn(),
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
  useReducedMotion: () => motionState.reduced,
}));

vi.mock("../../../../store/Stock.store", () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));
vi.mock("../../../../hooks/useDownloadStocks", () => ({
  default: () => downloadState,
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
    storeState.menu = [
      { id: "2330", name: "TSMC", group: "Semiconductor", type: "stock" },
      { id: "2317", name: "Hon Hai", group: "Electronics", type: "stock" },
      { id: "2454", name: "MediaTek", group: "Semiconductor", type: "stock" },
    ];
    storeState.stocks = storeState.menu.filter((stock) => stock.id !== "2454");
    storeState.addStockToCategory.mockReset().mockResolvedValue(undefined);
    storeState.removeStockFromCategory.mockReset().mockResolvedValue(undefined);
    storeState.updateStockOrder.mockReset().mockResolvedValue(undefined);
    reorderHandlers.onReorder = null;
    reorderHandlers.onDragEnd = null;
    motionState.reduced = false;
    downloadState.disable = false;
    downloadState.handleDownloadMenu.mockReset().mockResolvedValue(undefined);
  });

  it("renders the current category in stored order with the management title", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Manage category stocks" })).toBeTruthy();
    const searchHeading = screen.getByRole("heading", { name: "Add stocks to this category" });
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

  it("keeps the auto-focused catalog closed until the user searches", async () => {
    renderDialog();

    const search = screen.getByRole("combobox");
    await waitFor(() => expect(document.activeElement).toBe(search));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("option")).toBeNull();

    fireEvent.change(search, { target: { value: "2" } });
    expect(await screen.findByRole("option", { name: /2330.*TSMC.*Move to top/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /2454.*MediaTek.*Add to this category/ })).toBeTruthy();
  });

  it("reveals a long catalog monotonically, while a new query resets its page size", async () => {
    storeState.menu = Array.from({ length: 250 }, (_, index) => ({
      id: `CAT${String(index + 1).padStart(3, "0")}`,
      name: `Long catalog ${index + 1}`,
      group: "Test",
      type: "stock",
    }));
    storeState.stocks = [];
    renderDialog();

    const search = screen.getByRole("combobox");
    await waitFor(() => expect(document.activeElement).toBe(search));
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const listbox = await screen.findByRole("listbox");
    const optionCount = () => listbox.querySelectorAll('[role="option"]').length;
    expect(optionCount()).toBe(100);

    const scrollToListboxBottom = () => {
      Object.defineProperties(listbox, {
        clientHeight: { configurable: true, value: 400 },
        scrollHeight: { configurable: true, value: 800 },
        scrollTop: { configurable: true, value: 400, writable: true },
      });
      fireEvent.scroll(listbox);
    };

    scrollToListboxBottom();
    await waitFor(() => expect(optionCount()).toBe(200));

    scrollToListboxBottom();
    await waitFor(() => expect(optionCount()).toBe(250));

    // MUI can emit a non-user `reset` input event while keyboard navigation
    // updates the highlighted option. That event must not collapse a list the
    // user has already progressively revealed.
    fireEvent.keyDown(search, { key: "End" });
    scrollToListboxBottom();
    await waitFor(() => expect(optionCount()).toBe(250));

    fireEvent.change(search, { target: { value: "CAT" } });
    await waitFor(() => expect(optionCount()).toBe(100));
  });

  it("searches a stock beyond the initial catalog page directly", async () => {
    storeState.menu = Array.from({ length: 250 }, (_, index) => ({
      id: `CAT${String(index + 1).padStart(3, "0")}`,
      name: `Long catalog ${index + 1}`,
      group: "Test",
      type: "stock",
    }));
    storeState.stocks = [];
    renderDialog();

    const search = screen.getByRole("combobox");
    fireEvent.change(search, { target: { value: "CAT150" } });
    expect(await screen.findByRole("option", { name: /CAT150.*Long catalog 150.*Add to this category/ })).toBeTruthy();
  });

  it("guides the user to update an empty catalog without hiding category management", () => {
    storeState.menu = [];
    renderDialog();

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Update the stock list first")).toBeTruthy();
    expect(screen.getByText("This device has no reference stock list yet. Update it to search and add stocks.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Stocks in this category" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Update stock list" }));
    expect(downloadState.handleDownloadMenu).toHaveBeenCalledTimes(1);
  });

  it("shows download progress as a disabled, busy update control", () => {
    storeState.menu = [];
    downloadState.disable = true;
    renderDialog();

    const update = screen.getByRole("button", { name: "Updating" });
    expect((update as HTMLButtonElement).disabled).toBe(true);
    expect(update.getAttribute("aria-busy")).toBe("true");
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

  it("uses accessible move controls when reduced motion is enabled", async () => {
    motionState.reduced = true;
    renderDialog();

    expect(screen.queryByRole("button", { name: "Reorder TSMC" })).toBeNull();
    expect((screen.getByRole("button", { name: "Move TSMC up" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Move Hon Hai up" }));

    await waitFor(() =>
      expect(storeState.updateStockOrder).toHaveBeenCalledWith(
        "category-tech",
        ["2317", "2330"],
      ),
    );
  });
});
