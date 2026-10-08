/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import useUIStore from "../../../store/UI.store";

const mocks = vi.hoisted(() => ({
  stockState: {
    accountUserId: null,
    hydrated: false,
    indicatorSettings: {},
    updateIndicatorSetting: vi.fn(),
    resetIndicatorSettings: vi.fn(),
    update_menu: vi.fn(),
  },
  stockStore: vi.fn(),
  download: {
    disable: false,
    handleDownloadMenu: vi.fn(),
  },
  setAlwaysOnTop: vi.fn(),
  user: {
    session: { user: { email: "person@example.com" } },
    signOut: vi.fn().mockResolvedValue(undefined),
    isSigningOut: false,
    signOutError: null as string | null,
  },
}));
mocks.stockStore.mockImplementation((selector?: (state: typeof mocks.stockState) => unknown) => (
  selector ? selector(mocks.stockState) : mocks.stockState
));

vi.mock("../../../hooks/useDownloadStocks", () => ({
  default: () => mocks.download,
}));

vi.mock("../../../store/debug.store", () => ({
  default: () => ({ isVisible: false, toggleVisibility: vi.fn() }),
}));

vi.mock("../../../context/UserContext", () => ({
  useUser: () => mocks.user,
}));

vi.mock("../../../supabase", () => ({
  supabase: { auth: {} },
}));

vi.mock("../../../store/Stock.store", () => ({
  default: mocks.stockStore,
}));

vi.mock("../../../account/native", () => ({
  clearNativeSession: vi.fn(),
  establishNativeSession: vi.fn(),
  invalidateNativeSession: vi.fn(),
  isNativeRuntime: vi.fn(() => false),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({ setAlwaysOnTop: mocks.setAlwaysOnTop })),
}));

import Setting from ".";

const renderSetting = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/setting"]}>
      <Setting />
    </MemoryRouter>,
  );

const openDisclosure = (name: RegExp) => {
  const summary = screen.getByRole("button", { name });
  if (summary.getAttribute("aria-expanded") !== "true") fireEvent.click(summary);
  return summary;
};

beforeEach(async () => {
  localStorage.clear();
  useUIStore.setState({ stockBoxChartType: "tick" });
  mocks.download.disable = false;
  mocks.download.handleDownloadMenu.mockReset();
  mocks.setAlwaysOnTop.mockReset();
  mocks.user.session = { user: { email: "person@example.com" } };
  mocks.user.signOut.mockReset();
  mocks.user.signOut.mockResolvedValue(undefined);
  mocks.user.isSigningOut = false;
  mocks.user.signOutError = null;
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

describe("Settings page", () => {
  it("renders a calm hierarchy with accessible controls and collapsed sections", () => {
    renderSetting();

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Application" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Show market information/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Data & diagnostics" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: /Technical indicator settings/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByLabelText("Always on top")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "CNN Fear & Greed" })).toBeNull();
    expect(screen.getByRole("button", { name: "Live" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Candlestick" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("persists the selected stock card chart type through the UI store", () => {
    renderSetting();

    fireEvent.click(screen.getByRole("button", { name: "Candlestick" }));

    expect(useUIStore.getState().stockBoxChartType).toBe("mak");
    expect(localStorage.getItem("slitenting-stockbox-chart")).toBe("mak");
    expect(screen.getByRole("button", { name: "Candlestick" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("writes the existing always-on-top key and calls the Tauri window API", () => {
    renderSetting();

    fireEvent.click(screen.getByLabelText("Always on top"));

    expect(localStorage.getItem("slitenting-alwaysOnTop")).toBe("true");
    expect(mocks.setAlwaysOnTop).toHaveBeenCalledWith(true);
  });

  it("falls back to all seven market modules when stored visibility is malformed", () => {
    localStorage.setItem("slitenting-market-info-visibility", "{not-json");
    renderSetting();
    openDisclosure(/Show market information/);

    [
      "CNN Fear & Greed",
      "MacroMicro",
      "NASDAQ",
      "TAIEX",
      "TPEx",
      "TAIEX futures",
      "Taiwan margin maintenance ratio",
    ].forEach((label) => {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(true);
    });
  });

  it("persists market visibility with the existing seven-key JSON shape", () => {
    renderSetting();
    openDisclosure(/Show market information/);

    fireEvent.click(screen.getByLabelText("NASDAQ"));

    const saved = JSON.parse(localStorage.getItem("slitenting-market-info-visibility") ?? "{}");
    expect(Object.keys(saved).sort()).toEqual(["cnn", "margin", "mm", "nasdaq", "otc", "twse", "wtx"]);
    expect(saved.nasdaq).toBe(false);
  });

  it("edits and resets an indicator without using the obsolete settings key", () => {
    renderSetting();
    openDisclosure(/Technical indicator settings/);

    const ma5 = screen.getByRole("spinbutton", { name: "Short MA (5)" }) as HTMLInputElement;
    fireEvent.change(ma5, { target: { value: "17" } });
    expect(localStorage.getItem("slitenting-indicator-settings")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(ma5.value).toBe("5");
    expect(localStorage.getItem("slitenting-indicator-settings")).toBeNull();
  });

  it("keeps the update action readable while busy", () => {
    mocks.download.disable = true;
    renderSetting();
    openDisclosure(/Data & diagnostics/);

    const update = screen.getByRole("button", { name: /Updating/ });
    expect(update.getAttribute("aria-busy")).toBe("true");
    expect(update.textContent).toContain("Updating");
  });

  it("shows the signed-in account and starts local sign-out", () => {
    renderSetting();

    expect(screen.getByRole("heading", { name: "Account" })).toBeTruthy();
    expect(screen.getByText("person@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(mocks.user.signOut).toHaveBeenCalledTimes(1);
  });

  it("disables the logout action while sign-out is pending", () => {
    mocks.user.isSigningOut = true;
    renderSetting();

    const logout = screen.getByRole("button", { name: "Signing out…" });
    expect((logout as HTMLButtonElement).disabled).toBe(true);
    expect(logout.getAttribute("aria-busy")).toBe("true");
  });

  it("shows a safe sign-out error while keeping the account visible", () => {
    mocks.user.signOutError = "Network unavailable";
    renderSetting();

    expect(screen.getByRole("alert").textContent).toContain("Could not sign out: Network unavailable");
    expect(screen.getByText("person@example.com")).toBeTruthy();
  });

  it("changes the i18next language from the explicit language options", async () => {
    renderSetting();

    fireEvent.click(screen.getByRole("button", { name: "Traditional Chinese" }));

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("zh-TW"));
    expect(screen.getByRole("heading", { name: "偏好設定" })).toBeTruthy();
    expect(localStorage.getItem("i18nextLng")).toBe("zh-TW");
  });
});
