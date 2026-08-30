import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { FileText, Info, MapPin, Pencil, Phone, Plus, RotateCcw, XCircle } from "lucide-react";
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
import { useAdminOrderView, useAdminUpdateOrderLines, useCancelOrder, useRestoreOrder, orderDate, type CartLineInput } from "@/hooks/use-orders";
import { useCustomerPriceMap } from "@/hooks/use-customers";
import {
  useAdminOrdersForDateWithRecurring,
  useMaterializeRecurringOccurrence,
  parseVirtualOrderId,
} from "@/hooks/use-recurring";
import { DocumentStatusChip } from "@/components/admin/document-status-chip";
import { OrderProductPicker } from "@/components/admin/order-product-picker";
import { useDocuments, useIssueDocuments } from "@/hooks/use-documents";
import { priceFor } from "@/lib/admin/pricing";
import { clampQty, formatLongDate, formatPhone, formatPrice, formatQty } from "@/lib/format";

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
  const virtual = parseVirtualOrderId(orderId);
  if (virtual) return <VirtualOccurrenceDetailPage recurringId={virtual.recurringId} date={virtual.date} />;
  return <RealOrderDetailPage orderId={orderId} />;
}

/** מופע וירטואלי של הזמנה קבועה (עוד לא מומש) — תצוגה מצומצמת, קריאה בלבד. עריכה/ביטול
 * ממששים אותו קודם לרשומת `orders` אמיתית (PRD §4.2-4.3) ואז מפנים לדף הרגיל, שמטפל
 * מכאן בכל עריכה/ביטול בדיוק כמו בכל הזמנה אחרת — בלי לשכפל את ה-UI של שלב 3. */
function VirtualOccurrenceDetailPage({ recurringId, date }: { recurringId: string; date: string }) {
  const navigate = useNavigate();
  const { views, isLoading } = useAdminOrdersForDateWithRecurring(date);
  const view = views.find((v) => v.isVirtual && v.order.recurringId === recurringId);
  const materialize = useMaterializeRecurringOccurrence();
  const [opening, setOpening] = useState(false);

  if (!view) {
    return (
      <AdminShell>
        <Section className="pt-4 pb-10">
          <PageTitleBar title="פירוט הזמנה" backTo="/admin/orders" />
          {isLoading ? null : (
            <EmptyState title="ההזמנה לא נמצאה" description="ייתכן שההזמנה הקבועה כבר לא חלה על התאריך הזה." />
          )}
        </Section>
      </AdminShell>
    );
  }

  const { order } = view;
  const total = order.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  const openForEditing = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const realOrderId = await materialize.mutateAsync({ recurringId, date });
      navigate({ to: "/admin/orders/$orderId", params: { orderId: realOrderId }, replace: true });
    } finally {
      setOpening(false);
    }
  };

  return (
    <AdminShell>
      <Section className="pt-4 pb-28">
        <PageTitleBar title={view.customerName} backTo="/admin/orders" />

        <div className="mb-3 flex items-start gap-1.5 rounded-[10px] bg-card-muted px-3 py-2.5 text-[12px] font-semibold text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          <span>זו הזמנה קבועה שטרם מומשה — נעילה/עריכה/ביטול יקרו רק אחרי פתיחה לעריכה.</span>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14.5px] font-bold text-heading">{formatLongDate(order.date!)}</span>
            <span className="rounded-full bg-card-muted px-3 py-[3px] text-[10.5px] font-bold text-muted-foreground">
              קבועה
            </span>
          </div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {roundLabel(order.round)} · {order.lines.length} פריטים
          </div>
          <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12px] text-muted-foreground">
            {view.customerAddress ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {view.customerAddress}
              </span>
            ) : null}
            {view.customerPhone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" />
                {formatPhone(view.customerPhone)}
              </span>
            ) : null}
          </div>
        </Card>

        {order.note ? (
          <Card className="mt-3 bg-card-muted">
            <div className="text-[11.5px] font-semibold text-muted-foreground">הערה למאפייה</div>
            <div className="mt-1 text-[13px] text-foreground">{order.note}</div>
          </Card>
        ) : null}

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-heading">מוצרים בהזמנה</h2>
        <div className="flex flex-col gap-2">
          {order.lines.map((line) => {
            const imageUrl = findProduct(line.productId)?.imageUrl;
            return (
              <Card key={line.productId} className="flex items-center gap-2.5">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={line.productName}
                    loading="lazy"
                    className="aspect-square size-[56px] shrink-0 rounded-[10px] object-contain"
                  />
                ) : (
                  <ProductPlaceholder className="size-[56px]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-foreground">{line.productName}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatQty(line.qty, line.unit)} × {formatPrice(line.unitPrice)} ={" "}
                    <span className="font-semibold text-foreground">{formatPrice(line.unitPrice * line.qty)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-3 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-bold text-foreground">
              סה״כ <span className="text-[11px] font-normal text-muted-foreground">(לפני מע״מ)</span>
            </span>
            <span className="text-[19px] font-bold text-heading">{formatPrice(total)}</span>
          </div>
        </Card>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          <Button size="lg" className="w-full" loading={opening} onClick={() => void openForEditing()}>
            <Pencil className="size-4" />
            פתיחת ההזמנה לעריכה / ביטול
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}

function RealOrderDetailPage({ orderId }: { orderId: string }) {
  const { view } = useAdminOrderView(orderId);
  const { documents } = useDocuments();
  const issueDocuments = useIssueDocuments();
  const updateLines = useAdminUpdateOrderLines();
  const cancelOrder = useCancelOrder();
  const restoreOrder = useRestoreOrder();
  const priceMap = useCustomerPriceMap(view?.order.customerId);
  const [issuing, setIssuing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const doc = documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

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
  const isCancelled = order.status === "cancelled";

  const doCancel = () => {
    cancelOrder.mutate(order.id);
    setEditing(false);
    setConfirmCancel(false);
    toast.success("ההזמנה בוטלה. הלקוח יראה את הביטול");
  };

  const doRestore = () => {
    restoreOrder.mutate(order.id);
    toast.success("ההזמנה שוחזרה");
  };

  /** בעריכה: מחיר חי (מחירון הלקוח) לתצוגה מקדימה. שלא בעריכה: ה-snapshot של ההזמנה. */
  const currentLines: CartLineInput[] = editing
    ? Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => {
          const product = findProduct(productId);
          return {
            productId,
            productName: product?.name ?? productId,
            sku: product?.sku ?? null,
            unit: product?.unit ?? "unit",
            qty,
            unitPrice: product ? priceFor(product, priceMap) : 0,
          };
        })
    : order.lines;

  const total = currentLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

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
    updateLines.mutate(
      { orderId: order.id, lines: currentLines },
      {
        onSuccess: () => {
          setEditing(false);
          setConfirmSave(false);
          toast.success("ההזמנה עודכנה. הלקוח יראה את השינוי");
        },
        onError: () => toast.error("שמירת השינויים נכשלה"),
      },
    );
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
            <span className="text-[14.5px] font-bold text-heading">{formatLongDate(orderDate(order))}</span>
            <StatusChip status={order.status} />
          </div>
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {roundLabel(order.round)} · {currentLines.length} פריטים
          </div>
          <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12px] text-muted-foreground">
            {view.customerAddress ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {view.customerAddress}
              </span>
            ) : null}
            {view.customerPhone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" />
                {formatPhone(view.customerPhone)}
              </span>
            ) : null}
          </div>
        </Card>

        {order.note ? (
          <Card className="mt-3 bg-card-muted">
            <div className="text-[11.5px] font-semibold text-muted-foreground">הערה למאפייה</div>
            <div className="mt-1 text-[13px] text-foreground">{order.note}</div>
          </Card>
        ) : null}

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
          ) : isCancelled || order.status === "completed" ? null : (
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
              const catalogProduct = findProduct(line.productId);
              const imageUrl = catalogProduct?.imageUrl;
              return (
                <Card key={line.productId} className="flex items-center gap-2.5">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={line.productName}
                      loading="lazy"
                      className="aspect-square size-[56px] shrink-0 rounded-[10px] object-contain"
                    />
                  ) : (
                    <ProductPlaceholder className="size-[56px]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-foreground">{line.productName}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      קוד פריט: <span className="font-semibold text-foreground">{line.sku ?? line.productId}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {formatQty(line.qty, line.unit)} × {formatPrice(line.unitPrice)} ={" "}
                      <span className="font-semibold text-foreground">{formatPrice(line.unitPrice * line.qty)}</span>
                    </div>
                  </div>
                  {editing && catalogProduct ? (
                    <QuantityStepper
                      product={catalogProduct}
                      qty={line.qty}
                      compact
                      onChange={(delta) => setQty(line.productId, clampQty(catalogProduct, line.qty + delta))}
                      onSetQty={(qty) => setQty(line.productId, qty)}
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

        {editing || isCancelled || order.status === "completed" ? null : (
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
                    await issueDocuments.mutateAsync({ orderIds: [orderId] });
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
            <Button variant="secondary" size="lg" className="w-full md:w-auto" onClick={doRestore}>
              <RotateCcw className="size-4" />
              שחזור ההזמנה
            </Button>
          </div>
        )}

        {order.status === "completed" ? (
          <div className="mt-4 rounded-[16px] border border-border bg-card-muted p-3.5 text-[11.5px] text-muted-foreground">
            ההזמנה הושלמה — תאריך האספקה חלף, ולא ניתן עוד לערוך, לבטל או לשחזר אותה.
          </div>
        ) : null}
      </Section>

      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>לאשר את השינויים בהזמנה?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                ההזמנה של {view.customerName} לתאריך {formatLongDate(orderDate(order))} תעודכן.
              </span>
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
              ההזמנה של {view.customerName} לתאריך {formatLongDate(orderDate(order))} תסומן כמבוטלת ולא תיכלל
              בדוחות. הלקוח יראה את הביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>חזרה</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel}>ביטול ההזמנה</AlertDialogAction>
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
