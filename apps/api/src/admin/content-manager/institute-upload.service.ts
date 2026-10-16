import { BadRequestException, Injectable } from '@nestjs/common';

import { normalizeRow } from '../../practice/practice.service.js';
import { HIDDEN_TEST_SLOTS } from '../../practice/practice-columns.js';
import { validateRows } from '../../practice/practice-validation.js';
import type { SaveDraftsDto } from '../../practice/dto/save-drafts.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { slugify } from '../common/pagination.js';
import { CATEGORY_WORKSPACE, TO_DB_DIFFICULTY } from '../problems/problems.service.js';

const METHOD_LABEL = { manual: 'manual entry', csv: 'CSV upload', ai: 'AI generation' } as const;
const MAX_REPORTED_ROWS = 20;

const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const list = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

@Injectable()
export class InstituteUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async upload(dto: SaveDraftsDto, actor: AdminActor, organizationId: string) {
    const technology = await this.prisma.technology.findFirst({
      where: { name: { equals: dto.technology.trim(), mode: 'insensitive' } },
    });
    if (!technology) throw new BadRequestException(`Technology "${dto.technology}" was not found.`);
    if (technology.status !== 'active') throw new BadRequestException(`${technology.name} is not active. Ask a Platform Admin to enable it.`);

    const rows = dto.rows.map(normalizeRow);
    const slugs = rows.map((row) => slugify(row.short_name));
    const taken = new Set(
      (await this.prisma.problem.findMany({ where: { slug: { in: slugs.filter(Boolean) } }, select: { slug: true } })).map((problem) => problem.slug),
    );
    const results = validateRows(rows, { problemIds: new Set(), shortNames: taken });
    const firstUse = new Map<string, number>();

    const failed = rows
      .map((_, index) => {
        const slug = slugs[index];
        const messages = results[index].issues.filter((issue) => issue.level === 'error').map((issue) => `${issue.column}: ${issue.message}`);
        if (!slug) messages.push('short_name: Needs at least one letter or number');
        else if (taken.has(slug) && !messages.some((message) => message.startsWith('short_name:'))) messages.push(`short_name: "${slug}" is already used by another problem`);
        else if (firstUse.has(slug)) messages.push(`short_name: Same slug as row ${firstUse.get(slug)}`);
        if (slug && !firstUse.has(slug)) firstUse.set(slug, index + 1);
        return { row: index + 1, messages };
      })
      .filter((entry) => entry.messages.length > 0);

    if (failed.length) {
      throw new BadRequestException({
        message: `${failed.length} of ${rows.length} row${rows.length === 1 ? '' : 's'} could not be saved. Nothing was saved.`,
        issues: failed.slice(0, MAX_REPORTED_ROWS).map((entry) => `Row ${entry.row}: ${entry.messages.join('; ')}.`),
      });
    }

    const language = technology.judgeLanguage ?? technology.slug;
    const workspaceType = CATEGORY_WORKSPACE[technology.category] ?? 'code';
    const source = dto.source?.trim();

    const ids = await this.prisma.$transaction(
      async (tx) => {
        const created: string[] = [];
        for (const [index, row] of rows.entries()) {
          const notes = [
            ...lines(row.edge_cases),
            ...(row.expected_complexity ? [`Expected complexity: ${row.expected_complexity}`] : []),
            ...(row.tags ? [`Tags: ${list(row.tags).join(', ')}`] : []),
          ];
          const problem = await tx.problem.create({
            data: {
              slug: slugs[index],
              title: row.title,
              technologyId: technology.id,
              difficulty: TO_DB_DIFFICULTY[row.difficulty.toLowerCase()],
              workspaceType,
              shortDescription: row.topic,
              problemStatement: row.description,
              inputFormat: row.input_format || null,
              outputFormat: row.output_format || null,
              constraints: lines(row.logic_constraints),
              notes,
              skills: list(row.skills_covered),
              estimatedMinutes: 15,
              defaultLanguage: language,
              allowedLanguages: [language],
              moduleSlug: slugify(row.topic) || null,
              createdById: actor.id,
              updatedById: actor.id,
              organizationId,
            },
          });
          const tests = [{ input: row.example_input || null, expectedOutput: row.expected_output, hidden: false }];
          for (let slot = 1; slot <= HIDDEN_TEST_SLOTS; slot += 1) {
            const input = row[`hidden_test_case_${slot}`];
            const expectedOutput = row[`hidden_expected_output_${slot}`];
            if (input && expectedOutput) tests.push({ input, expectedOutput, hidden: true });
          }
          await tx.testCase.createMany({ data: tests.map((test, position) => ({ ...test, problemId: problem.id, position })) });
          created.push(problem.id);
        }
        await this.audit.record(tx, actor, {
          action: 'problem.upload',
          entityType: 'problem',
          entityId: created[0],
          summary: `Uploaded ${created.length} draft problem${created.length === 1 ? '' : 's'} by ${METHOD_LABEL[dto.method]}${source ? ` (${source})` : ''}`,
          changes: { technology: technology.name, method: dto.method, problemIds: created },
        });
        return created;
      },
      { timeout: 60_000 },
    );

    return { batchId: '', saved: ids.length, savedAt: new Date().toISOString(), problemIds: ids };
  }
}
