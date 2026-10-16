import {
  ClipboardCheck,
  FlaskConical,
  Gauge,
  Layers,
  Library,
  LineChart,
  Tags,
  Upload,
} from "lucide-react";

import type { RoleConfig } from "./admin-nav";

export const INSTITUTE_ADMIN_CONFIG: RoleConfig = {
  role: "institute-admin",
  label: "Institute Admin",
  initials: "IA",
  basePath: "/dashboard",
  routes: [{ href: "/create", permission: "inst.content.create" }],
  sections: [
    {
      title: "Main",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: Gauge,
          ready: true,
        },
      ],
    },
    {
      title: "Content",
      items: [
        {
          label: "Content Library",
          href: "/content-library",
          icon: Library,
          ready: true,
          permission: "inst.content.view",
        },
        {
          label: "Upload Content",
          href: "/upload-content",
          icon: Upload,
          ready: false,
        },
        {
          label: "Test Case Preparation",
          href: "/test-case-preparation",
          icon: FlaskConical,
          ready: false,
        },
        {
          label: "Content Batches",
          href: "/batches",
          icon: Layers,
          ready: false,
        },
      ],
    },
    {
      title: "Organization",
      items: [
        {
          label: "Content Organization",
          href: "/taxonomy",
          icon: Tags,
          ready: true,
          permission: "inst.content.view",
        },
      ],
    },
    {
      title: "Review",
      items: [
        {
          label: "Review Queue",
          href: "/review",
          icon: ClipboardCheck,
          ready: true,
          permission: "inst.content.view",
        },
      ],
    },
    {
      title: "Insights",
      items: [
        {
          label: "Content Reports",
          href: "/content-reports",
          icon: LineChart,
          ready: true,
          permission: "inst.content.view",
        },
      ],
    },
  ],
};
