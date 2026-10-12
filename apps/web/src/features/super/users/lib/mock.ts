'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INSTITUTIONS, ME, ROLE_META } from './shared';
import type { BillingCycle, InviteInput, PlatformUser, UserActivity, UserPlan, UserRole, UserStatus } from './types';

const KEY = 'elab_super_users_v3';
const DAY = 86_400_000;

const FIRST = ['Aarav', 'Diya', 'Rahul', 'Ananya', 'Vikram', 'Fathima', 'Karthik', 'Meghana', 'Arjun', 'Priya', 'Suresh', 'Deepa', 'Nikhil', 'Sneha', 'Rohan', 'Lakshmi', 'Aditya', 'Kavya', 'Joel', 'Neha', 'Ishaan', 'Riya', 'Siddharth', 'Anjali', 'Manoj', 'Pooja', 'Varun', 'Asha', 'Harish', 'Nandini'];
const LAST = ['Nair', 'Menon', 'Rao', 'Iyer', 'Shetty', 'Rasheed', 'Reddy', 'George', 'Krishnan', 'Babu', 'Pillai', 'Kumar', 'Joseph', 'Varghese', 'Hegde', 'Sharma', 'Das', 'Thomas'];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const domainOf = (institution: string) => (institution === 'Independent' ? 'gmail.com' : `${institution.toLowerCase().split(' ')[0]}.edu`);

function seed(now: number): PlatformUser[] {
  const r = rng(20261007);
  const users: PlatformUser[] = [];
  for (let i = 0; i < 240; i += 1) {
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const roll = r();
    const role: UserRole = roll < 0.86 ? 'learner' : roll < 0.96 ? 'instructor' : 'institution_admin';
    const institution = role === 'learner' && r() < 0.22 ? 'Independent' : INSTITUTIONS[Math.floor(r() * (INSTITUTIONS.length - 1))];
    const statusRoll = r();
    const status: UserStatus = statusRoll < 0.74 ? 'active' : statusRoll < 0.84 ? 'trial' : statusRoll < 0.91 ? 'invited' : statusRoll < 0.95 ? 'suspended' : 'deactivated';
    const joinedAt = now - Math.floor(r() * 420 + 1) * DAY - Math.floor(r() * DAY);
    const lastActiveAt = status === 'invited' ? null : status === 'deactivated' ? Math.min(now - DAY, joinedAt + Math.floor(r() * 30) * DAY) : Math.max(joinedAt, now - Math.floor(Math.pow(r(), 2.2) * 90 * DAY) - Math.floor(r() * DAY));
    const planRoll = r();
    const plan: UserPlan = institution !== 'Independent' ? 'enterprise' : status === 'trial' ? 'professional' : planRoll < 0.55 ? 'free' : planRoll < 0.8 ? 'starter' : planRoll < 0.94 ? 'professional' : 'premium';
    const cycleRoll = r();
    const cycle: BillingCycle | null = plan === 'free' || status === 'trial' ? null : plan === 'enterprise' ? 'annual' : cycleRoll < 0.69 ? 'monthly' : cycleRoll < 0.83 ? 'quarterly' : 'annual';
    const ageDays = Math.max(1, (now - joinedAt) / DAY);
    const solved = status === 'invited' ? 0 : Math.floor(r() * Math.min(role === 'learner' ? 260 : 60, ageDays * 1.5));
    const activity: UserActivity[] = [{ at: joinedAt, text: status === 'invited' ? 'Invited to eLab' : 'Created account', actor: status === 'invited' ? 'Lakshmi V' : 'System' }];
    if (status === 'deactivated') activity.push({ at: Math.min(now, (lastActiveAt ?? joinedAt) + Math.floor(r() * 3 + 1) * DAY), text: 'Deactivated at the user’s request', actor: 'System' });
    if (status === 'suspended') activity.push({ at: now - Math.floor(r() * 20 + 1) * DAY, text: 'Suspended: repeated plagiarism in assessments', actor: 'Lakshmi V' });
    users.push({
      id: `U-${(10421 + i).toString()}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i % 7 === 0 ? i : ''}@${domainOf(institution)}`.toLowerCase(),
      role,
      status,
      plan,
      cycle,
      institution,
      joinedAt,
      lastActiveAt,
      solved,
      submissions: solved * (2 + Math.floor(r() * 3)),
      streak: (status === 'active' || status === 'trial') && lastActiveAt && now - lastActiveAt < 2 * DAY ? Math.floor(r() * Math.min(40, ageDays + 1)) : 0,
      suspendReason: status === 'suspended' ? 'Repeated plagiarism in assessments' : null,
      activity,
    });
  }
  return users.sort((a, b) => b.joinedAt - a.joinedAt);
}

function load(): PlatformUser[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlatformUser[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(items: PlatformUser[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  return items;
}

const nameFromEmail = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');

export function useUsers() {
  const [items, setItems] = useState<PlatformUser[] | null>(null);
  const itemsRef = useRef<PlatformUser[] | null>(null);
  itemsRef.current = items;

  useEffect(() => {
    setItems(load());
  }, []);

  const mutateMany = useCallback((ids: string[], fn: (user: PlatformUser, now: number) => PlatformUser) => {
    const set = new Set(ids);
    setItems((current) => (current ? persist(current.map((user) => (set.has(user.id) ? fn(user, Date.now()) : user))) : current));
  }, []);

  const log = (user: PlatformUser, now: number, text: string): UserActivity[] => [...user.activity, { at: now, text, actor: ME }];

  const setRole = useCallback(
    (id: string, role: UserRole) => mutateMany([id], (user, now) => ({ ...user, role, activity: log(user, now, `Changed role to ${ROLE_META[role].label}`) })),
    [mutateMany],
  );

  const suspend = useCallback(
    (ids: string[], reason: string) =>
      mutateMany(ids, (user, now) => (user.status === 'suspended' || user.status === 'deactivated' ? user : { ...user, status: 'suspended', suspendReason: reason, activity: log(user, now, `Suspended: ${reason}`) })),
    [mutateMany],
  );

  const reactivate = useCallback(
    (ids: string[]) =>
      mutateMany(ids, (user, now) =>
        user.status !== 'suspended' && user.status !== 'deactivated' ? user : { ...user, status: user.lastActiveAt ? 'active' : 'invited', suspendReason: null, activity: log(user, now, 'Reactivated the account') },
      ),
    [mutateMany],
  );

  const resetPassword = useCallback((id: string) => mutateMany([id], (user, now) => ({ ...user, activity: log(user, now, 'Sent a password reset link') })), [mutateMany]);

  const resendInvite = useCallback((id: string) => mutateMany([id], (user, now) => ({ ...user, activity: log(user, now, 'Resent the invitation') })), [mutateMany]);

  const invite = useCallback((input: InviteInput) => {
    const now = Date.now();
    const existing = itemsRef.current ?? [];
    let next = Math.max(10420, ...existing.map((user) => Number(user.id.slice(2)))) + 1;
    const created: PlatformUser[] = input.emails.map((email) => ({
      id: `U-${next++}`,
      name: nameFromEmail(email),
      email,
      role: input.role,
      status: 'invited',
      plan: input.plan,
      cycle: input.plan === 'free' ? null : input.plan === 'enterprise' ? 'annual' : 'monthly',
      institution: input.institution,
      joinedAt: now,
      lastActiveAt: null,
      solved: 0,
      submissions: 0,
      streak: 0,
      suspendReason: null,
      activity: [{ at: now, text: 'Invited to eLab', actor: ME }],
    }));
    setItems((current) => (current ? persist([...created, ...current]) : current));
    return created.length;
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, setRole, suspend, reactivate, resetPassword, resendInvite, invite, reset };
}
