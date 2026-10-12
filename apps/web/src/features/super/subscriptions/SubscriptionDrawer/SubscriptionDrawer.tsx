'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRightLeft, Ban, CalendarPlus, Mail, RefreshCcw, RotateCcw, X } from 'lucide-react';
import { periodMs, type RevenueStore } from '../lib/api';
import { CYCLES, CYCLE_META, DAY, INDIVIDUAL_PLANS, PAYMENT_STATUS_META, PLAN_META, STATUS_META, cx, formatAgo, formatDate, formatINR, monthlyValue } from '../lib/shared';
import type { Cycle, IndividualPlan, Subscription } from '../lib/types';
import styles from './SubscriptionDrawer.module.css';

interface SubscriptionDrawerProps {
  sub: Subscription;
  now: number;
  store: RevenueStore;
  onNotice: (text: string) => void;
  onClose: () => void;
}

type Panel = 'change' | 'cancel' | 'extend' | null;

export function SubscriptionDrawer({ sub, now, store, onNotice, onClose }: SubscriptionDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [panel, setPanel] = useState<Panel>(null);
  const [plan, setPlan] = useState<IndividualPlan>(sub.plan === 'enterprise' ? 'professional' : sub.plan);
  const [cycle, setCycle] = useState<Cycle>(sub.cycle);
  const [when, setWhen] = useState<'now' | 'renewal'>('renewal');
  const [mode, setMode] = useState<'period_end' | 'now'>(sub.status === 'past_due' ? 'now' : 'period_end');
  const [refundUnused, setRefundUnused] = useState(true);
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const st = STATUS_META[sub.status];
  const live = sub.status !== 'cancelled';
  const enterprise = sub.plan === 'enterprise';
  const invoices = useMemo(() => store.payments.filter((payment) => payment.subscriptionId === sub.id).slice(0, 6), [store.payments, sub.id]);
  const openFailure = invoices.find((payment) => payment.status === 'failed');
  const paid = invoices.reduce((sum, payment) => sum + (payment.status === 'failed' ? 0 : payment.amount - payment.refunded), 0);

  const preview = useMemo(() => {
    const amount = store.prices[plan][cycle];
    const credit = Math.max(0, Math.round((sub.amount * Math.max(0, sub.periodEnd - now)) / periodMs(sub.cycle)));
    return { amount, credit, due: Math.max(0, amount - credit), same: plan === sub.plan && cycle === sub.cycle };
  }, [store.prices, plan, cycle, sub, now]);

  const unusedRefund = useMemo(() => {
    const last = invoices.find((payment) => payment.status === 'succeeded' || payment.status === 'partially_refunded');
    if (!last) return 0;
    return Math.min(last.amount - last.refunded, Math.round((sub.amount * Math.max(0, sub.periodEnd - now)) / periodMs(sub.cycle)));
  }, [invoices, sub, now]);

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

  const openPanel = (next: Panel) => {
    setPanel(next);
    setReason('');
    setError('');
  };

  const needReason = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters — it is shown in the audit log');
      return false;
    }
    return true;
  };

  const submitChange = async (event: FormEvent) => {
    event.preventDefault();
    if (preview.same) {
      setError('Pick a different plan or billing cycle');
      return;
    }
    const failed = await store.changePlan(sub.id, plan, cycle, when);
    if (failed) {
      setError(failed);
      return;
    }
    onNotice(when === 'now' ? `Moved ${sub.name} to ${PLAN_META[plan].label} ${CYCLE_META[cycle].label.toLowerCase()}` : `${sub.name} switches to ${PLAN_META[plan].label} at the next renewal`);
    setPanel(null);
  };

  const submitCancel = async (event: FormEvent) => {
    if (!needReason(event)) return;
    const failed = await store.cancel(sub.id, mode, reason.trim(), mode === 'now' && refundUnused);
    if (failed) {
      setError(failed);
      return;
    }
    onNotice(mode === 'now' ? `Cancelled ${sub.name}’s subscription` : `${sub.name}’s subscription ends on ${formatDate(sub.periodEnd)}`);
    setPanel(null);
  };

  const submitExtend = async (event: FormEvent) => {
    if (!needReason(event)) return;
    const failed = await store.extend(sub.id, days, reason.trim());
    if (failed) {
      setError(failed);
      return;
    }
    onNotice(`Added ${days} free days for ${sub.name}`);
    setPanel(null);
  };

  const facts: [string, string][] = [
    ['Plan', `${PLAN_META[sub.plan].label} · ${CYCLE_META[sub.cycle].label}`],
    ['Price', `${formatINR(sub.amount)} per ${CYCLE_META[sub.cycle].short}${sub.cycle !== 'monthly' ? ` (${formatINR(monthlyValue(sub))}/mo)` : ''}`],
    ['Started', formatDate(sub.startedAt)],
    [sub.status === 'cancelled' ? 'Ended' : sub.cancelAtPeriodEnd ? 'Ends' : sub.status === 'past_due' ? 'Was due' : 'Renews', formatDate(sub.periodEnd)],
    ['Payment method', sub.methodLabel],
    ['Paid in last 60 days', formatINR(paid)],
  ];
  if (enterprise) facts.splice(2, 0, ['Seats', String(sub.seats)]);
  if (sub.coupon) facts.push(['Signed up with', sub.coupon]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="sub-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{sub.id}</span>
            <h2 id="sub-title" className={styles.title}>
              {sub.name}
            </h2>
            <a className={styles.mail} href={`mailto:${sub.email}`}>
              <Mail width={13} height={13} aria-hidden="true" />
              {sub.email}
            </a>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
              <span className={cx(styles.badge, styles[`tone_${PLAN_META[sub.plan].tone}`])}>{PLAN_META[sub.plan].label}</span>
              {sub.cancelAtPeriodEnd && live && <span className={cx(styles.badge, styles.tone_warning)}>Cancels at period end</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close subscription" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {sub.status === 'past_due' && (
          <div className={styles.suspendedBox}>
            <strong>{`Renewal failed ${Math.max(1, Math.floor((now - sub.periodEnd) / DAY))} days ago`}</strong>
            <span>{`${openFailure?.attempts[openFailure.attempts.length - 1]?.note ?? 'The last charge did not go through'}. Access is kept for 7 days while we retry.`}</span>
          </div>
        )}
        {sub.cancelReason && (
          <div className={styles.suspendedBox}>
            <strong>{sub.status === 'cancelled' ? 'Cancelled' : 'Cancelling'}</strong>
            <span>{sub.cancelReason}</span>
          </div>
        )}
        {sub.pendingChange && (
          <p className={styles.warnText}>{`Switches to ${PLAN_META[sub.pendingChange.plan].label} ${CYCLE_META[sub.pendingChange.cycle].label.toLowerCase()} (${formatINR(sub.pendingChange.amount)}) on ${formatDate(sub.periodEnd)}.`}</p>
        )}

        {live && (
          <div className={styles.actionBar}>
            {sub.status === 'past_due' && openFailure && (
              <button
                type="button"
                className={cx(styles.action, styles.actionSuccess)}
                onClick={async () => {
                  const failed = await store.retryPayment(openFailure.id);
                  if (failed) store.setError(failed);
                  else onNotice(`Retried the payment — recovered`);
                }}
              >
                <RefreshCcw width={16} height={16} aria-hidden="true" />
                Retry payment
              </button>
            )}
            {!enterprise && !sub.cancelAtPeriodEnd && (
              <button type="button" className={styles.action} onClick={() => openPanel('change')}>
                <ArrowRightLeft width={16} height={16} aria-hidden="true" />
                Change plan
              </button>
            )}
            <button type="button" className={styles.action} onClick={() => openPanel('extend')}>
              <CalendarPlus width={16} height={16} aria-hidden="true" />
              Add free days
            </button>
            {sub.cancelAtPeriodEnd ? (
              <button
                type="button"
                className={cx(styles.action, styles.actionSuccess)}
                onClick={async () => {
                  const failed = await store.resume(sub.id);
                  if (failed) {
                    store.setError(failed);
                    return;
                  }
                  onNotice(`${sub.name}’s subscription will renew again`);
                }}
              >
                <RotateCcw width={16} height={16} aria-hidden="true" />
                Resume
              </button>
            ) : (
              !enterprise && (
                <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => openPanel('cancel')}>
                  <Ban width={16} height={16} aria-hidden="true" />
                  Cancel
                </button>
              )
            )}
          </div>
        )}
        {enterprise && <p className={styles.hint}>Enterprise contracts are priced and changed by Sales. You can add free days here as goodwill.</p>}

        {panel === 'change' && (
          <form className={styles.closeForm} onSubmit={submitChange} noValidate>
            <h3 className={styles.sectionTitle}>Change plan</h3>
            <div className={styles.twoFields}>
              <label className={styles.field}>
                <span className={styles.label}>Plan</span>
                <select
                  className={styles.control}
                  value={plan}
                  onChange={(event) => {
                    setPlan(event.target.value as IndividualPlan);
                    setError('');
                  }}
                >
                  {INDIVIDUAL_PLANS.map((value) => (
                    <option key={value} value={value}>
                      {PLAN_META[value].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Billing cycle</span>
                <select
                  className={styles.control}
                  value={cycle}
                  onChange={(event) => {
                    setCycle(event.target.value as Cycle);
                    setError('');
                  }}
                >
                  {CYCLES.map((value) => (
                    <option key={value} value={value}>
                      {`${CYCLE_META[value].label} · ${formatINR(store.prices[plan][value])}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.choiceGroup} role="radiogroup" aria-label="When to apply">
              <label className={cx(styles.choice, when === 'renewal' && styles.choiceOn)}>
                <input type="radio" name="when" checked={when === 'renewal'} onChange={() => setWhen('renewal')} />
                <span>
                  <strong>At next renewal</strong>
                  <span className={styles.hint}>{`From ${formatDate(sub.periodEnd)}, charged ${formatINR(preview.amount)}`}</span>
                </span>
              </label>
              <label className={cx(styles.choice, when === 'now' && styles.choiceOn)}>
                <input type="radio" name="when" checked={when === 'now'} onChange={() => setWhen('now')} />
                <span>
                  <strong>Right away</strong>
                  <span className={styles.hint}>{`${formatINR(preview.credit)} credit for unused time · charge ${formatINR(preview.due)} now`}</span>
                </span>
              </label>
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setPanel(null)}>
                Back
              </button>
              <button type="submit" className={styles.primaryButton}>
                {when === 'now' ? `Change and charge ${formatINR(preview.due)}` : 'Schedule change'}
              </button>
            </div>
          </form>
        )}

        {panel === 'cancel' && (
          <form className={styles.closeForm} onSubmit={submitCancel} noValidate>
            <h3 className={styles.sectionTitle}>Cancel subscription</h3>
            <div className={styles.choiceGroup} role="radiogroup" aria-label="When to cancel">
              {sub.status !== 'past_due' && (
                <label className={cx(styles.choice, mode === 'period_end' && styles.choiceOn)}>
                  <input type="radio" name="mode" checked={mode === 'period_end'} onChange={() => setMode('period_end')} />
                  <span>
                    <strong>At the end of the period</strong>
                    <span className={styles.hint}>{`Keeps access until ${formatDate(sub.periodEnd)}, then stops renewing`}</span>
                  </span>
                </label>
              )}
              <label className={cx(styles.choice, mode === 'now' && styles.choiceOn)}>
                <input type="radio" name="mode" checked={mode === 'now'} onChange={() => setMode('now')} />
                <span>
                  <strong>Immediately</strong>
                  <span className={styles.hint}>{sub.status === 'past_due' ? 'The overdue payment is written off and access ends now' : 'Access ends now'}</span>
                </span>
              </label>
            </div>
            {mode === 'now' && (
              <label className={styles.checkRow}>
                <input type="checkbox" checked={refundUnused} onChange={(event) => setRefundUnused(event.target.checked)} />
                {`Refund unused time (${formatINR(unusedRefund)})`}
              </label>
            )}
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Learner asked over support"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setPanel(null)}>
                Keep subscription
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Cancel subscription
              </button>
            </div>
          </form>
        )}

        {panel === 'extend' && (
          <form className={styles.closeForm} onSubmit={submitExtend} noValidate>
            <h3 className={styles.sectionTitle}>Add free days</h3>
            <div className={styles.dayChips} role="radiogroup" aria-label="Number of days">
              {[7, 14, 30].map((value) => (
                <button key={value} type="button" role="radio" aria-checked={days === value} className={cx(styles.dayChip, days === value && styles.dayChipOn)} onClick={() => setDays(value)}>
                  {`${value} days`}
                </button>
              ))}
            </div>
            <p className={styles.hint}>{`The next ${sub.status === 'past_due' ? 'due date' : 'renewal'} moves to ${formatDate(sub.periodEnd + days * DAY)}.`}</p>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Compensation for the judge outage on 3 Oct"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setPanel(null)}>
                Back
              </button>
              <button type="submit" className={styles.primaryButton}>
                {`Add ${days} days`}
              </button>
            </div>
          </form>
        )}

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent invoices</h3>
          {invoices.length === 0 ? (
            <p className={styles.hint}>No invoices in the last 60 days.</p>
          ) : (
            <ul className={styles.invoiceList}>
              {invoices.map((payment) => (
                <li key={payment.id} className={styles.invoiceItem}>
                  <span>
                    <span className={styles.invoiceId}>{payment.id}</span>
                    <span className={styles.meta}>{formatDate(payment.at)}</span>
                  </span>
                  <span className={styles.invoiceAmount}>{formatINR(payment.amount)}</span>
                  <span className={cx(styles.badge, styles[`tone_${PAYMENT_STATUS_META[payment.status].tone}`])}>{PAYMENT_STATUS_META[payment.status].label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {sub.activity
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={/(Cancel|failed)/i.test(entry.text) ? 'report' : /^(Subscribed|Resumed|Payment recovered|Enterprise)/.test(entry.text) ? 'status' : 'reply'}>
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
