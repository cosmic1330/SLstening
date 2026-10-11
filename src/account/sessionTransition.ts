const SAFE_NATIVE_SESSION_CODES = [
  "STALE_SESSION_TRANSITION",
  "SESSION_LOCK",
  "INVALID_USER_ID",
] as const;

export type SafeNativeSessionCode =
  | (typeof SAFE_NATIVE_SESSION_CODES)[number]
  | "UNKNOWN_NATIVE_SESSION_ERROR";

/**
 * Produces a session transition that is monotonic inside a WebView and starts
 * at the current epoch on every new WebView instance.
 */
export function nextSessionTransition(
  current: number,
  now = Date.now(),
): number {
  const previous =
    Number.isSafeInteger(current) && current >= 0 ? current : 0;
  const epoch = Number.isFinite(now) ? Math.max(0, Math.trunc(now)) : 0;
  return Math.max(previous + 1, epoch);
}

/**
 * Native errors can include platform paths or other implementation details.
 * Keep only known, stable error codes when crossing into the UI.
 */
export function sanitizeNativeSessionError(
  error: unknown,
): SafeNativeSessionCode {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    SAFE_NATIVE_SESSION_CODES.find((code) => message.includes(code)) ??
    "UNKNOWN_NATIVE_SESSION_ERROR"
  );
}
