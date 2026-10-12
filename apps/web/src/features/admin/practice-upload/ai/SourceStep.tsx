'use client';

import { useRef, useState, type DragEvent } from 'react';
import {
  AlignLeft,
  FileCode,
  FileText,
  FileType,
  Link2,
  MessageSquareText,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  MIN_TEXT_CHARS,
  SOURCE_META,
  SOURCE_TYPES,
  isFileSource,
  type FileMeta,
  type SourceType,
} from '../ai-source';
import { cx, formatBytes } from './helpers';
import styles from './ai.module.css';

const ICONS: Record<SourceType, LucideIcon> = {
  pdf: FileText,
  docx: FileType,
  html: FileCode,
  url: Link2,
  text: AlignLeft,
  prompt: MessageSquareText,
};

interface SourceStepProps {
  source: SourceType | null;
  fileMeta: FileMeta | null;
  hasFile: boolean;
  url: string;
  text: string;
  error: string;
  busy: boolean;
  onSource: (value: SourceType) => void;
  onFile: (file: File) => void;
  onClearFile: () => void;
  onUrl: (value: string) => void;
  onText: (value: string) => void;
}

export function SourceStep({
  source,
  fileMeta,
  hasFile,
  url,
  text,
  error,
  busy,
  onSource,
  onFile,
  onClearFile,
  onUrl,
  onText,
}: SourceStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const meta = source ? SOURCE_META[source] : null;
  const SourceIcon = source ? ICONS[source] : null;

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped && !busy) onFile(dropped);
  };

  return (
    <div className={styles.stepBody}>
      <div className={styles.sourceGrid} role="radiogroup" aria-label="Content source">
        {SOURCE_TYPES.map((type) => {
          const Icon = ICONS[type];
          const active = source === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={active}
              className={cx(styles.sourceTile, active && styles.sourceTileActive)}
              disabled={busy}
              onClick={() => onSource(type)}
            >
              <span className={styles.sourceIcon} aria-hidden="true">
                <Icon width={22} height={22} />
              </span>
              <span className={styles.sourceLabel}>{SOURCE_META[type].label}</span>
              <span className={styles.sourceDesc}>{SOURCE_META[type].description}</span>
            </button>
          );
        })}
      </div>

      {source && isFileSource(source) && meta && (
        <div className={styles.sourceInput}>
          {fileMeta ? (
            <div className={styles.fileChip}>
              <span className={styles.fileIcon} aria-hidden="true">
                {SourceIcon && <SourceIcon width={20} height={20} />}
              </span>
              <div className={styles.fileText}>
                <p className={styles.fileName}>{fileMeta.name}</p>
                <p className={styles.fileMeta}>
                  {hasFile ? formatBytes(fileMeta.size) : 'Restored from this session · choose it again to re-extract'}
                </p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Remove file"
                disabled={busy}
                onClick={onClearFile}
              >
                <X width={16} height={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div
              className={cx(styles.dropzone, dragging && styles.dropzoneActive)}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <Upload width={22} height={22} aria-hidden="true" />
              <p className={styles.dropTitle}>{`Drop your ${meta.label} file here`}</p>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Browse file
              </button>
              <p className={styles.hint}>{`${meta.extensions?.map((ext) => `.${ext}`).join(', ')} · up to 10 MB`}</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={meta.accept}
            hidden
            onChange={(event) => {
              const picked = event.target.files?.[0];
              if (picked) onFile(picked);
              event.target.value = '';
            }}
          />
        </div>
      )}

      {source === 'url' && (
        <div className={cx(styles.field, styles.sourceInput)}>
          <label htmlFor="ai-url" className={styles.label}>
            Page link <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="ai-url"
            type="url"
            inputMode="url"
            className={cx(styles.input, error && styles.inputError)}
            placeholder="https://example.com/c-programming/arrays"
            value={url}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onUrl(event.target.value)}
          />
          <p className={styles.hint}>Public pages only. Pages behind a login cannot be read.</p>
        </div>
      )}

      {source === 'text' && (
        <div className={cx(styles.field, styles.sourceInput)}>
          <label htmlFor="ai-text" className={styles.label}>
            Content <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <textarea
            id="ai-text"
            rows={8}
            className={cx(styles.input, error && styles.inputError)}
            placeholder="Paste lesson notes, a chapter or a tutorial section"
            value={text}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onText(event.target.value)}
          />
          <p className={styles.hint}>
            {text.trim().length < MIN_TEXT_CHARS
              ? `At least ${MIN_TEXT_CHARS} characters · ${text.trim().length} so far`
              : `${text.trim().length.toLocaleString('en-US')} characters`}
          </p>
        </div>
      )}

      {source === 'prompt' && (
        <div className={cx(styles.notice, styles.sourceInput)}>
          No source material. AI writes problems from the topic and instructions you give in the next step.
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}