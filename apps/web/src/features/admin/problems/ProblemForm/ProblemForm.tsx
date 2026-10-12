'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTechnologies } from '../../technologies/lib/api';
import { rememberProblem } from '../../test-cases/api';
import { createProblem, fetchVersions, validateProblem } from '../lib/api';
import { ACTION_LABEL, DIFFICULTIES, STATUS_LABEL, capitalize, cx, formatDate } from '../lib/shared';
import type { NextAction, ProblemAction, ProblemDetail, ProblemInput, ProblemVersion } from '../lib/types';
import styles from './ProblemForm.module.css';

type Result = { ok: true } | { ok: false; error: string; issues: string[] };

interface Props {
  problem?: ProblemDetail;
  onUpdate?: (patch: Partial<ProblemInput>, reason?: string, expectedUpdatedAt?: string) => Promise<Result>;
  onTransition?: (action: ProblemAction, note?: string) => Promise<Result>;
  basePath?: string;
  apiBase?: string;
  technologiesPath?: string;
  readOnly?: boolean;
  guardConcurrency?: boolean;
  showTestLinks?: boolean;
  backLabel?: string;
}

const EMPTY: ProblemInput = {
  title: '',
  technologyId: '',
  difficulty: 'easy',
  shortDescription: '',
  problemStatement: '',
  inputFormat: '',
  outputFormat: '',
  constraints: '',
  skills: [],
  estimatedMinutes: 15,
};

function toInput(problem: ProblemDetail): ProblemInput {
  return {
    title: problem.title,
    technologyId: problem.technology.id,
    difficulty: problem.difficulty,
    shortDescription: problem.shortDescription,
    problemStatement: problem.problemStatement,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    constraints: problem.constraints,
    skills: problem.skills,
    estimatedMinutes: problem.estimatedMinutes,
  };
}

function changedFields(before: ProblemInput, after: ProblemInput): Partial<ProblemInput> {
  const patch: Partial<ProblemInput> = {};
  for (const key of Object.keys(after) as (keyof ProblemInput)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) (patch as Record<string, unknown>)[key] = after[key];
  }
  return patch;
}

export default function ProblemForm({ problem, onUpdate, onTransition, basePath = '/problems', apiBase, technologiesPath, readOnly = false, guardConcurrency = false, showTestLinks = true, backLabel = 'Back to all problems' }: Props) {
  const router = useRouter();
  const { items: technologies } = useTechnologies(technologiesPath);
  const [form, setForm] = useState<ProblemInput>(problem ? toInput(problem) : EMPTY);
  const [skillDraft, setSkillDraft] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [versions, setVersions] = useState<ProblemVersion[] | null>(null);

  const locked = problem?.status === 'deprecated' || readOnly;
  const versioned = problem?.status === 'published';
  const editable = !locked;
  const options = technologies.filter((t) => t.status !== 'disabled' || t.id === form.technologyId);

  function set<K extends keyof ProblemInput>(key: K, value: ProblemInput[K]) {
    setSaved('');
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addSkill() {
    const value = skillDraft.trim().toLowerCase();
    if (!value || form.skills.includes(value)) {
      setSkillDraft('');
      return;
    }
    set('skills', [...form.skills, value]);
    setSkillDraft('');
  }

  async function save(strict: boolean) {
    const problems = strict ? validateProblem(form) : form.title.trim().length < 3 ? ['Title must be at least 3 characters.'] : !form.technologyId ? ['Technology is required.'] : [];
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    if (!problem) {
      setSaving(true);
      const result = await createProblem(form, apiBase);
      setSaving(false);
      if (!result.ok) {
        setErrors(result.issues.length ? result.issues : [result.error]);
        return;
      }
      router.push(`${basePath}/${result.id}`);
      return;
    }

    const patch = changedFields(toInput(problem), form);
    if (Object.keys(patch).length === 0) {
      setErrors([]);
      setSaved('Nothing to save.');
      return;
    }
    if (versioned && reason.trim().length < 5) {
      setErrors(['This problem is live. Give a reason of at least 5 characters for the change.']);
      return;
    }

    setSaving(true);
    const result = await onUpdate?.(patch, versioned ? reason.trim() : undefined, guardConcurrency ? problem.updatedAt : undefined);
    setSaving(false);
    if (result && !result.ok) {
      setErrors(result.issues.length ? result.issues : [result.error]);
      return;
    }
    setErrors([]);
    setReason('');
    setVersions(null);
    setSaved(versioned ? 'Saved as a new version.' : 'Saved.');
  }

  async function act(next: NextAction) {
    if (next.needsNote && note.trim().length < 5) {
      setErrors(['Add a note of at least 5 characters explaining why.']);
      return;
    }
    setSaving(true);
    const result = await onTransition?.(next.action, next.needsNote ? note.trim() : undefined);
    setSaving(false);
    if (result && !result.ok) {
      setErrors(result.issues.length ? result.issues : [result.error]);
      return;
    }
    setErrors([]);
    setNote('');
    setVersions(null);
    setSaved(`${next.label}.`);
  }

  async function showHistory() {
    if (!problem) return;
    try {
      setVersions(await fetchVersions(problem.id, apiBase));
    } catch {
      setErrors(['Could not load the version history.']);
    }
  }

  const noteNeeded = problem?.nextActions.some((next) => next.needsNote) ?? false;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{problem ? problem.title : 'Create problem'}</h1>
          <p className={styles.subtitle}>
            {problem
              ? readOnly
                ? `${STATUS_LABEL[problem.status]} · v${problem.version}. Only drafts can be edited here.`
                : locked
                ? 'This problem is deprecated and can no longer be edited.'
                : versioned
                  ? `${STATUS_LABEL[problem.status]} · v${problem.version}. Changes create a new version and need a reason.`
                  : `${STATUS_LABEL[problem.status]}. Changes stay in the current stage.`
              : 'New problems start in Draft.'}
          </p>
        </div>
        <Link href={basePath} className={cx(styles.button, styles.buttonGhost)}>
          {backLabel}
        </Link>
      </div>

      {problem?.status === 'draft' && problem.reviewNote && (
        <div className={cx(styles.notice, styles.noteInfo)}>Sent back by reviewer: {problem.reviewNote}</div>
      )}

      {errors.length > 0 && (
        <div className={styles.notice} role="alert">
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {saved && (
        <div className={cx(styles.notice, styles.noteInfo)} role="status">
          {saved}
        </div>
      )}

      <fieldset className={styles.fieldset} disabled={!editable || saving}>
        <div className={cx(styles.card, styles.section)}>
          <h2 className={styles.sectionTitle}>Basics</h2>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="pf-title">
                Title
              </label>
              <input id="pf-title" className={styles.input} value={form.title} onChange={(e) => set('title', e.target.value)} />
              {problem && <span className={styles.hint}>{`Slug: ${problem.slug} (does not change)`}</span>}
            </div>
            <div className={cx(styles.field, styles.span4)}>
              <label className={styles.label} htmlFor="pf-tech">
                Technology
              </label>
              <select id="pf-tech" className={styles.select} value={form.technologyId} onChange={(e) => set('technologyId', e.target.value)}>
                <option value="">Select</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.status === 'active' ? t.name : `${t.name} (${t.status})`}
                  </option>
                ))}
              </select>
            </div>
            <div className={cx(styles.field, styles.span4)}>
              <label className={styles.label} htmlFor="pf-diff">
                Difficulty
              </label>
              <select
                id="pf-diff"
                className={styles.select}
                value={form.difficulty}
                onChange={(e) => set('difficulty', e.target.value as ProblemInput['difficulty'])}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {capitalize(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className={cx(styles.field, styles.span4)}>
              <label className={styles.label} htmlFor="pf-min">
                Estimated minutes
              </label>
              <input
                id="pf-min"
                type="number"
                min={1}
                max={600}
                className={styles.input}
                value={Number.isFinite(form.estimatedMinutes) ? form.estimatedMinutes : ''}
                onChange={(e) => set('estimatedMinutes', e.target.value === '' ? NaN : Number(e.target.value))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="pf-short">
                Short description
              </label>
              <input
                id="pf-short"
                className={styles.input}
                value={form.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Skills</span>
              <div className={styles.chips}>
                {form.skills.map((s) => (
                  <span key={s} className={styles.chip}>
                    {s}
                    {editable && (
                      <button
                        type="button"
                        className={styles.chipRemove}
                        aria-label={`Remove ${s}`}
                        onClick={() => set('skills', form.skills.filter((x) => x !== s))}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className={styles.testsRow}>
                <input
                  className={styles.input}
                  style={{ maxWidth: 260 }}
                  placeholder="Add a skill and press Enter"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <button type="button" className={cx(styles.button, styles.buttonGhost, styles.buttonSm)} onClick={addSkill}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={cx(styles.card, styles.section)}>
          <h2 className={styles.sectionTitle}>Statement</h2>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="pf-statement">
                Problem statement
              </label>
              <textarea
                id="pf-statement"
                className={styles.textarea}
                style={{ minHeight: 180 }}
                value={form.problemStatement}
                onChange={(e) => set('problemStatement', e.target.value)}
              />
            </div>
            <div className={cx(styles.field, styles.span6)}>
              <label className={styles.label} htmlFor="pf-input">
                Input format
              </label>
              <textarea id="pf-input" className={styles.textarea} value={form.inputFormat} onChange={(e) => set('inputFormat', e.target.value)} />
            </div>
            <div className={cx(styles.field, styles.span6)}>
              <label className={styles.label} htmlFor="pf-output">
                Output format
              </label>
              <textarea
                id="pf-output"
                className={styles.textarea}
                value={form.outputFormat}
                onChange={(e) => set('outputFormat', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="pf-constraints">
                Constraints
              </label>
              <textarea
                id="pf-constraints"
                className={styles.textarea}
                value={form.constraints}
                onChange={(e) => set('constraints', e.target.value)}
              />
              <span className={styles.hint}>One constraint per line.</span>
            </div>
          </div>
        </div>
      </fieldset>

      {problem && (
        <div className={cx(styles.card, styles.section)}>
          <h2 className={styles.sectionTitle}>Test cases</h2>
          <div className={styles.testsRow}>
            <span>{`${problem.sampleTests} sample · ${problem.hiddenTests} hidden (enabled)`}</span>
            {showTestLinks && (
              <>
                <Link href="/test-cases/sample" className={styles.link} onClick={() => rememberProblem(problem.id)}>
                  Manage sample tests
                </Link>
                <Link href="/test-cases/hidden" className={styles.link} onClick={() => rememberProblem(problem.id)}>
                  Manage hidden tests
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {problem && problem.nextActions.length > 0 && (
        <div className={cx(styles.card, styles.section)}>
          <h2 className={styles.sectionTitle}>Next step</h2>
          {noteNeeded && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="pf-note">
                Note (needed to send back or deprecate)
              </label>
              <textarea id="pf-note" className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <div className={styles.testsRow}>
            {problem.nextActions.map((next) => (
              <button
                key={next.action}
                type="button"
                className={cx(styles.button, ['sendBack', 'moveBack', 'unpublish', 'deprecate'].includes(next.action) && styles.buttonGhost)}
                disabled={saving || next.blockers.length > 0}
                onClick={() => act(next)}
              >
                {ACTION_LABEL[next.action]}
              </button>
            ))}
          </div>
          {problem.nextActions
            .filter((next) => next.blockers.length > 0)
            .map((next) => (
              <p key={next.action} className={styles.hint} style={{ marginTop: 12 }}>
                {`${ACTION_LABEL[next.action]} is blocked: ${next.blockers.join(' ')}`}
              </p>
            ))}
        </div>
      )}

      {problem && problem.versionCount > 0 && (
        <div className={cx(styles.card, styles.section)}>
          <h2 className={styles.sectionTitle}>Version history</h2>
          {versions === null ? (
            <button type="button" className={cx(styles.button, styles.buttonGhost, styles.buttonSm)} onClick={showHistory}>
              {`Show ${problem.versionCount} version${problem.versionCount === 1 ? '' : 's'}`}
            </button>
          ) : (
            <ul className={styles.historyList}>
              {versions.map((v) => (
                <li key={v.id}>
                  <strong>{`v${v.version}`}</strong>
                  {` · ${v.reason} · ${v.changedBy?.name ?? 'Unknown'} · ${formatDate(v.createdAt)}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editable && (
        <div className={styles.formFooter}>
          {versioned && (
            <input
              className={styles.input}
              style={{ maxWidth: 360 }}
              placeholder="Reason for this change (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label="Reason for this change"
            />
          )}
          {!problem && (
            <button type="button" className={cx(styles.button, styles.buttonGhost)} disabled={saving} onClick={() => save(false)}>
              Save as draft
            </button>
          )}
          <button type="button" className={styles.button} disabled={saving} onClick={() => save(Boolean(!problem))}>
            {saving ? 'Saving…' : problem ? 'Save changes' : 'Create problem'}
          </button>
        </div>
      )}
    </div>
  );
}
