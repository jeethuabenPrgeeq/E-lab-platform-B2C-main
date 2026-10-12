import type { PrismaService } from '../../prisma/prisma.service.js';

export interface Activity {
  at: number;
  text: string;
  actor: string;
}

export async function activityFor(prisma: PrismaService, entityType: string, ids: string[], take = 30) {
  const map = new Map<string, Activity[]>();
  if (ids.length === 0) return map;
  const rows = await prisma.technicalAuditLog.findMany({
    where: { entityType, entityId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    take: Math.max(take, ids.length * 5),
    select: { entityId: true, summary: true, actorEmail: true, createdAt: true },
  });
  for (const row of rows) {
    const list = map.get(row.entityId) ?? [];
    if (list.length < take) list.push({ at: row.createdAt.getTime(), text: row.summary, actor: row.actorEmail });
    map.set(row.entityId, list);
  }
  return map;
}