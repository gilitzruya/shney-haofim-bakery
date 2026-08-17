import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminOrderList } from "@/components/admin/order-list";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportDateNav } from "@/components/admin/report-date-nav";
import { Button } from "@/components/app/button";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { ROUNDS, roundLabel } from "@/data/catalog";
import { useAdminOrdersForDate } from "@/hooks/use-admin-orders";
import { tomorrowIso } from "@/lib/admin/dates";
import { summarizeDay } from "@/lib/admin/selectors";
import { formatLongDate, formatPrice } from "@/lib/format";
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

function AdminOrdersPage() {
  const { hydrated, documents, issueDocuments } = useStore();
  const [issuing, setIssuing] = useState(false);
  const [date, setDate] = useState(() => tomorrowIso());
  const [query, setQuery] = useState("");

  const views = useAdminOrdersForDate(date);
  const filtered = useMemo(
    () => views.filter((v) => query.trim() === "" || v.customerName.includes(query.trim())),
    [views, query],
  );
  const summary = summarizeDay(filtered, date);

  const groups = useMemo(
    () =>
      ROUNDS.map((r) => ({
        id: r.id,
        views: filtered.filter((v) => v.order.round === r.id),
      })).filter((g) => g.views.length > 0),
    [filtered],
  );

  const latestDocFor = (orderId: string) =>
    documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  /** הפקה לכל הזמנות היום שאין להן עדיין תעודת משלוח */
  const pendingIds = filtered
    .filter((v) => !latestDocFor(v.order.id))
    .map((v) => v.order.id);

  const issueTargets = async () => {
    if (pendingIds.length === 0) return;
    setIssuing(true);
    try {
      await issueDocuments(pendingIds);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <AdminShell>
      <Section className="pt-5 pb-28">
        <h1 className="mb-3 flex items-center gap-2 text-[20px] font-bold text-heading">
          <ClipboardList className="size-[19px] text-primary" />
          הזמנות
        </h1>

        <ReportDateNav date={date} onChange={setDate} />

        <label className="mt-2.5 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם לקוח"
            aria-label="חיפוש לפי שם לקוח"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" aria-label="ניקוי החיפוש" onClick={() => setQuery("")}>
              <X className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </label>

        <div className="sticky top-[58px] z-10 -mx-3.5 mt-3 bg-canvas/95 px-3.5 py-2 backdrop-blur md:-mx-5 md:px-5">
          <div className="overflow-hidden rounded-[16px] border border-primary/20 bg-primary-soft shadow-sm">
            <div className="flex items-center justify-between border-b border-primary/10 px-3.5 py-2">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
                <CalendarDays className="size-4" />
                {formatLongDate(date)}
              </div>
              <div className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                סיכום יום
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-primary/10 px-1 py-3 text-center">
              <Metric value={hydrated ? String(summary.ordersCount) : "—"} label="הזמנות" />
              <Metric value={hydrated ? String(summary.productsCount) : "—"} label="מוצרים" />
              <Metric value={hydrated ? formatPrice(summary.total) : "—"} label="סה״כ" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-4">
          {!hydrated ? null : groups.length === 0 ? (
            <EmptyState
              title="אין הזמנות ליום זה"
              description="אפשר לעבור ליום אחר או לנקות את החיפוש."
            />
          ) : (
            groups.map((group) => (
              <section key={group.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[15px] font-bold text-heading">{roundLabel(group.id)}</h2>
                  <span className="text-[11.5px] text-muted-foreground">
                    {group.views.length} הזמנות
                  </span>
                </div>
                <AdminOrderList views={group.views} documentFor={latestDocFor} />
              </section>
            ))
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 z-20 bg-canvas/95 px-3.5 pb-3 pt-2 backdrop-blur md:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
          <div className="flex items-center gap-4 rounded-[16px] border border-border bg-card px-3.5 py-2 text-center">
            <div>
              <div className="text-[13px] font-bold text-heading">
                {hydrated ? formatPrice(summary.total) : "—"}
              </div>
              <div className="text-[10.5px] text-muted-foreground">סה״כ</div>
            </div>
            <div>
              <div className="text-[13px] font-bold text-heading">{hydrated ? summary.ordersCount : "—"}</div>
              <div className="text-[10.5px] text-muted-foreground">הזמנות</div>
            </div>
          </div>
          <Button
            className="flex-1"
            onClick={issueTargets}
            loading={issuing}
            disabled={!hydrated || pendingIds.length === 0}
          >
            <FileText className="size-4" />
            {!hydrated
              ? "הפקת תעודות משלוח"
              : pendingIds.length === 0
                ? "כל התעודות הופקו"
                : `הפקת תעודות משלוח (${pendingIds.length})`}
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}


function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1">
      <div className="text-[19px] font-extrabold text-primary md:text-[22px]">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}
