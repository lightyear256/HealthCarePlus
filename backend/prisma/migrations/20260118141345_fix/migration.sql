/*
  Warnings:

  - Made the column `age` on table `PatientRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PatientRequest" ALTER COLUMN "age" SET NOT NULL,
ALTER COLUMN "age" SET DATA TYPE TEXT;
