import type { PracticeLevel, TechnologyPracticePath } from "./types";

/* =========================================================
   PRACTICE PATHS
========================================================= */

export const practicePaths: TechnologyPracticePath[] = [
  /* =======================================================
     C PROGRAMMING
  ======================================================= */

  {
    technologySlug: "c",

    name: "C Programming",

    shortName: "C",

    description: "Master C programming from basic input and output through arrays, pointers, data structures and advanced problem solving.",

    stages: [
      /* ===================================================
         BEGINNER
      =================================================== */

      {
        slug: "fundamentals",

        title: "C Fundamentals",

        description: "Start with variables, input/output, data types and basic operators.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["c-hello-world", "c-add-two-numbers", "c-basic-arithmetic", "c-celsius-fahrenheit"],
      },

      {
        slug: "conditions",

        title: "Conditions",

        description: "Practice decision making using if, else and switch statements.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["c-even-odd", "c-positive-negative-zero", "c-largest-two", "c-largest-three"],
      },

      {
        slug: "loops",

        title: "Loops",

        description: "Solve repetitive problems using for, while and do-while loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["c-sum-first-n", "c-multiplication-table", "c-factorial", "c-prime-number"],
      },

      /* ===================================================
         INTERMEDIATE
      =================================================== */

      {
        slug: "functions",

        title: "Functions",

        description: "Break programs into reusable functions and understand parameter passing.",

        level: "Intermediate",

        order: 4,

        problemSlugs: ["c-max-using-function", "c-prime-using-function", "c-gcd-using-function"],
      },

      {
        slug: "arrays",

        title: "Arrays",

        description: "Process collections of values using one-dimensional arrays.",

        level: "Intermediate",

        order: 5,

        problemSlugs: ["c-array-sum", "c-array-maximum", "c-array-reverse", "c-second-largest"],
      },

      {
        slug: "search-sort",

        title: "Searching & Sorting",

        description: "Implement foundational searching and sorting algorithms.",

        level: "Intermediate",

        order: 6,

        problemSlugs: ["c-linear-search", "c-bubble-sort", "c-binary-search"],
      },

      {
        slug: "strings",

        title: "Strings",

        description: "Manipulate character arrays and solve common string problems.",

        level: "Intermediate",

        order: 7,

        problemSlugs: ["c-string-length", "c-string-reverse", "c-palindrome-string"],
      },

      /* ===================================================
         ADVANCED
      =================================================== */

      {
        slug: "pointers",

        title: "Pointers",

        description: "Understand addresses, pointer operations and pointer-based functions.",

        level: "Advanced",

        order: 8,

        problemSlugs: ["c-swap-pointers", "c-array-using-pointer"],
      },

      {
        slug: "advanced-problem-solving",

        title: "Advanced Problem Solving",

        description: "Apply C fundamentals to algorithmic programming challenges.",

        level: "Advanced",

        order: 9,

        problemSlugs: ["c-missing-number", "c-maximum-subarray"],
      },
    ],
  },

  /* =======================================================
     C++ PROGRAMMING
  ======================================================= */

  {
    technologySlug: "cpp",

    name: "C++ Programming",

    shortName: "C++",

    description: "Master C++ programming from basic syntax and input/output through arrays, strings, pointers, references, algorithms and advanced problem solving.",

    stages: [
      /* ===================================================
         BEGINNER
      =================================================== */

      {
        slug: "cpp-fundamentals",

        title: "C++ Fundamentals",

        description: "Start with C++ syntax, variables, input/output, data types and basic operators.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["cpp-hello-world", "cpp-add-two-numbers", "cpp-basic-arithmetic", "cpp-celsius-fahrenheit"],
      },

      {
        slug: "cpp-conditions",

        title: "Conditions",

        description: "Practice decision making using if, else and comparison operators in C++.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["cpp-even-odd", "cpp-positive-negative-zero", "cpp-largest-two", "cpp-largest-three"],
      },

      {
        slug: "cpp-loops",

        title: "Loops",

        description: "Solve repetitive problems using for, while and do-while loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["cpp-sum-first-n", "cpp-multiplication-table", "cpp-factorial", "cpp-prime-number"],
      },

      /* ===================================================
         INTERMEDIATE
      =================================================== */

      {
        slug: "cpp-functions",

        title: "Functions",

        description: "Create reusable C++ functions and practice parameters and return values.",

        level: "Intermediate",

        order: 4,

        problemSlugs: ["cpp-max-using-function", "cpp-prime-using-function", "cpp-gcd-using-function"],
      },

      {
        slug: "cpp-arrays",

        title: "Arrays",

        description: "Store and process collections of values using arrays and vectors.",

        level: "Intermediate",

        order: 5,

        problemSlugs: ["cpp-array-sum", "cpp-array-maximum", "cpp-array-reverse", "cpp-second-largest"],
      },

      {
        slug: "cpp-search-sort",

        title: "Searching & Sorting",

        description: "Implement common searching and sorting algorithms in C++.",

        level: "Intermediate",

        order: 6,

        problemSlugs: ["cpp-linear-search", "cpp-bubble-sort", "cpp-binary-search"],
      },

      {
        slug: "cpp-strings",

        title: "Strings",

        description: "Practice C++ string processing and common string problems.",

        level: "Intermediate",

        order: 7,

        problemSlugs: ["cpp-string-length", "cpp-string-reverse", "cpp-palindrome-string"],
      },

      /* ===================================================
         ADVANCED
      =================================================== */

      {
        slug: "cpp-pointers",

        title: "Pointers & References",

        description: "Understand pointers, memory access, references and pointer-based operations.",

        level: "Advanced",

        order: 8,

        problemSlugs: ["cpp-swap-pointers", "cpp-array-using-pointer"],
      },

      {
        slug: "cpp-advanced-problem-solving",

        title: "Advanced Problem Solving",

        description: "Apply C++ fundamentals and algorithms to advanced programming challenges.",

        level: "Advanced",

        order: 9,

        problemSlugs: ["cpp-missing-number", "cpp-maximum-subarray"],
      },
    ],
  },

  {
    technologySlug: "java",
    name: "Java Programming",
    shortName: "Java",
    description: "Learn Java programming from syntax and input/output through object-oriented programming, collections and advanced problem solving.",
    stages: [
      {
        slug: "java-fundamentals",
        title: "Java Fundamentals",
        description: "Start with Java syntax, variables, input/output and basic operations.",
        level: "Beginner",
        order: 1,
        problemSlugs: ["java-hello-world", "java-add-two-numbers"],
      },
      {
        slug: "java-conditions",
        title: "Conditions",
        description: "Practice Java decision-making statements.",
        level: "Beginner",
        order: 2,
        problemSlugs: ["java-even-odd"],
      },
      {
        slug: "java-loops",
        title: "Loops",
        description: "Practice repetitive logic using Java loops.",
        level: "Beginner",
        order: 3,
        problemSlugs: ["java-factorial", "java-prime-number"],
      },
    ],
  },

  {
    technologySlug: "csharp",

    name: "C# Programming",

    shortName: "C#",

    description: "Learn C# from syntax and input/output through conditions and loops using hands-on problems.",

    stages: [
      {
        slug: "csharp-fundamentals",

        title: "C# Fundamentals",

        description: "Start with C# syntax, variables, input/output and basic operations.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["csharp-hello-world", "csharp-add-two-numbers"],
      },

      {
        slug: "csharp-conditions",

        title: "Conditions",

        description: "Practice C# decision-making statements.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["csharp-even-odd"],
      },

      {
        slug: "csharp-loops",

        title: "Loops",

        description: "Practice repetitive logic using C# loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["csharp-factorial", "csharp-prime-number"],
      },
    ],
  },

  {
    technologySlug: "python",

    name: "Python Programming",

    shortName: "Python",

    description: "Learn Python from syntax and input/output through conditions and loops.",

    stages: [
      {
        slug: "python-fundamentals",

        title: "Python Fundamentals",

        description: "Start with Python syntax, variables, input/output and basic operations.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["python-hello-world", "python-add-two-numbers"],
      },

      {
        slug: "python-conditions",

        title: "Conditions",

        description: "Practice Python decision-making statements.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["python-even-odd"],
      },

      {
        slug: "python-loops",

        title: "Loops",

        description: "Practice repetitive logic using Python loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["python-factorial", "python-prime-number"],
      },
    ],
  },

  {
    technologySlug: "go",

    name: "Go Programming",

    shortName: "Go",

    description: "Learn Go from syntax and input/output through conditions and loops.",

    stages: [
      {
        slug: "go-fundamentals",

        title: "Go Fundamentals",

        description: "Start with Go syntax, variables, input/output and basic operations.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["go-hello-world", "go-add-two-numbers"],
      },

      {
        slug: "go-conditions",

        title: "Conditions",

        description: "Practice Go decision-making statements.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["go-even-odd"],
      },

      {
        slug: "go-loops",

        title: "Loops",

        description: "Practice repetitive logic using Go loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["go-factorial", "go-prime-number"],
      },
    ],
  },

  {
    technologySlug: "ruby",

    name: "Ruby Programming",

    shortName: "Ruby",

    description: "Learn Ruby from syntax and input/output through conditions and loops.",

    stages: [
      {
        slug: "ruby-fundamentals",

        title: "Ruby Fundamentals",

        description: "Start with Ruby syntax, variables, input/output and basic operations.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["ruby-hello-world", "ruby-add-two-numbers"],
      },

      {
        slug: "ruby-conditions",

        title: "Conditions",

        description: "Practice Ruby decision-making statements.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["ruby-even-odd"],
      },

      {
        slug: "ruby-loops",

        title: "Loops",

        description: "Practice repetitive logic using Ruby loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["ruby-factorial", "ruby-prime-number"],
      },
    ],
  },

  {
    technologySlug: "swift",

    name: "Swift Programming",

    shortName: "Swift",

    description: "Learn Swift from syntax and input/output through conditions and loops.",

    stages: [
      {
        slug: "swift-fundamentals",

        title: "Swift Fundamentals",

        description: "Start with Swift syntax, variables, input/output and basic operations.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["swift-hello-world", "swift-add-two-numbers"],
      },

      {
        slug: "swift-conditions",

        title: "Conditions",

        description: "Practice Swift decision-making statements.",

        level: "Beginner",

        order: 2,

        problemSlugs: ["swift-even-odd"],
      },

      {
        slug: "swift-loops",

        title: "Loops",

        description: "Practice repetitive logic using Swift loops.",

        level: "Beginner",

        order: 3,

        problemSlugs: ["swift-factorial", "swift-prime-number"],
      },
    ],
  },

  {
    technologySlug: "git",

    name: "Git",

    shortName: "Git",

    description: "Practice real Git workflows — branching, staging and committing — checked against the actual resulting repository state.",

    stages: [
      {
        slug: "git-remotes",

        title: "Git Fundamentals",

        description: "Pushing changes to a remote repository.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["git-push-to-remote"],
      },
    ],
  },

  {
    technologySlug: "linux",

    name: "Linux",

    shortName: "Linux",

    description: "Practice real Linux shell commands — navigating, creating and inspecting files — checked against the actual resulting filesystem state.",

    stages: [
      {
        slug: "linux-fundamentals",

        title: "Linux Fundamentals",

        description: "Navigating directories and working with files from the shell.",

        level: "Beginner",

        order: 1,

        problemSlugs: ["linux-create-project-folder"],
      },
    ],
  },

  {
    technologySlug: "docker",
    name: "Docker",
    shortName: "Docker",
    description: "Practice writing Dockerfiles — checked against the actual file content for required instructions.",
    stages: [
      {
        slug: "docker-fundamentals",
        title: "Docker Fundamentals",
        description: "Writing Dockerfiles to containerize applications.",
        level: "Beginner",
        order: 1,
        problemSlugs: ["docker-write-a-dockerfile"],
      },
    ],
  },

  {
    technologySlug: "kubernetes",
    name: "Kubernetes",
    shortName: "Kubernetes",
    description: "Practice writing Kubernetes manifests — checked against the actual file content for required fields.",
    stages: [
      {
        slug: "kubernetes-fundamentals",
        title: "Kubernetes Fundamentals",
        description: "Writing Pod manifests to deploy containers.",
        level: "Beginner",
        order: 1,
        problemSlugs: ["write-a-pod-manifest"],
      },
    ],
  },

  {
    technologySlug: "cicd",
    name: "CI/CD",
    shortName: "CI/CD",
    description: "Practice writing CI/CD pipeline files — checked against the actual file content for required structure.",
    stages: [
      {
        slug: "cicd-fundamentals",
        title: "CI/CD Fundamentals",
        description: "Writing GitHub Actions workflows to automate builds.",
        level: "Beginner",
        order: 1,
        problemSlugs: ["write-a-github-actions-workflow"],
      },
    ],
  },
];

/* =========================================================
   GET PRACTICE PATH
========================================================= */

export function getPracticePathByTechnology(technologySlug: string) {
  return practicePaths.find((path) => path.technologySlug === technologySlug);
}

/* =========================================================
   FILTER STAGES BY LEVEL
========================================================= */

export function getPracticeStagesByLevel(technologySlug: string, level?: PracticeLevel) {
  const path = getPracticePathByTechnology(technologySlug);

  if (!path) {
    return [];
  }

  const orderedStages = [...path.stages].sort((a, b) => a.order - b.order);

  if (!level) {
    return orderedStages;
  }

  return orderedStages.filter((stage) => stage.level === level);
}

/* =========================================================
   TOTAL PROBLEMS
========================================================= */

export function getPracticeProblemCount(technologySlug: string) {
  const path = getPracticePathByTechnology(technologySlug);

  if (!path) {
    return 0;
  }

  return path.stages.reduce((total, stage) => total + stage.problemSlugs.length, 0);
}
