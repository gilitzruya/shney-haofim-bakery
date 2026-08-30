import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PackingSheet } from "@/components/admin/packing-sheet";
import { ReportDateNav } from "@/components/admin/report-date-nav";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { roundLabel } from "@/data/catalog";
import { useAdminOrdersForDateWithRecurring } from "@/hooks/use-recurring";
import { tomorrowIso } from "@/lib/admin/dates";
import { buildDistributionReport } from "@/lib/admin/reports";
import { formatDate, formatPhone, formatPrice, formatQty, formatWeekday } from "@/lib/format";

export const Route = createFileRoute("/admin/reports/distribution")({
  head: () => ({
    meta: [
      { title: "דוח חלוקה — ניהול המאפייה" },
      { name: "description", content: "פירוט האריזה והחלוקה לפי סבב ולקוח." },
      { property: "og:title", content: "דוח חלוקה — ניהול המאפייה" },
      { property: "og:description", content: "פירוט האריזה והחלוקה לפי סבב ולקוח." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DistributionReportPage,
});

function DistributionReportPage() {
  const [date, setDate] = useState(() => tomorrowIso());

  const { views, isLoading } = useAdminOrdersForDateWithRecurring(date);
  const hydrated = !isLoading;
  const groups = useMemo(() => buildDistributionReport(views), [views]);
  const stopsCount = groups.reduce((sum, g) => sum + g.stops.length, 0);

  return (
    <AdminShell>
      <PackingSheet date={date} groups={groups} />
      <Section className="pt-6 pb-10 print:hidden">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[19px] font-bold text-heading">דוח חלוקה</h1>
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

        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-card-muted px-3.5 py-2.5 text-[12px] text-muted-foreground">
          <span>
            {formatWeekday(date)}, {formatDate(date)}
          </span>
          <span className="font-bold text-heading">{stopsCount} תחנות חלוקה</span>
        </div>

        <div className="mt-3 flex flex-col gap-4">
          {!hydrated ? null : groups.length === 0 ? (
            <EmptyState title="אין חלוקה ליום זה" description="לא נמצאו הזמנות פעילות לתאריך שנבחר." />
          ) : (
            groups.map((group) => (
              <section key={group.round} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[15px] font-bold text-heading">{roundLabel(group.round)}</h2>
                  <span className="text-[11.5px] text-muted-foreground">
                    {group.stops.length} תחנות · {formatPrice(group.total)}
                  </span>
                </div>

                {group.stops.map((stop) => (
                  <article
                    key={stop.view.order.id}
                    className="overflow-hidden rounded-[16px] border border-border bg-card"
                  >
                    <div className="border-b border-border px-3.5 py-2.5">
                      <Link
                        to="/admin/orders/$orderId"
                        params={{ orderId: stop.view.order.id }}
                        className="text-[14px] font-bold text-heading no-underline"
                      >
                        {stop.view.customerName}
                      </Link>
                      {stop.view.customerAddress || stop.view.customerPhone ? (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                          {stop.view.customerAddress ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5" />
                              {stop.view.customerAddress}
                            </span>
                          ) : null}
                          {stop.view.customerPhone ? (
                            <a
                              href={`tel:${stop.view.customerPhone}`}
                              className="flex items-center gap-1 text-muted-foreground no-underline"
                            >
                              <Phone className="size-3.5" />
                              {formatPhone(stop.view.customerPhone)}
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <ul className="flex flex-col">
                      {stop.lines.map((line) => (
                        <li
                          key={line.productId}
                          className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2 last:border-b-0"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-muted">
                              {line.imageUrl ? (
                                <img
                                  src={line.imageUrl}
                                  alt={line.productName}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-muted-foreground">?</span>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-[13px] text-foreground">{line.productName}</span>
                              {line.sku ? (
                                <span className="text-[11px] text-muted-foreground">קוד {line.sku}</span>
                              ) : null}
                            </div>
                          </div>
                          <span className="shrink-0 text-[13.5px] font-bold text-heading">
                            {formatQty(line.qty, line.unit)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between bg-card-muted px-3.5 py-2 text-[11.5px] text-muted-foreground">
                      <span>{stop.lines.length} פריטים</span>
                      <span className="font-bold text-heading">{formatPrice(stop.view.total)}</span>
                    </div>
                  </article>
                ))}
              </section>
            ))
          )}
        </div>
      </Section>
    </AdminShell>
  );
}
