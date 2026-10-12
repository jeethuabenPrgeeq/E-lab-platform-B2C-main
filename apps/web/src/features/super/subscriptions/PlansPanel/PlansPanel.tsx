'use client';

import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { RevenueStore } from '../lib/api';
import { CYCLES, CYCLE_META, DEFAULT_PRICES, INDIVIDUAL_PLANS, PLAN_META, cx, formatCompactINR, formatINR, isLive, monthlyValue, savingVsMonthly } from '../lib/shared';
import type { Cycle, IndividualPlan, PlanId } from '../lib/types';
import styles from '../ui/subscriptions.module.css';

interface PlansPanelProps {
  store: RevenueStore;
  onNotice: (text: string) => void;
}

type Draft = Record<Cycle, string>;

export function PlansPanel({ store, onNotice }: PlansPanelProps) {
  const { prices, subscriptions } = store;
  const [editing, setEditing] = useState<IndividualPlan | null>(null);
  const [draft, setDraft] = useState<Draft>({ monthly: '', quarterly: '', annual: '' });
  const [error, setError] = useState('');

  const usage = useMemo(() => {
    const map = new Map<PlanId, { count: number; mrr: number; byCycle: Record<Cycle, number>; legacy: number }>();
    for (const plan of [...INDIVIDUAL_PLANS, 'enterprise'] as PlanId[]) map.set(plan, { count: 0, mrr: 0, byCycle: { monthly: 0, quarterly: 0, annual: 0 }, legacy: 0 });
    for (const sub of subscriptions) {
      if (!isLive(sub)) continue;
      const entry = map.get(sub.plan)!;
      entry.count += 1;
      entry.mrr += monthlyValue(sub);
      entry.byCycle[sub.cycle] += 1;
      if (sub.plan !== 'enterprise' && sub.amount !== prices[sub.plan][sub.cycle]) entry.legacy += 1;
    }
    return map;
  }, [subscriptions, prices]);

  const totalMrr = [...usage.values()].reduce((sum, entry) => sum + entry.mrr, 0);

  const startEdit = (plan: IndividualPlan) => {
    setEditing(plan);
    setDraft({ monthly: String(prices[plan].monthly), quarterly: String(prices[plan].quarterly), annual: String(prices[plan].annual) });
    setError('');
  };

  const save = async (plan: IndividualPlan) => {
    const values = { monthly: Number(draft.monthly), quarterly: Number(draft.quarterly), annual: Number(draft.annual) };
    if (CYCLES.some((cycle) => !Number.isInteger(values[cycle]) || values[cycle] <= 0)) {
      setError('Prices must be whole rupees above zero');
      return;
    }
    if (values.quarterly > values.monthly * 3) {
      setError('Quarterly must not cost more than three monthly payments');
      return;
    }
    if (values.annual > values.monthly * 12) {
      setError('Annual must not cost more than twelve monthly payments');
      return;
    }
    const changed = CYCLES.filter((cycle) => values[cycle] !== prices[plan][cycle]);
    for (const cycle of changed) {
      const failed = await store.setPrice(plan, cycle, values[cycle]);
      if (failed) {
        setError(failed);
        return;
      }
    }
    setEditing(null);
    onNotice(changed.length ? `Updated ${PLAN_META[plan].label} prices — existing subscribers keep what they pay today` : 'No prices changed');
  };

  return (
    <div className={styles.planGrid}>
      {INDIVIDUAL_PLANS.map((plan) => {
        const entry = usage.get(plan)!;
        const isEditing = editing === plan;
        return (
          <article key={plan} className={styles.planCard}>
            <div className={styles.planHead}>
              <span className={cx(styles.badge, styles[`tone_${PLAN_META[plan].tone}`])}>{PLAN_META[plan].label}</span>
              {!isEditing && (
                <button type="button" className={styles.planEdit} onClick={() => startEdit(plan)} aria-label={`Edit ${PLAN_META[plan].label} prices`}>
                  <Pencil width={14} height={14} aria-hidden="true" />
                  Edit
                </button>
              )}
            </div>
            <div className={styles.planMetric}>
              <strong>{entry.count.toLocaleString('en-IN')}</strong>
              <span>{`subscribers · ${formatCompactINR(entry.mrr)}/mo · ${totalMrr ? Math.round((entry.mrr / totalMrr) * 100) : 0}% of MRR`}</span>
            </div>
            <ul className={styles.priceList}>
              {CYCLES.map((cycle) => (
                <li key={cycle} className={styles.priceRow}>
                  <span>
                    <span className={styles.priceCycle}>{CYCLE_META[cycle].label}</span>
                    <span className={styles.meta}>{`${entry.byCycle[cycle].toLocaleString('en-IN')} subscribers`}</span>
                  </span>
                  {isEditing ? (
                    <label className={styles.priceInput}>
                      <span aria-hidden="true">₹</span>
                      <input
                        inputMode="numeric"
                        value={draft[cycle]}
                        aria-label={`${PLAN_META[plan].label} ${CYCLE_META[cycle].label} price`}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, [cycle]: event.target.value.replace(/[^\d]/g, '') }));
                          setError('');
                        }}
                      />
                    </label>
                  ) : (
                    <span className={styles.priceValue}>
                      {formatINR(prices[plan][cycle])}
                      {cycle !== 'monthly' && <span className={styles.saving}>{`save ${savingVsMonthly(prices, plan, cycle)}%`}</span>}
                      {prices[plan][cycle] !== DEFAULT_PRICES[plan][cycle] && <span className={styles.meta}>{`was ${formatINR(DEFAULT_PRICES[plan][cycle])}`}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {isEditing ? (
              <>
                {error && <p className={styles.planError}>{error}</p>}
                <p className={styles.planHint}>{`New prices apply to new subscriptions and plan changes. ${entry.count.toLocaleString('en-IN')} current subscribers keep their price.`}</p>
                <div className={styles.planActions}>
                  <button type="button" className={styles.ghostButton} onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={() => void save(plan)}>
                    Save prices
                  </button>
                </div>
              </>
            ) : (
              entry.legacy > 0 && <p className={styles.planHint}>{`${entry.legacy.toLocaleString('en-IN')} subscribers are on an older price`}</p>
            )}
          </article>
        );
      })}
      <article className={styles.planCard}>
        <div className={styles.planHead}>
          <span className={cx(styles.badge, styles.tone_warning)}>Enterprise</span>
        </div>
        <div className={styles.planMetric}>
          <strong>{usage.get('enterprise')!.count}</strong>
          <span>{`institutions · ${formatCompactINR(usage.get('enterprise')!.mrr)}/mo · ${totalMrr ? Math.round((usage.get('enterprise')!.mrr / totalMrr) * 100) : 0}% of MRR`}</span>
        </div>
        <p className={styles.planHint}>Annual contracts priced per institution by Sales, billed by invoice. Seats come from the institution’s licence.</p>
        <p className={styles.planHint}>{`Average contract ${formatCompactINR((usage.get('enterprise')!.mrr * 12) / Math.max(1, usage.get('enterprise')!.count))} a year.`}</p>
      </article>
    </div>
  );
}
