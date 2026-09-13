import { describe, expect, it } from "vitest";
import { assertTestDatabaseUrl } from "./databaseSafety.js";

describe("test database guard", () => {
  it("rejects absent, remote and non-test databases", () => {
    for (const value of [undefined, "postgresql://user@production.example/app_test", "postgresql://user@localhost/app", "postgresql://localhost/app_test"]) {
      expect(() => assertTestDatabaseUrl(value)).toThrow();
    }
  });
  it("rejects the same database despite different users, host aliases or schema parameters", () => {
    expect(() => assertTestDatabaseUrl("postgresql://tester@localhost/app_test?schema=test", "postgresql://admin@127.0.0.1:5432/app_test?schema=public")).toThrow(/application database/);
  });
  it("accepts an explicitly separate local test database", () => {
    const url = "postgresql://tester@127.0.0.1:55439/app_test";
    expect(assertTestDatabaseUrl(url, "postgresql://tester@localhost:55439/app_dev")).toBe(url);
  });
});
