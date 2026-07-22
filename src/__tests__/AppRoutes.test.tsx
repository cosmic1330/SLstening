/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useParams } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("../pages/Detail/index", () => ({
  default: () => {
    const { id } = useParams();
    return <div>detail-route:{id}</div>;
  },
}));
vi.mock("../pages/Login", () => ({ default: () => <div>login-route</div> }));
vi.mock("../pages/Register", () => ({
  default: () => <div>register-route</div>,
}));
vi.mock("../pages/Add", () => ({ default: () => <div>add-route</div> }));
vi.mock("../pages/Home", () => ({ default: () => <div>home-route</div> }));
vi.mock("../pages/Home/Category", () => ({
  default: () => <div>category-route</div>,
}));
vi.mock("../components/DebugInfo", () => ({ default: () => null }));
vi.mock("../hooks/useMarketWatcher", () => ({ default: vi.fn() }));
vi.mock("../store/Stock.store", () => ({
  default: () => ({ reload: vi.fn() }),
}));

import { AppRoutes } from "../App";

describe("AppRoutes", () => {
  it("routes /detail/:id to Detail with the stock id", () => {
    render(
      <MemoryRouter initialEntries={["/detail/2330"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText("detail-route:2330")).toBeTruthy();
  });
});
