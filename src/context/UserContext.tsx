import type { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { exchangeOAuthCallback, removeLegacyPasswordStorage } from "../auth/service";
import { useTauriOAuthCallback } from "../auth/useTauriOAuthCallback";
import { supabase } from "../supabase";
import { clearNativeSession, establishNativeSession, invalidateNativeSession, isNativeRuntime } from "../account/native";
import useStocksStore from "../store/Stock.store";

type OAuthCallbackStatus = "idle" | "processing" | "error";

interface UserContextType {
  isPaid: boolean;
  session: Session | null;
  isLoading: boolean;
  initError: boolean;
  retrySessionInitialization: () => void;
  nativeSessionError: string | null;
  retryNativeSession: () => void;
  oauthCallbackStatus: OAuthCallbackStatus;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [oauthCallbackStatus, setOauthCallbackStatus] = useState<OAuthCallbackStatus>("idle");
  const [initError, setInitError] = useState(false);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [nativeSessionError, setNativeSessionError] = useState<string | null>(null);
  const [nativeSessionRetry, setNativeSessionRetry] = useState(0);

  useEffect(() => {
    removeLegacyPasswordStorage();
    let active = true;
    void supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (active) {
        setSession(initialSession);
        setInitError(Boolean(error));
        setIsLoading(false);
      }
    }).catch(() => {
      if (active) {
        setInitError(true);
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [initializationAttempt]);

  const retrySessionInitialization = useCallback(() => {
    setInitError(false);
    setIsLoading(true);
    setInitializationAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setIsPaid(false);
      return;
    }
    let active = true;
    void supabase
      .from("profiles")
      .select("plan_tier")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data: profile, error }) => {
        if (!active) return;
        if (error) console.error("Error fetching profile:", error);
        // Preserve the existing entitlement behavior until premium enforcement is in scope.
        setIsPaid(Boolean(profile) || !error);
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const handleOAuthUrl = useCallback(async (url: string) => {
    setOauthCallbackStatus("processing");
    try {
      const result = await exchangeOAuthCallback(supabase, url);
      setOauthCallbackStatus(result.kind === "code" ? "idle" : "error");
    } catch {
      setOauthCallbackStatus("error");
    }
  }, []);

  useTauriOAuthCallback(handleOAuthUrl);

  const sessionTransition = useRef(0);
  const previousUserId = useRef<string | null>(null);
  const retryNativeSession = useCallback(() => {
    // Keep the error visible until the new native session has been
    // established. This lets AccountSyncNotice remain actionable while the
    // retry is in flight.
    setNativeSessionRetry((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!isNativeRuntime()) return;
    const userId = session?.user.id ?? null;
    const userChanged = previousUserId.current !== userId;
    previousUserId.current = userId;
    if (userChanged) {
      sessionTransition.current += 1;
      setNativeSessionError(null);
      void useStocksStore.getState().clearAccountProjection();
    }
    const transition = sessionTransition.current;
    if (!session) {
      if (!userChanged) return;
      void (async () => {
        try {
          await clearNativeSession(transition);
        } catch (error) {
          // A failed clear must still revoke the gateway session before the
          // logged-out projection is considered safe to expose.
          console.error("Failed to clear native account session", error);
          try { await invalidateNativeSession(transition); } catch (invalidationError) {
            console.error("Failed to invalidate native account session", invalidationError);
          }
        } finally {
          if (sessionTransition.current === transition) await useStocksStore.getState().clearAccountProjection();
        }
      })();
      return;
    }
    void (async () => {
      try {
        // Invalidate the previous account before setting a new one. This
        // closes the interval in which the local MCP gateway could otherwise
        // observe the old session during an account switch.
        if (userChanged || nativeSessionRetry > 0) await invalidateNativeSession(transition);
        const nativeSession = await establishNativeSession(session, transition);
        if (!nativeSession || sessionTransition.current !== transition) return;
        setNativeSessionError(null);
        const projectionUserId = useStocksStore.getState().accountUserId;
        if (userChanged || nativeSessionRetry > 0 || projectionUserId !== session.user.id) {
          await useStocksStore.getState().hydrateAccount(session.user.id, nativeSession.epoch);
        }
        if (nativeSessionRetry > 0) setNativeSessionRetry(0);
      } catch (error) {
        if (sessionTransition.current === transition) {
          console.error("Failed to establish native account session", error);
          const message = error instanceof Error ? error.message : String(error);
          try { await invalidateNativeSession(transition); } catch (invalidationError) {
            console.error("Failed to invalidate native account session", invalidationError);
          }
          await useStocksStore.getState().clearAccountProjection();
          useStocksStore.getState().setAccountSyncError(message);
          setNativeSessionError(message);
        }
      }
    })();
    return userChanged || nativeSessionRetry > 0 ? () => {
      // Incrementing before the next effect body prevents a delayed token
      // verification or hydration from publishing into the next account.
      sessionTransition.current += 1;
    } : undefined;
  }, [session?.access_token, session?.expires_at, session?.user.id, nativeSessionRetry]);

  return (
    <UserContext.Provider value={{ isPaid, session, isLoading, initError, retrySessionInitialization, nativeSessionError, retryNativeSession, oauthCallbackStatus }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error("useUser must be used within a UserProvider");
  return context;
};

/**
 * Runtime-only surfaces such as the route harness may render outside the
 * provider while they are being tested or embedded.  They must not invent an
 * authenticated session, but they can still render their child route.
 */
export const useOptionalUser = () => useContext(UserContext);
