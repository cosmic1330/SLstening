/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import type { ChipData } from "../../../api/marketApi";

const marketApiMock = vi.hoisted(() => ({ getChipData: vi.fn() }));
const tdccApiMock = vi.hoisted(() => ({ getTdccHolder: vi.fn() }));

vi.mock("../../../api/marketApi", () => ({ marketApi: marketApiMock }));
vi.mock("../../../api/tdccApi", () => tdccApiMock);
vi.mock("./TrendPanel", () => ({ default: () => <div>trend</div> }));
vi.mock("./AnalysisPanel", () => ({ default: () => <div>analysis</div> }));

import ChipPage from "./ChipPage";

const chipData = {
  symbol: "2330",
  asOf: "2026-09-18",
  source: "test",
  score: 50,
  verdict: "mixed",
  confidence: "medium",
  institutional: { foreign5d: 1, trust5d: 2, dealer5d: 3, total5d: 6, total20d: 6, consecutiveDays: 1 },
  margin: { marginBalance: 100, marginChange5d: 1, marginChangePercent5d: 1, shortBalance: 1, shortChange5d: 1, shortMarginRatio: 2 },
  history: [],
  signals: [],
  scoreBreakdown: [],
  lights: { institutional: "buying", foreignHolding: "stable", lendingPressure: "normal", summary: "mixed", foreignRatio: 1, foreignChange5d: 0, lendingVolume5d: 0, lendingChangePercent: 1 },
} satisfies ChipData;

const renderPage = () => render(
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    <MemoryRouter initialEntries={["/detail/2330"]}>
      <Routes>
        <Route path="/detail/:id" element={<ChipPage />} />
      </Routes>
    </MemoryRouter>
  </SWRConfig>,
);

describe("ChipPage TDCC resource isolation", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    marketApiMock.getChipData.mockResolvedValue(chipData);
  });

  it("renders core positioning data and TDCC error without failing the page", async () => {
    tdccApiMock.getTdccHolder.mockRejectedValue(new Error("RLS denied"));
    renderPage();

    expect(await screen.findByText("Mixed positioning")).toBeTruthy();
    expect(await screen.findByTestId("holder-error")).toBeTruthy();
    expect(screen.getByText("Institutional investors")).toBeTruthy();
    const panelStyles = getComputedStyle(screen.getByLabelText("Overview"));
    expect(panelStyles.overflow).toBe("hidden");
    expect(panelStyles.overflowX).not.toMatch(/auto|scroll/);
    expect(panelStyles.overflowY).not.toMatch(/auto|scroll/);
  });

  it("keeps the core page available while TDCC is loading", async () => {
    tdccApiMock.getTdccHolder.mockImplementation(() => new Promise(() => undefined));
    renderPage();

    expect(await screen.findByText("Mixed positioning")).toBeTruthy();
    expect(screen.getByTestId("holder-loading")).toBeTruthy();
  });
});
