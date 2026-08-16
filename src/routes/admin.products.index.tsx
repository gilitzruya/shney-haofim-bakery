import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/products/")({
  head: () => ({
    meta: [
      { title: "מוצרים — ניהול המאפייה" },
      { name: "description", content: "ניהול המוצרים והקטגוריות של המאפייה וסדר התצוגה." },
      { property: "og:title", content: "מוצרים — ניהול המאפייה" },
      { property: "og:description", content: "ניהול המוצרים והקטגוריות של המאפייה וסדר התצוגה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder title="ניהול מוצרים וקטגוריות" description="ניהול המוצרים והקטגוריות יתווסף בשלב הבא." />
    </AdminShell>
  ),
});
