-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_adminId_key" ON "AdminProfile"("adminId");

-- CreateIndex
CREATE INDEX "AdminProfile_adminId_idx" ON "AdminProfile"("adminId");

-- CreateIndex
CREATE INDEX "Notification_adminId_read_idx" ON "Notification"("adminId", "read");

-- CreateIndex
CREATE INDEX "Notification_adminId_createdAt_idx" ON "Notification"("adminId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
