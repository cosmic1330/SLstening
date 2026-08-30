/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, useParams } from "react-router";
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
vi.mock("../layout/AuthenticatedRuntime", () => ({
  default: () => <div data-testid="authenticated-runtime"><Outlet /></div>,
}));
vi.mock("../hooks/useMarketWatcher", () => ({ default: vi.fn() }));
vi.mock("../store/Stock.store", () => ({
  default: () => ({ reload: vi.fn() }),
}));
vi.mock("../context/UserContext", () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => authState,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { AppRoutes } from "../App";

describe("AppRoutes", () => {
  it("redirects unauthenticated detail visits to the lazy login route without mounting the authenticated runtime", async () => {
    render(
      <MemoryRouter initialEntries={["/detail/2330"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("login-route")).toBeTruthy();
    expect(screen.queryByTestId("authenticated-runtime")).toBeNull();
  });

  it("redirects authenticated visitors away from login and mounts the runtime once for protected routes", async () => {
    authState.session = { user: { id: "user-1" } };
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByText("home-route")).toBeTruthy();
    expect(screen.getByTestId("authenticated-runtime")).toBeTruthy();

    view.unmount();
    render(
      <MemoryRouter initialEntries={["/detail/2330"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByText("detail-route:2330")).toBeTruthy();
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
