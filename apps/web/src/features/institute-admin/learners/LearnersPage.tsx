"use client";

import { Fragment, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Download, FileUp, FolderPlus, RefreshCw, Search, Trash2, UserCheck, UserPlus, UserX, Users, X } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/admin/widgets/AdminWidgets";
import { useToast } from "@/components/toast/ToastProvider";
import { formatDate } from "@/features/admin/problems/lib/shared";
import { usePermissions } from "@/features/admin/permissions/PermissionsProvider";
import { useInstitutionLabel } from "../lib/useInstitutionLabel";
import styles from "../ui/institute.module.css";
import own from "./LearnersPage.module.css";
import { credentialsCsv, learnerApi, parseLearnerRows, useLearners, type Credential, type ImportResult } from "./api";

const MAX_ROWS = 100;
const ALL = "all";
const NONE = "none";

type AddMode = "single" | "bulk";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export default function LearnersPage() {
  const institution = useInstitutionLabel();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "active" | "revoked">("");
  const { items, groups, counts, loaded, error, refresh } = useLearners(q.trim(), status);
  const { has } = usePermissions();
  const owner = has("inst.staff.manage");

  const [selected, setSelected] = useState<string>(ALL);
  const [groupName, setGroupName] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("single");
  const [addGroup, setAddGroup] = useState("");
  const [addError, setAddError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bulk, setBulk] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [skipped, setSkipped] = useState<ImportResult["skipped"]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const bulkRows = parseLearnerRows(bulk);
  const selectedGroup = groups.find((group) => group.id === selected) ?? null;
  const targetGroup = addGroup || (owner ? "" : (groups[0]?.id ?? ""));
  const needsGroup = !owner && !targetGroup;
  const ungrouped = items.filter((learner) => learner.status === "active" && !learner.group).length;
  const visible = selected === ALL ? items : items.filter((learner) => (selected === NONE ? !learner.group : learner.group?.id === selected));
  const listTitle = selected === ALL ? "All learners" : selected === NONE ? "Ungrouped learners" : (selectedGroup?.name ?? "Learners");
  const visibleActive = visible.filter((learner) => learner.status === "active").length;
  const visibleRevoked = visible.length - visibleActive;
  const listSubtitle = `${plural(visibleActive, "active learner")}${visibleRevoked ? ` · ${visibleRevoked} revoked` : ""}${q || status ? " matching your filters" : ""}`;

  useEffect(() => {
    if (selected !== ALL && selected !== NONE && loaded && !groups.some((group) => group.id === selected)) setSelected(ALL);
  }, [groups, selected, loaded]);

  useEffect(() => {
    if (!addOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAddOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  const openAdd = (groupId?: string) => {
    setAddGroup(groupId ?? (selectedGroup ? selectedGroup.id : ""));
    setAddError("");
    setAddOpen(true);
  };

  const finishAdd = async (created: Credential[], skippedRows: ImportResult["skipped"]) => {
    setCredentials(created);
    setSkipped(skippedRows);
    setAddOpen(false);
    toast.success(`${plural(created.length, "learner")} added${skippedRows.length ? `, ${skippedRows.length} skipped` : ""}`);
    await refresh();
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("invite");
    setAddError("");
    const result = await learnerApi.invite(name.trim(), email.trim(), targetGroup || null);
    setBusy(null);
    if (!result.ok) return setAddError(result.error);
    setName("");
    setEmail("");
    await finishAdd([{ name: result.data.learner.name, email: result.data.learner.email, temporaryPassword: result.data.temporaryPassword }], []);
  };

  const importRows = async () => {
    setBusy("import");
    setAddError("");
    const result = await learnerApi.import(bulkRows, targetGroup || null);
    setBusy(null);
    if (!result.ok) return setAddError(result.error);
    setBulk("");
    await finishAdd(result.data.created, result.data.skipped);
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setBulk(await file.text());
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([credentialsCsv(credentials)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "learner-credentials.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const revoke = async (id: string) => {
    setBusy(id);
    const result = await learnerApi.revoke(id, reason.trim());
    setBusy(null);
    if (!result.ok) return setNotice(result.error);
    setRevokingId(null);
    setReason("");
    toast.success(`${result.data.name} was revoked and signed out`);
    await refresh();
  };

  const restore = async (id: string) => {
    setBusy(id);
    const result = await learnerApi.restore(id);
    setBusy(null);
    if (!result.ok) return setNotice(result.error);
    toast.success(`${result.data.name} can sign in again`);
    await refresh();
  };

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("group");
    setNotice("");
    const result = await learnerApi.createGroup(groupName.trim());
    setBusy(null);
    if (!result.ok) return setNotice(result.error);
    setGroupName("");
    toast.success(`Group ${result.data.name} created`);
    await refresh();
    setSelected(result.data.id);
  };

  const deleteGroup = async (id: string, groupLabel: string) => {
    setBusy(id);
    const result = await learnerApi.deleteGroup(id);
    setBusy(null);
    setDeletingGroupId(null);
    if (!result.ok) return setNotice(result.error);
    if (selected === id) setSelected(ALL);
    toast.success(`Group ${groupLabel} deleted. Its learners are now ungrouped.`);
    await refresh();
  };

  const moveToGroup = async (id: string, groupId: string) => {
    setBusy(id);
    const result = await learnerApi.setGroup(id, groupId || null);
    setBusy(null);
    if (!result.ok) return setNotice(result.error);
    await refresh();
  };

  const groupButton = (key: string, label: string, count: number) => (
    <button type="button" className={`${own.groupButton} ${selected === key ? own.groupActive : ""}`} aria-current={selected === key ? "true" : undefined} onClick={() => setSelected(key)}>
      <span className={own.groupName}>{label}</span>
      <span className={own.groupCount} title="Active learners" aria-label={`${count} active learners`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Learners"
        pill={institution}
        meta={owner ? "Learners see your institution’s published problems and the batches you assign" : "Learners in the groups assigned to you"}
        actions={
          <>
            <button className={styles.ghostButton} type="button" onClick={() => void refresh()}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
            <button className={styles.primaryButton} type="button" onClick={() => openAdd()} disabled={!owner && groups.length === 0} title={!owner && groups.length === 0 ? "No learner groups are assigned to you" : undefined}>
              <UserPlus size={16} aria-hidden="true" />
              Add learners
            </button>
          </>
        }
      />

      <section className={styles.statGrid} aria-label="Learner summary">
        <StatCard metric={{ key: "active", label: "Active learners", value: counts.active, tone: "primary" }} icon={Users} />
        <StatCard metric={{ key: "never", label: "Never signed in", value: counts.neverSignedIn, tone: counts.neverSignedIn ? "warning" : "neutral" }} icon={UserPlus} />
        <StatCard metric={{ key: "revoked", label: "Revoked", value: counts.revoked, tone: "neutral" }} icon={UserX} />
      </section>

      {notice && (
        <p className={styles.error} role="alert">
          {notice}
        </p>
      )}

      {credentials.length > 0 && (
        <Panel
          title="Temporary passwords"
          subtitle="Shown once. Share them securely; learners must change their password after signing in."
          action={
            <button className={styles.ghostButton} type="button" onClick={download}>
              <Download size={16} aria-hidden="true" />
              Download CSV
            </button>
          }>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Temporary password</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((row) => (
                  <tr key={row.email}>
                    <td>
                      <span className={styles.rowTitle}>{row.name}</span>
                      <span className={styles.rowMeta}>{row.email}</span>
                    </td>
                    <td>
                      <code className={styles.code}>{row.temporaryPassword}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className={styles.textButton} onClick={() => setCredentials([])}>
            I’ve saved them, hide passwords
          </button>
        </Panel>
      )}

      {skipped.length > 0 && (
        <Panel
          title={`Skipped rows (${skipped.length})`}
          action={
            <button type="button" className={styles.textButton} onClick={() => setSkipped([])}>
              Dismiss
            </button>
          }>
          <ul className={styles.checkList}>
            {skipped.map((row) => (
              <li key={`${row.row}-${row.email}`} className={styles.checkWarn}>
                <UserX size={18} aria-hidden="true" />
                <span>{`Row ${row.row}${row.email ? ` (${row.email})` : ""}: ${row.reason}`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className={own.layout}>
        <nav className={own.groups} aria-label="Learner groups">
          <p className={own.groupsTitle}>{owner ? "Groups" : "Your groups"}</p>
          <ul className={own.groupList}>
            {owner && <li>{groupButton(ALL, "All learners", counts.active)}</li>}
            {groups.map((group) => (
              <li key={group.id} className={own.groupRow}>
                {groupButton(group.id, group.name, group.learners)}
                {owner && deletingGroupId !== group.id && (
                  <button type="button" className={own.groupDelete} aria-label={`Delete group ${group.name}`} title="Delete group" onClick={() => setDeletingGroupId(group.id)}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
                {owner && deletingGroupId === group.id && (
                  <div className={own.confirm}>
                    <span>{`Delete ${group.name}? Its learners become ungrouped and its batch assignments are removed.`}</span>
                    <span className={styles.rowActions}>
                      <button type="button" className={styles.dangerButton} disabled={busy !== null} onClick={() => void deleteGroup(group.id, group.name)}>
                        Delete
                      </button>
                      <button type="button" className={styles.textButton} onClick={() => setDeletingGroupId(null)}>
                        Cancel
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
            {owner && <li>{groupButton(NONE, "Ungrouped", ungrouped)}</li>}
          </ul>

          {owner ? (
            <form className={own.newGroup} onSubmit={(event) => void createGroup(event)}>
              <input id="group-name" className={styles.input} value={groupName} maxLength={60} onChange={(e) => setGroupName(e.target.value)} placeholder="New group, e.g. Batch A" aria-label="New group name" />
              <button type="submit" className={styles.ghostButton} disabled={busy !== null || groupName.trim().length < 2}>
                <FolderPlus size={16} aria-hidden="true" />
                Create group
              </button>
            </form>
          ) : (
            <p className={styles.rowMeta}>Only the Institute Admin can create or delete groups.</p>
          )}
        </nav>

        <div className={own.main}>
          <Panel
            title={listTitle}
            subtitle={listSubtitle}
            action={
              selectedGroup ? (
                <button type="button" className={styles.ghostButton} onClick={() => openAdd(selectedGroup.id)} disabled={busy !== null}>
                  <UserPlus size={16} aria-hidden="true" />
                  {`Add to ${selectedGroup.name}`}
                </button>
              ) : undefined
            }>
            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <Search className={styles.searchIcon} size={16} aria-hidden="true" />
                <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search learners" />
              </label>
              <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as "" | "active" | "revoked")} aria-label="Status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {`Unable to load learners: ${error}`}
              </p>
            )}

            {!loaded ? (
              <p className={styles.empty}>Loading learners…</p>
            ) : visible.length === 0 ? (
              <div className={styles.empty}>
                <Users size={30} aria-hidden="true" />
                <strong>{q || status ? "No matching learners" : selected === NONE ? "Everyone is in a group" : selectedGroup ? `No learners in ${selectedGroup.name} yet` : "No learners yet"}</strong>
                <p>{q || status ? "Try a different search or status." : selected === NONE ? "Learners you add without a group, or whose group is deleted, appear here." : "Use Add learners to invite one learner or import a list."}</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Status</th>
                      <th>Group</th>
                      <th>Last sign-in</th>
                      <th>Added</th>
                      <th>
                        <span className={styles.srOnly}>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((learner) => (
                      <Fragment key={learner.id}>
                        <tr className={revokingId === learner.id ? own.rowRevoking : undefined}>
                          <td>
                            <span className={styles.rowTitle}>{learner.name}</span>
                            <span className={styles.rowMeta}>{learner.email}</span>
                          </td>
                          <td>
                            {learner.status === "active" ? "Active" : "Revoked"}
                            {learner.revokeReason && <span className={styles.rowMeta}>{learner.revokeReason}</span>}
                          </td>
                          <td>
                            <select className={styles.select} value={learner.group?.id ?? ""} disabled={busy !== null || groups.length === 0 || learner.status === "revoked"} title={learner.status === "revoked" ? "Restore this learner to change their group" : undefined} onChange={(e) => void moveToGroup(learner.id, e.target.value)} aria-label={`Group for ${learner.name}`}>
                              {(owner || !learner.group) && <option value="">No group</option>}
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>{learner.lastLoginAt ? formatDate(learner.lastLoginAt) : "Never"}</td>
                          <td>
                            {formatDate(learner.createdAt)}
                            {learner.invitedByName && <span className={styles.rowMeta}>{`by ${learner.invitedByName}`}</span>}
                          </td>
                          <td>
                            {learner.status === "revoked" ? (
                              <button type="button" className={styles.ghostButton} disabled={busy !== null} onClick={() => void restore(learner.id)}>
                                <UserCheck size={16} aria-hidden="true" />
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${styles.iconButton} ${own.revokeIcon}`}
                                aria-label={`Revoke ${learner.name}`}
                                aria-expanded={revokingId === learner.id}
                                title="Revoke access"
                                onClick={() => {
                                  setReason("");
                                  setRevokingId(revokingId === learner.id ? null : learner.id);
                                }}>
                                <UserX size={16} aria-hidden="true" />
                              </button>
                            )}
                          </td>
                        </tr>
                        {revokingId === learner.id && learner.status !== "revoked" && (
                          <tr className={own.revokeRow}>
                            <td colSpan={6}>
                              <form
                                className={own.revokeForm}
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  if (reason.trim().length >= 3) void revoke(learner.id);
                                }}>
                                <span className={own.revokeText}>{`Revoke ${learner.name}? They are signed out and can’t sign in until restored.`}</span>
                                <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 3 characters)" aria-label={`Reason for revoking ${learner.name}`} maxLength={300} autoFocus />
                                <button type="submit" className={styles.dangerButton} disabled={busy !== null || reason.trim().length < 3}>
                                  Revoke
                                </button>
                                <button type="button" className={styles.textButton} onClick={() => setRevokingId(null)}>
                                  Cancel
                                </button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {addOpen && (
        <div className={own.overlay} onMouseDown={(event) => event.target === event.currentTarget && setAddOpen(false)}>
          <aside className={own.drawer} role="dialog" aria-modal="true" aria-labelledby="add-learners-title">
            <div className={own.drawerHead}>
              <h2 id="add-learners-title" className={own.drawerTitle}>
                Add learners
              </h2>
              <button type="button" className={own.close} aria-label="Close" onClick={() => setAddOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Add to</span>
              <select className={styles.select} value={targetGroup} onChange={(e) => setAddGroup(e.target.value)} disabled={!owner && groups.length === 0}>
                {owner && <option value="">No group</option>}
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            {owner && groups.length === 0 && <p className={styles.rowMeta}>Tip: create a group first so you can assign batches to a set of learners.</p>}

            <div className={own.segment} role="tablist" aria-label="How to add learners">
              <button type="button" role="tab" aria-selected={mode === "single"} className={`${own.segmentButton} ${mode === "single" ? own.segmentActive : ""}`} onClick={() => setMode("single")}>
                One learner
              </button>
              <button type="button" role="tab" aria-selected={mode === "bulk"} className={`${own.segmentButton} ${mode === "bulk" ? own.segmentActive : ""}`} onClick={() => setMode("bulk")}>
                Import a list
              </button>
            </div>

            {addError && (
              <p className={styles.error} role="alert">
                {addError}
              </p>
            )}

            {mode === "single" ? (
              <form className={own.drawerBody} onSubmit={(event) => void invite(event)}>
                <label className={styles.field}>
                  <span className={styles.label}>Name</span>
                  <input id="learner-name" className={styles.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Menon" required minLength={2} autoFocus />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Email</span>
                  <input id="learner-email" type="email" className={styles.input} value={email} maxLength={160} onChange={(e) => setEmail(e.target.value)} placeholder="asha@student.edu" required />
                </label>
                <button type="submit" className={styles.primaryButton} disabled={busy !== null || needsGroup}>
                  <UserPlus size={16} aria-hidden="true" />
                  {busy === "invite" ? "Adding…" : "Add learner"}
                </button>
              </form>
            ) : (
              <div className={own.drawerBody}>
                <label className={styles.field}>
                  <span className={styles.label}>Learners</span>
                  <span className={styles.rowMeta}>{`One per line: name, email. Up to ${MAX_ROWS} at a time.`}</span>
                  <textarea id="learner-bulk" className={styles.textarea} rows={8} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"Asha Menon, asha@student.edu\nRahul Das, rahul@student.edu"} autoFocus />
                </label>
                {bulkRows.length > MAX_ROWS && <span className={styles.error}>{`Split the list: ${bulkRows.length} rows is more than ${MAX_ROWS}.`}</span>}
                <span className={styles.rowActions}>
                  <label className={styles.ghostButton}>
                    <FileUp size={16} aria-hidden="true" />
                    Load CSV file
                    <input type="file" accept=".csv,text/csv,text/plain" className={styles.srOnly} onChange={(e) => void loadFile(e)} />
                  </label>
                  <button type="button" className={styles.primaryButton} disabled={busy !== null || needsGroup || bulkRows.length === 0 || bulkRows.length > MAX_ROWS} onClick={() => void importRows()}>
                    {busy === "import" ? "Importing…" : bulkRows.length ? `Import ${plural(bulkRows.length, "learner")}` : "Import learners"}
                  </button>
                </span>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
