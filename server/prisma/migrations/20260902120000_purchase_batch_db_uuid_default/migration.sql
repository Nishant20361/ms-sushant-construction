-- Keep direct SQL writes consistent with Prisma's application-level uuid().
ALTER TABLE "ProductPurchaseBatch"
ALTER COLUMN "batchNumber" SET DEFAULT gen_random_uuid()::text;
