/*
  Warnings:

  - Added the required column `updatedAt` to the `ChatbotQuery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatbotQuery" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE INDEX "ChatbotQuery_userId_idx" ON "ChatbotQuery"("userId");

-- CreateIndex
CREATE INDEX "ChatbotQuery_sessionId_idx" ON "ChatbotQuery"("sessionId");

-- CreateIndex
CREATE INDEX "ChatbotQuery_createdAt_idx" ON "ChatbotQuery"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatbotQuery" ADD CONSTRAINT "ChatbotQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
