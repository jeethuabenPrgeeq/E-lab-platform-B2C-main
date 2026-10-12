import Link from 'next/link';
import { FileSpreadsheet, PencilLine, Sparkles } from 'lucide-react';
import styles from './UploadModeSwitch.module.css';

const MODES = [
  { key: 'manual', label: 'Manual entry', href: '/content-import', icon: PencilLine },
  { key: 'csv', label: 'CSV upload', href: '/content-import/csv', icon: FileSpreadsheet },
  { key: 'ai', label: 'AI generate', href: '/content-import/ai', icon: Sparkles },
] as const;

export function UploadModeSwitch({ active }: { active: (typeof MODES)[number]['key'] }) {
  return (
    <nav className={styles.switch} aria-label="Upload method">
      {MODES.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className={`${styles.option} ${active === key ? styles.active : ''}`}
          aria-current={active === key ? 'page' : undefined}
        >
          <Icon width={16} height={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}