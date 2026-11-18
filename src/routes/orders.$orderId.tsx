import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Copy, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { EmailOrderButton, WhatsAppOrderButton } from "@/components/app/order-share-buttons";
import { Modal } from "@/components/app/modal";
import { OrderSheet } from "@/components/app/order-sheet";
import { ProductPlaceholder } from "@/components/app/product-card";
import { StatusChip } from "@/components/app/status-chip";
import { findProduct } from "@/data/catalog";
import { useMyCustomer } from "@/hooks/use-customers";
import { useCopyOrderAsNew, useDiscardCart, useOrder } from "@/hooks/use-orders";
import { formatLongDate, formatPrice, formatQty, orderNumberLabel } from "@/lib/format";

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

/** כפתורי הפעולה בראש ההזמנה — אותו סגנון של "הוספת מוצרים" בסיכום. */
const topActionClass =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary";

function OrderDetailsPage() {
  const { orderId } = useParams({ from: "/orders/$orderId" });
  const navigate = useNavigate();
  const { order, isLoading } = useOrder(orderId);
  const { customer } = useMyCustomer();
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
  // סבב מוצג (בהדפסה ובמייל) רק ללקוח שמורשה ליותר מסבב אחד.
  const showRound = !!customer?.allowedRounds.includes("noon");

  const copy = () => {
    if (!auth?.customerId) return;
    copyAsNew.mutate(
      { customerId: auth.customerId, source: order },
      // ישר לסיכום (שם אפשר להסיר/לעדכן ולבחור מועד) — מזהה מפורש, כמו בזרימת ההעתקה בקטלוג.
      { onSuccess: (cartId) => navigate({ to: "/summary", search: { order: cartId } }) },
    );
  };

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="פרטי הזמנה" backTo="/orders" />
      </AppHeader>
      <Section className="pb-28 print:hidden">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold text-foreground">
              {order.date ? formatLongDate(order.date) : "טרם נבחר תאריך אספקה"}
            </span>
            <StatusChip status={order.status} />
          </div>
          {/* אותו פורמט כמו בכרטיס ב"ההזמנות שלי"; לטיוטה אין עדיין מספר. */}
          <div className="mt-1 text-[12px] text-muted-foreground tabular-nums">
            {isDraft ? null : `${orderNumberLabel(order.number)} · `}
            {order.lines.length} מוצרים
          </div>
          {/* שורה משלו ולא בסוף שורת המספר — ללקוח עם כמה סניפים זה הפרט החשוב (החלטה 25). */}
          {order.branch ? (
            <div className="mt-1 text-[13px] font-semibold text-foreground">סניף: {order.branch.name}</div>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={topActionClass}>
              <Copy className="size-3.5" />
              שכפול כהזמנה חדשה
            </button>
            {/* חלון ההדפסה של הדפדפן מכסה גם "שמירה כ-PDF" (הורדה) וגם שיתוף מהטלפון. */}
            {isDraft ? null : (
              <>
                <button type="button" onClick={() => window.print()} className={topActionClass}>
                  <Printer className="size-3.5" />
                  הדפסה / שמירה כ-PDF
                </button>
                <EmailOrderButton
                  order={order}
                  customerName={customer?.name ?? ""}
                  showRound={showRound}
                  className={topActionClass}
                />
                <WhatsAppOrderButton
                  order={order}
                  customerName={customer?.name ?? ""}
                  showRound={showRound}
                  className={topActionClass}
                />
              </>
            )}
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
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-foreground">{line.productName}</span>
                    {line.sku ? (
                      <span className="shrink-0 text-[11.5px] text-muted-foreground">קוד פריט: {line.sku}</span>
                    ) : null}
                  </div>
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
      </Section>

      <OrderSheet order={order} customerName={customer?.name ?? ""} showRound={showRound} />

      {isDraft ? (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5 print:hidden">
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
