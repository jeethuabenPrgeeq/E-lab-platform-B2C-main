'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { Pencil, RefreshCw, Save, UserCheck, UserCog, UserPlus, UserX } from 'lucide-react';
import { PageHeader, Panel } from '@/components/admin/widgets/AdminWidgets';
import { useToast } from '@/components/toast/ToastProvider';
import { formatDate } from '@/features/admin/problems/lib/shared';
import { INSTITUTION_PERMISSION_ITEMS, INSTITUTION_PERMISSION_LABEL } from '@/features/super/access/lib/shared';
import type { InstitutionPermissionKey } from '@/features/super/access/lib/types';
import { useInstitutionLabel } from '../lib/useInstitutionLabel';
import styles from '../ui/institute.module.css';
import { staffApi, useStaff, type StaffMember, type StaffPreset } from './api';
import local from './staff.module.css';

const LEVELS: { value: 1 | 2; label: string; preset: StaffPreset }[] = [
  { value: 1, label: 'Lead staff', preset: 'lead' },
  { value: 2, label: 'Staff', preset: 'staff' },
];

interface Draft {
  name: string;
  email: string;
  title: string;
  level: 1 | 2;
  permissions: InstitutionPermissionKey[];
  groupIds: string[];
}

const EMPTY: Draft = { name: '', email: '', title: '', level: 1, permissions: [], groupIds: [] };

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export default function StaffPage() {
  const institution = useInstitutionLabel();
  const toast = useToast();
  const { data, loaded, error, refresh } = useStaff();
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [credential, setCredential] = useState<{ name: string; email: string; temporaryPassword: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const seeded = useRef(false);
  const credentialRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!data || seeded.current) return;
    seeded.current = true;
    setDraft((current) => ({ ...current, level: data.levels === 2 ? 2 : 1, permissions: data.presets.staff.filter((key) => data.permissions.includes(key)) }));
  }, [data]);

  const enabled = data?.permissions ?? [];
  const groups = data?.groups ?? [];
  const items = data?.items ?? [];
  const twoLevels = data?.levels === 2;
  const usable = (keys: InstitutionPermissionKey[]) => keys.filter((key) => enabled.includes(key));
  const fresh = (): Draft => ({ ...EMPTY, level: twoLevels ? 2 : 1, permissions: usable(data?.presets.staff ?? []) });
  const scrollTo = (target: { current: HTMLElement | null }) => window.requestAnimationFrame(() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  const startInvite = () => {
    setEditing(null);
    setDraft(fresh());
  };

  const startEdit = (member: StaffMember) => {
    setEditing(member);
    setFormError('');
    setRevokingId(null);
    setDraft({ name: member.name, email: member.email, title: member.title, level: member.level, permissions: member.permissions, groupIds: member.groups.map((group) => group.id) });
    scrollTo(formRef);
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormError('');
    setDraft(fresh());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('save');
    setFormError('');
    const input = { title: draft.title.trim(), level: twoLevels ? draft.level : (1 as const), permissions: draft.permissions, groupIds: draft.groupIds };
    if (editing) {
      const result = await staffApi.update(editing.id, input);
      setBusy(null);
      if (!result.ok) return setFormError(result.error);
      toast.success(`${result.data.name}’s access was updated`);
      cancelEdit();
    } else {
      const result = await staffApi.invite({ ...input, name: draft.name.trim(), email: draft.email.trim() });
      setBusy(null);
      if (!result.ok) return setFormError(result.error);
      setCredential({ name: result.data.staff.name, email: result.data.staff.email, temporaryPassword: result.data.temporaryPassword });
      toast.success(`${result.data.staff.name} was added as ${result.data.staff.title}`);
      startInvite();
      scrollTo(credentialRef);
    }
    await refresh();
  };

  const revoke = async (member: StaffMember) => {
    setBusy(member.id);
    const result = await staffApi.revoke(member.id, reason.trim());
    setBusy(null);
    if (!result.ok) return toast.error(result.error);
    setRevokingId(null);
    setReason('');
    toast.success(`${member.name} was revoked and signed out`);
    await refresh();
  };

  const restore = async (member: StaffMember) => {
    setBusy(member.id);
    const result = await staffApi.restore(member.id);
    setBusy(null);
    if (!result.ok) return toast.error(result.error);
    toast.success(`${member.name} can sign in again`);
    await refresh();
  };

    const canSave = draft.title.trim().length >= 2 && draft.permissions.length > 0 && draft.groupIds.length > 0 && (editing !== null || (draft.name.trim().length >= 2 && draft.email.includes('@')));
  const columns = twoLevels ? 7 : 6;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Staff"
        pill={institution}
        meta="Optional. Add staff to share the work, or keep managing learners yourself."
        actions={
          <button className={styles.ghostButton} type="button" onClick={() => void refresh()}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      {credential && (
        <div ref={credentialRef} className={local.anchor}>
          <Panel title="Temporary password" subtitle="Shown once. Share it securely; they’ll be asked to set their own password at first sign-in.">
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Staff member</th>
                    <th>Temporary password</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className={styles.rowTitle}>{credential.name}</span>
                      <span className={styles.rowMeta}>{credential.email}</span>
                    </td>
                    <td>
                      <code className={styles.code}>{credential.temporaryPassword}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" className={styles.textButton} onClick={() => setCredential(null)}>
              I’ve saved it, hide password
            </button>
          </Panel>
        </div>
      )}

      <Panel title={editing ? `Edit ${editing.name}` : 'Add a staff member'} subtitle={editing ? editing.email : 'They sign in like you, but only see what you allow.'}>
        <form ref={formRef} className={`${styles.formGrid} ${local.anchor}`} onSubmit={(event) => void submit(event)}>
          {!editing && (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Name</span>
                <input id="staff-name" className={styles.input} value={draft.name} maxLength={80} minLength={2} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Priya Nair" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input id="staff-email" type="email" className={styles.input} value={draft.email} maxLength={160} required onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="priya@college.edu" />
              </label>
            </>
          )}
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input id="staff-title" className={styles.input} value={draft.title} maxLength={60} minLength={2} required onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Coordinator, Mentor, HOD" />
          </label>

          {twoLevels && (
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Level</span>
              <span className={local.presets} role="group" aria-label="Staff level">
                {LEVELS.map((item) => (
                  <button key={item.value} type="button" className={`${styles.ghostButton} ${draft.level === item.value ? local.presetActive : ''}`} aria-pressed={draft.level === item.value} onClick={() => setDraft({ ...draft, level: item.value, permissions: usable(data?.presets[item.preset] ?? []) })}>
                    {item.label}
                  </button>
                ))}
              </span>
            </div>
          )}

          <fieldset className={`${styles.field} ${styles.fieldWide} ${local.options}`}>
            <legend className={`${styles.label} ${local.legend}`}>Permissions</legend>
            {INSTITUTION_PERMISSION_ITEMS.map((item) => {
              const allowed = enabled.includes(item.key);
              return (
                <label key={item.key} className={local.option} data-disabled={!allowed}>
                  <input type="checkbox" checked={draft.permissions.includes(item.key)} disabled={!allowed} onChange={() => setDraft({ ...draft, permissions: toggle(draft.permissions, item.key) })} />
                  <span className={local.optionText}>
                    <strong>{item.label}</strong>
                    <span>{allowed ? item.description : 'Not enabled for your institution'}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <fieldset className={`${styles.field} ${styles.fieldWide} ${local.options}`}>
            <legend className={`${styles.label} ${local.legend}`}>Learner groups they handle</legend>
            {groups.length === 0 ? (
              <p className={styles.rowMeta}>
                No groups yet. <Link href="/learners" className={styles.textLink}>Create groups on the Learners page</Link> first.
              </p>
            ) : (
              groups.map((group) => (
                <label key={group.id} className={local.option}>
                  <input type="checkbox" checked={draft.groupIds.includes(group.id)} onChange={() => setDraft({ ...draft, groupIds: toggle(draft.groupIds, group.id) })} />
                  <span className={local.optionText}>
                    <strong>{group.name}</strong>
                  </span>
                </label>
              ))
            )}
          </fieldset>
          {draft.groupIds.length === 0 && groups.length > 0 && <p className={`${local.groupHint} ${styles.fieldWide}`}>Choose at least one group. Staff only see learners and batches in their groups.</p>}

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.rowActions}>
              <button type="submit" className={styles.primaryButton} disabled={busy !== null || !canSave}>
                {editing ? <Save size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
                {busy === 'save' ? 'Saving…' : editing ? 'Save changes' : 'Add staff member'}
              </button>
              {editing && (
                <button type="button" className={styles.textButton} onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </span>
            {formError && (
              <p className={local.formError} role="alert">
                {formError}
              </p>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Staff members">
        {error && (
          <p className={styles.error} role="alert">
            {`Unable to load staff: ${error}`}
          </p>
        )}
        {!loaded ? (
          <p className={styles.empty}>Loading staff…</p>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <UserCog size={30} aria-hidden="true" />
            <strong>No staff yet</strong>
            <p>You manage everything yourself until you add someone.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Title</th>
                  {twoLevels && <th>Level</th>}
                  <th>Permissions</th>
                  <th>Groups</th>
                  <th>Status</th>
                  <th>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((member) => (
                  <Fragment key={member.id}>
                    <tr className={revokingId === member.id ? local.rowRevoking : undefined}>
                      <td>
                        <span className={styles.rowTitle}>{member.name}</span>
                        <span className={styles.rowMeta}>{member.email}</span>
                      </td>
                      <td>{member.title}</td>
                      {twoLevels && <td>{member.level === 1 ? 'Lead staff' : 'Staff'}</td>}
                      <td>
                        <span className={local.tags}>
                          {member.permissions.map((key) => (
                            <span key={key} className={local.tag}>
                              {INSTITUTION_PERMISSION_LABEL[key]}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td>
                        {member.groups.length ? (
                          <span className={local.tags}>
                            {member.groups.map((group) => (
                              <span key={group.id} className={local.tag}>
                                {group.name}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className={styles.rowMeta}>No groups</span>
                        )}
                      </td>
                      <td>
                        {member.status === 'active' ? 'Active' : 'Revoked'}
                        <span className={styles.rowMeta}>{member.lastLoginAt ? `Last sign-in ${formatDate(member.lastLoginAt)}` : 'Never signed in'}</span>
                        {member.revokeReason && <span className={styles.rowMeta}>{member.revokeReason}</span>}
                      </td>
                      <td>
                        {member.status === 'revoked' ? (
                          <button type="button" className={styles.ghostButton} disabled={busy !== null} onClick={() => void restore(member)}>
                            <UserCheck size={16} aria-hidden="true" />
                            Restore
                          </button>
                        ) : (
                          <span className={styles.rowActions}>
                            <button type="button" className={styles.iconButton} aria-label={`Edit ${member.name}`} title="Edit access" onClick={() => startEdit(member)}>
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconButton} ${local.revokeIcon}`}
                              aria-label={`Revoke ${member.name}`}
                              aria-expanded={revokingId === member.id}
                              title="Revoke access"
                              onClick={() => {
                                setReason('');
                                setRevokingId(revokingId === member.id ? null : member.id);
                              }}
                            >
                              <UserX size={16} aria-hidden="true" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                    {revokingId === member.id && member.status !== 'revoked' && (
                      <tr className={local.revokeRow}>
                        <td colSpan={columns}>
                          <form
                            className={local.revokeForm}
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (reason.trim().length >= 3) void revoke(member);
                            }}
                          >
                            <span className={local.revokeText}>{`Revoke ${member.name}? They are signed out and can’t sign in until restored.`}</span>
                            <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 3 characters)" aria-label={`Reason for revoking ${member.name}`} maxLength={300} autoFocus />
                            <button type="submit" className={styles.dangerButton} disabled={busy !== null || reason.trim().length < 3}>
                              Revoke
                            </button>
                            <button type="button" className={styles.textButton} onClick={() => setRevokingId(null)}>
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}