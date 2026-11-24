import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { DocumentStatusChip } from "@/components/admin/document-status-chip";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { orderDate, useOrdersByIds } from "@/hooks/use-orders";
import { useDocuments, usePrintDocuments } from "@/hooks/use-documents";
import { ACCOUNTING_PROVIDER_NAME, DOCUMENT_TYPE_LABELS } from "@/lib/admin/accounting";
import { errorMessage } from "@/lib/error-message";
import { formatDate, formatPrice, orderNumberLabel } from "@/lib/format";

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
  const { documents, isLoading: documentsLoading } = useDocuments();
  const { viewsById, isLoading } = useOrdersByIds(documents.map((d) => d.orderId));
  const printDocuments = usePrintDocuments();

  // הדפסה מרוכזת: רק תעודה שהופקה ויש לה קובץ בריווחית ניתנת לסימון. סדר הדפים = סדר היומן.
  const printable = documents.filter((d) => d.status === "issued" && d.link);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const chosen = printable.filter((d) => selected.has(d.id));
  const allSelected = printable.length > 0 && chosen.length === printable.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const printChosen = () => {
    printDocuments
      .print(chosen.map((d) => d.id))
      .then(() => setSelected(new Set()))
      .catch((err: unknown) => toast.error(errorMessage(err, "הכנת קובץ ההדפסה נכשלה")));
  };

  return (
    <AdminShell>
      <Section className="pt-6 pb-28">
        <h1 className="mb-3 text-[19px] font-bold text-heading">יומן מסמכים</h1>

        <Card className="bg-card-muted">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-heading">חיבור להנהלת חשבונות</span>
            <span className="text-[11.5px] text-muted-foreground">מחובר</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            {ACCOUNTING_PROVIDER_NAME} — תעודות המשלוח מופקות ישירות בריווחית, כולל מחירים.
          </p>
        </Card>

        {printable.length > 0 ? (
          <div className="mt-3 flex items-center justify-between px-1 text-[12px]">
            <span className="font-semibold text-heading">
              {chosen.length > 0 ? `נבחרו ${chosen.length} תעודות להדפסה` : "סמנו תעודות להדפסה מרוכזת"}
            </span>
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(printable.map((d) => d.id)))}
              className="font-bold text-primary"
            >
              {allSelected ? "ניקוי הסימון" : "סימון הכול"}
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-2">
          {documentsLoading || isLoading ? null : documents.length === 0 ? (
            <EmptyState
              title="לא הופקו מסמכים"
              description="אפשר להפיק תעודת משלוח ממסך ההזמנות או מפירוט הזמנה."
            />
          ) : (
            documents.map((doc) => {
              const view = viewsById.get(doc.orderId);
              return (
                <Card key={doc.id} className="flex items-center gap-2.5">
                  {doc.status === "issued" && doc.link ? (
                    <input
                      type="checkbox"
                      aria-label={`סימון ${DOCUMENT_TYPE_LABELS[doc.type]} ${doc.number ?? ""} להדפסה`}
                      checked={selected.has(doc.id)}
                      onChange={() => toggle(doc.id)}
                      className="size-4 shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-bold text-heading">
                        {view?.customerName ?? "הזמנה שנמחקה"}
                      </span>
                      <DocumentStatusChip document={doc} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                      {view ? ` · ${orderNumberLabel(view.order.number)}` : ""}
                      {view ? ` · אספקה ${formatDate(orderDate(view.order))} · ${formatPrice(view.total)}` : ""}
                    </div>
                    {doc.error ? (
                      <div className="mt-1 text-[11.5px] text-destructive">{doc.error}</div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {doc.link ? (
                      <a
                        href={doc.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12.5px] font-semibold text-primary no-underline"
                      >
                        צפייה בתעודה
                      </a>
                    ) : null}
                    {view ? (
                      <Link
                        to="/admin/orders/$orderId"
                        params={{ orderId: doc.orderId }}
                        className="text-[12.5px] font-semibold text-primary no-underline"
                      >
                        להזמנה
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Section>

      {chosen.length > 0 ? (
        <div className="sticky bottom-0 z-20 bg-canvas/95 px-3.5 pb-3 pt-2 backdrop-blur md:px-5">
          <div className="mx-auto flex w-full max-w-5xl md:justify-center">
            <Button
              className="flex-1 md:flex-initial md:w-auto"
              onClick={printChosen}
              loading={printDocuments.isPending}
            >
              <Printer className="size-4" />
              {chosen.length === 1 ? "הדפסת התעודה המסומנת" : `הדפסת ${chosen.length} התעודות המסומנות`}
            </Button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
