import { VERDICTS, VERDICT_META, cx, formatNumber, formatPercent } from '../lib/shared';
import type { Verdict } from '../lib/types';
import styles from './sub.module.css';

export function VerdictBars({ verdicts, total }: { verdicts: Record<Verdict, number>; total: number }) {
  const max = Math.max(1, ...VERDICTS.map((verdict) => verdicts[verdict]));
  return (
    <ul className={styles.outcomeList}>
      {VERDICTS.map((verdict) => {
        const meta = VERDICT_META[verdict];
        const value = verdicts[verdict];
        return (
          <li key={verdict} className={styles.outcomeRow}>
            <span className={styles.outcomeLabel}>
              <span className={cx(styles.outcomeCode, styles[`tone_${meta.tone}`])}>{meta.short}</span>
              {meta.label}
            </span>
            <span className={styles.barTrack} aria-hidden="true">
              <span className={cx(styles.barFill, styles[`fill_${meta.tone}`])} style={{ width: `${(value / max) * 100}%` }} />
            </span>
            <span className={styles.outcomeValue}>
              <strong>{formatNumber(value)}</strong>
              <span>{total ? formatPercent(value / total) : '0.0%'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}