"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, FilePen, FileCode2, Hourglass, Rocket } from "lucide-react";
import { ShareBar } from "@/components/admin/charts/Charts";
import { MetricStrip, PageHeader, Panel, Section, StatCard } from "@/components/admin/widgets/AdminWidgets";
import { adminApi, errorText } from "@/features/admin/lib/api";
import { usePermissions } from "@/features/admin/permissions/PermissionsProvider";
import type { DistributionItem, Metric } from "@/features/admin/types";
import styles from "./InstituteAdminDashboard.module.css";

export interface ContentDashboardData {
  updatedAt: string;
  technologies: { id: string; name: string }[];
  summary: Metric[];
  pipeline: DistributionItem[];
  attention: Metric[];
  recent: { id: string; slug: string; title: string; status: string; statusLabel: string; difficulty: string; technology: string; updatedAt: number }[];
  activity: { id: string; at: number; summary: string; type: string }[];
}

const SUMMARY_ICONS = {
  assigned: FileCode2,
  draft: FilePen,
  review: Hourglass,
  published: CheckCircle2,
};

const ATTENTION_ICONS = {
  staleDrafts: ClipboardList,
  ready: Rocket,
};

const PERIODS = [
  { value: "", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const REFRESH_MS = 60_000;

function timeAgo(at: number) {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface AssignedBatch {
  id: string;
  name: string;
  assignedAt: string;
  group: string | null;
  problems: number;
  learners: number;
  started: number;
  completed: number;
}

export function InstituteAdminDashboard() {
  const [data, setData] = useState<ContentDashboardData | null>(null);
  const [error, setError] = useState("");
  const [technologyId, setTechnologyId] = useState("");
  const [days, setDays] = useState("");
  const { status: accessStatus, institution, has, staff, roleName } = usePermissions();
  const pill = staff && roleName ? roleName : "Institute Admin";
  const allowed = accessStatus === "ready" && Boolean(institution) && has("inst.content.view");
  const canSeeBatches = allowed && has("inst.batches.manage");
  const [assigned, setAssigned] = useState<AssignedBatch[] | null>(null);

  useEffect(() => {
    if (!canSeeBatches) return;
    let alive = true;
    adminApi<{ items: AssignedBatch[] }>("/institute/batches/progress")
      .then((result) => {
        if (alive) setAssigned(result.items);
      })
      .catch(() => {
        if (alive) setAssigned([]);
      });
    return () => {
      alive = false;
    };
  }, [canSeeBatches]);
  const title = institution?.name ?? "Institute Dashboard";

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    const load = () =>
      adminApi<ContentDashboardData>("/institute/dashboard", { query: { technologyId, days } })
        .then((next) => {
          if (!alive) return;
          setData(next);
          setError("");
        })
        .catch((err) => {
          if (alive) setError(errorText(err));
        });
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [technologyId, days, allowed]);

  if (accessStatus === "ready" && !allowed) {
    return (
      <div className={styles.page}>
        <PageHeader title={title} pill="Institute Admin" />
        <Panel title={institution ? "No access to institution content" : "Not linked to an institution"}>
          <p className={styles.notice}>{institution ? (institution.status === "suspended" ? "Your institution is suspended. Contact the eLab team to reactivate it." : staff ? "Your account does not include the “View institution content” permission. Ask your Institute Admin to grant it." : "Your institution does not include the “View institution content” permission. Ask a Super Admin to grant it.") : "Your account is not linked to an institution yet. Ask a Super Admin to link you from the Institutions page."}</p>
        </Panel>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <PageHeader title={title} pill="Institute Admin" meta={error || "Loading live data…"} />
      </div>
    );
  }

  const filters = (
    <div className={styles.filters}>
      <select className={styles.select} value={technologyId} onChange={(event) => setTechnologyId(event.target.value)} aria-label="Filter by technology">
        <option value="">All technologies</option>
        {data.technologies.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.name}
          </option>
        ))}
      </select>
      <select className={styles.select} value={days} onChange={(event) => setDays(event.target.value)} aria-label="Filter by period">
        {PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader title={title} pill="Institute Admin" meta={error ? `Showing data from ${data.updatedAt} · ${error}` : `Updated ${data.updatedAt}`} actions={filters} />

      <Section title="Institution content">
        <div className={styles.statGrid}>
          {data.summary.map((metric) => (
            <StatCard key={metric.key} metric={metric} icon={SUMMARY_ICONS[metric.key as keyof typeof SUMMARY_ICONS]} />
          ))}
        </div>
        <div className={styles.split}>
          <Panel title="Recently edited" subtitle="Latest changes across your institution">
            {data.recent.length ? (
              <ul className={styles.list}>
                {data.recent.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <span className={styles.itemMain}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemMeta}>{`${item.technology} · ${item.difficulty} · ${timeAgo(item.updatedAt)}`}</span>
                    </span>
                    <span className={`${styles.badge} ${styles[`tone_${item.status}`] ?? ""}`}>{item.statusLabel}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No problems yet. Problems you create will appear here.</p>
            )}
          </Panel>
          <Panel title="Pipeline" subtitle="Institution problems by stage">
            <ShareBar title="Institution problems by stage" items={data.pipeline} />
          </Panel>
        </div>
        <MetricStrip label="Needs attention" items={data.attention} icons={ATTENTION_ICONS} minItemWidth={200} />
      </Section>

      {canSeeBatches && (
        <Section title="Learner progress">
          <Panel title="Assigned batches" subtitle="How many learners have finished each batch you assigned">
            {assigned === null ? (
              <p className={styles.empty}>Loading…</p>
            ) : assigned.length ? (
              <ul className={styles.list}>
                {assigned.map((batch) => (
                  <li key={batch.id} className={styles.item}>
                    <span className={styles.itemMain}>
                      <Link href={`/batches/${batch.id}`} className={styles.itemTitle}>
                        {batch.name}
                      </Link>
                      <span className={styles.itemMeta}>{`${batch.group ?? "All learners"} · ${batch.problems} problem${batch.problems === 1 ? "" : "s"} · ${batch.started} started`}</span>
                    </span>
                    <span className={styles.badge}>{`${batch.completed} of ${batch.learners} completed`}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No batches assigned yet. Assign one from Content Batches.</p>
            )}
          </Panel>
        </Section>
      )}

      <Section title="Recent activity">
        <Panel title="Your latest actions" subtitle="Problems, test cases and imports">
          {data.activity.length ? (
            <ul className={styles.list}>
              {data.activity.map((item) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.itemMain}>
                    <span>{item.summary}</span>
                    <span className={styles.itemMeta}>{timeAgo(item.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No activity yet.</p>
          )}
        </Panel>
      </Section>
    </div>
  );
}
