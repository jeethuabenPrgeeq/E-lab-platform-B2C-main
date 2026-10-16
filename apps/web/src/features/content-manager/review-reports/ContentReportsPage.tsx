'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CM_TECHNOLOGIES, useLibrary, type LibraryFilters, type LibraryScope } from '../lib/api';
import { useTechnologies } from '@/features/admin/technologies/lib/api';
import styles from './ReviewReports.module.css';

const STATUSES = ['draft','review','ready','published','deprecated'] as const;
const DIFFICULTIES = ['easy','medium','hard'] as const;
function Distribution({ title, values }: { title: string; values: { name: string; count: number }[] }) {
  const max = Math.max(1, ...values.map(v => v.count));
  return <section className={styles.panel}><h2>{title}</h2>{values.map(v => <div className={styles.barRow} key={v.name}><span>{v.name}</span><div className={styles.track} aria-hidden="true"><div className={styles.fill} style={{ width: `${100 * v.count / max}%` }}/></div><strong>{v.count}</strong></div>)}</section>;
}
export default function ContentReportsPage() {
  const [scope, setScope] = useState<LibraryScope>('all');
  const [technologyId, setTechnologyId] = useState('');
  const filters = useMemo<LibraryFilters>(() => ({ scope, technologyId, status: '', difficulty: '', q: '' }), [scope, technologyId]);
  const { data, loaded, error, refresh } = useLibrary(filters);
  const { items: technologies } = useTechnologies(CM_TECHNOLOGIES);
  const rows = data?.items ?? [];
  const total = rows.length;
  const count = (predicate: (p: typeof rows[number]) => boolean) => rows.filter(predicate).length;
  const sampleMissing = count(p => p.sampleTests === 0);
  const hiddenMissing = count(p => p.hiddenTests === 0);
  return <main className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>CONTENT MANAGEMENT / INSIGHTS</p><h1 className={styles.title}>Content Reports</h1><p className={styles.subtitle}>Operational snapshot of accessible Content Library problems and test-case coverage.</p></div><button className={styles.button} type="button" onClick={() => void refresh()}><RefreshCw size={16}/> Refresh</button></header>
    <div className={styles.toolbar}><select className={styles.select} value={scope} onChange={e => setScope(e.target.value as LibraryScope)} aria-label="Ownership scope"><option value="all">All my problems</option><option value="created">Created by me</option><option value="assigned">Assigned to me</option></select><select className={styles.select} value={technologyId} onChange={e => setTechnologyId(e.target.value)} aria-label="Technology"><option value="">All technologies</option>{technologies.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
    {error && <p className={styles.error} role="alert">Unable to load report data: {error}</p>}
    <section className={styles.cards} aria-label="Content summary"><div className={styles.card}><span className={styles.value}>{loaded ? total : '—'}</span><span className={styles.muted}>Loaded problems</span></div><div className={styles.card}><span className={styles.value}>{loaded ? count(p => p.status === 'published') : '—'}</span><span className={styles.muted}>Published in loaded results</span></div><div className={styles.card}><span className={styles.value}>{loaded ? sampleMissing : '—'}</span><span className={styles.muted}>Missing sample tests</span></div><div className={styles.card}><span className={styles.value}>{loaded ? hiddenMissing : '—'}</span><span className={styles.muted}>Missing hidden tests</span></div></section>
    {!loaded ? <div className={styles.panel}>Loading report data…</div> : <><Distribution title="By workflow status" values={STATUSES.map(s => ({ name: s[0].toUpperCase() + s.slice(1), count: count(p => p.status === s) }))}/><Distribution title="By difficulty" values={DIFFICULTIES.map(d => ({ name: d[0].toUpperCase() + d.slice(1), count: count(p => p.difficulty === d) }))}/><Distribution title="Test-case coverage" values={[{ name: 'With sample tests', count: total - sampleMissing }, { name: 'Without sample', count: sampleMissing }, { name: 'With hidden tests', count: total - hiddenMissing }, { name: 'Without hidden', count: hiddenMissing }]}/>{total === 0 && <section className={styles.panel}><p>No accessible problems found for these filters.</p><Link href="/upload-content" className={styles.link}>Upload Content</Link></section>}</>}
    <p className={styles.note}>Frontend report based on the first page of up to 100 accessible problems returned by the Content Manager API. {data && data.total > total ? `The API reports ${data.total} total matching problems, but only ${total} are included in these charts. ` : ''}These figures are not a complete organization-wide analytics report, and browser-only batch drafts are excluded.</p>
  </main>;
}
