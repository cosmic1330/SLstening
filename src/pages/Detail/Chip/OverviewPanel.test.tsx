/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import i18n from "../../../i18n";
import type { ChipData } from "../../../api/marketApi";
import type { TdccHolderTableType } from "../../../types";
import OverviewPanel, { formatTdccDate, HolderStructureCard } from "./OverviewPanel";
import { compactChipMedia, compactWideChipMedia } from "./chipUi";

const chipData = {
  symbol: "2330",
  institutional: { foreign5d: 1, trust5d: 2, dealer5d: 3, total5d: 6 },
  margin: { marginBalance: 100, marginChange5d: 1, marginChangePercent5d: 1, shortMarginRatio: 2 },
  lights: {
    institutional: "buying",
    foreignHolding: "stable",
    lendingPressure: "normal",
    summary: "mixed",
    foreignRatio: 1,
    lendingChangePercent: 1,
  },
} as ChipData;

const holder = {
  stock_id: 2330,
  data_date: "2026-09-15T00:00:00Z",
  previous_date: "2026-09-08T00:00:00",
  holders_100: 1200,
  previous_holders_100: 1190,
  holders_400: 400,
  previous_holders_400: 410,
  holders_1000: 50,
  previous_holders_1000: 50,
} satisfies TdccHolderTableType;

const fontSizeInPixels = (element: Element) => {
  const value = getComputedStyle(element).fontSize;
  const parsed = Number.parseFloat(value);
  return value.endsWith("rem") ? parsed * 16 : parsed;
};

describe("TDCC holder structure", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders all three holder bands with increase, decrease, and unchanged states", () => {
    render(<HolderStructureCard holder={holder} isLoading={false} />);

    expect(screen.getByText("≤100 lots")).toBeTruthy();
    expect(screen.getByText("400 lots or more")).toBeTruthy();
    expect(screen.getByText("1,000 lots or more")).toBeTruthy();
    expect(screen.getByText("+10 people increase")).toBeTruthy();
    expect(screen.getByText("-10 people decrease")).toBeTruthy();
    expect(screen.getByText("Unchanged")).toBeTruthy();
    expect(document.querySelector('[data-testid="ArrowUpwardRoundedIcon"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="ArrowDownwardRoundedIcon"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="RemoveRoundedIcon"]')).toBeTruthy();
    expect(screen.getAllByTestId("holder-band")).toHaveLength(3);
    expect(screen.getAllByTestId("holder-current")).toHaveLength(3);
    expect(getComputedStyle(screen.getAllByTestId("holder-current")[0]).color).toBe(
      "rgb(255, 255, 255)",
    );
  });

  it("shows comparison unavailable when a previous holder count is null", () => {
    render(<HolderStructureCard holder={{ ...holder, previous_holders_400: null }} isLoading={false} />);
    expect(screen.getByText("Comparison unavailable")).toBeTruthy();
  });

  it("keeps core overview visible for TDCC loading, error, and empty states", () => {
    const view = render(<OverviewPanel data={chipData} holderLoading />);
    expect(screen.getByTestId("holder-loading")).toBeTruthy();
    expect(screen.getByText("Institutional investors")).toBeTruthy();

    view.rerender(<OverviewPanel data={chipData} holderError={new Error("offline")} />);
    expect(screen.getByTestId("holder-error")).toBeTruthy();
    expect(screen.getByText("Institutional investors")).toBeTruthy();

    view.rerender(<OverviewPanel data={chipData} holder={null} />);
    expect(screen.getByTestId("holder-empty")).toBeTruthy();
  });

  it("uses a three-column, shrinkable holder-band grid", () => {
    render(<HolderStructureCard holder={holder} isLoading={false} />);
    const bands = screen.getByTestId("holder-bands");
    expect(getComputedStyle(bands).display).toBe("grid");
    expect(getComputedStyle(bands).minWidth).toBe("0px");
  });

  it("keeps short panes compact at every width and only switches the overview grid when wide", () => {
    render(<OverviewPanel data={chipData} holder={holder} />);

    expect(compactChipMedia).toBe("@media (max-height: 620px)");
    expect(compactWideChipMedia).toBe(
      "@media (min-width: 600px) and (max-height: 620px)",
    );
    expect(screen.getByTestId("overview-lights")).toBeTruthy();
    expect(screen.getByTestId("overview-holders")).toBeTruthy();
  });

  it("keeps overview titles, labels, statuses, and values at a readable scale", () => {
    render(<OverviewPanel data={chipData} holder={holder} />);

    for (const title of screen.getAllByRole("heading")) {
      expect(fontSizeInPixels(title)).toBeGreaterThanOrEqual(13);
    }

    for (const label of [
      "Institutions",
      "Foreign holding",
      "Lending pressure",
      "Foreign",
      "Investment trust",
      "Dealer",
      "Institutional total",
      "Margin balance / lots",
      "5-day margin change",
      "Short/margin ratio",
      "≤100 lots",
      "400 lots or more",
      "1,000 lots or more",
    ]) {
      expect(fontSizeInPixels(screen.getByText(label))).toBeGreaterThanOrEqual(12);
    }

    for (const status of ["Buying", "Stable", "Normal"]) {
      expect(fontSizeInPixels(screen.getByText(status))).toBeGreaterThanOrEqual(13);
    }

    for (const value of screen.getAllByText(/^(?:\+|-)?\d+(?:\.\d+)? lots$/)) {
      expect(fontSizeInPixels(value)).toBeGreaterThanOrEqual(13);
      expect(getComputedStyle(value).fontFamily).toContain("Roboto Mono");
    }

    for (const value of screen.getAllByText(/^(?:\+|-)?\d+(?:\.\d+)?%$/)) {
      expect(fontSizeInPixels(value)).toBeGreaterThanOrEqual(13);
    }

    for (const change of [
      "+10 people increase",
      "-10 people decrease",
      "Unchanged",
    ]) {
      expect(fontSizeInPixels(screen.getByText(change))).toBeGreaterThanOrEqual(12);
    }

    expect(fontSizeInPixels(screen.getByText(/Data: .*previous:/))).toBeGreaterThanOrEqual(12);
    for (const current of screen.getAllByTestId("holder-current")) {
      expect(fontSizeInPixels(current)).toBeGreaterThanOrEqual(13);
    }
  });

  it("keeps TDCC error and empty copy readable", () => {
    const view = render(<OverviewPanel data={chipData} holderError={new Error("offline")} />);
    expect(fontSizeInPixels(screen.getByTestId("holder-error"))).toBeGreaterThanOrEqual(12);

    view.rerender(<OverviewPanel data={chipData} holder={null} />);
    expect(fontSizeInPixels(screen.getByTestId("holder-empty"))).toBeGreaterThanOrEqual(12);
  });

  it("formats TDCC timestamps as Taiwan calendar dates", () => {
    expect(formatTdccDate("2026-09-18T16:30:00Z", "en-US", "Unavailable")).toBe("09/19/2026");
    expect(formatTdccDate("2026-09-18T00:30:00", "en-US", "Unavailable")).toBe("09/18/2026");
    expect(formatTdccDate("not-a-date", "en-US", "Unavailable")).toBe("Unavailable");
  });
});
