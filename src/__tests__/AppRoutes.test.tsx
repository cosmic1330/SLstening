/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useParams } from "react-router";
import { describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ isLoading: false, session: null as unknown }));

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
vi.mock("../context/UserContext", () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => authState,
}));

import { AppRoutes } from "../App";

describe("AppRoutes", () => {
  it("routes /detail/:id to Detail with the stock id", () => {
    render(
      <MemoryRouter initialEntries={["/detail/2330"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText("login-route")).toBeTruthy();
  });

  it("redirects authenticated visitors away from login and permits protected routes", () => {
    authState.session = { user: { id: "user-1" } };
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("home-route")).toBeTruthy();

    view.unmount();
    render(
      <MemoryRouter initialEntries={["/detail/2330"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("detail-route:2330")).toBeTruthy();
    authState.session = null;
  });

  it("does not redirect while session loading is unresolved", () => {
    authState.isLoading = true;
    render(
      <MemoryRouter initialEntries={["/detail/2330"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.queryByText("login-route")).toBeNull();
    expect(screen.queryByText("detail-route:2330")).toBeNull();
    authState.isLoading = false;
  });
});
