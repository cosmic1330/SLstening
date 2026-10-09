/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";
import type { CategoryType } from "../../../../types";

const storeState = vi.hoisted(() => ({
  categories: [
    { id: "category-alpha", name: "Alpha", stockIds: ["2317"] },
    { id: "category-beta", name: "Beta", stockIds: ["2454"] },
  ],
  stocks: [
    { id: "2330", name: "TSMC", group: "Semiconductor", type: "stock" },
    { id: "2317", name: "Hon Hai", group: "Electronics", type: "stock" },
    { id: "2454", name: "MediaTek", group: "Semiconductor", type: "stock" },
  ],
  pinnedCategoryIds: [] as string[],
  addCategory: vi.fn(),
  renameCategory: vi.fn(),
  removeCategory: vi.fn(),
  togglePinnedCategory: vi.fn(),
  reorderPinnedCategories: vi.fn(),
  updateCategories: vi.fn(),
}));

const reorderHandlers = vi.hoisted(() => ({
  handlers: [] as Array<(ids: string[]) => void>,
}));
const motionState = vi.hoisted(() => ({ reduced: false }));

vi.mock("framer-motion", () => ({
  Reorder: {
    Group: ({ children, onReorder }: { children: ReactNode; onReorder: (ids: string[]) => void }) => {
      reorderHandlers.handlers.push(onReorder);
      return <ul>{children}</ul>;
    },
    Item: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  },
  useDragControls: () => ({ start: vi.fn() }),
  useReducedMotion: () => motionState.reduced,
}));

vi.mock("../../../../store/Stock.store", () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

import CategoryManageDialog from "./CategoryManageDialog";

const renderDialog = () => render(<CategoryManageDialog open onClose={vi.fn()} />);

describe("CategoryManageDialog", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    storeState.categories = [
      { id: "category-alpha", name: "Alpha", stockIds: ["2317"] },
      { id: "category-beta", name: "Beta", stockIds: ["2454"] },
    ];
    storeState.pinnedCategoryIds = [];
    storeState.addCategory.mockReset().mockResolvedValue(undefined);
    storeState.renameCategory.mockReset().mockResolvedValue(undefined);
    storeState.removeCategory.mockReset().mockResolvedValue(undefined);
    storeState.togglePinnedCategory.mockReset().mockResolvedValue(undefined);
    storeState.reorderPinnedCategories.mockReset().mockResolvedValue(undefined);
    storeState.updateCategories.mockReset().mockResolvedValue(undefined);
    reorderHandlers.handlers = [];
    motionState.reduced = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the manager heading and actions for every real category", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Manage categories" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Categories" })).toBeTruthy();
    expect(screen.queryByText(/default watchlist/i)).toBeNull();
    expect(screen.getByRole("button", { name: "New category" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pin Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rename Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reorder Alpha" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Move Alpha up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move Alpha down" })).toBeNull();
  });

  it("adds a category through the sticker editor", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Category name" }), { target: { value: "Momentum" } });
    fireEvent.click(within(screen.getByRole("textbox", { name: "Category name" }).closest("form") as HTMLElement).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(storeState.addCategory).toHaveBeenCalledWith("Momentum"));
  });

  it("renames a category through the sticker editor", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Rename Alpha" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Category name" }), { target: { value: "Alpha Prime" } });
    fireEvent.click(within(screen.getByRole("textbox", { name: "Category name" }).closest("form") as HTMLElement).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(storeState.renameCategory).toHaveBeenCalledWith("category-alpha", "Alpha Prime"));
  });

  it("keeps pin changes in the draft until Save", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Pin Alpha" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false));
    expect(storeState.reorderPinnedCategories).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(storeState.reorderPinnedCategories).toHaveBeenCalledWith(["category-alpha"]));
  });

  it("does not reverse a pin when the store publishes before its mutation resolves", async () => {
    let resolveToggle: (() => void) | undefined;
    storeState.togglePinnedCategory.mockImplementation(
      () => new Promise<void>((resolve) => { resolveToggle = resolve; }),
    );
    const view = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Pin Alpha" }));
    await waitFor(() => expect(resolveToggle).toBeTypeOf("function"));

    // The real store publishes its local pin change before persistence resolves.
    storeState.pinnedCategoryIds = ["category-alpha"];
    view.rerender(<CategoryManageDialog open onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Unpin Alpha" })).toBeTruthy());

    await act(async () => { resolveToggle?.(); });

    expect(screen.getByRole("button", { name: "Unpin Alpha" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("persists a normal-motion handle keyboard reorder only after Save", async () => {
    renderDialog();

    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Alpha" }), { key: "ArrowDown" });

    expect(storeState.updateCategories).not.toHaveBeenCalled();
    expect(save.disabled).toBe(false);

    fireEvent.click(save);
    await waitFor(() => expect(storeState.updateCategories).toHaveBeenCalledTimes(1));
    expect(storeState.updateCategories.mock.calls[0][0].map((category: CategoryType) => category.id)).toEqual([
      "category-beta",
      "category-alpha",
    ]);
    expect(storeState.updateCategories.mock.calls[0][0]).toEqual([
      { id: "category-beta", name: "Beta", stockIds: ["2454"] },
      { id: "category-alpha", name: "Alpha", stockIds: ["2317"] },
    ]);
    await waitFor(() => expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true));
  });

  it("uses keyboard-accessible category arrows only when reduced motion is enabled", () => {
    motionState.reduced = true;
    renderDialog();

    expect(screen.queryByRole("button", { name: "Reorder Alpha" })).toBeNull();
    expect((screen.getByRole("button", { name: "Move Alpha up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move Beta down" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move Alpha down" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Move Beta up" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps an unsaved category order while reconciling a category added by the store", async () => {
    const view = renderDialog();
    act(() => reorderHandlers.handlers[reorderHandlers.handlers.length - 1]?.(["category-beta", "category-alpha"]));

    storeState.categories = [
      ...storeState.categories,
      { id: "category-gamma", name: "Gamma", stockIds: [] },
    ];
    view.rerender(<CategoryManageDialog open onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Gamma")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(storeState.updateCategories).toHaveBeenCalledTimes(1));
    expect(storeState.updateCategories.mock.calls[0][0].map((category: CategoryType) => category.id)).toEqual([
      "category-beta",
      "category-alpha",
      "category-gamma",
    ]);
  });

  it("uses drag handles without arrow controls for pinned categories by default", () => {
    storeState.pinnedCategoryIds = ["category-alpha", "category-beta"];
    renderDialog();

    const pinnedSection = screen.getByRole("heading", { name: "Pinned category order" }).closest("section") as HTMLElement;
    expect(within(pinnedSection).getByRole("button", { name: "Reorder Alpha" })).toBeTruthy();
    expect(within(pinnedSection).queryByRole("button", { name: "Move Alpha up" })).toBeNull();
    expect(within(pinnedSection).queryByRole("button", { name: "Move Alpha down" })).toBeNull();
  });

  it("saves a pinned-order-only change without rewriting categories", async () => {
    storeState.pinnedCategoryIds = ["category-alpha", "category-beta"];
    renderDialog();

    const pinnedSection = screen.getByRole("heading", { name: "Pinned category order" }).closest("section") as HTMLElement;
    fireEvent.keyDown(within(pinnedSection).getByRole("button", { name: "Reorder Alpha" }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(storeState.reorderPinnedCategories).toHaveBeenCalledWith([
      "category-beta",
      "category-alpha",
    ]));
    expect(storeState.updateCategories).not.toHaveBeenCalled();
  });

  it("retains the category draft and shows the existing save error when persistence fails", async () => {
    storeState.updateCategories.mockRejectedValueOnce(new Error("write failed"));
    renderDialog();

    act(() => reorderHandlers.handlers[reorderHandlers.handlers.length - 1]?.(["category-beta", "category-alpha"]));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Changes could not be saved. Try again.");
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows orphan stock count before removing a category", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete Beta" }));
    expect(screen.getByRole("heading", { name: "Delete Beta?" })).toBeTruthy();
    expect(screen.getByText(/This removes the category.*1 stocks used only here/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete category" }));
    await waitFor(() => expect(storeState.removeCategory).toHaveBeenCalledWith("category-beta"));
  });
});
