import { afterEach, describe, expect, it, vi } from "vitest";
import { callAgentRouter } from "../src/construction_ai/agentRouter.js";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("external AI provider isolation", () => {
  it("never calls AgentRouter in test mode, even if credentials are supplied", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(callAgentRouter("model", [], "test-key")).rejects.toThrow(/disabled in test mode/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("fails immediately when no provider key is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(callAgentRouter("model", [], "")).rejects.toThrow(/not configured/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
