/*
  Warnings:

  - The primary key for the `AuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `matchedName` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `queriedName` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `sanctionId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `similarityScore` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `AuditLog` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `SanctionList` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[queryId]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `integrityHash` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadata` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orgId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ListSource" AS ENUM ('OFAC', 'EU', 'UN', 'UK_HMT', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('CLEAR', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_sanctionId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_pkey",
DROP COLUMN "matchedName",
DROP COLUMN "queriedName",
DROP COLUMN "sanctionId",
DROP COLUMN "similarityScore",
DROP COLUMN "timestamp",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "integrityHash" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL,
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "queryId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AuditLog_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropTable
DROP TABLE "SanctionList";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "queriesUsed" INTEGER NOT NULL DEFAULT 0,
    "queriesLimit" INTEGER NOT NULL DEFAULT 10,
    "billingPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionedEntity" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "aliases" TEXT[],
    "entityType" TEXT NOT NULL,
    "listSource" "ListSource" NOT NULL,
    "reason" TEXT,
    "country" TEXT,
    "type" TEXT,
    "issueDate" TIMESTAMP(3),
    "moreInfoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SanctionedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningQuery" (
    "id" TEXT NOT NULL,
    "searchedName" TEXT NOT NULL,
    "fuzzyMatch" BOOLEAN NOT NULL DEFAULT true,
    "exactMatch" BOOLEAN NOT NULL DEFAULT false,
    "status" "ScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel",
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "ScreeningQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningMatch" (
    "id" TEXT NOT NULL,
    "matchedEntityId" TEXT NOT NULL,
    "matchedName" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "matchedField" TEXT NOT NULL,
    "listSource" "ListSource" NOT NULL,
    "queryId" TEXT NOT NULL,

    CONSTRAINT "ScreeningMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "SanctionedEntity_externalId_key" ON "SanctionedEntity"("externalId");

-- CreateIndex
CREATE INDEX "SanctionedEntity_fullName_idx" ON "SanctionedEntity" USING GIN ("fullName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ScreeningQuery_orgId_createdAt_idx" ON "ScreeningQuery"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_queryId_key" ON "AuditLog"("queryId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuery" ADD CONSTRAINT "ScreeningQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuery" ADD CONSTRAINT "ScreeningQuery_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningMatch" ADD CONSTRAINT "ScreeningMatch_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ScreeningQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningMatch" ADD CONSTRAINT "ScreeningMatch_matchedEntityId_fkey" FOREIGN KEY ("matchedEntityId") REFERENCES "SanctionedEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ScreeningQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
