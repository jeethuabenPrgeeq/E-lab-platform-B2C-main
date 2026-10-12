'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, Eye, EyeOff, Star, X } from 'lucide-react';
import type { LearningPath } from '../../paths/lib/types';
import type { CatalogStore } from '../lib/api';
import { DIFFICULTY_META, TIERS, TIER_META, TYPE_META, VISIBILITY_META, cx, formatAgo, formatCount, formatDate, formatMinutes, tierRank } from '../lib/shared';
import type { ContentItem } from '../lib/types';
import styles from './ContentDrawer.module.css';

interface ContentDrawerProps {
  item: ContentItem;
  store: CatalogStore;
  usedIn: LearningPath[];
  onClose: () => void;
}

type Pending = 'hidden' | 'retired' | null;

export function ContentDrawer({ item, store, usedIn, onClose }: ContentDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [now] = useState(() => Date.now());
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [featureError, setFeatureError] = useState('');

  const vis = VISIBILITY_META[item.visibility];
  const diff = DIFFICULTY_META[item.difficulty];
  const lockedPaths = usedIn.filter((path) => tierRank(path.tier) < tierRank(item.tier));

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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters — it is shown in the audit log');
      return;
    }
    store.setVisibility([item.id], pending, reason.trim());
    setPending(null);
    setReason('');
  };

  const facts: [string, string][] = [
    ['Learners', formatCount(item.learners)],
    ['Completion', `${item.completion}%`],
    ['Rating', item.ratings ? `${item.rating.toFixed(1)} from ${formatCount(item.ratings)} ratings` : 'No ratings yet'],
    ['Estimated time', formatMinutes(item.minutes)],
    ['Open reports', item.openReports ? String(item.openReports) : 'None'],
    ['Published', formatDate(item.publishedAt)],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="content-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${item.id} · ${TYPE_META[item.type].label} · ${item.technology}`}</span>
            <h2 id="content-title" className={styles.title}>
              {item.title}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${vis.tone}`])}>{vis.label}</span>
              <span className={cx(styles.badge, styles[`tone_${TIER_META[item.tier].tone}`])}>{TIER_META[item.tier].label}</span>
              <span className={cx(styles.badge, styles[`tone_${diff.tone}`])}>{diff.label}</span>
              {item.featured && <span className={cx(styles.badge, styles.tone_warning)}>Featured</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close content" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {item.visibility !== 'listed' && item.visibilityReason && (
          <div className={styles.suspendedBox}>
            <strong>{item.visibility === 'hidden' ? 'Hidden from the catalog' : 'Retired'}</strong>
            <span>{item.visibilityReason}</span>
          </div>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Who can open it</h3>
          <div className={styles.tierGroup} role="radiogroup" aria-label="Access tier">
            {TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={item.tier === tier}
                disabled={item.visibility === 'retired'}
                className={cx(styles.tierOption, item.tier === tier && styles.tierActive)}
                onClick={() => store.setTier([item.id], tier)}
              >
                {TIER_META[tier].label}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{TIER_META[item.tier].hint}</p>
          {lockedPaths.length > 0 && (
            <p className={styles.warnText}>{`Locked for some path learners: ${lockedPaths.map((path) => `${path.title} (${TIER_META[path.tier].label})`).join(', ')}`}</p>
          )}
        </section>

        <div className={styles.actionBar}>
          {item.visibility === 'listed' && (
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const result = await store.toggleFeatured(item.id);
                setFeatureError(result ?? '');
              }}
            >
              <Star width={16} height={16} aria-hidden="true" />
              {item.featured ? 'Unfeature' : 'Feature'}
            </button>
          )}
          {item.visibility === 'listed' && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                setPending('hidden');
                setError('');
                setFeatureError('');
              }}
            >
              <EyeOff width={16} height={16} aria-hidden="true" />
              Hide
            </button>
          )}
          {item.visibility !== 'listed' && (
            <button type="button" className={cx(styles.action, styles.actionSuccess)} onClick={() => store.setVisibility([item.id], 'listed', null)}>
              <Eye width={16} height={16} aria-hidden="true" />
              List again
            </button>
          )}
          {item.visibility !== 'retired' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionDanger)}
              onClick={() => {
                setPending('retired');
                setError('');
                setFeatureError('');
              }}
            >
              <Archive width={16} height={16} aria-hidden="true" />
              Retire
            </button>
          )}
        </div>
        {featureError && <p className={styles.errorText}>{featureError}</p>}

        {pending && (
          <form className={styles.closeForm} onSubmit={submit} noValidate>
            <h3 className={styles.sectionTitle}>{pending === 'hidden' ? 'Hide from the catalog' : 'Retire this item'}</h3>
            <p className={styles.hint}>{VISIBILITY_META[pending].hint}.</p>
            {usedIn.length > 0 && (
              <p className={styles.warnText}>{`Used in ${usedIn.length} learning path${usedIn.length === 1 ? '' : 's'}: ${usedIn.map((path) => path.title).join(', ')}. ${pending === 'retired' ? 'Those paths cannot be published again until the step is replaced.' : 'Path learners can still open it.'}`}</p>
            )}
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder={pending === 'hidden' ? 'e.g. Test cases are being fixed' : 'e.g. Replaced by a newer version'}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setPending(null)}>
                Cancel
              </button>
              <button type="submit" className={cx(styles.primaryButton, pending === 'retired' && styles.dangerButton)}>
                {pending === 'hidden' ? 'Hide' : 'Retire'}
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
          <h3 className={styles.sectionTitle}>Used in learning paths</h3>
          {usedIn.length ? (
            <ul className={styles.permList}>
              {usedIn.map((path) => (
                <li key={path.id}>{`${path.title} · ${TIER_META[path.tier].label}`}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>Not part of any learning path.</p>
          )}
          <p className={styles.hint}>The statement, tests and runtime are edited by platform admins under Problems.</p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {item.activity
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={/^(Hidden|Retired)/.test(entry.text) ? 'report' : /^(Listed|Featured|Published)/.test(entry.text) ? 'status' : 'reply'}>
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
