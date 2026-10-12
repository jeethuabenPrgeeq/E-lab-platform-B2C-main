import { useMemo, useRef } from 'react';
import { findMatch } from './metrics';
import type { SubSnapshot } from './store';
import type { PersistState, Submission } from './types';

export interface FlagItem {
  sub: Submission;
  match: Submission;
  decision: PersistState['flags'][string] | null;
}

export function useFlags(snap: SubSnapshot | null, persist: PersistState) {
  const latest = useRef(snap);
  latest.current = snap;
  const count = snap?.all.length ?? 0;

  const base = useMemo(() => {
    const current = latest.current;
    const out: { sub: Submission; match: Submission }[] = [];
    if (!current || !count) return out;
    for (const sub of current.all) {
      if (!sub.similarity) continue;
      const match = findMatch(current.all, sub);
      if (match) out.push({ sub, match });
    }
    return out.reverse();
  }, [count]);

  return useMemo<FlagItem[]>(() => base.map((item) => ({ ...item, decision: persist.flags[item.sub.id] ?? null })), [base, persist.flags]);
}