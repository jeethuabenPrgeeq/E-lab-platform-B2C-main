'use client';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Braces,
  CheckCircle2,
  Clock3,
  Code2,
  Layers3,
  LogOut,
  Target,
  Trophy,
  UserRound,
} from 'lucide-react';

import {
  useEffect,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  getRoadmapModule,
  getStackBySlug,
} from '@/features/stack-engine';

import {
  getProblemsForStackModule,
} from '@/features/problem-engine';

import styles from '../../../stacks.module.css';

function DifficultyBadge({
  difficulty,
}: {
  difficulty:
    | 'Easy'
    | 'Medium'
    | 'Hard';
}) {
  return (
    <span
      className={`${styles.difficultyBadge} ${
        difficulty === 'Easy'
          ? styles.difficultyEasy
          : difficulty === 'Medium'
            ? styles.difficultyMedium
            : styles.difficultyHard
      }`}
    >
      {difficulty}
    </span>
  );
}

export default function ModuleProblemsPage() {
  const router = useRouter();

  const params =
    useParams<{
      domainSlug: string;
      stackSlug: string;
      moduleSlug: string;
    }>();

  const {
    domainSlug,
    stackSlug,
    moduleSlug,
  } = params;

  const stack =
    getStackBySlug(
      domainSlug,
      stackSlug,
    );

  const module =
    getRoadmapModule(
      stackSlug,
      moduleSlug,
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
      router.replace('/login');
    }
  }, [router]);

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!stack || !module) {
    return (
      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.container
          }
        >
          <div
            className={
              styles.notFound
            }
          >
            <h1>
              Module not found
            </h1>

            <button
              onClick={() =>
                router.push(
                  `/stacks/${domainSlug}/${stackSlug}`,
                )
              }
            >
              Return to roadmap
            </button>
          </div>
        </div>
      </main>
    );
  }

  const problems =
  getProblemsForStackModule(
    stackSlug,
    moduleSlug,
  );

  /* =======================================================
     SOLVE
  ======================================================= */

  const openProblem = (
    problemSlug: string,
  ) => {
    const query =
      new URLSearchParams({
        domain: domainSlug,
        stack: stackSlug,
        module: moduleSlug,

        technology:
          module.technologySlug ??
          moduleSlug,
      });

    router.push(
      `/workspace/${problemSlug}?${query.toString()}`,
    );
  };

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

    router.replace('/login');
  };

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
          <button
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

          <nav
            className={
              styles.navShell
            }
          >
            <button
              className={
                styles.navButton
              }
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
              className={`${styles.navButton} ${styles.activeNav}`}
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
              <span
                className={
                  styles.userName
                }
              >
                Learner
              </span>

              <span
                className={
                  styles.userRole
                }
              >
                Practice Workspace
              </span>
            </div>

            <button
              className={
                styles.logout
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
        <button
          className={
            styles.backButton
          }
          onClick={() =>
            router.push(
              `/stacks/${domainSlug}/${stackSlug}`,
            )
          }
        >
          <ArrowLeft />

          {stack.name}
        </button>

        {/* =================================================
            MODULE HEADER
        ================================================= */}

        <section
          className={
            styles.problemModuleHeader
          }
        >
          <div
            className={
              styles.problemModuleIcon
            }
          >
            <BookOpen />
          </div>

          <div
            className={
              styles.problemModuleInfo
            }
          >
            <span
              className={
                styles.modulePhaseLabel
              }
            >
              {module.phase}
            </span>

            <h1>
              {module.name}
            </h1>

            <p>
              {
                module.description
              }
            </p>

            <div
              className={
                styles.moduleTopicTags
              }
            >
              {module.topics.map(
                (topic) => (
                  <span
                    key={topic}
                  >
                    {topic}
                  </span>
                ),
              )}
            </div>
          </div>

          <div
            className={
              styles.problemSummary
            }
          >
            <strong>
              {
                problems.length
              }
            </strong>

            <span>
              Practice Problems
            </span>
          </div>
        </section>

        {/* =================================================
            PROBLEM LIST HEADING
        ================================================= */}

        <section
          className={
            styles.problemListHeader
          }
        >
          <div>
            <span>
              HANDS-ON PRACTICE
            </span>

            <h2>
              Problems to solve
            </h2>

            <p>
              Solve these exercises to
              strengthen your{' '}
              {module.name} skills.
            </p>
          </div>
        </section>

        {/* =================================================
            PROBLEMS
        ================================================= */}

        {problems.length >
        0 ? (
          <section
            className={
              styles.problemList
            }
          >
            {problems.map(
              (
                problem,
                index,
              ) => (
                <article
                  key={
                    problem.slug
                  }
                  className={
                    styles.problemCard
                  }
                >
                  {/* NUMBER */}

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

                  {/* CONTENT */}

                  <div
                    className={
                      styles.problemContent
                    }
                  >
                    <div
                      className={
                        styles.problemMetaTop
                      }
                    >
                      <DifficultyBadge
                        difficulty={
                          problem.difficulty
                        }
                      />

                      <span
                        className={
                          styles.problemTime
                        }
                      >
                        <Clock3 />

                        {
                          problem.estimatedMinutes
                        }{' '}
                        min
                      </span>
                    </div>

                    <h3>
                      {
                        problem.title
                      }
                    </h3>

                    <p>
                      {
                        problem.shortDescription
                      }
                    </p>

                    <div
                      className={
                        styles.problemSkills
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

                  {/* STATUS */}

                  <div
                    className={
                      styles.problemStatus
                    }
                  >
                    <Target />

                    <span>
                      Not Attempted
                    </span>
                  </div>

                  {/* SOLVE */}

                  <button
                    className={
                      styles.solveButton
                    }
                    onClick={() =>
                      openProblem(
                        problem.slug,
                      )
                    }
                  >
                    Solve

                    <ArrowRight />
                  </button>
                </article>
              ),
            )}
          </section>
        ) : (
          <section
            className={
              styles.noProblems
            }
          >
            <Code2 />

            <h2>
              Problems coming soon
            </h2>

            <p>
              Practice problems for
              this module have not yet
              been added.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}