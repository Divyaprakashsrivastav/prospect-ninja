-- CreateEnum
CREATE TYPE "LeadReplyStatusValue" AS ENUM ('interested', 'not_now', 'meeting_booked');

-- CreateTable
CREATE TABLE "LeadReplyStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedinProviderId" TEXT NOT NULL,
    "status" "LeadReplyStatusValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadReplyStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadReplyStatus_userId_status_idx" ON "LeadReplyStatus"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeadReplyStatus_userId_linkedinProviderId_key" ON "LeadReplyStatus"("userId", "linkedinProviderId");

-- AddForeignKey
ALTER TABLE "LeadReplyStatus" ADD CONSTRAINT "LeadReplyStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

