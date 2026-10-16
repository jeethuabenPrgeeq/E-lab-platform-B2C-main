"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Plus, Save, Search, Send, TriangleAlert, Undo2, X } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/widgets/AdminWidgets";
import { STATUS_LABEL, capitalize, formatDate } from "@/features/admin/problems/lib/shared";
import { useLibrary, type LibraryFilters, type LibraryItem } from "../lib/api";
import { useInstitutionLabel } from "../lib/useInstitutionLabel";
import styles from "../ui/institute.module.css";
import { BATCH_ROUTE, BATCH_TYPES, batchApi, type BatchDetail, type BatchProblem, type BatchType, type Difficulty } from "./api";

const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

const fromLibrary = (item: LibraryItem): BatchProblem => ({
  id: item.id,
  slug: item.slug,
  title: item.title,
  difficulty: item.difficulty as Difficulty,
  status: item.status,
  technology: item.technology.name,
  sampleTests: item.sampleTests,
  hiddenTests: item.hiddenTests,
});

export default function BatchEditor({ batchId }: { batchId?: string }) {
  const router = useRouter();
  const institution = useInstitutionLabel();
  const [loaded, setLoaded] = useState(!batchId);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<BatchType>("regular_practice");
  const [focus, setFocus] = useState("");
  const [targets, setTargets] = useState<Record<Difficulty, number>>({ easy: 0, medium: 0, hard: 0 });
  const [selected, setSelected] = useState<BatchProblem[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [assignment, setAssignment] = useState<Pick<BatchDetail, "assignedAt" | "assignedByName" | "assignedGroup" | "progress"> | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [targetGroup, setTargetGroup] = useState('');
  const [scoped, setScoped] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const filters = useMemo<LibraryFilters>(() => ({ scope: "all", status: "", difficulty: "", technologyId: "", q: query.trim() }), [query]);
  const library = useLibrary(filters);
  const candidates = (library.data?.items ?? []).filter((item) => item.status !== "deprecated" && !selected.some((chosen) => chosen.id === item.id));

  useEffect(() => {
    if (!batchId) return;
    let alive = true;
    void batchApi.groups().then((result) => {
           if (!alive || !result.ok) return;
      setGroups(result.data.items);
      setScoped(result.data.scoped);
      if (result.data.scoped && result.data.items[0]) setTargetGroup(result.data.items[0].id);
    });
    void batchApi.get(batchId).then((result) => {
      if (!alive) return;
      if (result.ok) apply(result.data);
      else setLoadError(result.error);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [batchId]);

  function apply(batch: BatchDetail) {
    setName(batch.name);
    setDescription(batch.description);
    setType(batch.type);
    setFocus(batch.focus);
    setTargets(batch.targets);
    setSelected(batch.items);
    setSavedIds(batch.items.map((item) => item.id));
    setAssignment({ assignedAt: batch.assignedAt, assignedByName: batch.assignedByName, assignedGroup: batch.assignedGroup, progress: batch.progress });
  }

  const toggleAssignment = async () => {
    if (!batchId || !assignment) return;
    setSaving(true);
    setNotice(null);
    const result = assignment.assignedAt ? await batchApi.unassign(batchId) : await batchApi.assign(batchId, targetGroup || null);
    setSaving(false);
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error });
      return;
    }
    apply(result.data);
    setNotice({ tone: "ok", text: result.data.assignedAt ? `Batch assigned to ${result.data.assignedGroup ? result.data.assignedGroup.name : "all learners"}.` : "Batch withdrawn from learners." });
  };

  const unsaved = JSON.stringify(savedIds) !== JSON.stringify(selected.map((item) => item.id));

  const counts = Object.fromEntries(LEVELS.map((level) => [level, selected.filter((problem) => problem.difficulty === level).length])) as Record<Difficulty, number>;
  const planned = targets.easy + targets.medium + targets.hard;
  const withoutTests = selected.filter((problem) => problem.sampleTests === 0 || problem.hiddenTests === 0).length;
  const unpublished = selected.filter((problem) => problem.status !== "published").length;
  const checks = [
    { ok: name.trim().length > 0, text: "The batch has a name" },
    { ok: selected.length > 0, text: "At least one problem is selected" },
    { ok: planned === selected.length, text: `Targets add up to the selection (${planned} planned, ${selected.length} selected)` },
    { ok: LEVELS.every((level) => counts[level] === targets[level]), text: "Each difficulty matches its target" },
    { ok: withoutTests === 0, text: withoutTests ? `${withoutTests} problem${withoutTests === 1 ? " is" : "s are"} missing sample or hidden tests` : "Every problem has sample and hidden tests" },
    { ok: unpublished === 0, text: unpublished ? `${unpublished} problem${unpublished === 1 ? " is" : "s are"} not published yet` : "Every problem is published" },
  ];

  const move = (index: number, delta: number) =>
    setSelected((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  const save = async () => {
    if (!name.trim()) {
      setNotice({ tone: "error", text: "Give the batch a name before saving." });
      return;
    }
    setSaving(true);
    setNotice(null);
    const input = { name: name.trim(), description, type, focus, easyTarget: targets.easy, mediumTarget: targets.medium, hardTarget: targets.hard, problemIds: selected.map((problem) => problem.id) };
    const result = batchId ? await batchApi.update(batchId, input) : await batchApi.create(input);
    setSaving(false);
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error });
      return;
    }
    if (!batchId) {
      router.replace(`${BATCH_ROUTE}/${result.data.id}`);
      return;
    }
    apply(result.data);
    setNotice({ tone: "ok", text: "Batch saved." });
  };

  if (!loaded) return <p className={styles.empty}>Loading batch…</p>;
  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <strong>{loadError}</strong>
          <Link href={BATCH_ROUTE} className={styles.textLink}>
            Back to batches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={BATCH_ROUTE} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to batches
      </Link>
      <PageHeader
        title={batchId ? name || "Edit batch" : "New batch"}
        pill={institution}
        meta="Pick institution problems, set difficulty targets and keep them in order"
        actions={
          <button className={styles.primaryButton} type="button" disabled={saving} onClick={() => void save()}>
            <Save size={16} aria-hidden="true" />
            {saving ? "Saving…" : batchId ? "Save changes" : "Create batch"}
          </button>
        }
      />

      {notice && (
        <p className={notice.tone === "error" ? styles.error : styles.success} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      )}

      <Panel title="Details">
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input id="batch-name" className={styles.input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Python fundamentals, week 1" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Type</span>
            <select id="batch-type" className={styles.select} value={type} onChange={(e) => setType(e.target.value as BatchType)}>
              {BATCH_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Focus</span>
            <input className={styles.input} value={focus} maxLength={120} onChange={(e) => setFocus(e.target.value)} placeholder="Optional, e.g. Strings and arrays" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Description</span>
            <textarea className={styles.textarea} rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      </Panel>

      <Panel title="Difficulty targets" subtitle="How many problems of each difficulty this batch should contain">
        <div className={styles.formGrid}>
          {LEVELS.map((level) => (
            <label key={level} className={styles.field}>
              <span className={styles.label}>{`${capitalize(level)} (${counts[level]} selected)`}</span>
              <input id={`batch-target-${level}`} type="number" min={0} max={500} className={styles.input} value={targets[level]} onChange={(e) => setTargets((current) => ({ ...current, [level]: Math.max(0, Math.min(500, Math.floor(Number(e.target.value) || 0))) }))} />
            </label>
          ))}
        </div>
      </Panel>

      <div className={styles.splitGrid}>
        <Panel title="Add problems" subtitle="From your institution’s Content Library">
          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={16} aria-hidden="true" />
            <input className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or slug" aria-label="Search problems to add" />
          </label>
          {library.error && <p className={styles.error}>{library.error}</p>}
          {!library.loaded ? (
            <p className={styles.empty}>Loading problems…</p>
          ) : candidates.length === 0 ? (
            <p className={styles.empty}>{query ? "No matching problems." : "Every available problem is already in this batch."}</p>
          ) : (
            <ul className={styles.pickList}>
              {candidates.map((item) => (
                <li key={item.id} className={styles.pickRow}>
                  <span className={styles.pickText}>
                    <strong>{item.title}</strong>
                    <span className={styles.rowMeta}>{`${item.technology.name} · ${capitalize(item.difficulty)} · ${STATUS_LABEL[item.status]}`}</span>
                  </span>
                  <button type="button" className={styles.iconButton} aria-label={`Add ${item.title}`} title="Add to batch" onClick={() => setSelected((current) => [...current, fromLibrary(item)])}>
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(library.data?.total ?? 0) > (library.data?.items.length ?? 0) && <p className={styles.note}>Showing the first 100 matches. Search to narrow them down.</p>}
        </Panel>

        <Panel title={`In this batch (${selected.length})`} subtitle="Learners will see them in this order">
          {selected.length === 0 ? (
            <p className={styles.empty}>No problems yet. Add them from the list.</p>
          ) : (
            <ol className={styles.pickList}>
              {selected.map((problem, index) => (
                <li key={problem.id} className={styles.pickRow}>
                  <span className={styles.position}>{index + 1}</span>
                  <span className={styles.pickText}>
                    <strong>{problem.title}</strong>
                    <span className={styles.rowMeta}>{`${capitalize(problem.difficulty)} · ${STATUS_LABEL[problem.status]} · ${problem.sampleTests} sample · ${problem.hiddenTests} hidden`}</span>
                  </span>
                  <span className={styles.rowActions}>
                    <button type="button" className={styles.iconButton} aria-label={`Move ${problem.title} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconButton} aria-label={`Move ${problem.title} down`} disabled={index === selected.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconButton} aria-label={`Remove ${problem.title}`} onClick={() => setSelected((current) => current.filter((item) => item.id !== problem.id))}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {batchId && assignment && (
        <Panel
          title="Assignment"
          subtitle={assignment.assignedAt ? `Assigned to ${assignment.assignedGroup ? assignment.assignedGroup.name : "all learners"} on ${formatDate(assignment.assignedAt)}${assignment.assignedByName ? ` by ${assignment.assignedByName}` : ""}` : "Not assigned. Learners can’t see this batch yet."}
          action={
            <span className={styles.rowActions}>
              {!assignment.assignedAt && (
                <select className={styles.select} value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} aria-label="Assign to">
                                  {!scoped && <option value="">All learners</option>}
                {scoped && groups.length === 0 && <option value="">No groups assigned to you</option>}
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className={assignment.assignedAt ? styles.ghostButton : styles.primaryButton}               disabled={saving || (!assignment.assignedAt && (unsaved || selected.length === 0 || (scoped && !targetGroup)))} title={!assignment.assignedAt && unsaved ? "Save your changes before assigning" : undefined} onClick={() => void toggleAssignment()}>
                {assignment.assignedAt ? <Undo2 size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                {assignment.assignedAt ? "Withdraw" : targetGroup ? "Assign to group" : "Assign to all learners"}
              </button>
            </span>
          }>
          <div className={styles.statGrid}>
            <p className={styles.metric}>
              <strong>{assignment.progress.learners}</strong>
              <span>Active learners</span>
            </p>
            <p className={styles.metric}>
              <strong>{assignment.progress.started}</strong>
              <span>Solved at least one</span>
            </p>
            <p className={styles.metric}>
              <strong>{assignment.progress.completed}</strong>
              <span>Completed the batch</span>
            </p>
          </div>
        </Panel>
      )}

      <Panel title="Checks" subtitle="Advisory: you can save a batch that doesn’t pass every check yet">
        <ul className={styles.checkList}>
          {checks.map((check) => (
            <li key={check.text} className={check.ok ? styles.checkOk : styles.checkWarn}>
              {check.ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
              <span>{check.text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
