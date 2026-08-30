import { describe, expect, it } from "vitest";
import { authErrorKey } from "./errors";
import { currentDestination, intendedDestination, isSafeInternalDestination } from "./navigation";

describe("auth navigation and safe error mapping", () => {
  it("retains internal path, search and hash while rejecting unsafe destinations", () => {
    expect(currentDestination({ pathname: "/detail/2330", search: "?tab=chart", hash: "#cci" } as never)).toBe("/detail/2330?tab=chart#cci");
    expect(isSafeInternalDestination("/detail/2330?tab=chart#cci")).toBe(true);
    ["/auth/login", "/login", "//evil.example", "https://evil.example", "javascript:alert(1)"].forEach((value) => expect(isSafeInternalDestination(value)).toBe(false));
    expect(intendedDestination({ from: "//evil.example" })).toBe("/dashboard");
  });

  it("maps known Supabase failures and uses a generic safe fallback", () => {
    expect(authErrorKey({ code: "invalid_credentials" })).toBe("invalidCredentials");
    expect(authErrorKey({ code: "user_already_exists" })).toBe("emailAlreadyRegistered");
    expect(authErrorKey({ message: "unknown server wording" })).toBe("generic");
  });
});
