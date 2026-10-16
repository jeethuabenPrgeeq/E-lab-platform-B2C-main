'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, PencilLine, Plus, Sparkles, X } from 'lucide-react';
import { useTechnologies } from '../technologies/lib/api';
import { TechnologyModal } from '../technologies/TechnologyModal/TechnologyModal';
import type { TechnologyInput } from '../technologies/lib/types';
import { useUploadScope } from './scope';
import styles from './TechnologyPicker.module.css';

const METHODS = [
  { key: 'manual', label: 'Manual entry', hint: 'Fill in one problem at a time', path: '', icon: PencilLine },
  { key: 'csv', label: 'CSV upload', hint: 'Import many problems from a template', path: '/csv', icon: FileSpreadsheet },
  { key: 'ai', label: 'AI generate', hint: 'Draft problems from a file, page or prompt', path: '/ai', icon: Sparkles },
] as const;

export function technologyFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('technology');
  return value && value.trim() ? value.trim() : null;
}

interface TechnologyPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  wrapClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
}

export function TechnologyPicker({ value, onChange, disabled, wrapClassName, labelClassName, selectClassName }: TechnologyPickerProps) {
  const router = useRouter();
  const scope = useUploadScope();
  const { items, loaded, loadError, create } = useTechnologies(scope.technologiesPath);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const names = useMemo(() => items.filter((item) => item.status === 'active').map((item) => item.name), [items]);

  useEffect(() => {
    if (loaded && names.length > 0 && !names.includes(value)) onChange(names[0]);
  }, [loaded, names, value, onChange]);

  useEffect(() => {
    if (!created) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreated(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [created]);

  const submit = async (input: TechnologyInput) => {
    const result = await create({ ...input, status: 'active' });
    if (!result.ok) return result.error;
    setAdding(false);
    onChange(input.name);
    setCreated(input.name);
    return null;
  };

  const choose = (href: string) => {
    if (!created) return;
    const name = created;
    setCreated(null);
    router.push(`${href}?technology=${encodeURIComponent(name)}`);
  };

  return (
    <>
      <div className={styles.picker}>
        <label className={wrapClassName}>
          <span className={labelClassName}>Technology</span>
          <select className={selectClassName} value={names.includes(value) ? value : ''} disabled={disabled || !loaded || names.length === 0} onChange={(event) => onChange(event.target.value)}>
            {!loaded && <option value="">Loading…</option>}
            {loaded && names.length === 0 && <option value="">{loadError ? 'Could not load' : 'No active technologies'}</option>}
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {scope.canCreateTechnology && (
          <button type="button" className={styles.addButton} disabled={disabled} onClick={() => setAdding(true)}>
            <Plus width={16} height={16} aria-hidden="true" />
            New technology
          </button>
        )}
      </div>

      {adding && <TechnologyModal initial={null} items={items} lockedStatus="active" onCancel={() => setAdding(false)} onSubmit={submit} />}

      {created && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreated(null);
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="upload-method-title">
            <div className={styles.modalHead}>
              <div>
                <h2 id="upload-method-title" className={styles.modalTitle}>
                  How do you want to add problems?
                </h2>
                <p className={styles.modalText}>{`${created} is ready. Pick an upload method to continue.`}</p>
              </div>
              <button type="button" className={styles.iconButton} aria-label="Close" onClick={() => setCreated(null)}>
                <X width={18} height={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.methods}>
              {METHODS.map(({ key, label, hint, path, icon: Icon }) => (
                <button key={key} type="button" className={styles.method} onClick={() => choose(`${scope.basePath}${path}`)}>
                  <span className={styles.methodIcon}>
                    <Icon width={20} height={20} aria-hidden="true" />
                  </span>
                  <span className={styles.methodLabel}>{label}</span>
                  <span className={styles.methodHint}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}