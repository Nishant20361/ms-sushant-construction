-- Optional for backward compatibility: browser orders do not need a key.
ALTER TABLE "Order"
ADD COLUMN "clientRequestId" TEXT,
ADD COLUMN "clientRequestHash" TEXT;

CREATE UNIQUE INDEX "Order_clientRequestId_key" ON "Order"("clientRequestId");
