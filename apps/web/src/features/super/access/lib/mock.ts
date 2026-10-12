'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_PERMISSIONS, ALL_SCOPE, ME, SUPER_ROLE, isActiveSuper, roleName, slugify } from './shared';
import type { AdminAccount, AdminActivity, AdminDirectory, AdminRole, InviteAdminInput, NewRoleInput, PermissionKey } from './types';

const KEY = 'elab_super_admins_v1';
const DAY = 86_400_000;
const HOUR = 3_600_000;

function seedRoles(now: number): AdminRole[] {
  const at = now - 40 * DAY;
  return [
    { id: SUPER_ROLE, name: 'Super admin', description: 'Full access to every part of eLab. Cannot be edited.', system: true, locked: true, permissions: [...ALL_PERMISSIONS], updatedAt: at, updatedBy: 'System' },
    {
      id: 'platform_admin',
      name: 'Platform admin',
      description: 'Runs the judge, runtimes, incidents and releases.',
      system: true,
      locked: false,
      permissions: ['users.view', 'content.view', 'analytics.view', 'support.respond', 'platform.operate', 'audit.view'],
      updatedAt: at,
      updatedBy: 'System',
    },
    {
      id: 'content_manager',
      name: 'Content manager',
      description: 'Builds and publishes problems, paths and challenges.',
      system: true,
      locked: false,
      permissions: ['content.view', 'content.edit', 'content.publish', 'analytics.view'],
      updatedAt: at,
      updatedBy: 'System',
    },
    {
      id: 'billing_manager',
      name: 'Billing manager',
      description: 'Handles subscriptions, refunds, plans and coupons.',
      system: true,
      locked: false,
      permissions: ['users.view', 'billing.view', 'billing.refund', 'billing.plans', 'coupons.manage', 'analytics.view', 'reports.export'],
      updatedAt: at,
      updatedBy: 'System',
    },
    {
      id: 'support_agent',
      name: 'Support agent',
      description: 'Answers learner tickets and can look up accounts.',
      system: true,
      locked: false,
      permissions: ['users.view', 'billing.view', 'support.respond'],
      updatedAt: at,
      updatedBy: 'System',
    },
    {
      id: 'analyst',
      name: 'Analyst',
      description: 'Read-only access to analytics and exports.',
      system: false,
      locked: false,
      permissions: ['users.view', 'billing.view', 'analytics.view', 'reports.export'],
      updatedAt: now - 12 * DAY,
      updatedBy: 'Lakshmi V',
    },
  ];
}

type Seed = [name: string, email: string, roleId: string, scope: string, status: AdminAccount['status'], mfa: boolean, createdDays: number, lastSignInHours: number | null];

const PEOPLE: Seed[] = [
  ['Super Admin', 'superadmin@elab.com', SUPER_ROLE, ALL_SCOPE, 'active', true, 420, 0.2],
  ['Lakshmi V', 'lakshmi.v@elab.com', SUPER_ROLE, ALL_SCOPE, 'active', true, 410, 3],
  ['Arjun Pillai', 'arjun.pillai@elab.com', 'platform_admin', ALL_SCOPE, 'active', true, 300, 1],
  ['Meghana Rao', 'meghana.rao@elab.com', 'platform_admin', ALL_SCOPE, 'active', false, 210, 26],
  ['Joel Thomas', 'joel.thomas@elab.com', 'content_manager', ALL_SCOPE, 'active', true, 280, 5],
  ['Kavya Iyer', 'kavya.iyer@elab.com', 'content_manager', 'Christ University', 'active', true, 160, 50],
  ['Harish Shetty', 'harish.shetty@elab.com', 'content_manager', ALL_SCOPE, 'active', false, 95, 24 * 38],
  ['Fathima Rasheed', 'fathima.rasheed@elab.com', 'billing_manager', ALL_SCOPE, 'active', true, 260, 7],
  ['Nikhil George', 'nikhil.george@elab.com', 'billing_manager', ALL_SCOPE, 'active', true, 120, 30],
  ['Sneha Varghese', 'sneha.varghese@elab.com', 'support_agent', ALL_SCOPE, 'active', true, 190, 2],
  ['Rohan Das', 'rohan.das@elab.com', 'support_agent', 'NIT Calicut', 'active', false, 70, 20],
  ['Asha Kumar', 'asha.kumar@elab.com', 'support_agent', 'PES University', 'active', true, 45, 24 * 46],
  ['Varun Hegde', 'varun.hegde@elab.com', 'analyst', ALL_SCOPE, 'active', true, 60, 72],
  ['Pooja Menon', 'pooja.menon@elab.com', 'support_agent', ALL_SCOPE, 'invited', false, 2, null],
  ['Ishaan Sharma', 'ishaan.sharma@elab.com', 'analyst', ALL_SCOPE, 'invited', false, 6, null],
  ['Deepa Krishnan', 'deepa.krishnan@elab.com', 'billing_manager', ALL_SCOPE, 'revoked', true, 330, 24 * 64],
];

function seed(now: number): AdminDirectory {
  const roles = seedRoles(now);
  const admins: AdminAccount[] = PEOPLE.map(([name, email, roleId, scope, status, mfa, createdDays, lastHours], index) => {
    const createdAt = now - createdDays * DAY - index * HOUR;
    const invitedBy = index < 2 ? 'System' : index % 3 === 0 ? 'Super Admin' : 'Lakshmi V';
    const lastSignInAt = lastHours === null ? null : now - lastHours * HOUR;
    const activity: AdminActivity[] = [{ at: createdAt, text: `Invited as ${roleName(roles, roleId)}`, actor: invitedBy }];
    if (status !== 'invited') activity.push({ at: createdAt + DAY, text: 'Accepted the invitation', actor: name });
    if (mfa && status !== 'invited') activity.push({ at: createdAt + DAY + HOUR, text: 'Turned on two-factor authentication', actor: name });
    if (status === 'revoked') activity.push({ at: now - 60 * DAY, text: 'Revoked access: Left the company', actor: 'Lakshmi V' });
    return {
      id: `A-${(1001 + index).toString()}`,
      name,
      email,
      roleId,
      scope,
      status,
      mfa: status === 'invited' ? false : mfa,
      self: index === 0,
      createdAt,
      lastSignInAt,
      invitedBy,
      revokeReason: status === 'revoked' ? 'Left the company' : null,
      activity,
    };
  });
  return { admins, roles };
}

function load(): AdminDirectory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminDirectory;
      if (Array.isArray(parsed?.admins) && Array.isArray(parsed?.roles)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(data: AdminDirectory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  return data;
}

const log = (admin: AdminAccount, text: string): AdminActivity[] => [...admin.activity, { at: Date.now(), text, actor: ME }];

export function useAdminDirectory() {
  const [data, setData] = useState<AdminDirectory | null>(null);
  const dataRef = useRef<AdminDirectory | null>(null);
  dataRef.current = data;

  useEffect(() => {
    setData(load());
  }, []);

  const commit = useCallback((fn: (current: AdminDirectory) => AdminDirectory) => {
    setData((current) => (current ? persist(fn(current)) : current));
  }, []);

  const updateAdmin = useCallback(
    (id: string, fn: (admin: AdminAccount) => AdminAccount) => commit((current) => ({ ...current, admins: current.admins.map((admin) => (admin.id === id ? fn(admin) : admin)) })),
    [commit],
  );

  const guard = useCallback((id: string, action: 'role' | 'revoke'): string | null => {
    const current = dataRef.current;
    const admin = current?.admins.find((item) => item.id === id);
    if (!current || !admin) return 'Admin not found';
    if (admin.self) return action === 'role' ? 'You cannot change your own role. Ask another super admin.' : 'You cannot revoke your own access.';
    if (isActiveSuper(admin) && current.admins.filter(isActiveSuper).length <= 1) return 'eLab must always have at least one active super admin.';
    return null;
  }, []);

  const setRole = useCallback(
    (id: string, roleId: string): string | null => {
      const admin = dataRef.current?.admins.find((item) => item.id === id);
      if (!admin || admin.roleId === roleId) return null;
      if (admin.roleId === SUPER_ROLE) {
        const blocked = guard(id, 'role');
        if (blocked) return blocked;
      } else if (admin.self) return 'You cannot change your own role. Ask another super admin.';
      const roles = dataRef.current?.roles ?? [];
      updateAdmin(id, (item) => ({ ...item, roleId, scope: roleId === SUPER_ROLE ? ALL_SCOPE : item.scope, activity: log(item, `Changed role from ${roleName(roles, item.roleId)} to ${roleName(roles, roleId)}`) }));
      return null;
    },
    [guard, updateAdmin],
  );

  const setScope = useCallback((id: string, scope: string) => updateAdmin(id, (item) => (item.scope === scope ? item : { ...item, scope, activity: log(item, `Changed scope to ${scope}`) })), [updateAdmin]);

  const revoke = useCallback(
    (id: string, reason: string): string | null => {
      const blocked = guard(id, 'revoke');
      if (blocked) return blocked;
      updateAdmin(id, (item) => ({ ...item, status: 'revoked', revokeReason: reason, activity: log(item, `Revoked access: ${reason}`) }));
      return null;
    },
    [guard, updateAdmin],
  );

  const restore = useCallback(
    (id: string) => updateAdmin(id, (item) => ({ ...item, status: item.lastSignInAt ? 'active' : 'invited', revokeReason: null, activity: log(item, 'Restored access') })),
    [updateAdmin],
  );

  const resendInvite = useCallback((id: string) => updateAdmin(id, (item) => ({ ...item, activity: log(item, 'Resent the invitation') })), [updateAdmin]);

  const resetMfa = useCallback((id: string) => updateAdmin(id, (item) => ({ ...item, mfa: false, activity: log(item, 'Reset two-factor authentication — must set it up again at next sign-in') })), [updateAdmin]);

  const signOutEverywhere = useCallback((id: string) => updateAdmin(id, (item) => ({ ...item, activity: log(item, 'Signed out of all sessions') })), [updateAdmin]);

  const invite = useCallback(
    (input: InviteAdminInput) => {
      const current = dataRef.current;
      if (!current) return;
      const next = Math.max(1000, ...current.admins.map((admin) => Number(admin.id.slice(2)))) + 1;
      const now = Date.now();
      const created: AdminAccount = {
        id: `A-${next}`,
        name: input.name,
        email: input.email,
        roleId: input.roleId,
        scope: input.roleId === SUPER_ROLE ? ALL_SCOPE : input.scope,
        status: 'invited',
        mfa: false,
        self: false,
        createdAt: now,
        lastSignInAt: null,
        invitedBy: ME,
        revokeReason: null,
        activity: [{ at: now, text: `Invited as ${roleName(current.roles, input.roleId)}`, actor: ME }],
      };
      commit((data) => ({ ...data, admins: [created, ...data.admins] }));
    },
    [commit],
  );

  const savePermissions = useCallback(
    (changes: Record<string, PermissionKey[]>) =>
      commit((current) => ({
        ...current,
        roles: current.roles.map((role) => (role.locked || !changes[role.id] ? role : { ...role, permissions: changes[role.id], updatedAt: Date.now(), updatedBy: ME })),
      })),
    [commit],
  );

  const createRole = useCallback(
    (input: NewRoleInput): string => {
      const current = dataRef.current;
      const roles = current?.roles ?? [];
      const base = slugify(input.name) || 'role';
      let id = base;
      let n = 2;
      while (roles.some((role) => role.id === id)) id = `${base}_${n++}`;
      const source = roles.find((role) => role.id === input.copyFrom);
      const role: AdminRole = {
        id,
        name: input.name.trim(),
        description: input.description.trim(),
        system: false,
        locked: false,
        permissions: source && !source.locked ? [...source.permissions] : source?.locked ? ALL_PERMISSIONS.filter((key) => key !== 'admins.manage') : [],
        updatedAt: Date.now(),
        updatedBy: ME,
      };
      commit((data) => ({ ...data, roles: [...data.roles, role] }));
      return id;
    },
    [commit],
  );

  const deleteRole = useCallback(
    (id: string): string | null => {
      const current = dataRef.current;
      const role = current?.roles.find((item) => item.id === id);
      if (!current || !role) return 'Role not found';
      if (role.system) return 'Built-in roles cannot be deleted';
      const members = current.admins.filter((admin) => admin.roleId === id && admin.status !== 'revoked').length;
      if (members > 0) return `Move its ${members} member${members === 1 ? '' : 's'} to another role first`;
      commit((data) => ({ ...data, roles: data.roles.filter((item) => item.id !== id), admins: data.admins.map((admin) => (admin.roleId === id ? { ...admin, roleId: 'support_agent' } : admin)) }));
      return null;
    },
    [commit],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setData(seed(Date.now()));
  }, []);

  return {
    admins: data?.admins ?? [],
    roles: data?.roles ?? [],
    loaded: data !== null,
    setRole,
    setScope,
    revoke,
    restore,
    resendInvite,
    resetMfa,
    signOutEverywhere,
    invite,
    savePermissions,
    createRole,
    deleteRole,
    reset,
  };
}

export type AdminStore = ReturnType<typeof useAdminDirectory>;
