import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { DEFAULTS, FIELDS, SECTIONS, coerce, keysOf, normalizeIp, show, validate, type SectionKey } from './settings.schema.js';

type Values = Record<string, string | number | boolean | string[]>;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async all() {
    const rows = await this.prisma.platformSetting.findMany();
    const bySection = new Map(rows.map((row) => [row.section, row]));
    const values: Values = { ...DEFAULTS };
    const meta: Record<string, { at: number | null; by: string | null }> = {};
    for (const section of SECTIONS) {
      const row = bySection.get(section);
      const stored = (row?.values ?? {}) as Values;
      for (const key of keysOf(section)) if (stored[key] !== undefined) values[key] = stored[key];
      meta[section] = { at: row?.updatedAt.getTime() ?? null, by: row?.updatedByName ?? null };
    }
    return { values, meta };
  }

  async publicSettings() {
    const { values } = await this.all();
    return {
      platformName: values.platformName,
      supportEmail: values.supportEmail,
      timezone: values.timezone,
      language: values.language,
      dateFormat: values.dateFormat,
      maintenance: values.maintenance,
      maintenanceMessage: values.maintenance ? values.maintenanceMessage : null,
      allowSignup: values.allowSignup,
      socialLogins: values.socialLogins,
    };
  }

  async update(section: string, input: Record<string, unknown>, confirm: boolean, actor: AdminActor) {
    if (!(SECTIONS as readonly string[]).includes(section)) throw new NotFoundException('Unknown settings section.');
    const key = section as SectionKey;
    const allowed = new Set(keysOf(key));
    const unknown = Object.keys(input).filter((field) => !allowed.has(field));
    if (unknown.length) throw new BadRequestException(`These fields are not part of ${key}: ${unknown.join(', ')}`);
    const { values: current } = await this.all();
    const next: Values = { ...current };
    const typeErrors: Record<string, string> = {};
    for (const [field, raw] of Object.entries(input)) {
      const value = coerce(field, raw);
      if (value === undefined) typeErrors[field] = 'Wrong type for this setting';
      else next[field] = value;
    }
    const errors = { ...validate(key, next, normalizeIp(actor.ip)), ...typeErrors };
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Fix the highlighted settings.', issues: Object.values(errors), fields: errors });
    const changed = [...allowed].filter((field) => JSON.stringify(current[field]) !== JSON.stringify(next[field]));
    if (changed.length === 0) return this.all();
    const critical = changed.filter((field) => FIELDS[field].critical?.(current[field], next[field]));
    if (critical.length && !confirm) {
      throw new ConflictException({ message: 'These changes affect access or security. Confirm to save them.', critical: critical.map((field) => FIELDS[field].label) });
    }
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    const sectionValues = Object.fromEntries([...allowed].map((field) => [field, next[field]])) as Prisma.InputJsonValue;
    const changes = changed.map((field) => ({ field: FIELDS[field].label, before: show(current[field]), after: show(next[field]) }));
    await this.prisma.$transaction(async (tx) => {
      await tx.platformSetting.upsert({
        where: { section: key },
        create: { section: key, values: sectionValues, updatedById: actor.id, updatedByName: user?.name ?? actor.email },
        update: { values: sectionValues, updatedById: actor.id, updatedByName: user?.name ?? actor.email },
      });
      await this.audit.record(tx, actor, {
        action: `settings.${key}`,
        entityType: 'settings',
        entityId: key,
        summary: `Changed ${changes.map((change) => change.field).join(', ')}`,
        changes,
      });
    });
    return this.all();
  }
}