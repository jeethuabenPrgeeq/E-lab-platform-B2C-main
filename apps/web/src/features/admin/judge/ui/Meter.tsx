import { cx, meterTone } from '../lib/shared';
import styles from './judge.module.css';

export function Meter({ value, label, off }: { value: number; label: string; off?: boolean }) {
  if (off) return <span className={styles.muted}>—</span>;
  const tone = meterTone(value);
  return (
    <div className={styles.meter} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={styles.meterTrack}>
        <div className={cx(styles.meterFill, styles[`fill_${tone}`])} style={{ width: `${value}%` }} />
      </div>
      <span className={styles.meterValue}>{`${value}%`}</span>
    </div>
  );
}