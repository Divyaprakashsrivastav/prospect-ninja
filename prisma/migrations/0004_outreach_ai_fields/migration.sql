-- AlterTable
ALTER TABLE "OutreachMessage" ADD COLUMN "originalBody" TEXT;
ALTER TABLE "OutreachMessage" ADD COLUMN "personalizationReason" TEXT;
ALTER TABLE "OutreachMessage" ADD COLUMN "personalizationEvidence" JSONB;
ALTER TABLE "OutreachMessage" ADD COLUMN "aiProvider" TEXT;
ALTER TABLE "OutreachMessage" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "OutreachMessage" ADD COLUMN "generationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "OutreachMessage" ADD COLUMN "confidence" DOUBLE PRECISION;
