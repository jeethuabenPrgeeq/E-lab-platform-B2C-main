import type {
  StackDefinition,
} from './types';

export const stacks: StackDefinition[] = [
  /* =====================================================
     FULL STACK DEVELOPMENT
  ===================================================== */

  {
    slug: 'mern',

    domainSlug: 'full-stack',

    name: 'MERN Stack',

    shortName: 'MERN',

    description:
      'Build modern full-stack applications using MongoDB, Express.js, React and Node.js.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'React',
      'Node.js',
      'Express.js',
      'MongoDB',
    ],

    level: 'Beginner to Advanced',
  },

  {
    slug: 'mean',

    domainSlug: 'full-stack',

    name: 'MEAN Stack',

    shortName: 'MEAN',

    description:
      'Build enterprise full-stack applications using MongoDB, Express.js, Angular and Node.js.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'Angular',
      'Node.js',
      'Express.js',
      'MongoDB',
    ],

    level: 'Beginner to Advanced',
  },

  {
    slug: 'next-nest',

    domainSlug: 'full-stack',

    name: 'Next.js + NestJS',

    shortName: 'NEXT + NEST',

    description:
      'Build production-ready TypeScript applications using Next.js, NestJS and PostgreSQL.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'NestJS',
      'PostgreSQL',
    ],

    level: 'Intermediate to Advanced',
  },

  {
    slug: 'django',

    domainSlug: 'full-stack',

    name: 'Django Full Stack',

    shortName: 'DJANGO',

    description:
      'Build complete web applications using Python, Django and PostgreSQL.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'Python',
      'Django',
      'PostgreSQL',
    ],

    level: 'Beginner to Advanced',
  },

  {
    slug: 'react-spring',

    domainSlug: 'full-stack',

    name: 'React + Spring Boot',

    shortName: 'REACT + SPRING',

    description:
      'Build enterprise applications using React, Java, Spring Boot and PostgreSQL.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'React',
      'Java',
      'Spring Boot',
      'PostgreSQL',
    ],

    level: 'Intermediate to Advanced',
  },

  {
    slug: 'angular-spring',

    domainSlug: 'full-stack',

    name: 'Angular + Spring Boot',

    shortName: 'ANGULAR + SPRING',

    description:
      'Build enterprise applications using Angular, Java, Spring Boot and PostgreSQL.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'Angular',
      'Java',
      'Spring Boot',
      'PostgreSQL',
    ],

    level: 'Intermediate to Advanced',
  },

  {
    slug: 'dotnet',

    domainSlug: 'full-stack',

    name: '.NET Full Stack',

    shortName: '.NET',

    description:
      'Build enterprise applications using C#, ASP.NET Core and modern frontend technologies.',

    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'C#',
      'ASP.NET Core',
      'SQL',
    ],

    level: 'Beginner to Advanced',
  },

  /* =====================================================
     DATA ANALYTICS
  ===================================================== */

  {
    slug: 'python-analytics',

    domainSlug: 'data-analytics',

    name: 'Python Data Analytics',

    shortName: 'PYTHON ANALYTICS',

    description:
      'Analyze and visualize data using Python, SQL, Pandas and modern analytics libraries.',

    technologies: [
      'Excel',
      'SQL',
      'Python',
      'NumPy',
      'Pandas',
      'Visualization',
    ],

    level: 'Beginner to Advanced',
  },

  {
    slug: 'power-bi',

    domainSlug: 'data-analytics',

    name: 'Power BI Analyst',

    shortName: 'POWER BI',

    description:
      'Build professional business intelligence reports, models and dashboards.',

    technologies: [
      'Excel',
      'SQL',
      'Power BI',
      'DAX',
      'Data Modeling',
    ],

    level: 'Beginner to Advanced',
  },

  /* =====================================================
     DATA ENGINEERING
  ===================================================== */

  {
    slug: 'python-spark',

    domainSlug: 'data-engineering',

    name: 'Python + Spark Data Engineering',

    shortName: 'PYTHON + SPARK',

    description:
      'Build scalable data pipelines using Python, SQL and Apache Spark.',

    technologies: [
      'SQL',
      'Python',
      'ETL',
      'Apache Spark',
      'Data Pipelines',
    ],

    level: 'Intermediate to Advanced',
  },

  /* =====================================================
     AI / ML
  ===================================================== */

  {
    slug: 'python-ml',

    domainSlug: 'ai-ml',

    name: 'Python Machine Learning',

    shortName: 'PYTHON ML',

    description:
      'Learn machine learning from Python fundamentals through complete ML projects.',

    technologies: [
      'Python',
      'NumPy',
      'Pandas',
      'Machine Learning',
      'Scikit-learn',
    ],

    level: 'Beginner to Advanced',
  },

  {
    slug: 'generative-ai',

    domainSlug: 'ai-ml',

    name: 'Generative AI Engineer',

    shortName: 'GEN AI',

    description:
      'Build modern AI applications using LLMs, prompting, embeddings and RAG.',

    technologies: [
      'Python',
      'LLMs',
      'Prompt Engineering',
      'Embeddings',
      'RAG',
    ],

    level: 'Intermediate to Advanced',
  },

  /* =====================================================
     CLOUD & DEVOPS
  ===================================================== */

  {
    slug: 'devops-engineer',

    domainSlug: 'cloud-devops',

    name: 'DevOps Engineer',

    shortName: 'DEVOPS',

    description:
      'Learn Linux, Git, Docker, Kubernetes and CI/CD from fundamentals through deployment.',

    technologies: [
      'Linux',
      'Git',
      'Docker',
      'Kubernetes',
      'CI/CD',
    ],

    level: 'Beginner to Advanced',
  },
];

/* =========================================================
   HELPERS
========================================================= */

export function getStacksByDomain(
  domainSlug: string,
) {
  return stacks.filter(
    (stack) =>
      stack.domainSlug === domainSlug,
  );
}

export function getStackBySlug(
  domainSlug: string,
  stackSlug: string,
) {
  return stacks.find(
    (stack) =>
      stack.domainSlug === domainSlug &&
      stack.slug === stackSlug,
  );
}