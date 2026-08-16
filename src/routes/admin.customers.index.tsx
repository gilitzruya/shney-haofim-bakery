import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminCustomerList } from "@/components/admin/customer-list";
import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { TextInput } from "@/components/app/form-controls";
import { useStore } from "@/store/app-store";

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
  component: AdminCustomersPage,
});

function AdminCustomersPage() {
  const { customers, hydrated } = useStore();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim();
    const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, "he"));
    return q ? sorted.filter((c) => c.name.includes(q) || c.address.includes(q)) : sorted;
  }, [customers, query]);

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[19px] font-bold text-heading">לקוחות</h1>
          <Link
            to="/admin/customers/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12.5px] font-bold text-primary-foreground no-underline"
          >
            <Plus className="size-4" />
            לקוח חדש
          </Link>
        </div>

        <div className="sticky top-[62px] z-10 -mx-1 bg-canvas/95 px-1 py-2 backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם או כתובת"
              aria-label="חיפוש לקוח"
              className="pe-9"
            />
          </div>
        </div>

        <div className="mt-3 text-[12px] text-muted-foreground">{list.length} לקוחות</div>

        <div className="mt-2">
          {!hydrated ? null : list.length === 0 ? (
            <EmptyState title="לא נמצאו לקוחות" description="אפשר לנקות את החיפוש או להוסיף לקוח חדש." />
          ) : (
            <AdminCustomerList customers={list} />
          )}
        </div>
      </Section>
    </AdminShell>
  );
}
