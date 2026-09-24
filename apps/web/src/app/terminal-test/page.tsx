"use client";

import { useEffect, useRef, useState } from "react";

import { Terminal } from "@xterm/xterm";

import { FitAddon } from "@xterm/addon-fit";

const PROBLEM_SLUG = "git-push-to-remote";

const API_URL = "http://localhost:4000/api/v1";

const CONTROL_PREFIX = "__ELAB_CONTROL__:";

export default function TerminalTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const containerNameRef = useRef<string | null>(null);

  const [checkResult, setCheckResult] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

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
      console.log("EFFECT RUN: fetching setup script");

      const setupUrl = `${API_URL}/submissions/git-setup/${PROBLEM_SLUG}`;

      let setupResponse: Response;

      try {
        setupResponse = await fetch(setupUrl);
      } catch (error) {
        console.log("EFFECT RUN: fetch itself threw", error);

        return;
      }

      const rawText = await setupResponse.text();

      console.log("EFFECT RUN: status", setupResponse.status, "body", rawText);

      if (!setupResponse.ok) {
        console.log("EFFECT RUN: response not ok, stopping");

        return;
      }

      let setupData: {
        setupScript?: string;
      };

      try {
        setupData = JSON.parse(rawText);
      } catch {
        console.log("EFFECT RUN: response was not valid JSON");

        return;
      }

      console.log("EFFECT RUN: setupScript", setupData.setupScript);

      const encodedSetup = btoa(setupData.setupScript ?? "");

      socket = new WebSocket(`ws://127.0.0.1:4100/terminal/${PROBLEM_SLUG}?setupScript=${encodeURIComponent(encodedSetup)}`);

      socket.binaryType = "arraybuffer";

      socket.onmessage = (event) => {
        if (typeof event.data === "string" && event.data.startsWith(CONTROL_PREFIX)) {
          const payload = JSON.parse(event.data.slice(CONTROL_PREFIX.length));

          containerNameRef.current = payload.containerName;

          console.log("EFFECT RUN: container assigned", payload.containerName);

          return;
        }

        const text = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);

        term.write(text);
      };

      socket.onopen = () => {
        term.write("Connected.\r\n");
      };

      socket.onclose = () => {
        term.write("\r\nSession ended.\r\n");

        console.log("EFFECT RUN: socket closed");
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
      console.log("EFFECT CLEANUP running");

      window.removeEventListener("resize", handleResize);

      dataListener?.dispose();

      socket?.close();

      term.dispose();
    };
  }, []);

  const handleCheckSolution = async () => {
    if (!containerNameRef.current) {
      setCheckResult("Session not ready yet.");

      return;
    }

    setChecking(true);

    try {
      const response = await fetch(`${API_URL}/submissions/git-check/${PROBLEM_SLUG}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          containerName: containerNameRef.current,
        }),
      });

      const data = await response.json();

      setCheckResult(`${data.status}\n\n${data.output}`);
    } catch {
      setCheckResult("Failed to check solution.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",

        width: "100vw",

        backgroundColor: "#0c0c0c",

        padding: "12px",

        boxSizing: "border-box",

        display: "flex",

        flexDirection: "column",

        gap: "12px",
      }}>
      <button
        onClick={handleCheckSolution}
        disabled={checking}
        style={{
          padding: "8px 16px",

          alignSelf: "flex-start",
        }}>
        {checking ? "Checking..." : "Check Solution"}
      </button>

      {checkResult && (
        <pre
          style={{
            color: "#f2f2f2",

            whiteSpace: "pre-wrap",
          }}>
          {checkResult}
        </pre>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
        }}
      />
    </div>
  );
}
