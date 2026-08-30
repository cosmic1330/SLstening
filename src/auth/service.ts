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

const exchangedCallbackUrls = new Set<string>();

export async function exchangeOAuthCallback(client: SupabaseClient, rawUrl: string) {
  const callback = parseOAuthCallback(rawUrl);
  if (callback.kind !== "code") return callback;
  if (exchangedCallbackUrls.has(rawUrl)) return { kind: "invalid" } as OAuthCallback;

  exchangedCallbackUrls.add(rawUrl);
  const { error } = await client.auth.exchangeCodeForSession(callback.code);
  return error ? ({ kind: "error" } as OAuthCallback) : callback;
}

export async function startGoogleOAuth(client: SupabaseClient) {
  const options = isTauriDesktop()
    ? { redirectTo: DESKTOP_CALLBACK, skipBrowserRedirect: true }
    : { redirectTo: window.location.origin };
  return client.auth.signInWithOAuth({ provider: "google", options });
}
