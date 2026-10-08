import type { SupabaseClient } from "@supabase/supabase-js";

export const REMEMBERED_EMAIL_KEY = "slitenting-email";
const LEGACY_PASSWORD_KEYS = ["slitenting-password", "slistening-password"];
const DESKTOP_CALLBACK = "slistening://auth/callback";

export type OAuthCallback =
  | { kind: "code"; code: string }
  | { kind: "error" }
  | { kind: "invalid" };

export function removeLegacyPasswordStorage(storage: Storage | undefined = globalThis.localStorage) {
  LEGACY_PASSWORD_KEYS.forEach((key) => storage?.removeItem(key));
}

export function rememberedEmail(storage: Storage | undefined = globalThis.localStorage) {
  return storage?.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

export function saveRememberedEmail(remember: boolean, email: string, storage: Storage | undefined = globalThis.localStorage) {
  if (remember) storage?.setItem(REMEMBERED_EMAIL_KEY, email);
  else storage?.removeItem(REMEMBERED_EMAIL_KEY);
}

const AUTH_ERROR_FALLBACK = "Unable to sign out. Please try again.";

/**
 * Keep authentication failures useful to the UI without allowing token or
 * authorization material from an SDK error to reach the screen.
 */
export function safeAuthErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!rawMessage.trim()) return AUTH_ERROR_FALLBACK;

  const sanitized = rawMessage
    .replace(/bearer\s+[^\s,;]+/gi, "authorization redacted")
    .replace(/(["']?(?:access_token|refresh_token|authorization|token|jwt)["']?\s*[:=]\s*["']?)[^"',;\s}]+/gi, "$1[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return sanitized || AUTH_ERROR_FALLBACK;
}

/** Sign out only this persisted Supabase session. */
export async function signOutLocal(client: Pick<SupabaseClient, "auth">): Promise<void> {
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw error;
}

export function isTauriDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function parseOAuthCallback(rawUrl: string): OAuthCallback {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "slistening:" || url.host !== "auth" || url.pathname !== "/callback") {
      return { kind: "invalid" };
    }
    if (url.searchParams.has("error")) return { kind: "error" };
    const code = url.searchParams.get("code");
    return code ? { kind: "code", code } : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

const inFlightExchanges = new Map<string, Promise<OAuthCallback>>();
const completedExchangeCodes = new Set<string>();
const MAX_EXCHANGED_CODES = 32;

export async function exchangeOAuthCallback(client: SupabaseClient, rawUrl: string) {
  const callback = parseOAuthCallback(rawUrl);
  if (callback.kind !== "code") return callback;
  if (completedExchangeCodes.has(callback.code)) return callback;
  const existing = inFlightExchanges.get(callback.code);
  if (existing) return existing;
  let exchange: Promise<OAuthCallback>;
  const removeInFlight = () => {
    if (inFlightExchanges.get(callback.code) === exchange) inFlightExchanges.delete(callback.code);
  };
  exchange = Promise.resolve()
    .then(() => client.auth.exchangeCodeForSession(callback.code))
    .then(({ error }) => {
      if (error) {
        removeInFlight();
        return { kind: "error" } as OAuthCallback;
      }
      completedExchangeCodes.delete(callback.code);
      completedExchangeCodes.add(callback.code);
      if (completedExchangeCodes.size > MAX_EXCHANGED_CODES) completedExchangeCodes.delete(completedExchangeCodes.values().next().value!);
      return callback;
    })
    .catch(() => {
      removeInFlight();
      return { kind: "error" } as OAuthCallback;
    })
    .finally(() => {
      if (inFlightExchanges.get(callback.code) === exchange) inFlightExchanges.delete(callback.code);
    });
  inFlightExchanges.set(callback.code, exchange);
  return exchange;
}

export async function startGoogleOAuth(client: SupabaseClient) {
  const options = isTauriDesktop()
    ? { redirectTo: DESKTOP_CALLBACK, skipBrowserRedirect: true }
    : { redirectTo: window.location.origin };
  return client.auth.signInWithOAuth({ provider: "google", options });
}
