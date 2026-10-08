/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";

const storeState = vi.hoisted(() => ({
  categories: [
    { id: "category-alpha", name: "Alpha", stockIds: [] },
    { id: "category-beta", name: "Beta", stockIds: [] },
  ],
  activeCategoryId: "category-alpha",
  pinnedCategoryIds: [] as string[],
  recentCategoryIds: [] as string[],
  setActiveCategory: vi.fn(),
}));

vi.mock("../../../../store/Stock.store", () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

import CategoryPickerDialog from "./CategoryPickerDialog";

describe("CategoryPickerDialog", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    storeState.activeCategoryId = "category-alpha";
    storeState.setActiveCategory.mockReset().mockResolvedValue(undefined);
  });

  it("closes immediately while the category persistence is pending", () => {
    storeState.activeCategoryId = "category-beta";
    let resolveSelection!: () => void;
    storeState.setActiveCategory.mockReturnValueOnce(new Promise<void>((resolve) => { resolveSelection = resolve; }));
    const onClose = vi.fn();

    render(<CategoryPickerDialog open onClose={onClose} onManage={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(storeState.setActiveCategory).toHaveBeenCalledWith("category-alpha");
    const betaButton = screen.getByRole("button", { name: /Beta/ });
    expect(betaButton.getAttribute("aria-disabled")).not.toBe("true");
    expect(betaButton.hasAttribute("disabled")).toBe(false);
    resolveSelection();
  });

  it("closes without writing when the current category is selected", () => {
    const onClose = vi.fn();

    render(<CategoryPickerDialog open onClose={onClose} onManage={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(storeState.setActiveCategory).not.toHaveBeenCalled();
  });
});
