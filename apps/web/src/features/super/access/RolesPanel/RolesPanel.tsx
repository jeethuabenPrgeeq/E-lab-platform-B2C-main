'use client';

import { Fragment, useMemo, useState } from 'react';
import { Lock, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import type { AdminStore } from '../lib/api';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, cx, roleTone } from '../lib/shared';
import type { PermissionKey } from '../lib/types';
import { RoleModal } from '../RoleModal/RoleModal';
import styles from '../ui/admins.module.css';

interface RolesPanelProps {
  store: AdminStore;
  hidden: boolean;
  onNotice: (text: string) => void;
}

export function RolesPanel({ store, hidden, onNotice }: RolesPanelProps) {
  const { roles, admins, loaded } = store;
  const [draft, setDraft] = useState<Record<string, PermissionKey[]>>({});
  const [creating, setCreating] = useState(false);
  const [roleError, setRoleError] = useState<{ id: string; text: string } | null>(null);

  const members = useMemo(() => {
    const map: Record<string, number> = {};
    for (const admin of admins) if (admin.status !== 'revoked') map[admin.roleId] = (map[admin.roleId] ?? 0) + 1;
    return map;
  }, [admins]);

  const effective = (roleId: string) => draft[roleId] ?? roles.find((role) => role.id === roleId)?.permissions ?? [];

  const changes = useMemo(() => {
    let count = 0;
    const affected: string[] = [];
    for (const role of roles) {
      const next = draft[role.id];
      if (!next) continue;
      const before = new Set(role.permissions);
      const after = new Set(next);
      const diff = ALL_PERMISSIONS.filter((key) => before.has(key) !== after.has(key)).length;
      if (diff) {
        count += diff;
        affected.push(role.name);
      }
    }
    return { count, affected };
  }, [draft, roles]);

  const isChanged = (roleId: string, key: PermissionKey) => {
    const next = draft[roleId];
    if (!next) return false;
    const role = roles.find((item) => item.id === roleId);
    return Boolean(role) && role!.permissions.includes(key) !== next.includes(key);
  };

  const toggle = (roleId: string, key: PermissionKey) =>
    setDraft((current) => {
      const base = current[roleId] ?? roles.find((role) => role.id === roleId)?.permissions ?? [];
      const next = base.includes(key) ? base.filter((item) => item !== key) : ALL_PERMISSIONS.filter((item) => item === key || base.includes(item));
      return { ...current, [roleId]: next };
    });

  const save = async () => {
    const failed = await store.savePermissions(draft);
    if (failed) return;
    setDraft({});
    onNotice(`Saved ${changes.count} permission change${changes.count === 1 ? '' : 's'} to ${changes.affected.join(', ')}`);
  };

  return (
    <div hidden={hidden}>
      <div className={styles.rolesHead}>
        <p className={styles.rolesIntro}>Each admin has exactly one role. Changing a role here changes it for everyone who holds it.</p>
        <button type="button" className={styles.ghostButton} onClick={() => setCreating(true)} disabled={!loaded}>
          <Plus width={16} height={16} aria-hidden="true" />
          New role
        </button>
      </div>

      <div className={styles.roleGrid}>
        {roles.map((role) => {
          const count = members[role.id] ?? 0;
          const perms = effective(role.id).length;
          return (
            <article key={role.id} className={styles.roleCard}>
              <div className={styles.roleCardHead}>
                <span className={cx(styles.badge, styles[`tone_${roleTone(role.id)}`])}>{role.name}</span>
                <span className={styles.roleKind}>
                  {role.locked && <Lock width={12} height={12} aria-hidden="true" />}
                  {role.system ? 'Built-in' : 'Custom'}
                </span>
              </div>
              <p className={styles.roleDesc}>{role.description || 'No description'}</p>
              <div className={styles.roleFoot}>
                <span>{`${count} member${count === 1 ? '' : 's'} · ${perms} of ${ALL_PERMISSIONS.length} permissions`}</span>
                {!role.system && (
                  <button
                    type="button"
                    className={styles.roleDelete}
                    aria-label={`Delete ${role.name}`}
                    onClick={async () => {
                      const result = await store.deleteRole(role.id);
                      if (result) setRoleError({ id: role.id, text: result });
                      else {
                        setRoleError(null);
                        setDraft((current) => {
                          const next = { ...current };
                          delete next[role.id];
                          return next;
                        });
                        onNotice(`Deleted the ${role.name} role`);
                      }
                    }}
                  >
                    <Trash2 width={15} height={15} aria-hidden="true" />
                  </button>
                )}
              </div>
              {roleError?.id === role.id && (
                <p className={styles.roleError} role="alert">
                  {roleError.text}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {changes.count > 0 && (
        <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
          <span>
            <strong>{`${changes.count} unsaved change${changes.count === 1 ? '' : 's'}`}</strong>
            <span className={styles.meta}>{changes.affected.join(', ')}</span>
          </span>
          <div className={styles.saveActions}>
            <button type="button" className={styles.ghostButton} onClick={() => setDraft({})}>
              Discard
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => void save()}>
              Save changes
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={cx(styles.table, styles.matrix)} style={{ minWidth: 280 + roles.length * 120 }}>
          <thead>
            <tr>
              <th className={styles.permHead}>Permission</th>
              {roles.map((role) => (
                <th key={role.id} className={styles.roleHead} scope="col">
                  <span className={styles.roleHeadName}>{role.name}</span>
                  <span className={styles.roleHeadCount}>{`${members[role.id] ?? 0} members`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.id}>
                <tr className={styles.groupRow}>
                  <th colSpan={roles.length + 1} scope="colgroup">
                    {group.label}
                  </th>
                </tr>
                {group.items.map((item) => (
                  <tr key={item.key}>
                    <th scope="row" className={styles.permCell}>
                      <span className={styles.permLabel}>
                        {item.label}
                        {item.sensitive && (
                          <span className={styles.sensitive} title="Sensitive permission">
                            <ShieldAlert width={14} height={14} aria-hidden="true" />
                            <span className={styles.srOnly}>Sensitive</span>
                          </span>
                        )}
                      </span>
                      <span className={styles.permKey}>{item.key}</span>
                    </th>
                    {roles.map((role) => {
                      const checked = role.locked || effective(role.id).includes(item.key);
                      return (
                        <td key={role.id} className={cx(styles.matrixCell, isChanged(role.id, item.key) && styles.cellChanged)}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={checked}
                            disabled={role.locked || !loaded}
                            onChange={() => toggle(role.id, item.key)}
                            aria-label={`${role.name}: ${item.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <RoleModal
          roles={roles}
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            const id = await store.createRole(input);
            setCreating(false);
            if (!id) return;
            onNotice(`Created the ${input.name} role`);
          }}
        />
      )}
    </div>
  );
}