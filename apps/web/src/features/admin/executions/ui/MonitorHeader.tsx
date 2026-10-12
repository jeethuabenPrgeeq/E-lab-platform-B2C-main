import type { ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { cx } from '../lib/shared';
import { ExecTabs } from '../ExecTabs/ExecTabs';
import styles from './monitor.module.css';

interface MonitorHeaderProps {
  subtitle: string;
  live: boolean;
  firing: number;
  onToggleLive: () => void;
  onReset: () => void;
  children?: ReactNode;
}

export function MonitorHeader({ subtitle, live, firing, onToggleLive, onReset, children }: MonitorHeaderProps) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Execution Monitoring</h1>
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
      <ExecTabs firing={firing} />
    </>
  );
}