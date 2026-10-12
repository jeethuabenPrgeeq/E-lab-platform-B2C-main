'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { History, RotateCcw, Send, TriangleAlert } from 'lucide-react';
import { useSettings } from '../lib/api';
import {
  CODE_LANGUAGES,
  DATE_FORMATS,
  FIELDS,
  GST_RATES,
  MEMORY_LIMITS,
  MY_IP,
  RETRIES,
  SECTIONS,
  SECTION_LABEL,
  SESSION_TIMEOUTS,
  SOCIAL,
  TIMEZONES,
  TRIAL_PLANS,
  UI_LANGUAGES,
  WEEKDAYS,
  cx,
  diff,
  formatAgo,
  parseList,
  validate,
} from '../lib/shared';
import type { PlatformSettings, SectionKey, SettingKey } from '../lib/types';
import { ConfirmModal, type CriticalChange } from '../ConfirmModal/ConfirmModal';
import styles from '../ui/settings.module.css';

type ListKey = 'institutionDomains' | 'ipAllowlist';

export default function SettingsPage() {
  const { values, meta, loaded, save, refresh, error, clearError } = useSettings();
  const [now, setNow] = useState(0);
  const [section, setSection] = useState<SectionKey>('general');
  const [draft, setDraft] = useState<PlatformSettings>(values);
  const [lists, setLists] = useState<Record<ListKey, string>>({ institutionDomains: '', ipAllowlist: '' });
  const [attempted, setAttempted] = useState(false);
  const [confirming, setConfirming] = useState<CriticalChange[] | null>(null);
  const [notice, setNotice] = useState<ReactNode>(null);

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!loaded) return;
    setDraft(values);
    setLists({ institutionDomains: values.institutionDomains.join('\n'), ipAllowlist: values.ipAllowlist.join('\n') });
  }, [loaded, values]);

  const changed = useMemo(() => (loaded ? diff(values, draft) : []), [loaded, values, draft]);
  const dirty = changed.length > 0;
  const allErrors = useMemo(() => validate(draft), [draft]);
  const errors = attempted ? allErrors : {};
  const errorCount = Object.keys(allErrors).length;

  const perSection = useMemo(() => {
    const map = { general: 0, signup: 0, security: 0, billing: 0, execution: 0, email: 0 } as Record<SectionKey, number>;
    for (const key of changed) map[FIELDS[key].section] += 1;
    return map;
  }, [changed]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends SettingKey>(key: K, value: PlatformSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const setList = (key: ListKey, raw: string) => {
    setLists((current) => ({ ...current, [key]: raw }));
    set(key, parseList(raw));
  };

  const toggleIn = (key: 'socialLogins' | 'languages', item: string, order: string[]) => {
    const current = draft[key];
    const next = current.includes(item) ? current.filter((value) => value !== item) : [...current, item];
    set(key, order.filter((value) => next.includes(value)));
  };

  const discard = () => {
    setDraft(values);
    setLists({ institutionDomains: values.institutionDomains.join('\n'), ipAllowlist: values.ipAllowlist.join('\n') });
    setAttempted(false);
  };

  const commit = async () => {
    const result = await save(draft);
    setConfirming(null);
    setAttempted(false);
    if (result.count > 0) {
      setNotice(
        <>
          {`Saved ${result.count} change${result.count === 1 ? '' : 's'} to ${result.sections.map((key) => SECTION_LABEL[key]).join(', ')}. `}
          <Link href="/activity-logs?category=settings" className={styles.noticeLink}>
            See it in Audit Logs
          </Link>
        </>,
      );
    }
  };

  const requestSave = () => {
    setAttempted(true);
    if (errorCount > 0) {
      const first = (Object.keys(allErrors) as SettingKey[])[0];
      setSection(FIELDS[first].section);
      return;
    }
    const critical = changed
      .filter((key) => FIELDS[key].critical?.(values[key], draft[key]))
      .map((key) => ({ label: FIELDS[key].label, before: FIELDS[key].show(values[key]), after: FIELDS[key].show(draft[key]) }));
    if (critical.length) setConfirming(critical);
    else void commit();
  };

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const ready = loaded && now > 0 && meta !== null;
  const lastAt = meta ? Math.max(...SECTIONS.map((item) => meta[item.key].at)) : 0;
  const lastSections = meta ? SECTIONS.filter((item) => meta[item.key].at === lastAt) : [];
  const lastBy = lastSections.length ? meta![lastSections[0].key].by : '';
  const current = SECTIONS.find((item) => item.key === section)!;
  const errorSections = new Set((Object.keys(errors) as SettingKey[]).map((key) => FIELDS[key].section));

  const err = (key: SettingKey) => (errors[key] ? <span className={styles.fieldError}>{errors[key]}</span> : null);
  const changedMark = (key: SettingKey) => changed.includes(key);

  const row = (key: SettingKey, hint: string, control: ReactNode, extra?: ReactNode) => (
    <div className={cx(styles.settingRow, changedMark(key) && styles.settingChanged)} key={key}>
      <div className={styles.settingText}>
        <label className={styles.settingLabel} htmlFor={`st-${key}`}>
          {FIELDS[key].label}
          {changedMark(key) && <span className={styles.changedTag}>Unsaved</span>}
        </label>
        <span className={styles.settingHint}>{hint}</span>
      </div>
      <div className={styles.settingControl}>
        {control}
        {err(key)}
        {extra}
      </div>
    </div>
  );

  const toggle = (key: SettingKey, onLabel: string, offLabel: string) => (
    <label className={styles.switchLine}>
      <span className={styles.switch}>
        <input id={`st-${key}`} type="checkbox" checked={Boolean(draft[key])} onChange={(event) => set(key, event.target.checked as never)} />
        <span className={styles.switchTrack}>
          <span className={styles.switchThumb} />
        </span>
      </span>
      <span className={styles.switchText}>{draft[key] ? onLabel : offLabel}</span>
    </label>
  );

  const textInput = (key: SettingKey, props: { placeholder?: string; maxLength?: number; mono?: boolean; type?: string } = {}) => (
    <input
      id={`st-${key}`}
      type={props.type ?? 'text'}
      className={cx(styles.input, props.mono && styles.mono, errors[key] && styles.inputError)}
      value={String(draft[key])}
      placeholder={props.placeholder}
      maxLength={props.maxLength}
      onChange={(event) => set(key, event.target.value as never)}
      aria-invalid={errors[key] ? true : undefined}
    />
  );

  const numberInput = (key: SettingKey, suffix: string, min: number, max: number) => (
    <div className={styles.numberField}>
      <input
        id={`st-${key}`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className={cx(styles.input, styles.numberInput, errors[key] && styles.inputError)}
        value={Number.isNaN(draft[key] as number) ? '' : String(draft[key])}
        onChange={(event) => set(key, (event.target.value === '' ? Number.NaN : Number(event.target.value)) as never)}
        aria-invalid={errors[key] ? true : undefined}
      />
      <span className={styles.suffix}>{suffix}</span>
    </div>
  );

  const select = <T extends string | number>(key: SettingKey, options: readonly T[], label: (value: T) => string = (value) => String(value)) => (
    <select
      id={`st-${key}`}
      className={styles.select}
      value={String(draft[key])}
      onChange={(event) => {
        const raw = event.target.value;
        set(key, (typeof options[0] === 'number' ? Number(raw) : raw) as never);
      }}
    >
      {options.map((option) => (
        <option key={String(option)} value={String(option)}>
          {label(option)}
        </option>
      ))}
    </select>
  );

  const chips = (key: 'socialLogins' | 'languages', options: string[]) => (
    <div className={styles.chips} id={`st-${key}`} role="group" aria-label={FIELDS[key].label}>
      {options.map((option) => {
        const on = draft[key].includes(option);
        return (
          <button key={option} type="button" aria-pressed={on} className={cx(styles.chip, on && styles.chipOn)} onClick={() => toggleIn(key, option, options)}>
            {option}
          </button>
        );
      })}
    </div>
  );

  const listInput = (key: ListKey, placeholder: string) => (
    <textarea
      id={`st-${key}`}
      rows={4}
      className={cx(styles.textarea, styles.listArea, styles.mono, errors[key] && styles.inputError)}
      value={lists[key]}
      placeholder={placeholder}
      onChange={(event) => setList(key, event.target.value)}
      aria-invalid={errors[key] ? true : undefined}
    />
  );

  const body: Record<SectionKey, ReactNode> = {
    general: (
      <>
        {row('platformName', 'Shown in the header, emails and certificates.', textInput('platformName', { maxLength: 40 }))}
        {row('supportEmail', 'Where learners and institutions write for help.', textInput('supportEmail', { type: 'email' }))}
        {row('timezone', 'Used for contest times, reports and scheduled emails.', select('timezone', TIMEZONES))}
        {row('language', 'New accounts start in this language. People can change their own.', select('language', UI_LANGUAGES))}
        {row('dateFormat', 'How dates appear to learners.', select('dateFormat', DATE_FORMATS))}
        {row(
          'maintenance',
          'Learners see the message below and can’t start or submit problems. Admins can still sign in.',
          toggle('maintenance', 'On — learners are locked out', 'Off — eLab is live'),
          draft.maintenance && (
            <p className={styles.warnBox}>
              <TriangleAlert width={16} height={16} aria-hidden="true" />
              Contests in progress will be paused, and their timers won’t stop.
            </p>
          ),
        )}
        {row(
          'maintenanceMessage',
          draft.maintenance ? 'Required while maintenance mode is on.' : 'Shown only while maintenance mode is on.',
          <textarea id="st-maintenanceMessage" rows={3} className={cx(styles.textarea, errors.maintenanceMessage && styles.inputError)} value={draft.maintenanceMessage} maxLength={200} onChange={(event) => set('maintenanceMessage', event.target.value)} />,
          <span className={styles.counter}>{`${draft.maintenanceMessage.trim().length} / 200`}</span>,
        )}
      </>
    ),
    signup: (
      <>
        {row('allowSignup', 'When off, people can join only through an invite or their institution.', toggle('allowSignup', 'Anyone can create an account', 'Invite only'))}
        {row('requireVerification', 'New learners confirm their email before they can submit code.', toggle('requireVerification', 'Required', 'Not required'))}
        {row('socialLogins', 'Sign-in buttons shown next to email and password.', chips('socialLogins', SOCIAL))}
        {row('trialDays', 'Free trial for new individual accounts. 0 turns trials off.', numberInput('trialDays', 'days', 0, 30))}
        {row('trialPlan', 'The plan a trial unlocks.', select('trialPlan', TRIAL_PLANS))}
        {row('institutionDomains', 'Learners signing up with these email domains join their institution automatically. One per line.', listInput('institutionDomains', 'nitc.ac.in'), <span className={styles.counter}>{`${draft.institutionDomains.length} domain${draft.institutionDomains.length === 1 ? '' : 's'}`}</span>)}
        {row('maxDevices', 'Signed-in devices a learner can use at once. Stops account sharing.', numberInput('maxDevices', 'devices', 1, 10))}
      </>
    ),
    security: (
      <>
        {row('adminMfa', 'Every admin must use an authenticator app to sign in.', toggle('adminMfa', 'Required for all admins', 'Optional'))}
        {row('passwordMin', 'Applies to new passwords for learners and admins.', numberInput('passwordMin', 'characters', 8, 64))}
        {row('passwordSymbols', 'New passwords need at least one number and one symbol.', toggle('passwordSymbols', 'Required', 'Not required'))}
        {row('sessionTimeout', 'Admins are signed out after this long without activity.', select('sessionTimeout', SESSION_TIMEOUTS, (value) => (value >= 60 ? `${value / 60} hour${value === 60 ? '' : 's'}` : `${value} minutes`)))}
        {row('lockoutAttempts', 'Failed sign-ins in a row before the account or IP is locked.', numberInput('lockoutAttempts', 'attempts', 3, 10))}
        {row('lockoutMinutes', 'How long a lock lasts.', numberInput('lockoutMinutes', 'minutes', 5, 120))}
        {row(
          'ipAllowlist',
          'Admins can sign in only from these addresses or ranges. Leave empty to allow any IP. One per line.',
          listInput('ipAllowlist', '103.88.226.0/24'),
          <span className={styles.counter}>{`Your IP right now: ${MY_IP}`}</span>,
        )}
      </>
    ),
    billing: (
      <>
        <div className={styles.settingRow}>
          <div className={styles.settingText}>
            <span className={styles.settingLabel}>Currency</span>
            <span className={styles.settingHint}>Set when eLab launched. Changing it needs a new payment gateway account.</span>
          </div>
          <div className={styles.settingControl}>
            <span className={styles.staticValue}>Indian rupee (₹ INR)</span>
          </div>
        </div>
        {row('gstRate', 'Applied to every invoice. Online education services are usually 18%.', select('gstRate', GST_RATES, (value) => `${value}%`))}
        {row('gstin', 'Printed on invoices so institutions can claim input credit.', textInput('gstin', { mono: true, maxLength: 15 }))}
        {row('invoicePrefix', `Invoices are numbered like ${draft.invoicePrefix || 'ELB-'}2026-00421.`, textInput('invoicePrefix', { mono: true, maxLength: 8 }))}
        {row('pricesInclTax', 'When on, the price on the plans page already includes GST.', toggle('pricesInclTax', 'Prices include GST', 'GST added at checkout'))}
        {row('graceDays', 'After a failed renewal, how long learners keep their plan before moving to Free.', numberInput('graceDays', 'days', 0, 30))}
        {row('retryAttempts', 'How many times a failed renewal is retried during the grace period.', select('retryAttempts', RETRIES, (value) => `${value} ${value === 1 ? 'retry' : 'retries'}`))}
        {row('refundWindowDays', 'Support can refund in full within this many days of a payment.', numberInput('refundWindowDays', 'days', 0, 30))}
      </>
    ),
    execution: (
      <>
        {row('languages', 'Learners can submit in these languages. Turning one off keeps old submissions.', chips('languages', CODE_LANGUAGES), <span className={styles.counter}>{`${draft.languages.length} of ${CODE_LANGUAGES.length} on`}</span>)}
        {row('timeLimit', 'Used when a problem doesn’t set its own. Platform admins can override per problem.', numberInput('timeLimit', 'seconds', 1, 10))}
        {row('memoryLimit', 'Used when a problem doesn’t set its own.', select('memoryLimit', MEMORY_LIMITS, (value) => (value >= 1024 ? '1 GB' : `${value} MB`)))}
        {row('submissionsPerMinute', 'Per learner. Stops scripts from flooding the judges.', numberInput('submissionsPerMinute', 'per minute', 1, 60))}
        {row('plagiarismCheck', 'Compares contest submissions and flags close matches for review.', toggle('plagiarismCheck', 'On', 'Off'))}
        {row('revealHiddenTests', 'After a contest ends, learners can see the hidden test cases they failed.', toggle('revealHiddenTests', 'Shown after the contest', 'Kept hidden'))}
      </>
    ),
    email: (
      <>
        {row('senderName', 'Shown as the “From” name.', textInput('senderName', { maxLength: 40 }))}
        {row('senderEmail', 'Must be on the elab.com domain.', textInput('senderEmail', { type: 'email' }))}
        {row('replyTo', 'Where replies to eLab emails go.', textInput('replyTo', { type: 'email' }))}
        {row('emailFooter', 'Added to the bottom of every email.', <textarea id="st-emailFooter" rows={3} className={cx(styles.textarea, errors.emailFooter && styles.inputError)} value={draft.emailFooter} onChange={(event) => set('emailFooter', event.target.value)} />, <span className={styles.counter}>{`${draft.emailFooter.trim().length} / 200`}</span>)}
        {row('digestDay', 'Day the weekly progress digest goes out, at 9 am.', select('digestDay', WEEKDAYS))}
        <div className={styles.settingRow}>
          <div className={styles.settingText}>
            <span className={styles.settingLabel}>Test email</span>
            <span className={styles.settingHint}>Sends a sample with the saved sender details to your address.</span>
          </div>
          <div className={styles.settingControl}>
            <button type="button" className={cx(styles.ghostButton, styles.fitButton)} onClick={() => setNotice(`Test email sent to superadmin@elab.com from ${values.senderName} <${values.senderEmail}>.`)}>
              <Send width={16} height={16} aria-hidden="true" />
              Send test email
            </button>
            {perSection.email > 0 && <span className={styles.counter}>Save first to test your unsaved changes.</span>}
          </div>
        </div>
      </>
    ),
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform Settings</h1>
          <p className={styles.subtitle}>Defaults that apply across eLab for every learner and institution</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => {
              void refresh();
              setAttempted(false);
              setNotice(null);
            }}
          >
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <Link href="/activity-logs?category=settings" className={styles.ghostButton}>
            <History width={16} height={16} aria-hidden="true" />
            Change history
          </Link>
        </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.errorDismiss} onClick={clearError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, values.maintenance ? styles.statWarn : styles.statSuccess)}>{ready ? (values.maintenance ? 'Maintenance' : 'Live') : '—'}</span>
          <span className={styles.statLabel}>Platform status</span>
          <span className={cx(styles.statFoot, styles.clampOne)}>{ready ? (values.maintenance ? values.maintenanceMessage : 'Learners can sign in and submit') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? (values.allowSignup ? 'Open' : 'Invite only') : '—'}</span>
          <span className={styles.statLabel}>Sign-ups</span>
          <span className={styles.statFoot}>{ready ? `${values.trialDays ? `${values.trialDays}-day trial` : 'No trial'} · email check ${values.requireVerification ? 'on' : 'off'}` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, !values.adminMfa && styles.statDanger)}>{ready ? (values.adminMfa ? '2FA on' : '2FA off') : '—'}</span>
          <span className={styles.statLabel}>Admin sign-in</span>
          <span className={styles.statFoot}>{ready ? `${values.sessionTimeout}-min timeout · lock after ${values.lockoutAttempts} tries` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? (lastAt ? formatAgo(lastAt, now) : 'Never') : '—'}</span>
          <span className={styles.statLabel}>Last change</span>
          <span className={cx(styles.statFoot, styles.clampOne)}>{ready ? (lastAt ? `${lastSections.map((item) => item.label).join(', ')} · by ${lastBy}` : 'All sections use platform defaults') : ' '}</span>
        </div>
      </section>

      {dirty && (
        <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
          <span>
            <strong>{`${changed.length} unsaved change${changed.length === 1 ? '' : 's'}`}</strong>
            <span className={cx(styles.meta, attempted && errorCount > 0 && styles.text_danger)}>
              {attempted && errorCount > 0 ? `Fix ${errorCount} field${errorCount === 1 ? '' : 's'} before saving` : SECTIONS.filter((item) => perSection[item.key] > 0).map((item) => item.label).join(', ')}
            </span>
          </span>
          <div className={styles.saveActions}>
            <button type="button" className={styles.ghostButton} onClick={discard}>
              Discard
            </button>
            <button type="button" className={styles.primaryButton} onClick={requestSave}>
              Save changes
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Settings sections">
            {SECTIONS.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={section === item.key} className={cx(styles.segment, section === item.key && styles.segmentActive)} onClick={() => setSection(item.key)}>
                {item.label}
                {errorSections.has(item.key) ? <span className={cx(styles.segmentCount, styles.countError)}>!</span> : perSection[item.key] > 0 && <span className={cx(styles.segmentCount, styles.countDirty)}>{perSection[item.key]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.cardTitle}>{current.label}</h2>
            <p className={styles.sectionDesc}>{current.description}</p>
          </div>
          {ready && meta && <span className={styles.lastChanged}>{meta[section].at ? `Last changed ${formatAgo(meta[section].at, now)} by ${meta[section].by}` : 'Using platform defaults'}</span>}
        </div>

        {!ready ? <div className={styles.empty}>Loading…</div> : <div className={styles.settingList}>{body[section]}</div>}
      </div>

      {confirming && <ConfirmModal changes={confirming} onCancel={() => setConfirming(null)} onConfirm={commit} />}
    </div>
  );
}
