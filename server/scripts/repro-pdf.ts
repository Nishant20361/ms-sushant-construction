/**
 * Reproduce the PDF download endpoint over HTTP to capture the real error.
 * Uses the running dev server on :5100.
 */
import { prisma } from "../src/db.js";

const BASE = process.env.BASE || "http://localhost:5100";

async function main() {
  // 1. Get CSRF
  const csrfRes = await fetch(`${BASE}/api/csrf`, { credentials: "include" });
  const csrf = await csrfRes.json();
  const cookie = csrfRes.headers.get("set-cookie")?.split(";")[0] ?? "";
  console.log("csrf token:", csrf.token);

  // 2. Login
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf.token,
      Cookie: cookie,
    },
    body: JSON.stringify({ username: "admin", password: "password-test-12345" }),
  });
  console.log("login status:", loginRes.status);
  const loginCookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? cookie;
  console.log("login cookie:", loginCookie.slice(0, 30));

  // 3. Find an order with items
  const order = await prisma.order.findFirst({ include: { items: true } });
  if (!order) {
    console.log("NO ORDER FOUND - create one first");
    return;
  }
  console.log("order id:", order.id, "items:", order.items.length);

  // 4. Ensure a bill exists
  const billRes = await fetch(`${BASE}/api/admin/orders/${order.id}/bill`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf.token,
      Cookie: loginCookie,
    },
    body: JSON.stringify({ discount: 0 }),
  });
  console.log("bill status:", billRes.status);

  // 5. Hit the PDF endpoint
  console.log("Hitting PDF endpoint...");
  const pdfRes = await fetch(`${BASE}/api/admin/orders/${order.id}/bill/pdf`, {
    headers: { Cookie: loginCookie },
  });
  console.log("pdf status:", pdfRes.status);
  const text = await pdfRes.text();
  console.log("pdf body (first 300):", text.slice(0, 300));
  process.exit(0);
}

main().catch((e) => {
  console.error("REPRO ERROR:", e);
  process.exit(1);
});
