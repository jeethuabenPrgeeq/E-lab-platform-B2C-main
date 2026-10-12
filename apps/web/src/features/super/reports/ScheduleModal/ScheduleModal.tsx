'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { EMAIL_PATTERN, cx } from '../../users/lib/shared';
import { WEEKDAYS, cadenceLabel, nextRun, scheduleRange, type Frequency, type Schedule, type ScheduleInput } from '../lib/api';
import { RANGE_LABEL, TEMPLATES, TEMPLATE_MAP, type TemplateId } from '../lib/templates';
import styles from '../ui/modal.module.css';

interface ScheduleModalProps {
  schedule: Schedule | null;
  templateId: TemplateId;
  onCancel: () => void;
  onSubmit: (input: ScheduleInput) => void;
}

const MAX_RECIPIENTS = 10;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function ScheduleModal({ schedule, templateId, onCancel, onSubmit }: ScheduleModalProps) {
  const [template, setTemplate] = useState<TemplateId>(schedule?.templateId ?? templateId);
  const [frequency, setFrequency] = useState<Frequency>(schedule?.frequency ?? 'weekly');
  const [weekday, setWeekday] = useState(schedule?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(schedule?.dayOfMonth ?? 1);
  const [hour, setHour] = useState(schedule?.hour ?? 9);
  const [recipients, setRecipients] = useState(schedule?.recipients.join(', ') ?? '');
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const firstRef = useRef<HTMLSelectElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const parsed = useMemo(() => {
    const list = recipients.split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean);
    const unique = [...new Set(list)];
    return { valid: unique.filter((value) => EMAIL_PATTERN.test(value)), invalid: unique.filter((value) => !EMAIL_PATTERN.test(value)) };
  }, [recipients]);

  const cadence = { frequency, weekday, dayOfMonth, hour };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsed.invalid.length) {
      setError(`Not valid: ${parsed.invalid.slice(0, 3).join(', ')}`);
      return;
    }
    if (parsed.valid.length === 0) {
      setError('Add at least one recipient');
      return;
    }
    if (parsed.valid.length > MAX_RECIPIENTS) {
      setError(`At most ${MAX_RECIPIENTS} recipients — use a group address for more`);
      return;
    }
    onSubmit({ templateId: template, frequency, weekday, dayOfMonth, hour, recipients: parsed.valid });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="schedule-title">
        <div className={styles.modalHead}>
          <h2 id="schedule-title" className={styles.modalTitle}>
            {schedule ? 'Edit schedule' : 'Schedule a report'}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="sch-template" className={styles.label}>
                Report
              </label>
              <select id="sch-template" ref={firstRef} className={styles.control} value={template} onChange={(event) => setTemplate(event.target.value as TemplateId)}>
                {TEMPLATES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="sch-frequency" className={styles.label}>
                How often
              </label>
              <select id="sch-frequency" className={styles.control} value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="sch-day" className={styles.label}>
                {frequency === 'weekly' ? 'Day' : 'Date'}
              </label>
              {frequency === 'weekly' ? (
                <select id="sch-day" className={styles.control} value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
                  {WEEKDAYS.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <select id="sch-day" className={styles.control} value={dayOfMonth} onChange={(event) => setDayOfMonth(Number(event.target.value))}>
                  {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="sch-hour" className={styles.label}>
                Time (IST)
              </label>
              <select id="sch-hour" className={styles.control} value={hour} onChange={(event) => setHour(Number(event.target.value))}>
                {HOURS.map((value) => (
                  <option key={value} value={value}>
                    {new Date(2026, 0, 1, value).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true })}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Covers</span>
              <span className={styles.staticValue}>{TEMPLATE_MAP[template].snapshot ? 'Snapshot at send time' : RANGE_LABEL[scheduleRange(frequency)]}</span>
            </div>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="sch-recipients" className={styles.label}>
                Email to<span className={styles.required}> *</span>
              </label>
              <textarea
                id="sch-recipients"
                className={cx(styles.control, error && styles.controlError)}
                rows={3}
                value={recipients}
                placeholder="finance@elab.com, lakshmi.v@elab.com"
                onChange={(event) => {
                  setRecipients(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              <p className={error ? styles.errorText : styles.hint}>{error || `${parsed.valid.length} recipient${parsed.valid.length === 1 ? '' : 's'} · separate with commas or new lines`}</p>
            </div>
          </div>

          <div className={styles.previewBox}>
            <strong>{cadenceLabel(cadence)}</strong>
            <span>{`First send: ${new Date(nextRun(cadence, now)).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}`}</span>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              {schedule ? 'Save schedule' : 'Create schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
