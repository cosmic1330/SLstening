/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../../i18n";
import WatchlistToolbar from "./WatchlistToolbar";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const props = {
  activeName: "Default",
  stockCount: 2,
  query: "",
  onOpenPicker: vi.fn(),
  onOpenAdd: vi.fn(),
  onOpenMenu: vi.fn(),
  onQueryChange: vi.fn(),
  onClearQuery: vi.fn(),
};

describe("WatchlistToolbar overflow semantics", () => {
  it("exposes closed and open menu state to assistive technology", () => {
    const { rerender } = render(<WatchlistToolbar {...props} menuOpen={false} />);
    const button = screen.getByRole("button", { name: "More actions" });

    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("aria-controls")).toBe(false);

    rerender(<WatchlistToolbar {...props} menuOpen />);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("watchlist-overflow-menu");
  });
});
