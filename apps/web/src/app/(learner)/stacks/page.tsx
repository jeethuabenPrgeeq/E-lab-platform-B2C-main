'use client';

import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Braces,
  Cloud,
  Code2,
  Database,
  GitBranch,
  Layers3,
  LockKeyhole,
  LogOut,
  Smartphone,
  Trophy,
  UserRound,
  Workflow,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  getStacksByDomain,
  stackDomains,
} from '@/features/stack-engine';

import styles from './stacks.module.css';

/* =========================================================
   DOMAIN ICON
========================================================= */

function DomainIcon({
  slug,
}: {
  slug: string;
}) {
  switch (slug) {
    case 'full-stack':
      return <Code2 />;

    case 'data-analytics':
      return <BarChart3 />;

    case 'data-engineering':
      return <Workflow />;

    case 'ai-ml':
      return <BrainCircuit />;

    case 'cloud-devops':
      return <Cloud />;

    case 'cybersecurity':
      return <LockKeyhole />;

    case 'mobile-development':
      return <Smartphone />;

    case 'database-engineering':
      return <Database />;

    default:
      return <Layers3 />;
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function StacksPage() {
  const router = useRouter();

  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState('');

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
      return;
    }

    setCheckingAuth(false);
  }, [router]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredDomains =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return stackDomains;
      }

      return stackDomains.filter(
        (domain) =>
          domain.name
            .toLowerCase()
            .includes(value) ||
          domain.description
            .toLowerCase()
            .includes(value) ||
          domain.pathDescription
            .toLowerCase()
            .includes(value),
      );
    }, [search]);

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

  if (checkingAuth) {
    return null;
  }

  return (
    <main className={styles.page}>
      {/* =================================================
          TOP HEADER
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

          {/* NAVIGATION */}

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
        {/* INTRO */}

        <section
          className={
            styles.pageHeading
          }
        >
          <div>
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
              Choose your career domain
            </h1>

            <p
              className={
                styles.pageDescription
              }
            >
              Follow a structured
              technology roadmap from
              fundamentals through
              advanced hands-on
              projects.
            </p>
          </div>

          <div
            className={
              styles.domainSummary
            }
          >
            <strong>
              {
                stackDomains.length
              }
            </strong>

            <span>
              Career domains
            </span>
          </div>
        </section>

        {/* SEARCH */}

        <section
          className={
            styles.toolbar
          }
        >
          <div
            className={
              styles.searchBox
            }
          >
            <Layers3 />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search Full Stack, Data Analytics, AI, Cloud..."
            />
          </div>
        </section>

        {/* DOMAIN GRID */}

        <section
          className={
            styles.domainGrid
          }
        >
          {filteredDomains.map(
            (domain) => {
              const domainStacks =
                getStacksByDomain(
                  domain.slug,
                );

              return (
                <button
                  key={domain.slug}
                  className={
                    styles.domainCard
                  }
                  onClick={() =>
                    router.push(
                      `/stacks/${domain.slug}`,
                    )
                  }
                >
                  <div
                    className={
                      styles.cardTop
                    }
                  >
                    <div
                      className={
                        styles.domainIcon
                      }
                    >
                      <DomainIcon
                        slug={
                          domain.slug
                        }
                      />
                    </div>

                    <span
                      className={
                        styles.stackCount
                      }
                    >
                      {
                        domainStacks.length
                      }{' '}
                      stacks
                    </span>
                  </div>

                  <h2>
                    {domain.name}
                  </h2>

                  <p
                    className={
                      styles.domainDescription
                    }
                  >
                    {
                      domain.description
                    }
                  </p>

                  <div
                    className={
                      styles.pathBox
                    }
                  >
                    <span>
                      Learning path
                    </span>

                    <p>
                      {
                        domain.pathDescription
                      }
                    </p>
                  </div>

                  <div
                    className={
                      styles.cardFooter
                    }
                  >
                    <span>
                      Explore domain
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
              );
            },
          )}
        </section>
      </div>
    </main>
  );
}