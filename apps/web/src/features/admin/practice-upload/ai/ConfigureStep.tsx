'use client';

import { Minus, Plus } from 'lucide-react';
import {
  AI_DIFFICULTIES,
  AI_MAX_COUNT,
  LEVELS,
  type AiDifficulty,
  type Level,
  type LevelCounts,
  type QuestionType,
} from '../ai-generate';
import { capitalize, cx } from './helpers';
import styles from './ai.module.css';

const PROMPT_TOPICS = ['Basics', 'Strings', 'Arrays', 'Recursion', 'Stacks', 'Dynamic programming'];

export interface GenerationConfig {
  topic: string;
  difficulty: AiDifficulty;
  count: number;
  mix: LevelCounts;
  questionType: QuestionType;
  instructions: string;
}

export const DEFAULT_MIX: LevelCounts = { easy: 2, medium: 2, hard: 1 };

export function configTotal(config: GenerationConfig) {
  if (config.difficulty !== 'mixed') return config.count;
  return LEVELS.reduce((sum, level) => sum + (config.mix?.[level] ?? 0), 0);
}

export function configCountError(config: GenerationConfig) {
  const total = configTotal(config);
  if (total < 1) return 'Add at least 1 problem';
  if (total > AI_MAX_COUNT) return `Total is ${total}. Keep it at ${AI_MAX_COUNT} or fewer per batch`;
  return '';
}

function toCount(value: string) {
  const parsed = Number.parseInt(value.replace(/\D/g, ''), 10);
  return Number.isFinite(parsed) ? Math.min(parsed, AI_MAX_COUNT) : 0;
}

interface CountInputProps {
  id: string;
  label: string;
  value: number;
  min: number;
  busy: boolean;
  invalid: boolean;
  onChange: (value: number) => void;
}

function CountInput({ id, label, value, min, busy, invalid, onChange }: CountInputProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.stepperButton}
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={busy || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus width={16} height={16} aria-hidden="true" />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={cx(styles.stepperInput, invalid && styles.inputError)}
        value={String(value)}
        disabled={busy}
        aria-invalid={invalid ? true : undefined}
        onFocus={(event) => event.target.select()}
        onChange={(event) => onChange(toCount(event.target.value))}
        onBlur={() => value < min && onChange(min)}
      />
      <button
        type="button"
        className={styles.stepperButton}
        aria-label={`More ${label.toLowerCase()}`}
        disabled={busy || value >= AI_MAX_COUNT}
        onClick={() => onChange(Math.min(AI_MAX_COUNT, value + 1))}
      >
        <Plus width={16} height={16} aria-hidden="true" />
      </button>
    </div>
  );
}

interface ConfigureStepProps {
  config: GenerationConfig;
  showTopic: boolean;
  topicError: string;
  busy: boolean;
  onChange: (patch: Partial<GenerationConfig>) => void;
}

export function ConfigureStep({ config, showTopic, topicError, busy, onChange }: ConfigureStepProps) {
  const mix = config.mix ?? DEFAULT_MIX;
  const total = configTotal(config);
  const countError = configCountError(config);
  const setLevel = (level: Level, value: number) => onChange({ mix: { ...mix, [level]: value } });

  return (
    <div className={cx(styles.stepBody, styles.configGrid)}>
      {showTopic && (
        <div className={cx(styles.field, styles.configWide)}>
          <label htmlFor="ai-topic" className={styles.label}>
            Topic <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="ai-topic"
            type="text"
            className={cx(styles.input, topicError && styles.inputError)}
            placeholder="e.g. Arrays, Strings, Recursion"
            value={config.topic}
            disabled={busy}
            aria-invalid={topicError ? true : undefined}
            aria-describedby={topicError ? 'ai-topic-error' : undefined}
            onChange={(event) => onChange({ topic: event.target.value })}
          />
          {topicError && (
            <p id="ai-topic-error" className={styles.error}>
              {topicError}
            </p>
          )}
          <div className={styles.chips}>
            {PROMPT_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className={cx(styles.chip, config.topic === topic && styles.chipActive)}
                disabled={busy}
                onClick={() => onChange({ topic })}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      <fieldset className={cx(styles.fieldset, styles.configWide)} disabled={busy}>
        <legend className={styles.label}>Difficulty</legend>
        <div className={styles.segmented}>
          {AI_DIFFICULTIES.map((level) => (
            <label key={level} className={cx(styles.segment, config.difficulty === level && styles.segmentActive)}>
              <input
                type="radio"
                name="ai-difficulty"
                value={level}
                checked={config.difficulty === level}
                onChange={() => onChange({ difficulty: level })}
              />
              {capitalize(level)}
            </label>
          ))}
        </div>
        <p className={styles.hint}>
          {config.difficulty === 'mixed'
            ? 'Set how many easy, medium and hard problems to generate'
            : `Every problem will be ${config.difficulty}`}
        </p>
      </fieldset>

      <div className={cx(styles.field, styles.configWide)}>
        <span className={styles.label}>Number of problems</span>
        {config.difficulty === 'mixed' ? (
          <div className={styles.mixGrid}>
            {LEVELS.map((level) => (
              <div key={level} className={styles.mixCard} data-level={level}>
                <label htmlFor={`ai-count-${level}`} className={styles.mixLabel}>
                  {capitalize(level)}
                </label>
                <CountInput
                  id={`ai-count-${level}`}
                  label={`${capitalize(level)} problems`}
                  value={mix[level]}
                  min={0}
                  busy={busy}
                  invalid={Boolean(countError)}
                  onChange={(value) => setLevel(level, value)}
                />
              </div>
            ))}
            <div className={cx(styles.mixCard, styles.mixTotal)} data-invalid={Boolean(countError)}>
              <span className={styles.mixLabel}>Total</span>
              <output className={styles.mixTotalValue} aria-live="polite">
                {total}
              </output>
            </div>
          </div>
        ) : (
          <CountInput
            id="ai-count"
            label="Problems"
            value={config.count}
            min={1}
            busy={busy}
            invalid={Boolean(countError)}
            onChange={(count) => onChange({ count })}
          />
        )}
        {countError ? (
          <p className={styles.error} role="alert">
            {countError}
          </p>
        ) : (
          <p className={styles.hint}>{`Up to ${AI_MAX_COUNT} per batch`}</p>
        )}
      </div>

      <div className={cx(styles.field, styles.configWide)}>
        <label htmlFor="ai-instructions" className={styles.label}>
          Additional instructions
        </label>
        <textarea
          id="ai-instructions"
          className={styles.input}
          rows={3}
          placeholder="e.g. Use 2D arrays, avoid recursion, keep input on one line"
          value={config.instructions}
          disabled={busy}
          onChange={(event) => onChange({ instructions: event.target.value })}
        />
        <p className={styles.hint}>Optional</p>
      </div>
    </div>
  );
}
