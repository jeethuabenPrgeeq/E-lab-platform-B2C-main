
import {
  ClipboardCheck,
  FileCode2,
  FlaskConical,
  Gauge,
  Layers,
  Library,
  LineChart,
  Tags,
  Upload,
} from "lucide-react";

import type { RoleConfig } from "./admin-nav";

export const CONTENT_MANAGER_CONFIG: RoleConfig = {
  role: "content-manager",
  label: "Content Manager",
  initials: "CM",
  basePath: "/dashboard",
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
      title: "Problems",
      items: [
        {
          label: "Upload Content",
          href: "/upload-content",
          icon: Upload,
          ready: true,
        },
        {
          label: "Test Case Preparation",
          href: "/test-case-preparation",
          icon: FlaskConical,
          ready: true,
        },
        {
          label: "Content Library",
          href: "/content-library",
          icon: Library,
          ready: true,
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
        },
        {
          label: "Content Batches",
          href: "/batches",
          icon: Layers,
          ready: true,
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
        },
      ],
    },
  ],
};

