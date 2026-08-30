/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import {
  exchangeOAuthCallback,
  parseOAuthCallback,
  removeLegacyPasswordStorage,
} from "./service";

describe("authentication storage and OAuth callbacks", () => {
  it("removes legacy plaintext password keys without touching other storage", () => {
    localStorage.setItem("slitenting-password", "unsafe");
    localStorage.setItem("slistening-password", "unsafe");
    localStorage.setItem("slitenting-email", "person@example.com");

    removeLegacyPasswordStorage();

    expect(localStorage.getItem("slitenting-password")).toBeNull();
    expect(localStorage.getItem("slistening-password")).toBeNull();
    expect(localStorage.getItem("slitenting-email")).toBe("person@example.com");
  });

  it("accepts only the configured callback URL and code", () => {
    expect(parseOAuthCallback("slistening://auth/callback?code=abc")).toEqual({ kind: "code", code: "abc" });
    expect(parseOAuthCallback("https://auth/callback?code=abc")).toEqual({ kind: "invalid" });
    expect(parseOAuthCallback("slistening://other/callback?code=abc")).toEqual({ kind: "invalid" });
    expect(parseOAuthCallback("slistening://auth/other?code=abc")).toEqual({ kind: "invalid" });
    expect(parseOAuthCallback("slistening://auth/callback")).toEqual({ kind: "invalid" });
    expect(parseOAuthCallback("slistening://auth/callback?error=access_denied")).toEqual({ kind: "error" });
  });

  it("exchanges each callback URL only once", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { exchangeCodeForSession } } as never;
    const url = "slistening://auth/callback?code=only-once";

    await exchangeOAuthCallback(client, url);
    await exchangeOAuthCallback(client, url);

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("only-once");
  });
});
