'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { UNKNOWN_PRICES, usePrices } from '../../lib/prices';
import type { Cycle, IndividualPlan } from '../../subscriptions/lib/types';
import { CYCLES, CYCLE_META, INDIVIDUAL_PLANS, PLAN_META, appliesLabel, cx, discountLabel, durationLabel, formatINR, validateCoupon } from '../lib/shared';
import type { Coupon, CouponDuration, CouponInput, DiscountKind } from '../lib/types';
import styles from '../ui/modal.module.css';

interface CouponModalProps {
  mode: 'new' | 'edit' | 'copy';
  coupon: Coupon | null;
  existingCodes: Set<string>;
  onCancel: () => void;
  onSubmit: (input: CouponInput) => void;
}

const DAY = 86_400_000;

function toDateInput(t: number | null) {
  if (t === null) return '';
  const date = new Date(t);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const fromDateInput = (value: string, endOfDay = false) => (value ? new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).getTime() : Number.NaN);

export function CouponModal({ mode, coupon, existingCodes, onCancel, onSubmit }: CouponModalProps) {
  const prices = usePrices() ?? UNKNOWN_PRICES;
  const [today] = useState(() => Date.now());
  const locked = mode === 'edit' && Boolean(coupon && coupon.redemptions > 0);
  const [code, setCode] = useState(mode === 'copy' && coupon ? `${coupon.code}-2`.slice(0, 20) : coupon?.code ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [kind, setKind] = useState<DiscountKind>(coupon?.kind ?? 'percent');
  const [value, setValue] = useState(String(coupon?.value ?? 20));
  const [plans, setPlans] = useState<IndividualPlan[]>(coupon?.plans ?? []);
  const [cycles, setCycles] = useState<Cycle[]>(coupon?.cycles ?? []);
  const [duration, setDuration] = useState<CouponDuration>(coupon?.duration ?? 'once');
  const [months, setMonths] = useState(String(coupon?.months || 3));
  const [maxRedemptions, setMaxRedemptions] = useState(coupon?.maxRedemptions ? String(coupon.maxRedemptions) : '');
  const [firstTimeOnly, setFirstTimeOnly] = useState(coupon?.firstTimeOnly ?? true);
  const [startsAt, setStartsAt] = useState(toDateInput(mode === 'edit' && coupon ? coupon.startsAt : today));
  const [endsAt, setEndsAt] = useState(toDateInput(mode === 'edit' && coupon ? coupon.endsAt : today + 30 * DAY));
  const [errors, setErrors] = useState<Partial<Record<keyof CouponInput | 'form', string>>>({});
  const codeRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    codeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const input: CouponInput = {
    code,
    description: description.trim(),
    kind,
    value: Number(value),
    plans,
    cycles,
    duration,
    months: duration === 'repeating' ? Number(months) : 0,
    maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
    firstTimeOnly,
    startsAt: fromDateInput(startsAt),
    endsAt: endsAt ? fromDateInput(endsAt, true) : null,
  };

  const example = useMemo(() => {
    const plan = plans[0] ?? 'starter';
    const cycle = cycles[0] ?? 'monthly';
    const price = prices[plan][cycle];
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const after = kind === 'percent' ? Math.round(price * (1 - Math.min(90, amount) / 100)) : Math.max(0, price - amount);
    return `${PLAN_META[plan].label} ${CYCLE_META[cycle].label.toLowerCase()}: ${formatINR(price)} → ${formatINR(after)}`;
  }, [plans, cycles, prices, value, kind]);

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateCoupon(input, existingCodes, prices, mode === 'edit' ? coupon?.code ?? null : null);
    if (locked && coupon && input.maxRedemptions !== null && input.maxRedemptions < coupon.redemptions) found.maxRedemptions = `Already used ${coupon.redemptions} times`;
    if (locked) {
      delete found.code;
      delete found.value;
      delete found.duration;
      delete found.months;
      delete found.startsAt;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit(locked && coupon ? { ...input, code: coupon.code } : input);
  };

  const field = (name: keyof CouponInput) => (errors[name] ? <p className={styles.errorText}>{errors[name]}</p> : null);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={cx(styles.modal, styles.modalWide)} role="dialog" aria-modal="true" aria-labelledby="coupon-modal-title">
        <div className={styles.modalHead}>
          <h2 id="coupon-modal-title" className={styles.modalTitle}>
            {mode === 'edit' ? `Edit ${coupon?.code}` : mode === 'copy' ? `Duplicate ${coupon?.code}` : 'New coupon'}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          {locked && <p className={styles.hint}>{`Used ${coupon?.redemptions} times, so only the description, limit and end date can change. Duplicate it to change the discount.`}</p>}
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="cp-code" className={styles.label}>
                Code<span className={styles.required}> *</span>
              </label>
              <input
                id="cp-code"
                ref={codeRef}
                className={cx(styles.control, styles.mono, errors.code && styles.controlError)}
                value={code}
                disabled={locked || mode === 'edit'}
                maxLength={20}
                placeholder="e.g. CAMPUS25"
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase().replace(/\s+/g, ''));
                  setErrors((current) => ({ ...current, code: undefined }));
                }}
              />
              {field('code')}
            </div>
            <div className={styles.field}>
              <label htmlFor="cp-desc" className={styles.label}>
                Description
              </label>
              <input id="cp-desc" className={styles.control} value={description} maxLength={80} placeholder="Shown only to admins" onChange={(event) => setDescription(event.target.value)} />
            </div>

            <fieldset className={styles.fieldset} disabled={locked}>
              <legend className={styles.label}>Discount</legend>
              <div className={styles.segmented}>
                {(['percent', 'fixed'] as DiscountKind[]).map((option) => (
                  <label key={option} className={cx(styles.segment, kind === option && styles.segmentActive)}>
                    <input type="radio" name="kind" checked={kind === option} onChange={() => {
                      setKind(option);
                      setErrors((current) => ({ ...current, value: undefined }));
                    }} />
                    {option === 'percent' ? 'Percentage' : 'Fixed amount'}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={styles.field}>
              <label htmlFor="cp-value" className={styles.label}>
                {kind === 'percent' ? 'Percent off' : 'Rupees off'}
                <span className={styles.required}> *</span>
              </label>
              <input id="cp-value" inputMode="numeric" className={cx(styles.control, errors.value && styles.controlError)} value={value} disabled={locked} onChange={(event) => {
                setValue(event.target.value.replace(/[^\d]/g, ''));
                setErrors((current) => ({ ...current, value: undefined }));
              }} />
              {field('value')}
            </div>

            <fieldset className={cx(styles.fieldset, styles.wide)} disabled={locked}>
              <legend className={styles.label}>Plans (none selected = all)</legend>
              <div className={styles.chips}>
                {INDIVIDUAL_PLANS.map((plan) => (
                  <button key={plan} type="button" aria-pressed={plans.includes(plan)} className={cx(styles.chip, plans.includes(plan) && styles.chipOn)} onClick={() => setPlans((current) => toggle(current, plan))}>
                    {PLAN_META[plan].label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={cx(styles.fieldset, styles.wide)} disabled={locked}>
              <legend className={styles.label}>Billing cycles (none selected = all)</legend>
              <div className={styles.chips}>
                {CYCLES.map((cycle) => (
                  <button key={cycle} type="button" aria-pressed={cycles.includes(cycle)} className={cx(styles.chip, cycles.includes(cycle) && styles.chipOn)} onClick={() => setCycles((current) => toggle(current, cycle))}>
                    {CYCLE_META[cycle].label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="cp-duration" className={styles.label}>
                How long the discount lasts
              </label>
              <select id="cp-duration" className={cx(styles.control, errors.duration && styles.controlError)} value={duration} disabled={locked} onChange={(event) => setDuration(event.target.value as CouponDuration)}>
                <option value="once">First payment only</option>
                <option value="repeating">For a number of months</option>
                <option value="forever">Every payment</option>
              </select>
              {field('duration')}
            </div>
            <div className={styles.field}>
              <label htmlFor="cp-months" className={styles.label}>
                Months
              </label>
              <input id="cp-months" inputMode="numeric" className={cx(styles.control, errors.months && styles.controlError)} value={duration === 'repeating' ? months : ''} disabled={locked || duration !== 'repeating'} placeholder={duration === 'repeating' ? '' : 'Only for monthly repeats'} onChange={(event) => setMonths(event.target.value.replace(/[^\d]/g, ''))} />
              {field('months')}
            </div>

            <div className={styles.field}>
              <label htmlFor="cp-max" className={styles.label}>
                Total redemptions
              </label>
              <input id="cp-max" inputMode="numeric" className={cx(styles.control, errors.maxRedemptions && styles.controlError)} value={maxRedemptions} placeholder="No limit" onChange={(event) => setMaxRedemptions(event.target.value.replace(/[^\d]/g, ''))} />
              {field('maxRedemptions')}
            </div>
            <label className={cx(styles.field, styles.checkLine)}>
              <input type="checkbox" checked={firstTimeOnly} disabled={locked} onChange={(event) => setFirstTimeOnly(event.target.checked)} />
              New subscribers only
            </label>

            <div className={styles.field}>
              <label htmlFor="cp-start" className={styles.label}>
                Starts<span className={styles.required}> *</span>
              </label>
              <input id="cp-start" type="date" className={cx(styles.control, errors.startsAt && styles.controlError)} value={startsAt} disabled={locked} onChange={(event) => setStartsAt(event.target.value)} />
              {field('startsAt')}
            </div>
            <div className={styles.field}>
              <label htmlFor="cp-end" className={styles.label}>
                Ends
              </label>
              <input id="cp-end" type="date" className={cx(styles.control, errors.endsAt && styles.controlError)} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
              {field('endsAt')}
              <p className={styles.hint}>Leave empty to keep it running</p>
            </div>
          </div>

          <div className={styles.previewBox}>
            <strong>{`${Number(value) > 0 ? discountLabel({ kind, value: Number(value) }) : 'No discount yet'} · ${durationLabel({ duration, months: Number(months) })}`}</strong>
            <span>{appliesLabel({ plans, cycles })}</span>
            {example && <span>{`Example — ${example}`}</span>}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              {mode === 'edit' ? 'Save changes' : 'Create coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
