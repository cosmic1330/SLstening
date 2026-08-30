import type { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { exchangeOAuthCallback, removeLegacyPasswordStorage } from "../auth/service";
import { useTauriOAuthCallback } from "../auth/useTauriOAuthCallback";
import { supabase } from "../supabase";

type OAuthCallbackStatus = "idle" | "processing" | "error";

interface UserContextType {
  isPaid: boolean;
  session: Session | null;
  isLoading: boolean;
  initError: boolean;
  retrySessionInitialization: () => void;
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

  return (
    <UserContext.Provider value={{ isPaid, session, isLoading, initError, retrySessionInitialization, oauthCallbackStatus }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error("useUser must be used within a UserProvider");
  return context;
};
