import { createFileRoute } from "@tanstack/react-router";

import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/customers/")({
  head: () => ({
    meta: [
      { title: "לקוחות — ניהול המאפייה" },
      { name: "description", content: "ניהול הלקוחות של המאפייה, חיפוש, חסימה והרשאות סבבים." },
      { property: "og:title", content: "לקוחות — ניהול המאפייה" },
      { property: "og:description", content: "ניהול הלקוחות של המאפייה, חיפוש, חסימה והרשאות סבבים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder title="ניהול לקוחות" description="רשימת הלקוחות, חיפוש וניהול הרשאות יתווספו בשלב הבא." />
    </AdminShell>
  ),
});
