import { ClipboardCheck, FileCode2, FlaskConical, Gauge, Layers, LineChart, Sparkles, Tags, Upload, FilePlus2 } from "lucide-react";
import type { RoleConfig } from "./admin-nav";

const CM = "/content-manager";

export const CONTENT_MANAGER_CONFIG: RoleConfig = {
  role: "content-manager",
  label: "Content Manager",
  initials: "CM",
  basePath: "/dashboard",
  sections: [
    {
      title: "Main",
      items: [{ label: "Dashboard", href: "/dashboard", icon: Gauge, ready: true }],
    },
    {
      title: "Problems",
      items: [
        { label: "Problem Library", href: `${CM}/problems`, icon: FileCode2, ready: true },
        { label: "Create Problem", href: `${CM}/create`, icon: FilePlus2, ready: true },
        { label: "Bulk CSV Import", href: `${CM}/import/csv`, icon: Upload },
        { label: "AI Generation", href: `${CM}/import/ai`, icon: Sparkles },
        { label: "Test Case Preparation", href: `${CM}/test-cases`, icon: FlaskConical },
      ],
    },
    {
      title: "Organization",
      items: [
        { label: "Content Organization", href: `${CM}/taxonomy`, icon: Tags },
        { label: "Content Batches", href: `${CM}/batches`, icon: Layers },
      ],
    },
    {
      title: "Review",
      items: [{ label: "Review Queue", href: `${CM}/review`, icon: ClipboardCheck }],
    },
    {
      title: "Insights",
      items: [{ label: "Content Reports", href: `${CM}/reports`, icon: LineChart }],
    },
  ],
};
