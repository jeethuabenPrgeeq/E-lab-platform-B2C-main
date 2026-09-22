import type {
  ProblemDifficulty,
} from '@/features/problem-engine';

import styles from './problems.module.css';

type DifficultyBadgeProps = {
  difficulty: ProblemDifficulty;
};

export default function DifficultyBadge({
  difficulty,
}: DifficultyBadgeProps) {
  return (
    <span
      className={`${styles.difficultyBadge} ${
        difficulty === 'Easy'
          ? styles.easy
          : difficulty ===
              'Medium'
            ? styles.medium
            : styles.hard
      }`}
    >
      {difficulty}
    </span>
  );
}