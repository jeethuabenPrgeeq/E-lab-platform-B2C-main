'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readSession, type Session, type UserRole } from './session';

export function useSession(allowedRoles?: readonly UserRole[]) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const current = readSession();
    if (!current) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(current.role)) {
      router.replace('/dashboard');
      return;
    }
    setSession(current);
  }, [router, allowedRoles]);

  return session;
}