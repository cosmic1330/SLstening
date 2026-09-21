/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import StockActionsMenu from "./StockActionsMenu";

vi.mock("@tauri-apps/plugin-shell", () => ({ open: vi.fn() }));

const stock = { id: "2330", name: "TSMC", group: "Semiconductor", type: "上市" };

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("StockActionsMenu", () => {
  it("shows remove without delete when deletion is disabled", () => {
    const onRemove = vi.fn();
    render(<StockActionsMenu stock={stock} name="TSMC" canDelete={false} onRemove={onRemove} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));

    expect(screen.getByRole("menuitem", { name: /Remove/ })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /Delete/ })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: /Remove/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows and invokes delete when enabled", () => {
    const onDelete = vi.fn();
    render(<StockActionsMenu stock={stock} name="TSMC" canDelete onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));

    const deleteItem = screen.getByRole("menuitem", { name: /Delete/ });
    expect(deleteItem).toBeTruthy();
    fireEvent.click(deleteItem);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
