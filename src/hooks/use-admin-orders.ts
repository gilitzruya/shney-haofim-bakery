import { useMemo } from "react";

import { ordersForDate, toOrderViews, type AdminOrderView } from "@/lib/admin/selectors";
import { useStore } from "@/store/app-store";

/** כל ההזמנות במערכת הניהול — של הלקוח המחובר ושל שאר הלקוחות. */
export function useAllAdminOrderViews(): AdminOrderView[] {
  const { orders, adminOrders, customers } = useStore();
  return useMemo(
    () => toOrderViews([...orders, ...adminOrders], customers),
    [orders, adminOrders, customers],
  );
}

/** ההזמנות הפעילות לתאריך אספקה מסוים. */
export function useAdminOrdersForDate(iso: string): AdminOrderView[] {
  const { orders, adminOrders, customers } = useStore();
  return useMemo(
    () => toOrderViews(ordersForDate([...orders, ...adminOrders], iso), customers),
    [orders, adminOrders, customers, iso],
  );
}

/** הזמנה בודדת לפי מזהה, כולל פרטי הלקוח. */
export function useAdminOrderView(orderId: string): AdminOrderView | undefined {
  const views = useAllAdminOrderViews();
  return views.find((v) => v.order.id === orderId);
}
