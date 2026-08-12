import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import type { RoundId } from "@/data/catalog";
import { formatLongDate, formatPrice, linesCount, linesTotal } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/new-order")({
  head: () => ({
    meta: [
      { title: "הזמנה חדשה — מאפיית שני האופים" },
      { name: "description", content: "פתיחת הזמנה סיטונאית חדשה, עם אפשרות להעתיק מההזמנה הקודמת." },
      { property: "og:title", content: "הזמנה חדשה — מאפיית שני האופים" },
      { property: "og:description", content: "העתיקו מוצרים מההזמנה הקודמת או התחילו הזמנה חדשה." },
    ],
  }),
  component: NewOrderPage,
});

const ROUND: RoundId = "morning";

function NewOrderPage() {
  const navigate = useNavigate();
  const { startOrderDraft, orders, draft, hydrated } = useStore();

  /** ההזמנה האחרונה עם מוצרים */
  const lastOrder = useMemo(
    () =>
      orders
        .filter((o) => o.lines.length > 0 && o.status !== "cancelled" && o.status !== "draft")
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [orders],
  );

  const startFromScratch = () => {
    startOrderDraft(undefined, ROUND);
    navigate({ to: "/catalog" });
  };

  const copyFromLast = () => {
    if (!lastOrder) return startFromScratch();
    startOrderDraft(undefined, ROUND, lastOrder.lines);
    navigate({ to: "/catalog" });
  };

  /** הזמנה בעבודה — ממשיכים ממנה; אין הזמנות קודמות — ישר לקטלוג */
  useEffect(() => {
    if (!hydrated) return;
    if (draft) {
      navigate({ to: "/catalog", replace: true });
      return;
    }
    if (!lastOrder) {
      startOrderDraft(undefined, ROUND);
      navigate({ to: "/catalog", replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, draft, lastOrder]);

  if (!hydrated || !lastOrder || draft) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="הזמנה חדשה" />
        </AppHeader>
        <Section className="pb-28" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנה חדשה" />
      </AppHeader>
      <Section className="pb-28">
        <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-center">
          <span className="mx-auto flex size-[44px] items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Copy className="size-[20px]" />
          </span>
          <h2 className="mt-3 text-[15px] font-bold text-foreground">להעתיק מוצרים מההזמנה הקודמת?</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {formatLongDate(lastOrder.date)} • {linesCount(lastOrder.lines)} מוצרים •{" "}
            {formatPrice(linesTotal(lastOrder.lines))}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            המוצרים והכמויות יועתקו להזמנה החדשה ותוכלו לערוך אותם. מועד האספקה נבחר בסוף, באישור ההזמנה
          </p>

          <div className="mt-4 flex gap-2.5">
            <Button className="flex-1" pill onClick={copyFromLast}>
              <Check className="size-[16px]" />
              כן
            </Button>
            <Button variant="outline" className="flex-1" pill onClick={startFromScratch}>
              <X className="size-[16px]" />
              לא
            </Button>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
