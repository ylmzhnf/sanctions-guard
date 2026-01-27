-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionList" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "country" TEXT,
    "type" TEXT,
    "extarnalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SanctionList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queriedName" TEXT NOT NULL,
    "matchedName" TEXT,
    "similarityScore" DOUBLE PRECISION,
    "userId" INTEGER NOT NULL,
    "sanctionId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SanctionList_extarnalId_key" ON "SanctionList"("extarnalId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sanctionId_fkey" FOREIGN KEY ("sanctionId") REFERENCES "SanctionList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
