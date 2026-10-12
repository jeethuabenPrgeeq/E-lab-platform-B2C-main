'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, CopyPlus, Pause, Pencil, Play, Square, X } from 'lucide-react';
import type { CouponStore } from '../lib/api';
import { CYCLE_META, PLAN_META, STATUS_META, appliesLabel, cx, discountLabel, durationLabel, formatAgo, formatDate, formatINR, statusOf } from '../lib/shared';
import type { Coupon } from '../lib/types';
import styles from './CouponDrawer.module.css';

interface CouponDrawerProps {
  coupon: Coupon;
  now: number;
  store: CouponStore;
  onEdit: () => void;
  onDuplicate: () => void;
  onNotice: (text: string) => void;
  onClose: () => void;
}

export function CouponDrawer({ coupon, now, store, onEdit, onDuplicate, onNotice, onClose }: CouponDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = statusOf(coupon, now);
  const st = STATUS_META[status];
  const ended = status === 'expired' || status === 'used_up';
  const pct = coupon.maxRedemptions ? Math.min(100, Math.round((coupon.redemptions / coupon.maxRedemptions) * 100)) : null;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.querySelectorAll('[role="dialog"][aria-modal="true"]').length <= 1) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const facts: [string, string][] = [
    ['Discount', discountLabel(coupon)],
    ['Lasts', durationLabel(coupon)],
    ['Applies to', appliesLabel(coupon)],
    ['Who can use it', coupon.firstTimeOnly ? 'New subscribers only' : 'Anyone, once per account'],
    ['Starts', formatDate(coupon.startsAt)],
    ['Ends', coupon.endsAt ? formatDate(coupon.endsAt) : 'No end date'],
    ['Discount given', formatINR(coupon.discountGiven)],
    ['Revenue from these customers', formatINR(coupon.revenue)],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="coupon-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`Created ${formatDate(coupon.createdAt)}`}</span>
            <h2 id="coupon-title" className={cx(styles.title, styles.codeTitle)}>
              {coupon.code}
              <button
                type="button"
                className={styles.copyButton}
                aria-label={`Copy ${coupon.code}`}
                onClick={() => {
                  void navigator.clipboard?.writeText(coupon.code).then(() => setCopied(true)).catch(() => {});
                }}
              >
                <Copy width={14} height={14} aria-hidden="true" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </h2>
            <span className={styles.hint}>{coupon.description}</span>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
              <span className={cx(styles.badge, styles.tone_primary)}>{discountLabel(coupon)}</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close coupon" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actionBar}>
          {!ended && (
            <button type="button" className={styles.action} onClick={onEdit}>
              <Pencil width={16} height={16} aria-hidden="true" />
              Edit
            </button>
          )}
          {(status === 'active' || status === 'scheduled') && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                store.setPaused(coupon.code, true);
                onNotice(`Paused ${coupon.code}`);
              }}
            >
              <Pause width={16} height={16} aria-hidden="true" />
              Pause
            </button>
          )}
          {status === 'paused' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionSuccess)}
              onClick={() => {
                store.setPaused(coupon.code, false);
                onNotice(`Resumed ${coupon.code}`);
              }}
            >
              <Play width={16} height={16} aria-hidden="true" />
              Resume
            </button>
          )}
          <button type="button" className={styles.action} onClick={onDuplicate}>
            <CopyPlus width={16} height={16} aria-hidden="true" />
            Duplicate
          </button>
          {!ended && (
            <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => setConfirmEnd(true)}>
              <Square width={16} height={16} aria-hidden="true" />
              End now
            </button>
          )}
        </div>

        {confirmEnd && (
          <div className={styles.closeForm} role="alert">
            <h3 className={styles.sectionTitle}>{`End ${coupon.code} now?`}</h3>
            <p className={styles.hint}>Nobody new can use it. Customers who already redeemed it keep their discount for its full duration.</p>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmEnd(false)}>
                Keep it
              </button>
              <button
                type="button"
                className={cx(styles.primaryButton, styles.dangerButton)}
                onClick={() => {
                  store.endNow(coupon.code);
                  onNotice(`Ended ${coupon.code}`);
                  setConfirmEnd(false);
                }}
              >
                End coupon
              </button>
            </div>
          </div>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Redemptions</h3>
          <div className={styles.usage}>
            <strong>{coupon.redemptions.toLocaleString('en-IN')}</strong>
            <span>{coupon.maxRedemptions ? `of ${coupon.maxRedemptions.toLocaleString('en-IN')} allowed` : 'no limit'}</span>
          </div>
          {pct !== null && (
            <span className={styles.usageMeter} aria-hidden="true">
              <span className={cx(styles.usageFill, pct >= 90 && styles.usageFull)} style={{ width: `${pct}%` }} />
            </span>
          )}
          {coupon.monthRedemptions > 0 && <p className={styles.hint}>{`${coupon.monthRedemptions} this month · ${formatINR(coupon.monthDiscount)} discounted`}</p>}
        </section>

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent redemptions</h3>
          {coupon.recent.length === 0 ? (
            <p className={styles.hint}>Not used yet.</p>
          ) : (
            <ul className={styles.invoiceList}>
              {coupon.recent.map((item, index) => (
                <li key={`${item.name}-${index}`} className={styles.invoiceItem}>
                  <span>
                    <span className={styles.invoiceId}>{item.name}</span>
                    <span className={styles.meta}>{`${PLAN_META[item.plan].label} · ${CYCLE_META[item.cycle].label} · ${formatAgo(item.at, now)}`}</span>
                  </span>
                  <span className={styles.invoiceAmount}>{`−${formatINR(item.saved)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {coupon.activity
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={/^(Ended|Paused)/.test(entry.text) ? 'report' : entry.text.startsWith('Created') || entry.text.startsWith('Resumed') ? 'status' : 'reply'}>
                  <span className={styles.timelineText}>
                    <strong>{entry.actor}</strong> {entry.text}
                  </span>
                  <span className={styles.meta}>{formatAgo(entry.at, now)}</span>
                </li>
              ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
