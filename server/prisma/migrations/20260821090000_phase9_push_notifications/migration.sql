-- Additive Phase 9 notification evolution. Existing rows and read states remain intact.
ALTER TABLE "Notification"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'NEW_ORDER',
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'New order received',
  ADD COLUMN "message" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "productId" INTEGER,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "dedupeKey" TEXT;

ALTER TABLE "Notification" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "orderNumber" DROP NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "customerName" DROP NOT NULL;

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_adminId_type_createdAt_idx" ON "Notification"("adminId", "type", "createdAt");
CREATE INDEX "Notification_productId_idx" ON "Notification"("productId");

CREATE TABLE "AdminPushDevice" (
  "id" SERIAL NOT NULL,
  "adminId" INTEGER NOT NULL,
  "expoPushToken" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'android',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPushDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminPushDevice_expoPushToken_key" ON "AdminPushDevice"("expoPushToken");
CREATE INDEX "AdminPushDevice_adminId_isActive_idx" ON "AdminPushDevice"("adminId", "isActive");
ALTER TABLE "AdminPushDevice" ADD CONSTRAINT "AdminPushDevice_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
