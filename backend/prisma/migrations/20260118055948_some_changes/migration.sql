/*
  Warnings:

  - You are about to drop the column `contactId` on the `AutoSummary` table. All the data in the column will be lost.
  - You are about to drop the column `autoSummaryId` on the `PatientRequest` table. All the data in the column will be lost.
  - You are about to drop the `Volunteer` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `patientRequestId` on table `AutoSummary` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AutoSummary" DROP CONSTRAINT "AutoSummary_contactId_fkey";

-- DropIndex
DROP INDEX "AutoSummary_contactId_key";

-- DropIndex
DROP INDEX "PatientRequest_autoSummaryId_key";

-- AlterTable
ALTER TABLE "AutoSummary" DROP COLUMN "contactId",
ALTER COLUMN "patientRequestId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "autoSummaryId" INTEGER;

-- AlterTable
ALTER TABLE "PatientRequest" DROP COLUMN "autoSummaryId",
ADD COLUMN     "volunteerId" INTEGER;

-- DropTable
DROP TABLE "Volunteer";

-- AddForeignKey
ALTER TABLE "PatientRequest" ADD CONSTRAINT "PatientRequest_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoSummary" ADD CONSTRAINT "AutoSummary_patientRequestId_fkey" FOREIGN KEY ("patientRequestId") REFERENCES "PatientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_autoSummaryId_fkey" FOREIGN KEY ("autoSummaryId") REFERENCES "AutoSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
