import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/reports/production")({
  head: () => ({
    meta: [
      { title: "דוח ייצור — ניהול המאפייה" },
      { name: "description", content: "כמויות הייצור הנדרשות ליום האספקה, לפי מוצר וקטגוריה." },
      { property: "og:title", content: "דוח ייצור — ניהול המאפייה" },
      { property: "og:description", content: "כמויות הייצור הנדרשות ליום האספקה, לפי מוצר וקטגוריה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder title="דוח ייצור" description="הדוח יופק בשלב מאוחר יותר בתוכנית." />
    </AdminShell>
  ),
});
