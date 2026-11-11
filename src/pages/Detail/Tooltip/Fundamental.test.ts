/** @vitest-environment jsdom */
import { render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";

type QueryResult = { data: unknown; error: unknown };

const supabaseState = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; column: string; value: unknown }>,
  results: {} as Record<string, QueryResult>,
  from: vi.fn(),
}));
const marketApiState = vi.hoisted(() => ({ getPeRiverData: vi.fn() }));

vi.mock("../../../supabase", () => ({
  supabase: { from: supabaseState.from },
}));
vi.mock("../../../api/marketApi", () => ({ marketApi: marketApiState }));

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
  holders_100: 2400,
  previous_holders_100: 2300,
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
  render(createElement(SWRConfig, { value: { provider: () => new Map() } }, createElement(Fundamental, { id })));

beforeEach(async () => {
  await i18n.changeLanguage("en");
  marketApiState.getPeRiverData.mockReset();
  marketApiState.getPeRiverData.mockResolvedValue({ medianPer: 13 });
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

    expect(await screen.findByText("TDCC holder count changes")).toBeTruthy();
    expect(screen.getByText("≤100 lots")).toBeTruthy();
    expect(screen.getByText("Current 2,400 people")).toBeTruthy();
    expect(screen.getByText("+100 people increase")).toBeTruthy();
    expect(screen.getByText("400 lots or more")).toBeTruthy();
    expect(screen.getByText("Current 1,200 people")).toBeTruthy();
    expect(screen.getByText("+20 people increase")).toBeTruthy();
    expect(screen.getByText("1,000 lots or more")).toBeTruthy();
    expect(screen.getByText("Current 80 people")).toBeTruthy();
    expect(screen.getByText("-20 people decrease")).toBeTruthy();
    expect(document.querySelector('[data-testid="ArrowUpwardRoundedIcon"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="ArrowDownwardRoundedIcon"]')).toBeTruthy();
    expect(screen.getAllByTestId("tdcc-holder-card")).toHaveLength(3);
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
    expect(errorSpy).toHaveBeenCalledWith("[fundamental_tdcc_fetch] FUNDAMENTAL_TDCC_FETCH_FAILED");
  });

  it("shows the empty fallback only when all three sources are absent", async () => {
    renderFundamental();
    expect(await screen.findByText("No financial data is available.")).toBeTruthy();
  });

  it("uses compact sections and TDCC cards that can shrink without a loading minimum width", async () => {
    const loadingView = renderFundamental();
    const loading = screen.getByTestId("fundamental-loading");
    expect(getComputedStyle(loading).minWidth).not.toBe("300px");
    expect(getComputedStyle(loading).width).toBe("100%");
    await screen.findByText("No financial data is available.");
    loadingView.unmount();

    configureSupabase({
      financial_metric: { data: financialData, error: null },
      recent_fundamental: {
        data: { eps_recent_q1: 1, revenue_recent_m1_mom: 1, revenue_recent_m1_yoy: 2 },
        error: null,
      },
      tdcc_holder: { data: tdccData, error: null },
    });
    renderFundamental();

    await screen.findByTestId("fundamental-section-valuation");
    expect(screen.getByTestId("fundamental-section-eps")).toBeTruthy();
    expect(screen.getByTestId("fundamental-section-revenue")).toBeTruthy();
    expect(screen.getByTestId("fundamental-section-tdcc")).toBeTruthy();
    expect(getComputedStyle(screen.getByTestId("tdcc-holder-cards")).minWidth).toBe("0px");
    expect(screen.getAllByTestId("tdcc-holder-card")).toHaveLength(3);
    screen.getAllByTestId("tdcc-holder-card").forEach((card) => {
      expect(getComputedStyle(card).minWidth).toBe("0px");
    });
  });
});

describe("read-only scenario valuation", () => {
  it("calculates four prices from trailing EPS and one historical median P/E", async () => {
    configureSupabase({
      financial_metric: { data: { ...financialData, pe: 20 }, error: null },
      recent_fundamental: { data: { eps_recent_q1: 5, eps_recent_q2: 4.5, eps_recent_q3: 4.5, eps_recent_q4: 4, eps_recent_y1: 15 }, error: null },
      tdcc_holder: noData,
    });
    renderFundamental();

    const valuation = await screen.findByTestId("fundamental-section-fair-value");
    expect(valuation.compareDocumentPosition(screen.getByTestId("fundamental-section-eps")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("fundamental-section-valuation").compareDocumentPosition(screen.getByTestId("fundamental-section-revenue")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const [scenario, price] of [["pessimistic", "169NTD"], ["conservative", "195NTD"], ["neutral", "234NTD"], ["optimistic", "273NTD"]]) {
      const card = within(await screen.findByTestId(`fair-value-${scenario}`));
      expect(card.getByText(price)).toBeTruthy();
      expect(card.getByText(/3Y median P\/E 13.00x/)).toBeTruthy();
    }
    expect(marketApiState.getPeRiverData).toHaveBeenCalledWith("2330");
    expect(within(valuation).queryByRole("textbox")).toBeNull();
  });

  it("uses the latest annual EPS when four quarters are incomplete", async () => {
    configureSupabase({
      financial_metric: { data: { ...financialData, pe: 13 }, error: null },
      recent_fundamental: { data: { eps_recent_q1: 5, eps_recent_q2: null, eps_recent_q3: 4.5, eps_recent_q4: 4, eps_recent_y1: 18 }, error: null },
      tdcc_holder: noData,
    });
    renderFundamental();
    await screen.findByTestId("fundamental-section-fair-value");
    expect(within(await screen.findByTestId("fair-value-neutral")).getByText("234NTD")).toBeTruthy();
  });
});
