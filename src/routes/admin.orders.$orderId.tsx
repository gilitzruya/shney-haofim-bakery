import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { FileText, MapPin, Pencil, Phone, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { TextInput } from "@/components/app/form-controls";
import { ProductPlaceholder, QuantityStepper } from "@/components/app/product-card";
import { StatusChip } from "@/components/app/status-chip";
import { allProducts, findProduct, roundLabel } from "@/data/catalog";
import { productImage } from "@/data/product-images";
import { useAdminOrderView } from "@/hooks/use-admin-orders";
import { DocumentStatusChip } from "@/components/admin/document-status-chip";
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
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const doc = documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  const customer = view?.customer;

  const searchResults = useMemo(() => {
    const q = query.trim();
    const list = allProducts();
    if (!q) return list;
    return list.filter((p) => p.name.includes(q) || (p.sku ?? "").includes(q));
  }, [query]);

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
    setQuery("");
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

  const save = () => {
    updateOrderAsAdmin(order.id, { lines: currentLines });
    setEditing(false);
    toast.success("ההזמנה עודכנה. הלקוח יראה את השינוי");
  };

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

        <div className="mt-4 mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-heading">מוצרים בהזמנה</h2>
          {editing ? (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-bold text-primary"
            >
              <Plus className="size-3.5" />
              {adding ? "סגירת הוספת מוצרים" : "הוספת מוצרים"}
            </button>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-bold text-primary"
            >
              <Pencil className="size-3.5" />
              עריכת ההזמנה
            </button>
          )}
        </div>

        {editing && adding ? (
          <Card className="mb-2 flex flex-col gap-2.5">
            <div className="text-[12px] font-semibold text-muted-foreground">הוספת מוצר להזמנה</div>
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש מוצר או קוד פריט"
                aria-label="חיפוש מוצר"
                className="pe-9"
              />
            </div>
            <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">

            {searchResults.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card-muted px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{formatPrice(priceFor(customer, p))}</div>
                </div>
                <QuantityStepper
                  product={p}
                  qty={quantities[p.id] ?? 0}
                  compact
                  onChange={(delta) => setQty(p.id, clampQty(p, (quantities[p.id] ?? 0) + delta))}
                  onSetQty={(qty) => setQty(p.id, qty)}
                />
              </div>
            ))}
            {query.trim() && searchResults.length === 0 ? (
              <div className="text-[12px] text-muted-foreground">לא נמצאו מוצרים מתאימים.</div>
            ) : null}
            </div>
          </Card>

        ) : null}

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

        {editing ? null : (
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
      </Section>

      {editing ? (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button variant="secondary" size="lg" className="font-semibold" onClick={() => setEditing(false)}>
              ביטול
            </Button>
            <Button size="lg" className="flex-1" onClick={save}>
              שמירת השינויים
            </Button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
