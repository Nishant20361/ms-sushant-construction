ALTER TABLE "SiteSetting"
ADD COLUMN "latestUpdateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "latestUpdateText" TEXT NOT NULL DEFAULT '';
