/**
 * @vitest-environment jsdom
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authListener: undefined as
    | ((event: string, session: Session | null) => void)
    | undefined,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  establishNativeSession: vi.fn(),
  invalidateNativeSession: vi.fn(),
  clearNativeSession: vi.fn(),
  stockState: {
    accountUserId: null as string | null,
    accountEpoch: null as number | null,
    clearAccountProjection: vi.fn(),
    clearAccountProjectionIfCurrentUser: vi.fn(),
    initializeAccount: vi.fn(),
    setAccountSyncError: vi.fn(),
  },
}));

vi.mock("../../supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }),
      }),
    }),
  },
}));
vi.mock("../../auth/service", () => ({
  exchangeOAuthCallback: vi.fn(),
  removeLegacyPasswordStorage: vi.fn(),
  safeAuthErrorMessage: vi.fn(),
  signOutLocal: vi.fn(),
}));
vi.mock("../../auth/useTauriOAuthCallback", () => ({
  useTauriOAuthCallback: vi.fn(),
}));
vi.mock("../../account/native", () => ({
  isNativeRuntime: () => true,
  establishNativeSession: mocks.establishNativeSession,
  invalidateNativeSession: mocks.invalidateNativeSession,
  clearNativeSession: mocks.clearNativeSession,
}));
vi.mock("../../store/Stock.store", () => {
  const useStore = (selector: (state: typeof mocks.stockState) => unknown) =>
    selector(mocks.stockState);
  useStore.getState = () => mocks.stockState;
  return { default: useStore };
});

import { UserProvider, useUser } from "../UserContext";

const session = (id: string): Session =>
  ({
    access_token: `token-${id}`,
    expires_at: 1_800_000_000,
    user: { id, email: `${id}@example.com` },
  }) as Session;

function NativeErrorProbe() {
  const { nativeSessionError } = useUser();
  return <output>{nativeSessionError ?? "none"}</output>;
}

describe("UserProvider native session transitions", () => {
  beforeEach(() => {
    mocks.authListener = undefined;
    mocks.getSession.mockReset();
    mocks.onAuthStateChange.mockReset().mockImplementation((listener) => {
      mocks.authListener = listener;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mocks.establishNativeSession.mockReset();
    mocks.invalidateNativeSession.mockReset();
    mocks.clearNativeSession.mockReset();
    mocks.stockState.accountUserId = null;
    mocks.stockState.accountEpoch = null;
    mocks.stockState.clearAccountProjection.mockReset().mockImplementation(async () => {
      mocks.stockState.accountUserId = null;
      mocks.stockState.accountEpoch = null;
    });
    mocks.stockState.clearAccountProjectionIfCurrentUser.mockReset().mockImplementation(async (userId: string) => {
      if (mocks.stockState.accountUserId !== userId) return false;
      mocks.stockState.accountUserId = null;
      mocks.stockState.accountEpoch = null;
      return true;
    });
    mocks.stockState.initializeAccount.mockReset().mockImplementation(async (userId: string, epoch: number) => {
      mocks.stockState.accountUserId = userId;
      mocks.stockState.accountEpoch = epoch;
    });
    mocks.stockState.setAccountSyncError.mockReset();
  });

  it("does not let a deferred failed session clear a newer account", async () => {
    const userA = session("user-a");
    const userB = session("user-b");
    let resolveAInvalidation: (() => void) | undefined;
    const aInvalidation = new Promise<void>((resolve) => {
      resolveAInvalidation = resolve;
    });
    mocks.getSession.mockResolvedValue({ data: { session: userA }, error: null });
    mocks.invalidateNativeSession
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => aInvalidation)
      .mockResolvedValue(undefined);
    mocks.establishNativeSession.mockImplementation((current: Session) =>
      current.user.id === "user-a"
        ? Promise.reject(new Error("STALE_SESSION_TRANSITION"))
        : Promise.resolve({ epoch: 22 }),
    );

    render(<UserProvider><NativeErrorProbe /></UserProvider>);

    await waitFor(() =>
      expect(mocks.invalidateNativeSession).toHaveBeenCalledTimes(2),
    );
    expect(mocks.authListener).toBeTypeOf("function");
    act(() => mocks.authListener?.("SIGNED_IN", userB));

    await waitFor(() =>
      expect(mocks.stockState.initializeAccount).toHaveBeenCalledWith(
        "user-b",
        22,
      ),
    );
    expect(mocks.stockState.accountUserId).toBe("user-b");

    await act(async () => resolveAInvalidation?.());

    expect(mocks.stockState.accountUserId).toBe("user-b");
    expect(mocks.stockState.accountEpoch).toBe(22);
    expect(mocks.stockState.clearAccountProjectionIfCurrentUser).not.toHaveBeenCalledWith("user-a");
    expect(mocks.stockState.setAccountSyncError).not.toHaveBeenCalled();
    expect(screen.getByText("none")).toBeTruthy();
  });
});
