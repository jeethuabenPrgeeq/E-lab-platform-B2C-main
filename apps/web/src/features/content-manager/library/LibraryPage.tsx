'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Copy, Eye, Pencil, Plus, Search } from 'lucide-react';
import { useTechnologies } from '@/features/admin/technologies/lib/api';
import { DIFFICULTIES, STATUS_LABEL, capitalize, cx, formatDate } from '@/features/admin/problems/lib/shared';
import type { ProblemStatus } from '@/features/admin/problems/lib/types';
import styles from '@/features/admin/problems/ProblemsListPage/ProblemsListPage.module.css';
import tabs from '@/features/admin/problems/ProblemTabs/ProblemTabs.module.css';
import { CM_ROUTE, CM_TECHNOLOGIES, useLibrary, type LibraryFilters, type LibraryScope } from '../lib/api';

const SCOPES: { value: LibraryScope; label: string }[] = [
  { value: 'all', label: 'All my problems' },
  { value: 'created', label: 'Created by me' },
  { value: 'assigned', label: 'Assigned to me' },
];

const STATUSES: ProblemStatus[] = ['draft', 'review', 'ready', 'published', 'deprecated'];

export default function LibraryPage() {
  const router = useRouter();
  const [scope, setScope] = useState<LibraryScope>('all');
  const [status, setStatus] = useState<ProblemStatus | ''>('');
  const [difficulty, setDifficulty] = useState('');
  const [technologyId, setTechnologyId] = useState('');
  const [q, setQ] = useState('');
  const filters = useMemo<LibraryFilters>(() => ({ scope, status, difficulty, technologyId, q: q.trim() }), [scope, status, difficulty, technologyId, q]);
  const { data, loaded, error, clearError, duplicate } = useLibrary(filters);
  const { items: technologies } = useTechnologies(CM_TECHNOLOGIES);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const rows = data?.items ?? [];

  async function copy(id: string, title: string) {
    setBusyId(id);
    const result = await duplicate(id);
    setBusyId(null);
    if (!result.ok) {
      setNotice(`Could not duplicate "${title}": ${result.error}`);
      return;
    }
    router.push(`${CM_ROUTE}/${result.id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Problem Library</h1>
          <p className={styles.subtitle}>Problems you created or that a Super Admin assigned to you. Drafts can be edited; other stages are view-only.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.primaryButton} onClick={() => router.push('/content-manager/create')}>
            <Plus width={16} height={16} aria-hidden="true" />
            New problem
          </button>
        </div>
      </div>

      <nav className={tabs.switch} aria-label="Library scope">
        {SCOPES.map((item) => (
          <button key={item.value} type="button" className={`${tabs.option} ${scope === item.value ? tabs.active : ''}`} aria-pressed={scope === item.value} onClick={() => setScope(item.value)}>
            <span className={tabs.label} data-label={item.label}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by title or slug" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search problems" />
          </div>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value as ProblemStatus | '')} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {`${STATUS_LABEL[value]}${data?.statusCounts[value] ? ` (${data.statusCounts[value]})` : ''}`}
              </option>
            ))}
          </select>
          <select className={styles.select} value={technologyId} onChange={(event) => setTechnologyId(event.target.value)} aria-label="Filter by technology">
            <option value="">All technologies</option>
            {technologies.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty">
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((value) => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </select>
        </div>

        {(error || notice) && (
          <div className={styles.notice} role="alert">
            <strong>{error || notice}</strong>
            <button type="button" className={styles.actionButton} onClick={() => { clearError(); setNotice(''); }}>
              Dismiss
            </button>
          </div>
        )}

        {loaded && rows.length > 0 && <p className={styles.count}>{`${data?.total ?? rows.length} ${rows.length === 1 ? 'problem' : 'problems'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{filters.q || status || difficulty || technologyId ? 'No problems match the current filters.' : 'Nothing here yet. Create a problem, or ask a Super Admin to assign one to you.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Technology</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th className={styles.num}>Sample</th>
                  <th className={styles.num}>Hidden</th>
                  <th>Owner</th>
                  <th>Updated</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`${CM_ROUTE}/${p.id}`} className={styles.problemTitle}>
                        {p.title}
                      </Link>
                      <span className={styles.slug}>{p.version > 1 ? `${p.slug} · v${p.version}` : p.slug}</span>
                      {p.status === 'draft' && p.reviewNote && <span className={styles.reviewNote}>Sent back: {p.reviewNote}</span>}
                    </td>
                    <td>
                      <span className={styles.tech}>{p.technology.name}</span>
                    </td>
                    <td>
                      <span className={cx(styles.badge, styles[p.difficulty])}>{capitalize(p.difficulty)}</span>
                    </td>
                    <td>
                      <span className={cx(styles.badge, styles[p.status])}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className={cx(styles.num, p.sampleTests === 0 && styles.missing)}>{p.sampleTests}</td>
                    <td className={cx(styles.num, p.hiddenTests === 0 && styles.missing)}>{p.hiddenTests}</td>
                    <td>
                      <span className={styles.tech}>{p.mine ? 'You' : (p.createdBy?.name ?? 'Platform team')}</span>
                      {p.assignee && <span className={styles.slug}>{`Assigned: ${p.assignee.name}`}</span>}
                    </td>
                    <td className={styles.date}>{formatDate(p.updatedAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`${CM_ROUTE}/${p.id}`} className={styles.iconButton} aria-label={`${p.editable ? 'Edit' : 'View'} ${p.title}`} title={p.editable ? 'Edit' : 'View'}>
                          {p.editable ? <Pencil width={15} height={15} aria-hidden="true" /> : <Eye width={15} height={15} aria-hidden="true" />}
                        </Link>
                        <button type="button" className={styles.iconButton} aria-label={`Duplicate ${p.title}`} title="Duplicate as a new draft" disabled={busyId === p.id} onClick={() => void copy(p.id, p.title)}>
                          <Copy width={15} height={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
