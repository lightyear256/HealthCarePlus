/*
  Warnings:

  - You are about to drop the column `patientId` on the `AutoSummary` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[patientRequestId]` on the table `AutoSummary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[autoSummaryId]` on the table `PatientRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `PatientRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AutoSummary" DROP CONSTRAINT "AutoSummary_patientId_fkey";

-- DropIndex
DROP INDEX "AutoSummary_patientId_key";

-- AlterTable
ALTER TABLE "AutoSummary" DROP COLUMN "patientId",
ADD COLUMN     "patientRequestId" INTEGER;

-- AlterTable
ALTER TABLE "PatientRequest" ADD COLUMN     "autoSummaryId" INTEGER,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AutoSummary_patientRequestId_key" ON "AutoSummary"("patientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRequest_autoSummaryId_key" ON "PatientRequest"("autoSummaryId");

-- AddForeignKey
ALTER TABLE "PatientRequest" ADD CONSTRAINT "PatientRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
