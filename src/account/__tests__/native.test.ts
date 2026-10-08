/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { clearNativeSession, establishNativeSession, updateNativeAccountState, getLegacySettingsStatus, deleteLegacySettings } from "../native";

describe("native session transitions fail closed", () => {
  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  });

  it("forces the invalidation command when normal clear fails", async () => {
    invoke.mockRejectedValueOnce(new Error("clear transport failed")).mockResolvedValueOnce(undefined);
    await clearNativeSession(1);
    expect(invoke.mock.calls.map(([command]) => command)).toEqual([
      "account_clear_session",
      "account_invalidate_session",
    ]);
  });

  it("invalidates the previous gateway session when replacement fails", async () => {
    invoke.mockRejectedValueOnce(new Error("set transport failed")).mockResolvedValueOnce(undefined);
    await expect(establishNativeSession({
      access_token: "token",
      user: { id: "user-a", email: "a@example.com" },
      expires_at: null,
    } as never, 2)).rejects.toThrow("set transport failed");
    expect(invoke.mock.calls.map(([command]) => command)).toEqual([
      "account_set_session",
      "account_invalidate_session",
    ]);
  });

  it("uses the PhoneApp sync command without revision or operation metadata", async () => {
    invoke.mockResolvedValue({ userId: "user-a", epoch: 1, updatedAt: null });
    await updateNativeAccountState(1, {
      stocks: [], categories: [], activeCategoryId: "", pinnedCategoryIds: [], recentCategoryIds: [],
      indicatorSettings: { ma5: 5, ma10: 10, ma20: 30, ma60: 60, boll: 30, kd: 9, mfi: 14, rsi: 14, ma120: 120, ma240: 240, emaShort: 5, emaLong: 10, cmf: 21, cmfEma: 5, atrLen: 10, atrMult: 3, donchian: 20, cci: 26 },
    });
    expect(invoke).toHaveBeenCalledWith("account_update_state", expect.objectContaining({ expectedEpoch: 1 }));
    expect(invoke.mock.calls[0][1]).not.toHaveProperty("expectedRevision");
    expect(invoke.mock.calls[0][1]).not.toHaveProperty("operationId");
  });

  it("exposes the one-time legacy settings disposition commands", async () => {
    invoke.mockResolvedValue({ present: true, disposition: null, path: "/app/settings.json" });
    await getLegacySettingsStatus();
    await deleteLegacySettings();
    expect(invoke.mock.calls.map(([command]) => command)).toEqual([
      "legacy_settings_status",
      "legacy_settings_delete",
    ]);
  });
});
