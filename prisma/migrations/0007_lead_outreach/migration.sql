-- CreateTable
CREATE TABLE "LeadOutreach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "body" TEXT NOT NULL,
    "originalBody" TEXT,
    "campaignContext" TEXT NOT NULL DEFAULT '',
    "personalizationReason" TEXT,
    "personalizationEvidence" JSONB,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "generationStatus" TEXT NOT NULL DEFAULT 'pending',
    "confidence" DOUBLE PRECISION,
    "approvedAt" TIMESTAMP(3),
    "approvedBodyHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadOutreachEvent" (
    "id" TEXT NOT NULL,
    "outreachId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadOutreachEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadOutreach_userId_idx" ON "LeadOutreach"("userId");

-- CreateIndex
CREATE INDEX "LeadOutreach_leadId_idx" ON "LeadOutreach"("leadId");

-- CreateIndex
CREATE INDEX "LeadOutreach_userId_status_idx" ON "LeadOutreach"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeadOutreach_leadId_messageType_key" ON "LeadOutreach"("leadId", "messageType");

-- CreateIndex
CREATE INDEX "LeadOutreachEvent_outreachId_idx" ON "LeadOutreachEvent"("outreachId");

-- CreateIndex
CREATE INDEX "LeadOutreachEvent_actorUserId_idx" ON "LeadOutreachEvent"("actorUserId");

-- AddForeignKey
ALTER TABLE "LeadOutreach" ADD CONSTRAINT "LeadOutreach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOutreach" ADD CONSTRAINT "LeadOutreach_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOutreachEvent" ADD CONSTRAINT "LeadOutreachEvent_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "LeadOutreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOutreachEvent" ADD CONSTRAINT "LeadOutreachEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
