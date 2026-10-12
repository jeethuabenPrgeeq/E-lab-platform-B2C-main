'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { AUDIENCE_META, CHANNELS, CHANNEL_META, INSTITUTION_AUDIENCE, PLAN_AUDIENCE, cx, estimateRecipients, validateCampaign } from '../lib/shared';
import type { AudienceKind, Campaign, CampaignInput, Channel } from '../lib/types';
import styles from '../ui/modal.module.css';

interface ComposeModalProps {
  campaign: Campaign | null;
  copy: boolean;
  onCancel: () => void;
  onSubmit: (input: CampaignInput, mode: 'draft' | 'schedule' | 'now') => void;
}

function toLocalInput(t: number) {
  const date = new Date(t);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ComposeModal({ campaign, copy, onCancel, onSubmit }: ComposeModalProps) {
  const [now] = useState(() => Date.now());
  const [name, setName] = useState(campaign ? (copy ? `${campaign.name} (copy)` : campaign.name) : '');
  const [subject, setSubject] = useState(campaign?.subject ?? '');
  const [body, setBody] = useState(campaign?.body ?? '');
  const [link, setLink] = useState(campaign?.link ?? '');
  const [channels, setChannels] = useState<Channel[]>(campaign?.channels ?? ['in_app', 'email']);
  const [kind, setKind] = useState<AudienceKind>(campaign?.audience.kind ?? 'all');
  const [value, setValue] = useState<string | null>(campaign?.audience.value ?? null);
  const [timing, setTiming] = useState<'now' | 'later'>(campaign && !copy && campaign.status === 'scheduled' ? 'later' : 'now');
  const [sendAt, setSendAt] = useState(() => toLocalInput(campaign?.sendAt && !copy && campaign.sendAt > now ? campaign.sendAt : now + 24 * 3_600_000));
  const [errors, setErrors] = useState<Partial<Record<keyof CampaignInput, string>>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const input: CampaignInput = {
    name: name.trim(),
    subject: subject.trim(),
    body: body.trim(),
    link: link.trim(),
    channels,
    audience: { kind, value: AUDIENCE_META[kind].needsValue ? value : null },
    sendAt: timing === 'later' && sendAt ? new Date(sendAt).getTime() : null,
  };

  const limit = channels.length ? Math.min(...channels.map((channel) => CHANNEL_META[channel].limit)) : 2000;
  const estimate = estimateRecipients(input.audience, channels);

  const submit = (mode: 'draft' | 'schedule' | 'now') => (event?: FormEvent) => {
    event?.preventDefault();
    const found = validateCampaign(input, Date.now(), mode !== 'draft');
    if (mode === 'draft') {
      delete found.sendAt;
      delete found.body;
      delete found.subject;
      delete found.channels;
      delete found.audience;
    }
    if (mode === 'schedule' && !input.sendAt) found.sendAt = 'Pick a date and time';
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit(input, mode);
  };

  const clear = (key: keyof CampaignInput) => setErrors((current) => ({ ...current, [key]: undefined }));
  const field = (key: keyof CampaignInput) => (errors[key] ? <p className={styles.errorText}>{errors[key]}</p> : null);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={cx(styles.modal, styles.modalWide)} role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className={styles.modalHead}>
          <h2 id="compose-title" className={styles.modalTitle}>
            {campaign && !copy ? 'Edit announcement' : 'New announcement'}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit(timing === 'now' ? 'now' : 'schedule')} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="nt-name" className={styles.label}>
                Internal name<span className={styles.required}> *</span>
              </label>
              <input id="nt-name" ref={nameRef} className={cx(styles.control, errors.name && styles.controlError)} value={name} maxLength={60} placeholder="e.g. November long challenge launch" onChange={(event) => { setName(event.target.value); clear('name'); }} />
              {field('name')}
            </div>

            <fieldset className={cx(styles.fieldset, styles.wide)}>
              <legend className={styles.label}>Channels</legend>
              <div className={styles.chips}>
                {CHANNELS.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    aria-pressed={channels.includes(channel)}
                    className={cx(styles.chip, channels.includes(channel) && styles.chipOn)}
                    onClick={() => {
                      setChannels((current) => (current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]));
                      clear('channels');
                      clear('body');
                    }}
                  >
                    {CHANNEL_META[channel].label}
                  </button>
                ))}
              </div>
              {field('channels')}
            </fieldset>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="nt-subject" className={styles.label}>
                Heading<span className={styles.required}> *</span>
              </label>
              <input id="nt-subject" className={cx(styles.control, errors.subject && styles.controlError)} value={subject} maxLength={80} placeholder="Shown as the email subject and notification title" onChange={(event) => { setSubject(event.target.value); clear('subject'); }} />
              {field('subject')}
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="nt-body" className={styles.label}>
                Message<span className={styles.required}> *</span>
              </label>
              <textarea id="nt-body" rows={4} className={cx(styles.control, errors.body && styles.controlError)} value={body} onChange={(event) => { setBody(event.target.value); clear('body'); }} />
              <p className={errors.body ? styles.errorText : body.trim().length > limit ? styles.errorText : styles.hint}>{errors.body ?? `${body.trim().length} / ${limit} characters${channels.includes('push') ? ' · push messages are short' : ''}`}</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="nt-link" className={styles.label}>
                Link (optional)
              </label>
              <input id="nt-link" className={cx(styles.control, errors.link && styles.controlError)} value={link} placeholder="/learning-paths" onChange={(event) => { setLink(event.target.value); clear('link'); }} />
              {field('link')}
            </div>

            <div className={styles.field}>
              <label htmlFor="nt-audience" className={styles.label}>
                Send to
              </label>
              <select
                id="nt-audience"
                className={styles.control}
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as AudienceKind);
                  setValue(null);
                  clear('audience');
                }}
              >
                {Object.entries(AUDIENCE_META).map(([option, meta]) => (
                  <option key={option} value={option}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            {AUDIENCE_META[kind].needsValue && (
              <div className={cx(styles.field, styles.wide)}>
                <label htmlFor="nt-audience-value" className={styles.label}>
                  {kind === 'plan' ? 'Plan' : 'Institution'}
                </label>
                <select id="nt-audience-value" className={cx(styles.control, errors.audience && styles.controlError)} value={value ?? ''} onChange={(event) => { setValue(event.target.value || null); clear('audience'); }}>
                  <option value="">Choose…</option>
                  {kind === 'plan'
                    ? Object.entries(PLAN_AUDIENCE).map(([option, meta]) => (
                        <option key={option} value={option}>
                          {meta.label}
                        </option>
                      ))
                    : INSTITUTION_AUDIENCE.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                </select>
                {field('audience')}
              </div>
            )}

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>When</legend>
              <div className={styles.segmented}>
                {(['now', 'later'] as const).map((option) => (
                  <label key={option} className={cx(styles.segment, timing === option && styles.segmentActive)}>
                    <input type="radio" name="timing" checked={timing === option} onChange={() => { setTiming(option); clear('sendAt'); }} />
                    {option === 'now' ? 'Send now' : 'Schedule'}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={styles.field}>
              <label htmlFor="nt-when" className={styles.label}>
                Date and time (IST)
              </label>
              <input id="nt-when" type="datetime-local" className={cx(styles.control, errors.sendAt && styles.controlError)} value={timing === 'later' ? sendAt : ''} disabled={timing === 'now'} onChange={(event) => { setSendAt(event.target.value); clear('sendAt'); }} />
              {field('sendAt')}
            </div>
          </div>

          <div className={styles.previewBox}>
            <strong>{subject || 'Your heading'}</strong>
            <span>{body || 'Your message appears here.'}</span>
            <span>{`About ${estimate.toLocaleString('en-IN')} people will get this${channels.length ? ` by ${channels.map((channel) => CHANNEL_META[channel].label.toLowerCase()).join(', ')}` : ''}.`}</span>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className={styles.ghostButton} onClick={() => submit('draft')()}>
              Save as draft
            </button>
            <button type="submit" className={styles.primaryButton}>
              {timing === 'now' ? `Send to ${estimate.toLocaleString('en-IN')}` : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
