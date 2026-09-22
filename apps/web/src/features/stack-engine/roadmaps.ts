import type {
  StackRoadmap,
} from './types';

/* =========================================================
   STACK ROADMAPS
========================================================= */

export const stackRoadmaps: StackRoadmap[] = [
  /* =======================================================
     MERN STACK
     HTML → CSS → JavaScript → React → Node → Express
     → MongoDB → API → Security → Integration
     → Testing → Deployment → Projects
  ======================================================= */

  {
    stackSlug: 'mern',

    modules: [
      {
        slug: 'html',

        name: 'HTML Foundations',

        phase: 'Foundation',

        description:
          'Learn how to structure modern web pages using semantic HTML.',

        technologySlug: 'html-css',

        topics: [
          'HTML document structure',
          'Headings and paragraphs',
          'Links and navigation',
          'Images and media',
          'Lists',
          'Tables',
          'Forms',
          'Semantic HTML',
          'Accessibility basics',
        ],
      },

      {
        slug: 'css',

        name: 'CSS & Responsive Design',

        phase: 'Foundation',

        description:
          'Learn modern CSS and build responsive user interfaces.',

        technologySlug: 'html-css',

        topics: [
          'CSS selectors',
          'Colors and typography',
          'Box model',
          'Display properties',
          'Positioning',
          'Flexbox',
          'CSS Grid',
          'Responsive design',
          'Media queries',
          'Transitions and animations',
        ],
      },

      {
        slug: 'javascript',

        name: 'JavaScript',

        phase: 'Programming',

        description:
          'Master JavaScript fundamentals and modern asynchronous programming.',

        technologySlug: 'javascript',

        topics: [
          'Variables',
          'Data types',
          'Operators',
          'Conditions',
          'Loops',
          'Functions',
          'Arrays',
          'Objects',
          'Strings',
          'DOM',
          'Events',
          'ES6+ features',
          'Promises',
          'Async and Await',
          'Fetch API',
          'Error handling',
        ],
      },

      {
        slug: 'react',

        name: 'React',

        phase: 'Frontend',

        description:
          'Build modern component-based frontend applications using React.',

        technologySlug: 'react',

        topics: [
          'React fundamentals',
          'Components',
          'JSX',
          'Props',
          'State',
          'Events',
          'Conditional rendering',
          'Lists and keys',
          'Forms',
          'useState',
          'useEffect',
          'useContext',
          'Custom hooks',
          'React Router',
          'API integration',
          'Protected routes',
          'Reusable components',
        ],
      },

      {
        slug: 'nodejs',

        name: 'Node.js',

        phase: 'Backend',

        description:
          'Learn server-side JavaScript and backend application fundamentals.',

        technologySlug: 'nodejs',

        topics: [
          'Node.js runtime',
          'Node modules',
          'npm',
          'File system',
          'HTTP module',
          'Events',
          'Environment variables',
          'Asynchronous programming',
          'Error handling',
          'Project structure',
        ],
      },

      {
        slug: 'express',

        name: 'Express.js',

        phase: 'Backend',

        description:
          'Build backend services and REST APIs using Express.js.',

        technologySlug: 'expressjs',

        topics: [
          'Express setup',
          'Routing',
          'Controllers',
          'Middleware',
          'Request and response',
          'Validation',
          'Error middleware',
          'REST API structure',
          'Pagination',
          'Filtering',
          'File uploads',
        ],
      },

      {
        slug: 'mongodb',

        name: 'MongoDB',

        phase: 'Database',

        description:
          'Store and manage application data using MongoDB and Mongoose.',

        technologySlug: 'mongodb',

        topics: [
          'MongoDB fundamentals',
          'Documents',
          'Collections',
          'CRUD operations',
          'Queries',
          'Filtering',
          'Indexes',
          'Aggregation',
          'Relationships',
          'MongoDB Atlas',
          'Mongoose schemas',
          'Mongoose models',
          'Validation',
          'Populate',
        ],
      },

      {
        slug: 'rest-api',

        name: 'REST API Development',

        phase: 'Backend Integration',

        description:
          'Design structured production-style REST APIs for MERN applications.',

        topics: [
          'REST architecture',
          'HTTP methods',
          'Status codes',
          'Controllers',
          'Services',
          'CRUD APIs',
          'Validation',
          'Pagination',
          'Searching',
          'Filtering',
          'Sorting',
          'Error responses',
          'API documentation basics',
        ],
      },

      {
        slug: 'authentication',

        name: 'Authentication & Security',

        phase: 'Security',

        description:
          'Secure MERN applications using authentication and authorization patterns.',

        topics: [
          'Password hashing',
          'bcrypt',
          'JWT',
          'Access tokens',
          'Refresh tokens',
          'Registration',
          'Login',
          'Logout',
          'Authorization',
          'Role-based access',
          'Protected routes',
          'CORS',
          'Helmet',
          'Rate limiting',
          'Input validation',
        ],
      },

      {
        slug: 'integration',

        name: 'MERN Integration',

        phase: 'Integration',

        description:
          'Connect React, Node.js, Express.js and MongoDB into one complete application.',

        topics: [
          'Frontend to backend communication',
          'Fetch and Axios',
          'API service layer',
          'React registration flow',
          'React login flow',
          'JWT handling',
          'Protected routes',
          'CRUD integration',
          'Loading states',
          'Error states',
          'Environment configuration',
        ],
      },

      {
        slug: 'testing',

        name: 'Testing',

        phase: 'Quality',

        description:
          'Test frontend components, backend APIs and complete application flows.',

        topics: [
          'Testing fundamentals',
          'Unit testing',
          'Jest',
          'React component testing',
          'API testing',
          'Supertest',
          'Integration testing',
          'Postman testing',
        ],
      },

      {
        slug: 'git',

        name: 'Git & Collaboration',

        phase: 'Engineering Practice',

        description:
          'Use Git effectively for professional development and collaboration.',

        technologySlug: 'git',

        topics: [
          'Git initialization',
          'Staging',
          'Commits',
          'Branches',
          'Merge',
          'Pull',
          'Push',
          'Remote repositories',
          'Pull requests',
          'Conflict resolution',
        ],
      },

      {
        slug: 'deployment',

        name: 'Docker & Deployment',

        phase: 'Deployment',

        description:
          'Package and deploy production-ready MERN applications.',

        topics: [
          'Production builds',
          'Environment variables',
          'Docker fundamentals',
          'Dockerfile',
          'Docker Compose',
          'MongoDB Atlas',
          'Frontend deployment',
          'Backend deployment',
          'Reverse proxy basics',
          'CI/CD basics',
        ],
      },

      {
        slug: 'projects',

        name: 'Capstone Projects',

        phase: 'Projects',

        description:
          'Apply the complete MERN stack by building real-world applications.',

        topics: [
          'Task Management Application',
          'Student Management System',
          'Blog Platform',
          'E-commerce Platform',
          'Learning Management System',
          'Job Portal',
          'Real-Time Collaboration Application',
        ],
      },
    ],
  },

  /* =======================================================
     MEAN STACK
     HTML → CSS → JavaScript → TypeScript → Angular
     → Node → Express → MongoDB → Security → Integration
  ======================================================= */

  {
    stackSlug: 'mean',

    modules: [
      {
        slug: 'html',

        name: 'HTML Foundations',

        phase: 'Foundation',

        description:
          'Learn modern semantic HTML and web page structure.',

        technologySlug: 'html-css',

        topics: [
          'HTML document structure',
          'Headings and paragraphs',
          'Links',
          'Images',
          'Lists',
          'Tables',
          'Forms',
          'Semantic HTML',
          'Accessibility basics',
        ],
      },

      {
        slug: 'css',

        name: 'CSS & Responsive Design',

        phase: 'Foundation',

        description:
          'Build responsive application interfaces using modern CSS.',

        technologySlug: 'html-css',

        topics: [
          'CSS selectors',
          'Box model',
          'Typography',
          'Positioning',
          'Flexbox',
          'CSS Grid',
          'Responsive design',
          'Media queries',
        ],
      },

      {
        slug: 'javascript',

        name: 'JavaScript',

        phase: 'Programming',

        description:
          'Learn JavaScript fundamentals required for Angular and Node.js.',

        technologySlug: 'javascript',

        topics: [
          'Variables',
          'Data types',
          'Conditions',
          'Loops',
          'Functions',
          'Arrays',
          'Objects',
          'DOM',
          'Events',
          'Promises',
          'Async and Await',
        ],
      },

      {
        slug: 'typescript',

        name: 'TypeScript',

        phase: 'Programming',

        description:
          'Learn strongly typed JavaScript before beginning Angular development.',

        technologySlug: 'typescript',

        topics: [
          'TypeScript setup',
          'Primitive types',
          'Arrays',
          'Objects',
          'Functions',
          'Interfaces',
          'Type aliases',
          'Classes',
          'Access modifiers',
          'Generics',
          'Modules',
        ],
      },

      {
        slug: 'angular',

        name: 'Angular',

        phase: 'Frontend',

        description:
          'Build enterprise frontend applications using Angular.',

        technologySlug: 'angular',

        topics: [
          'Angular architecture',
          'Components',
          'Templates',
          'Data binding',
          'Directives',
          'Pipes',
          'Services',
          'Dependency injection',
          'Forms',
          'Reactive forms',
          'Routing',
          'Route guards',
          'HTTP Client',
          'RxJS',
          'API integration',
        ],
      },

      {
        slug: 'nodejs',

        name: 'Node.js',

        phase: 'Backend',

        description:
          'Build server-side JavaScript applications using Node.js.',

        technologySlug: 'nodejs',

        topics: [
          'Node runtime',
          'Modules',
          'npm',
          'File system',
          'HTTP',
          'Events',
          'Environment variables',
          'Async programming',
        ],
      },

      {
        slug: 'express',

        name: 'Express.js',

        phase: 'Backend',

        description:
          'Build backend services and APIs with Express.js.',

        technologySlug: 'expressjs',

        topics: [
          'Express setup',
          'Routing',
          'Controllers',
          'Middleware',
          'Validation',
          'Error handling',
          'REST APIs',
          'Pagination',
          'Filtering',
        ],
      },

      {
        slug: 'mongodb',

        name: 'MongoDB',

        phase: 'Database',

        description:
          'Build document-oriented data models for MEAN applications.',

        technologySlug: 'mongodb',

        topics: [
          'Documents',
          'Collections',
          'CRUD',
          'Queries',
          'Indexes',
          'Aggregation',
          'Mongoose schemas',
          'Models',
          'Validation',
        ],
      },

      {
        slug: 'rest-api',

        name: 'REST API Development',

        phase: 'Backend Integration',

        description:
          'Design APIs that connect Angular with the backend services.',

        topics: [
          'REST principles',
          'HTTP methods',
          'Controllers',
          'Services',
          'CRUD',
          'Validation',
          'Pagination',
          'Filtering',
          'Error handling',
        ],
      },

      {
        slug: 'authentication',

        name: 'Authentication & Security',

        phase: 'Security',

        description:
          'Secure MEAN applications using authentication and authorization.',

        topics: [
          'Password hashing',
          'JWT',
          'Access tokens',
          'Refresh tokens',
          'Angular route guards',
          'Authorization',
          'Role-based access',
          'CORS',
          'Input validation',
        ],
      },

      {
        slug: 'integration',

        name: 'MEAN Integration',

        phase: 'Integration',

        description:
          'Connect Angular with Node.js, Express.js and MongoDB.',

        topics: [
          'Angular HTTP services',
          'REST integration',
          'Registration flow',
          'Login flow',
          'JWT handling',
          'CRUD integration',
          'Loading states',
          'Error handling',
        ],
      },

      {
        slug: 'testing',

        name: 'Testing',

        phase: 'Quality',

        description:
          'Test Angular frontend and Node backend functionality.',

        topics: [
          'Unit testing',
          'Angular component testing',
          'Service testing',
          'API testing',
          'Integration testing',
        ],
      },

      {
        slug: 'git',

        name: 'Git & Collaboration',

        phase: 'Engineering Practice',

        description:
          'Use Git for professional application development.',

        technologySlug: 'git',

        topics: [
          'Repository setup',
          'Commits',
          'Branches',
          'Merge',
          'Remote repositories',
          'Pull requests',
          'Conflict resolution',
        ],
      },

      {
        slug: 'deployment',

        name: 'Docker & Deployment',

        phase: 'Deployment',

        description:
          'Package and deploy complete MEAN applications.',

        topics: [
          'Production build',
          'Environment variables',
          'Docker',
          'Dockerfile',
          'Docker Compose',
          'MongoDB Atlas',
          'Frontend deployment',
          'Backend deployment',
          'CI/CD basics',
        ],
      },

      {
        slug: 'projects',

        name: 'Capstone Projects',

        phase: 'Projects',

        description:
          'Build complete real-world MEAN applications.',

        topics: [
          'Task Management System',
          'Admin Dashboard',
          'Employee Management System',
          'E-commerce Application',
          'Learning Platform',
        ],
      },
    ],
  },

  /* =======================================================
     DJANGO FULL STACK
  ======================================================= */

  {
    stackSlug: 'django',

    modules: [
      {
        slug: 'html',

        name: 'HTML Foundations',

        phase: 'Foundation',

        description:
          'Learn semantic HTML and modern web page structure.',

        technologySlug: 'html-css',

        topics: [
          'HTML structure',
          'Headings',
          'Links',
          'Forms',
          'Tables',
          'Semantic HTML',
        ],
      },

      {
        slug: 'css',

        name: 'CSS & Responsive Design',

        phase: 'Foundation',

        description:
          'Create responsive web interfaces using CSS.',

        technologySlug: 'html-css',

        topics: [
          'CSS selectors',
          'Box model',
          'Flexbox',
          'Grid',
          'Responsive design',
          'Media queries',
        ],
      },

      {
        slug: 'javascript',

        name: 'JavaScript',

        phase: 'Frontend',

        description:
          'Add dynamic browser-side functionality to Django applications.',

        technologySlug: 'javascript',

        topics: [
          'JavaScript basics',
          'Functions',
          'Arrays',
          'Objects',
          'DOM',
          'Events',
          'Fetch API',
        ],
      },

      {
        slug: 'python',

        name: 'Python',

        phase: 'Programming',

        description:
          'Learn Python programming for backend web development.',

        technologySlug: 'python',

        topics: [
          'Python syntax',
          'Variables',
          'Conditions',
          'Loops',
          'Functions',
          'Lists',
          'Dictionaries',
          'Classes',
          'OOP',
          'Modules',
          'Exceptions',
        ],
      },

      {
        slug: 'django',

        name: 'Django',

        phase: 'Backend',

        description:
          'Build complete backend web applications using Django.',

        technologySlug: 'django',

        topics: [
          'Django installation',
          'Projects',
          'Apps',
          'URL routing',
          'Views',
          'Templates',
          'Models',
          'Django ORM',
          'Forms',
          'Admin panel',
          'Static files',
          'Authentication',
        ],
      },

      {
        slug: 'postgresql',

        name: 'PostgreSQL',

        phase: 'Database',

        description:
          'Design and manage relational data for Django applications.',

        technologySlug: 'postgresql',

        topics: [
          'Database fundamentals',
          'Tables',
          'CRUD',
          'Joins',
          'Relationships',
          'Indexes',
          'Constraints',
          'Django PostgreSQL configuration',
        ],
      },

      {
        slug: 'rest-api',

        name: 'REST API Development',

        phase: 'Backend Integration',

        description:
          'Create APIs for modern Django applications.',

        topics: [
          'REST fundamentals',
          'Django REST concepts',
          'Serializers',
          'Views',
          'CRUD APIs',
          'Validation',
          'Pagination',
          'Authentication',
        ],
      },

      {
        slug: 'authentication',

        name: 'Authentication & Security',

        phase: 'Security',

        description:
          'Secure Django applications and APIs.',

        topics: [
          'Django authentication',
          'User registration',
          'Login',
          'Permissions',
          'Sessions',
          'Tokens',
          'Authorization',
          'Security settings',
        ],
      },

      {
        slug: 'integration',

        name: 'Frontend & Django Integration',

        phase: 'Integration',

        description:
          'Connect frontend interfaces with Django backend functionality.',

        topics: [
          'Templates and views',
          'Form submission',
          'API communication',
          'Authentication flow',
          'CRUD integration',
          'Error handling',
        ],
      },

      {
        slug: 'testing',

        name: 'Testing',

        phase: 'Quality',

        description:
          'Test Django applications and APIs.',

        topics: [
          'Django test framework',
          'Unit tests',
          'Model tests',
          'View tests',
          'API tests',
          'Integration testing',
        ],
      },

      {
        slug: 'git',

        name: 'Git & Collaboration',

        phase: 'Engineering Practice',

        description:
          'Manage Django projects professionally with Git.',

        technologySlug: 'git',

        topics: [
          'Git initialization',
          'Commits',
          'Branches',
          'Merge',
          'Remote repositories',
          'Pull requests',
        ],
      },

      {
        slug: 'deployment',

        name: 'Docker & Deployment',

        phase: 'Deployment',

        description:
          'Deploy production-ready Django applications.',

        topics: [
          'Environment variables',
          'Production settings',
          'Static files',
          'Docker',
          'Docker Compose',
          'PostgreSQL deployment',
          'Application deployment',
          'CI/CD basics',
        ],
      },

      {
        slug: 'projects',

        name: 'Capstone Projects',

        phase: 'Projects',

        description:
          'Build complete production-style Django applications.',

        topics: [
          'Blog Platform',
          'Student Management System',
          'Inventory Management System',
          'E-commerce Platform',
          'Learning Management System',
        ],
      },
    ],
  },

  /* =======================================================
     NEXT.JS + NESTJS
  ======================================================= */

  {
    stackSlug: 'next-nest',

    modules: [
      {
        slug: 'html',

        name: 'HTML Foundations',

        phase: 'Foundation',

        description:
          'Learn semantic HTML for modern application development.',

        technologySlug: 'html-css',

        topics: [
          'Document structure',
          'Semantic HTML',
          'Forms',
          'Accessibility',
        ],
      },

      {
        slug: 'css',

        name: 'CSS & Responsive Design',

        phase: 'Foundation',

        description:
          'Build modern responsive interfaces.',

        technologySlug: 'html-css',

        topics: [
          'CSS fundamentals',
          'Flexbox',
          'Grid',
          'Responsive design',
        ],
      },

      {
        slug: 'javascript',

        name: 'JavaScript',

        phase: 'Programming',

        description:
          'Learn JavaScript before moving into TypeScript.',

        technologySlug: 'javascript',

        topics: [
          'Variables',
          'Functions',
          'Arrays',
          'Objects',
          'Promises',
          'Async/Await',
        ],
      },

      {
        slug: 'typescript',

        name: 'TypeScript',

        phase: 'Programming',

        description:
          'Build strongly typed frontend and backend applications.',

        technologySlug: 'typescript',

        topics: [
          'Types',
          'Interfaces',
          'Classes',
          'Generics',
          'Modules',
          'Utility types',
        ],
      },

      {
        slug: 'react',

        name: 'React',

        phase: 'Frontend',

        description:
          'Master the React fundamentals required by Next.js.',

        technologySlug: 'react',

        topics: [
          'Components',
          'Props',
          'State',
          'Hooks',
          'Forms',
          'API integration',
        ],
      },

      {
        slug: 'nextjs',

        name: 'Next.js',

        phase: 'Frontend',

        description:
          'Build production-ready React applications with Next.js.',

        technologySlug: 'nextjs',

        topics: [
          'App Router',
          'Layouts',
          'Server Components',
          'Client Components',
          'Routing',
          'Dynamic routes',
          'Data fetching',
          'Forms',
          'Authentication patterns',
        ],
      },

      {
        slug: 'nodejs',

        name: 'Node.js',

        phase: 'Backend',

        description:
          'Learn Node.js fundamentals for NestJS development.',

        technologySlug: 'nodejs',

        topics: [
          'Runtime',
          'Modules',
          'npm',
          'Async programming',
          'Environment variables',
        ],
      },

      {
        slug: 'nestjs',

        name: 'NestJS',

        phase: 'Backend',

        description:
          'Build structured enterprise APIs using NestJS.',

        technologySlug: 'nestjs',

        topics: [
          'Modules',
          'Controllers',
          'Providers',
          'Services',
          'Dependency injection',
          'DTOs',
          'Validation',
          'Guards',
          'Interceptors',
          'Exception filters',
          'Authentication',
        ],
      },

      {
        slug: 'postgresql',

        name: 'PostgreSQL',

        phase: 'Database',

        description:
          'Build reliable relational data models for full-stack applications.',

        technologySlug: 'postgresql',

        topics: [
          'SQL fundamentals',
          'Tables',
          'Relationships',
          'Joins',
          'Indexes',
          'Transactions',
        ],
      },

      {
        slug: 'integration',

        name: 'Next.js + NestJS Integration',

        phase: 'Integration',

        description:
          'Connect Next.js frontend applications with NestJS APIs.',

        topics: [
          'API client architecture',
          'Authentication flow',
          'DTO contracts',
          'CRUD integration',
          'Error handling',
          'Environment configuration',
        ],
      },

      {
        slug: 'testing',

        name: 'Testing',

        phase: 'Quality',

        description:
          'Test frontend and backend application functionality.',

        topics: [
          'Unit testing',
          'API testing',
          'Frontend testing',
          'Integration testing',
          'E2E testing',
        ],
      },

      {
        slug: 'deployment',

        name: 'Docker & Deployment',

        phase: 'Deployment',

        description:
          'Deploy Next.js, NestJS and PostgreSQL applications.',

        topics: [
          'Docker',
          'Docker Compose',
          'Environment variables',
          'Production builds',
          'Reverse proxy',
          'CI/CD',
        ],
      },

      {
        slug: 'projects',

        name: 'Capstone Projects',

        phase: 'Projects',

        description:
          'Build complete enterprise full-stack applications.',

        topics: [
          'Learning Platform',
          'Project Management System',
          'SaaS Dashboard',
          'Assessment Platform',
        ],
      },
    ],
  },
];

/* =========================================================
   HELPERS
========================================================= */

export function getRoadmapByStackSlug(
  stackSlug: string,
) {
  return stackRoadmaps.find(
    (roadmap) =>
      roadmap.stackSlug === stackSlug,
  );
}

export function getRoadmapModule(
  stackSlug: string,
  moduleSlug: string,
) {
  const roadmap =
    getRoadmapByStackSlug(
      stackSlug,
    );

  return roadmap?.modules.find(
    (module) =>
      module.slug ===
      moduleSlug,
  );
}