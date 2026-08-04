import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { StatusChip } from "@/components/app/status-chip";
import { Tabs } from "@/components/app/tabs";
import { roundLabel } from "@/data/catalog";
import { formatDate, formatPrice, linesCount, linesTotal } from "@/lib/format";
import { useStore } from "@/store/app-store";

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
  const { orders } = useStore();
  const [tab, setTab] = useState<TabId>("open");

  const list = orders
    .filter((o) => (tab === "open" ? !o.closed && o.status !== "cancelled" : o.closed || o.status === "cancelled"))
    .sort((a, b) => (tab === "open" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

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
                  <Link to="/new-order" className="no-underline">
                    <Button>הזמנה חדשה</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            list.map((order) => (
              <Link key={order.id} to="/orders/$orderId" params={{ orderId: order.id }} className="no-underline">
                <Card variant={order.closed ? "muted" : "active"}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground">{formatDate(order.date)}</span>
                    <StatusChip status={order.status} />
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {roundLabel(order.round)} · {linesCount(order.lines)} מוצרים
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11.5px] text-muted-foreground">
                      {order.createdFrom === "recurring" ? "נוצרה מהזמנה קבועה" : "הזמנה ידנית"}
                    </span>
                    <span className="text-[13.5px] font-bold text-foreground">
                      {formatPrice(linesTotal(order.lines))}
                    </span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </Section>
    </AppShell>
  );
}
