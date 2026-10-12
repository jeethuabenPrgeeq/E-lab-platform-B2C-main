import { BadRequestException, ConflictException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { RUNTIME_KINDS, RUNTIME_SCHEMA, RUNTIME_SEED, validateRuntime, type FieldValue, type RuntimeKind } from './runtimes.schema.js';

type Entry = { id: string; kind: string; status: string; data: Prisma.JsonValue; updatedAt: Date };

const present = (row: Entry) => ({ ...(row.data as Record<string, FieldValue>), id: row.id, status: row.status, updatedAt: row.updatedAt.toISOString() });

const label = (kind: RuntimeKind, data: Record<string, FieldValue>) => (kind === 'images' ? `${data.name}:${data.tag}` : kind === 'versions' ? String(data.version) : String(data.name));

function slug(value: string) {
  return value.toLowerCase().replace(/\+/g, 'p').replace(/#/g, 'sharp').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'item';
}

@Injectable()
export class RuntimesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assertKind(kind: string): RuntimeKind {
    if (!(RUNTIME_KINDS as readonly string[]).includes(kind)) throw new NotFoundException('Unknown runtime type.');
    return kind as RuntimeKind;
  }

  private async ensureSeed() {
    if ((await this.prisma.runtimeEntry.count()) > 0) return;
    await this.prisma.runtimeEntry.createMany({
      data: RUNTIME_SEED.map((item) => ({ id: item.id, kind: item.kind, status: item.status, data: item.data, createdAt: item.at, updatedAt: item.at })),
      skipDuplicates: true,
    });
  }

  private async all() {
    await this.ensureSeed();
    return this.prisma.runtimeEntry.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async store() {
    const rows = await this.all();
    const store: Record<RuntimeKind, ReturnType<typeof present>[]> = { languages: [], frameworks: [], images: [], versions: [] };
    for (const row of rows) if ((RUNTIME_KINDS as readonly string[]).includes(row.kind)) store[row.kind as RuntimeKind].push(present(row));
    return store;
  }

  private checkUnique(kind: RuntimeKind, values: Record<string, FieldValue>, rows: Entry[], exceptId?: string) {
    const keys = RUNTIME_SCHEMA[kind].unique;
    const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
    const clash = rows.find((row) => row.kind === kind && row.id !== exceptId && keys.every((key) => norm((row.data as Record<string, FieldValue>)[key]) === norm(values[key])));
    if (clash) throw new ConflictException({ message: RUNTIME_SCHEMA[kind].uniqueMessage, issues: { [keys[keys.length - 1]]: RUNTIME_SCHEMA[kind].uniqueMessage } });
  }

  private validate(kind: RuntimeKind, input: Record<string, unknown>, rows: Entry[]) {
    const ids = new Map(rows.map((row) => [row.id, row.kind]));
    const { values, issues } = validateRuntime(kind, input, (refKind, id) => ids.get(id) === refKind);
    if (Object.keys(issues).length) throw new BadRequestException({ message: 'Check the highlighted fields.', issues });
    return values;
  }

  private async newId(kind: RuntimeKind, values: Record<string, FieldValue>) {
    const base = `${RUNTIME_SCHEMA[kind].prefix}-${slug(kind === 'versions' ? `${String(values.language).replace(/^lang-/, '')}-${values.version}` : kind === 'images' ? `${values.name}-${values.tag}` : String(values.name))}`;
    let id = base;
    let n = 2;
    while (await this.prisma.runtimeEntry.findUnique({ where: { id } })) id = `${base}-${n++}`;
    return id;
  }

  async create(kindRaw: string, input: Record<string, unknown>, actor: AdminActor) {
    const kind = this.assertKind(kindRaw);
    const rows = await this.all();
    const values = this.validate(kind, input, rows);
    this.checkUnique(kind, values, rows);
    const schema = RUNTIME_SCHEMA[kind];
    const status = typeof input.status === 'string' && schema.statuses.includes(input.status) && kind !== 'images' ? input.status : schema.initial;
    if (kind === 'versions') values.isDefault = !rows.some((row) => row.kind === 'versions' && (row.data as Record<string, FieldValue>).language === values.language && (row.data as Record<string, FieldValue>).isDefault);
    const id = await this.newId(kind, values);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.runtimeEntry.create({ data: { id, kind, status, data: values } });
      await this.audit.record(tx, actor, { action: `runtime.${schema.prefix}_create`, entityType: 'runtime', entityId: id, summary: `Added ${schema.noun} ${label(kind, values)}` });
      return created;
    });
    if (kind === 'images') void this.pull(id, actor).catch(async () => {
      const latest = await this.prisma.runtimeEntry.findUnique({ where: { id } });
      if (latest?.status === 'pulling') await this.prisma.runtimeEntry.update({ where: { id }, data: { status: 'failed' } });
    });
    return present(row);
  }

  private async find(kind: RuntimeKind, id: string) {
    const row = await this.prisma.runtimeEntry.findUnique({ where: { id } });
    if (!row || row.kind !== kind) throw new NotFoundException(`${RUNTIME_SCHEMA[kind].noun.charAt(0).toUpperCase()}${RUNTIME_SCHEMA[kind].noun.slice(1)} not found.`);
    return row;
  }

  async update(kindRaw: string, id: string, input: Record<string, unknown>, actor: AdminActor) {
    const kind = this.assertKind(kindRaw);
    const current = await this.find(kind, id);
    const rows = await this.all();
    const values = this.validate(kind, input, rows);
    this.checkUnique(kind, values, rows, id);
    const before = current.data as Record<string, FieldValue>;
    if (kind === 'versions') {
      if (values.language !== before.language) throw new BadRequestException({ message: 'A version cannot move to another language. Add a new version instead.', issues: { language: 'Cannot change the language of a version' } });
      values.isDefault = Boolean(before.isDefault);
    }
    const changes = Object.keys(values).filter((key) => String(before[key] ?? '') !== String(values[key] ?? '')).map((key) => ({ field: key, before: String(before[key] ?? ''), after: String(values[key] ?? '') }));
    if (!changes.length) return present(current);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.runtimeEntry.update({ where: { id }, data: { data: values } });
      await this.audit.record(tx, actor, { action: `runtime.${RUNTIME_SCHEMA[kind].prefix}_edit`, entityType: 'runtime', entityId: id, summary: `Edited ${RUNTIME_SCHEMA[kind].noun} ${label(kind, values)}`, changes });
      return updated;
    });
    return present(row);
  }

  async setStatus(kindRaw: string, id: string, status: string, actor: AdminActor) {
    const kind = this.assertKind(kindRaw);
    const current = await this.find(kind, id);
    const schema = RUNTIME_SCHEMA[kind];
    if (!schema.statuses.includes(status) || kind === 'images') throw new BadRequestException(`Status must be one of: ${schema.statuses.join(', ')}`);
    if (current.status === status) return present(current);
    const data = current.data as Record<string, FieldValue>;
    if (kind === 'versions' && status === 'deprecated' && data.isDefault) throw new ConflictException('This is the default version. Make another version the default first.');
    if (kind === 'languages' && status === 'disabled') {
      const activeVersions = (await this.all()).filter((row) => row.kind === 'frameworks' && (row.data as Record<string, FieldValue>).language === id && row.status === 'active');
      if (activeVersions.length) throw new ConflictException(`Disable its ${activeVersions.length} framework${activeVersions.length === 1 ? '' : 's'} first.`);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.runtimeEntry.update({ where: { id }, data: { status } });
      await this.audit.record(tx, actor, { action: `runtime.${schema.prefix}_status`, entityType: 'runtime', entityId: id, summary: `Set ${schema.noun} ${label(kind, data)} to ${status}`, changes: { before: current.status, after: status } });
      return updated;
    });
    return present(row);
  }

  async setDefault(id: string, actor: AdminActor) {
    const target = await this.find('versions', id);
    const data = target.data as Record<string, FieldValue>;
    if (data.isDefault) return present(target);
    const siblings = (await this.all()).filter((row) => row.kind === 'versions' && (row.data as Record<string, FieldValue>).language === data.language);
    await this.prisma.$transaction(async (tx) => {
      for (const row of siblings) {
        const rowData = row.data as Record<string, FieldValue>;
        const isDefault = row.id === id;
        if (Boolean(rowData.isDefault) !== isDefault) await tx.runtimeEntry.update({ where: { id: row.id }, data: { data: { ...rowData, isDefault }, ...(isDefault ? { status: 'active' } : {}) } });
      }
      await this.audit.record(tx, actor, { action: 'runtime.ver_default', entityType: 'runtime', entityId: id, summary: `Made ${data.version} the default version` });
    });
    return present(await this.find('versions', id));
  }

  async remove(kindRaw: string, id: string, actor: AdminActor) {
    const kind = this.assertKind(kindRaw);
    const current = await this.find(kind, id);
    const rows = await this.all();
    const data = current.data as Record<string, FieldValue>;
    const users = rows.filter((row) => {
      const rowData = row.data as Record<string, FieldValue>;
      return (kind === 'languages' && (row.kind === 'frameworks' || row.kind === 'versions') && rowData.language === id) || (kind === 'images' && row.kind === 'versions' && rowData.image === id);
    });
    if (users.length) throw new ConflictException(`In use by ${users.length} ${users.length === 1 ? 'entry' : 'entries'}: ${users.slice(0, 3).map((row) => label(row.kind as RuntimeKind, row.data as Record<string, FieldValue>)).join(', ')}${users.length > 3 ? '…' : ''}. Remove or move them first.`);
    if (kind === 'versions' && data.isDefault && rows.some((row) => row.kind === 'versions' && row.id !== id && (row.data as Record<string, FieldValue>).language === data.language)) throw new ConflictException('This is the default version. Make another version the default first.');
    await this.prisma.$transaction(async (tx) => {
      await tx.runtimeEntry.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: `runtime.${RUNTIME_SCHEMA[kind].prefix}_delete`, entityType: 'runtime', entityId: id, summary: `Deleted ${RUNTIME_SCHEMA[kind].noun} ${label(kind, data)}` });
    });
    return { deleted: true };
  }

  async pull(id: string, actor: AdminActor) {
    const image = await this.find('images', id);
    const data = image.data as Record<string, FieldValue>;
    const ref = `${data.name}:${data.tag}`;
    const workers = await this.prisma.judgeWorker.findMany({ where: { status: { in: ['online', 'draining'] } } });
    if (!workers.length) throw new ConflictException('No judge worker is online to pull the image.');
    await this.prisma.runtimeEntry.update({ where: { id }, data: { status: 'pulling' } });
    const results = await Promise.all(
      workers.map(async (worker) => {
        try {
          const response = await fetch(`${worker.host}/images/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: ref }), signal: AbortSignal.timeout(120_000) });
          return response.status === 404 ? 'unsupported' : response.ok ? 'ok' : 'failed';
        } catch {
          return 'failed';
        }
      }),
    );
    if (results.every((result) => result === 'unsupported')) {
      await this.prisma.runtimeEntry.update({ where: { id }, data: { status: image.status === 'pulling' ? 'failed' : image.status } });
      throw new NotImplementedException('The judge workers do not support pulling images yet. Pull it on the worker hosts with docker pull, then mark it ready.');
    }
    const status = results.every((result) => result === 'ok') ? 'ready' : 'failed';
    await this.prisma.runtimeEntry.update({ where: { id }, data: { status } });
    await this.audit.record(this.prisma, actor, { action: 'runtime.img_pull', entityType: 'runtime', entityId: id, summary: `Pulled ${ref} on ${workers.length} worker${workers.length === 1 ? '' : 's'}: ${status}` });
    return present(await this.find('images', id));
  }

  async markImage(id: string, status: 'ready' | 'failed', actor: AdminActor) {
    const image = await this.find('images', id);
    const data = image.data as Record<string, FieldValue>;
    if (image.status === status) return present(image);
    await this.prisma.$transaction(async (tx) => {
      await tx.runtimeEntry.update({ where: { id }, data: { status } });
      await this.audit.record(tx, actor, { action: 'runtime.img_status', entityType: 'runtime', entityId: id, summary: `Marked ${data.name}:${data.tag} as ${status}`, changes: { before: image.status, after: status } });
    });
    return present(await this.find('images', id));
  }
}