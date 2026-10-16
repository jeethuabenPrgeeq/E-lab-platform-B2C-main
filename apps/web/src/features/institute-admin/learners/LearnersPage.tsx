'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, FileUp, FolderPlus, RefreshCw, Search, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '@/components/admin/widgets/AdminWidgets';
import { formatDate } from '@/features/admin/problems/lib/shared';
import { usePermissions } from '@/features/admin/permissions/PermissionsProvider';
import { useInstitutionLabel } from '../lib/useInstitutionLabel';
import styles from '../ui/institute.module.css';
import { credentialsCsv, learnerApi, parseLearnerRows, useLearners, type Credential, type ImportResult } from './api';

const MAX_ROWS = 100;

export default function LearnersPage() {
  const institution = useInstitutionLabel();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'revoked'>('');
  const { items, groups, counts, loaded, error, refresh } = useLearners(q.trim(), status);
  const { has } = usePermissions();
  const owner = has('inst.staff.manage');
  const [addGroup, setAddGroup] = useState('');
  const targetGroup = addGroup || (owner ? '' : (groups[0]?.id ?? ''));
  const needsGroup = !owner && !targetGroup;
  const [groupName, setGroupName] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [skipped, setSkipped] = useState<ImportResult['skipped']>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const bulkRows = parseLearnerRows(bulk);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('invite');
    setNotice(null);
    const result = await learnerApi.invite(name.trim(), email.trim(), targetGroup || null);
    setBusy(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    setCredentials([{ name: result.data.learner.name, email: result.data.learner.email, temporaryPassword: result.data.temporaryPassword }]);
    setSkipped([]);
    setName('');
    setEmail('');
    setNotice({ tone: 'ok', text: `${result.data.learner.name} was added.` });
    await refresh();
  };

  const importRows = async () => {
    setBusy('import');
    setNotice(null);
    const result = await learnerApi.import(bulkRows, targetGroup || null);
    setBusy(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    setCredentials(result.data.created);
    setSkipped(result.data.skipped);
    setBulk('');
    setNotice({ tone: 'ok', text: `${result.data.created.length} learner${result.data.created.length === 1 ? '' : 's'} added${result.data.skipped.length ? `, ${result.data.skipped.length} skipped` : ''}.` });
    await refresh();
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setBulk(await file.text());
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([credentialsCsv(credentials)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'learner-credentials.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const revoke = async (id: string) => {
    setBusy(id);
    const result = await learnerApi.revoke(id, reason.trim());
    setBusy(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    setRevokingId(null);
    setReason('');
    setNotice({ tone: 'ok', text: `${result.data.name} was revoked and signed out.` });
    await refresh();
  };

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('group');
    const result = await learnerApi.createGroup(groupName.trim());
    setBusy(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    setGroupName('');
    setNotice({ tone: 'ok', text: `Group ${result.data.name} was created.` });
    await refresh();
  };

  const deleteGroup = async (id: string, name: string) => {
    setBusy(id);
    const result = await learnerApi.deleteGroup(id);
    setBusy(null);
    setDeletingGroupId(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    setNotice({ tone: 'ok', text: `Group ${name} was deleted. Its learners are now ungrouped.` });
    await refresh();
  };

  const moveToGroup = async (id: string, groupId: string) => {
    setBusy(id);
    const result = await learnerApi.setGroup(id, groupId || null);
    setBusy(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    await refresh();
  };

  const restore = async (id: string) => {
    setBusy(id);
    const result = await learnerApi.restore(id);
    setBusy(null);
    if (!result.ok) return setNotice({ tone: 'error', text: result.error });
    setNotice({ tone: 'ok', text: `${result.data.name} can sign in again.` });
    await refresh();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Learners"
        pill={institution}
        meta={owner ? 'Learners see your institution’s published problems and the batches you assign' : 'Learners in the groups assigned to you'}
        actions={
          <button className={styles.ghostButton} type="button" onClick={() => void refresh()}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <section className={styles.statGrid} aria-label="Learner summary">
        <StatCard metric={{ key: 'active', label: 'Active learners', value: counts.active, tone: 'primary' }} icon={Users} />
        <StatCard metric={{ key: 'never', label: 'Never signed in', value: counts.neverSignedIn, tone: counts.neverSignedIn ? 'warning' : 'neutral' }} icon={UserPlus} />
        <StatCard metric={{ key: 'revoked', label: 'Revoked', value: counts.revoked, tone: 'neutral' }} icon={UserX} />
      </section>

      {notice && (
        <p className={notice.tone === 'error' ? styles.error : styles.success} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      {credentials.length > 0 && (
        <Panel
          title="Temporary passwords"
          subtitle="Shown once. Share them securely; learners should change their password after signing in."
          action={
            <button className={styles.ghostButton} type="button" onClick={download}>
              <Download size={16} aria-hidden="true" />
              Download CSV
            </button>
          }
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Temporary password</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((row) => (
                  <tr key={row.email}>
                    <td>
                      <span className={styles.rowTitle}>{row.name}</span>
                      <span className={styles.rowMeta}>{row.email}</span>
                    </td>
                    <td>
                      <code className={styles.code}>{row.temporaryPassword}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className={styles.textButton} onClick={() => setCredentials([])}>
            I’ve saved them, hide passwords
          </button>
        </Panel>
      )}

      {skipped.length > 0 && (
        <Panel title={`Skipped rows (${skipped.length})`}>
          <ul className={styles.checkList}>
            {skipped.map((row) => (
              <li key={`${row.row}-${row.email}`} className={styles.checkWarn}>
                <UserX size={18} aria-hidden="true" />
                <span>{`Row ${row.row}${row.email ? ` (${row.email})` : ''}: ${row.reason}`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {(owner ? groups.length > 0 : true) && (
        <label className={`${styles.field} ${styles.fieldNarrow}`}>
          <span className={styles.label}>Add new learners to</span>
          <select id="learner-target-group" className={styles.select} value={targetGroup} onChange={(e) => setAddGroup(e.target.value)} disabled={!owner && groups.length === 0}>
            {owner && <option value="">No group</option>}
            {!owner && groups.length === 0 && <option value="">No groups assigned to you</option>}
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={styles.splitGrid}>
        <Panel title="Invite a learner">
          <form className={styles.formGrid} onSubmit={(event) => void invite(event)}>
            <label className={styles.field}>
              <span className={styles.label}>Name</span>
              <input id="learner-name" className={styles.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Menon" required minLength={2} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input id="learner-email" type="email" className={styles.input} value={email} maxLength={160} onChange={(e) => setEmail(e.target.value)} placeholder="asha@student.edu" required />
            </label>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <button type="submit" className={styles.primaryButton} disabled={busy !== null || needsGroup}>
                <UserPlus size={16} aria-hidden="true" />
                {busy === 'invite' ? 'Adding…' : 'Add learner'}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Import learners" subtitle={`One learner per line: name, email. Up to ${MAX_ROWS} at a time.`}>
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Learners</span>
              <textarea id="learner-bulk" className={styles.textarea} rows={5} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Asha Menon, asha@student.edu\nRahul Das, rahul@student.edu'} />
            </label>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.rowActions}>
                <label className={styles.ghostButton}>
                  <FileUp size={16} aria-hidden="true" />
                  Load CSV file
                  <input type="file" accept=".csv,text/csv,text/plain" className={styles.srOnly} onChange={(e) => void loadFile(e)} />
                </label>
                <button type="button" className={styles.primaryButton} disabled={busy !== null || needsGroup || bulkRows.length === 0 || bulkRows.length > MAX_ROWS} onClick={() => void importRows()}>
                  {busy === 'import' ? 'Importing…' : bulkRows.length ? `Import ${bulkRows.length} learner${bulkRows.length === 1 ? '' : 's'}` : 'Import learners'}
                </button>
              </span>
              {bulkRows.length > MAX_ROWS && <span className={styles.rowMeta}>{`Split the list: ${bulkRows.length} rows is more than ${MAX_ROWS}.`}</span>}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={owner ? 'Groups' : 'Your groups'} subtitle={owner ? 'Assign a batch to one group instead of every learner. A learner can be in one group.' : 'Only the Institute Admin can create or delete groups.'}>
        {owner && (
          <form className={styles.rowActions} onSubmit={(event) => void createGroup(event)}>
            <input id="group-name" className={styles.input} value={groupName} maxLength={60} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Batch A, 2026" aria-label="New group name" />
            <button type="submit" className={styles.ghostButton} disabled={busy !== null || groupName.trim().length < 2}>
              <FolderPlus size={16} aria-hidden="true" />
              Create group
            </button>
          </form>
        )}
        {groups.length > 0 && (
          <ul className={styles.pickList}>
            {groups.map((group) => (
              <li key={group.id} className={styles.pickRow}>
                <span className={styles.pickText}>
                  <strong>{group.name}</strong>
                  <span className={styles.rowMeta}>{`${group.learners} active learner${group.learners === 1 ? '' : 's'}`}</span>
                </span>
                {!owner ? null : deletingGroupId === group.id ? (
                  <span className={styles.rowActions}>
                    <button type="button" className={styles.dangerButton} disabled={busy !== null} onClick={() => void deleteGroup(group.id, group.name)}>
                      Delete
                    </button>
                    <button type="button" className={styles.textButton} onClick={() => setDeletingGroupId(null)}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" className={styles.iconButton} aria-label={`Delete group ${group.name}`} title="Delete group" onClick={() => setDeletingGroupId(group.id)}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="All learners">
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={16} aria-hidden="true" />
            <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search learners" />
          </label>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as '' | 'active' | 'revoked')} aria-label="Status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {`Unable to load learners: ${error}`}
          </p>
        )}
        {!loaded ? (
          <p className={styles.empty}>Loading learners…</p>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Users size={30} aria-hidden="true" />
            <strong>{q || status ? 'No matching learners' : 'No learners yet'}</strong>
            <p>Invite learners one at a time or import a list.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Status</th>
                  <th>Group</th>
                  <th>Last sign-in</th>
                  <th>Added</th>
                  <th>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((learner) => (
                  <tr key={learner.id}>
                    <td>
                      <span className={styles.rowTitle}>{learner.name}</span>
                      <span className={styles.rowMeta}>{learner.email}</span>
                    </td>
                    <td>
                      {learner.status === 'active' ? 'Active' : 'Revoked'}
                      {learner.revokeReason && <span className={styles.rowMeta}>{learner.revokeReason}</span>}
                    </td>
                    <td>
                      <select className={styles.select} value={learner.group?.id ?? ''} disabled={busy !== null || groups.length === 0} onChange={(e) => void moveToGroup(learner.id, e.target.value)} aria-label={`Group for ${learner.name}`}>
                        {(owner || !learner.group) && <option value="">No group</option>}
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{learner.lastLoginAt ? formatDate(learner.lastLoginAt) : 'Never'}</td>
                    <td>
                      {formatDate(learner.createdAt)}
                      {learner.invitedByName && <span className={styles.rowMeta}>{`by ${learner.invitedByName}`}</span>}
                    </td>
                    <td>
                      {learner.status === 'revoked' ? (
                        <button type="button" className={styles.ghostButton} disabled={busy !== null} onClick={() => void restore(learner.id)}>
                          <UserCheck size={16} aria-hidden="true" />
                          Restore
                        </button>
                      ) : revokingId === learner.id ? (
                        <span className={styles.rowActions}>
                          <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label={`Reason for revoking ${learner.name}`} maxLength={300} />
                          <button type="button" className={styles.dangerButton} disabled={busy !== null || reason.trim().length < 3} onClick={() => void revoke(learner.id)}>
                            Revoke
                          </button>
                          <button type="button" className={styles.textButton} onClick={() => setRevokingId(null)}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" className={styles.iconButton} aria-label={`Revoke ${learner.name}`} title="Revoke access" onClick={() => setRevokingId(learner.id)}>
                          <UserX size={16} aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}