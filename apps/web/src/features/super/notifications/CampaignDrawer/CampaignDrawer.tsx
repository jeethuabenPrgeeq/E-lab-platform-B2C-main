'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Ban, CopyPlus, Pencil, Send, Trash2, Undo2, X } from 'lucide-react';
import type { NotificationStore } from '../lib/api';
import { CHANNEL_META, STATUS_META, audienceLabel, audienceSize, cx, estimateRecipients, formatAgo, rate } from '../lib/shared';
import type { Campaign } from '../lib/types';
import { ChannelIcons } from '../ui/ChannelIcons';
import styles from './CampaignDrawer.module.css';

interface CampaignDrawerProps {
  campaign: Campaign;
  now: number;
  store: NotificationStore;
  onEdit: () => void;
  onDuplicate: () => void;
  onNotice: (text: string) => void;
  onClose: () => void;
}

function formatWhen(t: number) {
  return new Date(t).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function CampaignDrawer({ campaign, now, store, onEdit, onDuplicate, onNotice, onClose }: CampaignDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [confirmSend, setConfirmSend] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const st = STATUS_META[campaign.status];
  const estimate = estimateRecipients(campaign.audience, campaign.channels);
  const editable = campaign.status === 'draft' || campaign.status === 'scheduled';

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.querySelectorAll('[role="dialog"][aria-modal="true"]').length <= 1) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  const submitCancel = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters');
      return;
    }
    store.cancel(campaign.id, reason.trim());
    onNotice(`Cancelled “${campaign.name}”`);
    setCancelling(false);
  };

  const funnel = [
    { label: 'Sent to', value: campaign.recipients },
    { label: 'Delivered', value: campaign.delivered },
    { label: 'Opened', value: campaign.opened },
    { label: 'Clicked the link', value: campaign.clicked },
  ];

  const facts: [string, string][] = [
    ['Audience', `${audienceLabel(campaign.audience)} · ${audienceSize(campaign.audience).toLocaleString('en-IN')} people`],
    ['Channels', campaign.channels.map((channel) => CHANNEL_META[channel].label).join(', ')],
    [campaign.status === 'sent' ? 'Sent' : 'Goes out', campaign.sentAt ? formatWhen(campaign.sentAt) : campaign.sendAt ? formatWhen(campaign.sendAt) : 'Not scheduled'],
    ['Link', campaign.link || 'None'],
    ['Created by', campaign.createdBy],
    [campaign.status === 'sent' ? 'Recipients' : 'Will reach about', (campaign.status === 'sent' ? campaign.recipients : estimate).toLocaleString('en-IN')],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="campaign-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{campaign.id}</span>
            <h2 id="campaign-title" className={styles.title}>
              {campaign.name}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
              <ChannelIcons channels={campaign.channels} />
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close announcement" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actionBar}>
          {editable && (
            <button type="button" className={styles.action} onClick={onEdit}>
              <Pencil width={16} height={16} aria-hidden="true" />
              Edit
            </button>
          )}
          {editable && (
            <button type="button" className={cx(styles.action, styles.actionSuccess)} onClick={() => setConfirmSend(true)}>
              <Send width={16} height={16} aria-hidden="true" />
              Send now
            </button>
          )}
          {campaign.status === 'scheduled' && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                store.unschedule(campaign.id);
                onNotice(`“${campaign.name}” moved back to drafts`);
              }}
            >
              <Undo2 width={16} height={16} aria-hidden="true" />
              Move to draft
            </button>
          )}
          <button type="button" className={styles.action} onClick={onDuplicate}>
            <CopyPlus width={16} height={16} aria-hidden="true" />
            Duplicate
          </button>
          {campaign.status === 'scheduled' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionDanger)}
              onClick={() => {
                setCancelling(true);
                setError('');
              }}
            >
              <Ban width={16} height={16} aria-hidden="true" />
              Cancel
            </button>
          )}
          {campaign.status === 'draft' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionDanger)}
              onClick={() => {
                store.remove(campaign.id);
                onNotice(`Deleted the draft “${campaign.name}”`);
                onClose();
              }}
            >
              <Trash2 width={16} height={16} aria-hidden="true" />
              Delete draft
            </button>
          )}
        </div>

        {confirmSend && (
          <div className={styles.closeForm} role="alert">
            <h3 className={styles.sectionTitle}>Send this now?</h3>
            <p className={styles.hint}>{`It goes to about ${estimate.toLocaleString('en-IN')} people by ${campaign.channels.map((channel) => CHANNEL_META[channel].label.toLowerCase()).join(', ')}. Sent messages cannot be recalled.`}</p>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmSend(false)}>
                Not yet
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  store.sendNow(campaign.id);
                  onNotice(`“${campaign.name}” sent to ${estimate.toLocaleString('en-IN')} people`);
                  setConfirmSend(false);
                }}
              >
                Send now
              </button>
            </div>
          </div>
        )}

        {cancelling && (
          <form className={styles.closeForm} onSubmit={submitCancel} noValidate>
            <h3 className={styles.sectionTitle}>Cancel this announcement</h3>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Offer dates changed"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setCancelling(false)}>
                Keep it
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Cancel announcement
              </button>
            </div>
          </form>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>What people see</h3>
          <div className={styles.messagePreview}>
            <strong>{campaign.subject}</strong>
            <p>{campaign.body}</p>
            {campaign.link && <span className={styles.previewLink}>Open in eLab →</span>}
          </div>
        </section>

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {campaign.status === 'sent' && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Results</h3>
            <ul className={styles.resultList}>
              {funnel.map((step) => (
                <li key={step.label} className={styles.resultRow}>
                  <span className={styles.resultLabel}>{step.label}</span>
                  <span className={styles.resultTrack} aria-hidden="true">
                    <span className={styles.resultFill} style={{ width: `${campaign.recipients ? (step.value / campaign.recipients) * 100 : 0}%` }} />
                  </span>
                  <span className={styles.resultValue}>{`${step.value.toLocaleString('en-IN')} · ${rate(step.value, campaign.recipients)}%`}</span>
                </li>
              ))}
            </ul>
            {campaign.opened === 0 && now - (campaign.sentAt ?? now) < 3_600_000 && <p className={styles.hint}>Opens and clicks start coming in over the next few hours.</p>}
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {campaign.activity
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={entry.text.startsWith('Cancelled') ? 'report' : entry.text.startsWith('Sent') ? 'status' : 'reply'}>
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
