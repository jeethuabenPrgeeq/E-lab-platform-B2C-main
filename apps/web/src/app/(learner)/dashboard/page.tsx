"use client";

import type { ReactNode } from "react";

import { Braces, BrainCircuit, ChevronRight, Cloud, Code2, Database, GitBranch, Layers3, LogOut, Search, Server, Sparkles, Trophy, UserRound, X, Zap } from "lucide-react";

import { FaJava } from "react-icons/fa";

import { FaAws, FaCss3Alt } from "react-icons/fa6";

import { TbBrandAzure, TbBrandCSharp } from "react-icons/tb";

import { SiC, SiCplusplus, SiPython, SiJavascript, SiTypescript, SiGo, SiRuby, SiSwift, SiHtml5, SiReact, SiAngular, SiVuedotjs, SiNextdotjs, SiNodedotjs, SiExpress, SiNestjs, SiSpringboot, SiDotnet, SiDjango, SiMongodb, SiMysql, SiPostgresql, SiRedis, SiGit, SiLinux, SiDocker, SiKubernetes, SiGithubactions, SiGooglecloud } from "react-icons/si";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import styles from "./dashboard.module.css";

/* =========================================================
   TYPES
========================================================= */

type Technology = {
  name: string;
  slug: string;
  icon: ReactNode;
  category: string;
  description: string;
  color: string;
};

/* =========================================================
   TECHNOLOGIES
========================================================= */

const technologies: Technology[] = [
  /* =====================================================
     PROGRAMMING LANGUAGES
  ===================================================== */

  {
    name: "C",
    slug: "c",
    icon: <SiC />,
    category: "Programming Languages",
    description: "Procedural programming",
    color: "#5C6BC0",
  },

  {
    name: "C++",
    slug: "cpp",
    icon: <SiCplusplus />,
    category: "Programming Languages",
    description: "Object-oriented programming",
    color: "#00599C",
  },

  {
    name: "Java",
    slug: "java",
    icon: <FaJava />,
    category: "Programming Languages",
    description: "Enterprise programming",
    color: "#E76F00",
  },

  {
    name: "Python",
    slug: "python",
    icon: <SiPython />,
    category: "Programming Languages",
    description: "Programming and automation",
    color: "#3776AB",
  },

  {
    name: "JavaScript",
    slug: "javascript",
    icon: <SiJavascript />,
    category: "Programming Languages",
    description: "Modern web programming",
    color: "#C59B00",
  },

  {
    name: "TypeScript",
    slug: "typescript",
    icon: <SiTypescript />,
    category: "Programming Languages",
    description: "Typed JavaScript development",
    color: "#3178C6",
  },

  {
    name: "C#",
    slug: "csharp",
    icon: <TbBrandCSharp />,
    category: "Programming Languages",
    description: ".NET programming",
    color: "#512BD4",
  },

  {
    name: "Go",
    slug: "go",
    icon: <SiGo />,
    category: "Programming Languages",
    description: "Cloud-native programming",
    color: "#00ADD8",
  },

  {
    name: "Ruby",
    slug: "ruby",
    icon: <SiRuby />,
    category: "Programming Languages",
    description: "Dynamic, developer-friendly programming",
    color: "#CC342D",
  },

  {
    name: "Swift",
    slug: "swift",
    icon: <SiSwift />,
    category: "Programming Languages",
    description: "Modern, safe systems and app programming",
    color: "#F05138",
  },

  /* =====================================================
     FRONTEND
  ===================================================== */

  {
    name: "HTML & CSS",
    slug: "html-css",
    icon: (
      <span className={styles.dualTechnologyIcon}>
        <SiHtml5 className={styles.htmlIcon} />

        <FaCss3Alt className={styles.cssIcon} />
      </span>
    ),
    category: "Frontend",
    description: "Web structure and styling",
    color: "#E34F26",
  },

  {
    name: "React",
    slug: "react",
    icon: <SiReact />,
    category: "Frontend",
    description: "Component-based UI development",
    color: "#149ECA",
  },

  {
    name: "Angular",
    slug: "angular",
    icon: <SiAngular />,
    category: "Frontend",
    description: "Enterprise frontend framework",
    color: "#DD0031",
  },

  {
    name: "Vue.js",
    slug: "vue",
    icon: <SiVuedotjs />,
    category: "Frontend",
    description: "Progressive UI framework",
    color: "#42B883",
  },

  {
    name: "Next.js",
    slug: "nextjs",
    icon: <SiNextdotjs />,
    category: "Frontend",
    description: "React application framework",
    color: "#111827",
  },

  /* =====================================================
     BACKEND
  ===================================================== */

  {
    name: "Node.js",
    slug: "nodejs",
    icon: <SiNodedotjs />,
    category: "Backend",
    description: "JavaScript server runtime",
    color: "#339933",
  },

  {
    name: "Express.js",
    slug: "expressjs",
    icon: <SiExpress />,
    category: "Backend",
    description: "Node.js web framework",
    color: "#334155",
  },

  {
    name: "NestJS",
    slug: "nestjs",
    icon: <SiNestjs />,
    category: "Backend",
    description: "Enterprise Node.js framework",
    color: "#E0234E",
  },

  {
    name: "Spring Boot",
    slug: "spring-boot",
    icon: <SiSpringboot />,
    category: "Backend",
    description: "Java backend framework",
    color: "#6DB33F",
  },

  {
    name: "ASP.NET Core",
    slug: "dotnet",
    icon: <SiDotnet />,
    category: "Backend",
    description: "Microsoft backend framework",
    color: "#512BD4",
  },

  {
    name: "Django",
    slug: "django",
    icon: <SiDjango />,
    category: "Backend",
    description: "Python web framework",
    color: "#092E20",
  },

  {
    name: "FastAPI",
    slug: "fastapi",
    icon: <Zap />,
    category: "Backend",
    description: "Modern Python API framework",
    color: "#009688",
  },

  /* =====================================================
     DATABASES
  ===================================================== */

  {
    name: "MongoDB",
    slug: "mongodb",
    icon: <SiMongodb />,
    category: "Databases",
    description: "Document database",
    color: "#47A248",
  },

  {
    name: "MySQL",
    slug: "mysql",
    icon: <SiMysql />,
    category: "Databases",
    description: "Relational database",
    color: "#4479A1",
  },

  {
    name: "PostgreSQL",
    slug: "postgresql",
    icon: <SiPostgresql />,
    category: "Databases",
    description: "Advanced relational database",
    color: "#4169E1",
  },

  {
    name: "SQL",
    slug: "sql",
    icon: <Database />,
    category: "Databases",
    description: "Database query language",
    color: "#F59E0B",
  },

  {
    name: "Redis",
    slug: "redis",
    icon: <SiRedis />,
    category: "Databases",
    description: "In-memory data store",
    color: "#DC382D",
  },

  /* =====================================================
     DEVOPS
  ===================================================== */

  {
    name: "Git",
    slug: "git",
    icon: <SiGit />,
    category: "DevOps",
    description: "Version control",
    color: "#F05032",
  },

  {
    name: "Linux",
    slug: "linux",
    icon: <SiLinux />,
    category: "DevOps",
    description: "Linux administration",
    color: "#111827",
  },

  {
    name: "Docker",
    slug: "docker",
    icon: <SiDocker />,
    category: "DevOps",
    description: "Container technology",
    color: "#2496ED",
  },

  {
    name: "Kubernetes",
    slug: "kubernetes",
    icon: <SiKubernetes />,
    category: "DevOps",
    description: "Container orchestration",
    color: "#326CE5",
  },

  {
    name: "CI/CD",
    slug: "cicd",
    icon: <SiGithubactions />,
    category: "DevOps",
    description: "Build and deployment automation",
    color: "#2088FF",
  },

  /* =====================================================
     CLOUD & AI
  ===================================================== */

  {
    name: "AWS",
    slug: "aws",
    icon: <FaAws />,
    category: "Cloud & AI",
    description: "Amazon Web Services",
    color: "#FF9900",
  },

  {
    name: "Microsoft Azure",
    slug: "azure",
    icon: <TbBrandAzure />,
    category: "Cloud & AI",
    description: "Microsoft cloud platform",
    color: "#0078D4",
  },

  {
    name: "Google Cloud",
    slug: "google-cloud",
    icon: <SiGooglecloud />,
    category: "Cloud & AI",
    description: "Google Cloud Platform",
    color: "#4285F4",
  },

  {
    name: "AI & Machine Learning",
    slug: "ai-ml",
    icon: <BrainCircuit />,
    category: "Cloud & AI",
    description: "Artificial intelligence and ML",
    color: "#7C3AED",
  },

  {
    name: "Generative AI",
    slug: "generative-ai",
    icon: <Sparkles />,
    category: "Cloud & AI",
    description: "Generative AI applications",
    color: "#8B5CF6",
  },
];

/* =========================================================
   CATEGORY LIST
========================================================= */

const categories = ["Programming Languages", "Frontend", "Backend", "Databases", "DevOps", "Cloud & AI"];

/* =========================================================
   CATEGORY ICON
========================================================= */

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Frontend":
      return <Layers3 />;

    case "Backend":
      return <Server />;

    case "Databases":
      return <Database />;

    case "DevOps":
      return <GitBranch />;

    case "Cloud & AI":
      return <Cloud />;

    default:
      return <Code2 />;
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [search, setSearch] = useState("");

  const [activeCategory, setActiveCategory] = useState("All");

  /* =======================================================
     AUTH CHECK
  ======================================================= */

  useEffect(() => {
    const authenticated = localStorage.getItem("elab_dummy_auth") === "true";

    if (!authenticated) {
      router.replace("/login");
      return;
    }

    setCheckingAuth(false);
  }, [router]);

  /* =======================================================
     FILTER TECHNOLOGIES
  ======================================================= */

  const filteredTechnologies = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return technologies.filter((technology) => {
      const matchesSearch = !searchValue || technology.name.toLowerCase().includes(searchValue) || technology.description.toLowerCase().includes(searchValue) || technology.category.toLowerCase().includes(searchValue);

      const matchesCategory = activeCategory === "All" || technology.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  /* =======================================================
     VISIBLE CATEGORIES
  ======================================================= */

  const visibleCategories = activeCategory === "All" ? categories : [activeCategory];

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
    localStorage.removeItem("elab_dummy_auth");

    localStorage.removeItem("elab_dummy_user");

    router.replace("/login");
  };

  /* =======================================================
     OPEN TECHNOLOGY
  ======================================================= */

  const openTechnology = (slug: string) => {
    router.push(`/practice/${slug}`);
  };

  if (checkingAuth) {
    return null;
  }

  return (
    <main className={styles.page}>
      {/* =================================================
          HEADER
      ================================================= */}

      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* LOGO */}

          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <Braces />
            </div>

            <div className={styles.logo}>
              e<span>Lab</span>
            </div>
          </div>

          {/* MAIN NAV */}

          <nav className={styles.nav}>
            <button className={`${styles.navItem} ${styles.navActive}`}>
              <Code2 />

              <span>Start Practicing</span>
            </button>

            <button className={styles.navItem} onClick={() => router.push("/stacks")}>
              <Layers3 />

              <span>Targeted Stack</span>
            </button>

            <button className={styles.navItem} onClick={() => router.push("/challenges")}>
              <Trophy />

              <span>Real-Time Challenges</span>
            </button>
          </nav>

          {/* ACCOUNT */}

          <div className={styles.accountArea}>
            <div className={styles.avatar}>
              <UserRound />
            </div>

            <div className={styles.accountText}>
              <span className={styles.accountName}>Learner</span>

              <span className={styles.accountRole}>Practice Workspace</span>
            </div>

            <button className={styles.logoutButton} onClick={logout} aria-label="Logout">
              <LogOut />
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className={styles.main}>
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className={styles.pageHeader}>
          <div>
            <div className={styles.pageLabel}>
              <Code2 />

              <span>Start Practicing</span>
            </div>

            <h1 className={styles.pageTitle}>Practice technologies</h1>

            <p className={styles.pageDescription}>Select a programming language, framework, database, DevOps tool, cloud platform or AI technology and start practicing.</p>
          </div>

          <div className={styles.quickInfo}>
            <Sparkles />

            <div>
              <strong>{technologies.length}</strong>

              <span>technologies available</span>
            </div>
          </div>
        </section>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search />

            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search C, Python, React, MongoDB, AWS, AI..." className={styles.searchInput} />

            {search && (
              <button type="button" className={styles.clearSearch} onClick={() => setSearch("")} aria-label="Clear search">
                <X />
              </button>
            )}
          </div>

          <div className={styles.resultCount}>{filteredTechnologies.length} results</div>
        </section>

        {/* =================================================
            CATEGORY TABS
        ================================================= */}

        <div className={styles.categoryTabs}>
          <button className={`${styles.categoryTab} ${activeCategory === "All" ? styles.categoryTabActive : ""}`} onClick={() => setActiveCategory("All")}>
            All
          </button>

          {categories.map((category) => (
            <button key={category} className={`${styles.categoryTab} ${activeCategory === category ? styles.categoryTabActive : ""}`} onClick={() => setActiveCategory(category)}>
              {category}
            </button>
          ))}
        </div>

        {/* =================================================
            TECHNOLOGY CONTENT
        ================================================= */}

        <section className={styles.technologyContent}>
          {visibleCategories.map((category) => {
            const categoryItems = filteredTechnologies.filter((technology) => technology.category === category);

            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <div key={category} className={styles.categorySection}>
                {/* CATEGORY HEADER */}

                <div className={styles.categoryHeader}>
                  <div className={styles.categoryHeaderLeft}>
                    <div className={styles.categoryIcon}>
                      <CategoryIcon category={category} />
                    </div>

                    <div>
                      <h2 className={styles.categoryTitle}>{category}</h2>

                      <p className={styles.categorySubtitle}>{categoryItems.length} technologies</p>
                    </div>
                  </div>
                </div>

                {/* TECHNOLOGY GRID */}

                <div className={styles.technologyGrid}>
                  {categoryItems.map((technology) => (
                    <button key={technology.slug} className={styles.technologyCard} onClick={() => openTechnology(technology.slug)}>
                      {/* TECHNOLOGY LOGO */}

                      <div
                        className={styles.technologyIcon}
                        style={{
                          color: technology.color,
                        }}>
                        {technology.icon}
                      </div>

                      {/* TECHNOLOGY DETAILS */}

                      <div className={styles.technologyDetails}>
                        <h3 className={styles.technologyName}>{technology.name}</h3>

                        <p className={styles.technologyDescription}>{technology.description}</p>
                      </div>

                      {/* ARROW */}

                      <div className={styles.cardArrow}>
                        <ChevronRight />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* =================================================
              EMPTY RESULT
          ================================================= */}

          {filteredTechnologies.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <Search />
              </div>

              <h2>No technologies found</h2>

              <p>Try another keyword or select a different category.</p>

              <button
                onClick={() => {
                  setSearch("");

                  setActiveCategory("All");
                }}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
