/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("../store/mcp.store", () => ({
  default: { getState: () => gateway },
}));

import useMcpGatewayPolling from "./useMcpGatewayPolling";

function PollingProbe() {
  useMcpGatewayPolling();
  return null;
}

describe("useMcpGatewayPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gateway.refresh.mockReset().mockResolvedValue(undefined);
  });

  it("starts one immediate refresh, polls every five seconds, and cleans up", () => {
    const view = render(<PollingProbe />);
    expect(gateway.refresh).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(5_000); });
    expect(gateway.refresh).toHaveBeenCalledTimes(2);

    view.unmount();
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(gateway.refresh).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
