'use client';

import {
  ArrowLeft,
  ArrowRight,
  Braces,
  Code2,
  Layers3,
  LogOut,
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
  getDomainBySlug,
  getStacksByDomain,
} from '@/features/stack-engine';

import styles from '../stacks.module.css';

export default function DomainPage() {
  const router = useRouter();

  const params =
    useParams<{
      domainSlug: string;
    }>();

  const domainSlug =
    params.domainSlug;

  const domain =
    getDomainBySlug(
      domainSlug,
    );

  const domainStacks =
    getStacksByDomain(
      domainSlug,
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

  if (!domain) {
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
              Domain not found
            </h1>

            <button
              onClick={() =>
                router.push(
                  '/stacks',
                )
              }
            >
              Back to Domains
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* HEADER */}

      <header className={styles.header}>
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
              onClick={logout}
            >
              <LogOut />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}

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
              '/stacks',
            )
          }
        >
          <ArrowLeft />
          All Domains
        </button>

        <section
          className={
            styles.domainHeader
          }
        >
          <div
            className={
              styles.eyebrow
            }
          >
            <Layers3 />
            Targeted Stack
          </div>

          <h1
            className={
              styles.pageTitle
            }
          >
            {domain.name}
          </h1>

          <p
            className={
              styles.pageDescription
            }
          >
            {
              domain.description
            }
          </p>

          <div
            className={
              styles.domainPath
            }
          >
            {
              domain.pathDescription
            }
          </div>
        </section>

        {/* STACKS */}

        {domainStacks.length >
        0 ? (
          <section
            className={
              styles.stackGrid
            }
          >
            {domainStacks.map(
              (stack) => (
                <button
                  key={stack.slug}
                  className={
                    styles.stackCard
                  }
                  onClick={() =>
                    router.push(
                      `/stacks/${domainSlug}/${stack.slug}`,
                    )
                  }
                >
                  <div
                    className={
                      styles.stackCardHeader
                    }
                  >
                    <div
                      className={
                        styles.stackLogo
                      }
                    >
                      {
                        stack.shortName
                      }
                    </div>

                    <span
                      className={
                        styles.level
                      }
                    >
                      {stack.level}
                    </span>
                  </div>

                  <h2>
                    {stack.name}
                  </h2>

                  <p
                    className={
                      styles.stackDescription
                    }
                  >
                    {
                      stack.description
                    }
                  </p>

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
                          {
                            technology
                          }
                        </span>
                      ),
                    )}
                  </div>

                  <div
                    className={
                      styles.cardFooter
                    }
                  >
                    <span>
                      View learning
                      roadmap
                    </span>

                    <div
                      className={
                        styles.arrowButton
                      }
                    >
                      <ArrowRight />
                    </div>
                  </div>
                </button>
              ),
            )}
          </section>
        ) : (
          <section
            className={
              styles.comingSoon
            }
          >
            <Layers3 />

            <h2>
              Learning paths coming
              soon
            </h2>

            <p>
              This domain is ready,
              but stack roadmaps have
              not yet been added.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}