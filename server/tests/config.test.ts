import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("CLIENT_URL", "https://shop.example.com");
  vi.stubEnv("DATABASE_URL", "postgresql://user@localhost/app");
  vi.stubEnv("JWT_SECRET", "39e0a805b7924711b6f924ad2f375bde877a9123735434e9");
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("production configuration", () => {
  it.each(["", "short-secret", "change-me-to-a-long-random-string-123"])("rejects unsafe JWT configuration: %s", async (value) => {
    vi.stubEnv("JWT_SECRET", value);
    await expect(import("../src/config.js")).rejects.toThrow(/JWT_SECRET/);
  });
  it.each(["", "http://shop.example.com", "https://user:pass@shop.example.com", "https://shop.example.com/path", "https://shop.example.com?query=1"])("rejects invalid frontend origins: %s", async (value) => {
    vi.stubEnv("CLIENT_URL", value);
    await expect(import("../src/config.js")).rejects.toThrow(/CLIENT_URL/);
  });
  it("normalizes a trailing slash so CORS matches the browser Origin header", async () => {
    vi.stubEnv("CLIENT_URL", "https://shop.example.com/");
    expect((await import("../src/config.js")).config.clientUrl).toBe("https://shop.example.com");
  });
  it("requires a PostgreSQL connection URL", async () => {
    vi.stubEnv("DATABASE_URL", "file:./dev.db");
    await expect(import("../src/config.js")).rejects.toThrow(/DATABASE_URL/);
  });
});
