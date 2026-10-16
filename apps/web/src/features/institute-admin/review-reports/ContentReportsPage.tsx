'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, FlaskConical, Library, RefreshCw } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '@/components/admin/widgets/AdminWidgets';
import { useTechnologies } from '@/features/admin/technologies/lib/api';
import { IA_TECHNOLOGIES, useLibrary, type LibraryFilters, type LibraryScope } from '../lib/api';
import { SCOPE_OPTIONS, useInstitutionLabel } from '../lib/useInstitutionLabel';
import styles from '../ui/institute.module.css';

const STATUSES = ['draft', 'review', 'ready', 'published', 'deprecated'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const label = (value: string) => value[0].toUpperCase() + value.slice(1);

function Distribution({ title, values }: { title: string; values: { name: string; count: number }[] }) {
  const max = Math.max(1, ...values.map((v) => v.count));
  return (
    <Panel title={title}>
      {values.map((v) => (
        <div className={styles.barRow} key={v.name}>
          <span>{v.name}</span>
          <div className={styles.track} aria-hidden="true">
            <div className={styles.fill} style={{ width: `${(100 * v.count) / max}%` }} />
          </div>
          <span className={styles.barValue}>{v.count}</span>
        </div>
      ))}
    </Panel>
  );
}

export default function ContentReportsPage() {
  const institution = useInstitutionLabel();
  const [scope, setScope] = useState<LibraryScope>('all');
  const [technologyId, setTechnologyId] = useState('');
  const filters = useMemo<LibraryFilters>(() => ({ scope, technologyId, status: '', difficulty: '', q: '' }), [scope, technologyId]);
  const { data, loaded, error, refresh } = useLibrary(filters);
  const { items: technologies } = useTechnologies(IA_TECHNOLOGIES);
  const rows = data?.items ?? [];
  const total = rows.length;
  const count = (predicate: (p: (typeof rows)[number]) => boolean) => rows.filter(predicate).length;
  const sampleMissing = count((p) => p.sampleTests === 0);
  const hiddenMissing = count((p) => p.hiddenTests === 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Content Reports"
        pill={institution}
        meta="Snapshot of your institution’s problems and test-case coverage"
        actions={
          <button className={styles.ghostButton} type="button" onClick={() => void refresh()}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <div className={`${styles.toolbar} ${styles.toolbarFlush}`}>
        <select className={styles.select} value={scope} onChange={(e) => setScope(e.target.value as LibraryScope)} aria-label="Ownership scope">
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
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {`Unable to load report data: ${error}`}
        </p>
      )}

      <section className={styles.statGrid} aria-label="Content summary">
        <StatCard metric={{ key: 'total', label: 'Problems', value: total, tone: 'primary' }} icon={Library} />
        <StatCard metric={{ key: 'published', label: 'Published', value: count((p) => p.status === 'published'), tone: 'success' }} icon={CheckCircle2} />
        <StatCard metric={{ key: 'sample', label: 'Missing sample tests', value: sampleMissing, tone: sampleMissing ? 'warning' : 'neutral' }} icon={FlaskConical} />
        <StatCard metric={{ key: 'hidden', label: 'Missing hidden tests', value: hiddenMissing, tone: hiddenMissing ? 'warning' : 'neutral' }} icon={EyeOff} />
      </section>

      {!loaded ? (
        <p className={styles.empty}>Loading report data…</p>
      ) : total === 0 ? (
        <Panel title="No problems yet">
          <div className={styles.empty}>
            <p>No problems match these filters.</p>
            <Link href="/content-library" className={styles.textLink}>
              Open Content Library
            </Link>
          </div>
        </Panel>
      ) : (
        <div className={styles.reportGrid}>
          <Distribution title="By workflow status" values={STATUSES.map((s) => ({ name: label(s), count: count((p) => p.status === s) }))} />
          <Distribution title="By difficulty" values={DIFFICULTIES.map((d) => ({ name: label(d), count: count((p) => p.difficulty === d) }))} />
          <Distribution
            title="Test-case coverage"
            values={[
              { name: 'With sample tests', count: total - sampleMissing },
              { name: 'Without sample tests', count: sampleMissing },
              { name: 'With hidden tests', count: total - hiddenMissing },
              { name: 'Without hidden tests', count: hiddenMissing },
            ]}
          />
        </div>
      )}

      <p className={styles.note}>{`Based on up to 100 problems${data && data.total > total ? ` (${data.total} match in total)` : ''}. Learner analytics arrive with the learner workflow.`}</p>
    </div>
  );
}
