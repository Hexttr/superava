-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('RUB');

-- CreateEnum
CREATE TYPE "BillingEntryType" AS ENUM (
  'TOPUP_CREDIT',
  'GENERATION_RESERVE',
  'GENERATION_CAPTURE',
  'GENERATION_RELEASE',
  'GENERATION_REFUND',
  'MANUAL_ADJUSTMENT'
);

-- CreateEnum
CREATE TYPE "BillingEntryStatus" AS ENUM ('POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ROBOKASSA');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TOPUP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM (
  'CREATED',
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELED',
  'EXPIRED'
);

-- CreateEnum
CREATE TYPE "GenerationBillingStatus" AS ENUM (
  'NONE',
  'RESERVED',
  'CAPTURED',
  'RELEASED',
  'REFUNDED'
);

-- CreateEnum
CREATE TYPE "GenerationPricingType" AS ENUM ('TEXT', 'TEMPLATE', 'REFERENCE');

-- AlterTable
ALTER TABLE "AppConfig"
ADD COLUMN "billingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
ADD COLUMN "photoGenerationPriceMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "textGenerationPriceMinor" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GenerationRequest"
ADD COLUMN "billingStatus" "GenerationBillingStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
ADD COLUMN "priceMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pricingSnapshotJson" JSONB,
ADD COLUMN "pricingType" "GenerationPricingType";

-- AlterTable
ALTER TABLE "PromptTemplate"
ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "priceMinor" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BillingAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
  "balanceMinor" INTEGER NOT NULL DEFAULT 0,
  "reservedMinor" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingLedgerEntry" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "BillingEntryType" NOT NULL,
  "status" "BillingEntryStatus" NOT NULL DEFAULT 'POSTED',
  "amountMinor" INTEGER NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
  "generationRequestId" TEXT,
  "paymentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "type" "PaymentType" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "amountMinor" INTEGER NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
  "invoiceId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "description" TEXT NOT NULL,
  "successUrl" TEXT,
  "failUrl" TEXT,
  "paidAt" TIMESTAMP(3),
  "rawPayloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_userId_key" ON "BillingAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingLedgerEntry_idempotencyKey_key" ON "BillingLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BillingLedgerEntry_accountId_idx" ON "BillingLedgerEntry"("accountId");

-- CreateIndex
CREATE INDEX "BillingLedgerEntry_userId_idx" ON "BillingLedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "BillingLedgerEntry_generationRequestId_idx" ON "BillingLedgerEntry"("generationRequestId");

-- CreateIndex
CREATE INDEX "BillingLedgerEntry_paymentId_idx" ON "BillingLedgerEntry"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceId_key" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "GenerationRequest_billingStatus_idx" ON "GenerationRequest"("billingStatus");

-- AddForeignKey
ALTER TABLE "BillingAccount"
ADD CONSTRAINT "BillingAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedgerEntry"
ADD CONSTRAINT "BillingLedgerEntry_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedgerEntry"
ADD CONSTRAINT "BillingLedgerEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedgerEntry"
ADD CONSTRAINT "BillingLedgerEntry_generationRequestId_fkey"
FOREIGN KEY ("generationRequestId") REFERENCES "GenerationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedgerEntry"
ADD CONSTRAINT "BillingLedgerEntry_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
