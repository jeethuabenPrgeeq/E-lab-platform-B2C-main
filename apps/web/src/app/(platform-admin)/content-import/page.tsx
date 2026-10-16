"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CircleCheck, LoaderCircle, Plus, RotateCcw } from "lucide-react";
import { HIDDEN_TEST_SLOTS, PRACTICE_COLUMNS, STORAGE_KEYS } from "@/features/admin/practice-upload/schema";
import { TechnologyPicker, technologyFromUrl } from "@/features/admin/practice-upload/TechnologyPicker";
import { UploadModeSwitch } from "@/features/admin/practice-upload/UploadModeSwitch";
import { validateRows } from "@/features/admin/practice-upload/validate";
import { useUploadScope } from "@/features/admin/practice-upload/scope";
import styles from "./page.module.css";

type Values = Record<string, string>;
type Errors = Record<string, string>;
type Phase = "editing" | "saving" | "saved";

const LABELS: Record<string, string> = {
  problem_id: "Problem ID",
  title: "Title",
  short_name: "Short name",
  difficulty: "Difficulty",
  topic: "Topic",
  description: "Description",
  logic_constraints: "Logic constraints",
  input_format: "Input format",
  output_format: "Output format",
  example_input: "Example input",
  expected_output: "Expected output",
  maximum_test_cases: "Maximum test cases",
  edge_cases: "Edge cases",
  skills_covered: "Skills covered",
  expected_complexity: "Expected complexity",
  tags: "Tags",
};

const HINTS: Record<string, string> = {
  short_name: "Generated from the title until you edit it",
  example_input: "Leave empty if the program takes no input",
  skills_covered: "Separate with semicolons",
  tags: "Separate with semicolons",
};

const MULTILINE = new Set(["description", "logic_constraints", "input_format", "output_format", "example_input", "expected_output", "edge_cases"]);

const SECTIONS: { title: string; fields: string[] }[] = [
  { title: "Basics", fields: ["problem_id", "title", "short_name", "difficulty", "topic"] },
  { title: "Problem statement", fields: ["description", "logic_constraints", "input_format", "output_format"] },
  { title: "Example", fields: ["example_input", "expected_output"] },
  {
    title: "Details",
    fields: ["maximum_test_cases", "expected_complexity", "skills_covered", "tags", "edge_cases"],
  },
];

const COLUMN_BY_KEY = new Map(PRACTICE_COLUMNS.map((column) => [column.key, column]));
const SLOTS = Array.from({ length: HIDDEN_TEST_SLOTS }, (_, index) => index + 1);

function emptyValues(): Values {
  return Object.fromEntries(PRACTICE_COLUMNS.map((column) => [column.key, ""]));
}

function toShortName(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function filledHiddenCount(values: Values) {
  return SLOTS.filter((slot) => values[`hidden_test_case_${slot}`].trim() && values[`hidden_expected_output_${slot}`].trim()).length;
}

function readTechnology(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.selectedTechnology);
    return raw ? (JSON.parse(raw) as string) : null;
  } catch {
    return null;
  }
}

function writeTechnology(value: string) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.selectedTechnology, JSON.stringify(value));
  } catch {}
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ManualEntryPage() {
  const scope = useUploadScope();
  const formRef = useRef<HTMLFormElement>(null);
  const [technology, setTechnology] = useState("");
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [warnings, setWarnings] = useState<Errors>({});
  const [shortNameTouched, setShortNameTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>("editing");
  const [savedTitle, setSavedTitle] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const saved = technologyFromUrl() ?? readTechnology();
    if (saved) {
      setTechnology(saved);
      writeTechnology(saved);
    }
  }, []);

  const hiddenCount = useMemo(() => filledHiddenCount(values), [values]);
  const dirty = useMemo(() => Object.values(values).some((value) => value.trim() !== ""), [values]);

  const setField = (key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !shortNameTouched) next.short_name = toShortName(value);
      return next;
    });
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const changeTechnology = (value: string) => {
    setTechnology(value);
    writeTechnology(value);
  };

  const reset = () => {
    setValues(emptyValues());
    setErrors({});
    setWarnings({});
    setShortNameTouched(false);
    setPhase("editing");
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const row: Values = { ...values, hidden_test_case_count: String(hiddenCount) };
    const header = PRACTICE_COLUMNS.map((column) => column.key);
    const result = validateRows([header, header.map((key) => row[key] ?? "")], "manual-entry", technology);
    const issues = result.rows[0]?.issues ?? [];

    const nextErrors: Errors = {};
    const nextWarnings: Errors = {};
    for (const issue of issues) {
      const key = issue.column === "hidden_test_case_count" ? "hidden_test_case_1" : issue.column;
      const message = issue.column === "hidden_test_case_count" ? "Add at least one hidden test with its expected output" : issue.message;
      const target = issue.level === "error" ? nextErrors : nextWarnings;
      if (!target[key]) target[key] = message;
    }
    setErrors(nextErrors);
    setWarnings(nextWarnings);

    if (Object.keys(nextErrors).length > 0) {
      const firstKey = PRACTICE_COLUMNS.map((column) => column.key).find((key) => nextErrors[key]);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }

    setSaveError("");
    setPhase("saving");
    try {
      await scope.save({ technology, method: "manual", source: "Manual entry", rows: [row] });
      setSavedTitle(row.title);
      setPhase("saved");
    } catch (cause) {
      setPhase("editing");
      setSaveError(cause instanceof Error ? cause.message : "Could not save. Try again.");
    }
  };

  const renderField = (key: string) => {
    const column = COLUMN_BY_KEY.get(key);
    if (!column) return null;
    const id = `field-${key}`;
    const error = errors[key];
    const hint = HINTS[key];
    const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
    const common = {
      id,
      name: key,
      value: values[key],
      disabled: phase === "saving",
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
      className: cx(styles.input, error && styles.inputError),
    };

    return (
      <div key={key} className={cx(styles.field, MULTILINE.has(key) && styles.fieldWide)}>
        <label htmlFor={id} className={styles.label}>
          {LABELS[key] ?? key}
          {column.required && (
            <span className={styles.required} aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        {column.kind === "enum" ? (
          <select {...common} onChange={(event) => setField(key, event.target.value)}>
            <option value="">Select</option>
            {column.options?.map((option) => (
              <option key={option} value={option[0].toUpperCase() + option.slice(1)}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        ) : MULTILINE.has(key) ? (
          <textarea {...common} rows={key === "description" ? 4 : 3} onChange={(event) => setField(key, event.target.value)} />
        ) : (
          <input
            {...common}
            type="text"
            inputMode={column.kind === "integer" ? "numeric" : undefined}
            onChange={(event) => {
              if (key === "short_name") setShortNameTouched(true);
              setField(key, event.target.value);
            }}
          />
        )}
        {hint && !error && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className={styles.error}>
            {error}
          </p>
        )}
      </div>
    );
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{scope.title}</h1>
          <div className={styles.meta}>
            <span className={styles.pill}>Manual entry</span>
            <span>One problem at a time</span>
          </div>
        </div>
        <TechnologyPicker value={technology} onChange={changeTechnology} disabled={phase === "saving"} wrapClassName={styles.selectWrap} labelClassName={styles.selectLabel} selectClassName={styles.select} />
      </header>

      <UploadModeSwitch active="manual" />

      {phase === "saved" ? (
        <section className={cx(styles.card, styles.success)} aria-live="polite">
          <CircleCheck width={40} height={40} aria-hidden="true" />
          <h2 className={styles.successTitle}>Saved as Draft</h2>
          <p className={styles.successText}>
            {scope.savedOne(savedTitle, technology)}
          </p>
          <button type="button" className={styles.primaryButton} onClick={reset}>
            <Plus width={16} height={16} aria-hidden="true" />
            Add another problem
          </button>
        </section>
      ) : (
        <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
          {SECTIONS.map((section) => (
            <section key={section.title} className={styles.card} aria-labelledby={`section-${section.title}`}>
              <h2 id={`section-${section.title}`} className={styles.cardTitle}>
                {section.title}
              </h2>
              <div className={styles.grid}>{section.fields.map(renderField)}</div>
            </section>
          ))}

          <section className={styles.card} aria-labelledby="section-hidden">
            <div className={styles.cardHeader}>
              <h2 id="section-hidden" className={styles.cardTitle}>
                Hidden tests
              </h2>
              <span className={styles.counter}>
                {hiddenCount} of {HIDDEN_TEST_SLOTS} filled
              </span>
            </div>
            <p className={styles.hint}>Test 1 is required. Every input needs its expected output.</p>
            <div className={styles.tests}>
              {SLOTS.map((slot) => {
                const inputKey = `hidden_test_case_${slot}`;
                const outputKey = `hidden_expected_output_${slot}`;
                return (
                  <fieldset key={slot} className={styles.testCard}>
                    <legend className={styles.testLegend}>
                      Test {slot}
                      {slot === 1 && (
                        <span className={styles.required} aria-hidden="true">
                          {" "}
                          *
                        </span>
                      )}
                    </legend>
                    {[
                      { key: inputKey, label: "Input" },
                      { key: outputKey, label: "Expected output" },
                    ].map(({ key, label }) => {
                      const id = `field-${key}`;
                      const error = errors[key];
                      return (
                        <div key={key} className={styles.field}>
                          <label htmlFor={id} className={styles.label}>
                            {label}
                          </label>
                          <textarea id={id} name={key} rows={3} value={values[key]} disabled={phase === "saving"} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={cx(styles.input, styles.mono, error && styles.inputError)} onChange={(event) => setField(key, event.target.value)} />
                          {error && (
                            <p id={`${id}-error`} className={styles.error}>
                              {error}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </fieldset>
                );
              })}
            </div>
          </section>

          <div className={styles.footer}>
            <p className={cx(styles.footerStatus, (errorCount > 0 || saveError) && styles.footerError)} aria-live="polite">
              {saveError ? saveError : errorCount > 0 ? `Fix ${errorCount} field${errorCount === 1 ? "" : "s"} to save` : Object.keys(warnings).length > 0 ? Object.values(warnings)[0] : scope.saveHint}
            </p>
            <div className={styles.footerActions}>
              <button type="button" className={styles.secondaryButton} disabled={!dirty || phase === "saving"} onClick={reset}>
                <RotateCcw width={16} height={16} aria-hidden="true" />
                Clear
              </button>
              <button type="submit" className={styles.primaryButton} disabled={phase === "saving"}>
                {phase === "saving" && <LoaderCircle className={styles.spin} width={16} height={16} aria-hidden="true" />}
                {phase === "saving" ? "Saving…" : "Save as Draft"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
