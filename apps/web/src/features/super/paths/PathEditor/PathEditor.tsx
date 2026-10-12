'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Search, Trash2, X } from 'lucide-react';
import { DIFFICULTY_META, TYPE_META, tierRank } from '../../content/lib/shared';
import type { ContentItem } from '../../content/lib/types';
import type { PathStore } from '../lib/api';
import { LEVEL_META, MAX_STEPS, STATUS_META, TIERS, TIER_META, cx, formatAgo, formatCount, formatMinutes, pathMinutes, publishIssues } from '../lib/shared';
import type { LearningPath, PathDraft, PathLevel } from '../lib/types';
import type { AccessTier } from '../../content/lib/types';
import styles from './PathEditor.module.css';

interface PathEditorProps {
  path: LearningPath;
  catalog: ContentItem[];
  store: PathStore;
  onNotice: (text: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}

const toDraft = (path: LearningPath): PathDraft => ({ title: path.title, summary: path.summary, level: path.level, tier: path.tier, certificate: path.certificate, steps: [...path.steps] });

export function PathEditor({ path, catalog, store, onNotice, onOpen, onClose }: PathEditorProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [now] = useState(() => Date.now());
  const [draft, setDraft] = useState<PathDraft>(() => toDraft(path));
  const [query, setQuery] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveNote, setArchiveNote] = useState('');

  const catalogMap = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(path));
  const live = path.status === 'published';
  const editable = path.status !== 'archived';

  const requestClose = useRef(() => {});
  requestClose.current = () => {
    if (dirty && editable) setConfirmClose(true);
    else onClose();
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  const set = <K extends keyof PathDraft>(key: K, value: PathDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setIssues([]);
  };

  const move = (index: number, delta: number) =>
    setDraft((current) => {
      const steps = [...current.steps];
      const target = index + delta;
      if (target < 0 || target >= steps.length) return current;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps };
    });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(draft.steps);
    return catalog
      .filter((item) => item.visibility !== 'retired' && !taken.has(item.id) && `${item.title} ${item.technology} ${item.id}`.toLowerCase().includes(q))
      .sort((a, b) => b.learners - a.learners)
      .slice(0, 8);
  }, [catalog, query, draft.steps]);

  const minutes = pathMinutes(draft.steps, catalogMap);
  const remaining = useMemo(() => publishIssues(draft, catalogMap).length, [draft, catalogMap]);

  const saveDraft = async () => {
    if (live) {
      const problems = await store.publish(path.id, draft);
      setIssues(problems);
      if (!problems.length) onNotice(`Saved changes to ${draft.title.trim()}`);
      return;
    }
    if (draft.title.trim().length < 3) {
      setIssues(['Give the path a title']);
      return;
    }
    const result = await store.save(path.id, draft);
    if (result.data) onNotice(`Saved ${draft.title.trim()} as a draft`);
    else setIssues(result.issues.length ? result.issues : [result.error ?? 'Could not save the draft']);
  };

  const publish = async () => {
    const problems = await store.publish(path.id, draft);
    setIssues(problems);
    if (!problems.length) onNotice(`${draft.title.trim()} is now live`);
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose.current();
      }}
    >
      <aside className={cx(styles.drawer, styles.wide)} role="dialog" aria-modal="true" aria-labelledby="path-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${path.id} · updated ${formatAgo(path.updatedAt, now)}`}</span>
            <h2 id="path-title" className={styles.title}>
              {path.title}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${STATUS_META[path.status].tone}`])}>{STATUS_META[path.status].label}</span>
              {path.enrolled > 0 && <span className={cx(styles.badge, styles.tone_neutral)}>{`${formatCount(path.enrolled)} enrolled · ${path.completion}% complete`}</span>}
              {dirty && editable && <span className={cx(styles.badge, styles.tone_warning)}>Unsaved changes</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close path" onClick={() => requestClose.current()}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {confirmClose && (
          <div className={styles.confirmBar} role="alert">
            <span>You have unsaved changes.</span>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmClose(false)}>
                Keep editing
              </button>
              <button type="button" className={cx(styles.primaryButton, styles.dangerButton)} onClick={onClose}>
                Discard
              </button>
            </div>
          </div>
        )}

        {live && path.enrolled > 0 && editable && <p className={styles.hint}>{`This path is live. Changes apply immediately to ${formatCount(path.enrolled)} enrolled learners; completed steps stay completed.`}</p>}

        <fieldset className={styles.fieldsetPlain} disabled={!editable}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.control} value={draft.title} maxLength={60} onChange={(event) => set('title', event.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Summary</span>
            <textarea className={cx(styles.control, styles.textarea)} value={draft.summary} maxLength={160} placeholder="What learners will be able to do by the end" onChange={(event) => set('summary', event.target.value)} />
          </label>
          <div className={styles.threeFields}>
            <label className={styles.field}>
              <span className={styles.label}>Level</span>
              <select className={styles.control} value={draft.level} onChange={(event) => set('level', event.target.value as PathLevel)}>
                {Object.entries(LEVEL_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Access</span>
              <select className={styles.control} value={draft.tier} onChange={(event) => set('tier', event.target.value as AccessTier)}>
                {TIERS.map((value) => (
                  <option key={value} value={value}>
                    {TIER_META[value].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={cx(styles.field, styles.checkField)}>
              <input type="checkbox" checked={draft.certificate} onChange={(event) => set('certificate', event.target.checked)} />
              <span>Award a certificate</span>
            </label>
          </div>
        </fieldset>

        <section className={styles.section}>
          <div className={styles.stepsHead}>
            <h3 className={styles.sectionTitle}>{`Steps · ${draft.steps.length}`}</h3>
            <span className={styles.meta}>{`About ${formatMinutes(minutes)} in total`}</span>
          </div>
          {draft.steps.length === 0 ? (
            <p className={styles.hint}>No steps yet. Search the catalog below to add the first one.</p>
          ) : (
            <ol className={styles.stepList}>
              {draft.steps.map((id, index) => {
                const item = catalogMap.get(id);
                const tooHigh = item ? tierRank(item.tier) > tierRank(draft.tier) : false;
                return (
                  <li key={id} className={cx(styles.stepItem, (!item || item.visibility === 'retired' || tooHigh) && styles.stepBad)}>
                    <span className={styles.stepIndex}>{index + 1}</span>
                    <span className={styles.stepBody}>
                      <span className={styles.stepTitle}>{item?.title ?? `Missing item ${id}`}</span>
                      {item && (
                        <span className={styles.meta}>
                          {`${TYPE_META[item.type].label} · ${item.technology} · ${DIFFICULTY_META[item.difficulty].label} · ${TIER_META[item.tier].label} · ${formatMinutes(item.minutes)}`}
                        </span>
                      )}
                      {item?.visibility === 'retired' && <span className={styles.stepWarn}>Retired — replace this step</span>}
                      {item?.visibility === 'hidden' && <span className={styles.stepNote}>Hidden from the catalog, still open to path learners</span>}
                      {tooHigh && item && <span className={styles.stepWarn}>{`Needs ${TIER_META[item.tier].label} — raise the path’s access or pick another item`}</span>}
                    </span>
                    {editable && (
                      <span className={styles.stepActions}>
                        <button type="button" className={styles.stepButton} aria-label={`Move ${item?.title ?? id} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                          <ArrowUp width={15} height={15} aria-hidden="true" />
                        </button>
                        <button type="button" className={styles.stepButton} aria-label={`Move ${item?.title ?? id} down`} disabled={index === draft.steps.length - 1} onClick={() => move(index, 1)}>
                          <ArrowDown width={15} height={15} aria-hidden="true" />
                        </button>
                        <button type="button" className={cx(styles.stepButton, styles.stepRemove)} aria-label={`Remove ${item?.title ?? id}`} onClick={() => set('steps', draft.steps.filter((step) => step !== id))}>
                          <Trash2 width={15} height={15} aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {editable && (
            <div className={styles.picker}>
              <div className={styles.pickerSearch}>
                <Search width={16} height={16} aria-hidden="true" />
                <input className={styles.pickerInput} value={query} placeholder={draft.steps.length >= MAX_STEPS ? `A path can have at most ${MAX_STEPS} steps` : 'Add a step — search by title, technology or ID'} disabled={draft.steps.length >= MAX_STEPS} onChange={(event) => setQuery(event.target.value)} aria-label="Search catalog to add a step" />
              </div>
              {query.trim() && (
                <ul className={styles.pickerList}>
                  {results.length === 0 && <li className={styles.hint}>Nothing matches — retired items and existing steps are left out.</li>}
                  {results.map((item) => (
                    <li key={item.id} className={styles.pickerItem}>
                      <span className={styles.stepBody}>
                        <span className={styles.stepTitle}>{item.title}</span>
                        <span className={styles.meta}>{`${TYPE_META[item.type].label} · ${item.technology} · ${DIFFICULTY_META[item.difficulty].label} · ${TIER_META[item.tier].label}`}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.addButton}
                        onClick={() => {
                          set('steps', [...draft.steps, item.id]);
                          setQuery('');
                        }}
                      >
                        <Plus width={15} height={15} aria-hidden="true" />
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {issues.length > 0 && (
          <div className={styles.issueBox} role="alert">
            <strong>{live ? 'Fix these before saving the live path' : 'Fix these before publishing'}</strong>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {archiving && (
          <div className={styles.closeForm}>
            <h3 className={styles.sectionTitle}>Archive this path</h3>
            <p className={styles.hint}>It disappears from the catalog. Enrolled learners keep their progress and certificates.</p>
            <label className={styles.field}>
              <span className={styles.label}>Note (optional)</span>
              <input className={styles.control} value={archiveNote} placeholder="e.g. Replaced by a newer path" onChange={(event) => setArchiveNote(event.target.value)} />
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setArchiving(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={cx(styles.primaryButton, styles.dangerButton)}
                onClick={() => {
                  store.setStatus(path.id, 'archived', archiveNote.trim() || undefined);
                  onNotice(`Archived ${path.title}`);
                  setArchiving(false);
                }}
              >
                Archive
              </button>
            </div>
          </div>
        )}

        <div className={styles.footerBar}>
          <div className={styles.footerLeft}>
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const id = await store.duplicate(path.id);
                if (id) {
                  onNotice(`Duplicated ${path.title}`);
                  onOpen(id);
                }
              }}
            >
              <Copy width={16} height={16} aria-hidden="true" />
              Duplicate
            </button>
            {path.status === 'draft' && path.enrolled === 0 && (
              <button
                type="button"
                className={cx(styles.action, styles.actionDanger)}
                onClick={() => {
                  store.remove(path.id);
                  onNotice(`Deleted the draft ${path.title}`);
                  onClose();
                }}
              >
                <Trash2 width={16} height={16} aria-hidden="true" />
                Delete draft
              </button>
            )}
            {live && !archiving && (
              <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => setArchiving(true)}>
                Archive
              </button>
            )}
          </div>
          <div className={styles.formActions}>
            {path.status === 'archived' ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  store.setStatus(path.id, 'draft');
                  onNotice(`${path.title} moved back to drafts`);
                }}
              >
                Restore as draft
              </button>
            ) : (
              <>
                <button type="button" className={styles.ghostButton} onClick={saveDraft} disabled={!dirty}>
                  {live ? 'Save changes' : 'Save draft'}
                </button>
                {!live && (
                  <button type="button" className={styles.primaryButton} onClick={publish}>
                    Publish
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {path.status === 'draft' && issues.length === 0 && remaining > 0 && <p className={styles.hint}>{`${remaining} thing${remaining === 1 ? '' : 's'} left before this can be published.`}</p>}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {path.activity
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={entry.text.startsWith('Archived') ? 'report' : entry.text.startsWith('Published') ? 'status' : 'reply'}>
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
