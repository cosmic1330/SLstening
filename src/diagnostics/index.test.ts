// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  setUser: vi.fn(),
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/react", () => sentryMocks);
vi.mock("@tauri-apps/plugin-log", () => ({ error: vi.fn().mockResolvedValue(undefined) }));

import {
  initializeDiagnostics,
  reportHandledError,
  sanitizeDiagnosticEvent,
  setDiagnosticsUser,
} from ".";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("diagnostic event privacy", () => {
  it("does not initialize or identify Sentry in development and tests", () => {
    initializeDiagnostics();
    setDiagnosticsUser("account-uuid");

    expect(sentryMocks.init).not.toHaveBeenCalled();
    expect(sentryMocks.setUser).not.toHaveBeenCalled();
  });

  it("removes private payloads while retaining safe grouping and stack data", () => {
    const event = sanitizeDiagnosticEvent({
      message: "person@example.com token=secret 2330 Semiconductor",
      user: { id: "account-uuid", email: "person@example.com", ip_address: "127.0.0.1" },
      request: { data: { watchlist: ["2330"], categories: ["PCB"] } },
      breadcrumbs: [{ message: "stock 2330", data: { token: "secret" } }],
      contexts: { watchlist: { stocks: ["2330"] } },
      extra: { refreshToken: "secret", category: "PCB" },
      tags: {
        operation: "market_fetch",
        code: "MARKET_FETCH_FAILED",
        route: "/detail/2330",
        stock: "2330",
      },
      exception: {
        values: [{
          type: "Error",
          value: "failed for person@example.com / 2330",
          stacktrace: { frames: [{ filename: "https://app.local/assets/app.js?token=secret", function: "loadMarket" }] },
          mechanism: { type: "generic", handled: true, data: { token: "secret" } },
        }],
      },
    } as never);

    expect(event.user).toEqual({ id: "account-uuid" });
    expect(event.request).toBeUndefined();
    expect(event.breadcrumbs).toEqual([]);
    expect(event.contexts).toEqual({});
    expect(event.extra).toBeUndefined();
    expect(event.tags).toEqual({
      operation: "market_fetch",
      code: "MARKET_FETCH_FAILED",
      route: "/detail/:id",
    });
    expect(event.message).toBe("MARKET_FETCH_FAILED");
    expect(event.exception?.values?.[0].value).toBe("MARKET_FETCH_FAILED");
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0].function).toBe("loadMarket");
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0].filename).toBe("https://app.local/assets/app.js");
    expect(event.exception?.values?.[0].mechanism?.data).toBeUndefined();
    expect(JSON.stringify(event)).not.toMatch(/person@example|127\.0\.0\.1|secret|2330|PCB|watchlist/i);
  });

  it("preserves the original production stack while sanitizing its envelope", () => {
    vi.stubEnv("PROD", true);
    const setTags = vi.fn();
    sentryMocks.withScope.mockImplementation((callback) => callback({ setTags }));
    initializeDiagnostics();

    const original = new Error("person@example.com failed for stock 2330");
    original.stack = "Error: private\n    at loadMarket (https://app.local/assets/app.js?token=secret:1:2)";
    reportHandledError("market_fetch_production_test", original, "MARKET_FETCH_FAILED");

    expect(sentryMocks.captureException).toHaveBeenCalledWith(original);
    expect(setTags).toHaveBeenCalledWith(expect.objectContaining({
      operation: "market_fetch_production_test",
      code: "MARKET_FETCH_FAILED",
    }));
    const options = sentryMocks.init.mock.calls[0][0];
    const safeEvent = options.beforeSend({
      message: original.message,
      request: { data: { stock: "2330" } },
      exception: {
        values: [{
          value: original.message,
          stacktrace: {
            frames: [{
              filename: "https://app.local/assets/app.js?token=secret",
              function: "loadMarket",
            }],
          },
        }],
      },
      tags: { operation: "market_fetch", code: "MARKET_FETCH_FAILED" },
    });
    expect(safeEvent.exception.values[0].stacktrace.frames[0].function).toBe("loadMarket");
    expect(JSON.stringify(safeEvent)).not.toMatch(/person@example|secret|2330/i);
  });
});
