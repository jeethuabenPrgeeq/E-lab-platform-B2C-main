'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CM_ROUTE, useLibrary, type LibraryFilters, type LibraryScope } from '../lib/api';
import styles from './ReviewReports.module.css';

export default function ReviewQueuePage() {
  const [scope, setScope] = useState<LibraryScope>('all');
  const [search, setSearch] = useState('');
  const filters = useMemo<LibraryFilters>(() => ({ scope, status: 'review', difficulty: '', technologyId: '', q: search.trim() }), [scope, search]);
  const { data, loaded, error, refresh } = useLibrary(filters);
  const rows = data?.items ?? [];
  return <main className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>CONTENT MANAGEMENT / REVIEW</p><h1 className={styles.title}>Review Queue</h1><p className={styles.subtitle}>Problems in Technical Review that you created or were assigned. This is a read-only queue until reviewer-specific actions are available.</p></div><button className={styles.button} type="button" onClick={() => void refresh()}><RefreshCw size={16}/> Refresh</button></header>
    <section className={styles.cards} aria-label="Review summary"><div className={styles.card}><span className={styles.value}>{data?.total ?? 0}</span><span className={styles.muted}>Problems awaiting review</span></div><div className={styles.card}><span className={styles.value}>{rows.filter(p => p.sampleTests === 0).length}</span><span className={styles.muted}>Loaded without sample tests</span></div><div className={styles.card}><span className={styles.value}>{rows.filter(p => p.hiddenTests === 0).length}</span><span className={styles.muted}>Loaded without hidden tests</span></div></section>
    <section className={styles.panel}><h2>Problems in review</h2><div className={styles.toolbar}><input className={styles.input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or slug" aria-label="Search review problems"/><select className={styles.select} value={scope} onChange={e => setScope(e.target.value as LibraryScope)} aria-label="Filter by ownership"><option value="all">All my problems</option><option value="created">Created by me</option><option value="assigned">Assigned to me</option></select></div>
      {error && <p className={styles.error} role="alert">Unable to load review problems: {error}</p>}
      {!loaded ? <p className={styles.empty}>Loading review queue…</p> : rows.length === 0 ? <div className={styles.empty}><strong>No review problems found</strong><p>Problems appear here when the Content Manager API returns records with review status.</p><Link href="/content-library" className={styles.link}>Open Content Library</Link></div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Problem</th><th>Technology</th><th>Difficulty</th><th>Sample</th><th>Hidden</th><th>Ownership</th><th>Action</th></tr></thead><tbody>{rows.map(p => <tr key={p.id}><td><Link href={`${CM_ROUTE}/${p.id}`}>{p.title}</Link><div className={styles.muted}>{p.slug}</div></td><td>{p.technology?.name ?? 'Unassigned'}</td><td>{p.difficulty}</td><td>{p.sampleTests}</td><td>{p.hiddenTests}</td><td>{p.mine ? 'Created by me' : 'Assigned / accessible'}</td><td><Link href={`${CM_ROUTE}/${p.id}`}>View</Link></td></tr>)}</tbody></table></div>}
      <p className={styles.note}>This queue reflects accessible problems in the “review” status. Approve, reject, and return-for-changes actions are not enabled without dedicated reviewer permissions and APIs. Counts for missing tests cover loaded records only.</p>
    </section>
  </main>;
}
