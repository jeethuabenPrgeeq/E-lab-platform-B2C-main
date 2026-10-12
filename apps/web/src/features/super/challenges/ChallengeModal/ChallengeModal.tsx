'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { ContentItem } from '../../content/lib/types';
import { ACCESS_META, DIFFICULTY_META, DURATIONS, KIND_META, MAX_PROBLEMS, cx, toLocalInput } from '../lib/shared';
import type { Challenge, ChallengeAccess, ChallengeInput, ChallengeKind } from '../lib/types';
import styles from '../ui/modal.module.css';

interface ChallengeModalProps {
  challenge: Challenge | null;
  catalog: ContentItem[];
  onCancel: () => void;
  onSubmit: (input: ChallengeInput, publish: boolean) => Promise<string[]>;
}

function defaultStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 0, 0, 0);
  return toLocalInput(date.getTime());
}

export function ChallengeModal({ challenge, catalog, onCancel, onSubmit }: ChallengeModalProps) {
  const [title, setTitle] = useState(challenge?.title ?? '');
  const [kind, setKind] = useState<ChallengeKind>(challenge?.kind ?? 'weekly');
  const [sponsor, setSponsor] = useState(challenge?.sponsor ?? '');
  const [start, setStart] = useState(() => (challenge ? toLocalInput(challenge.startAt) : defaultStart()));
  const [duration, setDuration] = useState(() => {
    if (!challenge) return 120;
    return Math.round((challenge.endAt - challenge.startAt) / 60000);
  });
  const [prize, setPrize] = useState(String(challenge?.prize ?? 10000));
  const [access, setAccess] = useState<ChallengeAccess>(challenge?.access ?? 'everyone');
  const [problems, setProblems] = useState<string[]>(challenge?.problems ?? []);
  const [query, setQuery] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const scheduled = Boolean(challenge?.published);
  const catalogMap = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  const durationOptions = DURATIONS.some((option) => option.minutes === duration) ? DURATIONS : [...DURATIONS, { minutes: duration, label: `${duration} minutes` }];

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(problems);
    return catalog
      .filter((item) => item.type !== 'project' && item.visibility !== 'retired' && !taken.has(item.id) && `${item.title} ${item.technology} ${item.id}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [catalog, query, problems]);

  const submit = (publish: boolean) => async (event?: FormEvent) => {
    event?.preventDefault();
    const prizeValue = Number(prize.replace(/[^\d]/g, '')) || 0;
    const result = await onSubmit(
      {
        title,
        kind,
        sponsor: KIND_META[kind].needsSponsor ? sponsor : null,
        startAt: start ? new Date(start).getTime() : Number.NaN,
        durationMinutes: duration,
        problems,
        prize: prizeValue,
        access,
      },
      publish,
    );
    setIssues(result);
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={cx(styles.modal, styles.modalWide)} role="dialog" aria-modal="true" aria-labelledby="challenge-modal-title">
        <div className={styles.modalHead}>
          <h2 id="challenge-modal-title" className={styles.modalTitle}>
            {challenge ? `Edit ${challenge.title}` : 'New challenge'}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit(true)} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="ch-title" className={styles.label}>
                Title<span className={styles.required}> *</span>
              </label>
              <input id="ch-title" ref={titleRef} className={styles.control} value={title} maxLength={70} placeholder="e.g. Weekly Code Sprint #46" onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="ch-kind" className={styles.label}>
                Type
              </label>
              <select
                id="ch-kind"
                className={styles.control}
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as ChallengeKind;
                  setKind(next);
                  if (next === 'monthly' && duration < 1440) setDuration(20160);
                  if (next === 'weekly' && duration >= 1440) setDuration(120);
                }}
              >
                {Object.entries(KIND_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="ch-sponsor" className={styles.label}>
                Sponsor{KIND_META[kind].needsSponsor && <span className={styles.required}> *</span>}
              </label>
              <input id="ch-sponsor" className={styles.control} value={KIND_META[kind].needsSponsor ? sponsor : ''} disabled={!KIND_META[kind].needsSponsor} placeholder={KIND_META[kind].needsSponsor ? 'Company or institution' : 'Not needed for this type'} onChange={(event) => setSponsor(event.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="ch-start" className={styles.label}>
                Starts<span className={styles.required}> *</span>
              </label>
              <input id="ch-start" type="datetime-local" className={styles.control} value={start} onChange={(event) => setStart(event.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="ch-duration" className={styles.label}>
                Duration
              </label>
              <select id="ch-duration" className={styles.control} value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                {durationOptions.map((option) => (
                  <option key={option.minutes} value={option.minutes}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="ch-prize" className={styles.label}>
                Prize pool (₹)
              </label>
              <input id="ch-prize" inputMode="numeric" className={styles.control} value={prize} onChange={(event) => setPrize(event.target.value.replace(/[^\d]/g, ''))} />
              <p className={styles.hint}>Use 0 for hiring challenges that reward interviews</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="ch-access" className={styles.label}>
                Who can join
              </label>
              <select id="ch-access" className={styles.control} value={access} onChange={(event) => setAccess(event.target.value as ChallengeAccess)}>
                {Object.entries(ACCESS_META).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <span className={styles.label}>{`Problems · ${problems.length} of ${MAX_PROBLEMS}`}</span>
              {problems.length > 0 && (
                <ol className={styles.pickList}>
                  {problems.map((id, index) => {
                    const item = catalogMap.get(id);
                    return (
                      <li key={id} className={styles.pickItem}>
                        <span className={styles.pickIndex}>{String.fromCharCode(65 + index)}</span>
                        <span className={styles.pickBody}>
                          <strong>{item?.title ?? id}</strong>
                          {item && <span className={styles.hint}>{`${item.technology} · ${DIFFICULTY_META[item.difficulty].label}`}</span>}
                        </span>
                        <button type="button" className={styles.iconButton} aria-label={`Remove ${item?.title ?? id}`} onClick={() => setProblems((current) => current.filter((value) => value !== id))}>
                          <X width={15} height={15} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className={styles.searchRow}>
                <Search width={16} height={16} aria-hidden="true" />
                <input className={styles.searchInput} value={query} disabled={problems.length >= MAX_PROBLEMS} placeholder={problems.length >= MAX_PROBLEMS ? `At most ${MAX_PROBLEMS} problems` : 'Search problems and labs to add'} onChange={(event) => setQuery(event.target.value)} aria-label="Search problems to add" />
              </div>
              {query.trim() && (
                <ul className={styles.pickList}>
                  {results.length === 0 && <li className={styles.hint}>Nothing matches.</li>}
                  {results.map((item) => (
                    <li key={item.id} className={styles.pickItem}>
                      <span className={styles.pickBody}>
                        <strong>{item.title}</strong>
                        <span className={styles.hint}>{`${item.technology} · ${DIFFICULTY_META[item.difficulty].label} · ${item.id}`}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.addChip}
                        onClick={() => {
                          setProblems((current) => [...current, item.id]);
                          setQuery('');
                        }}
                      >
                        <Plus width={14} height={14} aria-hidden="true" />
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {issues.length > 0 && (
            <div className={styles.issueBox} role="alert">
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            {!scheduled && (
              <button type="button" className={styles.ghostButton} onClick={() => submit(false)()}>
                Save as draft
              </button>
            )}
            <button type="submit" className={styles.primaryButton}>
              {scheduled ? 'Save changes' : 'Save and schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
