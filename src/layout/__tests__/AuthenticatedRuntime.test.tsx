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
  nativeRuntime: false,
  nativeSessionError: null as string | null,
  retryNativeSession: vi.fn(),
  resolveCloudBackupConflict: vi.fn(),
  applyMcpAccountCommit: vi.fn(),
  accountStateListener: null as null | ((event: { payload: Record<string, unknown> }) => void),
  syncState: {
    syncStatus: "local",
    syncError: null as string | null,
    legacySettingsPrompt: false,
    legacySettingsError: null as string | null,
    cloudBackupConflict: null as null | {
      cloudSnapshot: Record<string, unknown>;
      cloudUpdatedAt: string | null;
      localChangedAt: string | null;
      source: "startup" | "enable";
    },
  },
}));

vi.mock("../../components/DebugInfo", () => ({
  default: () => <div data-testid="debug-info" />,
}));
vi.mock("../../hooks/useMarketWatcher", () => ({
  default: runtimeSpies.watchMarket,
}));
vi.mock("../../store/Stock.store", () => ({
  default: Object.assign((selector: (state: Record<string, unknown>) => unknown) => selector({
    ...runtimeSpies.syncState,
    reload: runtimeSpies.reload,
    keepLegacySettings: runtimeSpies.keepLegacySettings,
    deleteLegacySettings: runtimeSpies.deleteLegacySettings,
    resolveCloudBackupConflict: runtimeSpies.resolveCloudBackupConflict,
    applyMcpAccountCommit: runtimeSpies.applyMcpAccountCommit,
    applyIndicatorSettings: vi.fn(),
    accountUserId: null,
    accountEpoch: null,
  }), { getState: () => ({
    accountUserId: "user-a",
    accountEpoch: 7,
    applyMcpAccountCommit: runtimeSpies.applyMcpAccountCommit,
    applyIndicatorSettings: vi.fn(),
  }) }),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: Record<string, unknown> }) => void) => {
    if (name === "account-state-updated") runtimeSpies.accountStateListener = handler;
    return () => undefined;
  }),
}));
vi.mock("../../store/debug.store", () => ({
  default: {
    getState: () => ({ toggleVisibility: runtimeSpies.toggleDebug }),
  },
}));
vi.mock("../../account/native", () => ({
  isNativeRuntime: () => runtimeSpies.nativeRuntime,
  getNativeIndicatorSettings: vi.fn(),
}));
vi.mock("../../context/UserContext", () => ({
  useOptionalUser: () => ({
    nativeSessionError: runtimeSpies.nativeSessionError,
    retryNativeSession: runtimeSpies.retryNativeSession,
  }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { error?: string }) =>
      options?.error ? `${key}:${options.error}` : key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
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
    runtimeSpies.nativeRuntime = false;
    runtimeSpies.nativeSessionError = null;
    runtimeSpies.retryNativeSession.mockReset();
    runtimeSpies.resolveCloudBackupConflict.mockReset().mockResolvedValue(undefined);
    runtimeSpies.applyMcpAccountCommit.mockReset().mockResolvedValue(undefined);
    runtimeSpies.accountStateListener = null;
    Object.assign(runtimeSpies.syncState, {
      syncStatus: "local",
      syncError: null,
      legacySettingsPrompt: false,
      legacySettingsError: null,
      cloudBackupConflict: null,
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

  it("does not surface a cloud sync error globally", async () => {
    Object.assign(runtimeSpies.syncState, { syncStatus: "error", syncError: "CLOUD_UNAVAILABLE" });
    const view = renderRuntime();

    expect(screen.queryByTestId("account-sync-inline-notice")).toBeNull();
    expect(runtimeSpies.reload).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("blocks dismissal until the user chooses local or cloud data", async () => {
    Object.assign(runtimeSpies.syncState, {
      cloudBackupConflict: {
        cloudSnapshot: {},
        cloudUpdatedAt: "2026-10-11T02:00:00.000Z",
        localChangedAt: "2026-10-11T01:00:00.000Z",
        source: "startup",
      },
    });
    renderRuntime();

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "accountSync.useLocalData" }));
    await waitFor(() => expect(runtimeSpies.resolveCloudBackupConflict).toHaveBeenCalledWith("local"));
  });

  it("shows only a safe native session code and retries the native session", async () => {
    runtimeSpies.nativeRuntime = true;
    runtimeSpies.nativeSessionError = "STALE_SESSION_TRANSITION";
    const view = renderRuntime();

    expect(screen.getByTestId("account-sync-inline-notice").textContent).toContain(
      "accountSync.nativeError:STALE_SESSION_TRANSITION",
    );
    fireEvent.click(screen.getByRole("button", { name: "accountSync.retry" }));
    await waitFor(() => expect(runtimeSpies.retryNativeSession).toHaveBeenCalledTimes(1));
    view.unmount();
  });

  it("does not expose an arbitrary native session error", () => {
    runtimeSpies.nativeRuntime = true;
    runtimeSpies.nativeSessionError = "token=private C:\\Users\\secret";
    const view = renderRuntime();

    const notice = screen.getByTestId("account-sync-inline-notice");
    expect(notice.textContent).toContain(
      "accountSync.nativeError:UNKNOWN_NATIVE_SESSION_ERROR",
    );
    expect(notice.textContent).not.toContain("token=private");
    view.unmount();
  });

  it("applies a matching MCP commit instead of requesting a generic reload", async () => {
    runtimeSpies.nativeRuntime = true;
    renderRuntime();
    await waitFor(() => expect(runtimeSpies.accountStateListener).not.toBeNull());

    runtimeSpies.accountStateListener?.({ payload: {
      userId: "user-a", epoch: 7, data: {}, updatedAt: "2026-10-11T08:00:00.000Z", operation: "add_stock", mutation: { kind: "addStocks", categoryId: "group-a", stockIds: [] },
    } });
    await waitFor(() => expect(runtimeSpies.applyMcpAccountCommit).toHaveBeenCalledTimes(1));
    expect(runtimeSpies.reload).not.toHaveBeenCalled();
  });
});
