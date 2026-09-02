-- CreateTable
CREATE TABLE "ProductPurchaseBatch" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "supplierName" TEXT,
    "invoiceNumber" TEXT,
    "note" TEXT,
    "initialQuantity" DOUBLE PRECISION NOT NULL,
    "remainingQuantity" DOUBLE PRECISION NOT NULL,
    "costPricePerUnit" DECIMAL(12,2) NOT NULL,
    "totalPurchaseCost" DECIMAL(12,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPurchaseBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemCostAllocation" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "costPricePerUnit" DECIMAL(12,2) NOT NULL,
    "sellingPricePerUnit" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "grossProfit" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemCostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPurchaseBatch_batchNumber_key" ON "ProductPurchaseBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "ProductPurchaseBatch_productId_remainingQuantity_idx" ON "ProductPurchaseBatch"("productId", "remainingQuantity");

-- CreateIndex
CREATE INDEX "ProductPurchaseBatch_purchaseDate_idx" ON "ProductPurchaseBatch"("purchaseDate");

-- CreateIndex
CREATE INDEX "OrderItemCostAllocation_orderItemId_idx" ON "OrderItemCostAllocation"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemCostAllocation_batchId_idx" ON "OrderItemCostAllocation"("batchId");

-- CreateIndex
CREATE INDEX "OrderItemCostAllocation_createdAt_idx" ON "OrderItemCostAllocation"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductPurchaseBatch" ADD CONSTRAINT "ProductPurchaseBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemCostAllocation" ADD CONSTRAINT "OrderItemCostAllocation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemCostAllocation" ADD CONSTRAINT "OrderItemCostAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductPurchaseBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
