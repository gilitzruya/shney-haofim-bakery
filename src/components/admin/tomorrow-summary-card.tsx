import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useState } from "react";

import type { AdminOrderView, DaySummary } from "@/lib/admin/selectors";
import { formatDate, formatWeekday, formatPrice } from "@/lib/format";

/** "₪8,740" — סכום קצר לתצוגת סיכום. */
function formatShortPrice(value: number): string {
  const rounded = Math.round(value);
  return `₪${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** סיכום תפעולי גדול וברור של יום האספקה הקרוב, עם שלוש הזמנות ראשונות ואקורדיון. */
export function TomorrowSummaryCard({
  summary,
  views,
}: {
  summary: DaySummary;
  views: AdminOrderView[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleOrders = expanded ? views : views.slice(0, 3);

  return (
    <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_16px_36px_-22px_rgba(74,31,45,0.45)] md:p-5">
      <h2 className="text-[21px] leading-tight font-bold text-primary md:text-[24px]">הזמנות למחר</h2>
      <div className="mt-0.5 text-[12.5px] text-black">
        {formatWeekday(summary.date)}, {formatDate(summary.date)}
      </div>

      <div className="mt-3.5 flex items-stretch justify-between gap-1">
        <Metric value={String(summary.ordersCount)} label="הזמנות" />
        <Divider />
        <Metric value={String(summary.productsCount)} label="מוצרים" />
        <Divider />
        <Metric value={formatShortPrice(summary.total)} label="סכום כולל" />
      </div>

      <div className="mt-4">
        {views.length === 0 ? (
          <div className="py-3 text-center text-[12.5px] text-muted-foreground">אין הזמנות למחר</div>
        ) : (
          <div className="flex flex-col">
            {visibleOrders.map((view) => (
              <Link
                key={view.order.id}
                to="/admin/orders/$orderId"
                params={{ orderId: view.order.id }}
                className="flex items-center gap-2 border-b border-dashed border-border py-2.5 no-underline last:border-b-0"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-foreground">{view.customerName}</span>
                </span>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {view.itemsCount} מוצרים
                </span>
                <span className="w-[74px] shrink-0 text-end text-[13px] font-bold text-heading tabular-nums">
                  {formatPrice(view.total)}
                </span>
                <ChevronLeft className="size-4 shrink-0 text-primary" />
              </Link>
            ))}
          </div>
        )}

        {views.length > 3 ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-1 text-[12.5px] font-bold text-primary"
          >
            {expanded ? "הצגה מצומצמת" : `לכל ההזמנות של מחר (${views.length})`}
            <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="w-px shrink-0 self-stretch bg-border" />;
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="truncate text-[19px] font-bold text-black md:text-[24px]">{value}</div>
      <div className="mt-0.5 text-[10.5px] text-primary">{label}</div>
    </div>
  );
}
