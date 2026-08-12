import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { FormField, TextArea } from "@/components/app/form-controls";
import { Modal } from "@/components/app/modal";
import { ProductPlaceholder, QuantityStepper } from "@/components/app/product-card";
import { DateCalendar } from "@/components/app/date-calendar";

import { findProduct } from "@/data/catalog";
import { productImage } from "@/data/product-images";
import { formatCutoff, israelNow, isCutoffPassed } from "@/lib/cutoff";
import { formatDate, formatLongDate, formatPrice, formatQty, linesTotal, parseDate, weekdaysLabel } from "@/lib/format";
import { linesFromQuantities, useStore } from "@/store/app-store";

export const Route = createFileRoute("/summary")({
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

function SummaryPage() {
  const navigate = useNavigate();
  const { draft, bumpQty, setQty, confirmDraft, discardDraft, setDraft, orders, recurring } = useStore();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [step, setStep] = useState<"review" | "date">("review");
  const [pickDate, setPickDate] = useState<string | null>(null);

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
            action={<Button onClick={() => navigate({ to: "/catalog" })}>הזמנה חדשה</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  const lines = linesFromQuantities(draft.quantities);
  const total = linesTotal(lines);
  const isRecurring = draft.mode === "recurring_create" || draft.mode === "recurring_edit";

  const confirm = () => {
    if (!isRecurring && draft.date && isCutoffPassed(draft.date)) {
      setConfirming(false);
      setBlocked(true);
      return;
    }
    const result = confirmDraft();
    setConfirming(false);
    if (isRecurring) {
      toast.success("ההזמנה הקבועה נשמרה");
      navigate({ to: "/recurring" });
      return;
    }
    toast.success("ההזמנה אושרה ונשלחה למאפייה");
    if (result && "date" in result) {
      navigate({ to: "/orders/$orderId", params: { orderId: result.id } });
    } else {
      navigate({ to: "/orders" });
    }
  };

  if (step === "date") {
    const now = israelNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
    const conflictOrder = pickDate
      ? orders.find(
          (o) =>
            o.date === pickDate &&
            (o.status === "approved" ||
              o.status === "completed" ||
              o.status === "needs_update" ||
              o.status === "reopened"),
        )
      : undefined;
    const conflictRecurring =
      pickDate && !conflictOrder
        ? recurring.find((r) => r.status === "active" && r.weekdays.includes(parseDate(pickDate).getDay()))
        : undefined;

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

          {pickDate && conflictOrder ? (
            <div className="mt-4 rounded-xl border border-primary/35 bg-primary-soft p-3.5 text-[12.5px] text-foreground">
              כבר קיימת הזמנה {conflictOrder.status === "completed" ? "שסופקה" : "מאושרת"} ל
              {formatLongDate(pickDate)}.
            </div>
          ) : pickDate && conflictRecurring ? (
            <div className="mt-4 rounded-xl border border-primary/35 bg-primary-soft p-3.5 text-[12.5px] text-foreground">
              קיימת הזמנה קבועה ({conflictRecurring.name}) ל{formatLongDate(pickDate)}.
            </div>
          ) : pickDate ? (
            <div className="mt-4 rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
              האספקה תתבצע ביום {formatLongDate(pickDate)}. ניתן לעדכן את ההזמנה עד יום לפני המועד בשעה 12:00.
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
                if (isCutoffPassed(pickDate)) return setBlocked(true);
                setDraft({ ...draft, date: pickDate });
                setConfirming(true);
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
          onConfirm={confirm}
          onClose={() => setConfirming(false)}
        />

        <Modal
          open={blocked}
          title="מועד ההזמנה נסגר"
          description={
            pickDate
              ? `ההזמנות ל${formatDate(pickDate)} נסגרו ב${formatCutoff(pickDate)}. יש לבחור מועד אחר.`
              : "לא ניתן לאשר את ההזמנה — מועד סגירת ההזמנות חלף."
          }
          onClose={() => setBlocked(false)}
        />
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
        {isRecurring ? (
          <div className="mt-1 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-2.5">
            <div className="text-[13.5px] font-semibold text-foreground">{draft.name || "הזמנה קבועה"}</div>
            {draft.weekdays?.length ? (
              <div className="mt-1 text-[12px] text-muted-foreground">{weekdaysLabel(draft.weekdays)}</div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 mb-2" />
        <div className="flex flex-col gap-2">
          {lines.length === 0 ? (
            <EmptyState title="לא נבחרו מוצרים" description="חזרו לקטלוג כדי להוסיף פריטים." />
          ) : (
            lines.map((line) => {
              const product = findProduct(line.productId);
              if (!product) return null;
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
                      {formatQty(line.qty, product.unit)} × {formatPrice(product.price)} ={" "}
                      <span className="font-semibold text-foreground">
                        {formatPrice(product.price * line.qty)}
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

        <div className="mt-4">
          <FormField label="הערה למאפייה (אופציונלי)">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
          onClick={() => {
            discardDraft();
            navigate({ to: "/catalog" });
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
          <Button size="lg" className="flex-1" disabled={lines.length === 0} onClick={() => {
              if (isRecurring) {
                setConfirming(true);
                return;
              }
              setPickDate(draft.date ?? null);
              setStep("date");
            }}>
            {isRecurring ? "שמירת ההזמנה הקבועה" : "אישור ההזמנה"}
          </Button>
        </div>
      </div>

      <Modal
        open={confirming}
        title={isRecurring ? "לשמור את ההזמנה הקבועה?" : "לאשר את ההזמנה?"}
        description={
          isRecurring
            ? "ההזמנה תישלח למאפייה בכל אחד מימי האספקה שנבחרו."
            : `סה״כ ${formatPrice(total)} (לפני מע״מ)${draft.date ? ` · ${formatDate(draft.date)}` : ""}`
        }
        confirmLabel="אישור"
        onConfirm={confirm}
        onClose={() => setConfirming(false)}
      />

      <Modal
        open={blocked}
        title="מועד ההזמנה נסגר"
        description={
          draft.date
            ? `ההזמנות ל${formatDate(draft.date)} נסגרו ב${formatCutoff(draft.date)}. לא ניתן לאשר את ההזמנה במערכת.`
            : "לא ניתן לאשר את ההזמנה — מועד סגירת ההזמנות חלף."
        }
        onClose={() => setBlocked(false)}
      >
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            לא ניתן לאשר הזמנה במערכת למועד שעבר את שעת הסגירה. לבירור אפשרויות חריגות, פנו לבעל המאפייה דרך דף יצירת הקשר.
          </p>
          <Button
            variant="primary"
            className="w-full font-semibold"
            onClick={() => navigate({ to: "/contact" })}
          >
            לדף יצירת הקשר
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
