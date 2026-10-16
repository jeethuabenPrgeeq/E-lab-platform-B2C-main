import styles from './test-cases.module.css';
import type { Difficulty } from './types';

export const MASK = '•'.repeat(6);

export function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: styles.badgeEasy,
  medium: styles.badgeMedium,
  hard: styles.badgeHard,
};