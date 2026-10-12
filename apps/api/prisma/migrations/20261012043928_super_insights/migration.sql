/*
  Warnings:

  - A unique constraint covering the columns `[invoiceSeq]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoiceIssuedAt" TIMESTAMP(3),
ADD COLUMN     "invoicePrefix" TEXT,
ADD COLUMN     "invoiceSeq" SERIAL NOT NULL,
ADD COLUMN     "sellerGstin" TEXT,
ADD COLUMN     "taxInclusive" BOOLEAN,
ADD COLUMN     "taxRate" INTEGER;

-- AlterTable
ALTER TABLE "technical_audit_logs" ADD COLUMN     "outcome" TEXT NOT NULL DEFAULT 'success',
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceSeq_key" ON "payments"("invoiceSeq");
