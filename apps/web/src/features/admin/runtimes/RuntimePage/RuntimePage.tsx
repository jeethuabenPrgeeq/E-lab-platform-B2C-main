'use client';

import { useMemo, useState } from 'react';
import { LoaderCircle, Pencil, Plus, Power, RefreshCw, RotateCcw, Search, Star, Trash2 } from 'lucide-react';
import { RUNTIME_CONFIG } from '../lib/config';
import { useRuntimeStore } from '../lib/mock';
import { cx, formatDate } from '../lib/shared';
import type { FieldValue, RuntimeKind, RuntimeRecord } from '../lib/types';
import { RuntimeModal } from '../RuntimeModal/RuntimeModal';
import { RuntimeTabs } from '../RuntimeTabs/RuntimeTabs';
import styles from './RuntimePage.module.css';

export function RuntimePage({ kind }: { kind: RuntimeKind }) {
  const config = RUNTIME_CONFIG[kind];
  const { store, loaded, create, update, remove, setDefaultVersion, pullImage, reset } = useRuntimeStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<{ item: RuntimeRecord | null } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const items = store[kind];
  const toneOf = (value: string) => config.statuses.find((item) => item.value === value);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (status && row.status !== status) return false;
      for (const [key, value] of Object.entries(filters)) {
        if (value && String(row[key]) !== value) return false;
      }
      if (q && !config.search(row, store).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, status, filters, config, store]);

  const submit = (values: Record<string, FieldValue>) => {
    if (modal?.item) {
      update(kind, modal.item.id, values);
    } else {
      const id = create(kind, kind === 'images' ? { ...values, status: 'pulling' } : values);
      if (kind === 'images') pullImage(id);
    }
    setModal(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Runtime Management</h1>
          <p className={styles.subtitle}>{config.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={reset}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Reset demo data
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setModal({ item: null })}>
            <Plus width={16} height={16} aria-hidden="true" />
            {`Add ${config.noun}`}
          </button>
        </div>
      </div>

      <RuntimeTabs />

      <section className={styles.stats} aria-label="Summary">
        {config.stats(items).map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </section>

      <div className={styles.card}>
        <div className={styles.toolbar} data-filters={config.filters.length}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder={config.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={`Search ${config.title.toLowerCase()}`}
            />
          </div>
          {config.filters.map((filter) => (
            <select
              key={filter.key}
              className={styles.select}
              value={filters[filter.key] ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, [filter.key]: event.target.value }))}
              aria-label={filter.label}
            >
              <option value="">{filter.label}</option>
              {filter.options(store).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {config.statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} ${config.noun}${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{`No ${config.noun}s match the current filters.`}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{config.primaryLabel}</th>
                  {config.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Status</th>
                  <th>Updated</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const primary = config.primary(row, store);
                  const tone = toneOf(row.status);
                  const toggle = config.toggle;
                  const isOff = toggle ? row.status === toggle.off : false;
                  const pulling = kind === 'images' && row.status === 'pulling';
                  const lockedDefault = kind === 'versions' && Boolean(row.isDefault) && !isOff;
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className={cx(styles.primaryText, kind === 'images' && styles.monoText)}>
                          {primary.title}
                          {kind === 'versions' && row.isDefault && <span className={styles.defaultBadge}>Default</span>}
                        </span>
                        {primary.sub && <span className={styles.subText}>{primary.sub}</span>}
                      </td>
                      {config.columns.map((column) => (
                        <td key={column.key} className={styles.cell}>
                          {column.render(row, store)}
                        </td>
                      ))}
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${tone?.tone ?? 'neutral'}`])}>
                          {pulling && <LoaderCircle className={styles.spin} width={12} height={12} aria-hidden="true" />}
                          {tone?.label ?? row.status}
                        </span>
                      </td>
                      <td className={styles.date}>{formatDate(row.updatedAt)}</td>
                      <td>
                        {confirmId === row.id ? (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={cx(styles.actionButton, styles.actionDanger)}
                              onClick={() => {
                                remove(kind, row.id);
                                setConfirmId(null);
                              }}
                            >
                              Delete
                            </button>
                            <button type="button" className={cx(styles.actionButton, styles.actionBack)} onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            {kind === 'versions' && (
                              <button
                                type="button"
                                className={cx(styles.iconButton, styles.iconPrimary)}
                                aria-label={`Set ${primary.title} as default`}
                                title={row.isDefault ? 'Already the default' : 'Set as default'}
                                disabled={Boolean(row.isDefault)}
                                onClick={() => setDefaultVersion(row.id)}
                              >
                                <Star width={15} height={15} aria-hidden="true" />
                              </button>
                            )}
                            {kind === 'images' && (
                              <button
                                type="button"
                                className={cx(styles.iconButton, styles.iconPrimary)}
                                aria-label={`Pull ${primary.title}`}
                                title={pulling ? 'Pulling…' : 'Pull again'}
                                disabled={pulling}
                                onClick={() => pullImage(row.id)}
                              >
                                <RefreshCw className={pulling ? styles.spin : undefined} width={15} height={15} aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Edit ${primary.title}`}
                              title="Edit"
                              disabled={pulling}
                              onClick={() => setModal({ item: row })}
                            >
                              <Pencil width={15} height={15} aria-hidden="true" />
                            </button>
                            {toggle && (
                              <button
                                type="button"
                                className={cx(styles.iconButton, isOff ? styles.iconSuccess : styles.iconWarn)}
                                aria-label={`${isOff ? toggle.onLabel : toggle.offLabel} ${primary.title}`}
                                title={lockedDefault ? 'Set another version as default first' : isOff ? toggle.onLabel : toggle.offLabel}
                                disabled={lockedDefault}
                                onClick={() => update(kind, row.id, { status: isOff ? toggle.on : toggle.off })}
                              >
                                <Power width={15} height={15} aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className={cx(styles.iconButton, styles.iconDanger)}
                              aria-label={`Delete ${primary.title}`}
                              title="Delete"
                              disabled={pulling}
                              onClick={() => setConfirmId(row.id)}
                            >
                              <Trash2 width={15} height={15} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <RuntimeModal
          key={modal.item?.id ?? 'new'}
          kind={kind}
          initial={modal.item}
          store={store}
          onCancel={() => setModal(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}