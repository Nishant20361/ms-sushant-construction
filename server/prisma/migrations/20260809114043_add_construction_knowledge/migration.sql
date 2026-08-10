-- CreateTable
CREATE TABLE "ConstructionKnowledge" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "materialType" TEXT,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConstructionKnowledge_category_idx" ON "ConstructionKnowledge"("category");

-- CreateIndex
CREATE INDEX "ConstructionKnowledge_materialType_idx" ON "ConstructionKnowledge"("materialType");

-- CreateIndex
CREATE INDEX "ConstructionKnowledge_companyName_idx" ON "ConstructionKnowledge"("companyName");
