'use client';

import {
  ArrowLeft,
  ArrowRight,
  Braces,
  CheckCircle2,
  Circle,
  Code2,
  Layers3,
  LockKeyhole,
  LogOut,
  Play,
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
  getRoadmapByStackSlug,
  getStackBySlug,
} from '@/features/stack-engine';

import styles from '../../stacks.module.css';

/* =========================================================
   STACK ROADMAP PAGE
========================================================= */

export default function StackRoadmapPage() {
  const router = useRouter();

  const params =
    useParams<{
      domainSlug: string;
      stackSlug: string;
    }>();

  const {
    domainSlug,
    stackSlug,
  } = params;

  const stack =
    getStackBySlug(
      domainSlug,
      stackSlug,
    );

  const roadmap =
    getRoadmapByStackSlug(
      stackSlug,
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

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!stack) {
    return (
      <main className={styles.page}>
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
              Stack not found
            </h1>

            <button
              onClick={() =>
                router.push(
                  `/stacks/${domainSlug}`,
                )
              }
            >
              Back to stacks
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     TEMPORARY FRONTEND PROGRESS
     Later this comes from Progress Engine/API
  ======================================================= */

  const overallProgress = 0;

  const completedModules = 0;

  const totalModules =
    roadmap?.modules.length ?? 0;

  return (
    <main className={styles.page}>
      {/* =================================================
          HEADER
      ================================================= */}

      <header className={styles.header}>
        <div
          className={
            styles.headerInner
          }
        >
          {/* LOGO */}

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

          {/* NAV */}

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

          {/* USER */}

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
              onClick={logout}
              aria-label="Logout"
            >
              <LogOut />
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <div
        className={
          styles.container
        }
      >
        {/* BACK */}

        <button
          className={
            styles.backButton
          }
          onClick={() =>
            router.push(
              `/stacks/${domainSlug}`,
            )
          }
        >
          <ArrowLeft />

          Back to stacks
        </button>

        {/* =================================================
            STACK HERO
        ================================================= */}

        <section
          className={
            styles.stackRoadmapHero
          }
        >
          <div
            className={
              styles.stackRoadmapInfo
            }
          >
            <div
              className={
                styles.eyebrow
              }
            >
              <Layers3 />

              Targeted Learning Path
            </div>

            <div
              className={
                styles.stackTitleRow
              }
            >
              <div
                className={
                  styles.stackHeroBadge
                }
              >
                {
                  stack.shortName
                }
              </div>

              <div>
                <h1
                  className={
                    styles.stackRoadmapTitle
                  }
                >
                  {stack.name}
                </h1>

                <p
                  className={
                    styles.stackRoadmapDescription
                  }
                >
                  {
                    stack.description
                  }
                </p>
              </div>
            </div>

            <div
              className={
                styles.technologyTags
              }
            >
              {stack.technologies.map(
                (
                  technology,
                ) => (
                  <span
                    key={
                      technology
                    }
                  >
                    {technology}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* PROGRESS */}

          <div
            className={
              styles.stackProgressCard
            }
          >
            <div
              className={
                styles.progressHeader
              }
            >
              <span>
                Overall Progress
              </span>

              <strong>
                {overallProgress}%
              </strong>
            </div>

            <div
              className={
                styles.progressTrack
              }
            >
              <div
                className={
                  styles.progressFill
                }
                style={{
                  width: `${overallProgress}%`,
                }}
              />
            </div>

            <div
              className={
                styles.progressStats
              }
            >
              <div>
                <strong>
                  {
                    completedModules
                  }
                </strong>

                <span>
                  Completed
                </span>
              </div>

              <div>
                <strong>
                  {
                    totalModules
                  }
                </strong>

                <span>
                  Modules
                </span>
              </div>
            </div>

            <p
              className={
                styles.progressHint
              }
            >
              Start with the first
              module and progress
              through the complete
              learning path.
            </p>
          </div>
        </section>

        {/* =================================================
            ROADMAP HEADER
        ================================================= */}

        <section
          className={
            styles.roadmapHeader
          }
        >
          <div>
            <span
              className={
                styles.roadmapLabel
              }
            >
              Learning Roadmap
            </span>

            <h2>
              From fundamentals to
              real-world projects
            </h2>

            <p>
              Complete each stage in
              sequence to build the
              skills required for the{' '}
              {stack.name}.
            </p>
          </div>

          <div
            className={
              styles.moduleCountBadge
            }
          >
            <strong>
              {
                totalModules
              }
            </strong>

            <span>
              Modules
            </span>
          </div>
        </section>

        {/* =================================================
            ROADMAP
        ================================================= */}

        {!roadmap ? (
          <section
            className={
              styles.comingSoon
            }
          >
            <Layers3 />

            <h2>
              Roadmap coming soon
            </h2>

            <p>
              This stack is available,
              but its detailed roadmap
              has not yet been added.
            </p>
          </section>
        ) : (
          <section
            className={
              styles.roadmapList
            }
          >
            {roadmap.modules.map(
              (
                module,
                index,
              ) => {
                /*
                 * Temporary state:
                 * First module = available.
                 * Remaining modules = visually upcoming.
                 *
                 * Later Progress Engine will determine this.
                 */

                const isFirst =
                  index === 0;

                const isCompleted =
                  false;

                const isLocked =
                  false;

                return (
                  <button
                    key={
                      module.slug
                    }
                    className={`${styles.roadmapCard} ${
                      isFirst
                        ? styles.roadmapCardActive
                        : ''
                    }`}
                    onClick={() =>
                      router.push(
                        `/stacks/${domainSlug}/${stackSlug}/${module.slug}`,
                      )
                    }
                  >
                    {/* NUMBER */}

                    <div
                      className={
                        styles.roadmapStep
                      }
                    >
                      <span>
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          '0',
                        )}
                      </span>

                      {index <
                        roadmap.modules
                          .length -
                          1 && (
                        <div
                          className={
                            styles.roadmapLine
                          }
                        />
                      )}
                    </div>

                    {/* STATUS */}

                    <div
                      className={
                        styles.roadmapStatus
                      }
                    >
                      {isCompleted ? (
                        <CheckCircle2 />
                      ) : isLocked ? (
                        <LockKeyhole />
                      ) : isFirst ? (
                        <Play />
                      ) : (
                        <Circle />
                      )}
                    </div>

                    {/* CONTENT */}

                    <div
                      className={
                        styles.roadmapContent
                      }
                    >
                      <div
                        className={
                          styles.roadmapContentTop
                        }
                      >
                        <span
                          className={
                            styles.phaseBadge
                          }
                        >
                          {
                            module.phase
                          }
                        </span>

                        {isFirst && (
                          <span
                            className={
                              styles.currentBadge
                            }
                          >
                            Start here
                          </span>
                        )}
                      </div>

                      <h3>
                        {module.name}
                      </h3>

                      <p>
                        {
                          module.description
                        }
                      </p>

                      <div
                        className={
                          styles.topicPreview
                        }
                      >
                        {module.topics
                          .slice(
                            0,
                            4,
                          )
                          .map(
                            (
                              topic,
                            ) => (
                              <span
                                key={
                                  topic
                                }
                              >
                                {topic}
                              </span>
                            ),
                          )}

                        {module.topics
                          .length >
                          4 && (
                          <span
                            className={
                              styles.moreTopics
                            }
                          >
                            +
                            {module
                              .topics
                              .length -
                              4}{' '}
                            more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* META */}

                    <div
                      className={
                        styles.roadmapActions
                      }
                    >
                      <span>
                        {
                          module
                            .topics
                            .length
                        }{' '}
                        topics
                      </span>

                      <div
                        className={
                          styles.roadmapArrow
                        }
                      >
                        <ArrowRight />
                      </div>
                    </div>
                  </button>
                );
              },
            )}
          </section>
        )}
      </div>
    </main>
  );
}