-- Some environments received these columns through db push. IF NOT EXISTS
-- supports those installations as well as a fresh migration-only database.
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "heroVideoUrl" TEXT;
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "mobileHeroVideoUrl" TEXT;
