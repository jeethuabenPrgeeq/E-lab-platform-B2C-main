'use client';

import {
  ArrowLeft,
  BookOpen,
  Braces,
  Code2,
  Layers3,
  LogOut,
  Trophy,
  UserRound,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  getProblemsBySlugs,
} from '@/features/problem-engine';

import {
  getPracticePathByTechnology,
  type PracticeLevel,
} from '@/features/practice-path-engine';

import {
  getSolvedProblemSlugs,
} from '@/features/progress/local-progress';

import ProblemList from '@/components/problems/ProblemList';

import styles from './practice.module.css';

/* =========================================================
   FILTER TYPE
========================================================= */

type LevelFilter =
  | 'All'
  | PracticeLevel;

/* =========================================================
   PAGE
========================================================= */

export default function TechnologyPracticePage() {
  const router =
    useRouter();

  const params =
    useParams<{
      technologySlug: string;
    }>();

  const technologySlug =
    params.technologySlug;

  /* =======================================================
     PRACTICE PATH
  ======================================================= */

  const practicePath =
    getPracticePathByTechnology(
      technologySlug,
    );

  /* =======================================================
     FILTER
  ======================================================= */

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState<LevelFilter>(
    'All',
  );

  /* =======================================================
     SOLVED PROBLEM STATE
  ======================================================= */

  const [
    solvedProblemSlugs,
    setSolvedProblemSlugs,
  ] = useState<string[]>(
    [],
  );

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const authenticated =
      localStorage.getItem(
        'elab_dummy_auth',
      ) === 'true';

    if (!authenticated) {
      router.replace(
        '/login',
      );
    }
  }, [
    router,
  ]);

  /* =======================================================
     ALL PROBLEM SLUGS IN CURRENT PRACTICE PATH
  ======================================================= */

  const pathProblemSlugs =
    useMemo(() => {
      if (!practicePath) {
        return [];
      }

      return practicePath
        .stages
        .flatMap(
          (stage) =>
            stage.problemSlugs,
        );
    }, [
      practicePath,
    ]);

  /* =======================================================
     REFRESH PROGRESS
  ======================================================= */

  const refreshProgress =
    useCallback(() => {
      const solved =
        getSolvedProblemSlugs();

      setSolvedProblemSlugs(
        solved,
      );
    }, []);

  /*
   * Read solved state when
   * this page loads.
   */

  useEffect(() => {
    refreshProgress();
  }, [
    refreshProgress,
    technologySlug,
  ]);

  /*
   * Useful when learner returns
   * from another browser tab/window
   * or after workspace navigation.
   */

  useEffect(() => {
    const handleFocus = () => {
      refreshProgress();
    };

    const handlePageShow = () => {
      refreshProgress();
    };

    window.addEventListener(
      'focus',
      handleFocus,
    );

    window.addEventListener(
      'pageshow',
      handlePageShow,
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus,
      );

      window.removeEventListener(
        'pageshow',
        handlePageShow,
      );
    };
  }, [
    refreshProgress,
  ]);

  /* =======================================================
     STAGES
  ======================================================= */

  const visibleStages =
    useMemo(() => {
      if (!practicePath) {
        return [];
      }

      const ordered = [
        ...practicePath.stages,
      ].sort(
        (
          a,
          b,
        ) =>
          a.order -
          b.order,
      );

      if (
        selectedLevel ===
        'All'
      ) {
        return ordered;
      }

      return ordered.filter(
        (stage) =>
          stage.level ===
          selectedLevel,
      );
    }, [
      practicePath,
      selectedLevel,
    ]);

  /* =======================================================
     TOTAL PROBLEMS
  ======================================================= */

  const totalProblems =
    pathProblemSlugs.length;

  /* =======================================================
     SOLVED COUNT
  ======================================================= */

  const solvedProblems =
    useMemo(() => {
      return pathProblemSlugs.filter(
        (problemSlug) =>
          solvedProblemSlugs.includes(
            problemSlug,
          ),
      ).length;
    }, [
      pathProblemSlugs,
      solvedProblemSlugs,
    ]);

  /* =======================================================
     PROGRESS %
  ======================================================= */

  const progress =
    totalProblems > 0
      ? Math.round(
          (
            solvedProblems /
            totalProblems
          ) *
            100,
        )
      : 0;

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
    localStorage.removeItem(
      'elab_dummy_auth',
    );

    localStorage.removeItem(
      'elab_dummy_user',
    );

    router.replace(
      '/login',
    );
  };

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!practicePath) {
    return (
      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.notFound
          }
        >
          <Code2 />

          <h1>
            Practice path not
            available
          </h1>

          <p>
            A practice path has
            not yet been created
            for{' '}
            {technologySlug}.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/dashboard',
              )
            }
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main
      className={
        styles.page
      }
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.headerInner
          }
        >
          {/* =============================================
              LOGO
          ============================================= */}

          <button
            type="button"
            className={
              styles.logoArea
            }
            onClick={() =>
              router.push(
                '/dashboard',
              )
            }
          >
            <div
              className={
                styles.logoIcon
              }
            >
              <Braces />
            </div>

            <div
              className={
                styles.logo
              }
            >
              e<span>Lab</span>
            </div>
          </button>

          {/* =============================================
              NAVIGATION
          ============================================= */}

          <nav
            className={
              styles.navShell
            }
          >
            <button
              type="button"
              className={`${styles.navButton} ${styles.activeNav}`}
              onClick={() =>
                router.push(
                  '/dashboard',
                )
              }
            >
              <Code2 />

              Start Practicing
            </button>

            <button
              type="button"
              className={
                styles.navButton
              }
              onClick={() =>
                router.push(
                  '/stacks',
                )
              }
            >
              <Layers3 />

              Targeted Stack
            </button>

            <button
              type="button"
              className={
                styles.navButton
              }
              onClick={() =>
                router.push(
                  '/challenges',
                )
              }
            >
              <Trophy />

              Real-Time Challenges
            </button>
          </nav>

          {/* =============================================
              USER
          ============================================= */}

          <div
            className={
              styles.userArea
            }
          >
            <div
              className={
                styles.avatar
              }
            >
              <UserRound />
            </div>

            <div
              className={
                styles.userText
              }
            >
              <strong>
                Learner
              </strong>

              <span>
                Practice Workspace
              </span>
            </div>

            <button
              type="button"
              className={
                styles.logoutButton
              }
              onClick={
                logout
              }
            >
              <LogOut />
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div
        className={
          styles.container
        }
      >
        {/* ===============================================
            BACK
        =============================================== */}

        <button
          type="button"
          className={
            styles.backButton
          }
          onClick={() =>
            router.push(
              '/dashboard',
            )
          }
        >
          <ArrowLeft />

          All Technologies
        </button>

        {/* =================================================
            HERO
        ================================================= */}

        <section
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.heroIcon
            }
          >
            <Code2 />
          </div>

          <div
            className={
              styles.heroContent
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              Start Practicing
            </span>

            <h1>
              {
                practicePath.name
              }
            </h1>

            <p>
              {
                practicePath.description
              }
            </p>
          </div>

          {/* =============================================
              PROGRESS
          ============================================= */}

          <div
            className={
              styles.progressCard
            }
          >
            <div>
              <strong>
                {
                  totalProblems
                }
              </strong>

              <span>
                Problems
              </span>
            </div>

            <div>
              <strong>
                {
                  solvedProblems
                }
              </strong>

              <span>
                Solved
              </span>
            </div>

            <div>
              <strong>
                {progress}%
              </strong>

              <span>
                Progress
              </span>
            </div>
          </div>
        </section>

        {/* =================================================
            FILTERS
        ================================================= */}

        <section
          className={
            styles.filters
          }
        >
          {(
            [
              'All',
              'Beginner',
              'Intermediate',
              'Advanced',
            ] as LevelFilter[]
          ).map(
            (
              level,
            ) => (
              <button
                key={
                  level
                }
                type="button"
                className={`${styles.filterButton} ${
                  selectedLevel ===
                  level
                    ? styles.filterActive
                    : ''
                }`}
                onClick={() =>
                  setSelectedLevel(
                    level,
                  )
                }
              >
                {level}
              </button>
            ),
          )}
        </section>

        {/* =================================================
            PRACTICE STAGES
        ================================================= */}

        <section
          className={
            styles.stageList
          }
        >
          {visibleStages.map(
            (
              stage,
            ) => {
              const problems =
                getProblemsBySlugs(
                  stage.problemSlugs,
                );

              /*
               * Count solved problems
               * inside this individual
               * stage.
               */

              const stageSolvedCount =
                stage.problemSlugs.filter(
                  (
                    problemSlug,
                  ) =>
                    solvedProblemSlugs.includes(
                      problemSlug,
                    ),
                ).length;

              return (
                <section
                  /*
                   * solvedProblemSlugs.length
                   * is intentionally included
                   * so returned progress causes
                   * the list to refresh.
                   */

                  key={`${stage.slug}-${solvedProblemSlugs.length}`}
                  className={
                    styles.stage
                  }
                >
                  {/* =====================================
                      STAGE HEADER
                  ===================================== */}

                  <div
                    className={
                      styles.stageHeader
                    }
                  >
                    <div
                      className={
                        styles.stageNumber
                      }
                    >
                      {String(
                        stage.order,
                      ).padStart(
                        2,
                        '0',
                      )}
                    </div>

                    <div
                      className={
                        styles.stageInfo
                      }
                    >
                      <div
                        className={
                          styles.stageMeta
                        }
                      >
                        <span>
                          {
                            stage.level
                          }
                        </span>

                        <span>
                          {
                            problems.length
                          }{' '}
                          problems
                        </span>

                        {stageSolvedCount >
                          0 && (
                          <span>
                            {
                              stageSolvedCount
                            }{' '}
                            solved
                          </span>
                        )}
                      </div>

                      <h2>
                        {
                          stage.title
                        }
                      </h2>

                      <p>
                        {
                          stage.description
                        }
                      </p>
                    </div>

                    <BookOpen
                      className={
                        styles.stageIcon
                      }
                    />
                  </div>

                  {/* =====================================
                      PROBLEMS
                  ===================================== */}

                  <div
                    className={
                      styles.problemArea
                    }
                  >
                    <ProblemList
                      /*
                       * Changing key after a
                       * solved problem forces
                       * child ProblemCards to
                       * reload their status.
                       */

                      key={`${stage.slug}-${solvedProblemSlugs.join('-')}`}
                      problems={
                        problems
                      }
                      context={{
                        source:
                          'practice',

                        technologySlug,
                      }}
                      emptyTitle="No problems available"
                      emptyDescription="Problems for this stage have not yet been added."
                    />
                  </div>
                </section>
              );
            },
          )}
        </section>
      </div>
    </main>
  );
}