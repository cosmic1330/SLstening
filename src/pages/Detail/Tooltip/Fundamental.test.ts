/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";

type QueryResult = { data: unknown; error: unknown };

const supabaseState = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; column: string; value: unknown }>,
  results: {} as Record<string, QueryResult>,
  from: vi.fn(),
}));

vi.mock("../../../supabase", () => ({
  supabase: { from: supabaseState.from },
}));

import Fundamental, { getTdccHolderChange, isTdccStockId } from "./Fundamental";

const noData = { data: null, error: null };
const financialData = {
  stock_id: "2330",
  pe: 20,
  pb: null,
  dividend_yield: null,
  book_value_per_share: null,
};
const tdccData = {
  stock_id: 2330,
  data_date: "2026-09-01T00:00:00Z",
  previous_date: "2026-08-25T00:00:00",
  holders_400: 1200,
  previous_holders_400: 1180,
  holders_1000: 80,
  previous_holders_1000: 100,
};

const configureSupabase = (results: Record<string, QueryResult>) => {
  supabaseState.calls.length = 0;
  supabaseState.results = results;
  supabaseState.from.mockClear();
  supabaseState.from.mockImplementation((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn((column: string, value: unknown) => {
        supabaseState.calls.push({ table, column, value });
        return {
          single: vi.fn(async () => supabaseState.results[table] ?? noData),
          maybeSingle: vi.fn(async () => supabaseState.results[table] ?? noData),
        };
      }),
    })),
  }));
};

const renderFundamental = (id = "2330") =>
  render(createElement(Fundamental, { id }));

beforeEach(async () => {
  await i18n.changeLanguage("en");
  configureSupabase({
    financial_metric: noData,
    recent_fundamental: noData,
    tdcc_holder: noData,
  });
});

afterEach(() => {
  supabaseState.from.mockReset();
  vi.restoreAllMocks();
});

describe("TDCC holder changes", () => {
  it("classifies increases, decreases, and unchanged counts", () => {
    expect(getTdccHolderChange(120, 100)).toEqual({ delta: 20, direction: "increase" });
    expect(getTdccHolderChange(80, 100)).toEqual({ delta: -20, direction: "decrease" });
    expect(getTdccHolderChange(100, 100)).toEqual({ delta: 0, direction: "unchanged" });
  });

  it("marks null comparison inputs as unavailable", () => {
    expect(getTdccHolderChange(null, 100)).toEqual({ delta: null, direction: "unavailable" });
    expect(getTdccHolderChange(100, null)).toEqual({ delta: null, direction: "unavailable" });
  });

  it("only allows safe, purely numeric TDCC stock ids", () => {
    expect(isTdccStockId("2330")).toBe(true);
    expect(isTdccStockId("0050")).toBe(true);
    expect(isTdccStockId("AAPL")).toBe(false);
    expect(isTdccStockId("2330.TW")).toBe(false);
    expect(isTdccStockId("9007199254740992")).toBe(false);
  });

  it("renders localized TDCC counts, directional text, and icons", async () => {
    configureSupabase({ financial_metric: noData, recent_fundamental: noData, tdcc_holder: { data: tdccData, error: null } });
    renderFundamental();

    expect(await screen.findByText("Large-holder headcount change")).toBeTruthy();
    expect(screen.getByText("400 lots or more")).toBeTruthy();
    expect(screen.getByText("Current 1,200 people")).toBeTruthy();
    expect(screen.getByText("+20 people increase")).toBeTruthy();
    expect(screen.getByText("1,000 lots or more")).toBeTruthy();
    expect(screen.getByText("Current 80 people")).toBeTruthy();
    expect(screen.getByText("-20 people decrease")).toBeTruthy();
    expect(document.querySelector('[data-testid="ArrowUpwardRoundedIcon"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="ArrowDownwardRoundedIcon"]')).toBeTruthy();
    expect(supabaseState.calls).toContainEqual({ table: "tdcc_holder", column: "stock_id", value: 2330 });
  });

  it("renders unchanged and unavailable TDCC comparisons with neutral icons", async () => {
    configureSupabase({
      financial_metric: noData,
      recent_fundamental: noData,
      tdcc_holder: { data: { ...tdccData, holders_400: 100, previous_holders_400: 100, holders_1000: null, previous_holders_1000: 90 }, error: null },
    });
    renderFundamental();

    expect(await screen.findByText("Unchanged")).toBeTruthy();
    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(screen.getByText("Comparison unavailable")).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="RemoveRoundedIcon"]')).toHaveLength(2);
  });

  it("uses a numeric TDCC query but skips TDCC for nonnumeric ids", async () => {
    configureSupabase({ financial_metric: { data: financialData, error: null }, recent_fundamental: noData, tdcc_holder: noData });
    const view = renderFundamental("AAPL");

    expect(await screen.findByText("Valuation")).toBeTruthy();
    expect(supabaseState.from).toHaveBeenCalledTimes(2);
    expect(supabaseState.calls).not.toContainEqual(expect.objectContaining({ table: "tdcc_holder" }));

    view.unmount();
    configureSupabase({ financial_metric: { data: financialData, error: null }, recent_fundamental: noData, tdcc_holder: noData });
    renderFundamental("2330");
    await screen.findByText("Valuation");
    expect(supabaseState.from).toHaveBeenCalledTimes(3);
    expect(supabaseState.calls).toContainEqual({ table: "tdcc_holder", column: "stock_id", value: 2330 });
  });

  it("keeps successful financial data visible when TDCC errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    configureSupabase({
      financial_metric: { data: financialData, error: null },
      recent_fundamental: noData,
      tdcc_holder: { data: null, error: { message: "RLS denied" } },
    });
    renderFundamental();

    expect(await screen.findByText("Valuation")).toBeTruthy();
    expect(screen.queryByText("No financial data is available.")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("Error fetching TDCC holder data:", { message: "RLS denied" });
  });

  it("shows the empty fallback only when all three sources are absent", async () => {
    renderFundamental();
    expect(await screen.findByText("No financial data is available.")).toBeTruthy();
  });
});
