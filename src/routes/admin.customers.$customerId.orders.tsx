import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOrderList } from "@/components/admin/order-list";
import { Section } from "@/components/app/app-shell";
import { Card, EmptyState } from "@/components/app/card";
import { useCustomer } from "@/hooks/use-customers";
import { useCustomerOrders } from "@/hooks/use-orders";
import { useDocuments } from "@/hooks/use-documents";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/customers/$customerId/orders")({
  head: () => ({
    meta: [
      { title: "הזמנות הלקוח — ניהול המאפייה" },
      { name: "description", content: "כל ההזמנות של הלקוח, לפי תאריך אספקה, עם סכומים וכמויות." },
      { property: "og:title", content: "הזמנות הלקוח — ניהול המאפייה" },
      { property: "og:description", content: "רשימת כל ההזמנות של הלקוח במאפיית שני האופים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerOrdersPage,
});

function CustomerOrdersPage() {
  const { customerId } = useParams({ from: "/admin/customers/$customerId/orders" });
  const { documents } = useDocuments();
  const { customer } = useCustomer(customerId);
  const { views, isLoading } = useCustomerOrders(customerId);
  const hydrated = !isLoading;

  const total = views.reduce((sum, v) => sum + v.total, 0);
  const latestDocFor = (orderId: string) =>
    documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  return (
    <AdminShell>
      <Section className="pt-5 pb-10">
        <Link
          to="/admin/customers/$customerId"
          params={{ customerId }}
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary no-underline"
        >
          <ChevronRight className="size-4" />
          חזרה לכרטיס הלקוח
        </Link>

        <h1 className="mb-1 text-[19px] font-bold text-heading">
          הזמנות {customer?.name ?? "הלקוח"}
        </h1>
        <p className="mb-4 text-[12.5px] text-muted-foreground">כל ההזמנות של הלקוח, מהחדשה לישנה.</p>

        {views.length ? (
          <>
            <Card className="mb-3 flex items-center justify-between">
              <div className="text-[12.5px] font-semibold text-muted-foreground">
                {views.length} הזמנות
              </div>
              <div className="text-[15px] font-bold text-heading">{formatPrice(total)}</div>
            </Card>
            <AdminOrderList views={views} documentFor={latestDocFor} showDate />
          </>
        ) : hydrated ? (
          <EmptyState
            title="אין הזמנות ללקוח"
            description="עדיין לא נרשמו הזמנות עבור לקוח זה."
            action={
              <Link
                to="/admin/customers/$customerId/new-order"
                params={{ customerId }}
                search={{ type: "onetime" as const }}
                className="text-[12.5px] font-semibold text-primary no-underline"
              >
                יצירת הזמנה בשם הלקוח
              </Link>
            }
          />
        ) : null}
      </Section>
    </AdminShell>
  );
}
