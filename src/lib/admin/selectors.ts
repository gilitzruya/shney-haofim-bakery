import type { AdminOrderView } from "@/hooks/use-orders";

export interface DaySummary {
  date: string;
  ordersCount: number;
  productsCount: number;
  total: number;
}

export function summarizeDay(views: AdminOrderView[], date: string): DaySummary {
  const productIds = new Set(views.flatMap((v) => v.order.lines.map((l) => l.productId)));
  return {
    date,
    ordersCount: views.length,
    productsCount: productIds.size,
    total: views.reduce((sum, v) => sum + v.total, 0),
  };
}
