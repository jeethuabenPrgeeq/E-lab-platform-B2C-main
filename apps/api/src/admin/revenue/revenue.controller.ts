import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { CouponsService } from './coupons.service.js';
import { PricesService } from './prices.service.js';
import {
  CancelSubscriptionDto,
  ChangePlanDto,
  CouponInputDto,
  CouponQueryDto,
  CreateSubscriptionDto,
  ExtendSubscriptionDto,
  PauseCouponDto,
  PaymentQueryDto,
  PriceDto,
  RefundDto,
  RejectRefundDto,
  SubscriptionQueryDto,
} from './revenue.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

enum PlanParam {
  starter = 'starter',
  professional = 'professional',
  premium = 'premium',
}

enum CycleParam {
  monthly = 'monthly',
  quarterly = 'quarterly',
  annual = 'annual',
}

@Controller('super')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('billing.view', 'billing.plans')
export class RevenueController {
  constructor(
    private readonly prices: PricesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly coupons: CouponsService,
  ) {}

  @Get('plans')
  plans() {
    return this.prices.book();
  }

  @Put('plans/:plan/:cycle')
  setPrice(
    @Param('plan', new ParseEnumPipe(PlanParam)) plan: PlanParam,
    @Param('cycle', new ParseEnumPipe(CycleParam)) cycle: CycleParam,
    @Body() dto: PriceDto,
    @Actor() actor: AdminActor,
  ) {
    return this.prices.setPrice(plan, cycle, dto.amount, actor);
  }

  @Get('subscriptions')
  listSubscriptions(@Query(QueryPipe) query: SubscriptionQueryDto) {
    return this.subscriptions.list(query);
  }

  @Get('subscriptions/:id')
  getSubscription(@Param('id') id: string) {
    return this.subscriptions.get(id);
  }

  @Post('subscriptions')
  createSubscription(@Body() dto: CreateSubscriptionDto, @Actor() actor: AdminActor) {
    return this.subscriptions.create(dto, actor);
  }

  @Post('subscriptions/:id/change-plan')
  changePlan(@Param('id') id: string, @Body() dto: ChangePlanDto, @Actor() actor: AdminActor) {
    return this.subscriptions.changePlan(id, dto, actor);
  }

  @RequirePermission('billing.view', 'billing.refund')
  @Post('subscriptions/:id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSubscriptionDto, @Actor() actor: AdminActor) {
    return this.subscriptions.cancel(id, dto, actor);
  }

  @Post('subscriptions/:id/resume')
  resume(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.subscriptions.resume(id, actor);
  }

  @Post('subscriptions/:id/extend')
  extend(@Param('id') id: string, @Body() dto: ExtendSubscriptionDto, @Actor() actor: AdminActor) {
    return this.subscriptions.extend(id, dto, actor);
  }

  @Get('payments')
  listPayments(@Query(QueryPipe) query: PaymentQueryDto) {
    return this.subscriptions.payments(query);
  }

  @Get('payments/:id')
  getPayment(@Param('id') id: string) {
    return this.subscriptions.getPayment(id);
  }

  @RequirePermission('billing.view', 'billing.refund')
  @Post('payments/:id/retry')
  retry(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.subscriptions.retryPayment(id, actor);
  }

  @RequirePermission('billing.view', 'billing.refund')
  @Post('payments/:id/refund')
  refund(@Param('id') id: string, @Body() dto: RefundDto, @Actor() actor: AdminActor) {
    return this.subscriptions.refund(id, dto, actor);
  }

  @RequirePermission('billing.view', 'billing.refund')
  @Post('payments/:id/reject-refund')
  rejectRefund(@Param('id') id: string, @Body() dto: RejectRefundDto, @Actor() actor: AdminActor) {
    return this.subscriptions.rejectRefund(id, dto.reason, actor);
  }

  @Get('coupons')
  listCoupons(@Query(QueryPipe) query: CouponQueryDto) {
    return this.coupons.list(query);
  }

  @Get('coupons/:code')
  getCoupon(@Param('code') code: string) {
    return this.coupons.get(code);
  }

  @RequirePermission('billing.view', 'coupons.manage')
  @Post('coupons')
  createCoupon(@Body() dto: CouponInputDto, @Actor() actor: AdminActor) {
    return this.coupons.create(dto, actor);
  }

  @RequirePermission('billing.view', 'coupons.manage')
  @Patch('coupons/:code')
  editCoupon(@Param('code') code: string, @Body() dto: CouponInputDto, @Actor() actor: AdminActor) {
    return this.coupons.edit(code, dto, actor);
  }

  @RequirePermission('billing.view', 'coupons.manage')
  @Post('coupons/:code/pause')
  pauseCoupon(@Param('code') code: string, @Body() dto: PauseCouponDto, @Actor() actor: AdminActor) {
    return this.coupons.setPaused(code, dto.paused, actor);
  }

  @RequirePermission('billing.view', 'coupons.manage')
  @Post('coupons/:code/end')
  endCoupon(@Param('code') code: string, @Actor() actor: AdminActor) {
    return this.coupons.endNow(code, actor);
  }
}