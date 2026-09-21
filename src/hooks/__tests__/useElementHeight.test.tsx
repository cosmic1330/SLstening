/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useElementHeight from "../useElementHeight";

type ObserverEntry = { contentRect: { height: number } };

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  readonly callback: (entries: ObserverEntry[]) => void;
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(callback: (entries: ObserverEntry[]) => void) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

describe("useElementHeight", () => {
  let rafCallbacks: Array<FrameRequestCallback | null>;
  let rafId: number;

  beforeEach(() => {
    ResizeObserverMock.instances = [];
    rafCallbacks = [];
    rafId = 0;
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = rafId++;
      rafCallbacks[id] = callback;
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafCallbacks[id] = null;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts measuring when the callback ref attaches after the first render", () => {
    const { result } = renderHook(() => useElementHeight<HTMLDivElement>());
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ height: 128 } as DOMRect);

    expect(result.current.height).toBe(0);
    act(() => result.current.ref(element));

    expect(result.current.height).toBe(128);
    expect(ResizeObserverMock.instances[0]?.observe).toHaveBeenCalledWith(element);
  });

  it("re-measures on the next animation frame after an initial zero layout", () => {
    const { result } = renderHook(() => useElementHeight<HTMLDivElement>());
    const element = document.createElement("div");
    let measuredHeight = 0;
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => ({ height: measuredHeight } as DOMRect));

    act(() => result.current.ref(element));
    expect(result.current.height).toBe(0);

    measuredHeight = 236;
    act(() => rafCallbacks[0]?.(performance.now()));
    expect(result.current.height).toBe(236);
  });

  it("updates from ResizeObserver and ignores unchanged rounded values", () => {
    const { result } = renderHook(() => useElementHeight<HTMLDivElement>());
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ height: 90 } as DOMRect);

    act(() => result.current.ref(element));
    const observer = ResizeObserverMock.instances[0];
    act(() => observer.callback([{ contentRect: { height: 90.4 } }]));
    expect(result.current.height).toBe(90);
    act(() => observer.callback([{ contentRect: { height: 91.6 } }]));
    expect(result.current.height).toBe(92);
  });

  it("disconnects the old node and cancels pending work on replacement and unmount", () => {
    const { result, unmount } = renderHook(() => useElementHeight<HTMLDivElement>());
    const first = document.createElement("div");
    const second = document.createElement("div");
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue({ height: 40 } as DOMRect);
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue({ height: 80 } as DOMRect);

    act(() => result.current.ref(first));
    const firstObserver = ResizeObserverMock.instances[0];
    act(() => result.current.ref(second));
    expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.height).toBe(80);

    const secondObserver = ResizeObserverMock.instances[1];
    unmount();
    expect(secondObserver.disconnect).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.some((callback) => callback === null)).toBe(true);
  });
});
