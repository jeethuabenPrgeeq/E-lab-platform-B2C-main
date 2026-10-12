'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Lock, Plus, RotateCcw } from 'lucide-react';
import { useNotifications } from '../lib/api';
import { STATUS_META, audienceLabel, cx, rate } from '../lib/shared';
import type { Campaign, CampaignStatus } from '../lib/types';
import { ChannelIcons } from '../ui/ChannelIcons';
import { CampaignDrawer } from '../CampaignDrawer/CampaignDrawer';
import { ComposeModal } from '../ComposeModal/ComposeModal';
import styles from '../ui/notifications.module.css';

type View = 'campaigns' | 'automated';
type Filter = 'all' | CampaignStatus;

const DAY = 86_400_000;

function formatWhen(t: number) {
  return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function NotificationsPage() {
  const store = useNotifications();
  const { campaigns, automations, loaded, refresh, error, clearError } = store;
  const [view, setView] = useState<View>('campaigns');
  const [filter, setFilter] = useState<Filter>('all');
  const [now, setNow] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ campaign: Campaign | null; copy: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const [autoError, setAutoError] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const ready = loaded && now > 0;

  const stats = useMemo(() => {
    const recent = campaigns.filter((campaign) => campaign.status === 'sent' && campaign.sentAt && now - campaign.sentAt <= 30 * DAY);
    const delivered = recent.reduce((sum, campaign) => sum + campaign.delivered, 0);
    const opened = recent.reduce((sum, campaign) => sum + campaign.opened, 0);
    const clicked = recent.reduce((sum, campaign) => sum + campaign.clicked, 0);
    const next = campaigns.filter((campaign) => campaign.status === 'scheduled' && campaign.sendAt).sort((a, b) => (a.sendAt ?? 0) - (b.sendAt ?? 0))[0] ?? null;
    return {
      sent: recent.length,
      reach: recent.reduce((sum, campaign) => sum + campaign.recipients, 0),
      openRate: rate(opened, delivered),
      clickRate: rate(clicked, delivered),
      next,
      scheduled: campaigns.filter((campaign) => campaign.status === 'scheduled').length,
      automated: automations.filter((automation) => automation.enabled).reduce((sum, automation) => sum + automation.sent30, 0),
    };
  }, [campaigns, automations, now]);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = { all: campaigns.length, draft: 0, scheduled: 0, sent: 0, cancelled: 0 };
    for (const campaign of campaigns) map[campaign.status] += 1;
    return map;
  }, [campaigns]);

  const rows = useMemo(
    () =>
      campaigns
        .filter((campaign) => filter === 'all' || campaign.status === filter)
        .sort((a, b) => {
          const order: Record<CampaignStatus, number> = { scheduled: 0, draft: 1, sent: 2, cancelled: 3 };
          return order[a.status] - order[b.status] || (a.status === 'scheduled' ? (a.sendAt ?? 0) - (b.sendAt ?? 0) : (b.sentAt ?? b.createdAt) - (a.sentAt ?? a.createdAt));
        }),
    [campaigns, filter],
  );

  const open = openId ? campaigns.find((campaign) => campaign.id === openId) ?? null : null;
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Announcements to learners and the messages eLab sends automatically</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} disabled={!ready} onClick={() => setComposing({ campaign: null, copy: false })}>
            <Plus width={16} height={16} aria-hidden="true" />
            New announcement
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
          <span className={styles.statValue}>{ready ? stats.sent : '—'}</span>
          <span className={styles.statLabel}>Announcements, last 30 days</span>
          <span className={styles.statFoot}>{ready ? `Reached ${stats.reach.toLocaleString('en-IN')} people` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{ready ? `${stats.openRate}%` : '—'}</span>
          <span className={styles.statLabel}>Open rate</span>
          <span className={styles.statFoot}>{ready ? `${stats.clickRate}% clicked through` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? stats.scheduled : '—'}</span>
          <span className={styles.statLabel}>Scheduled</span>
          <span className={styles.statFoot}>{ready ? (stats.next?.sendAt ? `Next: ${formatWhen(stats.next.sendAt)}` : 'Nothing queued') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? stats.automated.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Automated messages, 30 days</span>
          <span className={styles.statFoot}>{ready ? `${automations.filter((automation) => automation.enabled).length} of ${automations.length} automations on` : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === 'campaigns'} className={cx(styles.segment, view === 'campaigns' && styles.segmentActive)} onClick={() => setView('campaigns')}>
              Announcements
              <span className={styles.segmentCount}>{campaigns.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={view === 'automated'} className={cx(styles.segment, view === 'automated' && styles.segmentActive)} onClick={() => setView('automated')}>
              Automated
              <span className={styles.segmentCount}>{automations.length}</span>
            </button>
          </div>
          {view === 'campaigns' && (
            <select className={cx(styles.select, styles.inlineSelect)} value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter by status">
              {(['all', 'scheduled', 'draft', 'sent', 'cancelled'] as Filter[]).map((value) => (
                <option key={value} value={value}>
                  {`${value === 'all' ? 'All statuses' : STATUS_META[value].label} (${counts[value]})`}
                </option>
              ))}
            </select>
          )}
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {!ready ? (
          <div className={styles.empty}>Loading…</div>
        ) : view === 'campaigns' ? (
          rows.length === 0 ? (
            <div className={styles.empty}>No announcements here.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.campaignTable)}>
                <thead>
                  <tr>
                    <th>Announcement</th>
                    <th>Audience</th>
                    <th>When</th>
                    <th className={styles.numHead}>Recipients</th>
                    <th>Opened</th>
                    <th>Status</th>
                    <th className={styles.actionsHead}>
                      <span className={styles.srOnly}>Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((campaign) => {
                    const st = STATUS_META[campaign.status];
                    const openRate = rate(campaign.opened, campaign.delivered);
                    return (
                      <tr key={campaign.id} className={cx(styles.clickRow, campaign.status === 'cancelled' && styles.rowDim)} onClick={() => setOpenId(campaign.id)}>
                        <td className={styles.contentCell}>
                          <span className={styles.nameLine}>
                            <button
                              type="button"
                              className={styles.rowLink}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenId(campaign.id);
                              }}
                            >
                              {campaign.name}
                            </button>
                            <ChannelIcons channels={campaign.channels} />
                          </span>
                          <span className={styles.meta}>{campaign.subject}</span>
                        </td>
                        <td className={styles.audienceCell}>{audienceLabel(campaign.audience)}</td>
                        <td className={styles.nowrap}>
                          {campaign.status === 'sent' && campaign.sentAt ? formatWhen(campaign.sentAt) : campaign.status === 'scheduled' && campaign.sendAt ? formatWhen(campaign.sendAt) : '—'}
                          <span className={styles.meta}>{campaign.status === 'sent' ? 'sent' : campaign.status === 'scheduled' ? 'goes out' : campaign.status === 'draft' ? 'not scheduled' : 'cancelled'}</span>
                        </td>
                        <td className={styles.numCell}>{campaign.recipients ? campaign.recipients.toLocaleString('en-IN') : '—'}</td>
                        <td className={styles.nowrap}>
                          {campaign.status === 'sent' ? (
                            <span className={styles.meterCell}>
                              <span className={styles.meter} aria-hidden="true">
                                <span className={styles.meterFill} style={{ width: `${Math.min(100, openRate)}%` }} />
                              </span>
                              {`${openRate}%`}
                            </span>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <span className={styles.iconButton} aria-hidden="true">
                              <ChevronRight width={16} height={16} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <ul className={styles.autoList}>
            {automations.map((automation) => (
              <li key={automation.id} className={cx(styles.autoItem, !automation.enabled && styles.autoOff)}>
                <div className={styles.autoMain}>
                  <span className={styles.nameLine}>
                    <strong>{automation.name}</strong>
                    <ChannelIcons channels={automation.channels} />
                    {automation.locked && (
                      <span className={styles.lockTag} title="Required for billing">
                        <Lock width={12} height={12} aria-hidden="true" />
                        Required
                      </span>
                    )}
                  </span>
                  <span className={styles.meta}>{automation.trigger}</span>
                  <span className={styles.autoPreview}>
                    <strong>{automation.subject}</strong>
                    {` — ${automation.body}`}
                  </span>
                  {autoError?.id === automation.id && (
                    <span className={styles.autoError} role="alert">
                      {autoError.text}
                    </span>
                  )}
                </div>
                <div className={styles.autoStats}>
                  <span>
                    <strong>{automation.sent30.toLocaleString('en-IN')}</strong>
                    sent in 30 days
                  </span>
                  <span>
                    <strong>{automation.enabled && automation.sent30 ? `${automation.openRate}%` : '—'}</strong>
                    opened
                  </span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={automation.enabled}
                    aria-label={`${automation.name} ${automation.enabled ? 'on' : 'off'}`}
                    onChange={async () => {
                      const result = await store.toggleAutomation(automation.id);
                      if (result) setAutoError({ id: automation.id, text: result });
                      else {
                        setAutoError(null);
                        setNotice(`${automation.name} turned ${automation.enabled ? 'off' : 'on'}`);
                      }
                    }}
                  />
                  <span className={styles.switchTrack} aria-hidden="true">
                    <span className={styles.switchThumb} />
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && ready && (
        <CampaignDrawer
          key={open.id}
          campaign={open}
          now={now}
          store={store}
          onEdit={() => setComposing({ campaign: open, copy: false })}
          onDuplicate={() => setComposing({ campaign: open, copy: true })}
          onNotice={(text) => {
            setNotice(text);
            setNow(Date.now());
          }}
          onClose={() => setOpenId(null)}
        />
      )}
      {composing && (
        <ComposeModal
          campaign={composing.campaign}
          copy={composing.copy}
          onCancel={() => setComposing(null)}
          onSubmit={async (input, mode) => {
            const id = await store.save(input, mode, composing.copy ? null : composing.campaign?.id ?? null);
            setComposing(null);
            if (!id) return;
            setView('campaigns');
            setFilter('all');
            setNow(Date.now());
            setNotice(mode === 'now' ? `“${input.name}” sent` : mode === 'schedule' ? `“${input.name}” scheduled` : `Saved “${input.name}” as a draft`);
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}
