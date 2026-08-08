-- CreateTable: ConstructionQuery (construction assistant conversation log)
CREATE TABLE "ConstructionQuery" (
    "id" SERIAL NOT NULL,
    "customerMessage" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "assistantReply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConstructionQuery_createdAt_idx" ON "ConstructionQuery"("createdAt");

-- CreateIndex
CREATE INDEX "ConstructionQuery_language_idx" ON "ConstructionQuery"("language");

