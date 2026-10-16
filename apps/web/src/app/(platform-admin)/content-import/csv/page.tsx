"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { CircleAlert, CircleCheck, Download, FileDown, FileSpreadsheet, LoaderCircle, RotateCcw, Upload, X } from "lucide-react";
import { buildExportCsv, buildTemplateCsv, parseCsv } from "@/features/admin/practice-upload/csv";
import { MAX_FILE_BYTES, PRACTICE_COLUMNS, STORAGE_KEYS } from "@/features/admin/practice-upload/schema";
import { TechnologyPicker, technologyFromUrl } from "@/features/admin/practice-upload/TechnologyPicker";
import { validateRows, type PreviewRow, type ValidationSummary } from "@/features/admin/practice-upload/validate";
import { UploadModeSwitch } from "@/features/admin/practice-upload/UploadModeSwitch";
import { useUploadScope } from "@/features/admin/practice-upload/scope";
import styles from "./page.module.css";

type Phase = "idle" | "parsing" | "invalid" | "ready" | "importing" | "imported";
type RowFilter = "all" | "error" | "warning" | "valid";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const PREVIEW_COLUMNS = ["problem_id", "title", "topic", "difficulty", "hidden_test_case_count"];

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function clearSession(...keys: string[]) {
  try {
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {}
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function UploadToPracticePage() {
  const scope = useUploadScope();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const runId = useRef(0);

  const [technology, setTechnology] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [fatal, setFatal] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState<RowFilter>("all");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  useEffect(() => {
    const savedTech = technologyFromUrl() ?? readSession<string>(STORAGE_KEYS.selectedTechnology);
    if (savedTech) {
      setTechnology(savedTech);
      writeSession(STORAGE_KEYS.selectedTechnology, savedTech);
    }
    const savedSummary = readSession<ValidationSummary>(STORAGE_KEYS.summary);
    const savedRows = readSession<PreviewRow[]>(STORAGE_KEYS.previewRows);
    if (savedSummary && savedRows) {
      setSummary(savedSummary);
      setRows(savedRows);
      setFile({ name: savedSummary.fileName, size: 0 });
      setPhase(savedSummary.errorRows > 0 ? "invalid" : "ready");
    }
  }, []);

  const changeTechnology = (value: string) => {
    setTechnology(value);
    writeSession(STORAGE_KEYS.selectedTechnology, value);
    if (file) reset();
  };

  const reset = useCallback(() => {
    runId.current++;
    setPhase("idle");
    setFile(null);
    setFatal([]);
    setRows([]);
    setSummary(null);
    setFilter("all");
    setImportResult(null);
    clearSession(STORAGE_KEYS.previewRows, STORAGE_KEYS.summary);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const processFile = useCallback(
    async (selected: File) => {
      const id = ++runId.current;
      setFile({ name: selected.name, size: selected.size });
      setFatal([]);
      setRows([]);
      setSummary(null);
      setFilter("all");
      setImportResult(null);

      if (!/\.csv$/i.test(selected.name)) {
        setFatal(["Only .csv files are supported"]);
        setPhase("invalid");
        return;
      }
      if (selected.size > MAX_FILE_BYTES) {
        setFatal([`File is larger than ${formatBytes(MAX_FILE_BYTES)}`]);
        setPhase("invalid");
        return;
      }

      setPhase("parsing");
      try {
        const text = await selected.text();
        if (id !== runId.current) return;
        const table = parseCsv(text);
        if (table.length < 2) {
          setFatal(["The file has no data rows"]);
          setPhase("invalid");
          return;
        }
        const result = validateRows(table, selected.name, technology);
        if (id !== runId.current) return;
        if (result.headerErrors.length > 0) {
          setFatal(result.headerErrors);
          setPhase("invalid");
          return;
        }
        setRows(result.rows);
        setSummary(result.summary);
        writeSession(STORAGE_KEYS.previewRows, result.rows);
        writeSession(STORAGE_KEYS.summary, result.summary);
        setPhase(result.summary.errorRows > 0 ? "invalid" : "ready");
      } catch (error) {
        if (id !== runId.current) return;
        setFatal([error instanceof Error ? error.message : "Could not read the file"]);
        setPhase("invalid");
      }
    },
    [technology],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) void processFile(selected);
  };

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current++;
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (phase === "parsing" || phase === "importing") return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) void processFile(dropped);
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(technology)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `practice-template-${technology.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importRows = async () => {
    if (!summary) return;
    const importable = rows.filter((row) => row.status !== "error");
    if (importable.length === 0) return;
    const previousPhase = phase;
    setSaveError("");
    setPhase("importing");
    try {
      await scope.save({
        technology,
        method: "csv",
        source: summary.fileName,
        rows: importable.map((row) => row.values),
      });
      clearSession(STORAGE_KEYS.previewRows, STORAGE_KEYS.summary);
      setImportResult({ imported: importable.length, skipped: rows.length - importable.length });
      setPhase("imported");
    } catch (cause) {
      setPhase(previousPhase);
      setSaveError(cause instanceof Error ? cause.message : "Could not save. Try again.");
    }
  };

  const pickNewFile = () => {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const exportRows = () => {
    if (!summary) return;
    const blob = new Blob([buildExportCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${summary.fileName.replace(/\.csv$/i, "")}-validated.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importableCount = summary ? summary.validRows + summary.warningRows : 0;
  const visibleRows = filter === "all" ? rows : rows.filter((row) => row.status === filter);
  const busy = phase === "parsing" || phase === "importing";
  type StepState = "done" | "current" | "attention" | "todo";

  const validated = phase === "invalid" || phase === "ready" || phase === "importing" || phase === "imported";

  let uploadStep: { state: StepState; detail: string };
  if (file) {
    uploadStep = { state: "done", detail: "File received" };
  } else {
    uploadStep = { state: "current", detail: "Choose a CSV file to begin" };
  }

  let validateStep: { state: StepState; detail: string };
  if (phase === "parsing") {
    validateStep = { state: "current", detail: "Checking rows…" };
  } else if (!validated) {
    validateStep = { state: "todo", detail: "Rows are checked automatically" };
  } else if (!summary) {
    validateStep = { state: "attention", detail: "File could not be read" };
  } else if (summary.errorRows > 0) {
    validateStep = {
      state: "attention",
      detail: `${plural(summary.errorRows, "error")} · ${plural(summary.warningRows, "warning")}`,
    };
  } else {
    validateStep = { state: "done", detail: `${plural(summary.totalRows, "row")} checked` };
  }

  let importStep: { state: StepState; detail: string };
  if (phase === "imported") {
    importStep = { state: "done", detail: `${plural(importResult?.imported ?? 0, "row")} saved as draft` };
  } else if (phase === "importing") {
    importStep = { state: "current", detail: "Saving rows…" };
  } else if (validated && importableCount > 0) {
    importStep = { state: "current", detail: `${plural(importableCount, "row")} ready to upload` };
  } else if (validated) {
    importStep = { state: "attention", detail: "No rows to upload" };
  } else {
    importStep = { state: "todo", detail: "Save rows as draft" };
  }

  const steps = [
    { label: "Upload", ...uploadStep },
    { label: "Validate", ...validateStep },
    { label: "Import", ...importStep },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{scope.title}</h1>
          <div className={styles.meta}>
            <span className={styles.pill}>CSV bulk upload</span>
            <span>{PRACTICE_COLUMNS.length} columns</span>
            {file && <span className={styles.metaFile}>{file.name}</span>}
          </div>
        </div>
        <div className={styles.headerActions}>
          <TechnologyPicker value={technology} onChange={changeTechnology} disabled={busy} wrapClassName={styles.selectWrap} labelClassName={styles.selectLabel} selectClassName={styles.select} />
          <button type="button" className={styles.secondaryButton} onClick={downloadTemplate}>
            <Download width={16} height={16} aria-hidden="true" />
            Template
          </button>
        </div>
      </header>

      <UploadModeSwitch active="csv" />

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="upload-heading">
          <h2 id="upload-heading" className={styles.cardTitle}>
            <FileSpreadsheet width={18} height={18} aria-hidden="true" />
            Upload file
          </h2>

          {phase === "idle" || !file ? (
            <div className={cx(styles.dropzone, dragging && styles.dropzoneActive)} onDragEnter={onDragEnter} onDragOver={(event) => event.preventDefault()} onDragLeave={onDragLeave} onDrop={onDrop}>
              <span className={styles.dropIcon} aria-hidden="true">
                <Upload width={24} height={24} />
              </span>
              <p className={styles.dropTitle}>Drag & drop your CSV here</p>
              <p className={styles.dropHint}>or</p>
              <button type="button" className={styles.primaryButton} onClick={() => inputRef.current?.click()}>
                Browse file
              </button>
              <p className={styles.dropHint}>.csv only · up to {formatBytes(MAX_FILE_BYTES)}</p>
            </div>
          ) : (
            <div className={styles.fileCard}>
              <span className={styles.fileIcon} aria-hidden="true">
                <FileSpreadsheet width={22} height={22} />
              </span>
              <div className={styles.fileText}>
                <p className={styles.fileName}>{file.name}</p>
                <p className={styles.fileMeta}>
                  {file.size > 0 ? formatBytes(file.size) : "Restored from this session"} · Technology: {technology}
                </p>
              </div>
              <button type="button" className={styles.iconButton} aria-label="Remove file" disabled={busy} onClick={reset}>
                <X width={18} height={18} aria-hidden="true" />
              </button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={onInputChange} />

          <ol className={styles.steps} aria-label="Upload progress">
            {steps.map((step, index) => (
              <li key={step.label} className={styles.step} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>
                <span className={styles.stepDot}>{step.state === "done" ? <CircleCheck width={16} height={16} aria-hidden="true" /> : step.state === "attention" ? <CircleAlert width={16} height={16} aria-hidden="true" /> : index + 1}</span>
                <div className={styles.stepText}>
                  <p className={styles.stepLabel}>{step.label}</p>
                  <p className={styles.stepDetail} title={step.detail}>
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.card} aria-labelledby="validation-heading" aria-live="polite">
          <h2 id="validation-heading" className={styles.cardTitle}>
            Validation
          </h2>

          {phase === "idle" && (
            <div className={styles.state}>
              <p className={styles.stateTitle}>Waiting for a file</p>
              <p className={styles.stateText}>Pick a technology, download the template, fill it in and upload it here.</p>
            </div>
          )}

          {phase === "parsing" && (
            <div className={styles.state}>
              <LoaderCircle className={styles.spin} width={28} height={28} aria-hidden="true" />
              <p className={styles.stateTitle}>Validating {file?.name}</p>
            </div>
          )}

          {fatal.length > 0 && (
            <div className={cx(styles.state, styles.stateError)}>
              <CircleAlert width={28} height={28} aria-hidden="true" />
              <p className={styles.stateTitle}>File rejected</p>
              <ul className={styles.fatalList}>
                {fatal.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
              <button type="button" className={styles.secondaryButton} onClick={reset}>
                <RotateCcw width={16} height={16} aria-hidden="true" />
                Try another file
              </button>
            </div>
          )}

          {summary && fatal.length === 0 && phase !== "parsing" && (
            <>
              <dl className={styles.kpis}>
                <div className={styles.kpi}>
                  <dt>Total rows</dt>
                  <dd>{summary.totalRows}</dd>
                </div>
                <div className={cx(styles.kpi, styles.kpiSuccess)}>
                  <dt>Valid</dt>
                  <dd>{summary.validRows}</dd>
                </div>
                <div className={cx(styles.kpi, styles.kpiWarning)}>
                  <dt>Warnings</dt>
                  <dd>{summary.warningRows}</dd>
                </div>
                <div className={cx(styles.kpi, styles.kpiDanger)}>
                  <dt>Errors</dt>
                  <dd>{summary.errorRows}</dd>
                </div>
              </dl>

              {phase === "invalid" && (
                <p className={cx(styles.banner, styles.bannerError)}>
                  {summary.errorRows === 1 ? "1 row has errors. " : `${summary.errorRows} rows have errors. `}
                  {importableCount > 0 ? `Fix and re-upload, or upload the ${plural(importableCount, "row")} without errors now${summary.warningRows > 0 ? ` (${summary.warningRows} with warnings)` : ""} and skip the rest.` : "Fix them and upload the file again."}
                </p>
              )}
              {phase === "ready" && (
                <p className={cx(styles.banner, styles.bannerSuccess)}>
                  {`${plural(summary.totalRows, "problem")} ready to upload as draft.`}
                  {summary.warningRows > 0 && ` ${summary.warningRows} with warnings.`}
                </p>
              )}
              {phase === "imported" && importResult && (
                <p className={cx(styles.banner, styles.bannerSuccess)}>
                  {scope.uploaded(plural(importResult.imported, "problem"))}
                  {importResult.skipped > 0 && ` Skipped ${plural(importResult.skipped, "row")} with errors.`}
                </p>
              )}

              <div className={styles.actions}>
                {saveError && (
                  <p className={styles.saveError} role="alert">
                    {saveError}
                  </p>
                )}
                <button type="button" className={styles.secondaryButton} disabled={busy} onClick={reset}>
                  <RotateCcw width={16} height={16} aria-hidden="true" />
                  {phase === "imported" ? "Start new" : "Start over"}
                </button>
                <button type="button" className={styles.secondaryButton} disabled={busy} onClick={pickNewFile}>
                  <Upload width={16} height={16} aria-hidden="true" />
                  Upload
                </button>
                {phase !== "imported" && (
                  <button type="button" className={styles.primaryButton} disabled={busy || importableCount === 0} onClick={importRows}>
                    {phase === "importing" && <LoaderCircle className={styles.spin} width={16} height={16} />}
                    {phase === "importing" ? "Uploading…" : `Upload ${plural(importableCount, "row")}`}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {summary && rows.length > 0 && fatal.length === 0 && (
        <section className={styles.card} aria-labelledby="results-heading">
          <div className={styles.resultsHeader}>
            <h2 id="results-heading" className={styles.cardTitle}>
              Preview
            </h2>
            <div className={styles.resultsActions}>
              <div className={styles.tabs} role="tablist" aria-label="Filter rows">
                {(
                  [
                    ["all", "All", summary.totalRows],
                    ["error", "Errors", summary.errorRows],
                    ["warning", "Warnings", summary.warningRows],
                    ["valid", "Valid", summary.validRows],
                  ] as const
                ).map(([value, label, count]) => (
                  <button key={value} type="button" role="tab" aria-selected={filter === value} className={cx(styles.tab, filter === value && styles.tabActive)} onClick={() => setFilter(value)}>
                    {label}
                    <span className={styles.tabCount} data-tone={value} data-empty={count === 0}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className={`${styles.secondaryButton} ${styles.exportButton}`} disabled={busy} onClick={exportRows}>
                <FileDown width={16} height={16} aria-hidden="true" />
                Export
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Status</th>
                  {PREVIEW_COLUMNS.map((key) => (
                    <th key={key} scope="col">
                      {key}
                    </th>
                  ))}
                  <th scope="col">Issues</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={PREVIEW_COLUMNS.length + 3} className={styles.emptyCell}>
                      No rows in this filter
                    </td>
                  </tr>
                )}
                {visibleRows.map((row) => (
                  <tr key={row.row}>
                    <td className={styles.num}>{row.row}</td>
                    <td>
                      <span className={cx(styles.status, styles[`status_${row.status}`])}>{row.status}</span>
                    </td>
                    {PREVIEW_COLUMNS.map((key) => (
                      <td key={key} className={styles.cell}>
                        {row.values[key] || "—"}
                      </td>
                    ))}
                    <td>
                      {row.issues.length === 0 ? (
                        <span className={styles.muted}>—</span>
                      ) : (
                        <ul className={styles.issueList}>
                          {row.issues.map((issue, index) => (
                            <li key={index} className={issue.level === "error" ? styles.issueError : styles.issueWarning}>
                              <strong>{issue.column}</strong>: {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
