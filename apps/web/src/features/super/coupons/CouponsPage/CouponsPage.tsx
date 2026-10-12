'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, RotateCcw, Search } from 'lucide-react';
import { useCoupons } from '../lib/api';
import { STATUS_META, appliesLabel, cx, discountLabel, durationLabel, formatCompactINR, formatDate, formatINR, statusOf } from '../lib/shared';
import type { Coupon, CouponStatus } from '../lib/types';
import { CouponDrawer } from '../CouponDrawer/CouponDrawer';
import { CouponModal } from '../CouponModal/CouponModal';
import styles from '../ui/coupons.module.css';

type Tab = 'all' | 'active' | 'scheduled' | 'paused' | 'ended';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All coupons' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];

const ORDER: Record<CouponStatus, number> = { active: 0, scheduled: 1, paused: 2, used_up: 3, expired: 4 };

const tabOf = (status: CouponStatus): Exclude<Tab, 'all'> => (status === 'used_up' || status === 'expired' ? 'ended' : status);

export default function CouponsPage() {
  const store = useCoupons();
  const { items, loaded, refresh, error, clearError } = store;
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit' | 'copy'; coupon: Coupon | null } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const ready = loaded && now > 0;

  const withStatus = useMemo(() => items.map((coupon) => ({ coupon, status: ready ? statusOf(coupon, now) : ('active' as CouponStatus) })), [items, now, ready]);

  const stats = useMemo(() => {
    const active = withStatus.filter((row) => row.status === 'active');
    return {
      active: active.length,
      scheduled: withStatus.filter((row) => row.status === 'scheduled').length,
      monthRedemptions: items.reduce((sum, coupon) => sum + coupon.monthRedemptions, 0),
      monthDiscount: items.reduce((sum, coupon) => sum + coupon.monthDiscount, 0),
      discount: items.reduce((sum, coupon) => sum + coupon.discountGiven, 0),
    };
  }, [withStatus, items]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { all: items.length, active: 0, scheduled: 0, paused: 0, ended: 0 };
    for (const row of withStatus) map[tabOf(row.status)] += 1;
    return map;
  }, [withStatus, items.length]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus
      .filter(({ coupon, status }) => {
        if (tab !== 'all' && tabOf(status) !== tab) return false;
        if (q && !`${coupon.code} ${coupon.description}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.coupon.monthRedemptions - a.coupon.monthRedemptions || b.coupon.startsAt - a.coupon.startsAt);
  }, [withStatus, tab, query]);

  const open = openCode ? items.find((coupon) => coupon.code === openCode) ?? null : null;
  const { focus } = store;
  useEffect(() => focus(openCode), [focus, openCode]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Coupons</h1>
          <p className={styles.subtitle}>Discount codes for campaigns, campuses and partners</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} disabled={!loaded} onClick={() => setEditing({ mode: 'new', coupon: null })}>
            <Plus width={16} height={16} aria-hidden="true" />
            New coupon
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
          <span className={cx(styles.statValue, styles.statSuccess)}>{ready ? stats.active : '—'}</span>
          <span className={styles.statLabel}>Active coupons</span>
          <span className={styles.statFoot}>{ready ? `${stats.scheduled} scheduled to start` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? stats.monthRedemptions.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Redemptions this month</span>
          <span className={styles.statFoot}>New subscriptions using a code</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statWarn)}>{ready ? formatCompactINR(stats.monthDiscount) : '—'}</span>
          <span className={styles.statLabel}>Discount given this month</span>
          <span className={styles.statFoot}>{ready ? `${formatCompactINR(stats.discount)} since launch` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready && stats.monthRedemptions ? formatINR(stats.monthDiscount / stats.monthRedemptions) : '—'}</span>
          <span className={styles.statLabel}>Average saving per sign-up</span>
          <span className={styles.statFoot}>This month, across all codes</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Coupon status">
            {TABS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={cx(styles.segment, tab === item.value && styles.segmentActive)} onClick={() => setTab(item.value)}>
                {item.label}
                <span className={styles.segmentCount}>{ready ? counts[item.value] : 0}</span>
              </button>
            ))}
          </div>
          <div className={cx(styles.searchField, styles.inlineSearch)}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search codes" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search coupons" />
          </div>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {!ready ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No coupons match.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={cx(styles.table, styles.couponTable)}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Applies to</th>
                  <th>Redemptions</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ coupon, status }) => {
                  const st = STATUS_META[status];
                  const pct = coupon.maxRedemptions ? Math.min(100, Math.round((coupon.redemptions / coupon.maxRedemptions) * 100)) : null;
                  return (
                    <tr key={coupon.code} className={cx(styles.clickRow, tabOf(status) === 'ended' && styles.rowDim)} onClick={() => setOpenCode(coupon.code)}>
                      <td className={styles.contentCell}>
                        <button
                          type="button"
                          className={cx(styles.rowLink, styles.code)}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenCode(coupon.code);
                          }}
                        >
                          {coupon.code}
                        </button>
                        <span className={styles.meta}>{coupon.description}</span>
                      </td>
                      <td className={styles.nowrap}>
                        <span className={styles.primaryText}>{discountLabel(coupon)}</span>
                        <span className={styles.meta}>{durationLabel(coupon)}</span>
                      </td>
                      <td className={styles.appliesCell}>{appliesLabel(coupon)}</td>
                      <td className={styles.nowrap}>
                        <span className={styles.meterCell}>
                          {pct !== null && (
                            <span className={styles.meter} aria-hidden="true">
                              <span className={cx(styles.meterFill, pct >= 90 && styles.meterLow)} style={{ width: `${pct}%` }} />
                            </span>
                          )}
                          {coupon.maxRedemptions ? `${coupon.redemptions.toLocaleString('en-IN')} / ${coupon.maxRedemptions.toLocaleString('en-IN')}` : coupon.redemptions.toLocaleString('en-IN')}
                        </span>
                        {coupon.monthRedemptions > 0 && <span className={styles.meta}>{`${coupon.monthRedemptions} this month`}</span>}
                      </td>
                      <td className={styles.nowrap}>
                        {formatDate(coupon.startsAt)}
                        <span className={styles.meta}>{coupon.endsAt ? `to ${formatDate(coupon.endsAt)}` : 'no end date'}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
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

      {open && ready && (
        <CouponDrawer
          key={open.code}
          coupon={open}
          now={now}
          store={store}
          onEdit={() => setEditing({ mode: 'edit', coupon: open })}
          onDuplicate={() => setEditing({ mode: 'copy', coupon: open })}
          onNotice={setNotice}
          onClose={() => setOpenCode(null)}
        />
      )}
      {editing && (
        <CouponModal
          mode={editing.mode}
          coupon={editing.coupon}
          existingCodes={new Set(items.map((coupon) => coupon.code))}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            if (editing.mode === 'edit' && editing.coupon) {
              const result = await store.edit(editing.coupon.code, input);
              if (result.data) setNotice(`Saved ${input.code}`);
            } else {
              const result = await store.create(input);
              if (result.data) {
                setNotice(`Created ${input.code}`);
                setOpenCode(input.code);
              }
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
