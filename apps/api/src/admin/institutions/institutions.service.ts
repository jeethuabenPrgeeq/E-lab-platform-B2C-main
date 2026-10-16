import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DEFAULT_INSTITUTION_PERMISSIONS, isInstitutionPermission, type InstitutionPermission } from '../access/permissions.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import type { CreateInstitutionDto, InstitutionQueryDto, InviteInstituteAdminDto, UpdateInstitutionDto } from './institutions.dto.js';

const ADMIN_SELECT = { id: true, name: true, email: true, status: true, lastLoginAt: true, invitedByName: true, revokeReason: true, createdAt: true } as const;
type AdminRow = Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;

const tempPassword = () => `${randomBytes(9).toString('base64url')}A1!`;
const keysOf = (value: unknown): InstitutionPermission[] => (Array.isArray(value) ? [...new Set(value.filter(isInstitutionPermission))].sort() : []);
const adminStatus = (row: Pick<AdminRow, 'status' | 'lastLoginAt'>) => (row.status !== 'ACTIVE' ? 'revoked' : row.lastLoginAt ? 'active' : 'invited');

function presentAdmin(row: AdminRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: adminStatus(row),
    lastSignInAt: row.lastLoginAt?.getTime() ?? null,
    invitedBy: row.invitedByName ?? 'System',
    revokeReason: row.revokeReason,
    createdAt: row.createdAt.getTime(),
  };
}

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async actorName(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    return user?.name ?? actor.email;
  }

  private async institution(id: string) {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Institution not found.');
    return row;
  }

  private async instituteAdmin(institutionId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: 'INSTITUTE_ADMIN', organizationId: institutionId }, select: ADMIN_SELECT });
    if (!user) throw new NotFoundException('Institute Admin not found in this institution.');
    return user;
  }

  async list(query: InstitutionQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.OrganizationWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { code: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total, statusRows, unlinked] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { problems: true, users: { where: { role: 'LEARNER', status: 'ACTIVE' } } } }, users: { where: { role: 'INSTITUTE_ADMIN', status: 'ACTIVE' }, select: { id: true } } },
      }),
      this.prisma.organization.count({ where }),
      this.prisma.organization.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { role: 'INSTITUTE_ADMIN', organizationId: null, status: 'ACTIVE' } }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        type: row.type,
        status: row.status,
        contactEmail: row.contactEmail,
        permissions: keysOf(row.permissions),
        admins: row.users.length,
        problems: row._count.problems,
        learners: row._count.users,
        createdAt: row.createdAt.getTime(),
      })),
      total,
      page,
      pageSize,
      statusCounts: Object.fromEntries(statusRows.map((row) => [row.status, row._count._all])),
      unlinkedAdmins: unlinked,
    };
  }

  async get(id: string) {
    const row = await this.institution(id);
    const [admins, problems, learners] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'INSTITUTE_ADMIN', organizationId: id }, orderBy: { createdAt: 'asc' }, select: ADMIN_SELECT }),
      this.prisma.problem.groupBy({ by: ['status'], where: { organizationId: id }, _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], where: { role: 'LEARNER', organizationId: id }, _count: { _all: true } }),
    ]);
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      type: row.type,
      status: row.status,
      contactEmail: row.contactEmail,
      permissions: keysOf(row.permissions),
      createdBy: row.createdByName ?? 'System',
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      admins: admins.map(presentAdmin),
      problemsByStatus: Object.fromEntries(problems.map((item) => [item.status, item._count._all])),
      learners: {
        active: learners.find((item) => item.status === 'ACTIVE')?._count._all ?? 0,
        revoked: learners.filter((item) => item.status !== 'ACTIVE').reduce((sum, item) => sum + item._count._all, 0),
      },
    };
  }

  async create(dto: CreateInstitutionDto, actor: AdminActor) {
    const code = dto.code.trim().toUpperCase();
    if (await this.prisma.organization.findUnique({ where: { code } })) throw new ConflictException(`The code ${code} is already used by another institution.`);
    const permissions = dto.permissions ? keysOf(dto.permissions) : [...DEFAULT_INSTITUTION_PERMISSIONS];
    const createdByName = await this.actorName(actor);
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.organization.create({
        data: { name: dto.name.trim(), code, type: dto.type, contactEmail: dto.contactEmail?.trim().toLowerCase() || null, permissions, createdByName },
      });
      await this.audit.record(tx, actor, { action: 'institution.create', entityType: 'institution', entityId: row.id, summary: `Registered ${row.name} (${code})`, changes: { permissions } });
      return row;
    });
    return this.get(created.id);
  }

  async update(id: string, dto: UpdateInstitutionDto, actor: AdminActor) {
    const row = await this.institution(id);
    const data: Prisma.OrganizationUpdateInput = {};
    const fields: { field: string; before: string; after: string }[] = [];
    const track = (field: string, before: string | null, after: string | null | undefined) => {
      if (after === undefined || (after ?? '') === (before ?? '')) return false;
      fields.push({ field, before: before ?? '', after: after ?? '' });
      return true;
    };
    if (track('Name', row.name, dto.name?.trim())) data.name = dto.name!.trim();
    if (track('Type', row.type, dto.type)) data.type = dto.type;
    if (track('Contact email', row.contactEmail, dto.contactEmail?.trim().toLowerCase())) data.contactEmail = dto.contactEmail!.trim().toLowerCase();
    if (track('Status', row.status, dto.status)) data.status = dto.status;
    if (fields.length === 0) return this.get(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id }, data });
      if (dto.status === 'suspended') {
        const admins = await tx.user.findMany({ where: { organizationId: id, role: 'INSTITUTE_ADMIN' }, select: { id: true } });
        await tx.refreshSession.updateMany({ where: { userId: { in: admins.map((admin) => admin.id) }, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await this.audit.record(tx, actor, { action: 'institution.update', entityType: 'institution', entityId: id, summary: `Updated ${row.name}: ${fields.map((item) => item.field.toLowerCase()).join(', ')}`, changes: { fields } });
    });
    return this.get(id);
  }

  async setPermissions(id: string, permissions: InstitutionPermission[], actor: AdminActor) {
    const row = await this.institution(id);
    const before = keysOf(row.permissions);
    const next = keysOf(permissions);
    const added = next.filter((key) => !before.includes(key));
    const removed = before.filter((key) => !next.includes(key));
    if (added.length === 0 && removed.length === 0) return this.get(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id }, data: { permissions: next } });
      await this.audit.record(tx, actor, {
        action: 'institution.permissions',
        entityType: 'institution',
        entityId: id,
        summary: `Updated ${row.name} permissions: ${[added.length ? `added ${added.join(', ')}` : '', removed.length ? `removed ${removed.join(', ')}` : ''].filter(Boolean).join('; ')}`,
        changes: { added, removed },
      });
    });
    return this.get(id);
  }

  async inviteAdmin(id: string, dto: InviteInstituteAdminDto, actor: AdminActor) {
    const row = await this.institution(id);
    if (row.status !== 'active') throw new BadRequestException('Reactivate the institution before inviting admins.');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('A user with this email already exists.');
    const password = tempPassword();
    const invitedByName = await this.actorName(actor);
    const admin = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: dto.name.trim(), role: 'INSTITUTE_ADMIN', organizationId: id, adminScope: row.name, passwordHash: await bcrypt.hash(password, 12), invitedByName },
        select: ADMIN_SELECT,
      });
      await this.audit.record(tx, actor, { action: 'institution.admin_invite', entityType: 'institution', entityId: id, summary: `Invited ${email} as Institute Admin of ${row.name}` });
      return user;
    });
    return { admin: presentAdmin(admin), temporaryPassword: password };
  }

  async unlinkedAdmins() {
    const rows = await this.prisma.user.findMany({ where: { role: 'INSTITUTE_ADMIN', organizationId: null }, orderBy: { name: 'asc' }, select: ADMIN_SELECT });
    return { items: rows.map(presentAdmin) };
  }

  async unlinkedLearners(q?: string) {
    const term = q?.trim();
    const rows = await this.prisma.user.findMany({
      where: {
        role: 'LEARNER',
        organizationId: null,
        status: 'ACTIVE',
        ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { name: 'asc' },
      take: 20,
      select: { id: true, name: true, email: true },
    });
    return { items: rows };
  }

  async linkLearner(id: string, userId: string, actor: AdminActor) {
    const row = await this.institution(id);
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: 'LEARNER', organizationId: null }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('No unlinked learner with that id.');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { organizationId: id } });
      await this.audit.record(tx, actor, { action: 'institution.learner_link', entityType: 'institution', entityId: id, summary: `Linked learner ${user.email} to ${row.name}` });
    });
    return this.get(id);
  }

  async unlinkLearner(id: string, userId: string, actor: AdminActor) {
    const row = await this.institution(id);
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: 'LEARNER', organizationId: id }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('Learner not found in this institution.');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { organizationId: null } });
      await this.audit.record(tx, actor, { action: 'institution.learner_unlink', entityType: 'institution', entityId: id, summary: `Unlinked learner ${user.email} from ${row.name}` });
    });
    return this.get(id);
  }

  async linkAdmin(id: string, userId: string, actor: AdminActor) {
    const row = await this.institution(id);
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: 'INSTITUTE_ADMIN', organizationId: null }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('No unlinked Institute Admin with that id.');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { organizationId: id, adminScope: row.name } });
      await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actor, { action: 'institution.admin_link', entityType: 'institution', entityId: id, summary: `Linked ${user.email} to ${row.name}` });
    });
    return this.get(id);
  }

  async revokeAdmin(id: string, userId: string, reason: string, actor: AdminActor) {
    const row = await this.institution(id);
    const user = await this.instituteAdmin(id, userId);
    if (user.status === 'ACTIVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { status: 'DEACTIVATED', revokeReason: reason.trim() } });
        await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit.record(tx, actor, { action: 'institution.admin_revoke', entityType: 'institution', entityId: id, summary: `Revoked ${user.email} from ${row.name}: ${reason.trim()}` });
      });
    }
    return this.get(id);
  }

  async restoreAdmin(id: string, userId: string, actor: AdminActor) {
    const row = await this.institution(id);
    const user = await this.instituteAdmin(id, userId);
    if (user.status !== 'ACTIVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { status: 'ACTIVE', revokeReason: null } });
        await this.audit.record(tx, actor, { action: 'institution.admin_restore', entityType: 'institution', entityId: id, summary: `Restored ${user.email} in ${row.name}` });
      });
    }
    return this.get(id);
  }
}
