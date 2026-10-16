'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FolderTree, Layers, Library, RotateCcw, Search, TriangleAlert } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '@/components/admin/widgets/AdminWidgets';
import { useTechnologies } from '@/features/admin/technologies/lib/api';
import { CM_TECHNOLOGIES, useLibrary, type LibraryFilters, type LibraryItem, type LibraryScope } from '../lib/api';
import { SCOPE_OPTIONS, useInstitutionLabel } from '../lib/useInstitutionLabel';
import styles from '../ui/institute.module.css';

type ExtendedProblem = LibraryItem & Record<string, unknown>;

function nameOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && 'name' in value && typeof (value as { name?: unknown }).name === 'string') return (value as { name: string }).name;
  return null;
}

function field(problem: ExtendedProblem, keys: string[]): string {
  for (const key of keys) {
    const value = nameOf(problem[key]);
    if (value) return value;
  }
  return 'Unassigned';
}

function hierarchy(problem: LibraryItem) {
  const p = problem as ExtendedProblem;
  return [problem.technology?.name || 'Unassigned technology', field(p, ['domain', 'domainName', 'stack', 'stackName']), field(p, ['module', 'moduleName', 'topic', 'topicName'])];
}

type TreeNode = { name: string; count: number; children: Map<string, TreeNode>; problems: LibraryItem[] };

function node(name: string): TreeNode {
  return { name, count: 0, children: new Map(), problems: [] };
}

function buildTree(problems: LibraryItem[]) {
  const root = node('All content');
  for (const problem of problems) {
    root.count++;
    let current = root;
    for (const label of hierarchy(problem)) {
      if (!current.children.has(label)) current.children.set(label, node(label));
      current = current.children.get(label)!;
      current.count++;
    }
    current.problems.push(problem);
  }
  return root;
}

function Branch({ item, depth = 0, path = '' }: { item: TreeNode; depth?: number; path?: string }) {
  const [open, setOpen] = useState(depth === 0);
  const children = [...item.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  const expandable = children.length > 0 || item.problems.length > 0;
  return (
    <div>
      <button className={styles.branchButton} type="button" onClick={() => setOpen(!open)} aria-expanded={open} disabled={!expandable} style={{ paddingLeft: `${12 + depth * 20}px` }}>
        {expandable ? open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" /> : <span className={styles.spacer} />}
        <span className={styles.branchName}>{item.name}</span>
        <span className={styles.count}>{item.count}</span>
      </button>
      {open && (
        <div>
          {children.map((child) => (
            <Branch key={`${path}/${child.name}`} item={child} depth={depth + 1} path={`${path}/${child.name}`} />
          ))}
          {item.problems.map((problem) => (
            <Link key={problem.id} href={`/content-library/${encodeURIComponent(problem.id)}`} className={styles.problemLink} style={{ paddingLeft: `${32 + (depth + 1) * 20}px` }}>
              <span>{problem.title}</span>
              <span className={styles.problemMeta}>{`${problem.difficulty} · ${problem.status}`}</span>
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrganizationPage() {
  const institution = useInstitutionLabel();
  const [q, setQ] = useState('');
  const [technologyId, setTechnologyId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState<LibraryScope>('all');
  const filters = useMemo<LibraryFilters>(() => ({ scope, q: q.trim(), technologyId, difficulty, status: status as LibraryFilters['status'] }), [scope, q, technologyId, difficulty, status]);
  const { data, loaded, error, refresh } = useLibrary(filters);
  const { items: technologies } = useTechnologies(CM_TECHNOLOGIES);
  const problems = useMemo(() => data?.items ?? [], [data]);
  const tree = useMemo(() => buildTree(problems), [problems]);
  const technologyCount = new Set(problems.map((p) => p.technology?.name || 'Unassigned technology')).size;
  const unmapped = problems.filter((p) => hierarchy(p).slice(1).includes('Unassigned')).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Content Organization"
        pill={institution}
        meta="Your institution’s problems by technology, domain or stack, and module or topic"
        actions={
          <button className={styles.ghostButton} onClick={() => void refresh()} type="button">
            <RotateCcw size={16} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <section className={styles.statGrid} aria-label="Organization summary">
        <StatCard metric={{ key: 'total', label: 'Institution problems', value: data?.total ?? 0, tone: 'primary' }} icon={Library} />
        <StatCard metric={{ key: 'technologies', label: 'Technologies in view', value: problems.length ? technologyCount : 0, tone: 'neutral' }} icon={Layers} />
        <StatCard metric={{ key: 'unmapped', label: 'Missing hierarchy details', value: unmapped, tone: unmapped > 0 ? 'warning' : 'success' }} icon={TriangleAlert} />
      </section>

      <Panel title="Content hierarchy" subtitle="Technology → Domain / Stack → Module / Topic → Problem">
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={16} aria-hidden="true" />
            <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems" aria-label="Search problems" />
          </label>
          <select className={styles.select} value={scope} onChange={(e) => setScope(e.target.value as LibraryScope)} aria-label="Scope">
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={technologyId} onChange={(e) => setTechnologyId(e.target.value)} aria-label="Technology">
            <option value="">All technologies</option>
            {technologies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
            <option value="">All difficulties</option>
            {['easy', 'medium', 'hard'].map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {['draft', 'review', 'ready', 'published', 'deprecated'].map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {`Unable to load problems: ${error}`}
          </p>
        )}
        {!loaded ? (
          <p className={styles.empty}>Loading problems…</p>
        ) : problems.length === 0 ? (
          <div className={styles.empty}>
            <FolderTree size={30} aria-hidden="true" />
            <strong>No problems found</strong>
            <p>Try changing the filters, or create a problem from the Content Library.</p>
          </div>
        ) : (
          <div className={styles.tree}>
            <Branch key={`${scope}|${q}|${technologyId}|${difficulty}|${status}`} item={tree} />
          </div>
        )}
      </Panel>

      <p className={styles.note}>
        {`Showing ${problems.length} problem${problems.length === 1 ? '' : 's'}${(data?.total ?? 0) > problems.length ? ` of ${data?.total}; narrow the filters to see the rest` : ''}. “Unassigned” means the problem has no value for that level yet. This view is read-only.`}
      </p>
    </div>
  );
}
