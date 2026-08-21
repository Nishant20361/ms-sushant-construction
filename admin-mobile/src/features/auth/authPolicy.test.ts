import { describe, expect, it } from "vitest";
import { AdminAppError } from "@/types/errors";
import { authErrorMessage, validateResetPassword } from "./authMessages";
import { shouldInvalidateSession, shouldRetryCsrf, startupOutcome } from "./authPolicy";

describe("native Admin auth policy", () => {
  it("routes unauthenticated startup to login and valid restoration to protected state", () => {
    expect(startupOutcome("unauthorized")).toBe("unauthenticated");
    expect(startupOutcome("valid")).toBe("authenticated");
  });
  it("keeps offline startup unverified rather than deleting a possible cookie session", () => expect(startupOutcome("network-error")).toBe("offline-unverified"));
  it("invalidates centrally on 401 but not login 401, 403, or 429", () => {
    expect(shouldInvalidateSession(401)).toBe(true);
    expect(shouldInvalidateSession(401, true)).toBe(false);
    expect(shouldInvalidateSession(403)).toBe(false);
    expect(shouldInvalidateSession(429)).toBe(false);
  });
  it("retries only the exact CSRF rejection once", () => {
    expect(shouldRetryCsrf(403, "CSRF token missing or invalid", false)).toBe(true);
    expect(shouldRetryCsrf(403, "Forbidden", false)).toBe(false);
    expect(shouldRetryCsrf(403, "CSRF token missing or invalid", true)).toBe(false);
  });
  it("maps invalid credentials and rate limits to safe login messages", () => {
    expect(authErrorMessage(new AdminAppError("unauthorized", "backend"), "login")).toBe("Invalid username or password.");
    expect(authErrorMessage(new AdminAppError("rate_limited", "backend"), "login")).toContain("Too many sign-in attempts");
  });
  it("validates reset length and confirmation", () => {
    expect(validateResetPassword("short", "short")).toContain("12–128");
    expect(validateResetPassword("long-enough-password", "different-password")).toBe("Passwords do not match.");
    expect(validateResetPassword("long-enough-password", "long-enough-password")).toBeNull();
  });
});
