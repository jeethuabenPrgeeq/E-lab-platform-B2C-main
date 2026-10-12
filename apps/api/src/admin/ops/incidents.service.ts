import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { ms, OpsDirectory } from './ops.common.js';

export const SEVERITIES = ['sev1', 'sev2', 'sev3'] as const;
export const INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'] as const;
export const COMPONENTS = ['judge', 'sandbox', 'editor', 'auth', 'assessments', 'api', 'database'] as const;
export const LINK_KINDS = ['alert', 'ticket', 'report'] as const;
export type Severity = (typeof SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type ComponentId = (typeof COMPONENTS)[number];
type Health = 'operational' | 'degraded' | 'partial' | 'major';
export interface Link {
  kind: (typeof LINK_KINDS)[number];
  label: string;
  href: string;
}

const COMPONENT_LABEL: Record<ComponentId, string> = { judge: 'Judge workers', sandbox: 'Sandbox runtime', editor: 'Code editor', auth: 'Login & SSO', assessments: 'Assessments', api: 'Public API', database: 'Database' };
const SEVERITY_HEALTH: Record<Severity, Health> = { sev1: 'major', sev2: 'partial', sev3: 'degraded' };
const HEALTH_RANK: Record<Health, number> = { major: 0, partial: 1, degraded: 2, operational: 3 };
const STATUS_LABEL: Record<IncidentStatus, string> = { investigating: 'Investigating', identified: 'Identified', monitoring: 'Monitoring', resolved: 'Resolved' };

const INCLUDE = { updates: { orderBy: { at: 'asc' } } } as const satisfies Prisma.IncidentInclude;
type Row = Prisma.IncidentGetPayload<{ include: typeof INCLUDE }>;

export function componentHealth(rows: { status: string; severity: string; components: unknown }[]) {
  const map = Object.fromEntries(COMPONENTS.map((id) => [id, 'operational'])) as Record<ComponentId, Health>;
  for (const row of rows) {
    if (row.status === 'resolved') continue;
    const health: Health = row.status === 'monitoring' ? 'degraded' : SEVERITY_HEALTH[row.severity as Severity];
    for (const id of row.components as ComponentId[]) if (map[id] && HEALTH_RANK[health] < HEALTH_RANK[map[id]]) map[id] = health;
  }
  return map;
}

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly directory: OpsDirectory,
  ) {}

  private present(row: Row) {
    return {
      id: row.id,
      ref: `INC-${row.number}`,
      title: row.title,
      severity: row.severity,
      status: row.status,
      components: row.components as ComponentId[],
      commander: row.commanderName,
      commanderId: row.commanderId,
      startedAt: row.startedAt.getTime(),
      resolvedAt: ms(row.resolvedAt),
      links: row.links as unknown as Link[],
      updates: row.updates.map((update) => ({ id: update.id, at: update.at.getTime(), author: update.authorName, status: update.status, message: update.message, public: update.public, kind: update.kind })),
      postmortem: row.postmortem as { summary: string; rootCause: string; actions: string; savedAt: number } | null,
    };
  }

  private async load(id: string) {
    const row = await this.prisma.incident.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Incident not found.');
    return row;
  }

  async list(query: { scope?: 'active' | 'resolved' | 'all'; severity?: Severity; q?: string }) {
    const and: Prisma.IncidentWhereInput[] = [];
    if (query.scope === 'active') and.push({ status: { not: 'resolved' } });
    if (query.scope === 'resolved') and.push({ status: 'resolved' });
    if (query.severity) and.push({ severity: query.severity });
    if (query.q) {
      const number = Number(query.q.replace(/^INC-/i, ''));
      and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, ...(Number.isInteger(number) && number > 0 ? [{ number }] : [])] });
    }
    const [rows, open] = await Promise.all([
      this.prisma.incident.findMany({ where: { AND: and }, include: INCLUDE, orderBy: { startedAt: 'desc' }, take: 200 }),
      this.prisma.incident.findMany({ where: { status: { not: 'resolved' } }, select: { status: true, severity: true, components: true } }),
    ]);
    const resolved = rows.filter((row) => row.resolvedAt);
    const mttr = resolved.length ? Math.round(resolved.reduce((sum, row) => sum + (row.resolvedAt!.getTime() - row.startedAt.getTime()), 0) / resolved.length) : null;
    return { items: rows.map((row) => this.present(row)), health: componentHealth(open), stats: { active: open.length, sev1Active: open.filter((row) => row.severity === 'sev1').length, mttrMs: mttr } };
  }

  async get(id: string) {
    return this.present(await this.load(id));
  }

  async declare(input: { title: string; severity: Severity; components: ComponentId[]; commanderId: string; message: string }, actor: AdminActor) {
    const components = [...new Set(input.components)];
    if (!components.length) throw new BadRequestException({ message: 'Pick at least one affected component.', issues: { components: 'Pick at least one' } });
    const commander = (await this.directory.teammate(input.commanderId))!;
    const me = await this.directory.person(actor.id);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          title: input.title.trim(),
          severity: input.severity,
          components,
          commanderId: commander.id,
          commanderName: commander.name,
          updates: {
            create: [
              { kind: 'event', status: null, message: `Declared ${input.severity.toUpperCase()} — commander ${commander.name}`, public: false, authorName: me.name },
              { kind: 'update', status: 'investigating', message: input.message.trim(), public: true, authorName: me.name },
            ],
          },
        },
      });
      await this.audit.record(tx, actor, { action: 'incident.declare', entityType: 'incident', entityId: created.id, summary: `Declared INC-${created.number} (${input.severity.toUpperCase()}): ${created.title}`, changes: [{ field: 'Components', before: null, after: components.map((id) => COMPONENT_LABEL[id]) }] });
      if (commander.id !== actor.id) await this.directory.notify(tx, [commander.id], `You are commander for INC-${created.number}`, created.title, `/platform-admin/incidents?incident=${created.id}`);
      return created;
    });
    return this.get(row.id);
  }

  private async change(id: string, actor: AdminActor, fn: (row: Row, name: string, tx: Prisma.TransactionClient) => Promise<{ action: string; summary: string; changes?: unknown }>) {
    const row = await this.load(id);
    const me = await this.directory.person(actor.id);
    await this.prisma.$transaction(async (tx) => {
      const entry = await fn(row, me.name, tx);
      await this.audit.record(tx, actor, { ...entry, entityType: 'incident', entityId: id, summary: `INC-${row.number}: ${entry.summary}` });
    });
    return this.get(id);
  }

  private event(tx: Prisma.TransactionClient, incidentId: string, authorName: string, message: string) {
    return tx.incidentUpdate.create({ data: { incidentId, kind: 'event', status: null, message, public: false, authorName } });
  }

  postUpdate(id: string, status: IncidentStatus, message: string, isPublic: boolean, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.status === 'resolved') throw new BadRequestException('This incident is resolved. Reopen it to post updates.');
      await tx.incidentUpdate.create({ data: { incidentId: id, kind: 'update', status, message: message.trim(), public: isPublic, authorName: name } });
      await tx.incident.update({ where: { id }, data: { status, ...(status === 'resolved' ? { resolvedAt: new Date() } : {}) } });
      return { action: status === 'resolved' ? 'incident.resolve' : 'incident.update', summary: status === row.status ? `Posted ${isPublic ? 'a public' : 'an internal'} update` : `${STATUS_LABEL[row.status as IncidentStatus]} → ${STATUS_LABEL[status]}`, changes: status === row.status ? undefined : [{ field: 'Status', before: row.status, after: status }] };
    });
  }

  setSeverity(id: string, severity: Severity, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.severity === severity) throw new BadRequestException('Severity unchanged.');
      await tx.incident.update({ where: { id }, data: { severity } });
      await this.event(tx, id, name, `Severity changed ${row.severity.toUpperCase()} → ${severity.toUpperCase()}`);
      return { action: 'incident.severity', summary: `Severity ${row.severity.toUpperCase()} → ${severity.toUpperCase()}`, changes: [{ field: 'Severity', before: row.severity, after: severity }] };
    });
  }

  setCommander(id: string, commanderId: string, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const person = (await this.directory.teammate(commanderId))!;
      if (person.id === row.commanderId) throw new BadRequestException('Already the commander.');
      await tx.incident.update({ where: { id }, data: { commanderId: person.id, commanderName: person.name } });
      await this.event(tx, id, name, `Commander handed to ${person.name}`);
      if (person.id !== actor.id) await this.directory.notify(tx, [person.id], `You are commander for INC-${row.number}`, row.title, `/platform-admin/incidents?incident=${id}`);
      return { action: 'incident.commander', summary: `Commander → ${person.name}`, changes: [{ field: 'Commander', before: row.commanderName, after: person.name }] };
    });
  }

  toggleComponent(id: string, component: ComponentId, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const current = row.components as ComponentId[];
      const has = current.includes(component);
      if (has && current.length === 1) throw new BadRequestException('An incident needs at least one affected component.');
      const next = has ? current.filter((item) => item !== component) : [...current, component];
      await tx.incident.update({ where: { id }, data: { components: next } });
      await this.event(tx, id, name, `${has ? 'Removed' : 'Added'} ${COMPONENT_LABEL[component]}`);
      return { action: 'incident.components', summary: `${has ? 'Removed' : 'Added'} ${COMPONENT_LABEL[component]}`, changes: [{ field: 'Components', before: current.map((item) => COMPONENT_LABEL[item]), after: next.map((item) => COMPONENT_LABEL[item]) }] };
    });
  }

  addLink(id: string, link: Link, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const links = row.links as unknown as Link[];
      if (links.length >= 20) throw new BadRequestException('Up to 20 links per incident.');
      if (links.some((item) => item.href === link.href)) throw new BadRequestException('That link is already attached.');
      await tx.incident.update({ where: { id }, data: { links: [...links, link] as unknown as Prisma.InputJsonValue } });
      await this.event(tx, id, name, `Linked ${link.kind}: ${link.label}`);
      return { action: 'incident.link', summary: `Linked ${link.kind} ${link.label}` };
    });
  }

  removeLink(id: string, index: number, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const links = row.links as unknown as Link[];
      const link = links[index];
      if (!link) throw new NotFoundException('Link not found.');
      await tx.incident.update({ where: { id }, data: { links: links.filter((_, i) => i !== index) as unknown as Prisma.InputJsonValue } });
      await this.event(tx, id, name, `Removed link ${link.label}`);
      return { action: 'incident.unlink', summary: `Removed link ${link.label}` };
    });
  }

  reopen(id: string, reason: string, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.status !== 'resolved') throw new BadRequestException('Only resolved incidents can be reopened.');
      await tx.incident.update({ where: { id }, data: { status: 'investigating', resolvedAt: null } });
      await tx.incidentUpdate.create({ data: { incidentId: id, kind: 'update', status: 'investigating', message: reason.trim(), public: true, authorName: name } });
      return { action: 'incident.reopen', summary: 'Reopened', changes: { reason: reason.trim(), before: 'resolved', after: 'investigating' } };
    });
  }

  savePostmortem(id: string, input: { summary: string; rootCause: string; actions: string }, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.status !== 'resolved') throw new BadRequestException('Write the postmortem once the incident is resolved.');
      const first = !row.postmortem;
      await tx.incident.update({ where: { id }, data: { postmortem: { summary: input.summary.trim(), rootCause: input.rootCause.trim(), actions: input.actions.trim(), savedAt: Date.now(), by: name } } });
      await this.event(tx, id, name, first ? 'Published the postmortem' : 'Edited the postmortem');
      return { action: 'incident.postmortem', summary: first ? 'Published the postmortem' : 'Edited the postmortem' };
    });
  }

  async publicStatus() {
    const [open, recent] = await Promise.all([
      this.prisma.incident.findMany({ where: { status: { not: 'resolved' } }, include: { updates: { where: { public: true }, orderBy: { at: 'desc' } } }, orderBy: { startedAt: 'desc' } }),
      this.prisma.incident.findMany({ where: { status: 'resolved', resolvedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } }, include: { updates: { where: { public: true }, orderBy: { at: 'desc' } } }, orderBy: { resolvedAt: 'desc' }, take: 10 }),
    ]);
    const health = componentHealth(open);
    const worst = Object.values(health).reduce<Health>((acc, item) => (HEALTH_RANK[item] < HEALTH_RANK[acc] ? item : acc), 'operational');
    const view = (row: (typeof open)[number]) => ({
      ref: `INC-${row.number}`,
      title: row.title,
      status: row.status,
      components: (row.components as ComponentId[]).map((id) => COMPONENT_LABEL[id]),
      startedAt: row.startedAt.getTime(),
      resolvedAt: ms(row.resolvedAt),
      updates: row.updates.map((update) => ({ at: update.at.getTime(), status: update.status, message: update.message })),
    });
    return {
      overall: worst,
      components: COMPONENTS.map((id) => ({ id, label: COMPONENT_LABEL[id], health: health[id] })),
      active: open.map(view),
      recent: recent.map(view),
      updatedAt: Date.now(),
    };
  }
}