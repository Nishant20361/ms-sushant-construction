-- AlterTable: Make deliveryAddress optional on Order
ALTER TABLE "Order" ALTER COLUMN "deliveryAddress" DROP NOT NULL;

-- AlterTable: Add business invoice fields to SiteSetting
ALTER TABLE "SiteSetting" ADD COLUMN "businessName" TEXT DEFAULT '';
ALTER TABLE "SiteSetting" ADD COLUMN "businessAddress" TEXT DEFAULT '';
ALTER TABLE "SiteSetting" ADD COLUMN "gstNumber" TEXT DEFAULT '';
ALTER TABLE "SiteSetting" ADD COLUMN "businessMobile" TEXT DEFAULT '';
ALTER TABLE "SiteSetting" ADD COLUMN "businessEmail" TEXT DEFAULT '';
ALTER TABLE "SiteSetting" ADD COLUMN "businessLogoUrl" TEXT DEFAULT '';

