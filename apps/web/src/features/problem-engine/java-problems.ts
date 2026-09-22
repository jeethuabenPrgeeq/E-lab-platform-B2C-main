import type { PracticeProblem } from "./types";

type JavaProblemInput = Omit <PracticeProblem, "technologySlug" | "workspaceType" | "defaultLanguage" | "allowedLanguages">;

function javaProblem(problem: JavaProblemInput): PracticeProblem {
  return {
    ...problem,
    technologySlug: "java",
    workspaceType: "code",
    defaultLanguage: "java",
    allowedLanguages: ["java"],
  };
}

export const javaProblems: PracticeProblem[] = [
  javaProblem({
    slug: "java-hello-world",
    title: "Hello World",
    difficulty: "Easy",
    shortDescription: "Write your first Java program and print text to the console.",
    problemStatement: "Write a Java program that prints Hello, World! exactly as shown.",
    outputFormat: "Print the text: Hello, World!",
    skills: ["Java Syntax", "main method", "System.out.println"],
    estimatedMinutes: 5,
    starterCode: `public class Main {
    public static void main(String[] args) {
        // Write your code here
    }
}`,
    sampleTests: [
      {
        id: "sample-1",
        title: "Expected Output",
        expectedOutput: "Hello, World!",
      },
    ],
  }),

  javaProblem({
    slug: "java-add-two-numbers",
    title: "Add Two Numbers",
    difficulty: "Easy",
    shortDescription: "Read two integers and print their sum.",
    problemStatement: "Read two integers A and B from standard input and print their sum.",
    inputFormat: "Two integers A and B separated by a space.",
    outputFormat: "Print one integer representing A + B.",
    constraints: ["-100000 ≤ A ≤ 100000", "-100000 ≤ B ≤ 100000"],
    skills: ["Scanner", "Variables", "Arithmetic"],
    estimatedMinutes: 10,
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int a = scanner.nextInt();
        int b = scanner.nextInt();

        // Print the sum
    }
}`,
    sampleTests: [{ id: "sample-1", title: "Sample 1", input: "5 7", expectedOutput: "12" }],
  }),

  javaProblem({
    slug: "java-even-odd",
    title: "Even or Odd",
    difficulty: "Easy",
    shortDescription: "Determine whether a number is even or odd.",
    problemStatement: "Read an integer and print Even if it is divisible by 2, otherwise print Odd.",
    inputFormat: "A single integer N.",
    outputFormat: "Print Even or Odd.",
    skills: ["Scanner", "if / else", "Modulus"],
    estimatedMinutes: 10,
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int number = scanner.nextInt();

        // Check even or odd
    }
}`,
    sampleTests: [{ id: "sample-1", title: "Sample 1", input: "8", expectedOutput: "Even" }],
  }),

  javaProblem({
    slug: "java-factorial",
    title: "Factorial",
    difficulty: "Easy",
    shortDescription: "Calculate the factorial of a number.",
    problemStatement: "Read a non-negative integer N and print N factorial.",
    inputFormat: "A single non-negative integer N.",
    outputFormat: "Print N factorial.",
    skills: ["Loops", "Variables", "Arithmetic"],
    estimatedMinutes: 12,
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int n = scanner.nextInt();

        // Calculate factorial
    }
}`,
    sampleTests: [{ id: "sample-1", title: "Sample 1", input: "5", expectedOutput: "120" }],
  }),

  javaProblem({
    slug: "java-prime-number",
    title: "Prime Number",
    difficulty: "Easy",
    shortDescription: "Determine whether a number is prime.",
    problemStatement: "Read an integer and print Prime if it is prime, otherwise print Not Prime.",
    inputFormat: "A single integer N.",
    outputFormat: "Print Prime or Not Prime.",
    skills: ["Loops", "Conditions", "Prime numbers"],
    estimatedMinutes: 15,
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int n = scanner.nextInt();

        // Check prime
    }
}`,
    sampleTests: [{ id: "sample-1", title: "Sample 1", input: "7", expectedOutput: "Prime" }],
  }),
];
