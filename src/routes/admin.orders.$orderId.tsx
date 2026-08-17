import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { FileText, MapPin, Pencil, Phone, Plus, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


import { AdminShell } from "@/components/admin/admin-shell";
import { PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { ProductPlaceholder, QuantityStepper } from "@/components/app/product-card";
import { StatusChip } from "@/components/app/status-chip";
import { findProduct, roundLabel } from "@/data/catalog";
import { productImage } from "@/data/product-images";
import { useAdminOrderView } from "@/hooks/use-admin-orders";
import { DocumentStatusChip } from "@/components/admin/document-status-chip";
import { OrderProductPicker } from "@/components/admin/order-product-picker";
import { priceFor } from "@/lib/admin/pricing";
import { clampQty, formatLongDate, formatPhone, formatPrice, formatQty } from "@/lib/format";
import { useStore } from "@/store/app-store";

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
  const { documents, issueDocument, updateOrderAsAdmin } = useStore();
  const [issuing, setIssuing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const doc = documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  const customer = view?.customer;

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

  const { order } = view;
  const contact = customer?.contacts[0];
  const isCancelled = order.status === "cancelled";

  const cancelOrder = () => {
    updateOrderAsAdmin(order.id, { status: "cancelled" });
    setEditing(false);
    setConfirmCancel(false);
    toast.success("ההזמנה בוטלה. הלקוח יראה את הביטול");
  };

  const restoreOrder = () => {
    updateOrderAsAdmin(order.id, { status: "approved" });
    toast.success("ההזמנה שוחזרה");
  };


  const currentLines = editing
    ? Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }))
    : order.lines;

  const total = currentLines.reduce((sum, l) => {
    const p = findProduct(l.productId);
    return p ? sum + priceFor(customer, p) * l.qty : sum;
  }, 0);

  const startEdit = () => {
    const map: Record<string, number> = {};
    for (const l of order.lines) map[l.productId] = l.qty;
    setQuantities(map);
    setAdding(false);
    setEditing(true);
  };

  const setQty = (productId: string, qty: number) =>
    setQuantities((q) => {
      const next = { ...q };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });

  const saveSummary = () => {
    const originalMap: Record<string, number> = {};
    for (const l of order.lines) originalMap[l.productId] = l.qty;
    const currentMap = quantities;

    const added = Object.entries(currentMap).filter(([id, qty]) => qty > 0 && !(id in originalMap));
    const removed = Object.entries(originalMap).filter(([id, qty]) => (currentMap[id] ?? 0) <= 0);
    const changed = Object.entries(currentMap).filter(([id, qty]) => {
      const originalQty = originalMap[id];
      return qty > 0 && originalQty !== undefined && qty !== originalQty;
    });

    return { added, removed, changed, originalCount: order.lines.length, newCount: currentLines.length };
  };

  const save = () => {
    updateOrderAsAdmin(order.id, { lines: currentLines });
    setEditing(false);
    setConfirmSave(false);
    toast.success("ההזמנה עודכנה. הלקוח יראה את השינוי");
  };

  const promptSave = () => setConfirmSave(true);

  if (editing && adding) {
    return (
      <AdminShell>
        <OrderProductPicker
          quantities={quantities}
          total={total}
          onSetQty={(id, qty) => setQty(id, qty)}
          onBumpQty={(id, delta) => {
            const product = findProduct(id);
            if (!product) return;
            setQty(id, clampQty(product, (quantities[id] ?? 0) + delta));
          }}
          onDone={() => setAdding(false)}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Section className="pt-4 pb-28">
        <PageTitleBar title={view.customerName} backTo="/admin/orders" />

        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14.5px] font-bold text-heading">{formatLongDate(order.date)}</span>
            <StatusChip status={order.status} />
          </div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {roundLabel(order.round)} · {currentLines.length} פריטים
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

        <div className="mt-4 mb-2 flex flex-col gap-2">
          {editing ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary"
              >
                <Plus className="size-3.5" />
                הוספת מוצרים
              </button>
            </div>
          ) : isCancelled ? null : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary"
              >
                <Pencil className="size-3.5" />
                עריכת ההזמנה
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center gap-1 rounded-full border border-destructive bg-destructive-bg px-3 py-1.5 text-[12px] font-bold text-destructive"
              >
                <XCircle className="size-3.5" />
                ביטול ההזמנה
              </button>
            </div>
          )}
          <h2 className="text-[15px] font-bold text-heading">מוצרים בהזמנה</h2>
        </div>




        <div className="flex flex-col gap-2">
          {currentLines.length === 0 ? (
            <EmptyState title="אין מוצרים בהזמנה" description="אפשר להוסיף מוצרים דרך החיפוש למעלה." />
          ) : (
            currentLines.map((line) => {
              const product = findProduct(line.productId);
              if (!product) return null;
              const unitPrice = priceFor(customer, product);
              return (
                <Card key={line.productId} className="flex items-center gap-2.5">
                  {productImage(product.id) ? (
                    <img
                      src={productImage(product.id)}
                      alt={product.name}
                      loading="lazy"
                      className="aspect-square size-[56px] shrink-0 rounded-[10px] object-contain"
                    />
                  ) : (
                    <ProductPlaceholder className="size-[56px]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-foreground">{product.name}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      קוד פריט: <span className="font-semibold text-foreground">{product.sku ?? product.id}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {formatQty(line.qty, product.unit)} × {formatPrice(unitPrice)} ={" "}
                      <span className="font-semibold text-foreground">{formatPrice(unitPrice * line.qty)}</span>
                    </div>
                  </div>
                  {editing ? (
                    <QuantityStepper
                      product={product}
                      qty={line.qty}
                      compact
                      onChange={(delta) => setQty(product.id, clampQty(product, line.qty + delta))}
                      onSetQty={(qty) => setQty(product.id, qty)}
                    />
                  ) : null}
                </Card>
              );
            })
          )}
        </div>

        <Card className="mt-3 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-bold text-foreground">
              סה״כ <span className="text-[11px] font-normal text-muted-foreground">(לפני מע״מ)</span>
            </span>
            <span className="text-[19px] font-bold text-heading">{formatPrice(total)}</span>
          </div>
        </Card>

        {editing || isCancelled ? null : (
          <div className="mt-4 flex flex-col gap-2 rounded-[16px] border border-border bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-bold text-heading">תעודת משלוח</span>
              <DocumentStatusChip document={doc} />
            </div>
            {doc?.error ? <span className="text-[11.5px] text-destructive">{doc.error}</span> : null}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button
                variant="secondary"
                size="lg"
                className="w-full md:w-auto"
                loading={issuing}
                onClick={async () => {
                  setIssuing(true);
                  try {
                    await issueDocument(orderId);
                  } finally {
                    setIssuing(false);
                  }
                }}
              >
                <FileText className="size-4" />
                {doc?.status === "issued" ? "הפקה מחדש" : "הפקת תעודת משלוח"}
              </Button>
              <Link to="/admin/documents" className="text-[12px] font-semibold text-primary no-underline">
                ליומן המסמכים
              </Link>
            </div>
            <span className="text-[11px] text-muted-foreground">
              המסמך נשמר במערכת בלבד. החיבור לריווחית יופעל בהמשך.
            </span>
          </div>
        )}

        {editing || !isCancelled ? null : (
          <div className="mt-4 flex flex-col gap-2 rounded-[16px] border border-destructive bg-destructive-bg p-3.5">
            <span className="text-[13.5px] font-bold text-destructive">ההזמנה בוטלה</span>
            <span className="text-[11.5px] text-muted-foreground">
              ההזמנה אינה נכללת בדוחות הייצור והחלוקה. אפשר לשחזר אותה במידת הצורך.
            </span>
            <Button variant="secondary" size="lg" className="w-full md:w-auto" onClick={restoreOrder}>
              <RotateCcw className="size-4" />
              שחזור ההזמנה
            </Button>
          </div>
        )}
      </Section>

      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>לאשר את השינויים בהזמנה?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">ההזמנה של {view.customerName} לתאריך {formatLongDate(order.date)} תעודכן.</span>
              {(() => {
                const summary = saveSummary();
                const parts = [];
                if (summary.added.length) parts.push(`${summary.added.length} פריטים חדשים`);
                if (summary.removed.length) parts.push(`${summary.removed.length} פריטים הוסרו`);
                if (summary.changed.length) parts.push(`${summary.changed.length} פריטים שונו בכמות`);
                if (parts.length === 0) parts.push("לא זוהו שינויים בכמויות");
                return (
                  <span className="mt-1.5 block">
                    {parts.join(" · ")} ({summary.originalCount} פריטים → {summary.newCount} פריטים)
                  </span>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>חזרה</AlertDialogCancel>
            <AlertDialogAction onClick={save}>אישור השינויים</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>לבטל את ההזמנה?</AlertDialogTitle>
            <AlertDialogDescription>
              ההזמנה של {view.customerName} לתאריך {formatLongDate(order.date)} תסומן כמבוטלת ולא תיכלל בדוחות. הלקוח
              יראה את הביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>חזרה</AlertDialogCancel>
            <AlertDialogAction onClick={cancelOrder}>ביטול ההזמנה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {editing ? (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button variant="secondary" size="lg" className="font-semibold" onClick={() => setEditing(false)}>
              ביטול העריכה
            </Button>
            <Button size="lg" className="flex-1 md:flex-initial md:w-auto" onClick={promptSave}>
              שמירת השינויים
            </Button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
