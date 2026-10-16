import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Bell, Boxes, Building2, Bug, CreditCard, Cpu, FileCode2, FileText, FlaskConical, Gauge, Headphones, Layers, LayoutDashboard, Library, LifeBuoy, Receipt, Rocket, Route, ScrollText, Server, Settings, ShieldCheck, Siren, TicketPercent, Trophy, Upload, Users } from "lucide-react";
import type { PermissionRequirement } from "@/features/admin/permissions/PermissionsProvider";
import type { AdminRole } from "@/features/admin/types";
import { INSTITUTE_ADMIN_CONFIG } from "./content-nav";

export interface NavLeaf {
  label: string;
  href: string;
  ready?: boolean;
  permission?: PermissionRequirement;
}

export interface NavItem extends NavLeaf {
  icon: LucideIcon;
  children?: NavLeaf[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface RouteRule {
  href: string;
  permission: PermissionRequirement;
}

export interface RoleConfig {
  role: AdminRole;
  label: string;
  initials: string;
  basePath: string;
  sections: NavSection[];
  routes?: RouteRule[];
}

export const DASHBOARD = "/dashboard";
const SUPER = "";
const PLATFORM = "";

export const ROLE_CONFIG: Record<AdminRole, RoleConfig> = {
  "institute-admin": INSTITUTE_ADMIN_CONFIG,
  "super-admin": {
    role: "super-admin",
    label: "Super Admin",
    initials: "SA",
    basePath: DASHBOARD,
        sections: [
      {
        title: "Main",
        items: [{ label: "Dashboard", href: DASHBOARD, icon: LayoutDashboard, ready: true }],
      },
      {
        title: "Revenue",
        items: [
          { label: "Subscriptions", href: `${SUPER}/subscriptions`, icon: Layers, ready: true, permission: "billing.view" },
          { label: "Billing", href: `${SUPER}/billing`, icon: CreditCard, ready: true, permission: "billing.view" },
          { label: "Coupons", href: `${SUPER}/coupons`, icon: TicketPercent, ready: true, permission: "coupons.manage" },
        ],
      },
      {
        title: "Insights",
        items: [
          { label: "Analytics", href: `${SUPER}/analytics`, icon: BarChart3, ready: true, permission: "analytics.view" },
          { label: "Reports", href: `${SUPER}/reports`, icon: FileText, ready: true, permission: "reports.export" },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Support", href: `${SUPER}/customer-support`, icon: LifeBuoy, ready: true, permission: "support.respond" },
          { label: "Notifications", href: `${SUPER}/notifications`, icon: Bell, ready: true, permission: "notifications.send" },
        ],
      },
      {
        title: "People & Access",
        items: [
          { label: "Users", href: `${SUPER}/users`, icon: Users, ready: true, permission: "users.view" },
          { label: "Institutions", href: `${SUPER}/institutions`, icon: Building2, ready: true, permission: "institutions.manage" },
          { label: "Admins & Permissions", href: `${SUPER}/access`, icon: ShieldCheck, ready: true, permission: "admins.manage" },
        ],
      },
      {
        title: "System",
        items: [
          { label: "Platform Settings", href: `${SUPER}/settings`, icon: Settings, ready: true, permission: "settings.manage" },
          { label: "Audit Logs", href: `${SUPER}/activity-logs`, icon: ScrollText, ready: true, permission: "audit.view" },
        ],
      },
      {
        title: "Content",
        items: [
          { label: "Content Catalog", href: `${SUPER}/content`, icon: Library, ready: true, permission: "content.view" },
          { label: "Learning Paths", href: `${SUPER}/learning-paths`, icon: Route, ready: true, permission: "content.view" },
          { label: "Challenges", href: `${SUPER}/challenges`, icon: Trophy, ready: true, permission: "content.view" },
        ],
      },
    ],
  },
  "platform-admin": {
    role: "platform-admin",
    label: "Platform Admin",
    initials: "PA",
    basePath: DASHBOARD,
    routes: [
      { href: `${PLATFORM}/problems/create`, permission: "problems.manage" },
      { href: `${PLATFORM}/test-cases/hidden`, permission: "tests.hidden" },
    ],
    sections: [
      {
        title: "Main",
        items: [{ label: "Dashboard", href: DASHBOARD, icon: Gauge, ready: true }],
      },
      {
        title: "Content Engineering",
        items: [
          { label: "Problem Management", href: `${PLATFORM}/problems`, icon: FileCode2, ready: true, permission: "content.view" },
          { label: "Test Case Management", href: `${PLATFORM}/test-cases`, icon: FlaskConical, ready: true, permission: "tests.manage" },
          { label: "Upload", href: `${PLATFORM}/content-import`, icon: Upload, ready: true, permission: "content.upload" },
          { label: "Technology Management", href: `${PLATFORM}/technologies`, icon: Boxes, ready: true, permission: "content.view" },
        ],
      },
      {
        title: "Runtime",
        items: [
          { label: "Runtime Management", href: `${PLATFORM}/runtimes`, icon: Server, ready: true, permission: "runtimes.manage" },
          { label: "Judge Management", href: `${PLATFORM}/judge`, icon: Cpu, ready: true, permission: "judge.manage" },
        ],
      },
      {
        title: "Monitoring",
        items: [
          { label: "Execution Monitoring", href: `${PLATFORM}/executions`, icon: Activity, ready: true, permission: "monitoring.view" },
          { label: "Submission Monitoring", href: `${PLATFORM}/submissions`, icon: Receipt, ready: true, permission: "monitoring.view" },
        ],
      },
      {
        title: "Support",
        items: [
          { label: "Problem Reports", href: `${PLATFORM}/problem-reports`, icon: Bug, ready: true, permission: "support.technical" },
          { label: "Technical Support", href: `${PLATFORM}/support`, icon: Headphones, ready: true, permission: "support.technical" },
          { label: "Incident Management", href: `${PLATFORM}/incidents`, icon: Siren, ready: true, permission: "incidents.manage" },
        ],
      },
      {
        title: "Release",
        items: [
          { label: "Releases", href: `${PLATFORM}/releases`, icon: Rocket, ready: true, permission: "releases.manage" },
          { label: "Technical Audit Logs", href: `${PLATFORM}/audit-logs`, icon: ScrollText, ready: true, permission: "audit.view" },
        ],
      },
    ],
  },
};

export function isWithin(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ALL_HREFS: string[] = Object.values(ROLE_CONFIG).flatMap((config) => config.sections.flatMap((section) => section.items.flatMap((item) => [item.href, ...(item.children?.map((child) => child.href) ?? [])])));

export function isNavActive(pathname: string, href: string, _basePath = ""): boolean {
  if (!isWithin(pathname, href)) return false;
  return !ALL_HREFS.some((other) => other.length > href.length && isWithin(pathname, other));
}

export function filterNavSections(sections: NavSection[], query: string): NavSection[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.flatMap<NavItem>((item) => {
        if (item.label.toLowerCase().includes(needle)) return [item];
        const children = item.children?.filter((child) => child.label.toLowerCase().includes(needle));
        return children && children.length > 0 ? [{ ...item, children }] : [];
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export function filterNavByPermission(sections: NavSection[], has: (requirement?: PermissionRequirement) => boolean): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.flatMap<NavItem>((item) => {
        if (!has(item.permission)) return [];
        if (!item.children) return [item];
        const children = item.children.filter((child) => has(child.permission));
        return children.length > 0 ? [{ ...item, children }] : [];
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export interface RouteAccess {
  requirement?: PermissionRequirement;
  unavailable: boolean;
}

export function routeAccess(config: RoleConfig, pathname: string): RouteAccess {
  const rules: NavLeaf[] = [
    ...(config.routes ?? []).map((rule) => ({ label: rule.href, href: rule.href, permission: rule.permission, ready: true })),
    ...config.sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])])),
  ];
  let best: NavLeaf | undefined;
  for (const rule of rules) {
    if (!isWithin(pathname, rule.href)) continue;
    if (!best || rule.href.length > best.href.length) best = rule;
  }
  return { requirement: best?.permission, unavailable: Boolean(best && best.ready === false) };
}
