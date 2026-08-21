import { describe, expect, it, vi } from "vitest";
import { categorizeGroqError, GroqError } from "../src/construction_ai/groq.js";

describe("Groq error categorization & safe logging", () => {
  it("categorizes 401 as UNAUTHORIZED", () => {
    const err = categorizeGroqError({ status: 401, message: "Invalid API Key" }, "llama-3.1-8b-instant", 120);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.category).toBe("UNAUTHORIZED");
    expect(err.status).toBe(401);
  });

  it("categorizes 403 as FORBIDDEN", () => {
    const err = categorizeGroqError({ status: 403, message: "Permission denied" }, "llama-3.1-8b-instant", 100);
    expect(err.category).toBe("FORBIDDEN");
    expect(err.status).toBe(403);
  });

  it("categorizes 404 as MODEL_NOT_FOUND", () => {
    const err = categorizeGroqError(
      { status: 404, code: "model_not_found", message: "The model does not exist" },
      "llama-3.1-8b-instant",
      85
    );
    expect(err.category).toBe("MODEL_NOT_FOUND");
    expect(err.status).toBe(404);
  });

  it("categorizes 429 as RATE_LIMIT", () => {
    const err = categorizeGroqError({ status: 429, message: "Rate limit reached" }, "llama-3.1-8b-instant", 200);
    expect(err.category).toBe("RATE_LIMIT");
    expect(err.status).toBe(429);
  });

  it("categorizes 500 as SERVER_ERROR", () => {
    const err = categorizeGroqError({ status: 500, message: "Internal server error" }, "llama-3.1-8b-instant", 350);
    expect(err.category).toBe("SERVER_ERROR");
    expect(err.status).toBe(500);
  });

  it("categorizes AbortError as TIMEOUT", () => {
    const err = categorizeGroqError({ name: "AbortError", message: "The operation was aborted" }, "llama-3.1-8b-instant", 25000);
    expect(err.category).toBe("TIMEOUT");
  });

  it("categorizes fetch error as NETWORK_ERROR", () => {
    const err = categorizeGroqError(new Error("fetch failed"), "llama-3.1-8b-instant", 500);
    expect(err.category).toBe("NETWORK_ERROR");
  });

  it("does not leak API key in error messages or properties", () => {
    const err = categorizeGroqError({ status: 401, message: "Invalid API Key: gsk_secret_key_123" }, "llama-3.1-8b-instant", 50);
    expect(err.message).not.toContain("gsk_secret_key_123");
    expect(err.message).toBe("Invalid Groq API key (401)");
  });
});
