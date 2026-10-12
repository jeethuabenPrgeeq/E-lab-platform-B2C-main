-- CreateEnum
CREATE TYPE "PlanId" AS ENUM ('starter', 'professional', 'premium', 'enterprise');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'quarterly', 'annual');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('upi', 'card', 'netbanking', 'invoice');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "CouponDuration" AS ENUM ('once', 'repeating', 'forever');

-- CreateTable
CREATE TABLE "plan_prices" (
    "plan" "PlanId" NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "amount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("plan","cycle")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanId" NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingPlan" "PlanId",
    "pendingCycle" "BillingCycle",
    "pendingAmount" INTEGER,
    "institution" TEXT,
    "seats" INTEGER,
    "method" "PaymentMethod" NOT NULL,
    "methodLabel" TEXT NOT NULL,
    "couponCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanId" NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "listAmount" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "refunded" INTEGER NOT NULL DEFAULT 0,
    "attempts" JSONB NOT NULL DEFAULT '[]',
    "refundStatus" "RefundRequestStatus",
    "refundReason" TEXT,
    "refundRequestedAt" TIMESTAMP(3),
    "refundNote" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "methodLabel" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" "DiscountKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "plans" JSONB NOT NULL DEFAULT '[]',
    "cycles" JSONB NOT NULL DEFAULT '[]',
    "duration" "CouponDuration" NOT NULL DEFAULT 'once',
    "months" INTEGER NOT NULL DEFAULT 1,
    "maxRedemptions" INTEGER,
    "firstTimeOnly" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "endedEarly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "plan" "PlanId" NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "saved" INTEGER NOT NULL,
    "revenue" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponCode_at_idx" ON "coupon_redemptions"("couponCode", "at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponCode_fkey" FOREIGN KEY ("couponCode") REFERENCES "coupons"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
