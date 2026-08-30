import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { StatusChip } from "@/components/app/status-chip";
import { Tabs } from "@/components/app/tabs";
import { useMyOrders } from "@/hooks/use-orders";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "ההזמנות שלי — מאפיית שני האופים" },
      { name: "description", content: "מעקב אחרי הזמנות פתוחות, מאושרות והיסטוריית אספקות." },
      { property: "og:title", content: "ההזמנות שלי — מאפיית שני האופים" },
      { property: "og:description", content: "כל ההזמנות הקרובות וההיסטוריה במקום אחד." },
    ],
  }),
  component: OrdersPage,
});

type TabId = "open" | "history";

function OrdersPage() {
  const { orders } = useMyOrders();
  const [tab, setTab] = useState<TabId>("open");

  const list = orders
    .filter((o) => (tab === "open" ? o.status === "draft" || o.status === "approved" : o.status === "completed" || o.status === "cancelled"))
    .sort((a, b) => {
      if (tab === "open") {
        // טיוטות בלי תאריך (עגלה שטרם מולאה) קודם, ואז לפי תאריך עולה.
        if (!a.date && !b.date) return 0;
        if (!a.date) return -1;
        if (!b.date) return 1;
        return a.date.localeCompare(b.date);
      }
      return (b.date ?? "").localeCompare(a.date ?? "");
    });

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="ההזמנות שלי" backTo="/" />
      </AppHeader>
      <Section className="pb-10">
        <Tabs
          tabs={[
            { id: "open", label: "הזמנות פתוחות" },
            { id: "history", label: "היסטוריה" },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div className="mt-3.5 flex flex-col gap-2.5">
          {list.length === 0 ? (
            <EmptyState
              title={tab === "open" ? "אין הזמנות פתוחות" : "אין הזמנות בהיסטוריה"}
              description={tab === "open" ? "אפשר להתחיל הזמנה חדשה בכל רגע." : undefined}
              action={
                tab === "open" ? (
                  <Link to="/catalog" className="no-underline">
                    <Button>הזמנה חדשה</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            list.map((order) => {
              const total = order.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
              return (
                <Link key={order.id} to="/orders/$orderId" params={{ orderId: order.id }} className="no-underline">
                  <Card variant={order.status === "completed" || order.status === "cancelled" ? "muted" : "active"}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground">
                        {order.date ? formatDate(order.date) : "טיוטה — טרם נבחר תאריך"}
                      </span>
                      <StatusChip status={order.status} />
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">{order.lines.length} מוצרים</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11.5px] text-muted-foreground">
                        {order.source === "recurring" ? "נוצרה מהזמנה קבועה" : order.source === "admin" ? "נוצרה על ידי המאפייה" : "הזמנה ידנית"}
                      </span>
                      <span className="text-[13.5px] font-bold text-foreground">{formatPrice(total)}</span>
                    </div>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </Section>
    </AppShell>
  );
}
