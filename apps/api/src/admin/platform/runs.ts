import type { Prisma } from '../../../generated/prisma/client/index.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

export const LANGUAGE_NAMES: Record<string, string> = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  csharp: 'C#',
  python: 'Python',
  go: 'Go',
  ruby: 'Ruby',
  swift: 'Swift',
  git: 'Git',
  linux: 'Linux',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  cicd: 'CI/CD',
};

export const languageName = (slug: string) => LANGUAGE_NAMES[slug] ?? slug;

export const OUTCOMES = ['ok', 'wrong', 'tle', 'mle', 're', 'ce', 'sandbox'] as const;
export const VERDICTS = ['ac', 'wa', 'tle', 'mle', 're', 'ce'] as const;

export const RUN_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  worker: { select: { id: true, name: true } },
} as const;

export type RunRow = Prisma.CodeRunGetPayload<{ include: typeof RUN_INCLUDE }>;

export const outcomeOf = (row: { state: string; outcome: string | null }) => (row.state === 'failed' ? 'sandbox' : (row.outcome ?? 'sandbox'));

export async function problemTitles(prisma: PrismaService, slugs: string[]) {
  const unique = [...new Set(slugs)];
  if (!unique.length) return new Map<string, { title: string; difficulty: string | null }>();
  const rows = await prisma.problem.findMany({ where: { slug: { in: unique } }, select: { slug: true, title: true, difficulty: true } });
  const map = new Map<string, { title: string; difficulty: string | null }>(rows.map((row) => [row.slug, { title: row.title, difficulty: row.difficulty.toLowerCase() }]));
  for (const slug of unique) if (!map.has(slug)) map.set(slug, { title: slug.replace(/[-_]+/g, ' ').replace(/^\w/, (char) => char.toUpperCase()), difficulty: null });
  return map;
}

const KEYWORDS = new Set(
  'abstract and as assert async await auto bool boolean break byte case catch char class const continue def default del delete do double elif else end enum except explicit extends extern false final finally float fn for from func function go goto if impl implements import in include inline int interface is lambda let long loop match mod module mut namespace new nil none not null nullptr or override package pass print printf println private protected pub public raise register return scanf self short signed sizeof static std string struct super switch template then this throw throws true try type typedef typename union unsigned use using var virtual void volatile while with yield cin cout endl main input range len append'.split(' '),
);

export function fingerprint(code: string) {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/#(?!include)[^\n]*/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, ' S ');
  const tokens = (stripped.match(/[A-Za-z_]\w*|\d+(?:\.\d+)?|\S/g) ?? []).map((token) => (/^\d/.test(token) ? '0' : /^[A-Za-z_]/.test(token) ? (KEYWORDS.has(token) ? token : 'v') : token));
  const shingles = new Set<string>();
  for (let index = 0; index + 5 <= tokens.length; index += 1) shingles.add(tokens.slice(index, index + 5).join(' '));
  return shingles;
}

export function similarity(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const item of small) if (large.has(item)) shared += 1;
  return Math.round((shared / (a.size + b.size - shared)) * 100);
}