import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cx } from '../lib/shared';
import { JudgeTabs } from '../JudgeTabs/JudgeTabs';
import styles from './judge.module.css';

interface JudgeHeaderProps {
  subtitle: string;
  paused?: boolean;
  onReset: () => void;
  children?: ReactNode;
}

export function JudgeHeader({ subtitle, paused, onReset, children }: JudgeHeaderProps) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Judge Management</h1>
            <span className={cx(styles.live, paused && styles.livePaused)}>{paused ? 'Queue paused' : 'Live'}</span>
          </div>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={onReset}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Reset demo data
          </button>
          {children}
        </div>
      </div>
      <JudgeTabs />
    </>
  );
}