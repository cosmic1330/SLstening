/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
const swr = vi.hoisted(() => ({ useSWR: vi.fn() }));
vi.mock("swr", () => ({ default: swr.useSWR }));
import TwMarginMaintenanceBox from "./TwMarginMaintenanceBox";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  swr.useSWR.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterAll(() => vi.unstubAllGlobals());

describe("Taiwan margin maintenance", () => {
  it.each([
    [170.6, 170.57, "+0.03"],
    [170.57, 170.6, "-0.03"],
    [170.6, 170.6, "0.00"],
    [170.601, 170.6, "0.00"],
    [170.6, null, "—"],
    [null, 170.6, "—"],
  ])("compares adjacent trading sessions: %s vs %s", (latest, previous, expected) => {
    swr.useSWR.mockReturnValue({ data: [
      { date: "2026-10-29", percent: 175 },
      { date: "2026-10-30", percent: previous },
      { date: "2026-11-02", percent: latest },
    ], mutate: vi.fn() });
    render(<TwMarginMaintenanceBox />);
    expect(screen.getByTestId("margin-maintenance-change").textContent).toBe(expected);
    if (latest !== null && previous !== null) {
      expect(screen.getByText("vs 10/30")).toBeTruthy();
    } else {
      expect(screen.queryByText(/^vs /)).toBeNull();
    }
  });

  it("shows stored percentages above 100 without rescaling and polls hourly", () => {
    swr.useSWR.mockReturnValue({ data: [{ date: "2026-11-02", percent: 170.6 }], mutate: vi.fn() });
    render(<TwMarginMaintenanceBox />);
    expect(screen.getByText("170.60")).toBeTruthy();
    expect(screen.getByText("Observation date: 2026-11-02")).toBeTruthy();
    expect(screen.getByText("10-trading-day trend")).toBeTruthy();
    expect(screen.getByText("Not enough valid observations to show a trend.")).toBeTruthy();
    expect(swr.useSWR.mock.calls[0][2]).toMatchObject({ refreshInterval: 3_600_000, revalidateOnFocus: false });
  });

  it("keeps an invalid latest value unavailable instead of displaying an older value", () => {
    swr.useSWR.mockReturnValue({ data: [{ date: "2026-10-30", percent: 170.57 }, { date: "2026-11-02", percent: null }], mutate: vi.fn() });
    render(<TwMarginMaintenanceBox />);
    expect(screen.getByText("Latest value unavailable.")).toBeTruthy();
    expect(screen.queryByText("170.57")).toBeNull();
  });

  it("distinguishes loading, failed and empty requests and supports retry", () => {
    const mutate = vi.fn();
    swr.useSWR.mockReturnValue({ isLoading: true, mutate });
    const view = render(<TwMarginMaintenanceBox />);
    expect(screen.getByText("Loading margin data…")).toBeTruthy();
    swr.useSWR.mockReturnValue({ error: new Error("offline"), mutate });
    view.rerender(<TwMarginMaintenanceBox />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mutate).toHaveBeenCalledOnce();
    swr.useSWR.mockReturnValue({ data: [], mutate });
    view.rerender(<TwMarginMaintenanceBox />);
    expect(screen.getByText("No margin maintenance data is available.")).toBeTruthy();
  });
});
