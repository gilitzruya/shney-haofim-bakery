import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Modal } from "@/components/app/modal";
import { StatusChip } from "@/components/app/status-chip";
import { findProduct, roundLabel } from "@/data/catalog";
import { formatLongDate, formatPrice, formatQty, linesTotal } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "פרטי הזמנה — מאפיית שני האופים" },
      { name: "description", content: "פירוט מלא של ההזמנה: מוצרים, כמויות, מועד אספקה וסטטוס." },
      { property: "og:title", content: "פרטי הזמנה — מאפיית שני האופים" },
      { property: "og:description", content: "צפייה, עריכה וביטול של הזמנה קיימת." },
    ],
  }),
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { orderId } = useParams({ from: "/orders/$orderId" });
  const navigate = useNavigate();
  const { getOrder, editOrder, cancelOrder, copyOrderAsNew } = useStore();
  const [cancelling, setCancelling] = useState(false);
  const order = getOrder(orderId);

  if (!order) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="פרטי הזמנה" backTo="/orders" />
        </AppHeader>
        <Section>
          <EmptyState
            title="ההזמנה לא נמצאה"
            action={<Button onClick={() => navigate({ to: "/orders" })}>לכל ההזמנות</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  const editable = !order.closed && order.status !== "cancelled" && order.status !== "completed";

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="פרטי הזמנה" backTo="/orders" />
      </AppHeader>
      <Section className="pb-28">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold text-foreground">{formatLongDate(order.date)}</span>
            <StatusChip status={order.status} />
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">{roundLabel(order.round)}</div>
          {order.cutoffText ? (
            <div className="mt-2.5 rounded-[10px] bg-accent-soft px-3 py-2 text-[11.5px] font-semibold text-accent-foreground">
              {order.cutoffText}
            </div>
          ) : null}
        </Card>

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">מוצרים בהזמנה</h2>
        <div className="flex flex-col gap-2">
          {order.lines.map((line) => {
            const product = findProduct(line.productId);
            if (!product) return null;
            return (
              <Card key={line.productId} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-foreground">{product.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatQty(line.qty, product.unit)} × {formatPrice(product.price)}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-foreground">
                  {formatPrice(product.price * line.qty)}
                </span>
              </Card>
            );
          })}
        </div>

        <Card className="mt-3 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">סה״כ</span>
            <span className="text-[17px] font-bold text-foreground">{formatPrice(linesTotal(order.lines))}</span>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => {
            copyOrderAsNew(order.id);
            navigate({ to: "/new-order" });
          }}
          className="mt-3 w-full rounded-xl border border-border bg-card py-2.5 text-[12.5px] font-semibold text-foreground"
        >
          שכפול כהזמנה חדשה
        </button>
      </Section>

      {editable ? (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button variant="secondary" size="lg" className="font-semibold" onClick={() => setCancelling(true)}>
              ביטול ההזמנה
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                editOrder(order.id);
                navigate({ to: "/catalog" });
              }}
            >
              עריכת ההזמנה
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={cancelling}
        title="לבטל את ההזמנה?"
        description="ההזמנה תסומן כמבוטלת ולא תסופק במועד שנבחר."
        confirmLabel="ביטול ההזמנה"
        cancelLabel="השארה"
        destructive
        onConfirm={() => {
          cancelOrder(order.id);
          setCancelling(false);
          toast.success("ההזמנה בוטלה");
          navigate({ to: "/orders" });
        }}
        onClose={() => setCancelling(false)}
      />
    </AppShell>
  );
}
