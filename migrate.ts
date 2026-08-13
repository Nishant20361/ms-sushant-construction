/**
 * migrate.ts — Render → Supabase data migration
 * Usage: SUPABASE_URL="postgresql://..." npx tsx migrate.ts
 */
import { PrismaClient } from "@prisma/client";

const SOURCE_URL =
  "postgresql://ms_sushant_db_user:9GwJ1RUlU3r8Hu9K71vtregZnTMJDZhQ@dpg-d9mj68favr4c73eh3e3g-a.ohio-postgres.render.com/ms_sushant_db";

const TARGET_URL = process.env.SUPABASE_URL ?? "";
if (!TARGET_URL) {
  console.error("❌  SUPABASE_URL env var nahi mila. Run karo:\n   SUPABASE_URL=\"...\" npx tsx migrate.ts");
  process.exit(1);
}

const src = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: TARGET_URL } } });

async function migrate() {
  console.log("🔌 Connecting...");
  await src.$connect();
  await dst.$connect();

  console.log("\n📋 SiteSettings...");
  const settings = await src.siteSetting.findMany();
  for (const s of settings) await dst.siteSetting.upsert({ where: { id: s.id }, update: s, create: s });
  console.log(`   ✅ ${settings.length} rows`);

  console.log("📁 Categories...");
  const cats = await src.category.findMany();
  for (const c of cats) await dst.category.upsert({ where: { id: c.id }, update: c, create: c });
  console.log(`   ✅ ${cats.length} rows`);

  console.log("🧱 Products...");
  const prods = await src.product.findMany();
  for (const p of prods) await dst.product.upsert({ where: { id: p.id }, update: p, create: p });
  console.log(`   ✅ ${prods.length} rows`);

  console.log("👤 Admins...");
  const admins = await src.admin.findMany();
  for (const a of admins) await dst.admin.upsert({ where: { id: a.id }, update: a, create: a });
  console.log(`   ✅ ${admins.length} rows`);

  console.log("📦 Orders...");
  const orders = await src.order.findMany();
  for (const o of orders) await dst.order.upsert({ where: { id: o.id }, update: o, create: o });
  console.log(`   ✅ ${orders.length} rows`);

  console.log("🛒 OrderItems...");
  const items = await src.orderItem.findMany();
  for (const i of items) await dst.orderItem.upsert({ where: { id: i.id }, update: i, create: i });
  console.log(`   ✅ ${items.length} rows`);

  console.log("💳 Payments...");
  const pays = await src.orderPayment.findMany();
  for (const p of pays) await dst.orderPayment.upsert({ where: { id: p.id }, update: p, create: p });
  console.log(`   ✅ ${pays.length} rows`);

  console.log("🔔 Notifications...");
  const notifs = await src.notification.findMany();
  for (const n of notifs) await dst.notification.upsert({ where: { id: n.id }, update: n, create: n });
  console.log(`   ✅ ${notifs.length} rows`);

  console.log("\n🎉 Migration complete! Sab data Supabase me aa gaya.");
}

migrate()
  .catch((e) => { console.error("❌ Migration failed:", e); process.exit(1); })
  .finally(async () => { await src.$disconnect(); await dst.$disconnect(); });
