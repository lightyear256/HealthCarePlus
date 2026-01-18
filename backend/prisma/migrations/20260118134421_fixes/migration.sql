/*
  Warnings:

  - Added the required column `title` to the `PatientRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PatientRequest" ADD COLUMN     "title" TEXT NOT NULL;
