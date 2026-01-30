/*
  Warnings:

  - You are about to drop the column `extarnalId` on the `SanctionList` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `SanctionList` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- DropIndex
DROP INDEX "SanctionList_extarnalId_key";

-- AlterTable
ALTER TABLE "SanctionList" DROP COLUMN "extarnalId",
ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SanctionList_externalId_key" ON "SanctionList"("externalId");

-- CreateIndex
CREATE INDEX "SanctionList_fullName_idx" ON "SanctionList" USING GIN ("fullName" gin_trgm_ops);
