'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, Plus, RotateCcw, Search } from 'lucide-react';
import { INSTITUTION_PERMISSION_ITEMS } from '../../access/lib/shared';
import styles from '../../access/ui/admins.module.css';
import { cx, formatDate } from '../../users/lib/shared';
import { CreateInstitutionModal } from '../CreateInstitutionModal/CreateInstitutionModal';
import { InstitutionDrawer } from '../InstitutionDrawer/InstitutionDrawer';
import { institutionApi, useInstitutions } from '../lib/api';
import { INSTITUTION_STATUS_META, INSTITUTION_TYPES, TYPE_LABEL } from '../lib/shared';
import type { CreateInstitutionInput } from '../lib/types';

export default function InstitutionsPage() {
  const { data, loaded, error, clearError, refresh } = useInstitutions();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (type && item.type !== type) return false;
      if (status && item.status !== status) return false;
      if (q && !`${item.name} ${item.code} ${item.contactEmail ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, type, status]);

  const admins = items.reduce((sum, item) => sum + item.admins, 0);

  const create = async (input: CreateInstitutionInput) => {
    setCreateBusy(true);
    setCreateError('');
    const result = await institutionApi.create(input);
    setCreateBusy(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setCreating(false);
    setNotice(`Registered ${result.data.name}. Invite its first Institute Admin next.`);
    await refresh();
    setOpenId(result.data.id);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Institutions</h1>
          <p className={styles.subtitle}>Organizations on eLab, their Institute Admins and what they are allowed to do</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setCreating(true)}>
            <Plus width={16} height={16} aria-hidden="true" />
            Register institution
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <button type="button" className={styles.errorDismiss} onClick={clearError} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? data!.total : '—'}</span>
          <span className={styles.statLabel}>Institutions</span>
          <span className={styles.statFoot}>Registered on the platform</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && styles.statSuccess)}>{loaded ? data!.statusCounts.active ?? 0 : '—'}</span>
          <span className={styles.statLabel}>Active</span>
          <span className={styles.statFoot}>Institute Admins can sign in</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && (data!.statusCounts.suspended ?? 0) > 0 && styles.statDanger)}>{loaded ? data!.statusCounts.suspended ?? 0 : '—'}</span>
          <span className={styles.statLabel}>Suspended</span>
          <span className={styles.statFoot}>All access paused</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && data!.unlinkedAdmins > 0 && styles.statWarn)}>{loaded ? admins : '—'}</span>
          <span className={styles.statLabel}>Institute Admins</span>
          <span className={styles.statFoot}>{loaded ? (data!.unlinkedAdmins > 0 ? `${data!.unlinkedAdmins} not linked to an institution yet` : 'All linked to an institution') : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        <div className={cx(styles.toolbar, styles.toolbarThree)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by name, code or email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search institutions" />
          </div>
          <select className={styles.select} value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {INSTITUTION_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>No institutions yet. Register the first one to give it an Institute Admin.</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No institutions match the current filters.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Type</th>
                  <th>Institute Admins</th>
                  <th>Problems</th>
                  <th>Permissions</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const meta = INSTITUTION_STATUS_META[item.status];
                  return (
                    <tr key={item.id} className={cx(styles.clickRow, item.status === 'suspended' && styles.rowDim)} onClick={() => setOpenId(item.id)}>
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.userAvatar} aria-hidden="true">
                            <Building2 width={16} height={16} />
                          </span>
                          <span>
                            <span className={styles.nameLine}>
                              <button
                                type="button"
                                className={styles.rowLink}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenId(item.id);
                                }}
                              >
                                {item.name}
                              </button>
                            </span>
                            <span className={styles.meta}>{item.code}</span>
                          </span>
                        </div>
                      </td>
                      <td>{TYPE_LABEL[item.type]}</td>
                      <td>{item.admins}</td>
                      <td>{item.problems}</td>
                      <td className={styles.muted}>{`${item.permissions.length} of ${INSTITUTION_PERMISSION_ITEMS.length}`}</td>
                      <td className={cx(styles.nowrap, styles.muted)}>{formatDate(item.createdAt)}</td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <span className={styles.iconButton} aria-hidden="true">
                            <ChevronRight width={16} height={16} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openId && <InstitutionDrawer key={openId} institutionId={openId} onClose={() => setOpenId(null)} onChanged={() => void refresh()} />}
      {creating && (
        <CreateInstitutionModal
          busy={createBusy}
          serverError={createError}
          onCancel={() => {
            setCreating(false);
            setCreateError('');
          }}
          onSubmit={(input) => void create(input)}
        />
      )}
    </div>
  );
}
