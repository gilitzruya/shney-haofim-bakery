import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ReportDateNav } from "@/components/admin/report-date-nav";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { FilterChips } from "@/components/app/tabs";
import { ROUNDS, roundLabel, type RoundId } from "@/data/catalog";
import { useAdminOrdersForDate } from "@/hooks/use-admin-orders";
import { tomorrowIso } from "@/lib/admin/dates";
import { buildProductionReport } from "@/lib/admin/reports";
import { formatDate, formatQty, formatWeekday, unitLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";

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
  component: ProductionReportPage,
});

type RoundFilter = RoundId | "all";

function ProductionReportPage() {
  const { hydrated } = useStore();
  const [date, setDate] = useState(() => tomorrowIso());
  const [round, setRound] = useState<RoundFilter>("all");

  const views = useAdminOrdersForDate(date);
  const filtered = useMemo(
    () => views.filter((v) => round === "all" || v.order.round === round),
    [views, round],
  );
  const groups = useMemo(() => buildProductionReport(filtered), [filtered]);
  const productsCount = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[19px] font-bold text-heading">דוח ייצור</h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground print:hidden"
          >
            <Printer className="size-3.5" />
            הדפסה
          </button>
        </div>

        <ReportDateNav date={date} onChange={setDate} />

        <div className="mt-3 print:hidden">
          <FilterChips<RoundFilter>
            chips={[{ id: "all", label: "כל הסבבים" }, ...ROUNDS.map((r) => ({ id: r.id, label: r.label }))]}
            value={round}
            onChange={setRound}
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-card-muted px-3.5 py-2.5 text-[12px] text-muted-foreground">
          <span>
            {formatWeekday(date)}, {formatDate(date)} · {filtered.length} הזמנות
          </span>
          <span className="font-bold text-heading">{productsCount} מוצרים</span>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {!hydrated ? null : groups.length === 0 ? (
            <EmptyState title="אין ייצור ליום זה" description="לא נמצאו הזמנות פעילות לתאריך שנבחר." />
          ) : (
            groups.map((group) => (
              <section
                key={group.categoryId}
                className="overflow-hidden rounded-[16px] border border-border bg-card"
              >
                <h2 className="border-b border-border bg-card-muted px-3.5 py-2.5 text-[13.5px] font-bold text-heading">
                  {group.categoryName}
                </h2>
                <ul className="flex flex-col">
                  {group.rows.map((row) => (
                    <li
                      key={row.product.id}
                      className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-heading">
                          {row.product.name}
                        </div>
                        {round === "all" ? (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {ROUNDS.filter((r) => (row.byRound[r.id] ?? 0) > 0)
                              .map((r) => `${roundLabel(r.id)}: ${formatQty(row.byRound[r.id] ?? 0, row.product.unit)}`)
                              .join(" · ")}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-left">
                        <span className="text-[15px] font-bold text-heading">
                          {formatQty(row.qty, row.product.unit)}
                        </span>
                        <span className="ms-1 text-[11px] text-muted-foreground">
                          {unitLabel(row.product.unit)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </Section>
    </AdminShell>
  );
}
