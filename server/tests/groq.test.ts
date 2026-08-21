import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createCompletion } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = { completions: { create: createCompletion } };
  },
}));

import {
  askGroq,
  categorizeGroqError,
  GROQ_FALLBACK_MODEL,
  GROQ_PRIMARY_MODEL,
  GroqError,
} from "../src/construction_ai/groq.js";

const originalPrimaryModel = process.env.GROQ_PRIMARY_MODEL;
const originalFallbackModel = process.env.GROQ_FALLBACK_MODEL;
const originalApiKey = process.env.GROQ_API_KEY;
const originalAllowTestRequests = process.env.GROQ_ALLOW_TEST_REQUESTS;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  createCompletion.mockReset();
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_ALLOW_TEST_REQUESTS = "true";
  delete process.env.GROQ_PRIMARY_MODEL;
  delete process.env.GROQ_FALLBACK_MODEL;
});

afterEach(() => {
  restoreEnv("GROQ_PRIMARY_MODEL", originalPrimaryModel);
  restoreEnv("GROQ_FALLBACK_MODEL", originalFallbackModel);
  restoreEnv("GROQ_API_KEY", originalApiKey);
  restoreEnv("GROQ_ALLOW_TEST_REQUESTS", originalAllowTestRequests);
  vi.restoreAllMocks();
});

describe("Groq primary and fallback requests", () => {
  it("returns a successful primary response without requesting the fallback", async () => {
    createCompletion.mockResolvedValueOnce({ choices: [{ message: { content: "primary ok" } }] });

    await expect(askGroq("prompt")).resolves.toEqual({ text: "primary ok", model: GROQ_PRIMARY_MODEL });
    expect(createCompletion).toHaveBeenCalledTimes(1);
    expect(createCompletion.mock.calls[0][0].model).toBe(GROQ_PRIMARY_MODEL);
  });

  it("sends the fallback model in the second request after a primary 404", async () => {
    process.env.GROQ_PRIMARY_MODEL = "model-a";
    process.env.GROQ_FALLBACK_MODEL = "model-b";
    createCompletion
      .mockRejectedValueOnce({ status: 404, code: "model_not_found", message: "model not found" })
      .mockResolvedValueOnce({ choices: [{ message: { content: "fallback ok" } }] });

    await expect(askGroq("prompt")).resolves.toEqual({ text: "fallback ok", model: "model-b" });
    expect(createCompletion).toHaveBeenCalledTimes(2);
    expect(createCompletion.mock.calls.map(([body]) => body.model)).toEqual(["model-a", "model-b"]);
  });

  it("uses at most primary then fallback when both models fail", async () => {
    createCompletion
      .mockRejectedValueOnce({ status: 500, message: "primary failed" })
      .mockRejectedValueOnce({ status: 500, message: "fallback failed" });

    await expect(askGroq("prompt")).rejects.toMatchObject({
      category: "SERVER_ERROR",
      model: GROQ_FALLBACK_MODEL,
    });
    expect(createCompletion).toHaveBeenCalledTimes(2);
    expect(createCompletion.mock.calls.map(([body]) => body.model)).toEqual([
      GROQ_PRIMARY_MODEL,
      GROQ_FALLBACK_MODEL,
    ]);
  });

  it("does not try a fallback after a 401", async () => {
    createCompletion.mockRejectedValueOnce({ status: 401, message: "unauthorized" });

    await expect(askGroq("prompt")).rejects.toMatchObject({ category: "UNAUTHORIZED" });
    expect(createCompletion).toHaveBeenCalledTimes(1);
  });

  it("never exceeds one fallback for rate-limit and timeout failures", async () => {
    createCompletion.mockRejectedValue({ status: 429, message: "rate_limit" });
    await expect(askGroq("prompt")).rejects.toMatchObject({ category: "RATE_LIMIT" });
    expect(createCompletion).toHaveBeenCalledTimes(2);

    createCompletion.mockReset();
    createCompletion.mockRejectedValue({ name: "AbortError", message: "aborted" });
    await expect(askGroq("prompt")).rejects.toMatchObject({ category: "TIMEOUT" });
    expect(createCompletion).toHaveBeenCalledTimes(2);
  });

  it("logs the actual attempted fallback model without prompt content", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createCompletion.mockRejectedValue({ status: 404, code: "model_not_found", message: "not found" });

    await expect(askGroq("private customer prompt")).rejects.toBeInstanceOf(GroqError);
    expect(errorSpy).toHaveBeenLastCalledWith(
      "[Groq] request failed",
      expect.objectContaining({ model: GROQ_FALLBACK_MODEL, category: "MODEL_NOT_FOUND" })
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private customer prompt");
  });
});

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
