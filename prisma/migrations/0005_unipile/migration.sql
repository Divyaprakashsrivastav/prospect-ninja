-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN "externalAccountId" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "displayName" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "lastError" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN "connectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "linkedinProviderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_externalAccountId_key" ON "IntegrationConnection"("externalAccountId");
