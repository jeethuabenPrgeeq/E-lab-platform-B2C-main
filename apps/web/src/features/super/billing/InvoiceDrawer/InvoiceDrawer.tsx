'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Mail, RefreshCcw, Undo2, X } from 'lucide-react';
import type { RevenueStore } from '../../subscriptions/lib/api';
import { CYCLE_META, PAYMENT_STATUS_META, PLAN_META, STATUS_META, cx, formatAgo, formatINR, gstOf } from '../../subscriptions/lib/shared';
import type { Payment, Subscription } from '../../subscriptions/lib/types';
import styles from './InvoiceDrawer.module.css';

interface InvoiceDrawerProps {
  payment: Payment;
  subscription: Subscription | null;
  now: number;
  store: RevenueStore;
  onNotice: (text: string) => void;
  onClose: () => void;
}

function formatStamp(t: number) {
  return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function receipt(payment: Payment) {
  const gst = gstOf(payment.amount);
  const lines = [
    'eLab — Tax invoice',
    `Invoice: ${payment.id}`,
    `Date: ${formatStamp(payment.at)}`,
    `Billed to: ${payment.name} <${payment.email}>`,
    '',
    `${PLAN_META[payment.plan].label} plan, ${CYCLE_META[payment.cycle].label.toLowerCase()}`,
    `List price: ${formatINR(payment.listAmount, { decimals: true })}`,
    payment.discount ? `Discount (${payment.coupon}): -${formatINR(payment.discount, { decimals: true })}` : '',
    `Taxable value: ${formatINR(payment.amount - gst, { decimals: true })}`,
    `CGST 9%: ${formatINR(gst / 2, { decimals: true })}`,
    `SGST 9%: ${formatINR(gst / 2, { decimals: true })}`,
    `Total: ${formatINR(payment.amount, { decimals: true })}`,
    payment.refunded ? `Refunded: -${formatINR(payment.refunded, { decimals: true })}` : '',
    `Status: ${PAYMENT_STATUS_META[payment.status].label}`,
    `Paid with: ${payment.methodLabel}`,
  ].filter(Boolean);
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${payment.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function InvoiceDrawer({ payment, subscription, now, store, onNotice, onClose }: InvoiceDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const remaining = payment.amount - payment.refunded;
  const [refunding, setRefunding] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const st = PAYMENT_STATUS_META[payment.status];
  const gst = gstOf(payment.amount);
  const request = payment.refundRequest;
  const canRefund = (payment.status === 'succeeded' || payment.status === 'partially_refunded') && remaining > 0;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  const startRefund = (full: boolean) => {
    setRefunding(true);
    setDeclining(false);
    setAmount(String(remaining));
    setReason(full && request ? `Approved request: ${request.reason}` : '');
    setError('');
  };

  const submitRefund = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount above zero');
      return;
    }
    if (value > remaining) {
      setError(`You can refund at most ${formatINR(remaining)}`);
      return;
    }
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters — it is shown to the customer');
      return;
    }
    const failed = await store.refund(payment.id, Math.round(value), reason.trim());
    if (failed) {
      setError(failed);
      return;
    }
    onNotice(`Refunded ${formatINR(value)} on ${payment.id}`);
    setRefunding(false);
  };

  const submitDecline = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Explain why — the customer is emailed this');
      return;
    }
    const failed = await store.rejectRefund(payment.id, reason.trim());
    if (failed) {
      setError(failed);
      return;
    }
    onNotice(`Declined the refund request on ${payment.id}`);
    setDeclining(false);
  };

  const breakdown: [string, string, string?][] = [
    [`${PLAN_META[payment.plan].label} · ${CYCLE_META[payment.cycle].label}`, formatINR(payment.listAmount, { decimals: true })],
    ...(payment.discount ? ([[`Discount (${payment.coupon})`, `−${formatINR(payment.discount, { decimals: true })}`]] as [string, string][]) : []),
    ['Taxable value', formatINR(payment.amount - gst, { decimals: true }), 'muted'],
    ['CGST 9%', formatINR(gst / 2, { decimals: true }), 'muted'],
    ['SGST 9%', formatINR(gst / 2, { decimals: true }), 'muted'],
    ['Total', formatINR(payment.amount, { decimals: true }), 'total'],
    ...(payment.refunded ? ([['Refunded', `−${formatINR(payment.refunded, { decimals: true })}`, 'danger']] as [string, string, string][]) : []),
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="invoice-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${formatStamp(payment.at)} · ${payment.subscriptionId}`}</span>
            <h2 id="invoice-title" className={styles.title}>
              {payment.id}
            </h2>
            <span className={styles.customer}>{payment.name}</span>
            <a className={styles.mail} href={`mailto:${payment.email}`}>
              <Mail width={13} height={13} aria-hidden="true" />
              {payment.email}
            </a>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
              {subscription && <span className={cx(styles.badge, styles[`tone_${STATUS_META[subscription.status].tone}`])}>{`Subscription ${STATUS_META[subscription.status].label.toLowerCase()}`}</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close invoice" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {request && (
          <div className={cx(styles.requestBox, request.status === 'pending' && styles.requestPending)}>
            <strong>{request.status === 'pending' ? 'Refund requested' : request.status === 'approved' ? 'Refund request approved' : 'Refund request declined'}</strong>
            <span>{`“${request.reason}” · ${formatAgo(request.requestedAt, now)}`}</span>
            {request.note && <span className={styles.hint}>{request.note}</span>}
            {request.status === 'pending' && !refunding && !declining && (
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setDeclining(true);
                    setRefunding(false);
                    setReason('');
                    setError('');
                  }}
                >
                  Decline
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => startRefund(true)}>
                  {`Refund ${formatINR(remaining)}`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.actionBar}>
          {payment.status === 'failed' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionSuccess)}
              onClick={async () => {
                const failed = await store.retryPayment(payment.id);
                if (failed) {
                  store.setError(failed);
                  return;
                }
                onNotice(`Retried ${payment.id} — payment collected`);
              }}
            >
              <RefreshCcw width={16} height={16} aria-hidden="true" />
              Retry charge
            </button>
          )}
          {canRefund && request?.status !== 'pending' && (
            <button type="button" className={styles.action} onClick={() => startRefund(false)}>
              <Undo2 width={16} height={16} aria-hidden="true" />
              Refund
            </button>
          )}
          <button type="button" className={styles.action} onClick={() => receipt(payment)}>
            <Download width={16} height={16} aria-hidden="true" />
            Download invoice
          </button>
        </div>

        {refunding && (
          <form className={styles.closeForm} onSubmit={submitRefund} noValidate>
            <h3 className={styles.sectionTitle}>Refund this payment</h3>
            <div className={styles.twoFields}>
              <label className={styles.field}>
                <span className={styles.label}>Amount (₹)</span>
                <input
                  className={cx(styles.control, error && styles.controlError)}
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/[^\d]/g, ''));
                    setError('');
                  }}
                />
              </label>
              <div className={styles.field}>
                <span className={styles.label}>Refundable</span>
                <span className={styles.refundable}>{formatINR(remaining)}</span>
              </div>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea)}
                value={reason}
                placeholder="e.g. Charged after the learner cancelled"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
              />
            </label>
            {error && <span className={styles.errorText}>{error}</span>}
            <p className={styles.hint}>{`Goes back to ${payment.methodLabel} in 5–7 working days. Refunding does not cancel the subscription.`}</p>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setRefunding(false)}>
                Cancel
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                {`Refund ${formatINR(Number(amount) || 0)}`}
              </button>
            </div>
          </form>
        )}

        {declining && (
          <form className={styles.closeForm} onSubmit={submitDecline} noValidate>
            <h3 className={styles.sectionTitle}>Decline refund request</h3>
            <label className={styles.field}>
              <span className={styles.label}>Message to the customer</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. The renewal reminder was sent 7 days before the charge"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setDeclining(false)}>
                Back
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Decline request
              </button>
            </div>
          </form>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Breakdown</h3>
          <dl className={styles.breakdown}>
            {breakdown.map(([label, value, tone]) => (
              <div key={label} className={cx(styles.breakRow, tone && styles[`break_${tone}`])}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.hint}>{`Paid with ${payment.methodLabel}`}</p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Payment attempts</h3>
          <ol className={styles.timeline}>
            {payment.attempts
              .slice()
              .reverse()
              .map((attempt, index) => (
                <li key={`${attempt.at}-${index}`} className={styles.timelineItem} data-kind={attempt.ok ? 'status' : 'report'}>
                  <span className={styles.timelineText}>
                    <strong>{attempt.ok ? 'Succeeded' : 'Failed'}</strong> {attempt.note}
                  </span>
                  <span className={styles.meta}>{formatStamp(attempt.at)}</span>
                </li>
              ))}
          </ol>
        </section>

        {payment.activity.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Activity</h3>
            <ol className={styles.timeline}>
              {payment.activity
                .slice()
                .reverse()
                .map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={entry.text.startsWith('Refunded') ? 'note' : 'reply'}>
                    <span className={styles.timelineText}>
                      <strong>{entry.actor}</strong> {entry.text}
                    </span>
                    <span className={styles.meta}>{formatAgo(entry.at, now)}</span>
                  </li>
                ))}
            </ol>
          </section>
        )}
      </aside>
    </div>
  );
}
