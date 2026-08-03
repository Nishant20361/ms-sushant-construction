-- AlterTable: Support decimal stock and order-item quantities.
--
-- Construction materials are sold in fractional units (0.5 kg, 1.25 kg,
-- 2.5 kg, 10 kg). The original init migration created `Product.stock` and
-- `OrderItem.quantity` as INTEGER, which silently drops the fractional part
-- on PostgreSQL. The Prisma schema already declares both as `Float`, so this
-- migration only aligns the production database with the schema.
ALTER TABLE "Product" ALTER COLUMN "stock" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "stock" TYPE DOUBLE PRECISION USING "stock"::double precision;
ALTER TABLE "Product" ALTER COLUMN "stock" SET DEFAULT 0;

ALTER TABLE "OrderItem" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::double precision;

