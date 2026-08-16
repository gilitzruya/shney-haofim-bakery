import { Link } from "@tanstack/react-router";

import type { DaySummary } from "@/lib/admin/selectors";
import { formatDate, formatWeekday } from "@/lib/format";

/** "₪8,740" — סכום קצר לתצוגת סיכום. */
function formatShortPrice(value: number): string {
  const rounded = Math.round(value);
  return `₪${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** סיכום תפעולי גדול וברור של יום האספקה הקרוב. */
export function TomorrowSummaryCard({ summary }: { summary: DaySummary }) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_16px_36px_-22px_rgba(74,31,45,0.45)] md:p-5">
      <h2 className="text-[21px] leading-tight font-bold text-primary md:text-[24px]">הזמנות למחר</h2>
      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
        {formatWeekday(summary.date)}, {formatDate(summary.date)}
      </div>

      <div className="mt-3.5 flex items-stretch justify-between gap-1">
        <Metric value={formatShortPrice(summary.total)} label="סכום כולל" />
        <Divider />
        <Metric value={String(summary.itemsCount)} label='יח\'/ק״ג' />
        <Divider />
        <Metric value={String(summary.ordersCount)} label="הזמנות" />
      </div>

      <Link
        to="/admin/orders"
        className="mt-4 flex items-center justify-center rounded-[14px] bg-primary px-4 py-3 text-[14px] font-bold text-primary-foreground no-underline"
      >
        פירוט הזמנות
      </Link>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="w-px shrink-0 self-stretch bg-border" />;
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="truncate text-[15.5px] font-bold text-primary md:text-[19px]">{value}</div>
      <div className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
