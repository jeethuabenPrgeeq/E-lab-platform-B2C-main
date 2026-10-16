"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Layers, ListChecks, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/admin/widgets/AdminWidgets";
import { formatDate } from "@/features/admin/problems/lib/shared";
import { useInstitutionLabel } from "../lib/useInstitutionLabel";
import styles from "../ui/institute.module.css";
import { BATCH_ROUTE, BATCH_TYPE_LABEL, batchApi, meetsTargets, useBatches } from "./api";

export default function BatchesPage() {
  const institution = useInstitutionLabel();
  const [search, setSearch] = useState("");
  const { items, loaded, error, refresh } = useBatches(search.trim());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const problems = items.reduce((sum, batch) => sum + batch.problemCount, 0);
  const onTarget = items.filter((batch) => batch.problemCount > 0 && meetsTargets(batch)).length;
  const gaps = items.filter((batch) => batch.withoutSample + batch.withoutHidden > 0).length;

  const remove = async (id: string, name: string) => {
    setBusyId(id);
    const result = await batchApi.remove(id);
    setBusyId(null);
    setConfirmId(null);
    if (result.ok) {
      setNotice({ tone: "ok", text: `${name} was deleted.` });
      await refresh();
    } else setNotice({ tone: "error", text: result.error });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Content Batches"
        pill={institution}
        meta="Group institution problems into batches with difficulty targets"
        actions={
          <>
            <button className={styles.ghostButton} type="button" onClick={() => void refresh()}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
            <Link className={styles.primaryButton} href={`${BATCH_ROUTE}/new`}>
              <Plus size={16} aria-hidden="true" />
              New batch
            </Link>
          </>
        }
      />

      <section className={styles.statGrid} aria-label="Batch summary">
        <StatCard metric={{ key: "batches", label: "Batches", value: items.length, tone: "primary" }} icon={Layers} />
        <StatCard metric={{ key: "problems", label: "Problems in batches", value: problems, tone: "neutral" }} icon={ListChecks} />
        <StatCard metric={{ key: "target", label: "Matching their targets", value: onTarget, tone: "success" }} icon={CheckCircle2} />
        <StatCard metric={{ key: "gaps", label: "With test-case gaps", value: gaps, tone: gaps ? "warning" : "neutral" }} icon={TriangleAlert} />
      </section>

      <Panel title="Batches">
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <Search className={styles.searchIcon} size={16} aria-hidden="true" />
            <input className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search batch name" aria-label="Search batches" />
          </label>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {`Unable to load batches: ${error}`}
          </p>
        )}
        {notice && (
          <p className={notice.tone === "error" ? styles.error : styles.success} role={notice.tone === "error" ? "alert" : "status"}>
            {notice.text}
          </p>
        )}
        {!loaded ? (
          <p className={styles.empty}>Loading batches…</p>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Layers size={30} aria-hidden="true" />
            <strong>{search ? "No matching batches" : "No batches yet"}</strong>
            <p>Create a batch, then pick problems from your Content Library.</p>
            <Link href={`${BATCH_ROUTE}/new`} className={styles.textLink}>
              Create a batch
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Type</th>
                  <th>Problems</th>
                  <th>Easy · Medium · Hard</th>
                  <th>Test cases</th>
                  <th>Assigned</th>
                  <th>Updated</th>
                  <th>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <Link href={`${BATCH_ROUTE}/${batch.id}`} className={styles.rowTitle}>
                        {batch.name}
                      </Link>
                      {batch.focus && <span className={styles.rowMeta}>{batch.focus}</span>}
                    </td>
                    <td>{BATCH_TYPE_LABEL[batch.type]}</td>
                    <td>{batch.problemCount}</td>
                    <td>
                      {`${batch.difficulty.easy} · ${batch.difficulty.medium} · ${batch.difficulty.hard}`}
                      <span className={styles.rowMeta}>{meetsTargets(batch) ? "Matches targets" : `Targets ${batch.targets.easy} · ${batch.targets.medium} · ${batch.targets.hard}`}</span>
                    </td>
                    <td>{batch.withoutSample + batch.withoutHidden === 0 ? "Complete" : `${batch.withoutHidden} without hidden, ${batch.withoutSample} without sample`}</td>
                    <td>
                      {batch.assignedAt ? formatDate(batch.assignedAt) : "Not assigned"}
                      {batch.assignedAt && <span className={styles.rowMeta}>{batch.assignedGroup ? batch.assignedGroup.name : "All learners"}</span>}
                    </td>
                    <td>{formatDate(batch.updatedAt)}</td>
                    <td>
                      {confirmId === batch.id ? (
                        <span className={styles.rowActions}>
                          <button type="button" className={styles.dangerButton} disabled={busyId !== null} onClick={() => void remove(batch.id, batch.name)}>
                            {busyId === batch.id ? "Deleting…" : "Delete"}
                          </button>
                          <button type="button" className={styles.textButton} onClick={() => setConfirmId(null)}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" className={styles.iconButton} aria-label={`Delete ${batch.name}`} title="Delete batch" onClick={() => setConfirmId(batch.id)}>
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className={styles.note}>Learners see a batch once it is assigned. Only published problems can be in an assigned batch.</p>
    </div>
  );
}
