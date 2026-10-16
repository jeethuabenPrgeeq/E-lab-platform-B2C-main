"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { usePermissionGate } from "../../permissions/PermissionsProvider";
import { useTechnologies } from "../lib/api";
import { CATEGORY_LABEL, STATUS_LABEL, cx, formatDate, initials } from "../lib/shared";
import { CATEGORIES, STATUSES, type Technology, type TechnologyInput } from "../lib/types";
import { TechnologyModal } from "../TechnologyModal/TechnologyModal";
import styles from "./TechnologiesPage.module.css";

export default function TechnologiesPage() {
  const author = usePermissionGate("problems.manage");
  const { items, loaded, loadError, create, update, remove } = useTechnologies();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<{ item: Technology | null } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (status && item.status !== status) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.slug.includes(q) && !item.runtimeImage.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, category, status]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "active").length,
      draft: items.filter((item) => item.status === "draft").length,
      problems: items.reduce((sum, item) => sum + item.problemCount, 0),
    }),
    [items],
  );

  const submit = async (input: TechnologyInput) => {
    const editing = modal?.item;
    const result = editing ? await update(editing.id, input) : await create(input);
    if (!result.ok) return result.error;
    setModal(null);
    setNotice({ tone: "ok", text: editing ? `Saved ${input.name}.` : `Added ${input.name}.` });
    return null;
  };

  const act = async (item: Technology, task: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) => {
    setBusyId(item.id);
    const result = await task();
    setBusyId(null);
    setNotice(result.ok ? { tone: "ok", text: done } : { tone: "error", text: result.error });
  };

  const toggleStatus = (item: Technology) => {
    const next = item.status === "disabled" ? "active" : "disabled";
    void act(item, () => update(item.id, { status: next }), `${item.name} is now ${next}.`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Technology Management</h1>
          <p className={styles.subtitle}>Languages, frameworks and tools available for practice problems</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.primaryButton} disabled={!author.allowed} title={author.title} onClick={() => setModal({ item: null })}>
            <Plus width={16} height={16} aria-hidden="true" />
            Add technology
          </button>
        </div>
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Technologies</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.active}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.draft}</span>
          <span className={styles.statLabel}>In draft</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.problems}</span>
          <span className={styles.statLabel}>Linked problems</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by name, slug or image" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search technologies" />
          </div>
          <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        {notice && (
          <p className={notice.tone === "error" ? styles.errorNotice : styles.okNotice} role={notice.tone === "error" ? "alert" : "status"}>
            {notice.text}
          </p>
        )}

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} ${rows.length === 1 ? "technology" : "technologies"}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : loadError ? (
          <div className={styles.empty}>{loadError}</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{items.length === 0 ? "No technologies yet. Add the first one." : "No technologies match the current filters."}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Technology</th>
                  <th>Category</th>
                  <th>Runtime</th>
                  <th className={styles.num}>Problems</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.techCell}>
                          <span className={styles.techMark} data-category={item.category} aria-hidden="true">
                            {initials(item.name)}
                          </span>
                          <span>
                            <span className={styles.techName}>{item.name}</span>
                            <span className={styles.slug}>{item.slug}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.tag}>{CATEGORY_LABEL[item.category]}</span>
                      </td>
                      <td>
                        <code className={styles.mono}>{item.runtimeImage ? (item.version ? `${item.runtimeImage}:${item.version}` : item.runtimeImage) : "—"}</code>
                        {item.fileExtension && <span className={styles.slug}>{`${item.fileExtension} files`}</span>}
                      </td>
                      <td className={styles.num}>{item.problemCount}</td>
                      <td>
                        <span className={cx(styles.badge, styles[item.status])}>{STATUS_LABEL[item.status]}</span>
                      </td>
                      <td className={styles.date}>{formatDate(item.updatedAt)}</td>
                      <td>
                        {confirmId === item.id ? (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={cx(styles.actionButton, styles.actionDanger)}
                              disabled={busyId === item.id}
                              onClick={() => {
                                setConfirmId(null);
                                void act(item, () => remove(item.id), `Deleted ${item.name}.`);
                              }}>
                              Delete
                            </button>
                            <button type="button" className={cx(styles.actionButton, styles.actionBack)} onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            <button type="button" className={styles.iconButton} aria-label={`Edit ${item.name}`} title={author.title ?? "Edit"} disabled={!author.allowed} onClick={() => setModal({ item })}>
                              <Pencil width={15} height={15} aria-hidden="true" />
                            </button>
                            <button type="button" className={cx(styles.iconButton, item.status === "disabled" ? styles.iconSuccess : styles.iconWarn)} aria-label={item.status === "disabled" ? `Enable ${item.name}` : `Disable ${item.name}`} title={author.title ?? (item.status === "disabled" ? "Enable" : "Disable")} disabled={busyId === item.id || !author.allowed} onClick={() => toggleStatus(item)}>
                              <Power width={15} height={15} aria-hidden="true" />
                            </button>
                            <button type="button" className={cx(styles.iconButton, styles.iconDanger)} aria-label={`Delete ${item.name}`} title={author.title ?? "Delete"} disabled={!author.allowed} onClick={() => setConfirmId(item.id)}>
                              <Trash2 width={15} height={15} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <TechnologyModal key={modal.item?.id ?? "new"} initial={modal.item} items={items} onCancel={() => setModal(null)} onSubmit={submit} />}
    </div>
  );
}
