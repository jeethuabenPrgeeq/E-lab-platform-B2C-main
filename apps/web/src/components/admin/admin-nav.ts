import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Bell, Boxes, Bug, CreditCard, Cpu, FileCode2, FileText, FlaskConical, Gauge, Headphones, Layers, LayoutDashboard, Library, LifeBuoy, Receipt, Rocket, Route, ScrollText, Server, Settings, ShieldCheck, Siren, TicketPercent, Trophy, Upload, Users } from "lucide-react";
import type { AdminRole } from "@/features/admin/types";

export interface NavLeaf {
  label: string;
  href: string;
  ready?: boolean;
}

export interface NavItem extends NavLeaf {
  icon: LucideIcon;
  children?: NavLeaf[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface RoleConfig {
  role: AdminRole;
  label: string;
  initials: string;
  basePath: string;
  sections: NavSection[];
}

export const DASHBOARD = "/dashboard";
const SUPER = "";
const PLATFORM = "";

export const ROLE_CONFIG: Record<AdminRole, RoleConfig> = {
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
          { label: "Subscriptions", href: `${SUPER}/subscriptions`, icon: Layers, ready: true },
          { label: "Billing", href: `${SUPER}/billing`, icon: CreditCard, ready: true },
          { label: "Coupons", href: `${SUPER}/coupons`, icon: TicketPercent, ready: true },
        ],
      },
      {
        title: "Insights",
        items: [
          { label: "Analytics", href: `${SUPER}/analytics`, icon: BarChart3, ready: true },
          { label: "Reports", href: `${SUPER}/reports`, icon: FileText, ready: true },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Support", href: `${SUPER}/customer-support`, icon: LifeBuoy, ready: true },
          { label: "Notifications", href: `${SUPER}/notifications`, icon: Bell, ready: true },
        ],
      },
      {
        title: "People & Access",
        items: [
          { label: "Users", href: `${SUPER}/users`, icon: Users, ready: true },
          { label: "Admins & Permissions", href: `${SUPER}/access`, icon: ShieldCheck, ready: true },
        ],
      },
      {
        title: "System",
        items: [
          { label: "Platform Settings", href: `${SUPER}/settings`, icon: Settings, ready: true },
          { label: "Audit Logs", href: `${SUPER}/activity-logs`, icon: ScrollText, ready: true },
        ],
      },
      {
        title: "Content",
        items: [
          { label: "Content Catalog", href: `${SUPER}/content`, icon: Library, ready: true },
          { label: "Learning Paths", href: `${SUPER}/learning-paths`, icon: Route, ready: true },
          { label: "Challenges", href: `${SUPER}/challenges`, icon: Trophy, ready: true },
        ],
      },
    ],
  },
  "platform-admin": {
    role: "platform-admin",
    label: "Platform Admin",
    initials: "PA",
    basePath: DASHBOARD,
    sections: [
      {
        title: "Main",
        items: [{ label: "Dashboard", href: DASHBOARD, icon: Gauge, ready: true }],
      },
      {
        title: "Content Engineering",
        items: [
          { label: "Problem Management", href: `${PLATFORM}/problems`, icon: FileCode2, ready: true },
          { label: "Test Case Management", href: `${PLATFORM}/test-cases`, icon: FlaskConical, ready: true },
          { label: "Upload", href: `${PLATFORM}/content-import`, icon: Upload, ready: true },
          { label: "Technology Management", href: `${PLATFORM}/technologies`, icon: Boxes, ready: true },
        ],
      },
      {
        title: "Runtime",
        items: [
          { label: "Runtime Management", href: `${PLATFORM}/runtimes`, icon: Server, ready: true },
          { label: "Judge Management", href: `${PLATFORM}/judge`, icon: Cpu, ready: true },
        ],
      },
      {
        title: "Monitoring",
        items: [
          { label: "Execution Monitoring", href: `${PLATFORM}/executions`, icon: Activity, ready: true },
          { label: "Submission Monitoring", href: `${PLATFORM}/submissions`, icon: Receipt, ready: true },
        ],
      },
      {
        title: "Support",
        items: [
          { label: "Problem Reports", href: `${PLATFORM}/problem-reports`, icon: Bug, ready: true },
          { label: "Technical Support", href: `${PLATFORM}/support`, icon: Headphones, ready: true },
          { label: "Incident Management", href: `${PLATFORM}/incidents`, icon: Siren, ready: true },
        ],
      },
      {
        title: "Release",
        items: [
          { label: "Releases", href: `${PLATFORM}/releases`, icon: Rocket, ready: true },
          { label: "Technical Audit Logs", href: `${PLATFORM}/audit-logs`, icon: ScrollText, ready: true },
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
