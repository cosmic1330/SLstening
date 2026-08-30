export type AuthErrorKey =
  | "invalidCredentials"
  | "emailAlreadyRegistered"
  | "emailNotConfirmed"
  | "oauthCancelled"
  | "oauthFailed"
  | "sessionUnavailable"
  | "generic";

export function authErrorKey(error: unknown): AuthErrorKey {
  const candidate = error as { code?: string; message?: string } | undefined;
  const code = candidate?.code?.toLowerCase();
  const message = candidate?.message?.toLowerCase() ?? "";
  if (code === "invalid_credentials" || message.includes("invalid login")) return "invalidCredentials";
  if (code === "user_already_exists" || message.includes("already registered")) return "emailAlreadyRegistered";
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) return "emailNotConfirmed";
  if (code === "access_denied" || message.includes("access_denied") || message.includes("cancel")) return "oauthCancelled";
  return "generic";
}
