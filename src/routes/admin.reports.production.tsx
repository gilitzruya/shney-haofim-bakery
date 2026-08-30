import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { BakingSheet } from "@/components/admin/baking-sheet";
import { ReportDateNav } from "@/components/admin/report-date-nav";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { FilterChips } from "@/components/app/tabs";
import { ROUNDS, roundLabel, type RoundId } from "@/data/catalog";
import { useAdminOrdersForDateWithRecurring } from "@/hooks/use-recurring";
import { tomorrowIso } from "@/lib/admin/dates";
import { buildProductionReport } from "@/lib/admin/reports";
import { formatDate, formatQty, formatWeekday, unitLabel } from "@/lib/format";

export const Route = createFileRoute("/admin/reports/production")({
  head: () => ({
    meta: [
      { title: "דוח אפייה / ייצור — ניהול המאפייה" },
      { name: "description", content: "כמויות האפייה הנדרשות ליום האספקה, לפי מוצר, קטגוריה וסבב." },
      { property: "og:title", content: "דוח אפייה / ייצור — ניהול המאפייה" },
      { property: "og:description", content: "כמויות האפייה הנדרשות ליום האספקה, לפי מוצר, קטגוריה וסבב." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductionReportPage,
});

type RoundFilter = RoundId | "all";

function ProductionReportPage() {
  const [date, setDate] = useState(() => tomorrowIso());
  const [round, setRound] = useState<RoundFilter>("all");

  const { views, isLoading } = useAdminOrdersForDateWithRecurring(date);
  const hydrated = !isLoading;
  const filtered = useMemo(
    () => views.filter((v) => round === "all" || v.order.round === round),
    [views, round],
  );
  const groups = useMemo(() => buildProductionReport(filtered), [filtered]);
  const productsCount = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <AdminShell>
      <BakingSheet date={date} groups={groups} />
      <Section className="pt-6 pb-10 print:hidden">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[19px] font-bold text-heading">דוח אפייה / ייצור</h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground print:hidden"
          >
            <Printer className="size-3.5" />
            הדפסה / PDF
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
                      key={row.productId}
                      className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-muted">
                          {row.imageUrl ? (
                            <img
                              src={row.imageUrl}
                              alt={row.productName}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">?</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-semibold text-heading">
                            {row.productName}
                          </div>
                          {row.sku ? (
                            <div className="text-[11px] text-muted-foreground">קוד {row.sku}</div>
                          ) : null}
                          {round === "all" ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              {ROUNDS.filter((r) => (row.byRound[r.id] ?? 0) > 0)
                                .map((r) => roundLabel(r.id))
                                .join(" · ")}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <span className="text-[15px] font-bold text-heading">
                          {formatQty(row.qty, row.unit)}
                        </span>
                        <span className="ms-1 text-[11px] text-muted-foreground">{unitLabel(row.unit)}</span>
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
