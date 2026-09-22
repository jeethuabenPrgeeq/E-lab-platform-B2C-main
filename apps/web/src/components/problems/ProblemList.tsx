import {
  Code2,
} from 'lucide-react';

import type {
  PracticeProblem,
  ProblemContext,
} from '@/features/problem-engine';

import ProblemCard from './ProblemCard';

import styles from './problems.module.css';

type ProblemListProps = {
  problems: PracticeProblem[];

  context: ProblemContext;

  emptyTitle?: string;

  emptyDescription?: string;
};

export default function ProblemList({
  problems,
  context,
  emptyTitle =
    'No problems available',
  emptyDescription =
    'Practice problems have not yet been added.',
}: ProblemListProps) {
  if (
    problems.length ===
    0
  ) {
    return (
      <div
        className={
          styles.empty
        }
      >
        <Code2 />

        <h2>
          {emptyTitle}
        </h2>

        <p>
          {
            emptyDescription
          }
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        styles.problemList
      }
    >
      {problems.map(
        (
          problem,
          index,
        ) => (
          <ProblemCard
            key={
              problem.slug
            }
            problem={
              problem
            }
            index={
              index
            }
            context={
              context
            }
          />
        ),
      )}
    </div>
  );
}