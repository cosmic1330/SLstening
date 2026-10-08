/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeSpies = vi.hoisted(() => ({
  reload: vi.fn(),
  importLegacy: vi.fn(),
  repairLegacy: vi.fn(),
  keepLegacyCurrent: vi.fn(),
  toggleDebug: vi.fn(),
  watchMarket: vi.fn(),
  syncState: {
    syncStatus: "local",
    syncError: null as string | null,
    legacyImportAvailable: false,
    legacyRepairAvailable: false,
    legacyRepairMissingCount: 0,
    legacyUnresolvedStockIds: [] as string[],
  },
}));

vi.mock("../../components/DebugInfo", () => ({
  default: () => <div data-testid="debug-info" />,
}));
vi.mock("../../hooks/useMarketWatcher", () => ({
  default: runtimeSpies.watchMarket,
}));
vi.mock("../../store/Stock.store", () => ({
  default: (selector: (state: Record<string, unknown>) => unknown) => selector({
    ...runtimeSpies.syncState,
    reload: runtimeSpies.reload,
    importLegacy: runtimeSpies.importLegacy,
    repairLegacy: runtimeSpies.repairLegacy,
    keepLegacyCurrent: runtimeSpies.keepLegacyCurrent,
  }),
}));
vi.mock("../../store/debug.store", () => ({
  default: {
    getState: () => ({ toggleVisibility: runtimeSpies.toggleDebug }),
  },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AuthenticatedRuntime from "../AuthenticatedRuntime";

describe("AuthenticatedRuntime", () => {
  beforeEach(() => {
    runtimeSpies.reload.mockReset();
    runtimeSpies.importLegacy.mockReset();
    runtimeSpies.repairLegacy.mockReset();
    runtimeSpies.keepLegacyCurrent.mockReset();
    runtimeSpies.toggleDebug.mockReset();
    runtimeSpies.watchMarket.mockReset();
    Object.assign(runtimeSpies.syncState, {
      syncStatus: "local",
      syncError: null,
      legacyImportAvailable: false,
      legacyRepairAvailable: false,
      legacyRepairMissingCount: 0,
      legacyUnresolvedStockIds: [],
    });
  });

  it("starts authenticated-only work once and cleans up the debug shortcut", () => {
    const view = render(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthenticatedRuntime />}>
            <Route index element={<div>protected-content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("protected-content")).toBeTruthy();
    expect(screen.getByTestId("debug-info")).toBeTruthy();
    expect(runtimeSpies.reload).toHaveBeenCalledTimes(1);
    expect(runtimeSpies.watchMarket).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "d", ctrlKey: true, shiftKey: true });
    expect(runtimeSpies.toggleDebug).toHaveBeenCalledTimes(1);

    view.unmount();
    fireEvent.keyDown(window, { key: "d", ctrlKey: true, shiftKey: true });
    expect(runtimeSpies.toggleDebug).toHaveBeenCalledTimes(1);
  });

  it("renders the repair dialog choices and catches repair rejection", async () => {
    Object.assign(runtimeSpies.syncState, {
      syncStatus: "synced",
      legacyRepairAvailable: true,
      legacyRepairMissingCount: 3,
    });
    runtimeSpies.repairLegacy.mockRejectedValue(new Error("CLOUD_WRITE_FAILED"));
    runtimeSpies.keepLegacyCurrent.mockResolvedValue(undefined);
    const view = render(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthenticatedRuntime />}>
            <Route index element={<div>protected-content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const dialog = screen.getByTestId("account-sync-repair-dialog");
    expect(dialog).toBeTruthy();
    expect(screen.queryByTestId("account-sync-inline-notice")).toBeNull();
    expect(screen.getByText("accountSync.legacyRepairAvailable")).toBeTruthy();
    const repair = screen.getByRole("button", { name: "accountSync.repair" });
    const keep = screen.getByRole("button", { name: "accountSync.keepCurrent" });
    const later = screen.getByRole("button", { name: "accountSync.decideLater" });
    fireEvent.click(repair);
    fireEvent.click(keep);
    await waitFor(() => expect(runtimeSpies.repairLegacy).toHaveBeenCalledTimes(1));
    expect(runtimeSpies.keepLegacyCurrent).toHaveBeenCalledTimes(1);
    fireEvent.click(later);
    expect(screen.queryByTestId("account-sync-repair-dialog")).toBeNull();
    view.unmount();
  });

  it("offers reload before repair after a revision conflict and catches reload rejection", async () => {
    Object.assign(runtimeSpies.syncState, {
      syncStatus: "conflict",
      syncError: "REVISION_CONFLICT",
      legacyRepairAvailable: true,
      legacyRepairMissingCount: 3,
    });
    runtimeSpies.reload.mockRejectedValue(new Error("RELOAD_FAILED"));
    runtimeSpies.keepLegacyCurrent.mockResolvedValue(undefined);
    const view = render(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthenticatedRuntime />}>
            <Route index element={<div>protected-content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("account-sync-repair-dialog")).toBeTruthy();
    expect(screen.getByText("accountSync.repairConflict")).toBeTruthy();
    expect(screen.getByRole("button", { name: "accountSync.reloadForRepair" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "accountSync.repair" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "accountSync.reloadForRepair" }));
    await waitFor(() => expect(runtimeSpies.reload).toHaveBeenCalledTimes(2));
    view.unmount();
  });
});
