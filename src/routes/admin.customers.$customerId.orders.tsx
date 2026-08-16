import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOrderList } from "@/components/admin/order-list";
import { Section } from "@/components/app/app-shell";
import { Card, EmptyState } from "@/components/app/card";
import { SELF_CUSTOMER_ID } from "@/data/admin-seed";
import { useAllAdminOrderViews } from "@/hooks/use-admin-orders";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/store/app-store";

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
  const { customers, hydrated, documents } = useStore();
  const customer = customers.find((c) => c.id === customerId);
  const allViews = useAllAdminOrderViews();

  const views = allViews
    .filter((v) => (v.order.customerId ?? SELF_CUSTOMER_ID) === customerId)
    .filter((v) => v.order.status !== "draft")
    .sort((a, b) => b.order.date.localeCompare(a.order.date));

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
            <AdminOrderList views={views} documentFor={latestDocFor} />
          </>
        ) : hydrated ? (
          <EmptyState
            title="אין הזמנות ללקוח"
            description="עדיין לא נרשמו הזמנות עבור לקוח זה."
            action={
              <Link
                to="/admin/customers/$customerId/new-order"
                params={{ customerId }}
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
