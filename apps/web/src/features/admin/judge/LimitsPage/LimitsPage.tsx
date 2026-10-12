'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { DEFAULT_LIMITS, useJudge } from '../lib/mock';
import { cx } from '../lib/shared';
import type { JudgeLimits } from '../lib/types';
import { JudgeHeader } from '../ui/JudgeHeader';
import styles from '../ui/judge.module.css';

type NumericKey = Exclude<keyof JudgeLimits, 'networkAccess' | 'sandboxProfile'>;
type Draft = Record<NumericKey, string> & Pick<JudgeLimits, 'networkAccess' | 'sandboxProfile'>;

interface NumberField {
  key: NumericKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

const EXECUTION: NumberField[] = [
  { key: 'timeLimitMs', label: 'Time limit', unit: 'ms', min: 100, max: 20000, step: 100, hint: 'Per test case, 100 – 20,000' },
  { key: 'compileTimeoutMs', label: 'Compile timeout', unit: 'ms', min: 1000, max: 60000, step: 500, hint: '1,000 – 60,000' },
  { key: 'memoryLimitMb', label: 'Memory limit', unit: 'MB', min: 16, max: 4096, step: 16, hint: '16 – 4,096' },
  { key: 'outputLimitKb', label: 'Output limit', unit: 'KB', min: 1, max: 10240, step: 1, hint: 'stdout + stderr, 1 – 10,240' },
  { key: 'maxProcesses', label: 'Max processes', unit: 'procs', min: 1, max: 256, step: 1, hint: 'Threads and child processes, 1 – 256' },
];

const FAIR_USE: NumberField[] = [
  { key: 'maxConcurrentPerLearner', label: 'Concurrent runs per learner', unit: 'jobs', min: 1, max: 10, step: 1, hint: '1 – 10' },
  { key: 'submissionsPerMinute', label: 'Submissions per minute', unit: '/min', min: 1, max: 120, step: 1, hint: 'Per learner, 1 – 120' },
];

const PROFILES: { value: JudgeLimits['sandboxProfile']; label: string; text: string }[] = [
  { value: 'strict', label: 'Strict', text: 'Read-only filesystem, seccomp allow-list, no extra syscalls' },
  { value: 'standard', label: 'Standard', text: 'Writable /tmp, default seccomp profile' },
  { value: 'relaxed', label: 'Relaxed', text: 'Writable workspace, extra syscalls for build tools' },
];

const toDraft = (limits: JudgeLimits): Draft => ({
  ...limits,
  ...(Object.fromEntries([...EXECUTION, ...FAIR_USE].map((field) => [field.key, String(limits[field.key])])) as Record<NumericKey, string>),
});

function validate(draft: Draft) {
  const errors: Partial<Record<NumericKey, string>> = {};
  for (const field of [...EXECUTION, ...FAIR_USE]) {
    const raw = draft[field.key].trim();
    const value = Number(raw);
    if (!raw) errors[field.key] = `${field.label} is required`;
    else if (!Number.isInteger(value)) errors[field.key] = 'Enter a whole number';
    else if (value < field.min || value > field.max) errors[field.key] = `Between ${field.min.toLocaleString()} and ${field.max.toLocaleString()}`;
  }
  if (!errors.maxConcurrentPerLearner && !errors.submissionsPerMinute && Number(draft.maxConcurrentPerLearner) > Number(draft.submissionsPerMinute)) {
    errors.maxConcurrentPerLearner = 'Can’t exceed submissions per minute';
  }
  return errors;
}

function LimitsForm({ saved, onSave }: { saved: JudgeLimits; onSave: (limits: JudgeLimits) => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [touched, setTouched] = useState<Partial<Record<NumericKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const errors = useMemo(() => validate(draft), [draft]);
  const invalid = Object.keys(errors).length > 0;
  const savedDraft = useMemo(() => toDraft(saved), [saved]);
  const dirty = (Object.keys(savedDraft) as (keyof Draft)[]).some((key) => String(draft[key]).trim() !== String(savedDraft[key]));
  const isDefault = JSON.stringify(toDraft(DEFAULT_LIMITS)) === JSON.stringify(draft);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!justSaved) return;
    const id = window.setTimeout(() => setJustSaved(false), 2500);
    return () => window.clearTimeout(id);
  }, [justSaved]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (invalid || !dirty) return;
    const next = { ...draft } as unknown as JudgeLimits;
    for (const field of [...EXECUTION, ...FAIR_USE]) next[field.key] = Number(draft[field.key]);
    onSave(next);
    setSubmitted(false);
    setTouched({});
    setJustSaved(true);
  };

  const renderField = (field: NumberField) => {
    const id = `lim-${field.key}`;
    const error = (touched[field.key] || submitted) && errors[field.key];
    return (
      <div key={field.key} className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {field.label}
        </label>
        <div className={styles.unitWrap}>
          <input
            id={id}
            className={cx(styles.input, error && styles.inputError)}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            step={field.step}
            value={draft[field.key]}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-msg`}
            onChange={(event) => set(field.key, event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, [field.key]: true }))}
          />
          <span className={styles.unit} aria-hidden="true">
            {field.unit}
          </span>
        </div>
        <p id={`${id}-msg`} className={error ? styles.errorText : styles.hint}>
          {error || field.hint}
        </p>
      </div>
    );
  };

  const risky = draft.networkAccess && draft.sandboxProfile === 'relaxed';

  return (
    <form onSubmit={submit} noValidate>
      <section className={cx(styles.card, styles.section)} aria-labelledby="lim-exec">
        <h2 id="lim-exec" className={styles.sectionTitle}>
          Execution limits
        </h2>
        <p className={styles.sectionText}>Defaults for every run. A language’s own limits in Runtime Management take precedence.</p>
        <div className={styles.formGrid}>{EXECUTION.map(renderField)}</div>
      </section>

      <section className={cx(styles.card, styles.section)} aria-labelledby="lim-fair">
        <h2 id="lim-fair" className={styles.sectionTitle}>
          Fair use
        </h2>
        <p className={styles.sectionText}>Stops one learner from filling the queue.</p>
        <div className={styles.formGrid}>{FAIR_USE.map(renderField)}</div>
      </section>

      <section className={cx(styles.card, styles.section)} aria-labelledby="lim-sandbox">
        <h2 id="lim-sandbox" className={styles.sectionTitle}>
          Sandbox
        </h2>
        <p className={styles.sectionText}>How isolated each submission is from the host and the network.</p>
        <div className={styles.stack}>
          <div className={styles.switchRow}>
            <div className={styles.switchText} id="lim-net-label">
              <strong>Network access</strong>
              <span>Let submissions open outbound connections. Keep off unless a problem needs it.</span>
            </div>
            <button
              type="button"
              role="switch"
              className={styles.switch}
              aria-checked={draft.networkAccess}
              aria-labelledby="lim-net-label"
              onClick={() => set('networkAccess', !draft.networkAccess)}
            />
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              Isolation profile
            </legend>
            <div className={styles.profiles}>
              {PROFILES.map((profile) => (
                <label key={profile.value} className={cx(styles.profile, draft.sandboxProfile === profile.value && styles.profileActive)}>
                  <input
                    type="radio"
                    name="lim-profile"
                    value={profile.value}
                    checked={draft.sandboxProfile === profile.value}
                    onChange={() => set('sandboxProfile', profile.value)}
                  />
                  <strong>{profile.label}</strong>
                  <span>{profile.text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {risky && <p className={styles.warnText}>Relaxed isolation with network access lets submissions reach internal services. Use only on isolated workers.</p>}
        </div>
      </section>

      <div className={styles.saveBar}>
        <span
          className={cx(styles.saveStatus, dirty && styles.saveStatusDirty, justSaved && !dirty && styles.saveStatusSaved)}
          role="status"
        >
          {justSaved && !dirty ? 'Limits saved' : dirty ? (submitted && invalid ? 'Fix the highlighted fields' : 'Unsaved changes') : 'All changes saved'}
        </span>
        <div className={styles.saveActions}>
          <button type="button" className={styles.ghostButton} onClick={() => setDraft(toDraft(DEFAULT_LIMITS))} disabled={isDefault}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Restore defaults
          </button>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => {
              setDraft(savedDraft);
              setTouched({});
              setSubmitted(false);
            }}
            disabled={!dirty}
          >
            Discard
          </button>
          <button type="submit" className={styles.primaryButton} disabled={!dirty}>
            <Save width={16} height={16} aria-hidden="true" />
            Save limits
          </button>
        </div>
      </div>
    </form>
  );
}

export default function LimitsPage() {
  const { state, loaded, saveLimits, reset } = useJudge(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className={styles.page}>
      <JudgeHeader
        subtitle="Platform-wide execution, fair-use and sandbox limits"
        paused={state?.queuePaused}
        onReset={() => {
          reset();
          setResetKey((key) => key + 1);
        }}
      />
      {!loaded || !state ? (
        <div className={styles.card}>
          <div className={styles.empty}>Loading…</div>
        </div>
      ) : (
        <LimitsForm key={resetKey} saved={state.limits} onSave={saveLimits} />
      )}
    </div>
  );
}