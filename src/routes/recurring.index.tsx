import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { FilterChips } from "@/components/app/tabs";
import { roundLabel } from "@/data/catalog";
import { formatDate, formatPrice, linesCount, linesTotal, nextOccurrence, weekdaysLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/recurring/")({
  head: () => ({
    meta: [
      { title: "הזמנות קבועות — מאפיית שני האופים" },
      { name: "description", content: "ניהול הזמנות קבועות שבועיות: השהיה, הפעלה מחדש ועדכון מוצרים." },
      { property: "og:title", content: "הזמנות קבועות — מאפיית שני האופים" },
      { property: "og:description", content: "כל ההזמנות הקבועות של העסק במקום אחד." },
    ],
  }),
  component: RecurringListPage,
});

type FilterId = "all" | "active" | "paused" | "cancelled";

export const RECURRING_STATUS_LABEL = {
  active: "פעילה",
  paused: "מושהית",
  cancelled: "בוטלה",
} as const;

function RecurringListPage() {
  const { recurring } = useStore();
  const [filter, setFilter] = useState<FilterId>("all");
  const list = recurring.filter((r) => filter === "all" || r.status === filter);

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנות קבועות" backTo="/" />
      </AppHeader>
      <Section className="pb-28">
        <FilterChips
          chips={[
            { id: "all", label: "הכול" },
            { id: "active", label: "פעילות" },
            { id: "paused", label: "מושהות" },
            { id: "cancelled", label: "מבוטלות" },
          ]}
          value={filter}
          onChange={setFilter}
        />

        <div className="mt-3.5 flex flex-col gap-2.5">
          {list.length === 0 ? (
            <EmptyState title="אין הזמנות קבועות" description="אפשר ליצור הזמנה קבועה שתישלח אוטומטית בכל שבוע." />
          ) : (
            list.map((rec) => {
              const next = rec.status === "active" ? nextOccurrence(rec.weekdays) : null;
              return (
                <Link
                  key={rec.id}
                  to="/recurring/$recurringId"
                  params={{ recurringId: rec.id }}
                  className="no-underline"
                >
                  <Card
                    variant={
                      rec.needsAttention ? "attention" : rec.status === "active" ? "active" : "muted"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground">{rec.name}</span>
                      <Chip tone={rec.status === "active" ? "neutral" : "muted"}>
                        {RECURRING_STATUS_LABEL[rec.status]}
                      </Chip>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {weekdaysLabel(rec.weekdays)} · {roundLabel(rec.round)} · {linesCount(rec.lines)} מוצרים
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11.5px] text-muted-foreground">
                        {next ? `האספקה הבאה: ${formatDate(next)}` : "אין אספקה מתוכננת"}
                      </span>
                      <span className="text-[13px] font-bold text-foreground">
                        {formatPrice(linesTotal(rec.lines))}
                      </span>
                    </div>
                    {rec.needsAttention && rec.attentionText ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-[10px] bg-destructive-bg px-3 py-2 text-[11.5px] font-semibold text-destructive">
                        <AlertTriangle className="mt-px size-3.5 shrink-0" />
                        {rec.attentionText}
                      </div>
                    ) : null}
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          <Link to="/recurring/new" className="no-underline">
            <Button size="lg" className="w-full">
              <Plus className="size-4" />
              הזמנה קבועה חדשה
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
