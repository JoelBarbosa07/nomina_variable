/*
  Warnings:

  - Added the required column `createdBy` to the `work_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedBy` to the `work_reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "work_reports" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT NOT NULL;
