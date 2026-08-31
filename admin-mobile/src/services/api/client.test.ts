import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApiClient } from "./client";

vi.mock("@/config/environment", () => ({ environment: { apiBaseUrl: "https://example.com/api", requestTimeoutMs: 15_000 } }));
vi.mock("./cookieTransport", () => ({ nativeCookieAuthTransport: {} }));

describe("AdminApiClient cancellation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passes an already-aborted caller signal to fetch as aborted", async () => {
    const caller = new AbortController();
    caller.abort();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(true);
      return Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const auth = { prepareRequest: vi.fn().mockResolvedValue({ headers: {}, credentials: "include" }) };
    const client = new AdminApiClient("https://example.com/api", auth as never);

    await expect(client.request("/admin/dashboard", { signal: caller.signal })).rejects.toMatchObject({ kind: "timeout" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
