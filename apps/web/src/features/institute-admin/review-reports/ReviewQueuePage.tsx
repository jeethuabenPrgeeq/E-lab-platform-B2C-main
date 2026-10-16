'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, FlaskConical, Hourglass, RefreshCw, Search } from 'lucide-react';
import { usePermissionGate } from '@/features/admin/permissions/PermissionsProvider';
import { PageHeader, Panel, StatCard } from '@/components/admin/widgets/AdminWidgets';
import { IA_ROUTE, transitionLibraryProblem, useLibrary, type LibraryFilters, type LibraryScope } from '../lib/api';
import { SCOPE_OPTIONS, useInstitutionLabel } from '../lib/useInstitutionLabel';
import styles from '../ui/institute.module.css';

export default function ReviewQueuePage() {
  const institution = useInstitutionLabel();
  const [scope, setScope] = useState<LibraryScope>('all');
  const [search, setSearch] = useState('');
  const filters = useMemo<LibraryFilters>(() => ({ scope, status: 'review', difficulty: '', technologyId: '', q: search.trim() }), [scope, search]);
  const { data, loaded, error, refresh } = useLibrary(filters);
  const rows = data?.items ?? [];
  const publishGate = usePermissionGate('inst.content.publish');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const approve = async (id: string, title: string) => {
    setBusyId(id);
    setNotice(null);
    const result = await transitionLibraryProblem(id, 'approve');
    setBusyId(null);
    if (result.ok) {
      setNotice({ tone: 'ok', text: `${title} approved and moved to Ready.` });
      await refresh();
    } else setNotice({ tone: 'error', text: result.error });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Review Queue"
        pill={institution}
        meta="Institution problems waiting in review. Approve here, or open a problem to send it back with a note."
        actions={
          <button className={styles.ghostButton} type="button" onClick={() => void refresh()}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <section className={styles.statGrid} aria-label="Review summary">
        <StatCard metric={{ key: 'review', label: 'Awaiting review', value: data?.total ?? 0, tone: 'warning' }} icon={Hourglass} />
        <StatCard metric={{ key: 'sample', label: 'Without sample tests', value: rows.filter((p) => p.sampleTests === 0).length, tone: 'neutral' }} icon={FlaskConical} />
        <StatCard metric={{ key: 'hidden', label: 'Without hidden tests', value: rows.filter((p) => p.hiddenTests === 0).length, tone: 'neutral' }} icon={EyeOff} />
      </section>

      <Panel title="Problems in review">
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={16} aria-hidden="true" />
            <input className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or slug" aria-label="Search review problems" />
          </label>
          <select className={styles.select} value={scope} onChange={(e) => setScope(e.target.value as LibraryScope)} aria-label="Filter by ownership">
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {`Unable to load review problems: ${error}`}
          </p>
        )}
        {notice && (
          <p className={notice.tone === 'error' ? styles.error : styles.success} role={notice.tone === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
        {!loaded ? (
          <p className={styles.empty}>Loading review queue…</p>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            <strong>Nothing is waiting for review</strong>
            <p>Problems appear here once they move to review.</p>
            <Link href="/content-library" className={styles.textLink}>
              Open Content Library
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Technology</th>
                  <th>Difficulty</th>
                  <th>Sample</th>
                  <th>Hidden</th>
                  <th>Ownership</th>
                  <th>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`${IA_ROUTE}/${p.id}`} className={styles.rowTitle}>
                        {p.title}
                      </Link>
                      <span className={styles.rowMeta}>{p.slug}</span>
                    </td>
                    <td>{p.technology?.name ?? 'Unassigned'}</td>
                    <td className={styles.capitalize}>{p.difficulty}</td>
                    <td>{p.sampleTests}</td>
                    <td>{p.hiddenTests}</td>
                    <td>{p.mine ? 'Created by me' : 'Institution'}</td>
                    <td>
                      <span className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.ghostButton}
                          disabled={!publishGate.allowed || busyId !== null}
                          title={publishGate.title}
                          onClick={() => void approve(p.id, p.title)}
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                          {busyId === p.id ? 'Approving…' : 'Approve'}
                        </button>
                        <Link href={`${IA_ROUTE}/${p.id}`} className={styles.textLink}>
                          Open
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className={styles.note}>Approving needs at least one sample and one hidden test. Sending back needs a note, so it lives on the problem page. Counts for missing tests cover the problems shown.</p>
    </div>
  );
}
