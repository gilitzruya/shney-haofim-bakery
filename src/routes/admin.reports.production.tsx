import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { BakingSheet } from "@/components/admin/baking-sheet";
import { ReportDateNav } from "@/components/admin/report-date-nav";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { FilterChips } from "@/components/app/tabs";
import { DEPARTMENTS, ROUNDS, roundLabel, type DepartmentId, type RoundId } from "@/data/catalog";
import { useAdminOrdersForDateWithRecurring } from "@/hooks/use-recurring";
import { tomorrowIso } from "@/lib/admin/dates";
import { buildDepartmentReports, isFriday, type ProductionGroup } from "@/lib/admin/reports";
import { formatDate, formatQty, formatWeekday, unitLabel } from "@/lib/format";

export const Route = createFileRoute("/admin/reports/production")({
  head: () => ({
    meta: [
      { title: "דוח ייצור ואפייה — ניהול המאפייה" },
      { name: "description", content: "כמויות הייצור הנדרשות ליום האספקה, לפי מחלקה, מוצר וסבב." },
      { property: "og:title", content: "דוח ייצור ואפייה — ניהול המאפייה" },
      { property: "og:description", content: "כמויות הייצור הנדרשות ליום האספקה, לפי מחלקה, מוצר וסבב." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductionReportPage,
});

type RoundFilter = RoundId | "all";
type DepartmentFilter = Exclude<DepartmentId, "none"> | "all";

const DEPARTMENT_CHIPS: Array<{ id: DepartmentFilter; label: string }> = [
  { id: "all", label: "כל המחלקות" },
  ...DEPARTMENTS.flatMap((d) => (d.id === "none" ? [] : [{ id: d.id, label: d.label }])),
];

function ProductionReportPage() {
  const [date, setDate] = useState(() => tomorrowIso());
  const [round, setRound] = useState<RoundFilter>("all");
  const [department, setDepartment] = useState<DepartmentFilter>("all");

  const { views, isLoading } = useAdminOrdersForDateWithRecurring(date);
  const hydrated = !isLoading;
  const filtered = useMemo(
    () => views.filter((v) => round === "all" || v.order.round === round),
    [views, round],
  );
  // דף לכל מחלקה; רק מוצרים שהוזמנו, ורק מחלקות שיש בהן מה לייצר.
  const reports = useMemo(
    () => buildDepartmentReports(filtered).filter((r) => department === "all" || r.department === department),
    [filtered, department],
  );
  const productsCount = reports.reduce(
    (sum, r) => sum + r.groups.reduce((s, g) => s + g.rows.length, 0),
    0,
  );

  return (
    <AdminShell>
      <BakingSheet date={date} reports={reports} round={round} />
      <Section className="pt-6 pb-10 print:hidden">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[19px] font-bold text-heading">דוח ייצור ואפייה</h1>
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
        <div className="mt-2 print:hidden">
          <FilterChips<DepartmentFilter> chips={DEPARTMENT_CHIPS} value={department} onChange={setDepartment} />
        </div>
        {isFriday(date) && round === "all" ? (
          <div className="mt-2 px-1 text-[11.5px] text-muted-foreground">
            יום שישי: בהדפסה כל סבב מודפס בדף נפרד.
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-card-muted px-3.5 py-2.5 text-[12px] text-muted-foreground">
          <span>
            {formatWeekday(date)}, {formatDate(date)} · {filtered.length} הזמנות
          </span>
          <span className="font-bold text-heading">{productsCount} מוצרים</span>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {!hydrated ? null : reports.length === 0 ? (
            <EmptyState title="אין ייצור ליום זה" description="לא נמצאו הזמנות פעילות לתאריך שנבחר." />
          ) : (
            reports.map((report) => (
              <div key={report.department} className="flex flex-col gap-3">
                <h2 className="px-1 text-[15px] font-bold text-heading">{report.title}</h2>
                {report.groups.map((group) => (
                  <CategoryCard key={group.categoryId} group={group} round={round} />
                ))}
              </div>
            ))
          )}
        </div>
      </Section>
    </AdminShell>
  );
}

function CategoryCard({ group, round }: { group: ProductionGroup; round: RoundFilter }) {
  return (
    <section
      key={group.categoryId}
      className="overflow-hidden rounded-[16px] border border-border bg-card"
    >
      <h3 className="border-b border-border bg-card-muted px-3.5 py-2.5 text-[13.5px] font-bold text-heading">
        {group.categoryName}
      </h3>
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
  );
}
