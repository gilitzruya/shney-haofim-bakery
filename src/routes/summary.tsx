import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { FormField, TextArea } from "@/components/app/form-controls";
import { Modal } from "@/components/app/modal";
import { ProductPlaceholder, QuantityStepper } from "@/components/app/product-card";
import { DateCalendar } from "@/components/app/date-calendar";

import { findProduct, type RoundId } from "@/data/catalog";
import { useMyCustomer, useMyPrices } from "@/hooks/use-customers";
import {
  useCartOrder,
  useConfirmOrder,
  useDiscardCart,
  useOrder,
  useSetCartDateRound,
  useSetCartNote,
  useUpsertCartLine,
} from "@/hooks/use-orders";
import { useCreateRecurring, useUpdateRecurringLines } from "@/hooks/use-recurring";
import { priceFor } from "@/lib/admin/pricing";
import { formatCutoff, israelNow, isCutoffPassed } from "@/lib/cutoff";
import { formatDate, formatPrice, formatQty, weekdaysLabel } from "@/lib/format";
import { linesFromQuantities, useRecurringDraft } from "@/store/recurring-draft";

export const Route = createFileRoute("/summary")({
  // מזהה הזמנה מפורש — נדרש כשמגיעים לכאן מזרימת ההעתקה (catalog.tsx), שכבר קבעה
  // תאריך לעגלה לפני הניווט; ברגע שיש תאריך, useCartOrder (המסונן ל-delivery_date is
  // null) כבר לא מוצא אותה, אז אי אפשר לסמוך על הגילוי האוטומטי בזרימה הזו.
  validateSearch: (search: Record<string, unknown>): { order?: string } =>
    typeof search["order"] === "string" ? { order: search["order"] } : {},
  head: () => ({
    meta: [
      { title: "סיכום הזמנה — מאפיית שני האופים" },
      { name: "description", content: "בדיקה ואישור סופי של פריטי ההזמנה והמועד." },
      { property: "og:title", content: "סיכום הזמנה — מאפיית שני האופים" },
      { property: "og:description", content: "בדקו את הפריטים ואשרו את ההזמנה." },
    ],
  }),
  component: SummaryPage,
});

/** אותו פיצול כמו `catalog.tsx`: אם יש `draft` פעיל ב-wizard הקבוע — זו זרימת הזמנה קבועה. */
function SummaryPage() {
  const { draft } = useRecurringDraft();
  return draft ? <RecurringSummaryPage /> : <OrderSummaryPage />;
}

/* ---------------------------------------------------------------------- */
/* מצב קבוע — שמירה חד-פעמית ל-DB בסוף ה-wizard (create/edit).             */
/* ---------------------------------------------------------------------- */

function RecurringSummaryPage() {
  const navigate = useNavigate();
  const { draft, bumpQty, setQty, clear } = useRecurringDraft();
  const { auth } = Route.useRouteContext();
  const myPrices = useMyPrices();
  const createRecurring = useCreateRecurring();
  const updateLines = useUpdateRecurringLines();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!draft) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="סיכום ההזמנה" backTo="/" />
        </AppHeader>
        <Section className="pb-10">
          <EmptyState
            title="אין הזמנה פעילה"
            description="התחילו הזמנה חדשה כדי לראות כאן סיכום."
            action={<Button onClick={() => navigate({ to: "/catalog", search: { copy: 1 } as never })}>הזמנה חדשה</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  const lines = linesFromQuantities(draft.quantities);
  const total = lines.reduce((sum, l) => {
    const product = findProduct(l.productId);
    return product ? sum + priceFor(product, myPrices) * l.qty : sum;
  }, 0);

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (draft.mode === "recurring_edit" && draft.recurringId) {
        await updateLines.mutateAsync({ id: draft.recurringId, lines });
        toast.success("רשימת המוצרים עודכנה");
        clear();
        navigate({ to: "/recurring/$recurringId", params: { recurringId: draft.recurringId } });
        return;
      }
      if (!auth?.customerId) return;
      await createRecurring.mutateAsync({
        customerId: auth.customerId,
        name: draft.name?.trim() || "הזמנה קבועה",
        weekdays: draft.weekdays ?? [],
        round: draft.round,
        startDate: draft.startDate ?? null,
        note: draft.note,
        lines,
      });
      toast.success("ההזמנה הקבועה נשמרה");
      clear();
      navigate({ to: "/recurring" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "שמירת ההזמנה הקבועה נכשלה";
      toast.error(message);
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="סיכום ההזמנה" />
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between border-t border-border px-3.5 py-2 md:px-5">
          <h2 className="text-[15px] font-bold text-foreground">פריטי ההזמנה</h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/catalog" })}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-bold text-primary transition-opacity"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            הוספת מוצרים
          </button>
        </div>
      </AppHeader>
      <Section className="pb-28">
        <div className="mt-1 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-2.5">
          <div className="text-[13.5px] font-semibold text-foreground">{draft.name || "הזמנה קבועה"}</div>
          {draft.weekdays?.length ? (
            <div className="mt-1 text-[12px] text-muted-foreground">{weekdaysLabel(draft.weekdays)}</div>
          ) : null}
        </div>

        <div className="mt-2 mb-2" />
        <div className="flex flex-col gap-2">
          {lines.length === 0 ? (
            <EmptyState title="לא נבחרו מוצרים" description="חזרו לקטלוג כדי להוסיף פריטים." />
          ) : (
            lines.map((line) => {
              const product = findProduct(line.productId);
              if (!product) return null;
              const unitPrice = priceFor(product, myPrices);
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
                      <span className="font-semibold text-foreground">
                        {formatPrice(unitPrice * line.qty)}
                      </span>
                    </div>
                  </div>
                  <QuantityStepper
                    product={product}
                    qty={line.qty}
                    compact
                    onChange={(delta) => bumpQty(product.id, delta)}
                    onSetQty={(qty) => setQty(product.id, qty)}
                  />
                </Card>
              );
            })
          )}
        </div>

        <Card className="mt-4 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-bold text-foreground">סה״כ לתשלום <span className="text-[11px] font-normal text-muted-foreground">(לפני מע״מ)</span></span>
            <span className="text-[19px] font-bold text-foreground">{formatPrice(total)}</span>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => {
            clear();
            navigate({ to: "/catalog", search: { copy: 1 } as never });
          }}
          className="mt-3 w-full rounded-xl border border-border bg-transparent py-2.5 text-[12.5px] font-semibold text-muted-foreground"
        >
          ביטול ההזמנה
        </button>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto flex max-w-5xl gap-2.5">
          <Button variant="secondary" size="lg" className="font-semibold" onClick={() => navigate({ to: "/catalog" })}>
            עריכת מוצרים
          </Button>
          <Button size="lg" className="flex-1" disabled={lines.length === 0} onClick={() => setConfirming(true)}>
            שמירת ההזמנה הקבועה
          </Button>
        </div>
      </div>

      <Modal
        open={confirming}
        title="לשמור את ההזמנה הקבועה?"
        description="ההזמנה תישלח למאפייה בכל אחד מימי האספקה שנבחרו."
        confirmLabel="אישור"
        loading={saving}
        onConfirm={() => void confirm()}
        onClose={() => setConfirming(false)}
      />
    </AppShell>
  );
}

/* ---------------------------------------------------------------------- */
/* הזמנה חד-פעמית — DB-backed.                                             */
/* ---------------------------------------------------------------------- */

function OrderSummaryPage() {
  const navigate = useNavigate();
  const { order: explicitOrderId } = Route.useSearch();
  const { cart, isLoading: cartLoading } = useCartOrder();
  const { customer } = useMyCustomer();
  const upsertLine = useUpsertCartLine();
  const setNote = useSetCartNote();
  const discardCart = useDiscardCart();
  const setDateRound = useSetCartDateRound();
  const confirmOrder = useConfirmOrder();
  const { auth } = Route.useRouteContext();

  // העגלה נמצאת דרך useCartOrder (מסונן ל-delivery_date is null) — אבל ברגע שבוחרים
  // תאריך בשלב "date" (למטה), או כשמגיעים לכאן כבר עם תאריך קבוע מזרימת ההעתקה
  // (?order=), היא כבר לא מתאימה לאותה שאילתה. שומרים את המזהה בנפרד ועוברים ל-useOrder
  // (לא תלוי בתאריך) כדי לא "לאבד" את ההזמנה.
  const [orderId, setOrderId] = useState<string | null>(explicitOrderId ?? null);
  useEffect(() => {
    if (cart?.id && cart.id !== orderId) setOrderId(cart.id);
  }, [cart?.id, orderId]);
  const { order, isLoading: orderLoading } = useOrder(orderId ?? undefined);
  const isLoading = cartLoading || (!!orderId && orderLoading);

  const [note, setNoteLocal] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [step, setStep] = useState<"review" | "date">("review");
  const [pickDate, setPickDate] = useState<string | null>(null);
  const [pickRound, setPickRound] = useState<RoundId>("morning");

  if (!isLoading && !order) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="סיכום ההזמנה" backTo="/" />
        </AppHeader>
        <Section className="pb-10">
          <EmptyState
            title="אין הזמנה פעילה"
            description="התחילו הזמנה חדשה כדי לראות כאן סיכום."
            action={<Button onClick={() => navigate({ to: "/catalog", search: { copy: 1 } as never })}>הזמנה חדשה</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="סיכום ההזמנה" backTo="/" />
        </AppHeader>
      </AppShell>
    );
  }

  const lines = order.lines;
  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const noteValue = note ?? order.note ?? "";
  const askRound = !!customer?.allowedRounds.includes("noon");

  const setQty = (productId: string, qty: number) => {
    const line = lines.find((l) => l.productId === productId);
    if (!line || !auth?.customerId) return;
    upsertLine.mutate({
      customerId: auth.customerId,
      line: { ...line, qty },
    });
  };

  const doDiscard = () => {
    discardCart.mutate(order.id, {
      onSuccess: () => navigate({ to: "/catalog", search: { copy: 1 } as never }),
    });
  };

  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await setNote.mutateAsync({ orderId: order.id, note: noteValue });
      await confirmOrder.mutateAsync(order.id);
      setConfirming(false);
      toast.success("ההזמנה אושרה ונשלחה למאפייה");
      navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    } catch (err) {
      setConfirming(false);
      const message = err instanceof Error ? err.message : "אישור ההזמנה נכשל";
      setBlocked(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "date") {
    const now = israelNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());

    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="מועד האספקה" onBack={() => setStep("review")} />
        </AppHeader>
        <Section className="pb-28">
          <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">בחירת מועד אספקה</h2>
          <DateCalendar
            value={pickDate}
            onSelect={setPickDate}
            isEnabled={(iso, d) =>
              d.getTime() > today.getTime() &&
              d.getTime() <= maxDate.getTime() &&
              d.getDay() !== 6 &&
              !isCutoffPassed(iso)
            }
          />

          {pickDate ? (
            <div className="mt-4 rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
              האספקה תתבצע ביום {formatDate(pickDate)}. ניתן לעדכן את ההזמנה עד יום לפני המועד בשעה 12:00.
            </div>
          ) : null}

          {askRound ? (
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-muted-foreground">סבב אספקה</div>
              <div className="flex gap-2">
                {(["morning", "noon"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPickRound(r)}
                    className={`flex-1 rounded-xl border px-3.5 py-3 text-[13.5px] font-semibold ${
                      pickRound === r ? "border-[1.5px] border-primary bg-primary-soft text-foreground" : "border-border bg-card text-foreground"
                    }`}
                  >
                    {r === "morning" ? "סבב ראשון" : "סבב שני"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>

        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button variant="secondary" size="lg" className="font-semibold" onClick={() => setStep("review")}>
              חזרה לסיכום
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!pickDate}
              onClick={() => {
                if (!pickDate) return;
                if (isCutoffPassed(pickDate)) {
                  setBlocked(`ההזמנות ל${formatDate(pickDate)} נסגרו ב${formatCutoff(pickDate)}. יש לבחור מועד אחר.`);
                  return;
                }
                setDateRound.mutate(
                  { orderId: order.id, date: pickDate, round: askRound ? pickRound : "morning" },
                  { onSuccess: () => setConfirming(true) },
                );
              }}
            >
              אישור ההזמנה
            </Button>
          </div>
        </div>

        <Modal
          open={confirming}
          title="לאשר את ההזמנה?"
          description={`סה״כ ${formatPrice(total)} (לפני מע״מ)${pickDate ? ` · ${formatDate(pickDate)}` : ""}`}
          confirmLabel="אישור"
          loading={submitting}
          onConfirm={() => void confirm()}
          onClose={() => setConfirming(false)}
        />

        <Modal
          open={blocked !== null}
          title="לא ניתן לאשר את ההזמנה"
          description={blocked ?? undefined}
          onClose={() => setBlocked(null)}
        >
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              לבירור אפשרויות חריגות, פנו לבעל המאפייה דרך דף יצירת הקשר.
            </p>
            <Button variant="primary" className="w-full font-semibold" onClick={() => navigate({ to: "/contact" })}>
              לדף יצירת הקשר
            </Button>
          </div>
        </Modal>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="סיכום ההזמנה" />
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between border-t border-border px-3.5 py-2 md:px-5">
          <h2 className="text-[15px] font-bold text-foreground">פריטי ההזמנה</h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/catalog" })}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-bold text-primary transition-opacity"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            הוספת מוצרים
          </button>
        </div>
      </AppHeader>
      <Section className="pb-28">
        <div className="mt-2 mb-2" />
        <div className="flex flex-col gap-2">
          {lines.length === 0 ? (
            <EmptyState title="לא נבחרו מוצרים" description="חזרו לקטלוג כדי להוסיף פריטים." />
          ) : (
            lines.map((line) => (
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
                  <div className="truncate text-[15px] font-bold text-foreground">{line.productName}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    קוד פריט: <span className="font-semibold text-foreground">{line.sku ?? line.productId}</span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatQty(line.qty, line.unit)} × {formatPrice(line.unitPrice)} ={" "}
                    <span className="font-semibold text-foreground">{formatPrice(line.unitPrice * line.qty)}</span>
                  </div>
                </div>
                <QuantityStepper
                  product={{ id: line.productId, unit: line.unit, minQty: 1, step: line.unit === "kg" ? 0.5 : 1, price: line.unitPrice, name: line.productName, available: true }}
                  qty={line.qty}
                  compact
                  onChange={(delta) => setQty(line.productId, Math.max(0, line.qty + delta))}
                  onSetQty={(qty) => setQty(line.productId, qty)}
                />
              </Card>
            ))
          )}
        </div>

        <div className="mt-4">
          <FormField label="הערה למאפייה (אופציונלי)">
            <TextArea
              value={noteValue}
              onChange={(e) => setNoteLocal(e.target.value)}
              onBlur={() => void setNote.mutateAsync({ orderId: order.id, note: noteValue })}
              placeholder="לדוגמה: לפרוס את הלחמים, לארוז בנפרד…"
            />
          </FormField>
        </div>

        <Card className="mt-4 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-bold text-foreground">סה״כ לתשלום <span className="text-[11px] font-normal text-muted-foreground">(לפני מע״מ)</span></span>
            <span className="text-[19px] font-bold text-foreground">{formatPrice(total)}</span>
          </div>
        </Card>

        <button
          type="button"
          onClick={doDiscard}
          className="mt-3 w-full rounded-xl border border-border bg-transparent py-2.5 text-[12.5px] font-semibold text-muted-foreground"
        >
          ביטול ההזמנה
        </button>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto flex max-w-5xl gap-2.5">
          <Button variant="secondary" size="lg" className="font-semibold" onClick={() => navigate({ to: "/catalog" })}>
            עריכת מוצרים
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={lines.length === 0}
            onClick={() => {
              setPickDate(order.date);
              setPickRound(order.round);
              setStep("date");
            }}
          >
            אישור ההזמנה
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
