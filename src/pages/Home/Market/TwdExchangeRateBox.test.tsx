/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";

const swr = vi.hoisted(() => ({ useSWR: vi.fn() }));
vi.mock("swr", () => ({ default: swr.useSWR }));
vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children }: { children: ReactElement<{ width: number; height: number }> }) =>
    cloneElement(children, { width: 184, height: 130 }),
}));

import TwdExchangeRateBox from "./TwdExchangeRateBox";

const data = [
  ...["03", "04", "05", "06", "09", "10", "11", "12", "13", "16", "17", "18", "19"].map((day, index) => ({
    date: `2026-11-${day}`, rate: 32.8 + index * 0.01, rating: null, trend: null, trendLabel: null,
    stockMarketImpact: null, stockMarketImpactLabel: null, trendWindowDays: 14, fourteenDayChangePercent: null,
    stockMarketImpactDetail: null, sectorNote: null,
  })),
  {
    date: "2026-11-20", rate: 32.936, rating: "台股偏利空", trend: "twd_depreciating" as const, trendLabel: "台幣貶值",
    stockMarketImpact: "bearish" as const, stockMarketImpactLabel: "台股偏利空", trendWindowDays: 14, fourteenDayChangePercent: 0.4146,
    stockMarketImpactDetail: "台幣貶值常伴隨外資賣超並匯出。", sectorNote: "出口股可能有匯兌收益。",
  },
];

beforeEach(async () => {
  await i18n.changeLanguage("en");
  swr.useSWR.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterAll(() => vi.unstubAllGlobals());

describe("TWD exchange rate box", () => {
  it("shows the latest rate, 14-session change, TWD direction, broad-market impact and chart", () => {
    swr.useSWR.mockReturnValue({ data, mutate: vi.fn() });
    render(<TwdExchangeRateBox />);
    expect(screen.getByText("32.936")).toBeTruthy();
    expect(screen.getByText("14-session change")).toBeTruthy();
    expect(screen.getByTestId("exchange-rate-change").textContent).toBe("+0.41%");
    expect(screen.getByText("TWD depreciation")).toBeTruthy();
    expect(screen.getByText("Bearish for the Taiwan market")).toBeTruthy();
    expect(screen.queryByText(/foreign selling and capital outflows/)).toBeNull();
    expect(screen.queryByText(/exporters may gain/)).toBeNull();
    expect(screen.getByText("Observation date: 2026-11-20")).toBeTruthy();
    expect(screen.getByRole("img", { name: /USD\/TWD trend with 14 observations/ })).toBeTruthy();
    expect(swr.useSWR.mock.calls[0][2]).toMatchObject({ refreshInterval: 3_600_000, revalidateOnFocus: false });
  });

  it("keeps the headline and trend chart in separate left and right columns", () => {
    swr.useSWR.mockReturnValue({ data, mutate: vi.fn() });
    render(<TwdExchangeRateBox />);
    const columns = screen.getByTestId("exchange-rate-columns");
    expect(getComputedStyle(columns).display).toBe("grid");
    expect(screen.getByTestId("exchange-rate-current").parentElement).toBe(columns);
    expect(screen.getByTestId("exchange-rate-trend").parentElement).toBe(columns);
  });

  it("localizes the canonical trend and impact instead of displaying stored Chinese labels", async () => {
    await i18n.changeLanguage("zh-TW");
    swr.useSWR.mockReturnValue({ data, mutate: vi.fn() });
    render(<TwdExchangeRateBox />);
    expect(screen.getByText("台幣貶值")).toBeTruthy();
    expect(screen.getByText("台股大盤偏利空")).toBeTruthy();
    expect(screen.getByText("資料日期：2026-11-20")).toBeTruthy();
  });

  it.each([
    [32.5, "TWD appreciation", "Bullish for the Taiwan market"],
    [32.8, "TWD unchanged", "Neutral for the Taiwan market"],
  ])("maps a latest rate of %s to the expected currency direction and market impact", (latestRate, trend, impact) => {
    swr.useSWR.mockReturnValue({ data: [...data.slice(0, -1), {
      ...data[data.length - 1], rate: latestRate, trend: null, stockMarketImpact: null, trendWindowDays: null, fourteenDayChangePercent: null,
    }], mutate: vi.fn() });
    render(<TwdExchangeRateBox />);
    expect(screen.getByText(trend)).toBeTruthy();
    expect(screen.getByText(impact)).toBeTruthy();
  });

  it("distinguishes loading, failed, empty and stale-data refresh states and supports retry", () => {
    const mutate = vi.fn();
    swr.useSWR.mockReturnValue({ isLoading: true, mutate });
    const view = render(<TwdExchangeRateBox />);
    expect(screen.getByText("Loading exchange-rate data…")).toBeTruthy();

    swr.useSWR.mockReturnValue({ error: new Error("offline"), mutate });
    view.rerender(<TwdExchangeRateBox />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mutate).toHaveBeenCalledOnce();

    swr.useSWR.mockReturnValue({ mutate });
    view.rerender(<TwdExchangeRateBox />);
    expect(screen.getByText("No TWD exchange-rate data is available.")).toBeTruthy();

    swr.useSWR.mockReturnValue({ data, error: new Error("offline"), mutate });
    view.rerender(<TwdExchangeRateBox />);
    expect(screen.getByText("Refresh failed; showing the last available exchange rate.")).toBeTruthy();
  });
});
