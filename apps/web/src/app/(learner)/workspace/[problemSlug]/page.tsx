"use client";

import { ArrowLeft, Code2, Loader2, Play, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import CodeEditor from "@/components/editor/CodeEditor";
import GitLiveWorkspace from "../../../../components/workspace/GitLiveWorkspace";
import LinuxLiveWorkspace from "../../../../components/workspace/LinuxLiveWorkspace";
import DockerLiveWorkspace from '../../../../components/workspace/DockerLiveWorkspace';
import KubernetesLiveWorkspace from '../../../../components/workspace/KubernetesLiveWorkspace';
import CicdLiveWorkspace from '../../../../components/workspace/CicdLiveWorkspace';
import { getProblemBySlug } from "@/features/problem-engine";
import { markProblemSolved } from "@/features/progress/local-progress";
import styles from "./workspace.module.css";

/* =========================================================
   API
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/* =========================================================
   EXECUTION RESPONSE
========================================================= */

type ExecutionResponse = {
  status?: string;
  output?: string;
  stderr?: string;
  message?: string;
  exitCode?: number | null;
};

/* =========================================================
   SUBMISSION TEST RESULT
========================================================= */

type SubmissionTestResult = {
  testNumber: number;
  status: string;
  passed?: boolean;
};

/* =========================================================
   SUBMISSION RESPONSE
========================================================= */

type SubmissionResponse = {
  status?: string;
  score?: number;
  passedTests?: number;
  totalTests?: number;
  output?: string;
  stderr?: string;
  message?: string;
  results?: SubmissionTestResult[];
};

/* =========================================================
   LANGUAGE LABEL
========================================================= */

function formatLanguageName(language: string) {
  const names: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    csharp: "C#",
    go: "Go",
    html: "HTML",
    css: "CSS",
    sql: "SQL",
  };

  return names[language] ?? language;
}

/* =========================================================
   DELAY
========================================================= */

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

/* =========================================================
   WORKSPACE PAGE
========================================================= */

export default function CodingWorkspacePage() {
  const router = useRouter();

  const params = useParams<{
    problemSlug: string;
  }>();

  const searchParams = useSearchParams();

  const problemSlug = params.problemSlug;

  const problem = getProblemBySlug(problemSlug);

  /* =======================================================
     CONTEXT
  ======================================================= */

  const source = searchParams.get("source");

  const technology = searchParams.get("technology");

  const domain = searchParams.get("domain");

  const stack = searchParams.get("stack");

  const moduleSlug = searchParams.get("module");

  const challenge = searchParams.get("challenge");

  const attempt = searchParams.get("attempt");

  /* =======================================================
     STARTER CODE
  ======================================================= */

  const initialCode = problem?.starterCode ?? problem?.starterFiles?.[0]?.content ?? "";

  /* =======================================================
     SAMPLE INPUT
  ======================================================= */

  const initialInput = problem?.sampleTests?.[0]?.input ?? "";

  /* =======================================================
     STATE
  ======================================================= */

  const [code, setCode] = useState(initialCode);

  const [customInput, setCustomInput] = useState(initialInput);

  const [output, setOutput] = useState("Run your code to view the output.");

  const [isRunning, setIsRunning] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  /* =======================================================
     RESET WHEN PROBLEM CHANGES
  ======================================================= */

  useEffect(() => {
    const selectedProblem = getProblemBySlug(problemSlug);

    const nextCode = selectedProblem?.starterCode ?? selectedProblem?.starterFiles?.[0]?.content ?? "";

    const nextInput = selectedProblem?.sampleTests?.[0]?.input ?? "";

    setCode(nextCode);

    setCustomInput(nextInput);

    setOutput("Run your code to view the output.");
  }, [problemSlug]);

  /* =======================================================
     PROBLEM NOT FOUND
  ======================================================= */

  if (!problem) {
    return (
      <main className={styles.notFound}>
        <h1>Problem not found</h1>

        <button type="button" onClick={() => router.push("/dashboard")}>
          Dashboard
        </button>
      </main>
    );
  }

  const languageName = formatLanguageName(problem.defaultLanguage);

  /* =======================================================
     BACK TO CORRECT QUESTION LIST
  ======================================================= */

  const goBack = () => {
    /* ===============================================
       STACK
    =============================================== */

    if (source === "stack" && domain && stack && moduleSlug) {
      router.push(`/stacks/${domain}/${stack}/${moduleSlug}`);

      return;
    }

    /* ===============================================
       PRACTICE
    =============================================== */

    if (source === "practice" && technology) {
      router.push(`/practice/${technology}`);

      return;
    }

    /* ===============================================
       CHALLENGE
    =============================================== */

    if (source === "challenge" && challenge) {
      router.push(`/challenges/${challenge}`);

      return;
    }

    router.back();
  };

  if (problem.technologySlug === "git") {
    return <GitLiveWorkspace problem={problem} onBack={goBack} />;
  }

  if (problem.technologySlug === "linux") {
    return <LinuxLiveWorkspace problem={problem} onBack={goBack} />;
  }

  if (problem.technologySlug === 'docker') {
    return <DockerLiveWorkspace problem={problem} onBack={goBack} />;
  }

  if (problem.technologySlug === 'kubernetes') {
    return <KubernetesLiveWorkspace problem={problem} onBack={goBack} />;
  }

  if (problem.technologySlug === 'cicd') {
    return <CicdLiveWorkspace problem={problem} onBack={goBack} />;
  }

  /* =======================================================
     RETURN AFTER SUCCESSFUL SUBMISSION
  ======================================================= */

  const returnAfterSolved = () => {
    /* ===============================================
       PRACTICE
    =============================================== */

    if (source === "practice" && technology) {
      router.replace(`/practice/${technology}`);

      return;
    }

    /* ===============================================
       STACK
    =============================================== */

    if (source === "stack" && domain && stack && moduleSlug) {
      router.replace(`/stacks/${domain}/${stack}/${moduleSlug}`);

      return;
    }

    /* ===============================================
       CHALLENGE
    =============================================== */

    if (source === "challenge" && challenge) {
      router.replace(`/challenges/${challenge}`);

      return;
    }

    router.back();
  };

  /* =======================================================
     RUN
  ======================================================= */

  const handleRun = async () => {
    if (!code.trim()) {
      setOutput("Please enter code before running.");

      return;
    }

    setIsRunning(true);

    setOutput("Compiling and running your code...");

    try {
      const response = await fetch(`${API_URL}/executions/run`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          problemSlug: problem.slug,

          language: problem.defaultLanguage,

          workspaceType: problem.workspaceType,

          code,

          input: customInput,

          context: {
            source: source ?? "practice",

            technology,

            domain,

            stack,

            module: moduleSlug,

            challenge,

            attempt,
          },
        }),
      });

      const data = (await response.json()) as ExecutionResponse;

      /* ===============================================
           HTTP ERROR
        =============================================== */

      if (!response.ok) {
        setOutput(data.message ?? "Execution failed.");

        return;
      }

      /* ===============================================
           SUCCESS
        =============================================== */

      if (data.status === "SUCCESS") {
        const programOutput = data.output ?? "";

        setOutput(programOutput.trim() ? programOutput : "Program completed successfully with no output.");

        return;
      }

      /* ===============================================
           COMPILATION ERROR
        =============================================== */

      if (data.status === "COMPILATION_ERROR") {
        setOutput(["Compilation Error", "", data.output ?? data.stderr ?? "Compilation failed."].join("\n"));

        return;
      }

      /* ===============================================
           TIME LIMIT EXCEEDED
        =============================================== */

      if (data.status === "TIME_LIMIT_EXCEEDED") {
        setOutput(["Time Limit Exceeded", "", "Your program exceeded the allowed execution time."].join("\n"));

        return;
      }

      /* ===============================================
           RUNTIME ERROR
        =============================================== */

      if (data.status === "RUNTIME_ERROR") {
        setOutput(["Runtime Error", "", data.output ?? data.stderr ?? "The program terminated unexpectedly."].join("\n"));

        return;
      }

      /* ===============================================
           FALLBACK
        =============================================== */

      setOutput(data.output ?? data.message ?? "Execution completed.");
    } catch (error) {
      console.error(error);

      setOutput(["Execution Server Error", "", "Unable to connect to the compiler service."].join("\n"));
    } finally {
      setIsRunning(false);
    }
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async () => {
    if (!code.trim()) {
      setOutput("Please enter code before submitting.");

      return;
    }

    setIsSubmitting(true);

    setOutput("Submitting solution and running hidden test cases...");

    try {
      const response = await fetch(`${API_URL}/submissions`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          problemSlug: problem.slug,

          language: problem.defaultLanguage,

          code,

          context: {
            source: source ?? "practice",

            technology,

            domain,

            stack,

            module: moduleSlug,

            challenge,

            attempt,
          },
        }),
      });

      const data = (await response.json()) as SubmissionResponse;

      /* ===============================================
           HTTP ERROR
        =============================================== */

      if (!response.ok) {
        setOutput(data.message ?? "Submission failed.");

        return;
      }

      /* ===============================================
           COMPILATION ERROR
        =============================================== */

      if (data.status === "COMPILATION_ERROR") {
        setOutput(["Compilation Error", "", data.output ?? data.stderr ?? "Compilation failed."].join("\n"));

        return;
      }

      /* ===============================================
           FORMAT TEST RESULTS
        =============================================== */

      const testResults = Array.isArray(data.results) ? data.results.map((result) => `Test ${result.testNumber}: ${result.status}`).join("\n") : "";

      const passedTests = data.passedTests ?? 0;

      const totalTests = data.totalTests ?? 0;

      const score = data.score ?? 0;

      /* ===============================================
           SUCCESS CONDITION

           Important:
           Do NOT require data.accepted === true.

           We treat the submission as solved when:
           - backend status is ACCEPTED
           - hidden tests exist
           - all hidden tests passed
        =============================================== */

      const allTestsPassed = data.status === "ACCEPTED" && totalTests > 0 && passedTests === totalTests;

      /* ===============================================
           ACCEPTED + ALL TESTS PASSED
        =============================================== */

      if (allTestsPassed) {
        markProblemSolved(problem.slug);

        console.log("Problem marked as solved:", problem.slug);

        setOutput(["Accepted ✓", "", `${passedTests}/${totalTests} test cases passed`, `Score: ${score}%`, "", testResults, "", "Problem solved successfully."].join("\n"));

        return;
      }

      /* ===============================================
           ACCEPTED BUT TEST COUNTS COULD NOT BE VERIFIED
        =============================================== */

      if (data.status === "ACCEPTED") {
        setOutput(["Submission received.", "", `${passedTests}/${totalTests} test cases passed`, `Score: ${score}%`, "", testResults, "", "The problem was not marked solved because all test results could not be verified."].join("\n"));

        return;
      }

      /* ===============================================
           WRONG ANSWER
        =============================================== */

      if (data.status === "WRONG_ANSWER") {
        setOutput(["Wrong Answer", "", `${passedTests}/${totalTests} test cases passed`, `Score: ${score}%`, "", testResults, "", "Fix your solution and submit again."].join("\n"));

        return;
      }

      /* ===============================================
           TIME LIMIT
        =============================================== */

      if (data.status === "TIME_LIMIT_EXCEEDED") {
        setOutput(["Time Limit Exceeded", "", `${passedTests}/${totalTests} test cases passed`, "", testResults, "", "Optimize your solution and submit again."].join("\n"));

        return;
      }

      /* ===============================================
           RUNTIME ERROR
        =============================================== */

      if (data.status === "RUNTIME_ERROR") {
        setOutput(["Runtime Error", "", data.output ?? data.stderr ?? data.message ?? "Your program failed during execution."].join("\n"));

        return;
      }

      /* ===============================================
           FALLBACK
        =============================================== */

      setOutput(data.message ?? data.output ?? "Submission completed.");
    } catch (error) {
      console.error(error);

      setOutput(["Submission Server Error", "", "Unable to connect to the submission service."].join("\n"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className={styles.workspace}>
      {/* =================================================
          HEADER
      ================================================= */}

      <header className={styles.workspaceHeader}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          <ArrowLeft />
          Problems
        </button>

        <div className={styles.problemTitle}>
          <Code2 />

          <div>
            <strong>{problem.title}</strong>

            <span>
              {languageName}

              {" • "}

              {problem.difficulty}
            </span>
          </div>
        </div>

        <div className={styles.workspaceActions}>
          {/* =============================================
              RUN
          ============================================= */}

          <button type="button" className={styles.runButton} onClick={handleRun} disabled={isRunning || isSubmitting}>
            {isRunning ? <Loader2 className={styles.spinner} /> : <Play />}

            {isRunning ? "Running..." : "Run"}
          </button>

          {/* =============================================
              SUBMIT
          ============================================= */}

          <button type="button" className={styles.submitButton} onClick={handleSubmit} disabled={isRunning || isSubmitting}>
            {isSubmitting ? <Loader2 className={styles.spinner} /> : <Send />}

            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {/* =================================================
          BODY
      ================================================= */}

      <div className={styles.workspaceBody}>
        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <section className={styles.problemPanel}>
          <div className={styles.problemPanelHeader}>Problem</div>

          <div className={styles.problemPanelContent}>
            {/* ===========================================
                DIFFICULTY
            =========================================== */}

            <div className={styles.difficulty}>{problem.difficulty}</div>

            {/* ===========================================
                TITLE
            =========================================== */}

            <h1>{problem.title}</h1>

            {/* ===========================================
                PROBLEM STATEMENT
            =========================================== */}

            <p className={styles.statement}>{problem.problemStatement}</p>

            {/* ===========================================
                INPUT FORMAT
            =========================================== */}

            {problem.inputFormat && (
              <>
                <h2>Input Format</h2>

                <p className={styles.statement}>{problem.inputFormat}</p>
              </>
            )}

            {/* ===========================================
                OUTPUT FORMAT
            =========================================== */}

            {problem.outputFormat && (
              <>
                <h2>Output Format</h2>

                <p className={styles.statement}>{problem.outputFormat}</p>
              </>
            )}

            {/* ===========================================
                CONSTRAINTS
            =========================================== */}

            {problem.constraints && problem.constraints.length > 0 && (
              <>
                <h2>Constraints</h2>

                <div className={styles.contextBox}>
                  {problem.constraints.map((constraint) => (
                    <p key={constraint}>{constraint}</p>
                  ))}
                </div>
              </>
            )}

            {/* ===========================================
                SKILLS
            =========================================== */}

            <h2>Skills</h2>

            <div className={styles.skillTags}>
              {problem.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>

            {/* ===========================================
                SAMPLE TESTS
            =========================================== */}

            {problem.sampleTests && problem.sampleTests.length > 0 && (
              <>
                <h2>Examples</h2>

                {problem.sampleTests.map((sample) => (
                  <div key={sample.id} className={styles.contextBox}>
                    <span>{sample.title}</span>

                    {sample.input !== undefined && <p>Input: {sample.input}</p>}

                    {sample.expectedOutput !== undefined && <p>Expected: {sample.expectedOutput}</p>}

                    {sample.description && <p>{sample.description}</p>}
                  </div>
                ))}
              </>
            )}

            {/* ===========================================
                CONTEXT
            =========================================== */}

            <div className={styles.contextBox}>
              <span>Practice Context</span>

              <p>Source: {source ?? "practice"}</p>

              {technology && <p>Technology: {technology}</p>}

              {domain && <p>Domain: {domain}</p>}

              {stack && <p>Stack: {stack}</p>}

              {moduleSlug && <p>Module: {moduleSlug}</p>}

              {challenge && <p>Challenge: {challenge}</p>}
            </div>
          </div>
        </section>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <section className={styles.editorPanel}>
          {/* =============================================
              EDITOR HEADER
          ============================================= */}

          <div className={styles.editorHeader}>
            <span>{languageName}</span>

            <span>{problem.workspaceType} Workspace</span>
          </div>

          {/* =============================================
              MONACO EDITOR
          ============================================= */}

          <CodeEditor value={code} language={problem.defaultLanguage} onChange={setCode} readOnly={isSubmitting} />

          {/* =============================================
              TEST INPUT
          ============================================= */}

          <div className={styles.inputPanel}>
            <div className={styles.inputHeader}>
              <span>Test Input</span>

              <span>stdin</span>
            </div>

            <textarea className={styles.inputEditor} value={customInput} onChange={(event) => setCustomInput(event.target.value)} placeholder="Enter input for your program..." spellCheck={false} />
          </div>

          {/* =============================================
              OUTPUT
          ============================================= */}

          <div className={styles.consolePanel}>
            <div className={styles.consoleHeader}>
              <span>Output</span>

              <span>{isRunning ? "Running" : isSubmitting ? "Judging" : "Console"}</span>
            </div>

            <pre className={styles.consoleBody}>{output}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}
