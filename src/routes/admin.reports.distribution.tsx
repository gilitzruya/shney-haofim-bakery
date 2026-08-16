import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/reports/distribution")({
  head: () => ({
    meta: [
      { title: "דוח חלוקה — ניהול המאפייה" },
      { name: "description", content: "פירוט האריזה והחלוקה לפי סבב ולקוח." },
      { property: "og:title", content: "דוח חלוקה — ניהול המאפייה" },
      { property: "og:description", content: "פירוט האריזה והחלוקה לפי סבב ולקוח." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder title="דוח חלוקה" description="הדוח יופק בשלב מאוחר יותר בתוכנית." />
    </AdminShell>
  ),
});
