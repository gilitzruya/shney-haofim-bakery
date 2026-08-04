import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { Modal } from "@/components/app/modal";
import { findProduct, roundLabel } from "@/data/catalog";
import { formatDate, formatPrice, formatQty, linesTotal, nextOccurrence, weekdaysLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { RECURRING_STATUS_LABEL } from "./recurring.index";

export const Route = createFileRoute("/recurring/$recurringId/")({
  head: () => ({
    meta: [
      { title: "פרטי הזמנה קבועה — מאפיית שני האופים" },
      { name: "description", content: "ימי אספקה, סבב חלוקה ורשימת המוצרים של ההזמנה הקבועה." },
      { property: "og:title", content: "פרטי הזמנה קבועה — מאפיית שני האופים" },
      { property: "og:description", content: "עדכון, השהיה או ביטול של הזמנה קבועה." },
    ],
  }),
  component: RecurringDetailsPage,
});

function RecurringDetailsPage() {
  const { recurringId } = useParams({ from: "/recurring/$recurringId" });
  const navigate = useNavigate();
  const { getRecurring, pauseRecurring, reactivateRecurring, cancelRecurring, startOneTimeUpdate } = useStore();
  const [cancelling, setCancelling] = useState(false);
  const rec = getRecurring(recurringId);

  if (!rec) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="הזמנה קבועה" backTo="/recurring" />
        </AppHeader>
        <Section>
          <EmptyState
            title="ההזמנה הקבועה לא נמצאה"
            action={<Button onClick={() => navigate({ to: "/recurring" })}>לכל ההזמנות הקבועות</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  const next = rec.status === "active" ? nextOccurrence(rec.weekdays) : null;

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנה קבועה" backTo="/recurring" />
      </AppHeader>
      <Section className="pb-28">
        <Card variant={rec.needsAttention ? "attention" : "active"}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold text-foreground">{rec.name}</span>
            <Chip tone={rec.status === "active" ? "neutral" : "muted"}>{RECURRING_STATUS_LABEL[rec.status]}</Chip>
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">
            {weekdaysLabel(rec.weekdays)} · {roundLabel(rec.round)}
          </div>
          {next ? <div className="mt-1 text-[12px] text-primary">האספקה הבאה: {formatDate(next)}</div> : null}
          {rec.needsAttention && rec.attentionText ? (
            <div className="mt-2.5 flex items-start gap-1.5 rounded-[10px] bg-destructive-bg px-3 py-2 text-[11.5px] font-semibold text-destructive">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              {rec.attentionText}
            </div>
          ) : null}
          {rec.note ? (
            <div className="mt-2.5 rounded-[10px] bg-card-muted px-3 py-2 text-[11.5px] text-muted-foreground">
              הערה: {rec.note}
            </div>
          ) : null}
        </Card>

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">מוצרים קבועים</h2>
        <div className="flex flex-col gap-2">
          {rec.lines.map((line) => {
            const product = findProduct(line.productId);
            if (!product) return null;
            return (
              <Card key={line.productId} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
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
            <span className="text-[13px] text-muted-foreground">סה״כ לאספקה</span>
            <span className="text-[17px] font-bold text-foreground">{formatPrice(linesTotal(rec.lines))}</span>
          </div>
        </Card>

        {rec.status !== "cancelled" ? (
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                startOneTimeUpdate(rec.id);
                navigate({ to: "/catalog" });
              }}
              className="w-full rounded-xl border border-border bg-card py-2.5 text-[12.5px] font-semibold text-foreground"
            >
              עדכון חד־פעמי לאספקה הקרובה
            </button>
            <button
              type="button"
              onClick={() => {
                if (rec.status === "active") {
                  pauseRecurring(rec.id);
                  toast.success("ההזמנה הקבועה הושהתה");
                } else {
                  reactivateRecurring(rec.id);
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
          cancelRecurring(rec.id);
          setCancelling(false);
          toast.success("ההזמנה הקבועה בוטלה");
          navigate({ to: "/recurring" });
        }}
        onClose={() => setCancelling(false)}
      />
    </AppShell>
  );
}
