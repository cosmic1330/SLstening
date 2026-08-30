/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

const runtimeSpies = vi.hoisted(() => ({
  reload: vi.fn(),
  toggleDebug: vi.fn(),
  watchMarket: vi.fn(),
}));

vi.mock("../../components/DebugInfo", () => ({
  default: () => <div data-testid="debug-info" />,
}));
vi.mock("../../hooks/useMarketWatcher", () => ({
  default: runtimeSpies.watchMarket,
}));
vi.mock("../../store/Stock.store", () => ({
  default: (selector: (state: { reload: typeof runtimeSpies.reload }) => unknown) =>
    selector({ reload: runtimeSpies.reload }),
}));
vi.mock("../../store/debug.store", () => ({
  default: {
    getState: () => ({ toggleVisibility: runtimeSpies.toggleDebug }),
  },
}));

import AuthenticatedRuntime from "../AuthenticatedRuntime";

describe("AuthenticatedRuntime", () => {
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
});
