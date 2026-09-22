'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Target,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import type {
  PracticeProblem,
  ProblemContext,
} from '@/features/problem-engine';

import {
  isProblemSolved,
} from '@/features/progress/local-progress';

import DifficultyBadge from './DifficultyBadge';

import styles from './problems.module.css';

/* =========================================================
   PROPS
========================================================= */

type ProblemCardProps = {
  problem: PracticeProblem;

  index: number;

  context: ProblemContext;
};

/* =========================================================
   PROBLEM CARD
========================================================= */

export default function ProblemCard({
  problem,
  index,
  context,
}: ProblemCardProps) {
  const router =
    useRouter();

  /* =======================================================
     SOLVED STATUS
  ======================================================= */

  const [
    solved,
    setSolved,
  ] = useState(
    false,
  );

  /*
   * Read solved state after
   * component mounts.
   *
   * This avoids accessing
   * localStorage during SSR.
   */

  useEffect(() => {
    const currentSolvedStatus =
      isProblemSolved(
        problem.slug,
      );

    setSolved(
      currentSolvedStatus,
    );
  }, [
    problem.slug,
  ]);

  /* =======================================================
     OPEN SHARED WORKSPACE
  ======================================================= */

  const openProblem = () => {
    const query =
      new URLSearchParams();

    /* =====================================================
       SOURCE
    ===================================================== */

    query.set(
      'source',
      context.source,
    );

    /* =====================================================
       PRACTICE TECHNOLOGY
    ===================================================== */

    if (
      context.technologySlug
    ) {
      query.set(
        'technology',
        context.technologySlug,
      );
    }

    /* =====================================================
       DOMAIN
    ===================================================== */

    if (
      context.domainSlug
    ) {
      query.set(
        'domain',
        context.domainSlug,
      );
    }

    /* =====================================================
       STACK
    ===================================================== */

    if (
      context.stackSlug
    ) {
      query.set(
        'stack',
        context.stackSlug,
      );
    }

    /* =====================================================
       MODULE
    ===================================================== */

    if (
      context.moduleSlug
    ) {
      query.set(
        'module',
        context.moduleSlug,
      );
    }

    /* =====================================================
       CHALLENGE
    ===================================================== */

    if (
      context.challengeSlug
    ) {
      query.set(
        'challenge',
        context.challengeSlug,
      );
    }

    /* =====================================================
       ATTEMPT
    ===================================================== */

    if (
      context.attemptId
    ) {
      query.set(
        'attempt',
        context.attemptId,
      );
    }

    /* =====================================================
       OPEN WORKSPACE
    ===================================================== */

    router.push(
      `/workspace/${problem.slug}?${query.toString()}`,
    );
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <article
      className={
        styles.problemCard
      }
    >
      {/* =================================================
          NUMBER
      ================================================= */}

      <div
        className={
          styles.problemNumber
        }
      >
        {String(
          index + 1,
        ).padStart(
          2,
          '0',
        )}
      </div>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div
        className={
          styles.problemContent
        }
      >
        {/* ===============================================
            META
        =============================================== */}

        <div
          className={
            styles.problemMeta
          }
        >
          <DifficultyBadge
            difficulty={
              problem.difficulty
            }
          />

          <span
            className={
              styles.time
            }
          >
            <Clock3 />

            {
              problem.estimatedMinutes
            }{' '}
            min
          </span>

          {/* =============================================
              SOLVED BADGE
          ============================================= */}

          {solved && (
            <span
              className={
                styles.solvedStatus
              }
            >
              <CheckCircle2 />

              Solved
            </span>
          )}
        </div>

        {/* ===============================================
            TITLE
        =============================================== */}

        <h3>
          {problem.title}
        </h3>

        {/* ===============================================
            DESCRIPTION
        =============================================== */}

        <p>
          {
            problem.shortDescription
          }
        </p>

        {/* ===============================================
            SKILLS
        =============================================== */}

        <div
          className={
            styles.skills
          }
        >
          {problem.skills.map(
            (
              skill,
            ) => (
              <span
                key={
                  skill
                }
              >
                {skill}
              </span>
            ),
          )}
        </div>
      </div>

      {/* =================================================
          STATUS
      ================================================= */}

      <div
        className={
          styles.status
        }
      >
        {solved ? (
          <>
            <CheckCircle2 />

            <span>
              Solved
            </span>
          </>
        ) : (
          <>
            <Target />

            <span>
              Not Attempted
            </span>
          </>
        )}
      </div>

      {/* =================================================
          SOLVE / SOLVE AGAIN
      ================================================= */}

      <button
        type="button"
        className={
          styles.solveButton
        }
        onClick={
          openProblem
        }
        aria-label={
          solved
            ? `Solve ${problem.title} again`
            : `Solve ${problem.title}`
        }
      >
        {solved
          ? 'Solve Again'
          : 'Solve'}

        <ArrowRight />
      </button>
    </article>
  );
}