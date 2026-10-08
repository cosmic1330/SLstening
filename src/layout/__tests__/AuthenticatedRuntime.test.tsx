/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeSpies = vi.hoisted(() => ({
  reload: vi.fn(),
  keepLegacySettings: vi.fn(),
  deleteLegacySettings: vi.fn(),
  toggleDebug: vi.fn(),
  watchMarket: vi.fn(),
  syncState: {
    syncStatus: "local",
    syncError: null as string | null,
    legacySettingsPrompt: false,
    legacySettingsError: null as string | null,
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
    keepLegacySettings: runtimeSpies.keepLegacySettings,
    deleteLegacySettings: runtimeSpies.deleteLegacySettings,
    applyIndicatorSettings: vi.fn(),
    accountUserId: null,
    accountEpoch: null,
  }),
}));
vi.mock("../../store/debug.store", () => ({
  default: {
    getState: () => ({ toggleVisibility: runtimeSpies.toggleDebug }),
  },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", resolvedLanguage: "en" } }),
}));

import AuthenticatedRuntime from "../AuthenticatedRuntime";

const renderRuntime = () => render(
  <MemoryRouter>
    <Routes>
      <Route element={<AuthenticatedRuntime />}>
        <Route index element={<div>protected-content</div>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe("AuthenticatedRuntime", () => {
  beforeEach(() => {
    runtimeSpies.reload.mockReset();
    runtimeSpies.keepLegacySettings.mockReset().mockResolvedValue(undefined);
    runtimeSpies.deleteLegacySettings.mockReset().mockResolvedValue(undefined);
    runtimeSpies.toggleDebug.mockReset();
    runtimeSpies.watchMarket.mockReset();
    Object.assign(runtimeSpies.syncState, {
      syncStatus: "local",
      syncError: null,
      legacySettingsPrompt: false,
      legacySettingsError: null,
    });
  });

  it("starts authenticated-only work once and cleans up the debug shortcut", () => {
    const view = renderRuntime();

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

  it("offers a one-time keep/delete choice for the obsolete settings file", async () => {
    Object.assign(runtimeSpies.syncState, { legacySettingsPrompt: true });
    const view = renderRuntime();

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("accountSync.legacySettingsMessage")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "accountSync.keepLegacySettings" }));
    fireEvent.click(screen.getByRole("button", { name: "accountSync.deleteLegacySettings" }));
    await waitFor(() => {
      expect(runtimeSpies.keepLegacySettings).toHaveBeenCalledTimes(1);
      expect(runtimeSpies.deleteLegacySettings).toHaveBeenCalledTimes(1);
    });
    view.unmount();
  });

  it("keeps the obsolete-file dialog retryable after a delete error", async () => {
    Object.assign(runtimeSpies.syncState, {
      legacySettingsPrompt: true,
      legacySettingsError: "LEGACY_SETTINGS_DELETE_FAILED",
    });
    runtimeSpies.deleteLegacySettings.mockRejectedValue(new Error("LEGACY_SETTINGS_DELETE_FAILED"));
    const view = renderRuntime();

    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "accountSync.deleteLegacySettings" }));
    await waitFor(() => expect(runtimeSpies.deleteLegacySettings).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog")).toBeTruthy();
    view.unmount();
  });

  it("shows a retryable sync error", async () => {
    Object.assign(runtimeSpies.syncState, { syncStatus: "error", syncError: "CLOUD_UNAVAILABLE" });
    const view = renderRuntime();

    expect(screen.getByTestId("account-sync-inline-notice")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "accountSync.retry" }));
    await waitFor(() => expect(runtimeSpies.reload).toHaveBeenCalledTimes(2));
    view.unmount();
  });
});
