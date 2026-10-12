import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from '../content/activity.js';
import type { AdminQueryDto, CreateRoleDto, InviteAdminDto } from './access.dto.js';
import { ALL_SCOPE, DEFAULT_ROLES, PERMISSIONS, PLATFORM_ROLE, SUPER_ROLE, type Permission } from './permissions.js';

const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  adminRoleId: true,
  adminScope: true,
  mfaEnabled: true,
  invitedByName: true,
  revokeReason: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

type AdminRow = Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;

const roleIdOf = (row: Pick<AdminRow, 'role' | 'adminRoleId'>) => row.adminRoleId ?? (row.role === 'PLATFORM_ADMIN' ? PLATFORM_ROLE : SUPER_ROLE);
const statusOf = (row: Pick<AdminRow, 'status' | 'revokeReason' | 'lastLoginAt'>) => (row.status !== 'ACTIVE' ? 'revoked' : row.lastLoginAt ? 'active' : 'invited');
const authRoleFor = (roleId: string) => (roleId === PLATFORM_ROLE ? 'PLATFORM_ADMIN' : 'SUPER_ADMIN');
const tempPassword = () => `${randomBytes(9).toString('base64url')}A1!`;

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async ensureRoles() {
    const count = await this.prisma.adminRole.count({ where: { id: { in: DEFAULT_ROLES.map((role) => role.id) } } });
    if (count < DEFAULT_ROLES.length) {
      await this.prisma.adminRole.createMany({
        data: DEFAULT_ROLES.map((role) => ({ ...role, permissions: role.permissions, updatedByName: 'System' })),
        skipDuplicates: true,
      });
    }
  }

  private async actorName(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    return user?.name ?? actor.email;
  }

  private present(row: AdminRow, actorId: string) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      roleId: roleIdOf(row),
      scope: row.adminScope,
      status: statusOf(row),
      mfa: row.mfaEnabled,
      self: row.id === actorId,
      createdAt: row.createdAt.getTime(),
      lastSignInAt: row.lastLoginAt?.getTime() ?? null,
      invitedBy: row.invitedByName ?? 'System',
      revokeReason: row.revokeReason,
    };
  }

  async roles() {
    await this.ensureRoles();
    const [roles, members] = await Promise.all([
      this.prisma.adminRole.findMany({ orderBy: [{ system: 'desc' }, { createdAt: 'asc' }] }),
      this.prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'PLATFORM_ADMIN'] }, status: 'ACTIVE' }, select: { role: true, adminRoleId: true } }),
    ]);
    const counts = new Map<string, number>();
    for (const member of members) {
      const id = roleIdOf(member);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      system: role.system,
      locked: role.locked,
      permissions: role.permissions as Permission[],
      members: counts.get(role.id) ?? 0,
      updatedAt: role.updatedAt.getTime(),
      updatedBy: role.updatedByName ?? 'System',
    }));
  }

  async me(actor: AdminActor) {
    await this.ensureRoles();
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { ...ADMIN_SELECT, adminRole: { select: { name: true, permissions: true } } } });
    if (!user) throw new NotFoundException('User not found.');
    const roleId = roleIdOf(user);
    const permissions = roleId === SUPER_ROLE ? [...PERMISSIONS] : ((user.adminRole?.permissions as Permission[] | undefined) ?? DEFAULT_ROLES.find((role) => role.id === roleId)?.permissions ?? []);
    return { roleId, roleName: user.adminRole?.name ?? (roleId === SUPER_ROLE ? 'Super admin' : 'Platform admin'), scope: user.adminScope, permissions };
  }

  async list(query: AdminQueryDto, actor: AdminActor) {
    await this.ensureRoles();
    const rows = await this.prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'PLATFORM_ADMIN'] },
        ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] } : {}),
      },
      select: ADMIN_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    let items = rows.map((row) => this.present(row, actor.id));
    const statusCounts: Record<string, number> = {};
    for (const item of items) statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
    if (query.roleId) items = items.filter((item) => item.roleId === query.roleId);
    if (query.status) items = items.filter((item) => item.status === query.status);
    const { page, pageSize, skip, take } = pageArgs(query);
    return { items: items.slice(skip, skip + take), total: items.length, page, pageSize, statusCounts, mfaMissing: rows.filter((row) => row.status === 'ACTIVE' && !row.mfaEnabled).length };
  }

  async get(id: string, actor: AdminActor) {
    const row = await this.admin(id);
    const [activity, sessions] = await Promise.all([
      activityFor(this.prisma, 'admin', [id]),
      this.prisma.refreshSession.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
    ]);
    return { ...this.present(row, actor.id), activeSessions: sessions, activity: activity.get(id) ?? [] };
  }

  private async admin(id: string) {
    const row = await this.prisma.user.findFirst({ where: { id, role: { in: ['SUPER_ADMIN', 'PLATFORM_ADMIN'] } }, select: ADMIN_SELECT });
    if (!row) throw new NotFoundException('Admin not found.');
    return row;
  }

  private async role(id: string) {
    await this.ensureRoles();
    const role = await this.prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new BadRequestException('Unknown role.');
    return role;
  }

  private async assertNotLastSuper(id: string) {
    const supers = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { not: id } }, select: { adminRoleId: true } });
    if (!supers.some((user) => !user.adminRoleId || user.adminRoleId === SUPER_ROLE)) throw new BadRequestException('eLab must always have at least one active super admin.');
  }

  async invite(dto: InviteAdminDto, actor: AdminActor) {
    const role = await this.role(dto.roleId);
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('A user with this email already exists.');
    const password = tempPassword();
    const inviter = await this.actorName(actor);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: dto.name.trim(),
          role: authRoleFor(role.id),
          adminRoleId: role.id,
          adminScope: role.id === SUPER_ROLE ? ALL_SCOPE : dto.scope?.trim() || ALL_SCOPE,
          passwordHash: await bcrypt.hash(password, 12),
          invitedByName: inviter,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record(tx, actor, { action: 'admin.invite', entityType: 'admin', entityId: user.id, summary: `Invited ${email} as ${role.name}` });
      return user;
    });
    return { admin: this.present(created, actor.id), temporaryPassword: password };
  }

  async setRole(id: string, roleId: string, actor: AdminActor) {
    const row = await this.admin(id);
    const role = await this.role(roleId);
    const current = roleIdOf(row);
    if (current === roleId) return this.get(id, actor);
    if (id === actor.id) throw new BadRequestException('You cannot change your own role. Ask another super admin.');
    if (current === SUPER_ROLE && row.status === 'ACTIVE') await this.assertNotLastSuper(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { adminRoleId: role.id, role: authRoleFor(role.id), ...(role.id === SUPER_ROLE ? { adminScope: ALL_SCOPE } : {}) },
      });
      await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actor, { action: 'admin.role', entityType: 'admin', entityId: id, summary: `Changed role from ${current} to ${role.name}`, changes: { before: current, after: role.id } });
    });
    return this.get(id, actor);
  }

  async setScope(id: string, scope: string, actor: AdminActor) {
    const row = await this.admin(id);
    if (roleIdOf(row) === SUPER_ROLE && scope !== ALL_SCOPE) throw new BadRequestException('Super admins always cover all institutions.');
    if (row.adminScope === scope.trim()) return this.get(id, actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { adminScope: scope.trim() } });
      await this.audit.record(tx, actor, { action: 'admin.scope', entityType: 'admin', entityId: id, summary: `Changed scope to ${scope.trim()}` });
    });
    return this.get(id, actor);
  }

  async revoke(id: string, reason: string, actor: AdminActor) {
    const row = await this.admin(id);
    if (id === actor.id) throw new BadRequestException('You cannot revoke your own access.');
    if (row.status !== 'ACTIVE') return this.get(id, actor);
    if (roleIdOf(row) === SUPER_ROLE) await this.assertNotLastSuper(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: 'DEACTIVATED', revokeReason: reason.trim() } });
      await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actor, { action: 'admin.revoke', entityType: 'admin', entityId: id, summary: `Revoked access: ${reason.trim()}` });
    });
    return this.get(id, actor);
  }

  async restore(id: string, actor: AdminActor) {
    const row = await this.admin(id);
    if (row.status === 'ACTIVE') return this.get(id, actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: 'ACTIVE', revokeReason: null } });
      await this.audit.record(tx, actor, { action: 'admin.restore', entityType: 'admin', entityId: id, summary: 'Restored access' });
    });
    return this.get(id, actor);
  }

  async resendInvite(id: string, actor: AdminActor) {
    const row = await this.admin(id);
    if (statusOf(row) !== 'invited') throw new BadRequestException('Only admins who have not signed in yet can get a new invitation.');
    const password = tempPassword();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
      await this.audit.record(tx, actor, { action: 'admin.reinvite', entityType: 'admin', entityId: id, summary: 'Resent the invitation with a new temporary password' });
    });
    return { admin: (await this.get(id, actor)), temporaryPassword: password };
  }

  async resetMfa(id: string, actor: AdminActor) {
    await this.admin(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { mfaEnabled: false } });
      await this.audit.record(tx, actor, { action: 'admin.mfa_reset', entityType: 'admin', entityId: id, summary: 'Reset two-factor authentication. Must set it up again at next sign-in' });
    });
    return this.get(id, actor);
  }

  async signOutEverywhere(id: string, actor: AdminActor) {
    await this.admin(id);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actor, { action: 'admin.sign_out', entityType: 'admin', entityId: id, summary: `Signed out of all sessions (${result.count})` });
    });
    return this.get(id, actor);
  }

  async createRole(dto: CreateRoleDto, actor: AdminActor) {
    await this.ensureRoles();
    const base = slugify(dto.name) || 'role';
    let id = base;
    let n = 2;
    while (await this.prisma.adminRole.findUnique({ where: { id } })) id = `${base}_${n++}`;
    if (await this.prisma.adminRole.findFirst({ where: { name: { equals: dto.name.trim(), mode: 'insensitive' } } })) throw new ConflictException('A role with this name already exists.');
    const source = dto.copyFrom ? await this.prisma.adminRole.findUnique({ where: { id: dto.copyFrom } }) : null;
    if (dto.copyFrom && !source) throw new BadRequestException('The role to copy from does not exist.');
    const name = await this.actorName(actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.adminRole.create({ data: { id, name: dto.name.trim(), description: dto.description.trim(), permissions: (source?.permissions as Permission[] | undefined) ?? [], updatedByName: name } });
      await this.audit.record(tx, actor, { action: 'role.create', entityType: 'admin_role', entityId: id, summary: `Created the role ${dto.name.trim()}${source ? ` from ${source.name}` : ''}` });
    });
    return (await this.roles()).find((role) => role.id === id);
  }

  async savePermissions(id: string, permissions: Permission[], actor: AdminActor) {
    const role = await this.role(id);
    if (role.locked) throw new BadRequestException(`${role.name} cannot be edited.`);
    const next = [...new Set(permissions)].sort();
    const before = (role.permissions as Permission[]).slice().sort();
    if (JSON.stringify(before) === JSON.stringify(next)) return (await this.roles()).find((item) => item.id === id);
    const added = next.filter((key) => !before.includes(key));
    const removed = before.filter((key) => !next.includes(key));
    const name = await this.actorName(actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.adminRole.update({ where: { id }, data: { permissions: next, updatedByName: name } });
      await this.audit.record(tx, actor, {
        action: 'role.permissions',
        entityType: 'admin_role',
        entityId: id,
        summary: `Updated ${role.name}: ${added.length ? `added ${added.join(', ')}` : ''}${added.length && removed.length ? '; ' : ''}${removed.length ? `removed ${removed.join(', ')}` : ''}`,
        changes: { added, removed },
      });
    });
    return (await this.roles()).find((item) => item.id === id);
  }

  async deleteRole(id: string, actor: AdminActor) {
    const role = await this.role(id);
    if (role.system) throw new BadRequestException('Built-in roles cannot be deleted.');
    const members = await this.prisma.user.count({ where: { adminRoleId: id, status: 'ACTIVE' } });
    if (members > 0) throw new BadRequestException(`Move its ${members} member${members === 1 ? '' : 's'} to another role first.`);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { adminRoleId: id }, data: { adminRoleId: 'support_agent' } });
      await tx.adminRole.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'role.delete', entityType: 'admin_role', entityId: id, summary: `Deleted the role ${role.name}` });
    });
    return { deleted: true };
  }
}