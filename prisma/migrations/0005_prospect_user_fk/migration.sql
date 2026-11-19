-- Phase 1 foundation: enforce Prospect ownership at the database layer.
-- Fails if orphan prospect rows exist (userId not in User).

ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Speed up audit lookups by actor (dashboard recent activity).
CREATE INDEX "MessageAuditEvent_actorUserId_idx" ON "MessageAuditEvent"("actorUserId");
