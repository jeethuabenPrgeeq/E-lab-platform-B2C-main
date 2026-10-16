'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';

export interface OwnershipPerson {
  id: string;
  name: string;
  email: string;
}

export interface OwnershipRow {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'review' | 'ready' | 'published' | 'deprecated';
  difficulty: string;
  updatedAt: number;
  assignedAt: number | null;
  technology: { id: string; name: string };
  organization: { id: string; name: string } | null;
  createdBy: (OwnershipPerson & { role: string }) | null;
  assignee: OwnershipPerson | null;
}

export interface InstituteAdminOption extends OwnershipPerson {
  assigned: number;
  organizationId: string;
  institution: string | null;
}

export interface OwnershipFilters {
  q: string;
  status: string;
  assignee: string;
}

export function useOwnership(filters: OwnershipFilters) {
  const [rows, setRows] = useState<OwnershipRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [unassigned, setUnassigned] = useState(0);
  const [managers, setManagers] = useState<InstituteAdminOption[]>([]);
  const [error, setError] = useState('');

  const loadManagers = useCallback(async () => {
    try {
      setManagers((await adminApi<{ items: InstituteAdminOption[] }>('/super/content/institute-admins')).items);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<{ items: OwnershipRow[]; total: number; unassigned: number }>('/super/content/ownership', { query: { ...filters, pageSize: 100 } });
      setRows(data.items);
      setTotal(data.total);
      setUnassigned(data.unassigned);
      setError('');
    } catch (err) {
      setError(errorText(err));
      setRows((current) => current ?? []);
    }
  }, [filters]);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), filters.q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [refresh, filters.q]);

  const assign = useCallback(
    async (id: string, assigneeId: string | null) => {
      try {
        const updated = await adminApi<OwnershipRow>(`/super/content/ownership/${id}/assign`, { method: 'POST', body: { assigneeId } });
        setRows((current) => (current ?? []).map((row) => (row.id === id ? updated : row)));
        void loadManagers();
        void refresh();
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    [loadManagers, refresh],
  );

  return { rows: rows ?? [], loaded: rows !== null, total, unassigned, managers, error, clearError: () => setError(''), refresh, assign };
}
