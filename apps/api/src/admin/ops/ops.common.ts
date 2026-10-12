import { BadRequestException, Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type Db = Prisma.TransactionClient | PrismaService;

export const ms = (date: Date | null | undefined) => (date ? date.getTime() : null);

@Injectable()
export class OpsDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async person(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true } });
    return { id, name: user?.name ?? 'Unknown', email: user?.email ?? '', role: user?.role ?? 'LEARNER' };
  }

  async team() {
    const rows = await this.prisma.user.findMany({
      where: { role: { in: ['PLATFORM_ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role === 'SUPER_ADMIN' ? 'Super admin' : 'Platform admin' }));
  }

  async teammate(id: string | null) {
    if (id === null) return null;
    const user = await this.prisma.user.findFirst({ where: { id, role: { in: ['PLATFORM_ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' }, select: { id: true, name: true } });
    if (!user) throw new BadRequestException({ message: 'Pick an active admin.', issues: { assigneeId: 'Pick an active admin' } });
    return user;
  }

  notify(db: Db, userIds: (string | null)[], title: string, body: string, link?: string) {
    const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (!ids.length) return Promise.resolve({ count: 0 });
    return db.userNotification.createMany({ data: ids.map((userId) => ({ userId, title: title.slice(0, 200), body: body.slice(0, 1000), link: link ?? null })) });
  }
}