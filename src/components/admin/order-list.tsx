import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { Card } from "@/components/app/card";
import { StatusChip } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import type { AdminOrderView } from "@/lib/admin/selectors";
import { formatPrice } from "@/lib/format";

/** רשימת הזמנות: כרטיסים במובייל, טבלה בדסקטופ. */
export function AdminOrderList({ views }: { views: AdminOrderView[] }) {
  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {views.map((v) => (
          <OrderRowCard key={v.order.id} view={v} />
        ))}
      </div>
      <div className="hidden md:block">
        <OrdersTable views={views} />
      </div>
    </>
  );
}

function OrderRowCard({ view }: { view: AdminOrderView }) {
  return (
    <Link
      to="/admin/orders/$orderId"
      params={{ orderId: view.order.id }}
      className="no-underline"
    >
      <Card className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-bold text-heading">{view.customerName}</span>
            <StatusChip status={view.order.status} />
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">
            {roundLabel(view.order.round)} · {view.itemsCount} פריטים · {formatPrice(view.total)}
          </div>
        </div>
        <ChevronLeft className="size-4 shrink-0 text-primary" />
      </Card>
    </Link>
  );
}

function OrdersTable({ views }: { views: AdminOrderView[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      <table className="w-full text-right text-[13px]">
        <thead>
          <tr className="border-b border-border bg-card-muted text-[11.5px] text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold">לקוח</th>
            <th className="px-4 py-2.5 font-semibold">סבב</th>
            <th className="px-4 py-2.5 font-semibold">פריטים</th>
            <th className="px-4 py-2.5 font-semibold">סה״כ</th>
            <th className="px-4 py-2.5 font-semibold">סטטוס</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {views.map((v) => (
            <tr key={v.order.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-semibold text-heading">{v.customerName}</td>
              <td className="px-4 py-3 text-muted-foreground">{roundLabel(v.order.round)}</td>
              <td className="px-4 py-3 text-muted-foreground">{v.itemsCount}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{formatPrice(v.total)}</td>
              <td className="px-4 py-3">
                <StatusChip status={v.order.status} />
              </td>
              <td className="px-4 py-3 text-left">
                <Link
                  to="/admin/orders/$orderId"
                  params={{ orderId: v.order.id }}
                  className="text-[12.5px] font-semibold text-primary no-underline"
                >
                  פירוט
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
