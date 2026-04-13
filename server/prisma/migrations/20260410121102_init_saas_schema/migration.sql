/*
  Warnings:

  - You are about to drop the column `fullName` on the `SanctionedEntity` table. All the data in the column will be lost.
  - Added the required column `name` to the `SanctionedEntity` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SanctionedEntity_fullName_idx";

-- AlterTable
ALTER TABLE "SanctionedEntity" DROP COLUMN "fullName",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SanctionedEntity_name_idx" ON "SanctionedEntity" USING GIN ("name" gin_trgm_ops);
