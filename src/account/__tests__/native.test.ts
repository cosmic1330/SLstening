/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { clearNativeSession, establishNativeSession } from "../native";

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
});
