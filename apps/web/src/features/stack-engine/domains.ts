import type {
  StackDomain,
} from './types';

export const stackDomains: StackDomain[] = [
  {
    slug: 'full-stack',

    name: 'Full Stack Development',

    description:
      'Build complete frontend, backend and database applications from fundamentals through deployment.',

    pathDescription:
      'Frontend → Backend → Database → Integration → Deployment',
  },

  {
    slug: 'data-analytics',

    name: 'Data Analytics',

    description:
      'Analyze, transform and visualize data using modern analytics tools and platforms.',

    pathDescription:
      'Excel → SQL → Python → BI → Analytics Projects',
  },

  {
    slug: 'data-engineering',

    name: 'Data Engineering',

    description:
      'Build scalable data pipelines, processing systems and cloud data platforms.',

    pathDescription:
      'SQL → Python → ETL → Spark → Cloud → Pipelines',
  },

  {
    slug: 'ai-ml',

    name: 'AI & Machine Learning',

    description:
      'Build machine learning, deep learning and modern AI applications.',

    pathDescription:
      'Python → Data → ML → Deep Learning → Generative AI',
  },

  {
    slug: 'cloud-devops',

    name: 'Cloud & DevOps',

    description:
      'Build, automate and deploy modern cloud infrastructure and applications.',

    pathDescription:
      'Linux → Git → Docker → Kubernetes → Cloud → CI/CD',
  },

  {
    slug: 'cybersecurity',

    name: 'Cybersecurity',

    description:
      'Develop practical application, network and cloud security skills.',

    pathDescription:
      'Fundamentals → Web Security → Network → Cloud Security',
  },

  {
    slug: 'mobile-development',

    name: 'Mobile Development',

    description:
      'Build modern native and cross-platform mobile applications.',

    pathDescription:
      'Fundamentals → UI → APIs → Mobile Apps → Deployment',
  },

  {
    slug: 'database-engineering',

    name: 'Database Engineering',

    description:
      'Design, develop and optimize relational and NoSQL database systems.',

    pathDescription:
      'SQL → Data Modeling → RDBMS → NoSQL → Optimization',
  },
];

export function getDomainBySlug(
  slug: string,
) {
  return stackDomains.find(
    (domain) =>
      domain.slug === slug,
  );
}