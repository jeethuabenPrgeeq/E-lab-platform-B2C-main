import { adminApi, errorText } from '../lib/api';

export type UploadMethod = 'manual' | 'csv' | 'ai';

export interface SaveDraftsInput {
  technology: string;
  method: UploadMethod;
  source?: string;
  rows: Record<string, string>[];
}

export interface SaveDraftsResult {
  batchId: string;
  saved: number;
  savedAt: string;
}

export interface SavedBatch extends SaveDraftsResult {
  technology: string;
  method: UploadMethod;
  source?: string;
  titles: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const MOCK_KEY = 'elab_practice_draft_batches';
const MOCK_LIMIT = 20;

function readMockBatches(): SavedBatch[] {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    return raw ? (JSON.parse(raw) as SavedBatch[]) : [];
  } catch {
    return [];
  }
}

async function saveToMock(input: SaveDraftsInput): Promise<SaveDraftsResult> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const result: SaveDraftsResult = {
    batchId: `B-${Date.now().toString(36).toUpperCase()}`,
    saved: input.rows.length,
    savedAt: new Date().toISOString(),
  };
  const batch: SavedBatch = {
    ...result,
    technology: input.technology,
    method: input.method,
    source: input.source,
    titles: input.rows.map((row) => row.title ?? '').filter(Boolean),
  };
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify([batch, ...readMockBatches()].slice(0, MOCK_LIMIT)));
  } catch {}
  return result;
}

async function postDrafts(input: SaveDraftsInput): Promise<Response> {
  return fetch(`${API_BASE}/admin/practice/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
}

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function saveToApi(input: SaveDraftsInput): Promise<SaveDraftsResult> {
  let response = await postDrafts(input);

  if (response.status === 401) {
    if (!(await refreshSession())) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    response = await postDrafts(input);
  }

  const data = (await response.json().catch(() => ({}))) as Partial<SaveDraftsResult> & { message?: string };
  if (!response.ok) throw new Error(data.message ?? `Save failed (${response.status})`);
  return {
    batchId: data.batchId ?? '',
    saved: data.saved ?? input.rows.length,
    savedAt: data.savedAt ?? new Date().toISOString(),
  };
}

export async function savePracticeDrafts(input: SaveDraftsInput): Promise<SaveDraftsResult> {
  if (input.rows.length === 0) throw new Error('Nothing to save');
  return API_BASE ? saveToApi(input) : saveToMock(input);
}

export async function saveInstitutionUpload(input: SaveDraftsInput): Promise<SaveDraftsResult> {
  if (input.rows.length === 0) throw new Error('Nothing to save');
  try {
    return await adminApi<SaveDraftsResult>('/institute/uploads', { method: 'POST', body: input });
  } catch (error) {
    throw new Error(errorText(error));
  }
}

export function readSavedBatches(): SavedBatch[] {
  return readMockBatches();
}