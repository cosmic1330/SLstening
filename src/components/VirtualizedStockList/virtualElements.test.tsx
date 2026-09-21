/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VirtualInnerElement, VirtualScrollContext } from "./virtualElements";

describe("VirtualInnerElement", () => {
  it("mounts the header through the supplied measurement ref", () => {
    const headerRef = vi.fn();
    const innerRef = vi.fn();
    render(
      <VirtualScrollContext.Provider value={{ header: <div>Toolbar header</div>, headerRef }}>
        <VirtualInnerElement ref={innerRef} style={{ height: 120 }}>
          <div>Virtual row</div>
        </VirtualInnerElement>
      </VirtualScrollContext.Provider>,
    );

    expect(screen.getByText("Toolbar header")).toBeTruthy();
    expect(screen.getByText("Virtual row")).toBeTruthy();
    expect(headerRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    expect(innerRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });
});
