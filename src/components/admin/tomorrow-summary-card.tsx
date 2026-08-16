import { CalendarDays, Package, Receipt, ShoppingBasket } from "lucide-react";

import type { DaySummary } from "@/lib/admin/selectors";
import { formatDate, formatPrice, formatWeekday } from "@/lib/format";

/** סיכום תפעולי גדול וברור של יום האספקה הקרוב. */
export function TomorrowSummaryCard({ summary }: { summary: DaySummary }) {
  return (
    <div className="rounded-[26px] bg-primary p-5 shadow-[0_18px_40px_-18px_rgba(74,31,45,0.55)] md:p-7">
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
