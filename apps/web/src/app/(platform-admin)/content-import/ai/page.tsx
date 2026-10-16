"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleCheck, FileDown, Info, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { generateDrafts, regenerateDraft, type AiRequest, type Level } from "@/features/admin/practice-upload/ai-generate";
import { MIN_TEXT_CHARS, SOURCE_META, checkFile, checkUrl, extractContent, isFileSource, joinSections, type FileMeta, type SourceType } from "@/features/admin/practice-upload/ai-source";
import { ConfigureStep, DEFAULT_MIX, configCountError, configTotal, type GenerationConfig } from "@/features/admin/practice-upload/ai/ConfigureStep";
import { DraftEditor } from "@/features/admin/practice-upload/ai/DraftEditor";
import { DraftTable, type DraftFilter, type DraftView } from "@/features/admin/practice-upload/ai/DraftTable";
import { buildTemplateRowsCsv, csvFileName, downloadCsv } from "@/features/admin/practice-upload/ai/export";
import { useUploadScope } from "@/features/admin/practice-upload/scope";
import { SourceStep } from "@/features/admin/practice-upload/ai/SourceStep";
import { cx, plural, readJson, removeKey, writeJson } from "@/features/admin/practice-upload/ai/helpers";
import styles from "@/features/admin/practice-upload/ai/ai.module.css";
import { PRACTICE_COLUMNS, STORAGE_KEYS } from "@/features/admin/practice-upload/schema";
import { TechnologyPicker, technologyFromUrl } from "@/features/admin/practice-upload/TechnologyPicker";
import { UploadModeSwitch } from "@/features/admin/practice-upload/UploadModeSwitch";
import { validateRows } from "@/features/admin/practice-upload/validate";

type Step = 1 | 2;
type Busy = "extracting" | "generating" | "saving" | null;

interface Draft {
  uid: string;
  slug: string;
  level: Level;
  values: Record<string, string>;
  selected: boolean;
}

interface WizardState {
  step: Step;
  source: SourceType | null;
  fileMeta: FileMeta | null;
  url: string;
  text: string;
  config: GenerationConfig;
  request: AiRequest | null;
  simulated: boolean;
  drafts: Draft[];
}

const STATE_KEY = "elab_ai_wizard_v4";
const HEADER = PRACTICE_COLUMNS.map((column) => column.key);

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "Source" },
  { step: 2, label: "Preview" },
];

const EMPTY_CONFIG: GenerationConfig = {
  topic: "",
  difficulty: "mixed",
  count: 5,
  mix: DEFAULT_MIX,
  questionType: "coding",
  instructions: "",
};

const EMPTY_STATE: WizardState = {
  step: 1,
  source: null,
  fileMeta: null,
  url: "",
  text: "",
  config: EMPTY_CONFIG,
  request: null,
  simulated: false,
  drafts: [],
};

let uidCounter = 0;
const nextUid = () => `d${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

function sourceLabelOf(state: WizardState) {
  if (!state.source) return "";
  if (isFileSource(state.source)) return state.fileMeta?.name ?? SOURCE_META[state.source].label;
  if (state.source === "url") {
    try {
      const url = new URL(state.url);
      return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
    } catch {
      return state.url;
    }
  }
  return state.source === "text" ? "Pasted text" : "Prompt only";
}

export default function AiGeneratePage() {
  const scope = useUploadScope();
  const [technology, setTechnology] = useState("");
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [topicError, setTopicError] = useState("");
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [regeneratingUid, setRegeneratingUid] = useState<string | null>(null);
  const [savedRows, setSavedRows] = useState<Record<string, string>[] | null>(null);
  const [savedBatchId, setSavedBatchId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState<DraftFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTech = technologyFromUrl() ?? readJson<string>(STORAGE_KEYS.selectedTechnology);
    if (savedTech) {
      setTechnology(savedTech);
      writeJson(STORAGE_KEYS.selectedTechnology, savedTech);
    }
    const saved = readJson<WizardState>(STATE_KEY);
    if (saved?.source) setState({ ...EMPTY_STATE, ...saved, step: 1, config: { ...EMPTY_CONFIG, ...saved.config } });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (state.source) writeJson(STATE_KEY, state);
    else removeKey(STATE_KEY);
  }, [state, hydrated]);

  const patch = (next: Partial<WizardState>) => setState((prev) => ({ ...prev, ...next }));
  const sourceLabel = sourceLabelOf(state);
  const locked = busy !== null || regeneratingUid !== null;

  const views: DraftView[] = useMemo(() => {
    if (state.drafts.length === 0) return [];
    const table = [HEADER, ...state.drafts.map((draft) => HEADER.map((key) => draft.values[key] ?? ""))];
    const rows = validateRows(table, "ai-generate", state.request?.technology ?? technology).rows;
    return state.drafts.map((draft, index) => {
      const status = rows[index]?.status ?? "error";
      return {
        uid: draft.uid,
        row: index + 1,
        values: draft.values,
        selected: draft.selected && status !== "error",
        status,
        issues: rows[index]?.issues ?? [],
      };
    });
  }, [state.drafts, state.request, technology]);

  const selectedViews = views.filter((view) => view.selected);
  const selectable = views.filter((view) => view.status !== "error");
  const allSelected = selectable.length > 0 && selectedViews.length === selectable.length;
  const counts = {
    all: views.length,
    error: views.filter((view) => view.status === "error").length,
    warning: views.filter((view) => view.status === "warning").length,
    valid: views.filter((view) => view.status === "valid").length,
  };
  const editingView = views.find((view) => view.uid === editingUid) ?? null;

  const exportRows = (rows: Record<string, string>[]) => {
    if (rows.length === 0) return;
    downloadCsv(csvFileName(state.request?.technology ?? technology, state.request?.topic ?? "problems"), buildTemplateRowsCsv(rows));
  };

  const changeTechnology = (value: string) => {
    setTechnology(value);
    writeJson(STORAGE_KEYS.selectedTechnology, value);
  };

  const chooseSource = (source: SourceType) => {
    if (source === state.source) return;
    setFile(null);
    setError("");
    patch({ source, fileMeta: null });
  };

  const chooseFile = (picked: File) => {
    if (!state.source) return;
    const problem = checkFile(state.source, picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setFile(picked);
    patch({ fileMeta: { name: picked.name, size: picked.size } });
  };

  const runGeneration = async (request: AiRequest) => {
    setBusy("generating");
    setEditingUid(null);
    try {
      const generated = await generateDrafts(request);
      patch({
        request,
        step: 2,
        drafts: generated.map((item) => ({ ...item, uid: nextUid(), selected: true })),
      });
      setFilter("all");
    } finally {
      setBusy(null);
    }
  };

  const extractAndGenerate = async () => {
    const { source, config } = state;
    if (!source) {
      setError("Choose where the content comes from");
      return;
    }
    if (isFileSource(source) && !file) {
      setError(`Choose a ${SOURCE_META[source].label} file`);
      return;
    }
    if (source === "url") {
      const problem = checkUrl(state.url);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (source === "text" && state.text.trim().length < MIN_TEXT_CHARS) {
      setError(`Paste at least ${MIN_TEXT_CHARS} characters`);
      return;
    }
    if (source === "prompt" && config.topic.trim().length < 2) {
      setTopicError("Enter a topic, for example Arrays or Strings");
      return;
    }
    if (configCountError(config)) return;
    setError("");
    setTopicError("");

    let content = "";
    let focus: string[] = [];
    let simulated = false;
    let topic = source === "prompt" ? config.topic.trim() : "";

    if (source !== "prompt") {
      setBusy("extracting");
      try {
        const extracted = await extractContent(source, { file, url: state.url, text: state.text });
        if (extracted.sections.length === 0) {
          setError("No readable text was found in this source");
          setBusy(null);
          return;
        }
        content = joinSections(extracted.sections);
        focus = extracted.sections.map((section) => section.title);
        simulated = extracted.simulated;
        topic = extracted.sections[0]?.title || "General";
      } catch (cause) {
        setError(cause instanceof Error && cause.message ? cause.message : "Could not read this source. Try another file or paste the text instead.");
        setBusy(null);
        return;
      }
    }

    patch({ simulated });
    await runGeneration({
      technology,
      sourceType: source,
      sourceLabel,
      content,
      focus,
      topic,
      difficulty: config.difficulty,
      count: configTotal(config),
      mix: config.mix,
      questionType: config.questionType,
      instructions: config.instructions.trim(),
    });
  };

  const updateDraft = (uid: string, change: Partial<Draft>) => {
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.map((draft) => (draft.uid === uid ? { ...draft, ...change } : draft)),
    }));
  };

  const toggleAll = () => {
    const errorUids = new Set(views.filter((view) => view.status === "error").map((view) => view.uid));
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.map((draft) => (errorUids.has(draft.uid) ? draft : { ...draft, selected: !allSelected })),
    }));
  };

  const removeDraft = (uid: string) => {
    setState((prev) => {
      const drafts = prev.drafts.filter((draft) => draft.uid !== uid);
      return { ...prev, drafts, step: drafts.length === 0 ? 1 : prev.step };
    });
  };

  const regenerateOne = async (uid: string) => {
    const target = state.drafts.find((draft) => draft.uid === uid);
    if (!target || !state.request) return;
    setRegeneratingUid(uid);
    try {
      const others = state.drafts.filter((draft) => draft.uid !== uid).map((draft) => draft.slug);
      const fresh = await regenerateDraft(state.request, target.level, [...others, target.slug]);
      updateDraft(uid, { slug: fresh.slug, values: fresh.values, selected: true });
    } finally {
      setRegeneratingUid(null);
    }
  };

  const saveSelected = async () => {
    if (!state.request || selectedViews.length === 0) return;
    setBusy("saving");
    setSaveError("");
    try {
      const rows = selectedViews.map((view) => view.values);
      const result = await scope.save({
        technology: state.request.technology,
        method: "ai",
        source: state.request.sourceLabel,
        rows,
      });
      setSavedBatchId(result.batchId);
      setSavedRows(rows);
      removeKey(STATE_KEY);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const startOver = () => {
    setFile(null);
    setError("");
    setTopicError("");
    setEditingUid(null);
    setSavedRows(null);
    setSavedBatchId("");
    setSaveError("");
    setFilter("all");
    setState(EMPTY_STATE);
    removeKey(STATE_KEY);
  };

  const backToSource = () => {
    if (locked) return;
    setEditingUid(null);
    patch({ step: 1 });
  };

  if (savedRows !== null) {
    return (
      <div className={styles.page}>
        <PageHeader technology={technology} disabled onTechnology={changeTechnology} />
        <UploadModeSwitch active="ai" />
        <section className={cx(styles.card, styles.success)} aria-live="polite">
          <CircleCheck width={40} height={40} aria-hidden="true" />
          <h2 className={styles.successTitle}>{`Saved ${plural(savedRows.length, "problem")} as Draft`}</h2>
          <p className={styles.successText}>{`${scope.savedMany(state.request?.technology ?? technology)}${savedBatchId ? ` Batch ${savedBatchId}.` : ""}`}</p>
          <div className={styles.successActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => exportRows(savedRows)}>
              <FileDown width={16} height={16} aria-hidden="true" />
              Download CSV
            </button>
            <button type="button" className={styles.primaryButton} onClick={startOver}>
              <Sparkles width={16} height={16} aria-hidden="true" />
              Generate more
            </button>
          </div>
        </section>
      </div>
    );
  }

  const progress = (
    <ol className={styles.progress} aria-label="Steps">
      {STEPS.map(({ step, label }) => {
        const done = step < state.step;
        const current = step === state.step;
        const clickable = (step === 1 && state.step === 2) || (step === 2 && state.step === 1 && state.drafts.length > 0);
        return (
          <li key={step} className={cx(styles.progressItem, done && styles.progressDone, current && styles.progressCurrent)} aria-current={current ? "step" : undefined}>
            <button type="button" className={styles.progressButton} disabled={!clickable || locked} onClick={() => patch({ step })}>
              <span className={styles.progressDot}>{done ? <CircleCheck width={16} height={16} aria-hidden="true" /> : step}</span>
              <span className={styles.progressLabel}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={styles.page}>
      <PageHeader technology={technology} disabled={locked} onTechnology={changeTechnology} />
      <UploadModeSwitch active="ai" />

      {state.step === 1 && (
        <section className={styles.card} aria-labelledby="ai-step-title">
          <div className={styles.wizardTop}>{progress}</div>

          <div className={styles.stepHeader}>
            <h2 id="ai-step-title" className={styles.cardTitle}>
              Choose a content source
            </h2>
            <p className={styles.cardSubtitle}>AI reads the source and writes practice problems in the CSV template format</p>
          </div>

          <SourceStep
            source={state.source}
            fileMeta={state.fileMeta}
            hasFile={file !== null}
            url={state.url}
            text={state.text}
            error={error}
            busy={locked}
            onSource={chooseSource}
            onFile={chooseFile}
            onClearFile={() => {
              setFile(null);
              patch({ fileMeta: null });
            }}
            onUrl={(url) => {
              setError("");
              patch({ url });
            }}
            onText={(text) => {
              setError("");
              patch({ text });
            }}
          />

          {state.source && (
            <>
              <div className={styles.stepHeader}>
                <h3 className={styles.sectionHeading}>Generation settings</h3>
              </div>
              <ConfigureStep
                config={state.config}
                showTopic={state.source === "prompt"}
                topicError={topicError}
                busy={locked}
                onChange={(change) => {
                  setTopicError("");
                  setState((prev) => ({ ...prev, config: { ...prev.config, ...change } }));
                }}
              />
            </>
          )}

          <div className={styles.footer}>
            <div>
              {state.drafts.length > 0 && (
                <button type="button" className={styles.secondaryButton} disabled={locked} onClick={() => patch({ step: 2 })}>
                  {`Back to ${plural(state.drafts.length, "problem")}`}
                </button>
              )}
            </div>
            <div className={styles.footerActions}>
              <button type="button" className={styles.primaryButton} disabled={locked || !state.source || Boolean(configCountError(state.config))} onClick={extractAndGenerate}>
                {busy ? <LoaderCircle className={styles.spin} width={16} height={16} aria-hidden="true" /> : <Sparkles width={16} height={16} aria-hidden="true" />}
                {busy === "extracting" ? "Extracting content…" : busy === "generating" ? "Generating problems…" : !state.source ? "Choose a source" : state.source === "prompt" ? `Generate ${plural(configTotal(state.config), "problem")}` : state.drafts.length > 0 ? `Extract & replace with ${plural(configTotal(state.config), "problem")}` : `Extract & generate ${plural(configTotal(state.config), "problem")}`}
              </button>
            </div>
          </div>
        </section>
      )}

      {state.step === 2 && (
        <section className={styles.card} aria-labelledby="ai-preview-title">
          <div className={styles.wizardTop}>{progress}</div>

          <div className={styles.previewHeader}>
            <div className={styles.stepHeader}>
              <h2 id="ai-preview-title" className={styles.cardTitle}>
                Preview
              </h2>
              {state.request && <p className={styles.cardSubtitle}>{`${state.request.technology} · ${state.request.topic} · from ${state.request.sourceLabel}`}</p>}
            </div>
            <div className={styles.reviewActions}>
              <div className={styles.tabs} role="tablist" aria-label="Filter rows">
                {(
                  [
                    ["all", "All"],
                    ["error", "Errors"],
                    ["warning", "Warnings"],
                    ["valid", "Valid"],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} type="button" role="tab" aria-selected={filter === value} className={cx(styles.tab, filter === value && styles.tabActive)} onClick={() => setFilter(value)}>
                    {label}
                    <span className={styles.tabCount} data-tone={value} data-empty={counts[value] === 0}>
                      {counts[value]}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className={styles.secondaryButton} disabled={locked || selectedViews.length === 0} onClick={() => exportRows(selectedViews.map((view) => view.values))}>
                <FileDown width={16} height={16} aria-hidden="true" />
                Export
              </button>
            </div>
          </div>

          {state.simulated && (
            <div className={styles.notice} role="note">
              <Info width={16} height={16} aria-hidden="true" />
              <span>Generated from a sample extract. Reading PDF, Word and URL content happens on the server, which is not connected yet.</span>
            </div>
          )}

          <label className={styles.selectAll}>
            <input type="checkbox" checked={allSelected} disabled={locked || selectable.length === 0} onChange={toggleAll} />
            {`${selectedViews.length} of ${views.length} selected`}
          </label>

          <DraftTable
            views={views}
            filter={filter}
            editingUid={editingUid}
            regeneratingUid={regeneratingUid}
            busy={busy !== null}
            onToggle={(uid) => {
              const view = views.find((item) => item.uid === uid);
              if (view) updateDraft(uid, { selected: !view.selected });
            }}
            onEdit={setEditingUid}
            onRegenerate={(uid) => void regenerateOne(uid)}
            onRemove={removeDraft}
          />

          {editingView && (
            <DraftEditor
              key={editingView.uid}
              rowNumber={editingView.row}
              values={editingView.values}
              onCancel={() => setEditingUid(null)}
              onSave={(values) => {
                updateDraft(editingView.uid, { values });
                setEditingUid(null);
              }}
            />
          )}

          <p className={styles.hint}>Scroll sideways to see every column. Export saves the selected rows in the CSV upload template format.</p>

          {saveError && (
            <p className={styles.error} role="alert">
              {saveError}
            </p>
          )}

          <div className={styles.footer}>
            <div>
              <button type="button" className={styles.secondaryButton} disabled={locked} onClick={backToSource}>
                <ArrowLeft width={16} height={16} aria-hidden="true" />
                Back
              </button>
            </div>
            <div className={styles.footerActions}>
              <button type="button" className={styles.secondaryButton} disabled={locked || !state.request} onClick={() => state.request && void runGeneration(state.request)}>
                {busy === "generating" ? <LoaderCircle className={styles.spin} width={16} height={16} aria-hidden="true" /> : <RefreshCw width={16} height={16} aria-hidden="true" />}
                Regenerate all
              </button>
              <button type="button" className={styles.primaryButton} disabled={locked || editingUid !== null || selectedViews.length === 0} onClick={saveSelected}>
                {busy === "saving" && <LoaderCircle className={styles.spin} width={16} height={16} aria-hidden="true" />}
                {busy === "saving" ? "Saving…" : `Save ${plural(selectedViews.length, "problem")} as Draft`}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PageHeader({ technology, disabled, onTechnology }: { technology: string; disabled: boolean; onTechnology: (value: string) => void }) {
  const scope = useUploadScope();
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h1 className={styles.title}>{scope.title}</h1>
        <div className={styles.meta}>
          <span className={styles.pill}>AI generate</span>
          <span>Generate problems from a PDF, Word file, web page, text or a prompt</span>
        </div>
      </div>
      <TechnologyPicker value={technology} onChange={onTechnology} disabled={disabled} wrapClassName={styles.selectWrap} labelClassName={styles.label} selectClassName={styles.select} />
    </header>
  );
}
