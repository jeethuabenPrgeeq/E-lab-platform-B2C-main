'use client';

import { useEffect, useState } from 'react';
import { adminApi } from './api';

export const YOU = 'You';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface OpsIdentity {
  me: { id: string; name: string } | null;
  team: TeamMember[];
}

let cached: Promise<OpsIdentity> | null = null;

function loadIdentity(): Promise<OpsIdentity> {
  if (!cached) {
    cached = Promise.all([adminApi<{ user: { id: string; name: string } }>('/auth/me'), adminApi<TeamMember[]>('/admin/platform/team')])
      .then(([me, team]) => ({ me: { id: me.user.id, name: me.user.name }, team }))
      .catch((error) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}

export function useOpsIdentity() {
  const [identity, setIdentity] = useState<OpsIdentity>({ me: null, team: [] });

  useEffect(() => {
    let alive = true;
    loadIdentity()
      .then((value) => {
        if (alive) setIdentity(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const display = (name: string | null, id?: string | null) => {
    if (!name) return null;
    if (identity.me && (id ? id === identity.me.id : name === identity.me.name)) return YOU;
    return name;
  };

  const idOf = (name: string | null) => {
    if (!name) return null;
    if (name === YOU) return identity.me?.id ?? null;
    return identity.team.find((member) => member.name === name)?.id ?? null;
  };

  const names = [YOU, ...identity.team.filter((member) => member.id !== identity.me?.id).map((member) => member.name)];

  return { ...identity, display, idOf, names };
}