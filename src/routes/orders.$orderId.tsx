import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Modal } from "@/components/app/modal";
import { ProductPlaceholder } from "@/components/app/product-card";
import { StatusChip } from "@/components/app/status-chip";
import { findProduct } from "@/data/catalog";
import { useCopyOrderAsNew, useDiscardCart, useOrder } from "@/hooks/use-orders";
import { formatLongDate, formatPrice, formatQty } from "@/lib/format";

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
  const { order, isLoading } = useOrder(orderId);
  const { auth } = Route.useRouteContext();
  const discardCart = useDiscardCart();
  const copyAsNew = useCopyOrderAsNew();
  const [cancelling, setCancelling] = useState(false);

  if (!order) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="פרטי הזמנה" backTo="/orders" />
        </AppHeader>
        {isLoading ? null : (
          <Section>
            <EmptyState
              title="ההזמנה לא נמצאה"
              action={<Button onClick={() => navigate({ to: "/orders" })}>לכל ההזמנות</Button>}
            />
          </Section>
        )}
      </AppShell>
    );
  }

  const isDraft = order.status === "draft";
  const isApproved = order.status === "approved";
  const total = order.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  const copy = () => {
    if (!auth?.customerId) return;
    copyAsNew.mutate(
      { customerId: auth.customerId, source: order },
      { onSuccess: () => navigate({ to: "/catalog" }) },
    );
  };

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="פרטי הזמנה" backTo="/orders" />
      </AppHeader>
      <Section className="pb-28">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold text-foreground">
              {order.date ? formatLongDate(order.date) : "טרם נבחר תאריך אספקה"}
            </span>
            <StatusChip status={order.status} />
          </div>
          {isApproved ? (
            <div className="mt-2.5 rounded-[10px] bg-accent-soft px-3 py-2 text-[11.5px] font-semibold text-accent-foreground">
              ההזמנה אושרה ונעולה. לשינויים יש לפנות למאפייה.
            </div>
          ) : null}
        </Card>

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">מוצרים בהזמנה</h2>
        <div className="flex flex-col gap-2">
          {order.lines.length === 0 ? (
            <EmptyState title="אין מוצרים בהזמנה" />
          ) : (
            order.lines.map((line) => (
              <Card key={line.productId} className="flex items-center gap-2.5">
                {findProduct(line.productId)?.imageUrl ? (
                  <img
                    src={findProduct(line.productId)?.imageUrl}
                    alt={line.productName}
                    loading="lazy"
                    className="aspect-square size-[56px] shrink-0 rounded-[10px] object-contain"
                  />
                ) : (
                  <ProductPlaceholder className="size-[56px]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-foreground">{line.productName}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatQty(line.qty, line.unit)} × {formatPrice(line.unitPrice)}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-foreground">{formatPrice(line.unitPrice * line.qty)}</span>
              </Card>
            ))
          )}
        </div>

        <Card className="mt-3 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">סה״כ <span className="text-[11px]">(לפני מע״מ)</span></span>
            <span className="text-[17px] font-bold text-foreground">{formatPrice(total)}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">המחירים אינם כוללים מע״מ.</div>
        </Card>

        <button
          type="button"
          onClick={copy}
          className="mt-3 w-full rounded-xl border border-border bg-card py-2.5 text-[12.5px] font-semibold text-foreground"
        >
          שכפול כהזמנה חדשה
        </button>
      </Section>

      {isDraft ? (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button variant="secondary" size="lg" className="font-semibold" onClick={() => setCancelling(true)}>
              ביטול ההזמנה
            </Button>
            <Button size="lg" className="flex-1" onClick={() => navigate({ to: "/catalog" })}>
              עריכת ההזמנה
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={cancelling}
        title="לבטל את ההזמנה?"
        description="הטיוטה תימחק."
        confirmLabel="ביטול ההזמנה"
        cancelLabel="השארה"
        destructive
        onConfirm={() => {
          discardCart.mutate(order.id, {
            onSuccess: () => {
              setCancelling(false);
              toast.success("ההזמנה בוטלה");
              navigate({ to: "/orders" });
            },
          });
        }}
        onClose={() => setCancelling(false)}
      />
    </AppShell>
  );
}
