import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, Package, Receipt, ShoppingBasket } from "lucide-react";

import type { DaySummary } from "@/lib/admin/selectors";
import { formatDate, formatPrice, formatWeekday } from "@/lib/format";

/** סיכום תפעולי גדול וברור של יום האספקה הקרוב, כולל מעבר לפירוט ההזמנות. */
export function TomorrowSummaryCard({ summary }: { summary: DaySummary }) {
  return (
    <div className="overflow-hidden rounded-[26px] bg-primary shadow-[0_18px_40px_-18px_rgba(74,31,45,0.55)]">
      <div className="p-5 md:p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-canvas text-primary md:size-[62px]">
            <CalendarDays className="size-7 md:size-8" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-primary-foreground/80">אספקה מחר</div>
            <div className="text-[20px] leading-tight font-bold text-primary-foreground md:text-[26px]">
              {formatWeekday(summary.date)}, {formatDate(summary.date)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Metric icon={<Receipt className="size-[15px]" />} label="הזמנות" value={String(summary.ordersCount)} />
          <Metric icon={<ShoppingBasket className="size-[15px]" />} label="פריטים" value={String(summary.itemsCount)} />
          <Metric icon={<Package className="size-[15px]" />} label="סה״כ" value={formatPrice(summary.total)} />
        </div>
      </div>

      <Link
        to="/admin/orders"
        className="flex items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] px-5 py-3.5 no-underline md:px-7"
      >
        <span className="min-w-0">
          <span className="block text-[14.5px] font-bold text-primary-foreground">פירוט הזמנות</span>
          <span className="block text-[11.5px] text-primary-foreground/75">כל ההזמנות לאספקה של מחר</span>
        </span>
        <ChevronLeft className="size-4 shrink-0 text-primary-foreground/80" />
      </Link>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-canvas px-2.5 py-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[17px] font-bold text-heading md:text-[20px]">{value}</div>
    </div>
  );
}
