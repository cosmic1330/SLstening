/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisTheme } from "../../theme";

const mocks = vi.hoisted(() => ({ resetAfterIndex: vi.fn() }));

vi.mock("react-window", async () => {
  const React = await import("react");
  const MockList = React.forwardRef<{ resetAfterIndex: (index: number) => void }, { children?: React.ReactNode }>((props, ref) => {
    React.useImperativeHandle(ref, () => ({ resetAfterIndex: mocks.resetAfterIndex }), []);
    return React.createElement("div", null, props.children);
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
    const { rerender } = render(
      <ThemeProvider theme={analysisTheme}>
        <VirtualizedStockList stocks={[]} height={300} header={<div>Toolbar</div>} />
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider theme={analysisTheme}>
        <VirtualizedStockList stocks={[]} height={420} header={<div>Toolbar</div>} />
      </ThemeProvider>,
    );

    expect(mocks.resetAfterIndex).toHaveBeenCalledWith(0);
    expect(mocks.resetAfterIndex.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
