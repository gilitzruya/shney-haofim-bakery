import type { Customer } from "@/data/admin-seed";
import { SELF_CUSTOMER_ID } from "@/data/admin-seed";
import type { Order } from "@/data/seed";
import { linesCount } from "@/lib/format";
import { linesTotalFor } from "@/lib/admin/pricing";

export interface AdminOrderView {
  order: Order;
  customer: Customer | undefined;
  customerName: string;
  itemsCount: number;
  total: number;
}

/** הזמנות שרלוונטיות לתצוגת המאפייה (מסננת טיוטות והזמנות מבוטלות). */
export function activeOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status !== "cancelled" && o.status !== "draft");
}

export function ordersForDate(orders: Order[], iso: string): Order[] {
  return activeOrders(orders).filter((o) => o.date === iso);
}

export function toOrderViews(orders: Order[], customers: Customer[]): AdminOrderView[] {
  return orders.map((o) => {
    const customer = customers.find((c) => c.id === (o.customerId ?? SELF_CUSTOMER_ID));
    return {
      order: o,
      customer,
      customerName: customer?.name ?? "לקוח לא ידוע",
      itemsCount: linesCount(o.lines),
      total: linesTotal(o.lines),
    };
  });
}

export interface DaySummary {
  date: string;
  ordersCount: number;
  itemsCount: number;
  total: number;
}

export function summarizeDay(views: AdminOrderView[], date: string): DaySummary {
  return {
    date,
    ordersCount: views.length,
    itemsCount: views.reduce((sum, v) => sum + v.itemsCount, 0),
    total: views.reduce((sum, v) => sum + v.total, 0),
  };
}
