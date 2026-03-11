-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
  "workerId" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "heartbeatAt" TIMESTAMP(3) NOT NULL,
  "lastError" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("workerId")
);

-- CreateIndex
CREATE INDEX "WorkerHeartbeat_service_idx" ON "WorkerHeartbeat"("service");

-- CreateIndex
CREATE INDEX "WorkerHeartbeat_heartbeatAt_idx" ON "WorkerHeartbeat"("heartbeatAt");
