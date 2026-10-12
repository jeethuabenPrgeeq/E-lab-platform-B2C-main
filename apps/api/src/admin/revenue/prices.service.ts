import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { CYCLE_LABEL, DEFAULT_PRICES, PLAN_LABEL, inr } from './billing-math.js';
import type { Cycle, IndividualPlan } from './revenue.dto.js';

export type PriceBook = Record<IndividualPlan, Record<Cycle, number>>;

@Injectable()
export class PricesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async book(): Promise<PriceBook> {
    let rows = await this.prisma.planPrice.findMany();
    if (rows.length < 9) {
      await this.prisma.planPrice.createMany({
        data: (Object.keys(DEFAULT_PRICES) as IndividualPlan[]).flatMap((plan) =>
          (Object.keys(DEFAULT_PRICES[plan]) as Cycle[]).map((cycle) => ({ plan, cycle, amount: DEFAULT_PRICES[plan][cycle] })),
        ),
        skipDuplicates: true,
      });
      rows = await this.prisma.planPrice.findMany();
    }
    const book = structuredClone(DEFAULT_PRICES) as unknown as PriceBook;
    for (const row of rows) {
      if (row.plan !== 'enterprise') book[row.plan][row.cycle] = row.amount;
    }
    return book;
  }

  async setPrice(plan: IndividualPlan, cycle: Cycle, amount: number, actor: AdminActor) {
    const book = await this.book();
    const before = book[plan][cycle];
    if (before === amount) return book;
    const monthly = cycle === 'monthly' ? amount : book[plan].monthly;
    const months = { monthly: 1, quarterly: 3, annual: 12 }[cycle];
    if (cycle !== 'monthly' && amount > monthly * months) throw new BadRequestException(`A ${CYCLE_LABEL[cycle].toLowerCase()} price above ${inr(monthly * months)} would cost more than paying monthly.`);
    await this.prisma.$transaction(async (tx) => {
      await tx.planPrice.update({ where: { plan_cycle: { plan, cycle } }, data: { amount } });
      await this.audit.record(tx, actor, {
        action: 'plan.price',
        entityType: 'plan_price',
        entityId: `${plan}:${cycle}`,
        summary: `Changed the ${PLAN_LABEL[plan]} ${CYCLE_LABEL[cycle].toLowerCase()} price from ${inr(before)} to ${inr(amount)}. Applies to new subscriptions and renewals`,
        changes: { before, after: amount },
      });
    });
    return this.book();
  }
}