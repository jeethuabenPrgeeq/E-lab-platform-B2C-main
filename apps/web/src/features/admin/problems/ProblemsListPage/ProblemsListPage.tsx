"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { usePermissionGate } from "../../permissions/PermissionsProvider";
import { useTechnologies } from "../../technologies/lib/api";
import { useProblems } from "../lib/api";
import { ACTION_LABEL, DIFFICULTIES, NOTE_ACTIONS, STAGE_ACTIONS, STATUS_LABEL, capitalize, cx, formatDate } from "../lib/shared";
import type { ProblemAction, ProblemItem, ProblemStatus } from "../lib/types";
import { ProblemTabs } from "../ProblemTabs/ProblemTabs";
import styles from "./ProblemsListPage.module.css";

interface Props {
  status?: ProblemStatus;
  title: string;
  subtitle: string;
}

interface Pending {
  problem: ProblemItem;
  action: ProblemAction;
}

const BACKWARD_ACTIONS: ProblemAction[] = ["sendBack", "moveBack", "unpublish", "deprecate"];
const CONFIRM_ACTIONS: ProblemAction[] = [...NOTE_ACTIONS, "unpublish"];

export default function ProblemsListPage({ status, title, subtitle }: Props) {
  const router = useRouter();
  const upload = usePermissionGate("content.upload");
  const author = usePermissionGate("problems.manage");
  const validate = usePermissionGate("content.validate");
  const { items, loaded, loadError, transition, remove } = useProblems(status);
  const { items: technologies } = useTechnologies();
  const [query, setQuery] = useState("");
  const [technology, setTechnology] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [errors, setErrors] = useState<{ title: string; list: string[] } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (status && p.status !== status) return false;
      if (technology && p.technology.id !== technology) return false;
      if (difficulty && p.difficulty !== difficulty) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.slug.includes(q)) return false;
      return true;
    });
  }, [items, status, technology, difficulty, query]);

  async function execute(problem: ProblemItem, action: ProblemAction, withNote?: string) {
    setBusyId(problem.id);
    const result = await transition(problem.id, action, withNote);
    setBusyId(null);
    if (!result.ok) {
      setErrors({ title: `Cannot ${ACTION_LABEL[action].toLowerCase()} "${problem.title}"`, list: result.issues.length ? result.issues : [result.error] });
      return false;
    }
    setErrors(null);
    return true;
  }

  function run(problem: ProblemItem, action: ProblemAction) {
    setErrors(null);
    if (CONFIRM_ACTIONS.includes(action)) {
      setNote("");
      setPending({ problem, action });
      return;
    }
    void execute(problem, action);
  }

  async function confirmPending() {
    if (!pending) return;
    const ok = await execute(pending.problem, pending.action, NOTE_ACTIONS.includes(pending.action) ? note.trim() : undefined);
    if (ok) setPending(null);
  }

  async function deleteDraft(problem: ProblemItem) {
    setConfirmDelete(null);
    setBusyId(problem.id);
    const result = await remove(problem.id);
    setBusyId(null);
    setErrors(result.ok ? null : { title: `Cannot delete "${problem.title}"`, list: [result.error] });
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} disabled={!upload.allowed} title={upload.title} onClick={() => router.push("/content-import")}>
            Bulk upload
          </button>
          <button type="button" className={styles.primaryButton} disabled={!author.allowed} title={author.title} onClick={() => router.push("/problems/create")}>
            <Plus width={16} height={16} aria-hidden="true" />
            New problem
          </button>
        </div>
      </div>

      <ProblemTabs />

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by title or slug" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search problems" />
          </div>
          <select className={styles.select} value={technology} onChange={(e) => setTechnology(e.target.value)} aria-label="Filter by technology">
            <option value="">All technologies</option>
            {technologies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {capitalize(d)}
              </option>
            ))}
          </select>
        </div>

        {errors && (
          <div className={styles.notice} role="alert">
            <strong>{errors.title}</strong>
            <ul>
              {errors.list.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} ${rows.length === 1 ? "problem" : "problems"}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : loadError ? (
          <div className={styles.empty}>{loadError}</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{items.length === 0 ? "No problems here yet." : "No problems match the current filters."}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Technology</th>
                  <th>Difficulty</th>
                  {!status && <th>Status</th>}
                  <th className={styles.num}>Sample</th>
                  <th className={styles.num}>Hidden</th>
                  <th>Updated</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const editable = p.status !== "deprecated";
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/problems/${p.id}`} className={styles.problemTitle}>
                          {p.title}
                        </Link>
                        <span className={styles.slug}>{p.version > 1 ? `${p.slug} · v${p.version}` : p.slug}</span>
                        {p.status === "draft" && p.reviewNote && <span className={styles.reviewNote}>Sent back: {p.reviewNote}</span>}
                      </td>
                      <td>
                        <span className={styles.tech}>{p.technology.name}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[p.difficulty])}>{capitalize(p.difficulty)}</span>
                      </td>
                      {!status && (
                        <td>
                          <span className={cx(styles.badge, styles[p.status])}>{STATUS_LABEL[p.status]}</span>
                        </td>
                      )}
                      <td className={cx(styles.num, p.sampleTests === 0 && styles.missing)}>{p.sampleTests}</td>
                      <td className={cx(styles.num, p.hiddenTests === 0 && styles.missing)}>{p.hiddenTests}</td>
                      <td className={styles.date}>{formatDate(p.updatedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <Link href={`/problems/${p.id}`} className={styles.iconButton} aria-label={`${editable ? "Edit" : "View"} ${p.title}`} title={editable ? "Edit" : "View"}>
                            {editable ? <Pencil width={15} height={15} aria-hidden="true" /> : <Eye width={15} height={15} aria-hidden="true" />}
                          </Link>
                          {STAGE_ACTIONS[p.status].map((action) => (
                            <button key={action} type="button" disabled={busyId === p.id || !validate.allowed} title={validate.title} className={cx(styles.actionButton, BACKWARD_ACTIONS.includes(action) ? styles.actionBack : styles.actionForward, (action === "unpublish" || action === "deprecate") && styles.actionDanger)} onClick={() => run(p, action)}>
                              {ACTION_LABEL[action]}
                            </button>
                          ))}
                          {p.status === "draft" && !p.publishedAt && (confirmDelete === p.id ? (
                            <>
                              <button type="button" className={cx(styles.actionButton, styles.actionDanger)} onClick={() => deleteDraft(p)}>
                                Delete
                              </button>
                              <button type="button" className={cx(styles.actionButton, styles.actionBack)} onClick={() => setConfirmDelete(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button type="button" className={cx(styles.iconButton, styles.iconDanger)} aria-label={`Delete ${p.title}`} title={author.title ?? "Delete"} disabled={busyId === p.id || !author.allowed} onClick={() => setConfirmDelete(p.id)}>
                              <Trash2 width={15} height={15} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="pending-title">
          <div className={styles.modal}>
            <h2 id="pending-title">{ACTION_LABEL[pending.action]}</h2>
            <p className={styles.subtitle}>{pending.problem.title}</p>
            {NOTE_ACTIONS.includes(pending.action) && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="send-back-note">
                  {pending.action === "sendBack" ? "Reason for the author" : "Why is this problem being retired?"}
                </label>
                <textarea id="send-back-note" className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            {pending.action === "unpublish" && <p className={styles.modalText}>The problem will be hidden from learners and moved back to Ready.</p>}
            {pending.action === "deprecate" && <p className={styles.modalText}>Deprecated problems stay in the history but can no longer be published or edited.</p>}
            {errors && (
              <div className={styles.notice} role="alert">
                <ul>
                  {errors.list.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => { setPending(null); setErrors(null); }}>
                Cancel
              </button>
              <button type="button" className={cx(styles.primaryButton, (pending.action === "unpublish" || pending.action === "deprecate") && styles.dangerButton)} disabled={busyId === pending.problem.id || (NOTE_ACTIONS.includes(pending.action) && note.trim().length < 5)} onClick={confirmPending}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
