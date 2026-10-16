import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { INSTITUTION_PERMISSIONS, isInstitutionPermission, STAFF_PRESETS, type InstitutionPermission } from '../access/permissions.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import type { InviteStaffDto, UpdateStaffDto } from './institute-staff.dto.js';

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  status: true,
  lastLoginAt: true,
  invitedByName: true,
  revokeReason: true,
  createdAt: true,
  staffTitle: true,
  staffPermissions: true,
  staffGroups: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>;

const tempPassword = () => `${randomBytes(9).toString('base64url')}A1!`;

const ordered = (keys: string[]) => INSTITUTION_PERMISSIONS.filter((key) => keys.includes(key));

const shape = (row: StaffRow) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  title: row.staffTitle ?? '',
  permissions: ordered(row.staffPermissions),
  groups: row.staffGroups,
  status: row.status === 'ACTIVE' ? ('active' as const) : ('revoked' as const),
  lastLoginAt: row.lastLoginAt,
  invitedByName: row.invitedByName,
  revokeReason: row.revokeReason,
  createdAt: row.createdAt,
});

@Injectable()
export class InstituteStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async institutionPermissions(organizationId: string): Promise<InstitutionPermission[]> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { permissions: true } });
    return Array.isArray(org?.permissions) ? ordered((org.permissions as unknown[]).filter(isInstitutionPermission)) : [];
  }

  private async cleanPermissions(organizationId: string, keys: InstitutionPermission[]) {
    const allowed = await this.institutionPermissions(organizationId);
    const outside = keys.filter((key) => !allowed.includes(key));
    if (outside.length) throw new BadRequestException('Some selected permissions are not enabled for your institution.');
    const clean = ordered(keys);
    if (clean.length === 0) throw new BadRequestException('Give the staff member at least one permission.');
    return clean;
  }

  private async cleanGroups(organizationId: string, groupIds: string[]) {
    const unique = [...new Set(groupIds)];
    if (unique.length === 0) return unique;
    const found = await this.prisma.learnerGroup.count({ where: { id: { in: unique }, organizationId } });
    if (found !== unique.length) throw new BadRequestException('Some selected groups are not in your institution.');
    return unique;
  }

  private async member(organizationId: string, id: string) {
    const row = await this.prisma.user.findFirst({ where: { id, organizationId, role: 'INSTITUTE_ADMIN', staffTitle: { not: null } }, select: STAFF_SELECT });
    if (!row) throw new NotFoundException('Staff member not found in your institution.');
    return row;
  }

  async list(organizationId: string) {
    const [rows, groups, permissions] = await Promise.all([
      this.prisma.user.findMany({ where: { organizationId, role: 'INSTITUTE_ADMIN', staffTitle: { not: null } }, orderBy: { createdAt: 'desc' }, select: STAFF_SELECT }),
      this.prisma.learnerGroup.findMany({ where: { organizationId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.institutionPermissions(organizationId),
    ]);
    return { items: rows.map(shape), groups, permissions, presets: STAFF_PRESETS };
  }

  async invite(dto: InviteStaffDto, actor: AdminActor, organizationId: string) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException(`${email} already has an account.`);
    const [permissions, groupIds, inviter, org] = await Promise.all([
      this.cleanPermissions(organizationId, dto.permissions),
      this.cleanGroups(organizationId, dto.groupIds),
      this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } }),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    ]);
    const password = tempPassword();
    const title = dto.title.trim();
    const staff = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: dto.name.trim(),
          role: 'INSTITUTE_ADMIN',
          organizationId,
          adminScope: org?.name ?? 'Institution',
          staffTitle: title,
          staffPermissions: permissions,
          staffGroups: { connect: groupIds.map((id) => ({ id })) },
          passwordHash: await bcrypt.hash(password, 12),
          mustChangePassword: true,
          invitedByName: inviter?.name ?? 'Institute admin',
        },
        select: STAFF_SELECT,
      });
      await this.audit.record(tx, actor, { action: 'staff.invite', entityType: 'user', entityId: created.id, summary: `Invited ${created.name} (${email}) as ${title}` });
      return created;
    });
    return { staff: shape(staff), temporaryPassword: password };
  }

  async update(id: string, dto: UpdateStaffDto, actor: AdminActor, organizationId: string) {
    const existing = await this.member(organizationId, id);
    const data: Prisma.UserUpdateInput = {};
    if (dto.title !== undefined) data.staffTitle = dto.title.trim();
    if (dto.permissions !== undefined) data.staffPermissions = await this.cleanPermissions(organizationId, dto.permissions);
    if (dto.groupIds !== undefined) data.staffGroups = { set: (await this.cleanGroups(organizationId, dto.groupIds)).map((groupId) => ({ id: groupId })) };
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await this.audit.record(tx, actor, {
        action: 'staff.update',
        entityType: 'user',
        entityId: id,
        summary: `Updated staff member ${existing.name}`,
        changes: {
          ...(dto.title !== undefined ? { title: { before: existing.staffTitle, after: data.staffTitle } } : {}),
          ...(dto.permissions !== undefined ? { permissions: { before: ordered(existing.staffPermissions), after: data.staffPermissions } } : {}),
          ...(dto.groupIds !== undefined ? { groups: { before: existing.staffGroups.map((group) => group.name), after: dto.groupIds.length } } : {}),
        },
      });
    });
    return shape(await this.member(organizationId, id));
  }

  async revoke(id: string, reason: string, actor: AdminActor, organizationId: string) {
    const row = await this.member(organizationId, id);
    if (row.status === 'ACTIVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { status: 'DEACTIVATED', revokeReason: reason.trim() } });
        await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit.record(tx, actor, { action: 'staff.revoke', entityType: 'user', entityId: id, summary: `Revoked staff member ${row.name}`, changes: { reason: reason.trim() } });
      });
    }
    return shape(await this.member(organizationId, id));
  }

  async restore(id: string, actor: AdminActor, organizationId: string) {
    const row = await this.member(organizationId, id);
    if (row.status !== 'ACTIVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { status: 'ACTIVE', revokeReason: null } });
        await this.audit.record(tx, actor, { action: 'staff.restore', entityType: 'user', entityId: id, summary: `Restored staff member ${row.name}` });
      });
    }
    return shape(await this.member(organizationId, id));
  }
}