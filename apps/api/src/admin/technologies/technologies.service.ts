import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  Prisma,
  Technology,
} from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { diffFields, pageArgs, slugify } from '../common/pagination.js';
import type {
  CreateTechnologyDto,
  TechnologyQueryDto,
  UpdateTechnologyDto,
} from './technologies.dto.js';

function present(tech: Technology & { _count?: { problems: number } }) {
  return {
    id: tech.id,
    slug: tech.slug,
    name: tech.name,
    category: tech.category,
    status: tech.status,
    runtimeImage: tech.runtimeImage,
    version: tech.version,
    fileExtension: tech.fileExtension,
    judgeLanguage: tech.judgeLanguage,
    description: tech.description,
    problemCount: tech._count?.problems ?? 0,
    createdAt: tech.createdAt,
    updatedAt: tech.updatedAt,
  };
}

@Injectable()
export class TechnologiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: TechnologyQueryDto) {
    const { page, pageSize, skip, take } = pageArgs({
      ...query,
      pageSize: query.pageSize ?? 100,
    });
    const where: Prisma.TechnologyWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.technology.findMany({
        where,
        orderBy: { name: query.order ?? 'asc' },
        skip,
        take,
        include: { _count: { select: { problems: true } } },
      }),
      this.prisma.technology.count({ where }),
    ]);
    return { items: items.map(present), total, page, pageSize };
  }

  async get(id: string) {
    const tech = await this.prisma.technology.findUnique({
      where: { id },
      include: { _count: { select: { problems: true } } },
    });
    if (!tech) throw new NotFoundException('Technology not found.');
    return present(tech);
  }

  async create(dto: CreateTechnologyDto, actor: AdminActor) {
    const slug = dto.slug ?? slugify(dto.name);
    const clash = await this.prisma.technology.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: dto.name.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (clash)
      throw new ConflictException(
        'A technology with this name or slug already exists.',
      );

    return this.prisma.$transaction(async (tx) => {
      const tech = await tx.technology.create({
        data: {
          slug,
          name: dto.name.trim(),
          category: dto.category,
          status: dto.status ?? 'draft',
          runtimeImage: dto.runtimeImage?.trim() ?? '',
          version: dto.version?.trim() ?? '',
          fileExtension: dto.fileExtension?.trim() ?? '',
          judgeLanguage: dto.judgeLanguage ?? null,
          description: dto.description?.trim() ?? '',
        },
      });
      await this.audit.record(tx, actor, {
        action: 'technology.create',
        entityType: 'technology',
        entityId: tech.id,
        summary: `Created technology ${tech.name}`,
      });
      return present(tech);
    });
  }

  async update(id: string, dto: UpdateTechnologyDto, actor: AdminActor) {
    const existing = await this.prisma.technology.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology not found.');

    if (
      dto.name &&
      dto.name.trim().toLowerCase() !== existing.name.toLowerCase()
    ) {
      const clash = await this.prisma.technology.findFirst({
        where: {
          id: { not: id },
          name: { equals: dto.name.trim(), mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (clash)
        throw new ConflictException(
          'A technology with this name already exists.',
        );
    }

    const data = { ...dto, name: dto.name?.trim() };
    const changes = diffFields(
      existing as unknown as Record<string, unknown>,
      data,
    );
    if (changes.length === 0) return this.get(id);

    return this.prisma.$transaction(async (tx) => {
      const tech = await tx.technology.update({
        where: { id },
        data,
        include: { _count: { select: { problems: true } } },
      });
      await this.audit.record(tx, actor, {
        action:
          dto.status && dto.status !== existing.status
            ? `technology.status.${dto.status}`
            : 'technology.update',
        entityType: 'technology',
        entityId: id,
        summary: `Updated technology ${tech.name}`,
        changes,
      });
      return present(tech);
    });
  }

  async remove(id: string, actor: AdminActor) {
    const tech = await this.prisma.technology.findUnique({
      where: { id },
      include: { _count: { select: { problems: true } } },
    });
    if (!tech) throw new NotFoundException('Technology not found.');
    if (tech._count.problems > 0) {
      throw new ConflictException(
        `${tech.name} still has ${tech._count.problems} problem(s). Move or delete them, or disable the technology instead.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.technology.delete({ where: { id } });
      await this.audit.record(tx, actor, {
        action: 'technology.delete',
        entityType: 'technology',
        entityId: id,
        summary: `Deleted technology ${tech.name}`,
      });
    });
    return { deleted: true };
  }
}
