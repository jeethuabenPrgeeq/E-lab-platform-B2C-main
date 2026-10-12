'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Download, FileSpreadsheet, Pause, Pencil, Play, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useCatalog } from '../../content/lib/api';
import { useCoupons } from '../../coupons/lib/api';
import { useRevenue } from '../../subscriptions/lib/api';
import { useUsers } from '../../users/lib/mock';
import { cx, formatAgo } from '../../users/lib/shared';
import { RANGE_LABEL, cadenceLabel, nextRun, scheduleRange, useReports, type ReportRun, type Schedule } from '../lib/api';
import { TEMPLATES, TEMPLATE_MAP, type ReportSources, type TemplateId } from '../lib/templates';
import { GenerateModal } from '../GenerateModal/GenerateModal';
import { ScheduleModal } from '../ScheduleModal/ScheduleModal';
import styles from '../ui/reports.module.css';

type Tab = 'templates' | 'scheduled' | 'history';

function formatStamp(t: number) {
  return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDay(t: number) {
  return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function ReportsPage() {
  const store = useReports();
  const { refresh, error, clearError } = store;
  const revenue = useRevenue();
  const catalog = useCatalog();
  const coupons = useCoupons();
  const users = useUsers();
  const [tab, setTab] = useState<Tab>('templates');
  const [now, setNow] = useState(0);
  const [generating, setGenerating] = useState<TemplateId | null>(null);
  const [scheduling, setScheduling] = useState<{ schedule: Schedule | null; templateId: TemplateId } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const sourcesReady = revenue.loaded && catalog.loaded && coupons.loaded && users.loaded;
  const ready = store.loaded && sourcesReady && now > 0;

  const sources = useMemo<ReportSources | null>(
    () => (sourcesReady ? { payments: revenue.payments, subscriptions: revenue.subscriptions, catalog: catalog.items, coupons: coupons.items, users: users.items } : null),
    [sourcesReady, revenue.payments, revenue.subscriptions, catalog.items, coupons.items, users.items],
  );

  const rowCounts = useMemo(() => new Map(store.runs.map((run) => [run.id, run.rows])), [store.runs]);

  const stats = useMemo(() => {
    const month = new Date(now || 0);
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const active = store.schedules.filter((schedule) => schedule.active);
    const upcoming = active.map((schedule) => ({ schedule, at: nextRun(schedule, now) })).sort((a, b) => a.at - b.at)[0] ?? null;
    return {
      active: active.length,
      paused: store.schedules.length - active.length,
      upcoming,
      month: store.runs.filter((run) => run.at >= month.getTime()).length,
      failed: store.runs.filter((run) => run.status === 'failed').length,
      recipients: new Set(active.flatMap((schedule) => schedule.recipients)).size,
    };
  }, [store.schedules, store.runs, now]);

  const download = (run: ReportRun) => void store.download(run);

  const runSchedule = async (schedule: Schedule) => {
    const run = await store.runSchedule(schedule.id);
    if (run) setNotice(`${TEMPLATE_MAP[schedule.templateId].name} generated for ${schedule.recipients.length} recipient${schedule.recipients.length === 1 ? '' : 's'}`);
  };

  const history = store.runs.filter((run) => !historyFilter || run.templateId === historyFilter);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Download CSV exports, or have them emailed on a schedule</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} disabled={!ready} onClick={() => setScheduling({ schedule: null, templateId: 'revenue' })}>
            <CalendarClock width={16} height={16} aria-hidden="true" />
            Schedule a report
          </button>
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
          <span className={styles.statValue}>{TEMPLATES.length}</span>
          <span className={styles.statLabel}>Report templates</span>
          <span className={styles.statFoot}>Revenue, learners and content</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{ready ? stats.active : '—'}</span>
          <span className={styles.statLabel}>Active schedules</span>
          <span className={styles.statFoot}>{ready ? (stats.upcoming ? `Next: ${TEMPLATE_MAP[stats.upcoming.schedule.templateId].name}, ${formatStamp(stats.upcoming.at)}` : 'Nothing scheduled') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? stats.month : '—'}</span>
          <span className={styles.statLabel}>Generated this month</span>
          <span className={styles.statFoot}>{ready ? (stats.failed ? `${stats.failed} failed to send` : 'All delivered') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? stats.recipients : '—'}</span>
          <span className={styles.statLabel}>People receiving reports</span>
          <span className={styles.statFoot}>{ready ? `${stats.paused} schedule${stats.paused === 1 ? '' : 's'} paused` : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Reports view">
            {(
              [
                ['templates', 'Templates', TEMPLATES.length],
                ['scheduled', 'Scheduled', store.schedules.length],
                ['history', 'History', store.runs.length],
              ] as [Tab, string, number][]
            ).map(([value, label, count]) => (
              <button key={value} type="button" role="tab" aria-selected={tab === value} className={cx(styles.segment, tab === value && styles.segmentActive)} onClick={() => setTab(value)}>
                {label}
                <span className={styles.segmentCount}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {!ready ? (
          <div className={styles.empty}>Loading…</div>
        ) : tab === 'templates' ? (
          <div className={styles.templateGrid}>
            {TEMPLATES.map((template) => (
              <article key={template.id} className={styles.templateCard}>
                <span className={styles.templateTop}>
                  <span className={styles.templateIcon} aria-hidden="true">
                    <FileSpreadsheet width={18} height={18} />
                  </span>
                  <span className={styles.groupTag}>{template.group}</span>
                </span>
                <h3 className={styles.templateName}>{template.name}</h3>
                <p className={styles.templateDesc}>{template.description}</p>
                <p className={styles.templateCols}>{template.columns.join(' · ')}</p>
                <span className={styles.templateMeta}>{template.snapshot ? 'Snapshot of today' : 'For a date range'}</span>
                <div className={styles.templateActions}>
                  <button type="button" className={styles.ghostButton} onClick={() => setScheduling({ schedule: null, templateId: template.id })}>
                    Schedule
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={() => setGenerating(template.id)}>
                    Generate
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : tab === 'scheduled' ? (
          store.schedules.length === 0 ? (
            <div className={styles.empty}>No scheduled reports yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.scheduleTable)}>
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>When</th>
                    <th>Recipients</th>
                    <th>Last run</th>
                    <th>Next run</th>
                    <th className={styles.actionsHead}>
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {store.schedules.map((schedule) => (
                    <tr key={schedule.id} className={cx(!schedule.active && styles.rowDim)}>
                      <td>
                        <span className={styles.primaryText}>{TEMPLATE_MAP[schedule.templateId].name}</span>
                        <span className={styles.meta}>{`${schedule.id} · by ${schedule.createdBy}`}</span>
                      </td>
                      <td className={styles.nowrap}>
                        {cadenceLabel(schedule)}
                        <span className={styles.meta}>{TEMPLATE_MAP[schedule.templateId].snapshot ? 'Snapshot' : RANGE_LABEL[scheduleRange(schedule.frequency)]}</span>
                      </td>
                      <td className={styles.recipientCell}>
                        <span className={styles.primaryText}>{schedule.recipients[0]}</span>
                        {schedule.recipients.length > 1 && <span className={styles.meta}>{`+${schedule.recipients.length - 1} more`}</span>}
                      </td>
                      <td className={styles.nowrap}>
                        {schedule.lastRunAt ? formatAgo(schedule.lastRunAt, now) : 'Never'}
                        {schedule.lastStatus && <span className={cx(styles.meta, schedule.lastStatus === 'failed' ? styles.text_danger : styles.text_success)}>{schedule.lastStatus === 'failed' ? 'Failed to send' : 'Delivered'}</span>}
                      </td>
                      <td className={styles.nowrap}>{schedule.active ? formatStamp(nextRun(schedule, now)) : <span className={cx(styles.badge, styles.tone_warning)}>Paused</span>}</td>
                      <td>
                        {confirmDelete === schedule.id ? (
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.bulkLink} onClick={() => setConfirmDelete(null)}>
                              Keep
                            </button>
                            <button
                              type="button"
                              className={cx(styles.bulkButton, styles.bulkDanger)}
                              onClick={async () => {
                                const done = await store.removeSchedule(schedule.id);
                                setConfirmDelete(null);
                                if (done) setNotice(`Deleted the ${TEMPLATE_MAP[schedule.templateId].name} schedule`);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.iconAction} aria-label={`Send ${TEMPLATE_MAP[schedule.templateId].name} now`} title="Send now" onClick={() => void runSchedule(schedule)}>
                              <Send width={15} height={15} aria-hidden="true" />
                            </button>
                            <button type="button" className={styles.iconAction} aria-label={`Edit ${TEMPLATE_MAP[schedule.templateId].name} schedule`} title="Edit" onClick={() => setScheduling({ schedule, templateId: schedule.templateId })}>
                              <Pencil width={15} height={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.iconAction}
                              aria-label={`${schedule.active ? 'Pause' : 'Resume'} ${TEMPLATE_MAP[schedule.templateId].name} schedule`}
                              title={schedule.active ? 'Pause' : 'Resume'}
                              onClick={async () => {
                                if (await store.setActive(schedule.id, !schedule.active)) setNotice(`${schedule.active ? 'Paused' : 'Resumed'} the ${TEMPLATE_MAP[schedule.templateId].name} schedule`);
                              }}
                            >
                              {schedule.active ? <Pause width={15} height={15} aria-hidden="true" /> : <Play width={15} height={15} aria-hidden="true" />}
                            </button>
                            <button type="button" className={cx(styles.iconAction, styles.iconDanger)} aria-label={`Delete ${TEMPLATE_MAP[schedule.templateId].name} schedule`} title="Delete" onClick={() => setConfirmDelete(schedule.id)}>
                              <Trash2 width={15} height={15} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <>
            <div className={cx(styles.toolbar, styles.toolbarTwo)}>
              <select className={styles.select} value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)} aria-label="Filter by report">
                <option value="">All reports</option>
                {TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            {history.length === 0 ? (
              <div className={styles.empty}>No reports generated yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={cx(styles.table, styles.historyTable)}>
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Covers</th>
                      <th>Requested by</th>
                      <th>Generated</th>
                      <th className={styles.numHead}>Rows</th>
                      <th>Status</th>
                      <th className={styles.actionsHead}>
                        <span className={styles.srOnly}>Download</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <span className={styles.primaryText}>{TEMPLATE_MAP[run.templateId].name}</span>
                          <span className={styles.meta}>{run.id}</span>
                        </td>
                        <td className={styles.nowrap}>
                          {run.range ? RANGE_LABEL[run.range] : 'Snapshot'}
                          <span className={styles.meta}>{run.range ? `${formatDay(run.from)} – ${formatDay(run.to)}` : `as of ${formatDay(run.at)}`}</span>
                        </td>
                        <td className={styles.requestCell}>
                          {run.requestedBy}
                          {run.note && <span className={cx(styles.meta, run.status === 'failed' && styles.text_danger)}>{run.note}</span>}
                        </td>
                        <td className={cx(styles.nowrap, styles.muted)}>{formatStamp(run.at)}</td>
                        <td className={styles.numCell}>{run.status === 'generating' ? '…' : (rowCounts.get(run.id) ?? 0).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${run.status === 'ready' ? 'success' : run.status === 'failed' ? 'danger' : 'primary'}`])}>{run.status === 'ready' ? 'Ready' : run.status === 'failed' ? 'Not sent' : 'Generating'}</span>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.iconAction} disabled={run.status === 'generating'} aria-label={`Download ${TEMPLATE_MAP[run.templateId].name} ${run.id}`} title="Download CSV" onClick={() => download(run)}>
                              <Download width={15} height={15} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {generating && sources && (
        <GenerateModal
          template={TEMPLATE_MAP[generating]}
          sources={sources}
          onCancel={() => setGenerating(null)}
          onSubmit={async (range) => {
            const id = await store.generate(generating, range);
            setGenerating(null);
            if (!id) return;
            setTab('history');
            setHistoryFilter('');
            setNotice(`Generating ${TEMPLATE_MAP[generating].name} — ready in a moment`);
          }}
        />
      )}
      {scheduling && (
        <ScheduleModal
          schedule={scheduling.schedule}
          templateId={scheduling.templateId}
          onCancel={() => setScheduling(null)}
          onSubmit={async (input) => {
            const saved = await store.saveSchedule(input, scheduling.schedule?.id ?? null);
            setScheduling(null);
            if (!saved) return;
            setTab('scheduled');
            setNotice(scheduling.schedule ? 'Schedule updated' : `${TEMPLATE_MAP[input.templateId].name} scheduled — ${cadenceLabel(input).toLowerCase()}`);
          }}
        />
      )}
    </div>
  );
}
