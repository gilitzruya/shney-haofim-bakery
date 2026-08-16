import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminOrderList } from "@/components/admin/order-list";
import { BatchDocumentsBar } from "@/components/admin/batch-documents-bar";
import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { FilterChips } from "@/components/app/tabs";
import { useAdminOrdersForDate, useAllAdminOrderViews } from "@/hooks/use-admin-orders";
import { tomorrowIso } from "@/lib/admin/dates";
import { activeOrders, summarizeDay } from "@/lib/admin/selectors";
import { formatDate, formatPrice, formatWeekday, parseDate, toIso } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/orders/")({
  head: () => ({
    meta: [
      { title: "הזמנות מחר — ניהול המאפייה" },
      { name: "description", content: "רשימת ההזמנות לאספקה של מחר, כולל פירוט לקוח וסבב." },
      { property: "og:title", content: "הזמנות מחר — ניהול המאפייה" },
      { property: "og:description", content: "רשימת ההזמנות לאספקה של מחר במאפיית שני האופים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrdersPage,
});

type DateFilter = "tomorrow" | "all";

function shiftIso(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

function AdminOrdersPage() {
  const { hydrated, documents, issueDocuments } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [date, setDate] = useState(() => tomorrowIso());
  const [dateFilter, setDateFilter] = useState<DateFilter>("tomorrow");

  const dateViews = useAdminOrdersForDate(date);
  const allViews = useAllAdminOrderViews();
  const allActiveViews = useMemo(
    () => allViews.filter((v) => activeOrders([v.order]).length > 0),
    [allViews],
  );
  const views = dateFilter === "tomorrow" ? dateViews : allActiveViews;
  const summary =
    dateFilter === "tomorrow"
      ? summarizeDay(views, date)
      : {
          date: "all",
          ordersCount: views.length,
          productsCount: new Set(views.flatMap((v) => v.order.lines.map((l) => l.productId))).size,
          total: views.reduce((sum, v) => sum + v.total, 0),
        };

  const latestDocFor = (orderId: string) =>
    documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  const toggle = (orderId: string) =>
    setSelected((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );

  const issueSelected = async () => {
    setIssuing(true);
    try {
      await issueDocuments(selected);
      setSelected([]);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <h1 className="mb-3 text-[19px] font-bold text-heading">הזמנות לאספקה</h1>

        {dateFilter === "tomorrow" ? (
          <div className="flex items-center justify-between gap-2 rounded-[14px] border border-border bg-card px-2 py-2">
            <button
              type="button"
              aria-label="יום קודם"
              onClick={() => setDate((d) => shiftIso(d, -1))}
              className="flex size-8 items-center justify-center rounded-[10px] border border-border text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="text-center">
              <div className="text-[13.5px] font-bold text-heading">
                {formatWeekday(date)}, {formatDate(date)}
              </div>
              <button
                type="button"
                onClick={() => setDate(tomorrowIso())}
                className="text-[11px] font-semibold text-primary"
              >
                חזרה למחר
              </button>
            </div>
            <button
              type="button"
              aria-label="יום הבא"
              onClick={() => setDate((d) => shiftIso(d, 1))}
              className="flex size-8 items-center justify-center rounded-[10px] border border-border text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-[14px] border border-border bg-card px-2 py-3 text-[13.5px] font-bold text-heading">
            כל התאריכים
          </div>
        )}

        <div className="mt-3">
          <FilterChips<DateFilter>
            chips={[
              { id: "tomorrow", label: "הזמנות למחר" },
              { id: "all", label: "כל ההזמנות" },
            ]}
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value);
              if (value === "tomorrow") setDate(tomorrowIso());
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-card-muted px-3.5 py-2.5 text-[12px] text-muted-foreground">
          <span>
            {hydrated ? `${summary.ordersCount} הזמנות · ${summary.productsCount} מוצרים` : "טוען…"}
          </span>
          <span className="font-bold text-heading">{hydrated ? formatPrice(summary.total) : ""}</span>
        </div>

        <div className="mt-3">
          {!hydrated ? null : views.length === 0 ? (
            <EmptyState
              title={dateFilter === "tomorrow" ? "אין הזמנות ליום זה" : "אין הזמנות במערכת"}
              description={
                dateFilter === "tomorrow"
                  ? "אפשר לעבור ליום אחר או לבחור 'כל ההזמנות'."
                  : "כל ההזמנות יופיעו כאן כשיתקבלו."
              }
            />
          ) : (
            <AdminOrderList
              views={views}
              selection={{ selected, onToggle: toggle }}
              documentFor={latestDocFor}
            />
          )}
        </div>

        <BatchDocumentsBar
          count={selected.length}
          busy={issuing}
          onIssue={issueSelected}
          onClear={() => setSelected([])}
        />
      </Section>
    </AdminShell>
  );
}
