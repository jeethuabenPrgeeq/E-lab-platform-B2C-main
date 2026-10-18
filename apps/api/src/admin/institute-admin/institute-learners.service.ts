import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { StaffScope } from '../access/effective-permissions.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import type {
  ImportLearnersDto,
  InviteLearnerDto,
  LearnerQueryDto,
} from './institute-learners.dto.js';

const LEARNER_SELECT = {
  id: true,
  name: true,
  email: true,
  status: true,
  lastLoginAt: true,
  invitedByName: true,
  revokeReason: true,
  createdAt: true,
  learnerGroup: { select: { id: true, name: true } },
} as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LearnerRow = Prisma.UserGetPayload<{ select: typeof LEARNER_SELECT }>;

const tempPassword = () => `${randomBytes(9).toString('base64url')}A1!`;

const shape = (row: LearnerRow) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  status: row.status === 'ACTIVE' ? ('active' as const) : ('revoked' as const),
  lastLoginAt: row.lastLoginAt,
  invitedByName: row.invitedByName,
  revokeReason: row.revokeReason,
  group: row.learnerGroup,
  createdAt: row.createdAt,
});

@Injectable()
export class InstituteLearnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async inviter(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { name: true },
    });
    return user?.name ?? 'Institute admin';
  }

  private inScope(scope: StaffScope | null): Prisma.UserWhereInput {
    return scope ? { learnerGroupId: { in: scope.groupIds } } : {};
  }

  private async targetGroup(
    organizationId: string,
    groupId: string | null | undefined,
    scope: StaffScope | null,
  ) {
    if (!groupId) {
      if (scope)
        throw new BadRequestException('Choose one of your learner groups.');
      return null;
    }
    if (scope && !scope.groupIds.includes(groupId))
      throw new ForbiddenException('That group is not assigned to you.');
    const group = await this.prisma.learnerGroup.findFirst({
      where: { id: groupId, organizationId },
      select: { id: true },
    });
    if (!group)
      throw new BadRequestException('That group is not in your institution.');
    return group.id;
  }

  private async learner(
    organizationId: string,
    userId: string,
    scope: StaffScope | null = null,
  ) {
    const row = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: 'LEARNER',
        ...this.inScope(scope),
      },
      select: LEARNER_SELECT,
    });
    if (!row)
      throw new NotFoundException('Learner not found in your institution.');
    return row;
  }

  async list(
    query: LearnerQueryDto,
    organizationId: string,
    scope: StaffScope | null = null,
  ) {
    const q = query.q?.trim();
    const base: Prisma.UserWhereInput = {
      organizationId,
      role: 'LEARNER',
      ...this.inScope(scope),
    };
    const [rows, active, revoked, neverSignedIn, groups] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          ...base,
          ...(query.status === 'active'
            ? { status: 'ACTIVE' }
            : query.status === 'revoked'
              ? { status: { not: 'ACTIVE' } }
              : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: 500,
        select: LEARNER_SELECT,
      }),
      this.prisma.user.count({ where: { ...base, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { ...base, status: { not: 'ACTIVE' } } }),
      this.prisma.user.count({
        where: { ...base, status: 'ACTIVE', lastLoginAt: null },
      }),
      this.prisma.learnerGroup.findMany({
        where: {
          organizationId,
          ...(scope ? { id: { in: scope.groupIds } } : {}),
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { learners: { where: { status: 'ACTIVE' } } } },
        },
      }),
    ]);
    return {
      items: rows.map(shape),
      counts: { active, revoked, neverSignedIn },
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        learners: group._count.learners,
      })),
      scoped: scope !== null,
    };
  }

  async createGroup(name: string, actor: AdminActor, organizationId: string) {
    const clean = name.trim();
    if (
      await this.prisma.learnerGroup.findFirst({
        where: { organizationId, name: { equals: clean, mode: 'insensitive' } },
        select: { id: true },
      })
    ) {
      throw new ConflictException(`A group called "${clean}" already exists.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.learnerGroup.create({
        data: { organizationId, name: clean },
        select: { id: true, name: true },
      });
      await this.audit.record(tx, actor, {
        action: 'learner_group.create',
        entityType: 'learner_group',
        entityId: group.id,
        summary: `Created learner group ${clean}`,
      });
      return { ...group, learners: 0 };
    });
  }

  async deleteGroup(
    groupId: string,
    actor: AdminActor,
    organizationId: string,
  ) {
    const group = await this.prisma.learnerGroup.findFirst({
      where: { id: groupId, organizationId },
      select: { id: true, name: true },
    });
    if (!group)
      throw new NotFoundException('Group not found in your institution.');
    const stranded = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: 'INSTITUTE_ADMIN',
        staffTitle: { not: null },
        staffGroups: { some: { id: groupId }, every: { id: groupId } },
      },
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    if (stranded.length > 0) {
      const names = stranded.map((member) => member.name).join(', ');
      throw new ConflictException(
        `${group.name} is the only group for ${names}. Assign ${stranded.length === 1 ? 'them' : 'each of them'} another group on the Staff page first.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.contentBatch.updateMany({
        where: { assignedGroupId: groupId },
        data: { assignedAt: null, assignedByName: null, assignedGroupId: null },
      });
      await tx.learnerGroup.delete({ where: { id: groupId } });
      await this.audit.record(tx, actor, {
        action: 'learner_group.delete',
        entityType: 'learner_group',
        entityId: groupId,
        summary: `Deleted learner group ${group.name}`,
      });
    });
    return { deleted: true };
  }

  async setGroup(
    userId: string,
    groupId: string | null,
    actor: AdminActor,
    organizationId: string,
    scope: StaffScope | null = null,
  ) {
    const row = await this.learner(organizationId, userId, scope);
    if (row.status !== 'ACTIVE')
      throw new BadRequestException(
        'Restore this learner before changing their group.',
      );
    await this.targetGroup(organizationId, groupId, scope);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { learnerGroupId: groupId },
      });
      await this.audit.record(tx, actor, {
        action: 'learner.group',
        entityType: 'user',
        entityId: userId,
        summary: groupId
          ? `Moved ${row.name} to a learner group`
          : `Removed ${row.name} from their group`,
      });
    });
    return shape(await this.learner(organizationId, userId, scope));
  }

  async invite(
    dto: InviteLearnerDto,
    actor: AdminActor,
    organizationId: string,
    scope: StaffScope | null = null,
  ) {
    const email = dto.email.trim().toLowerCase();
    const learnerGroupId = await this.targetGroup(
      organizationId,
      dto.groupId,
      scope,
    );
    if (
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
    )
      throw new ConflictException(`${email} already has an account.`);
    const password = tempPassword();
    const invitedByName = await this.inviter(actor);
    const learner = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: dto.name.trim(),
          role: 'LEARNER',
          organizationId,
          learnerGroupId,
          passwordHash: await bcrypt.hash(password, 12),
          mustChangePassword: true,
          invitedByName,
        },
        select: LEARNER_SELECT,
      });
      await this.audit.record(tx, actor, {
        action: 'learner.invite',
        entityType: 'user',
        entityId: created.id,
        summary: `Invited learner ${created.name} (${email})`,
      });
      return created;
    });
    return { learner: shape(learner), temporaryPassword: password };
  }

  async import(
    dto: ImportLearnersDto,
    actor: AdminActor,
    organizationId: string,
    scope: StaffScope | null = null,
  ) {
    const learnerGroupId = await this.targetGroup(
      organizationId,
      dto.groupId,
      scope,
    );
    const skipped: { row: number; email: string; reason: string }[] = [];
    const seen = new Set<string>();
    const candidates: { row: number; name: string; email: string }[] = [];
    dto.rows.forEach((raw, index) => {
      const row = index + 1;
      const name = raw.name.trim();
      const email = raw.email.trim().toLowerCase();
      if (name.length < 2 || name.length > 80)
        skipped.push({ row, email, reason: 'Name must be 2-80 characters' });
      else if (!EMAIL.test(email) || email.length > 160)
        skipped.push({ row, email, reason: 'Not a valid email address' });
      else if (seen.has(email))
        skipped.push({ row, email, reason: 'Duplicate email in this import' });
      else {
        seen.add(email);
        candidates.push({ row, name, email });
      }
    });
    const existing = new Set(
      (
        await this.prisma.user.findMany({
          where: { email: { in: candidates.map((c) => c.email) } },
          select: { email: true },
        })
      ).map((u) => u.email),
    );
    const fresh = candidates.filter((c) => {
      if (!existing.has(c.email)) return true;
      skipped.push({
        row: c.row,
        email: c.email,
        reason: 'Already has an account',
      });
      return false;
    });
    if (fresh.length === 0) {
      throw new BadRequestException({
        message: 'No learners could be imported.',
        issues: skipped
          .sort((a, b) => a.row - b.row)
          .slice(0, 20)
          .map((s) => `Row ${s.row}: ${s.reason}.`),
      });
    }
    const invitedByName = await this.inviter(actor);
    const prepared = await Promise.all(
      fresh.map(async (c) => {
        const password = tempPassword();
        return { ...c, password, hash: await bcrypt.hash(password, 12) };
      }),
    );
    await this.prisma.$transaction(
      async (tx) => {
        await tx.user.createMany({
          data: prepared.map((item) => ({
            email: item.email,
            name: item.name,
            role: 'LEARNER' as const,
            organizationId,
            learnerGroupId,
            passwordHash: item.hash,
            mustChangePassword: true,
            invitedByName,
          })),
        });
        await this.audit.record(tx, actor, {
          action: 'learner.import',
          entityType: 'organization',
          entityId: organizationId,
          summary: `Imported ${prepared.length} learner${prepared.length === 1 ? '' : 's'}${skipped.length ? ` (${skipped.length} skipped)` : ''}`,
        });
      },
      { timeout: 60_000 },
    );
    return {
      created: prepared.map((item) => ({
        name: item.name,
        email: item.email,
        temporaryPassword: item.password,
      })),
      skipped: skipped.sort((a, b) => a.row - b.row),
    };
  }

  async revoke(
    userId: string,
    reason: string,
    actor: AdminActor,
    organizationId: string,
    scope: StaffScope | null = null,
  ) {
    const row = await this.learner(organizationId, userId, scope);
    if (row.status === 'ACTIVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { status: 'DEACTIVATED', revokeReason: reason.trim() },
        });
        await tx.refreshSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.record(tx, actor, {
          action: 'learner.revoke',
          entityType: 'user',
          entityId: userId,
          summary: `Revoked learner ${row.name}`,
          changes: { reason: reason.trim() },
        });
      });
    }
    return shape(await this.learner(organizationId, userId));
  }

  async restore(
    userId: string,
    actor: AdminActor,
    organizationId: string,
    scope: StaffScope | null = null,
  ) {
    const row = await this.learner(organizationId, userId, scope);
    if (row.status !== 'ACTIVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { status: 'ACTIVE', revokeReason: null },
        });
        await this.audit.record(tx, actor, {
          action: 'learner.restore',
          entityType: 'user',
          entityId: userId,
          summary: `Restored learner ${row.name}`,
        });
      });
    }
    return shape(await this.learner(organizationId, userId));
  }
}
