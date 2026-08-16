import { createFileRoute, useParams } from "@tanstack/react-router";
import { FileText, MapPin, Phone } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { StatusChip } from "@/components/app/status-chip";
import { findProduct, roundLabel } from "@/data/catalog";
import { useAdminOrderView } from "@/hooks/use-admin-orders";
import { formatLongDate, formatPhone, formatPrice, formatQty } from "@/lib/format";

export const Route = createFileRoute("/admin/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "פירוט הזמנה — ניהול המאפייה" },
      { name: "description", content: "פירוט הזמנה של לקוח: מוצרים, כמויות, סבב אספקה ופרטי קשר." },
      { property: "og:title", content: "פירוט הזמנה — ניהול המאפייה" },
      { property: "og:description", content: "פירוט מלא של הזמנת לקוח לקראת האספקה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrderDetailPage,
});

function AdminOrderDetailPage() {
  const { orderId } = useParams({ from: "/admin/orders/$orderId" });
  const view = useAdminOrderView(orderId);

  if (!view) {
    return (
      <AdminShell>
        <Section className="pt-4 pb-10">
          <PageTitleBar title="פירוט הזמנה" backTo="/admin/orders" />
          <EmptyState title="ההזמנה לא נמצאה" description="ייתכן שההזמנה נמחקה או שהקישור אינו תקין." />
        </Section>
      </AdminShell>
    );
  }

  const { order, customer } = view;
  const contact = customer?.contacts[0];

  return (
    <AdminShell>
      <Section className="pt-4 pb-10">
        <PageTitleBar title={view.customerName} backTo="/admin/orders" />

        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14.5px] font-bold text-heading">{formatLongDate(order.date)}</span>
            <StatusChip status={order.status} />
          </div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {roundLabel(order.round)} · {view.itemsCount} פריטים
          </div>
          {customer ? (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {customer.address}
              </span>
              {contact ? (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  {contact.name} · {formatPhone(contact.phone)}
                </span>
              ) : null}
            </div>
          ) : null}
        </Card>

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-heading">מוצרים בהזמנה</h2>
        <div className="flex flex-col gap-2">
          {order.lines.map((line) => {
            const product = findProduct(line.productId);
            if (!product) return null;
            return (
              <Card key={line.productId} className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
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
            <span className="text-[13px] text-muted-foreground">
              סה״כ <span className="text-[11px]">(לפני מע״מ)</span>
            </span>
            <span className="text-[17px] font-bold text-heading">{formatPrice(view.total)}</span>
          </div>
        </Card>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <Button variant="secondary" size="lg" className="w-full md:w-auto" disabled>
            <FileText className="size-4" />
            הפקת תעודת משלוח
          </Button>
          <span className="self-center text-[11.5px] text-muted-foreground">
            הפקת מסמכים תתווסף בשלב המסמכים.
          </span>
        </div>
      </Section>
    </AdminShell>
  );
}
