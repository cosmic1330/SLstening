import { describe, expect, it } from "vitest";
import { WATCHLIST_RADIUS } from "../../../../components/StockBox/constants";
import {
  playfulButtonSx,
  playfulDialogPaperSx,
  playfulFieldSx,
  playfulIconButtonSx,
  playfulPanelSx,
} from "./playfulStyles";

describe("Watchlist radius tokens", () => {
  it("keeps rectangular shared surfaces at the page radius", () => {
    expect(WATCHLIST_RADIUS).toBe("8px");
    expect((playfulDialogPaperSx as Record<string, unknown>).borderRadius).toBe(WATCHLIST_RADIUS);
    expect((playfulPanelSx as Record<string, unknown>).borderRadius).toBe(WATCHLIST_RADIUS);
    expect((playfulButtonSx("#fff") as Record<string, unknown>).borderRadius).toBe(WATCHLIST_RADIUS);
    expect((playfulIconButtonSx() as Record<string, unknown>).borderRadius).toBe(WATCHLIST_RADIUS);
    expect(((playfulFieldSx as Record<string, unknown>)["& .MuiOutlinedInput-root"] as Record<string, unknown>).borderRadius).toBe(WATCHLIST_RADIUS);
  });
});
