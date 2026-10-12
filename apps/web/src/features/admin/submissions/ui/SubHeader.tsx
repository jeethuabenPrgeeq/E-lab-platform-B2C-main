import type { ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { cx } from '../lib/shared';
import { SubTabs } from '../SubTabs/SubTabs';
import styles from './sub.module.css';

interface SubHeaderProps {
  subtitle: string;
  live: boolean;
  pending: number;
  running: boolean;
  onToggleLive: () => void;
  onReset: () => void;
  children?: ReactNode;
}

export function SubHeader({ subtitle, live, pending, running, onToggleLive, onReset, children }: SubHeaderProps) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Submission Monitoring</h1>
            <span className={cx(styles.live, !live && styles.livePaused)}>{live ? 'Live' : 'Paused'}</span>
          </div>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={onReset}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Reset demo data
          </button>
          <button type="button" className={styles.ghostButton} onClick={onToggleLive} aria-pressed={!live}>
            {live ? <Pause width={16} height={16} aria-hidden="true" /> : <Play width={16} height={16} aria-hidden="true" />}
            {live ? 'Pause updates' : 'Resume updates'}
          </button>
          {children}
        </div>
      </div>
      <SubTabs pending={pending} running={running} />
    </>
  );
}