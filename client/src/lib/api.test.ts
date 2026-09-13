import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("web API security and checkout", () => {
  it("shares CSRF initialization between simultaneous mutations", async () => {
    const fetch = vi.fn(async (url: string) => url.endsWith("/csrf") ? json({ token: "shared-token" }) : json({ admin: {} }));
    vi.stubGlobal("fetch", fetch);
    const { adminApi } = await import("./api");
    await Promise.all([adminApi.login("one", "password"), adminApi.login("two", "password")]);
    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/csrf"))).toHaveLength(1);
  });

  it("refreshes stale CSRF once and preserves the checkout idempotency key", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ token: "old-token" }))
      .mockResolvedValueOnce(json({ error: "CSRF token missing or invalid" }, 403))
      .mockResolvedValueOnce(json({ token: "new-token" }))
      .mockResolvedValueOnce(json({ order: { orderNumber: "MSC-ONE" } }, 201));
    vi.stubGlobal("fetch", fetch);
    const { publicApi } = await import("./api");
    await publicApi.placeOrder({ customerName: "Customer", customerMobile: "9876543210", deliveryAddress: "", items: [{ productId: 1, quantity: 1 }] }, "checkout-retry-key");
    expect(fetch).toHaveBeenCalledTimes(4);
    const first = fetch.mock.calls[1][1] as RequestInit;
    const retry = fetch.mock.calls[3][1] as RequestInit;
    expect(new Headers(retry.headers).get("X-CSRF-Token")).toBe("new-token");
    expect(new Headers(first.headers).get("Idempotency-Key")).toBe("checkout-retry-key");
    expect(new Headers(retry.headers).get("Idempotency-Key")).toBe("checkout-retry-key");
    expect(retry.body).toBe(first.body);
  });

  it("does not retry a rejected login or a failed write", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ token: "token" })).mockResolvedValueOnce(json({ error: "Invalid username or password" }, 401));
    vi.stubGlobal("fetch", fetch);
    const { adminApi } = await import("./api");
    await expect(adminApi.login("admin", "wrong")).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
