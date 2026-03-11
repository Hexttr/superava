-- CreateTable
CREATE TABLE "AuthRateLimit" (
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL,
  "firstAttemptAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AuthRateLimit_scope_idx" ON "AuthRateLimit"("scope");

-- CreateIndex
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
