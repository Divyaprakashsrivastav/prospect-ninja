-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT,
    "externalAccountId" TEXT,
    "verified" BOOLEAN NOT NULL,
    "payload" JSONB,
    "rawBody" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "userId" TEXT,
    "prospectId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_event_idx" ON "WebhookEvent"("provider", "event");

-- CreateIndex
CREATE INDEX "WebhookEvent_externalAccountId_idx" ON "WebhookEvent"("externalAccountId");

-- CreateIndex
CREATE INDEX "WebhookEvent_userId_idx" ON "WebhookEvent"("userId");

-- CreateIndex
CREATE INDEX "WebhookEvent_prospectId_idx" ON "WebhookEvent"("prospectId");
