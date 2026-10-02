/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";

const storeState = vi.hoisted(() => ({
  categories: [
    { id: "default-watchlist", name: "", stockIds: ["2330"], isDefault: true },
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
}));

vi.mock("framer-motion", () => ({
  Reorder: {
    Group: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
    Item: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  },
  useReducedMotion: () => false,
}));

vi.mock("../../../../store/Stock.store", () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
  isDefaultCategory: (category: { id: string; isDefault?: boolean }) => category.id === "default-watchlist" || category.isDefault === true,
}));

import CategoryManageDialog from "./CategoryManageDialog";

const renderDialog = () => render(<CategoryManageDialog open onClose={vi.fn()} />);

describe("CategoryManageDialog", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    storeState.pinnedCategoryIds = [];
    storeState.addCategory.mockReset().mockResolvedValue(undefined);
    storeState.renameCategory.mockReset().mockResolvedValue(undefined);
    storeState.removeCategory.mockReset().mockResolvedValue(undefined);
    storeState.togglePinnedCategory.mockReset().mockResolvedValue(undefined);
    storeState.reorderPinnedCategories.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the manager heading, locked default list, and category actions", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Manage categories" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Watchlist" })).toBeTruthy();
    expect(screen.getByText("The default watchlist cannot be renamed or deleted.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New category" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pin Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rename Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete Alpha" })).toBeTruthy();
  });

  it("adds a category through the sticker editor", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Category name" }), { target: { value: "Momentum" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(storeState.addCategory).toHaveBeenCalledWith("Momentum"));
  });

  it("renames a category through the sticker editor", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Rename Alpha" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Category name" }), { target: { value: "Alpha Prime" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(storeState.renameCategory).toHaveBeenCalledWith("category-alpha", "Alpha Prime"));
  });

  it("keeps pin changes in the draft until Apply order", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Pin Alpha" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Apply order" }) as HTMLButtonElement).disabled).toBe(false));
    expect(storeState.reorderPinnedCategories).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply order" }));
    await waitFor(() => expect(storeState.reorderPinnedCategories).toHaveBeenCalledWith(["category-alpha"]));
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
