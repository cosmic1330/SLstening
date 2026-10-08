/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useIndicatorSettings from "../useIndicatorSettings";

// The browser fallback is intentionally session-scoped. Durable indicator
// preferences live in the account preferences store, not localStorage.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useIndicatorSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should return default settings initially", () => {
    const { result } = renderHook(() => useIndicatorSettings());
    expect(result.current.settings.ma5).toBe(5);
    expect(result.current.settings.ma20).toBe(30);
  });

  it("ignores the obsolete localStorage key", () => {
    const savedSettings = JSON.stringify({ ma5: 55, ma10: 100 });
    localStorage.setItem("slitenting-indicator-settings", savedSettings);

    const { result } = renderHook(() => useIndicatorSettings());
    expect(result.current.settings.ma5).toBe(5);
    expect(result.current.settings.ma10).toBe(10);
    expect(result.current.settings.ma20).toBe(30);
  });

  it("updates browser fallback settings without writing the obsolete key", () => {
    const { result } = renderHook(() => useIndicatorSettings());

    act(() => {
      result.current.updateSetting("ma5", 15);
    });

    expect(result.current.settings.ma5).toBe(15);
    expect(localStorage.getItem("slitenting-indicator-settings")).toBeNull();
  });

  it("should reset settings", () => {
    const { result } = renderHook(() => useIndicatorSettings());

    act(() => {
      result.current.updateSetting("ma5", 15);
    });
    expect(result.current.settings.ma5).toBe(15);

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.ma5).toBe(5); // Back to default
    expect(localStorage.getItem("slitenting-indicator-settings")).toBeNull();
  });
});
