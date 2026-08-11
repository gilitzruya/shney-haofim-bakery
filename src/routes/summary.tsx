import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { FlowBanner } from "@/components/app/flow-banner";
import { FormField, TextArea } from "@/components/app/form-controls";
import { Modal } from "@/components/app/modal";
import { ProductPlaceholder, QuantityStepper } from "@/components/app/product-card";

import { findProduct } from "@/data/catalog";
import { productImage } from "@/data/product-images";
import { formatCutoff, isCutoffPassed } from "@/lib/cutoff";
import { formatDate, formatPrice, formatQty, linesTotal, weekdaysLabel } from "@/lib/format";
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
  const { draft, bumpQty, setQty, confirmDraft, discardDraft } = useStore();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [blocked, setBlocked] = useState(false);

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
            action={<Button onClick={() => navigate({ to: "/new-order" })}>הזמנה חדשה</Button>}
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

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="סיכום ההזמנה" />
      </AppHeader>
      <Section className="pb-28">
        <FlowBanner draft={draft} className="mt-1" />
        <Card className="mt-2.5">
          <div className="text-[13.5px] font-semibold text-foreground">
            {isRecurring
              ? draft.name || "הזמנה קבועה"
              : draft.date
                ? formatDate(draft.date)
                : "ללא מועד"}
          </div>
          {isRecurring && draft.weekdays?.length ? (
            <div className="mt-1 text-[12px] text-muted-foreground">{weekdaysLabel(draft.weekdays)}</div>
          ) : null}
        </Card>

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">פריטי ההזמנה</h2>
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
                    <div className="truncate text-[13.5px] font-semibold text-foreground">{product.name}</div>
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
            <span className="text-[13px] text-muted-foreground">סה״כ לתשלום <span className="text-[11px]">(לפני מע״מ)</span></span>
            <span className="text-[19px] font-bold text-foreground">{formatPrice(total)}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">המחירים אינם כוללים מע״מ.</div>
        </Card>

        <button
          type="button"
          onClick={() => {
            discardDraft();
            navigate({ to: "/" });
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
              if (!isRecurring && draft.date && isCutoffPassed(draft.date)) {
                setBlocked(true);
                return;
              }
              setConfirming(true);
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
