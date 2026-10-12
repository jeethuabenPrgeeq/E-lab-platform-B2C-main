import { OUTCOMES, OUTCOME_META, cx, formatNumber, formatPercent } from '../lib/shared';
import type { Outcome } from '../lib/types';
import styles from './monitor.module.css';

export function OutcomeBars({ outcomes, total }: { outcomes: Record<Outcome, number>; total: number }) {
  const max = Math.max(1, ...OUTCOMES.map((outcome) => outcomes[outcome]));
  return (
    <ul className={styles.outcomeList}>
      {OUTCOMES.map((outcome) => {
        const meta = OUTCOME_META[outcome];
        const value = outcomes[outcome];
        return (
          <li key={outcome} className={styles.outcomeRow}>
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