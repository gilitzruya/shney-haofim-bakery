import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { Modal } from "@/components/app/modal";
import { findProduct } from "@/data/catalog";
import { useMyPrices } from "@/hooks/use-customers";
import { useCancelRecurring, usePauseRecurring, useRecurring, useResumeRecurring } from "@/hooks/use-recurring";
import { priceFor } from "@/lib/admin/pricing";
import { formatDate, formatPrice, formatQty, weekdaysLabel } from "@/lib/format";
import { nextEditableDelivery, nextRecurringDelivery } from "@/lib/recurring";
import { RECURRING_STATUS_LABEL } from "./recurring.index";

export const Route = createFileRoute("/recurring/$recurringId/")({
  head: () => ({
    meta: [
      { title: "פרטי הזמנה קבועה — מאפיית שני האופים" },
      { name: "description", content: "ימי אספקה ורשימת המוצרים של ההזמנה הקבועה." },
      { property: "og:title", content: "פרטי הזמנה קבועה — מאפיית שני האופים" },
      { property: "og:description", content: "עדכון, השהיה או ביטול של הזמנה קבועה." },
    ],
  }),
  component: RecurringDetailsPage,
});

function RecurringDetailsPage() {
  const { recurringId } = useParams({ from: "/recurring/$recurringId/" });
  const navigate = useNavigate();
  const { recurring: rec, isLoading } = useRecurring(recurringId);
  const myPrices = useMyPrices();
  const pauseRecurring = usePauseRecurring();
  const resumeRecurring = useResumeRecurring();
  const cancelRecurring = useCancelRecurring();
  const [cancelling, setCancelling] = useState(false);

  if (!rec) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="הזמנה קבועה" backTo="/recurring" />
        </AppHeader>
        <Section>
          {isLoading ? null : (
            <EmptyState
              title="ההזמנה הקבועה לא נמצאה"
              action={<Button onClick={() => navigate({ to: "/recurring" })}>לכל ההזמנות הקבועות</Button>}
            />
          )}
        </Section>
      </AppShell>
    );
  }

  const next = rec.status === "active" ? nextRecurringDelivery(rec) : null;
  const editableNext = rec.status === "active" ? nextEditableDelivery(rec) : null;
  const nearestLocked = next && editableNext && editableNext !== next;

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנה קבועה" backTo="/recurring" />
      </AppHeader>
      <Section className="pb-28">
        <Card variant="active">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold text-foreground">{rec.name}</span>
            <Chip tone={rec.status === "active" ? "neutral" : "muted"}>{RECURRING_STATUS_LABEL[rec.status]}</Chip>
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">{weekdaysLabel(rec.weekdays)}</div>
          {rec.startDate ? (
            <div className="mt-1 text-[12px] text-muted-foreground">מתחילה מ־{formatDate(rec.startDate)}</div>
          ) : null}
          {next ? <div className="mt-1 text-[12px] text-primary">האספקה הבאה: {formatDate(next)}</div> : null}
          {rec.note ? (
            <div className="mt-2.5 rounded-[10px] bg-card-muted px-3 py-2 text-[11.5px] text-muted-foreground">
              הערה: {rec.note}
            </div>
          ) : null}
        </Card>

        {nearestLocked ? (
          <div className="mt-3 flex items-start gap-1.5 rounded-[10px] bg-card-muted px-3 py-2.5 text-[12px] font-semibold text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0 text-primary" />
            <span>
              האספקה הקרובה ({formatDate(next!)}) כבר ננעלה — עריכה תשפיע החל מהאספקה הבאה בתאריך{" "}
              {formatDate(editableNext!)}. לשינוי האספקה הקרובה יש לפנות למאפייה.
            </span>
          </div>
        ) : null}

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">מוצרים קבועים</h2>
        <div className="flex flex-col gap-2">
          {rec.lines.map((line) => {
            const product = findProduct(line.productId);
            if (!product) return null;
            const unitPrice = priceFor(product, myPrices);
            return (
              <Card key={line.productId} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-foreground">{product.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatQty(line.qty, product.unit)} × {formatPrice(unitPrice)}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-foreground">{formatPrice(unitPrice * line.qty)}</span>
              </Card>
            );
          })}
        </div>

        <Card className="mt-3 bg-card-muted">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">
              סה״כ לאספקה <span className="text-[11px]">(לפני מע״מ)</span>
            </span>
            <span className="text-[17px] font-bold text-foreground">
              {formatPrice(rec.lines.reduce((sum, l) => {
                const product = findProduct(l.productId);
                return product ? sum + priceFor(product, myPrices) * l.qty : sum;
              }, 0))}
            </span>
          </div>
        </Card>

        {rec.status !== "cancelled" ? (
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                if (rec.status === "active") {
                  pauseRecurring.mutate(rec.id);
                  toast.success("ההזמנה הקבועה הושהתה");
                } else {
                  resumeRecurring.mutate(rec.id);
                  toast.success("ההזמנה הקבועה הופעלה מחדש");
                }
              }}
              className="w-full rounded-xl border border-border bg-card py-2.5 text-[12.5px] font-semibold text-foreground"
            >
              {rec.status === "active" ? "השהיית ההזמנה הקבועה" : "הפעלה מחדש"}
            </button>
            <button
              type="button"
              onClick={() => setCancelling(true)}
              className="w-full rounded-xl border border-border bg-transparent py-2.5 text-[12.5px] font-semibold text-destructive"
            >
              ביטול ההזמנה הקבועה
            </button>
          </div>
        ) : null}
      </Section>

      {rec.status !== "cancelled" ? (
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto max-w-5xl">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate({ to: "/recurring/$recurringId/edit", params: { recurringId: rec.id } })}
            >
              עריכת ההזמנה הקבועה
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={cancelling}
        title="לבטל את ההזמנה הקבועה?"
        description="ההזמנה תפסיק להישלח למאפייה בימי האספקה שנבחרו."
        confirmLabel="ביטול"
        cancelLabel="השארה"
        destructive
        onConfirm={() => {
          cancelRecurring.mutate(rec.id);
          setCancelling(false);
          toast.success("ההזמנה הקבועה בוטלה");
          navigate({ to: "/recurring" });
        }}
        onClose={() => setCancelling(false)}
      />
    </AppShell>
  );
}
