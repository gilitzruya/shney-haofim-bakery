import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { MapPin, Phone, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
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
import { OrderProductPicker } from "@/components/admin/order-product-picker";
import { PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { FormField, TextInput, WeekdayChips } from "@/components/app/form-controls";
import { ProductPlaceholder, QuantityStepper } from "@/components/app/product-card";
import { findProduct, ROUNDS, WEEKDAY_LABELS } from "@/data/catalog";
import type { RoundId } from "@/data/catalog";
import { useCustomer, useCustomerPriceMap } from "@/hooks/use-customers";
import { useAdminCreateOrder } from "@/hooks/use-orders";
import { useCreateRecurring } from "@/hooks/use-recurring";
import { tomorrowIso } from "@/lib/admin/dates";
import { priceFor } from "@/lib/admin/pricing";
import { clampQty, formatLongDate, formatPhone, formatPrice, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/customers/$customerId/new-order")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: search["type"] === "recurring" ? ("recurring" as const) : ("onetime" as const),
  }),
  head: () => ({
    meta: [
      { title: "הזמנה בשם לקוח — ניהול המאפייה" },
      { name: "description", content: "יצירת הזמנה עבור לקוח של המאפייה לפי הרשאות הסבב והמחירים המיוחדים שלו." },
      { property: "og:title", content: "הזמנה בשם לקוח — ניהול המאפייה" },
      { property: "og:description", content: "יצירת הזמנה עבור לקוח לפי המחירים המיוחדים שלו." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewCustomerOrderPage,
});

function NewCustomerOrderPage() {
  const { customerId } = useParams({ from: "/admin/customers/$customerId/new-order" });
  const { type } = Route.useSearch();
  const isRecurring = type === "recurring";
  const createRecurring = useCreateRecurring();
  const { customer, isLoading } = useCustomer(customerId);
  const hydrated = !isLoading;
  const priceMap = useCustomerPriceMap(customerId);
  const createOrder = useAdminCreateOrder();
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();

  const [date, setDate] = useState(() => tomorrowIso());
  const [round, setRound] = useState<RoundId | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [recName, setRecName] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);

  const allowedRounds = useMemo(
    () => ROUNDS.filter((r) => customer?.allowedRounds.includes(r.id)),
    [customer],
  );
  const activeRound = round ?? allowedRounds[0]?.id ?? null;

  const lines = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty })),
    [quantities],
  );

  const total = lines.reduce((sum, l) => {
    const p = findProduct(l.productId);
    return p ? sum + priceFor(p, priceMap) * l.qty : sum;
  }, 0);

  const setQty = (productId: string, qty: number) =>
    setQuantities((q) => {
      const next = { ...q };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });

  if (!customer) {
    return (
      <AdminShell>
        <Section className="pt-6 pb-10">
          {hydrated ? <EmptyState title="הלקוח לא נמצא" description="אפשר לחזור לרשימת הלקוחות." /> : null}
        </Section>
      </AdminShell>
    );
  }

  const contact = customer.contacts[0];
  const blocked = Boolean(customer.blocked);

  const create = () => {
    if (!activeRound || !auth) return;
    if (isRecurring) {
      createRecurring.mutate(
        {
          customerId: customer.id,
          name: recName.trim() || `הזמנה קבועה — ${customer.name}`,
          weekdays,
          round: activeRound,
          startDate: tomorrowIso(),
          lines,
        },
        {
          onSuccess: () => {
            setConfirmCreate(false);
            toast.success("ההזמנה הקבועה נוצרה עבור הלקוח");
            void navigate({ to: "/admin/customers/$customerId", params: { customerId } });
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "יצירת ההזמנה הקבועה נכשלה"),
        },
      );
      return;
    }
    const orderLines = lines
      .map((l) => {
        const product = findProduct(l.productId);
        if (!product) return null;
        return {
          productId: l.productId,
          productName: product.name,
          sku: product.sku ?? null,
          unit: product.unit,
          qty: l.qty,
          unitPrice: priceFor(product, priceMap),
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
    createOrder.mutate(
      { customerId: customer.id, date, round: activeRound, createdBy: auth.userId, lines: orderLines },
      {
        onSuccess: (orderId) => {
          setConfirmCreate(false);
          toast.success("ההזמנה נוצרה. הלקוח יראה אותה אצלו");
          void navigate({ to: "/admin/orders/$orderId", params: { orderId } });
        },
        onError: () => toast.error("יצירת ההזמנה נכשלה"),
      },
    );
  };

  if (adding) {
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
        <PageTitleBar title={customer.name} onBack={() => void navigate({ to: "/admin/customers/$customerId", params: { customerId } })} />

        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary">
          <Sparkles className="size-3.5" />
          {isRecurring ? "הזמנה קבועה בשם הלקוח" : "הזמנה חד-פעמית בשם הלקוח"}
        </div>

        {blocked ? (
          <EmptyState
            title="הלקוח חסום"
            description="לא ניתן ליצור הזמנה ללקוח חסום. יש לשחרר את החסימה בכרטיס הלקוח."
          />
        ) : (
          <>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14.5px] font-bold text-heading">
                  {isRecurring
                    ? weekdays.length
                      ? weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")
                      : "בחרו ימי אספקה"
                    : formatLongDate(date)}
                </span>
                <span className="text-[12px] text-muted-foreground">{lines.length} פריטים</span>
              </div>
              {isRecurring ? (
                <div className="mt-2.5 flex flex-col gap-3">
                  <FormField label="שם ההזמנה הקבועה">
                    <TextInput
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      placeholder="לדוגמה: אספקת בוקר קבועה"
                    />
                  </FormField>
                  <div className="flex flex-col gap-2">
                    <div className="text-[12px] font-semibold text-muted-foreground">ימי אספקה</div>
                    <WeekdayChips value={weekdays} onChange={setWeekdays} />
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 flex flex-col gap-2">
                  <div className="text-[12px] font-semibold text-muted-foreground">תאריך אספקה</div>
                  <TextInput
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="תאריך אספקה"
                  />
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2">
                <div className="text-[12px] font-semibold text-muted-foreground">סבב אספקה</div>
                {allowedRounds.length === 0 ? (
                  <div className="text-[12.5px] text-destructive">ללקוח אין הרשאת סבב. יש לעדכן בכרטיס הלקוח.</div>
                ) : (
                  <div className="flex flex-col gap-2 md:flex-row">
                    {allowedRounds.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRound(r.id)}
                        className={cn(
                          "flex flex-1 items-center justify-between rounded-xl border px-3.5 py-3 text-start",
                          activeRound === r.id
                            ? "border-[1.5px] border-primary bg-primary-soft"
                            : "border-border bg-card",
                        )}
                      >
                        <span className="text-[13.5px] font-semibold text-foreground">{r.label}</span>
                        <span className="text-[12px] text-muted-foreground">{r.time}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {customer.address}
                </span>
                {contact?.phone ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    {contact.name ?? ""} · {formatPhone(contact.phone)}
                  </span>
                ) : null}
              </div>
            </Card>

            <div className="mt-4 mb-2 flex flex-col gap-2">
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
              <h2 className="text-[15px] font-bold text-heading">מוצרים בהזמנה</h2>
            </div>

            <div className="flex flex-col gap-2">
              {lines.length === 0 ? (
                <EmptyState title="אין מוצרים בהזמנה" description="אפשר להוסיף מוצרים בכפתור הוספת מוצרים." />
              ) : (
                lines.map((line) => {
                  const product = findProduct(line.productId);
                  if (!product) return null;
                  const unitPrice = priceFor(product, priceMap);
                  return (
                    <Card key={line.productId} className="flex items-center gap-2.5">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
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
                      <QuantityStepper
                        product={product}
                        qty={line.qty}
                        compact
                        onChange={(delta) => setQty(product.id, clampQty(product, line.qty + delta))}
                        onSetQty={(qty) => setQty(product.id, qty)}
                      />
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
          </>
        )}
      </Section>

      <AlertDialog open={confirmCreate} onOpenChange={setConfirmCreate}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRecurring ? "ליצור הזמנה קבועה בשם הלקוח?" : "ליצור הזמנה חדשה בשם הלקוח?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                {isRecurring
                  ? `תיווצר הזמנה קבועה עבור ${customer.name} בימים ${weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}.`
                  : `תיווצר הזמנה חדשה עבור ${customer.name} לתאריך ${formatLongDate(date)}.`}
              </span>
              <span className="mt-1.5 block">
                {lines.length} פריטים · סה״כ {formatPrice(total)}
              </span>
              <span className="mt-1.5 block">ההזמנה תופיע גם אצל הלקוח.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>חזרה</AlertDialogCancel>
            <AlertDialogAction onClick={create}>יצירת ההזמנה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {blocked ? null : (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button
              size="lg"
              className="flex-1"
              disabled={lines.length === 0 || !activeRound || (isRecurring && weekdays.length === 0)}
              onClick={() => setConfirmCreate(true)}
            >
              {isRecurring ? "יצירת ההזמנה הקבועה" : "יצירת ההזמנה"}
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
