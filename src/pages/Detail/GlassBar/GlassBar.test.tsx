/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import { UrlTaPerdOptions } from "../../../types";

vi.mock("../Tooltip/Fundamental", () => ({
  default: () => <div>fundamental-content</div>,
}));

vi.mock("./ChartMenu", () => ({
  default: () => <button type="button">Chart menu</button>,
}));

import GlassBar, { chartDetailsTooltipSx } from "./index";

const renderGlassBar = (onOpenDoc = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={["/detail/2330"]}>
      <Routes>
        <Route
          path="/detail/:id"
          element={
            <GlassBar
              perd={UrlTaPerdOptions.Day}
              setPerd={vi.fn()}
              current={0}
              goToSlide={vi.fn()}
              onOpenDoc={onOpenDoc}
              currentId="bollean"
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("GlassBar chart details tooltip", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("keeps the chart details button click behavior and uses viewport-safe tooltip styles", async () => {
    const onOpenDoc = vi.fn();
    renderGlassBar(onOpenDoc);
    const details = screen.getByRole("button", { name: "Chart details; click for full guide" });

    fireEvent.click(details);
    expect(onOpenDoc).toHaveBeenCalledTimes(1);

    fireEvent.mouseOver(details);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain("fundamental-content");
  });

  it("uses a viewport-safe, non-scrolling local tooltip layout", () => {
    expect(chartDetailsTooltipSx.width).toBe("min(520px, calc(100vw - 16px))");
    expect(chartDetailsTooltipSx.maxWidth).toBe("min(520px, calc(100vw - 16px))");
    expect(chartDetailsTooltipSx.overflow).toBe("visible");
    expect("maxHeight" in chartDetailsTooltipSx).toBe(false);
    expect("overflowY" in chartDetailsTooltipSx).toBe(false);
  });
});
