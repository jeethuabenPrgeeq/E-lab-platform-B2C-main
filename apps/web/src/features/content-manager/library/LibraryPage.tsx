"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Pencil, Plus, Search, ChevronLeft, ChevronRight, RotateCcw, LibraryBig } from "lucide-react";
import { PageHeader } from "@/components/admin/widgets/AdminWidgets";
import { usePermissionGate } from "@/features/admin/permissions/PermissionsProvider";
import { useTechnologies } from "@/features/admin/technologies/lib/api";
import { DIFFICULTIES, STATUS_LABEL, capitalize, cx, formatDate } from "@/features/admin/problems/lib/shared";
import type { ProblemStatus } from "@/features/admin/problems/lib/types";
import { CM_ROUTE, CM_TECHNOLOGIES, useLibrary, type LibraryFilters, type LibraryScope } from "../lib/api";
import { useInstitutionLabel } from "../lib/useInstitutionLabel";
import styles from "./LibraryPage.module.css";

const SCOPES: { value: LibraryScope; label: string }[] = [
  { value: "all", label: "All institution problems" },
  { value: "created", label: "Created by me" },
  { value: "assigned", label: "Assigned to me" },
];
const STATUSES: ProblemStatus[] = ["draft", "review", "ready", "published", "deprecated"];
const PAGE_SIZE = 10;

export default function LibraryPage() {
  const router = useRouter();
  const institution = useInstitutionLabel();
  const create = usePermissionGate("inst.content.create");
  const [scope, setScope] = useState<LibraryScope>("all");
  const [status, setStatus] = useState<ProblemStatus | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [technologyId, setTechnologyId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const filters = useMemo<LibraryFilters>(() => ({ scope, status, difficulty, technologyId, q: q.trim() }), [scope, status, difficulty, technologyId, q]);
  const { data, loaded, error, clearError, duplicate } = useLibrary(filters);
  const { items: technologies } = useTechnologies(CM_TECHNOLOGIES);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const rows = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(safePage * PAGE_SIZE, rows.length);
  const hasFilters = Boolean(q || status || difficulty || technologyId);

  useEffect(() => {
    setPage(1);
  }, [scope, status, difficulty, technologyId, q]);

  function resetFilters() {
    setQ("");
    setStatus("");
    setDifficulty("");
    setTechnologyId("");
  }

  async function copy(id: string, title: string) {
    setBusyId(id);
    try {
      const result = await duplicate(id);
      if (!result.ok) {
        setNotice(`Could not duplicate "${title}": ${result.error}`);
        return;
      }
      router.push(`${CM_ROUTE}/${result.id}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <PageHeader
        title="Content Library"
        pill={institution}
        meta="Your institution’s problems. Drafts can be edited; other stages are view-only."
        actions={
          create.allowed ? (
            <Link href="/create" className={styles.primaryButton}>
              <Plus size={17} aria-hidden="true" /> New problem
            </Link>
          ) : (
            <button type="button" className={styles.primaryButton} disabled title={create.title}>
              <Plus size={17} aria-hidden="true" /> New problem
            </button>
          )
        }
      />

      <nav className={styles.scopeTabs} aria-label="Library scope">
        {SCOPES.map((item) => (
          <button key={item.value} type="button" className={cx(styles.scopeTab, scope === item.value && styles.scopeTabActive)} aria-pressed={scope === item.value} onClick={() => setScope(item.value)}>
            {item.label}
          </button>
        ))}
      </nav>

      <section className={styles.card} aria-label="Problem library">
        <div className={styles.cardHeading}>
          <div>
            <h2 className={styles.sectionTitle}>Problems</h2>
            <p className={styles.sectionHint}>Search and manage your coding content</p>
          </div>
          <span className={styles.totalPill}>{data?.total ?? rows.length} total</span>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={17} aria-hidden="true" />
            <span className={styles.srOnly}>Search by title or slug</span>
            <input className={styles.input} placeholder="Search by title or slug" value={q} onChange={(event) => setQ(event.target.value)} />
          </label>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value as ProblemStatus | "")} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
                {data?.statusCounts[value] ? ` (${data.statusCounts[value]})` : ""}
              </option>
            ))}
          </select>
          <select className={styles.select} value={technologyId} onChange={(event) => setTechnologyId(event.target.value)} aria-label="Filter by technology">
            <option value="">All technologies</option>
            {technologies.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty">
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((value) => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button type="button" className={styles.clearButton} onClick={resetFilters}>
            <RotateCcw size={14} aria-hidden="true" /> Clear filters
          </button>
        )}

        {(error || notice) && (
          <div className={styles.notice} role="alert">
            <span>{error || notice}</span>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={() => {
                clearError();
                setNotice("");
              }}>
              Dismiss
            </button>
          </div>
        )}

        {!loaded ? (
          <div className={styles.empty} role="status">
            Loading problems...
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            <LibraryBig size={35} strokeWidth={1.5} aria-hidden="true" />
            <strong>{hasFilters ? "No matching problems" : "Your library is empty"}</strong>
            <p>{hasFilters ? "Try adjusting your search or filters." : "Upload new content or ask a Super Admin to assign problems to you."}</p>
            {hasFilters ? (
              <button type="button" className={styles.secondaryButton} onClick={resetFilters}>
                Clear filters
              </button>
            ) : (
              <Link href="/upload-content" className={styles.secondaryButton}>
                Upload Content
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Technology</th>
                    <th>Difficulty</th>
                    <th>Status</th>
                    <th className={styles.num}>Sample</th>
                    <th className={styles.num}>Hidden</th>
                    <th>Owner</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((p) => (
                    <tr key={p.id}>
                      <td className={styles.problemCell}>
                        <Link href={`${CM_ROUTE}/${p.id}`} className={styles.problemTitle}>
                          {p.title}
                        </Link>
                        <span className={styles.slug}>
                          {p.slug}
                          {p.version > 1 ? ` · v${p.version}` : ""}
                        </span>
                        {p.status === "draft" && p.reviewNote && <span className={styles.reviewNote}>Sent back: {p.reviewNote}</span>}
                      </td>
                      <td>
                        <span className={styles.tech}>{p.technology.name}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[p.difficulty])}>{capitalize(p.difficulty)}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[p.status])}>{STATUS_LABEL[p.status]}</span>
                      </td>
                      <td className={cx(styles.num, p.sampleTests === 0 && styles.missing)}>{p.sampleTests}</td>
                      <td className={cx(styles.num, p.hiddenTests === 0 && styles.missing)}>{p.hiddenTests}</td>
                      <td>
                        <span className={styles.owner}>{p.mine ? "You" : (p.createdBy?.name ?? "Platform team")}</span>
                        {p.assignee && <span className={styles.slug}>Assigned: {p.assignee.name}</span>}
                      </td>
                      <td className={styles.date}>{formatDate(p.updatedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <Link href={`${CM_ROUTE}/${p.id}`} className={styles.iconButton} aria-label={`${p.editable ? "Edit" : "View"} ${p.title}`} title={p.editable ? "Edit" : "View"}>
                            {p.editable ? <Pencil size={16} /> : <Eye size={16} />}
                          </Link>
                          <button type="button" className={styles.iconButton} aria-label={`Duplicate ${p.title}`} title={create.title ?? "Duplicate as a new draft"} disabled={busyId !== null || !create.allowed} onClick={() => void copy(p.id, p.title)}>
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className={styles.pagination}>
              <span>
                Showing {start}–{end} of {rows.length} loaded problems{(data?.total ?? 0) > rows.length ? ` (${data?.total} total)` : ""}
              </span>
              <div className={styles.pageControls}>
                <button type="button" className={styles.pageButton} onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Previous page">
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page {safePage} of {totalPages}
                </span>
                <button type="button" className={styles.pageButton} onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Next page">
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
