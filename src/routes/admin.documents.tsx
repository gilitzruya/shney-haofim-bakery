import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";
import { DocumentStatusChip } from "@/components/admin/document-status-chip";
import { Section } from "@/components/app/app-shell";
import { Card, EmptyState } from "@/components/app/card";
import { useAllAdminOrderViews } from "@/hooks/use-admin-orders";
import { DOCUMENT_TYPE_LABELS, accountingAdapter } from "@/lib/admin/accounting";
import { formatDate, formatPrice } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/documents")({
  head: () => ({
    meta: [
      { title: "יומן מסמכים — ניהול המאפייה" },
      { name: "description", content: "מעקב אחר תעודות המשלוח שהופקו להזמנות הלקוחות." },
      { property: "og:title", content: "יומן מסמכים — ניהול המאפייה" },
      { property: "og:description", content: "מעקב אחר תעודות המשלוח שהופקו להזמנות הלקוחות." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const { documents, hydrated } = useStore();
  const views = useAllAdminOrderViews();
  const adapter = accountingAdapter();

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <h1 className="mb-3 text-[19px] font-bold text-heading">יומן מסמכים</h1>

        <Card className="bg-card-muted">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-heading">חיבור להנהלת חשבונות</span>
            <span className="text-[11.5px] text-muted-foreground">
              {adapter.connected ? "מחובר" : "לא מחובר"}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            {adapter.name} — המסמכים נשמרים כרגע במערכת בלבד, ללא שליחה לספק החיצוני.
          </p>
        </Card>

        <div className="mt-3 flex flex-col gap-2">
          {!hydrated ? null : documents.length === 0 ? (
            <EmptyState
              title="לא הופקו מסמכים"
              description="אפשר להפיק תעודת משלוח ממסך ההזמנות או מפירוט הזמנה."
            />
          ) : (
            documents.map((doc) => {
              const view = views.find((v) => v.order.id === doc.orderId);
              return (
                <Card key={doc.id} className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-bold text-heading">
                        {view?.customerName ?? "הזמנה שנמחקה"}
                      </span>
                      <DocumentStatusChip document={doc} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                      {view ? ` · אספקה ${formatDate(view.order.date)} · ${formatPrice(view.total)}` : ""}
                    </div>
                    {doc.error ? (
                      <div className="mt-1 text-[11.5px] text-destructive">{doc.error}</div>
                    ) : null}
                  </div>
                  {view ? (
                    <Link
                      to="/admin/orders/$orderId"
                      params={{ orderId: doc.orderId }}
                      className="shrink-0 text-[12.5px] font-semibold text-primary no-underline"
                    >
                      להזמנה
                    </Link>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </Section>
    </AdminShell>
  );
}
