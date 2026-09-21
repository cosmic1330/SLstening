/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StockCardHeader from "./StockCardHeader";

describe("StockCardHeader", () => {
  it("shows the price unit and signed market direction", () => {
    render(
      <StockCardHeader
        id="2330"
        type="上市"
        name="台積電"
        lastPrice={123.45}
        percent={1.25}
        priceColor="currentColor"
        priceUnit="TWD"
        actions={null}
      />,
    );

    expect(screen.getByText("123.45", { exact: false })).toBeTruthy();
    expect(screen.getByText("TWD")).toBeTruthy();
    expect(screen.getByText("+1.25%")).toBeTruthy();
  });
});
