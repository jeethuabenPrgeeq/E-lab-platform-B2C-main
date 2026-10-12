import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { dayKey } from '../common/time.js';
import { CYCLE_LABEL, DAY, PLAN_LABEL } from '../revenue/billing-math.js';
import { SettingsService } from '../settings/settings.service.js';

const CHART_DAYS = 30;

const money = (rupees: number) => `Rs ${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async timeZone() {
    const { values } = await this.settings.all();
    return String(values.timezone);
  }

  async summary() {
    const timeZone = await this.timeZone();
    const now = new Date();
    const today = dayKey(now, timeZone);
    const month = today.slice(0, 7);
    const since = new Date(now.getTime() - (CHART_DAYS + 2) * DAY);
    const [recent, failed, pending] = await Promise.all([
      this.prisma.payment.findMany({ where: { paidAt: { gte: since } }, select: { paidAt: true, amount: true, refunded: true, status: true } }),
      this.prisma.payment.aggregate({ where: { status: 'failed' }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.payment.findMany({ where: { refundStatus: 'pending' }, select: { amount: true, refunded: true } }),
    ]);
    const days = Array.from({ length: CHART_DAYS }, (_, index) => dayKey(new Date(now.getTime() - (CHART_DAYS - 1 - index) * DAY), timeZone));
    const chart = new Map(days.map((key) => [key, 0]));
    let monthNet = 0;
    let monthRefunds = 0;
    let todayNet = 0;
    let todayCount = 0;
    for (const payment of recent) {
      const key = dayKey(payment.paidAt, timeZone);
      const net = payment.status === 'failed' ? 0 : payment.amount - payment.refunded;
      if (chart.has(key)) chart.set(key, (chart.get(key) ?? 0) + net);
      if (key.startsWith(month)) {
        monthNet += net;
        monthRefunds += payment.refunded;
      }
      if (key === today && payment.status !== 'failed') {
        todayNet += net;
        todayCount += 1;
      }
    }
    return {
      timeZone,
      month: { net: monthNet, refunds: monthRefunds },
      today: { net: todayNet, count: todayCount },
      failed: { count: failed._count._all, atRisk: failed._sum.amount ?? 0 },
      refundRequests: { count: pending.length, value: pending.reduce((sum, item) => sum + item.amount - item.refunded, 0) },
      chart: days.map((date) => ({ date, net: chart.get(date) ?? 0 })),
    };
  }

  async invoice(paymentId: string) {
    let payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { user: { select: { name: true, email: true } } } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status === 'failed') throw new BadRequestException('Failed payments do not have an invoice.');
    if (!payment.invoiceIssuedAt) {
      const { values } = await this.settings.all();
      await this.prisma.payment.updateMany({
        where: { id: paymentId, invoiceIssuedAt: null },
        data: { invoiceIssuedAt: new Date(), taxRate: Number(values.gstRate), taxInclusive: Boolean(values.pricesInclTax), sellerGstin: String(values.gstin), invoicePrefix: String(values.invoicePrefix) },
      });
      payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { user: { select: { name: true, email: true } } } });
    }
    const rate = payment.taxRate ?? 0;
    const totalPaise = payment.amount * 100;
    const taxablePaise = Math.round((totalPaise * 100) / (100 + rate));
    const taxPaise = totalPaise - taxablePaise;
    const halfPaise = Math.floor(taxPaise / 2);
    return {
      number: `${payment.invoicePrefix ?? ''}${payment.paidAt.getFullYear()}-${String(payment.invoiceSeq).padStart(6, '0')}`,
      paymentId: payment.id,
      subscriptionId: payment.subscriptionId,
      issuedAt: payment.invoiceIssuedAt!.getTime(),
      paidAt: payment.paidAt.getTime(),
      seller: { name: 'eLab', gstin: payment.sellerGstin },
      billedTo: { name: payment.user.name, email: payment.user.email },
      line: { description: `${PLAN_LABEL[payment.plan]} plan, ${CYCLE_LABEL[payment.cycle].toLowerCase()}`, listAmount: payment.listAmount, discount: payment.discount, coupon: payment.couponCode },
      taxRate: rate,
      taxable: taxablePaise / 100,
      cgst: halfPaise / 100,
      sgst: (taxPaise - halfPaise) / 100,
      total: payment.amount,
      refunded: payment.refunded,
      status: payment.status,
      method: payment.methodLabel,
    };
  }

  async invoiceText(paymentId: string) {
    const inv = await this.invoice(paymentId);
    const lines = [
      'eLab - Tax invoice',
      `Invoice: ${inv.number}`,
      `Date: ${new Date(inv.paidAt).toISOString().slice(0, 10)}`,
      `Seller GSTIN: ${inv.seller.gstin ?? '-'}`,
      `Billed to: ${inv.billedTo.name} <${inv.billedTo.email}>`,
      '',
      inv.line.description,
      `List price: ${money(inv.line.listAmount)}`,
      inv.line.discount ? `Discount (${inv.line.coupon ?? 'coupon'}): -${money(inv.line.discount)}` : '',
      `Taxable value: ${money(inv.taxable)}`,
      `CGST ${inv.taxRate / 2}%: ${money(inv.cgst)}`,
      `SGST ${inv.taxRate / 2}%: ${money(inv.sgst)}`,
      `Total: ${money(inv.total)}`,
      inv.refunded ? `Refunded: -${money(inv.refunded)}` : '',
      `Paid with: ${inv.method}`,
      `Payment reference: ${inv.paymentId}`,
    ].filter((line) => line !== '');
    return { filename: `${inv.number}.txt`, text: lines.join('\n') };
  }
}