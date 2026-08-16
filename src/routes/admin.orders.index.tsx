import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, FileText, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { AdminOrderList } from "@/components/admin/order-list";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/app/button";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { ROUNDS } from "@/data/catalog";
import type { RoundId } from "@/data/catalog";
import { useAdminOrdersForDate } from "@/hooks/use-admin-orders";
import { tomorrowIso } from "@/lib/admin/dates";
import { summarizeDay } from "@/lib/admin/selectors";
import { formatLongDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/orders/")({
  head: () => ({
    meta: [
      { title: "הזמנות מחר — ניהול המאפייה" },
      { name: "description", content: "רשימת ההזמנות לאספקה של מחר, כולל פירוט לקוח וסבב." },
      { property: "og:title", content: "הזמנות מחר — ניהול המאפייה" },
      { property: "og:description", content: "רשימת ההזמנות לאספקה של מחר במאפיית שני האופים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrdersPage,
});

type RoundFilter = RoundId | "all";

function AdminOrdersPage() {
  const { hydrated, documents, issueDocuments } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [date, setDate] = useState(() => tomorrowIso());
  const [round, setRound] = useState<RoundFilter>("all");
  const [query, setQuery] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const views = useAdminOrdersForDate(date);
  const filtered = useMemo(
    () =>
      views.filter(
        (v) =>
          (round === "all" || v.order.round === round) &&
          (query.trim() === "" || v.customerName.includes(query.trim())),
      ),
    [views, round, query],
  );
  const summary = summarizeDay(filtered, date);
  const isTomorrow = date === tomorrowIso();

  const latestDocFor = (orderId: string) =>
    documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  const toggle = (orderId: string) =>
    setSelected((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );

  const targetIds = selected.length > 0 ? selected : filtered.map((v) => v.order.id);

  const issueTargets = async () => {
    if (targetIds.length === 0) return;
    setIssuing(true);
    try {
      await issueDocuments(targetIds);
      setSelected([]);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <AdminShell>
      <Section className="pt-5 pb-28">
        <h1 className="mb-3 flex items-center gap-2 text-[20px] font-bold text-heading">
          <ClipboardList className="size-[19px] text-primary" />
          הזמנות
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(tomorrowIso())}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[12.5px] font-bold",
              isTomorrow
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground",
            )}
          >
            <CalendarDays className="size-4" />
            מחר
          </button>
          <button
            type="button"
            onClick={openDatePicker}
            className="relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-[12.5px] font-bold text-foreground"
          >
            <CalendarDays className="size-4 text-foreground" />
            <span className="shrink-0">בחירת תאריך</span>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="בחירת תאריך אספקה"
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            />
          </button>
        </div>

        <label className="mt-2.5 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם לקוח"
            aria-label="חיפוש לפי שם לקוח"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" aria-label="ניקוי החיפוש" onClick={() => setQuery("")}>
              <X className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </label>

        <div className="mt-2.5 flex gap-2 overflow-x-auto no-scrollbar">
          {([{ id: "all" as RoundFilter, label: "הכל" }, ...ROUNDS.map((r) => ({ id: r.id as RoundFilter, label: r.label }))]).map(
            (chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setRound(chip.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-bold whitespace-nowrap",
                  round === chip.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {chip.id === "all" ? <SlidersHorizontal className="size-3.5" /> : null}
                {chip.label}
              </button>
            ),
          )}
        </div>

        <div className="sticky top-[58px] z-10 -mx-3.5 mt-3 bg-canvas/95 px-3.5 py-2 backdrop-blur md:-mx-5 md:px-5">
          <div className="overflow-hidden rounded-[16px] border border-primary/20 bg-primary-soft shadow-sm">
            <div className="flex items-center justify-between border-b border-primary/10 px-3.5 py-2">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
                <CalendarDays className="size-4" />
                {formatLongDate(date)}
              </div>
              <div className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                סיכום יום
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-primary/10 px-1 py-3 text-center">
              <Metric value={hydrated ? String(summary.ordersCount) : "—"} label="הזמנות" />
              <Metric value={hydrated ? String(summary.productsCount) : "—"} label="מוצרים" />
              <Metric value={hydrated ? formatPrice(summary.total) : "—"} label="סה״כ" />
            </div>
          </div>
        </div>


        <div className="mt-3">
          {!hydrated ? null : filtered.length === 0 ? (
            <EmptyState
              title="אין הזמנות ליום זה"
              description="אפשר לעבור ליום אחר, לשנות סינון סבב או לנקות את החיפוש."
            />
          ) : (
            <AdminOrderList
              views={filtered}
              selection={{ selected, onToggle: toggle }}
              documentFor={latestDocFor}
            />
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 z-20 bg-canvas/95 px-3.5 pb-3 pt-2 backdrop-blur md:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
          <div className="flex items-center gap-4 rounded-[16px] border border-border bg-card px-3.5 py-2 text-center">
            <div>
              <div className="text-[13px] font-bold text-heading">
                {hydrated ? formatPrice(summary.total) : "—"}
              </div>
              <div className="text-[10.5px] text-muted-foreground">סה״כ</div>
            </div>
            <div>
              <div className="text-[13px] font-bold text-heading">{hydrated ? summary.ordersCount : "—"}</div>
              <div className="text-[10.5px] text-muted-foreground">הזמנות</div>
            </div>
          </div>
          <Button className="flex-1" onClick={issueTargets} loading={issuing} disabled={targetIds.length === 0}>
            <FileText className="size-4" />
            {selected.length > 0 ? `הפקת תעודות (${selected.length})` : "הפקת תעודות משלוח"}
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1">
      <div className="text-[19px] font-extrabold text-primary md:text-[22px]">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}
