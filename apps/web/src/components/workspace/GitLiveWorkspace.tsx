"use client";

import { useEffect, useRef, useState } from "react";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { apiFetch } from "@/features/auth/apiFetch";
import { ArrowLeft, GitBranch, Loader2, Send } from "lucide-react";

import styles from "../../app/(learner)/workspace/[problemSlug]/workspace.module.css";

const API_URL = "http://localhost:4000/api/v1";

const CONTROL_PREFIX = "__ELAB_CONTROL__:";

type GitLiveWorkspaceProps = {
  problem: {
    slug: string;
    title: string;
    difficulty: string;
    problemStatement: string;
    constraints?: string[];
    skills: string[];
  };
  onBack: () => void;
};

export default function GitLiveWorkspace({ problem, onBack }: GitLiveWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const containerNameRef = useRef<string | null>(null);

  const [checkOutput, setCheckOutput] = useState("Check your solution to view the result.");

  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;

    const term = new Terminal({
      cursorBlink: true,

      convertEol: true,

      fontFamily: '"Cascadia Mono", Consolas, "Courier New", monospace',

      fontSize: 14,

      theme: {
        background: "#0c0c0c",

        foreground: "#f2f2f2",

        cursor: "#f2f2f2",
      },
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);

    term.open(containerRef.current);

    fitAddon.fit();

    let socket: WebSocket | null = null;

    let dataListener: {
      dispose: () => void;
    } | null = null;

    (async () => {
      let setupResponse: Response;

      try {
        setupResponse = await apiFetch(`${API_URL}/submissions/git-setup/${problem.slug}`);
      } catch {
        if (!cancelled) {
          term.write("Unable to connect to the server. Please refresh.\r\n");
        }

        return;
      }

      if (cancelled) {
        return;
      }

      if (!setupResponse.ok) {
        term.write("Unable to prepare this task. Please refresh.\r\n");

        return;
      }

      const setupData = (await setupResponse.json()) as {
        setupScript?: string;
      };

      if (cancelled) {
        return;
      }

      const encodedSetup = btoa(setupData.setupScript ?? "");

      socket = new WebSocket(`ws://127.0.0.1:4100/terminal/${problem.slug}?setupScript=${encodeURIComponent(encodedSetup)}`);

      socket.binaryType = "arraybuffer";

      if (cancelled) {
        socket.close();

        return;
      }

      socket.onmessage = (event) => {
        if (cancelled) {
          return;
        }

        if (typeof event.data === "string" && event.data.startsWith(CONTROL_PREFIX)) {
          const payload = JSON.parse(event.data.slice(CONTROL_PREFIX.length));

          containerNameRef.current = payload.containerName;

          return;
        }

        const text = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);

        term.write(text);
      };

      socket.onclose = () => {
        if (!cancelled) {
          term.write("\r\nSession ended.\r\n");
        }
      };

      dataListener = term.onData((data) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });
    })();

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;

      window.removeEventListener("resize", handleResize);

      dataListener?.dispose();

      socket?.close();

      term.dispose();
    };
  }, [problem.slug]);

  const handleCheckSolution = async () => {
    if (!containerNameRef.current) {
      setCheckOutput("Session not ready yet — wait a moment and try again.");

      return;
    }

    setChecking(true);

    setCheckOutput("Checking your solution...");

    try {
      const response = await apiFetch(`${API_URL}/submissions/git-check/${problem.slug}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          containerName: containerNameRef.current,
        }),
      });

      const data = await response.json();

      if (data.status === "ACCEPTED") {
        setCheckOutput(["Accepted ✓", "", data.output].join("\n"));
      } else {
        setCheckOutput(["Wrong Answer", "", data.output, "", "Fix your solution and check again."].join("\n"));
      }
    } catch {
      setCheckOutput(["Check Solution Server Error", "", "Unable to connect to the submission service."].join("\n"));
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft />
          Problems
        </button>

        <div className={styles.problemTitle}>
          <GitBranch />

          <div>
            <strong>{problem.title}</strong>

            <span>
              Git
              {" • "}
              {problem.difficulty}
            </span>
          </div>
        </div>

        <div className={styles.workspaceActions}>
          <button type="button" className={styles.submitButton} onClick={handleCheckSolution} disabled={checking}>
            {checking ? <Loader2 className={styles.spinner} /> : <Send />}
            {checking ? "Checking..." : "Check Solution"}
          </button>
        </div>
      </header>

      <div className={styles.workspaceBody}>
        <section className={styles.problemPanel}>
          <div className={styles.problemPanelHeader}>Problem</div>

          <div className={styles.problemPanelContent}>
            <div className={styles.difficulty}>{problem.difficulty}</div>

            <h1>{problem.title}</h1>

            <p className={styles.statement}>{problem.problemStatement}</p>

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

            <h2>Skills</h2>

            <div className={styles.skillTags}>
              {problem.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.editorPanel}>
          <div className={styles.editorHeader}>
            <span>Git</span>

            <span>DevOps Workspace</span>
          </div>

          <div ref={containerRef} style={{ minHeight: 0, minWidth: 0 }} />

          <div className={styles.consolePanel} style={{ gridRow: "3 / span 2" }}>
            <div className={styles.consoleHeader}>
              <span>Check Solution Result</span>

              <span>{checking ? "Checking" : "Console"}</span>
            </div>

            <pre className={styles.consoleBody}>{checkOutput}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}