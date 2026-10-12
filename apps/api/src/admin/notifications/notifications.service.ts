import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from '../content/activity.js';
import { AUTOMATIONS } from './automations.js';
import type { AudienceKindKey, CampaignInputDto, CampaignQueryDto, Channel } from './notifications.dto.js';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const CHANNEL_LIMIT: Record<Channel, number> = { in_app: 400, email: 2000, push: 140 };
const CHANNEL_LABEL: Record<Channel, string> = { in_app: 'In-app', email: 'Email', push: 'Mobile push' };
const PLANS = ['starter', 'professional', 'premium', 'enterprise'];
const LINK = /^(\/[\w\-/?=&#.%]*|https:\/\/[\w.-]+\.[a-z]{2,}[\w\-/?=&#.%]*)$/i;
const DISPATCH_EVERY_MS = 60_000;

type CampaignRow = Prisma.NotificationCampaignGetPayload<object>;

function present(row: CampaignRow) {
  return {
    id: row.id,
    ref: `NT-${row.number}`,
    name: row.name,
    subject: row.subject,
    body: row.body,
    link: row.link,
    channels: row.channels as Channel[],
    audience: { kind: row.audienceKind, value: row.audienceValue },
    sendAt: row.sendAt?.getTime() ?? null,
    status: row.status,
    createdBy: row.createdByName,
    createdAt: row.createdAt.getTime(),
    sentAt: row.sentAt?.getTime() ?? null,
    recipients: row.recipients,
    delivered: row.delivered,
    opened: row.opened,
    clicked: row.clicked,
    cancelReason: row.cancelReason,
  };
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.dispatchDue(), DISPATCH_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  audienceWhere(kind: AudienceKindKey, value: string | null | undefined): Prisma.UserWhereInput | null {
    const base: Prisma.UserWhereInput = { role: 'LEARNER', status: 'ACTIVE' };
    const live: Prisma.SubscriptionWhereInput = { status: { not: 'cancelled' } };
    switch (kind) {
      case 'all':
        return base;
      case 'paid':
        return { ...base, subscriptions: { some: live } };
      case 'free':
        return { ...base, subscriptions: { none: live } };
      case 'plan':
        return value && PLANS.includes(value) ? { ...base, subscriptions: { some: { ...live, plan: value as 'starter' } } } : null;
      case 'inactive': {
        const cutoff = new Date(Date.now() - 30 * DAY);
        return { ...base, createdAt: { lt: cutoff }, OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: cutoff } }] };
      }
      case 'institution':
        return value ? { ...base, subscriptions: { some: { ...live, plan: 'enterprise', institution: { equals: value, mode: 'insensitive' } } } } : null;
      case 'trial':
      case 'instructors':
        return null;
    }
  }

  async audienceSize(kind: AudienceKindKey, value?: string | null) {
    const where = this.audienceWhere(kind, value);
    const count = where ? await this.prisma.user.count({ where }) : 0;
    return {
      kind,
      value: value ?? null,
      count,
      note: kind === 'trial' ? 'Trials are not tracked yet, so this audience is empty' : kind === 'instructors' ? 'Instructor accounts do not exist yet, so this audience is empty' : null,
    };
  }

  private validate(input: CampaignInputDto) {
    const errors: Record<string, string> = {};
    if (input.name.trim().length < 3) errors.name = 'Give the campaign an internal name';
    if (input.subject.trim().length < 4) errors.subject = 'Add a heading of at least 4 characters';
    if (input.body.trim().length < 10) errors.body = 'Write a message of at least 10 characters';
    if (input.channels.length === 0) errors.channels = 'Pick at least one channel';
    else {
      const limit = Math.min(...input.channels.map((channel) => CHANNEL_LIMIT[channel]));
      if (input.body.trim().length > limit) {
        const tight = input.channels.filter((channel) => CHANNEL_LIMIT[channel] === limit).map((channel) => CHANNEL_LABEL[channel]).join(', ');
        errors.body = `Too long for ${tight}. Keep it under ${limit} characters`;
      }
    }
    if (input.link && !LINK.test(input.link.trim())) errors.link = 'Use a path like /learning-paths or a full https:// link';
    if ((input.audience.kind === 'plan' || input.audience.kind === 'institution') && !input.audience.value?.trim()) errors.audience = 'Pick who this goes to';
    if (input.audience.kind === 'plan' && input.audience.value && !PLANS.includes(input.audience.value)) errors.audience = 'Unknown plan';
    if (input.mode === 'schedule') {
      if (!input.sendAt) errors.sendAt = 'Pick a date and time';
      else if (input.sendAt < Date.now() + 5 * MIN) errors.sendAt = 'Schedule at least 5 minutes ahead, or choose Send now';
    }
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Fix the highlighted fields.', issues: Object.values(errors), fields: errors });
  }

  private data(input: CampaignInputDto) {
    return {
      name: input.name.trim(),
      subject: input.subject.trim(),
      body: input.body.trim(),
      link: input.link?.trim() ?? '',
      channels: [...new Set(input.channels)],
      audienceKind: input.audience.kind,
      audienceValue: input.audience.value?.trim() || null,
    };
  }

  async list(query: CampaignQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.NotificationCampaignWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { subject: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total, byStatus] = await Promise.all([
      this.prisma.notificationCampaign.findMany({ where, orderBy: { createdAt: query.order ?? 'desc' }, skip, take }),
      this.prisma.notificationCampaign.count({ where }),
      this.prisma.notificationCampaign.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return { items: rows.map(present), total, page, pageSize, statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) };
  }

  async get(id: string) {
    const row = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Campaign not found.');
    const [activity, read] = await Promise.all([
      activityFor(this.prisma, 'campaign', [id]),
      this.prisma.userNotification.count({ where: { campaignId: id, readAt: { not: null } } }),
    ]);
    return { ...present(row), opened: Math.max(row.opened, read), activity: activity.get(id) ?? [] };
  }

  private async actorName(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    return user?.name ?? actor.email;
  }

  private async deliver(campaignId: string) {
    const claimed = await this.prisma.notificationCampaign.updateMany({ where: { id: campaignId, status: { in: ['draft', 'scheduled'] } }, data: { status: 'sending' } });
    if (claimed.count === 0) return null;
    const campaign = await this.prisma.notificationCampaign.findUniqueOrThrow({ where: { id: campaignId } });
    const where = this.audienceWhere(campaign.audienceKind, campaign.audienceValue);
    const users = where ? await this.prisma.user.findMany({ where, select: { id: true } }) : [];
    const channels = campaign.channels as Channel[];
    const inApp = channels.includes('in_app');
    if (inApp) {
      for (let start = 0; start < users.length; start += 1000) {
        await this.prisma.userNotification.createMany({
          data: users.slice(start, start + 1000).map((user) => ({ userId: user.id, campaignId, title: campaign.subject, body: campaign.body, link: campaign.link || null })),
        });
      }
    }
    const now = new Date();
    await this.prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: { status: 'sent', sentAt: now, sendAt: campaign.sendAt ?? now, recipients: users.length, delivered: inApp ? users.length : 0 },
    });
    const skipped = channels.filter((channel) => channel !== 'in_app').map((channel) => CHANNEL_LABEL[channel]);
    return { recipients: users.length, delivered: inApp ? users.length : 0, skipped };
  }

  private summary(result: { recipients: number; delivered: number; skipped: string[] }) {
    return `Sent to ${result.recipients.toLocaleString('en-IN')} people${result.delivered ? ` (${result.delivered} in-app)` : ''}${result.skipped.length ? `. ${result.skipped.join(' and ')} not configured yet, skipped` : ''}`;
  }

  async save(id: string | null, input: CampaignInputDto, actor: AdminActor) {
    this.validate(input);
    const name = await this.actorName(actor);
    let campaignId = id;
    if (id) {
      const existing = await this.prisma.notificationCampaign.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Campaign not found.');
      if (existing.status !== 'draft' && existing.status !== 'scheduled') throw new BadRequestException('Only drafts and scheduled campaigns can be edited.');
      await this.prisma.$transaction(async (tx) => {
        await tx.notificationCampaign.update({
          where: { id },
          data: { ...this.data(input), status: input.mode === 'schedule' ? 'scheduled' : 'draft', sendAt: input.mode === 'schedule' ? new Date(input.sendAt!) : null },
        });
        await this.audit.record(tx, actor, {
          action: input.mode === 'schedule' ? 'campaign.schedule' : 'campaign.edit',
          entityType: 'campaign',
          entityId: id,
          summary: input.mode === 'schedule' ? `Scheduled for ${new Date(input.sendAt!).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'Edited the draft',
        });
      });
    } else {
      campaignId = await this.prisma.$transaction(async (tx) => {
        const created = await tx.notificationCampaign.create({
          data: { ...this.data(input), status: input.mode === 'schedule' ? 'scheduled' : 'draft', sendAt: input.mode === 'schedule' ? new Date(input.sendAt!) : null, createdById: actor.id, createdByName: name },
        });
        await this.audit.record(tx, actor, {
          action: input.mode === 'schedule' ? 'campaign.schedule' : 'campaign.create',
          entityType: 'campaign',
          entityId: created.id,
          summary: input.mode === 'schedule' ? `Created and scheduled for ${new Date(input.sendAt!).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'Created as a draft',
        });
        return created.id;
      });
    }
    if (input.mode === 'now') return this.sendNow(campaignId!, actor);
    return this.get(campaignId!);
  }

  async sendNow(id: string, actor: AdminActor) {
    const existing = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found.');
    if (existing.status !== 'draft' && existing.status !== 'scheduled') throw new BadRequestException('This campaign has already been sent or cancelled.');
    const result = await this.deliver(id);
    if (!result) throw new BadRequestException('This campaign is already being sent.');
    await this.audit.record(this.prisma, actor, { action: 'campaign.send', entityType: 'campaign', entityId: id, summary: this.summary(result) });
    return this.get(id);
  }

  async unschedule(id: string, actor: AdminActor) {
    const existing = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found.');
    if (existing.status !== 'scheduled') throw new BadRequestException('Only scheduled campaigns can be moved back to draft.');
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationCampaign.update({ where: { id }, data: { status: 'draft', sendAt: null } });
      await this.audit.record(tx, actor, { action: 'campaign.unschedule', entityType: 'campaign', entityId: id, summary: 'Moved back to draft' });
    });
    return this.get(id);
  }

  async cancel(id: string, reason: string, actor: AdminActor) {
    const existing = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found.');
    if (existing.status !== 'draft' && existing.status !== 'scheduled') throw new BadRequestException('Sent campaigns cannot be cancelled.');
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationCampaign.update({ where: { id }, data: { status: 'cancelled', cancelReason: reason.trim() } });
      await this.audit.record(tx, actor, { action: 'campaign.cancel', entityType: 'campaign', entityId: id, summary: `Cancelled: ${reason.trim()}` });
    });
    return this.get(id);
  }

  async remove(id: string, actor: AdminActor) {
    const existing = await this.prisma.notificationCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found.');
    if (existing.status === 'sent' || existing.status === 'sending') throw new BadRequestException('Sent campaigns are kept for the record.');
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationCampaign.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'campaign.delete', entityType: 'campaign', entityId: id, summary: `Deleted the campaign ${existing.name}` });
    });
    return { deleted: true };
  }

  async dispatchDue() {
    try {
      const due = await this.prisma.notificationCampaign.findMany({ where: { status: 'scheduled', sendAt: { lte: new Date() } }, select: { id: true }, take: 20 });
      for (const { id } of due) {
        const result = await this.deliver(id);
        if (!result) continue;
        await this.prisma.technicalAuditLog.create({ data: { actorId: null, actorEmail: 'system', action: 'campaign.send', entityType: 'campaign', entityId: id, summary: this.summary(result) } });
      }
      return due.length;
    } catch (error) {
      this.logger.error(`Campaign dispatch failed: ${error instanceof Error ? error.message : error}`);
      return 0;
    }
  }

  async automations() {
    const rows = await this.prisma.notificationAutomation.findMany();
    const byId = new Map(rows.map((row) => [row.id, row]));
    return AUTOMATIONS.map((automation) => {
      const row = byId.get(automation.id);
      return {
        id: automation.id,
        name: automation.name,
        trigger: automation.trigger,
        channels: automation.channels,
        subject: automation.subject,
        body: automation.body,
        locked: automation.locked,
        enabled: row ? row.enabled : automation.defaultEnabled,
        updatedBy: row?.updatedByName ?? null,
        updatedAt: row?.updatedAt.getTime() ?? null,
      };
    });
  }

  async toggleAutomation(id: string, actor: AdminActor) {
    const definition = AUTOMATIONS.find((automation) => automation.id === id);
    if (!definition) throw new NotFoundException('Automation not found.');
    const current = (await this.automations()).find((automation) => automation.id === id)!;
    if (definition.locked && current.enabled) throw new BadRequestException(`${definition.name} is required for billing and cannot be turned off.`);
    const name = await this.actorName(actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationAutomation.upsert({
        where: { id },
        create: { id, enabled: !current.enabled, updatedByName: name },
        update: { enabled: !current.enabled, updatedByName: name },
      });
      await this.audit.record(tx, actor, { action: current.enabled ? 'automation.disable' : 'automation.enable', entityType: 'automation', entityId: id, summary: `${current.enabled ? 'Turned off' : 'Turned on'} ${definition.name}` });
    });
    return (await this.automations()).find((automation) => automation.id === id);
  }

  async mine(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.userNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, body: true, link: true, readAt: true, createdAt: true } }),
      this.prisma.userNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { items: items.map((item) => ({ ...item, readAt: item.readAt?.getTime() ?? null, createdAt: item.createdAt.getTime() })), unread };
  }

  async markRead(userId: string, id: string | 'all') {
    const result = await this.prisma.userNotification.updateMany({ where: { userId, readAt: null, ...(id === 'all' ? {} : { id }) }, data: { readAt: new Date() } });
    if (id !== 'all' && result.count === 0) {
      const exists = await this.prisma.userNotification.count({ where: { id, userId } });
      if (!exists) throw new NotFoundException('Notification not found.');
    }
    return { updated: result.count };
  }
}