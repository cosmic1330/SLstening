import type { Location } from "react-router";

export const DEFAULT_AUTH_DESTINATION = "/dashboard";

export function isSafeInternalDestination(value: unknown): value is string {
  return typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.startsWith("/auth")
    && !value.startsWith("/login")
    && !value.startsWith("/register");
}

export function intendedDestination(state: unknown): string {
  const destination = (state as { from?: unknown } | null)?.from;
  return isSafeInternalDestination(destination) ? destination : DEFAULT_AUTH_DESTINATION;
}

export function currentDestination(location: Location) {
  return `${location.pathname}${location.search}${location.hash}`;
}
