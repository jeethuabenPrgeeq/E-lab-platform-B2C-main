'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/features/admin/lib/api';
import { attempt, fetchAll, useServerCollection } from '../../lib/server-collection';
import type { Automation, Campaign, CampaignInput } from './types';

type ServerCampaign = Campaign & { ref: string };
type ServerAutomation = Omit<Automation, 'sent30' | 'openRate'> & Partial<Pick<Automation, 'sent30' | 'openRate'>>;

const dbIds = new Map<string, string>();
const toRow = (campaign: ServerCampaign): Campaign => {
  dbIds.set(campaign.ref, campaign.id);
  return { ...campaign, id: campaign.ref };
};
const loadCampaigns = async () => (await fetchAll<ServerCampaign>('/super/notifications/campaigns')).map(toRow);
const path = (ref: string) => `/super/notifications/campaigns/${dbIds.get(ref) ?? ref}`;

export function useNotifications() {
  const store = useServerCollection<Campaign>(loadCampaigns, path);
  const { apply, drop, setError } = store;
  const [automations, setAutomations] = useState<Automation[]>([]);

  const loadAutomations = useCallback(async () => {
    const result = await attempt(() => adminApi<ServerAutomation[]>('/super/notifications/automations'));
    if (result.data) setAutomations(result.data.map((item) => ({ sent30: 0, openRate: 0, ...item })));
  }, []);

  useEffect(() => {
    void loadAutomations();
  }, [loadAutomations]);

  const write = useCallback(
    async (url: string, body: unknown = {}, method: 'POST' | 'PATCH' = 'POST') => {
      const result = await attempt(() => adminApi<ServerCampaign>(url, { method, body }));
      if (result.data) apply(toRow(result.data));
      else if (result.error) setError(result.error);
      return result;
    },
    [apply, setError],
  );

  const save = useCallback(
    async (input: CampaignInput, mode: 'draft' | 'schedule' | 'now', id: string | null): Promise<string | null> => {
      const body = { ...input, mode };
      const result = id ? await write(path(id), body, 'PATCH') : await write('/super/notifications/campaigns', body);
      return result.data?.ref ?? null;
    },
    [write],
  );

  const sendNow = useCallback((id: string) => write(`${path(id)}/send`), [write]);
  const cancel = useCallback((id: string, reason: string) => write(`${path(id)}/cancel`, { reason }), [write]);
  const unschedule = useCallback((id: string) => write(`${path(id)}/unschedule`), [write]);

  const remove = useCallback(
    async (id: string) => {
      const result = await attempt(() => adminApi(path(id), { method: 'DELETE' }));
      if (result.error) setError(result.error);
      else drop(id);
    },
    [drop, setError],
  );

  const toggleAutomation = useCallback(
    async (id: string): Promise<string | null> => {
      const result = await attempt(() => adminApi(`/super/notifications/automations/${id}/toggle`, { method: 'POST' }));
      await loadAutomations();
      return result.error;
    },
    [loadAutomations],
  );

  const refresh = useCallback(async () => {
    await Promise.all([store.refresh(), loadAutomations()]);
  }, [store, loadAutomations]);

  return { campaigns: store.items, automations, loaded: store.loaded, error: store.error, clearError: store.clearError, refresh, focus: store.focus, save, sendNow, cancel, unschedule, remove, toggleAutomation };
}

export type NotificationStore = ReturnType<typeof useNotifications>;
