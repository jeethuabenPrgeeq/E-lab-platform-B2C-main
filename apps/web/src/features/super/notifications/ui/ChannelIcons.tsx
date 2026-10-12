'use client';

import { Bell, Mail, Smartphone } from 'lucide-react';
import { CHANNEL_META } from '../lib/shared';
import type { Channel } from '../lib/types';
import styles from './notifications.module.css';

const CHANNEL_ICON: Record<Channel, typeof Bell> = { in_app: Bell, email: Mail, push: Smartphone };

export function ChannelIcons({ channels }: { channels: Channel[] }) {
  return (
    <span className={styles.channelIcons}>
      {channels.map((channel) => {
        const Icon = CHANNEL_ICON[channel];
        return (
          <span key={channel} className={styles.channelIcon} title={CHANNEL_META[channel].label}>
            <Icon width={13} height={13} aria-hidden="true" />
            <span className={styles.srOnly}>{CHANNEL_META[channel].label}</span>
          </span>
        );
      })}
    </span>
  );
}

