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

  it("deduplicates concurrent and equivalent callback deliveries by authorization code", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { exchangeCodeForSession } } as never;
    const url = "slistening://auth/callback?code=only-once";

    const first = exchangeOAuthCallback(client, url);
    const second = exchangeOAuthCallback(client, "slistening://auth/callback?extra=value&code=only-once");
    await Promise.all([first, second]);
    await exchangeOAuthCallback(client, url);

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("only-once");
  });

  it("keeps all pending exchanges while capacity only limits completed codes", async () => {
    const exchangeCodeForSession = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const client = { auth: { exchangeCodeForSession } } as never;
    const pending = Array.from({ length: 33 }, (_, index) => exchangeOAuthCallback(client, `slistening://auth/callback?code=pending-${index}`));
    await Promise.resolve();
    const duplicate = exchangeOAuthCallback(client, "slistening://auth/callback?code=pending-0&extra=1");
    await Promise.resolve();
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(33);
    void Promise.all([...pending, duplicate]);
  });

  it("allows retry after resolved or rejected exchange failures", async () => {
    const exchangeCodeForSession = vi.fn()
      .mockResolvedValueOnce({ error: new Error("failed") })
      .mockResolvedValueOnce({ error: null })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ error: null });
    const client = { auth: { exchangeCodeForSession } } as never;
    const resolvedError = "slistening://auth/callback?code=resolved-error";
    const rejectedError = "slistening://auth/callback?code=rejected-error";
    expect(await exchangeOAuthCallback(client, resolvedError)).toEqual({ kind: "error" });
    expect(await exchangeOAuthCallback(client, resolvedError)).toEqual({ kind: "code", code: "resolved-error" });
    expect(await exchangeOAuthCallback(client, rejectedError)).toEqual({ kind: "error" });
    expect(await exchangeOAuthCallback(client, rejectedError)).toEqual({ kind: "code", code: "rejected-error" });
  });
});
