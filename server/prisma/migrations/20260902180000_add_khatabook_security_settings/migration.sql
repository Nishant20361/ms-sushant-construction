ALTER TABLE "SiteSetting"
ADD COLUMN "khatabookPinHash" TEXT,
ADD COLUMN "khatabookRecoveryEmail" TEXT,
ADD COLUMN "khatabookOtpHash" TEXT,
ADD COLUMN "khatabookOtpExpiresAt" TIMESTAMP(3);
