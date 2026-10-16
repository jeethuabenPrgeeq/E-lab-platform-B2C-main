'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, Search, RotateCcw, ExternalLink } from 'lucide-react';
import { useTechnologies } from '@/features/admin/technologies/lib/api';
import { CM_TECHNOLOGIES, useLibrary, type LibraryFilters, type LibraryItem } from '../lib/api';
import styles from './OrganizationPage.module.css';

type ExtendedProblem = LibraryItem & Record<string, unknown>;
function nameOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && 'name' in value && typeof (value as {name?:unknown}).name === 'string') return (value as {name:string}).name;
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
  return [
    problem.technology?.name || 'Unassigned technology',
    field(p, ['domain', 'domainName', 'stack', 'stackName']),
    field(p, ['module', 'moduleName', 'topic', 'topicName']),
  ];
}
type TreeNode = { name: string; count: number; children: Map<string, TreeNode>; problems: LibraryItem[] };
function node(name: string): TreeNode { return {name, count: 0, children: new Map(), problems: []}; }
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
function Branch({ item, depth = 0, path = '' }: {item: TreeNode; depth?: number; path?: string}) {
  const [open, setOpen] = useState(depth === 0);
  const children = [...item.children.values()].sort((a,b) => a.name.localeCompare(b.name));
  const expandable = children.length > 0 || item.problems.length > 0;
  return <div className={styles.branch}>
    <button className={styles.branchButton} type="button" onClick={() => setOpen(!open)} aria-expanded={open} disabled={!expandable} style={{paddingLeft: `${12 + depth * 20}px`}}>
      {expandable ? (open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>) : <span className={styles.spacer}/>}
      <span className={styles.branchName}>{item.name}</span><span className={styles.count}>{item.count}</span>
    </button>
    {open && <div>
      {children.map(child => <Branch key={`${path}/${child.name}`} item={child} depth={depth + 1} path={`${path}/${child.name}`}/>)}
      {item.problems.map(problem => <Link key={problem.id} href={`/content-library/${encodeURIComponent(problem.id)}`} className={styles.problemLink} style={{paddingLeft: `${32 + (depth + 1) * 20}px`}}><span>{problem.title}</span><span className={styles.problemMeta}>{problem.difficulty} · {problem.status}</span><ExternalLink size={13}/></Link>)}
    </div>}
  </div>;
}
export default function OrganizationPage() {
  const [q, setQ] = useState('');
  const [technologyId, setTechnologyId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState<'all'|'created'|'assigned'>('all');
  const filters = useMemo<LibraryFilters>(() => ({scope, q: q.trim(), technologyId, difficulty, status: status as LibraryFilters['status']}), [scope, q, technologyId, difficulty, status]);
  const {data, loaded, error, refresh} = useLibrary(filters);
  const {items: technologies} = useTechnologies(CM_TECHNOLOGIES);
  const problems = data?.items ?? [];
  const tree = useMemo(() => buildTree(problems), [problems]);
  const uniqueTech = new Set(problems.map(p => p.technology?.name || 'Unassigned technology')).size;
  const unmapped = problems.filter(p => hierarchy(p).slice(1).includes('Unassigned')).length;
  return <main className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>CONTENT MANAGEMENT</p><h1>Content Organization</h1><p className={styles.subtitle}>Explore your actual Content Library problems by technology, domain or stack, and module or topic.</p></div><Link href="/upload-content" className={styles.primary}>Upload Content</Link></header>
    <section className={styles.stats}><div><strong>{data?.total ?? 0}</strong><span>Total accessible problems</span></div><div><strong>{uniqueTech && problems.length ? uniqueTech : 0}</strong><span>Technologies in loaded results</span></div><div><strong>{unmapped}</strong><span>Loaded problems missing hierarchy metadata</span></div></section>
    <section className={styles.card}><div className={styles.cardTitle}><div><h2><FolderTree size={20}/> Content hierarchy</h2><p>Technology → Domain / Stack → Module / Topic → Problem</p></div><button className={styles.refresh} onClick={() => void refresh()} type="button"><RotateCcw size={15}/> Refresh</button></div>
      <div className={styles.filters}><label className={styles.search}><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search problems" aria-label="Search problems"/></label>
      <select value={scope} onChange={e=>setScope(e.target.value as typeof scope)} aria-label="Scope"><option value="all">All my problems</option><option value="created">Created by me</option><option value="assigned">Assigned to me</option></select>
      <select value={technologyId} onChange={e=>setTechnologyId(e.target.value)} aria-label="Technology"><option value="">All technologies</option>{technologies.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} aria-label="Difficulty"><option value="">All difficulties</option>{['easy','medium','hard'].map(v=><option key={v} value={v}>{v}</option>)}</select>
      <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{['draft','review','ready','published','deprecated'].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      {error && <p className={styles.error} role="alert">Unable to load problems: {error}</p>}
      {!loaded ? <p className={styles.empty}>Loading real problems…</p> : problems.length === 0 ? <div className={styles.empty}><FolderTree size={30}/><strong>No problems found</strong><p>{error ? 'Check Content Manager API access.' : 'Try changing filters, or upload problems through Upload Content.'}</p></div> : <><p className={styles.note}>Showing {problems.length} loaded problems{(data?.total ?? 0) > problems.length ? ` of ${data?.total} total. The API currently limits this view to 100 records; narrow filters to explore other results.` : '.'} “Unassigned” means the API did not provide that hierarchy field.</p><div className={styles.tree}><Branch key={`${scope}|${q}|${technologyId}|${difficulty}|${status}`} item={tree}/></div></>}
    </section>
    <p className={styles.footerNote}>Organization is currently read-only. Creating categories, moving problems, and saving mappings require Content Manager-authorized taxonomy APIs. No changes are made to Platform Admin data.</p>
  </main>;
}
