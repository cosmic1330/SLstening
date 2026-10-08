/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisTheme } from "../../theme";
import type { StockGridRowProps } from "./StockGridRow";

const mocks = vi.hoisted(() => ({ resetAfterIndex: vi.fn() }));

vi.mock("react-window", async () => {
  const React = await import("react");
  type MockListProps = {
    children: React.ElementType<StockGridRowProps>;
    itemCount: number;
    itemData: StockGridRowProps["data"];
    itemSize: (index: number) => number;
  };
  const MockList = React.forwardRef<{ resetAfterIndex: (index: number) => void }, MockListProps>((props, ref) => {
    React.useImperativeHandle(ref, () => ({ resetAfterIndex: mocks.resetAfterIndex }), []);
    const rows = Array.from({ length: props.itemCount }, (_, index) =>
      React.createElement(props.children, {
        key: index,
        index,
        style: { height: props.itemSize(index) },
        data: props.itemData,
      }),
    );
    return React.createElement("div", null, rows);
  });
  return { VariableSizeList: MockList };
});

vi.mock("../../hooks/useElementHeight", () => ({
  default: () => ({ ref: () => undefined, height: 120 }),
}));

import VirtualizedStockList from ".";

describe("VirtualizedStockList cache invalidation", () => {
  beforeEach(() => {
    mocks.resetAfterIndex.mockClear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({ matches: false, media: "", onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
  });

  it("resets row sizes when the viewport height changes", () => {
    const header = <div>Toolbar</div>;
    const { rerender } = render(
      <ThemeProvider theme={analysisTheme}>
        <VirtualizedStockList stocks={[]} height={300} header={header} />
      </ThemeProvider>,
    );
    mocks.resetAfterIndex.mockClear();
    rerender(
      <ThemeProvider theme={analysisTheme}>
        <VirtualizedStockList stocks={[]} height={420} header={header} />
      </ThemeProvider>,
    );

    expect(mocks.resetAfterIndex).toHaveBeenCalledWith(0);
    expect(mocks.resetAfterIndex).toHaveBeenCalledTimes(1);
  });
});
