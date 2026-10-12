import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import type {
  CreateUserDto,
  ResetPasswordDto,
  RoleKey,
  StatusKey,
  UpdateUserDto,
  UserQueryDto,
  UserStatusDto,
} from './users.dto.js';

type DbRole = 'LEARNER' | 'PLATFORM_ADMIN' | 'SUPER_ADMIN';
type DbStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

const toDbRole = (role: RoleKey) => role.replace('-', '_').toUpperCase() as DbRole;
const fromDbRole = (role: DbRole) => role.toLowerCase().replace('_', '-') as RoleKey;
const toDbStatus = (status: StatusKey) => status.toUpperCase() as DbStatus;
const fromDbStatus = (status: DbStatus) => status.toLowerCase() as StatusKey;

const PUBLIC = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC }>;

function present(user: PublicUser) {
  return { ...user, role: fromDbRole(user.role), status: fromDbStatus(user.status) };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: UserQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: toDbRole(query.role) } : {}),
      ...(query.status ? { status: toDbStatus(query.status) } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { name: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total, byRole, byStatus] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: PUBLIC,
        orderBy: { createdAt: query.order ?? 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      items: items.map(present),
      total,
      page,
      pageSize,
      roleCounts: Object.fromEntries(byRole.map((row) => [fromDbRole(row.role), row._count._all])),
      statusCounts: Object.fromEntries(byStatus.map((row) => [fromDbStatus(row.status), row._count._all])),
    };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC });
    if (!user) throw new NotFoundException('User not found.');
    const [activeSessions, activity] = await Promise.all([
      this.prisma.refreshSession.count({
        where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      this.prisma.technicalAuditLog.findMany({
        where: { OR: [{ actorId: id }, { entityType: 'user', entityId: id }] },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, action: true, summary: true, actorEmail: true, createdAt: true },
      }),
    ]);
    return { ...present(user), activeSessions, activity };
  }

  async create(dto: CreateUserDto, actor: AdminActor) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('A user with this email already exists.');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: dto.name.trim(), role: toDbRole(dto.role), passwordHash },
        select: PUBLIC,
      });
      await this.audit.record(tx, actor, {
        action: 'user.create',
        entityType: 'user',
        entityId: user.id,
        summary: `Created ${dto.role} ${email}`,
      });
      return present(user);
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AdminActor) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC });
    if (!existing) throw new NotFoundException('User not found.');
    const data: Prisma.UserUpdateInput = {};
    const changes: { field: string; before: unknown; after: unknown }[] = [];
    if (dto.name !== undefined && dto.name.trim() !== existing.name) {
      data.name = dto.name.trim();
      changes.push({ field: 'Name', before: existing.name, after: data.name });
    }
    if (dto.role !== undefined && toDbRole(dto.role) !== existing.role) {
      if (id === actor.id) throw new BadRequestException('You cannot change your own role.');
      if (existing.role === 'SUPER_ADMIN') await this.assertNotLastSuperAdmin(id);
      data.role = toDbRole(dto.role);
      changes.push({ field: 'Role', before: fromDbRole(existing.role), after: dto.role });
    }
    if (changes.length === 0) return present(existing);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data, select: PUBLIC });
      if (data.role) {
        await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await this.audit.record(tx, actor, {
        action: 'user.update',
        entityType: 'user',
        entityId: id,
        summary: `Updated ${existing.email}`,
        changes,
      });
      return present(user);
    });
  }

  async setStatus(id: string, dto: UserStatusDto, actor: AdminActor) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC });
    if (!existing) throw new NotFoundException('User not found.');
    const next = toDbStatus(dto.status);
    if (next === existing.status) return present(existing);
    if (id === actor.id) throw new BadRequestException('You cannot change your own status.');
    if (next !== 'ACTIVE' && !dto.reason?.trim()) throw new BadRequestException('A reason is required to suspend or deactivate a user.');
    if (next !== 'ACTIVE' && existing.role === 'SUPER_ADMIN') await this.assertNotLastSuperAdmin(id);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { status: next }, select: PUBLIC });
      if (next !== 'ACTIVE') {
        await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await this.audit.record(tx, actor, {
        action: `user.${dto.status === 'active' ? 'activate' : dto.status === 'suspended' ? 'suspend' : 'deactivate'}`,
        entityType: 'user',
        entityId: id,
        summary: `${dto.status === 'active' ? 'Activated' : dto.status === 'suspended' ? 'Suspended' : 'Deactivated'} ${existing.email}`,
        changes: { before: fromDbStatus(existing.status), after: dto.status, ...(dto.reason ? { reason: dto.reason.trim() } : {}) },
      });
      return present(user);
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actor: AdminActor) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!existing) throw new NotFoundException('User not found.');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actor, {
        action: 'user.reset_password',
        entityType: 'user',
        entityId: id,
        summary: `Reset the password for ${existing.email}`,
      });
    });
    return { reset: true };
  }

  async overview() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [byRole, byStatus, activeWeek, newWeek, problems, technologies, recent] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.problem.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.technology.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.technicalAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, summary: true, actorEmail: true, createdAt: true },
      }),
    ]);
    const count = <T extends string>(rows: { _count: { _all: number } }[], key: (row: never) => T) =>
      Object.fromEntries(rows.map((row) => [key(row as never), row._count._all]));
    return {
      users: {
        byRole: count(byRole, (row: { role: DbRole }) => fromDbRole(row.role)),
        byStatus: count(byStatus, (row: { status: DbStatus }) => fromDbStatus(row.status)),
        activeLast7Days: activeWeek,
        newLast7Days: newWeek,
      },
      problems: count(problems, (row: { status: string }) => row.status),
      technologies: count(technologies, (row: { status: string }) => row.status),
      recentActivity: recent,
    };
  }

  private async assertNotLastSuperAdmin(id: string) {
    const others = await this.prisma.user.count({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { not: id } },
    });
    if (others === 0) throw new BadRequestException('At least one active super admin must remain.');
  }
}