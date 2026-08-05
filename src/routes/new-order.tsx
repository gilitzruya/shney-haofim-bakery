import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { RoundSelector } from "@/components/app/form-controls";
import { ROUNDS, WEEKDAY_LABELS, type RoundId } from "@/data/catalog";
import { formatLongDate, toIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/new-order")({
  head: () => ({
    meta: [
      { title: "הזמנה חדשה — מאפיית שני האופים" },
      { name: "description", content: "בחירת מועד אספקה וסבב חלוקה להזמנה סיטונאית חדשה." },
      { property: "og:title", content: "הזמנה חדשה — מאפיית שני האופים" },
      { property: "og:description", content: "בחרו תאריך אספקה וסבב חלוקה ועברו לקטלוג המוצרים." },
    ],
  }),
  component: NewOrderPage,
});

const TODAY = new Date(2026, 7, 3);
const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

/** Full month grid (7 columns), padded with blanks before the 1st. */
function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ iso: string; date: Date; disabled: boolean } | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const isPast = d.getTime() <= TODAY.getTime();
    cells.push({ iso: toIso(d), date: d, disabled: isPast || d.getDay() === 6 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function NewOrderPage() {
  const navigate = useNavigate();
  const { startOrderDraft } = useStore();
  const [month, setMonth] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const [date, setDate] = useState<string | null>(null);
  const [round, setRound] = useState<RoundId>(ROUNDS[0]!.id);

  const cells = buildMonth(month.year, month.month);
  const canGoBack = new Date(month.year, month.month, 1) > new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const shiftMonth = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const proceed = () => {
    if (!date) return;
    startOrderDraft(date, round);
    navigate({ to: "/catalog" });
  };


  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנה חדשה" backTo="/" />
      </AppHeader>
      <Section className="pb-28">

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">בחירת מועד אספקה</h2>

        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoBack}
              aria-label="חודש קודם"
              className={cn(
                "flex size-8 items-center justify-center rounded-lg border border-border",
                !canGoBack && "opacity-30",
              )}
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="text-[13.5px] font-bold text-foreground">
              {HE_MONTHS[month.month]} {month.year}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="חודש הבא"
              className="flex size-8 items-center justify-center rounded-lg border border-border"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-1 text-center text-[10.5px] font-semibold text-muted-foreground">
                {label}
              </div>
            ))}
            {cells.map((cell, i) =>
              cell === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => setDate(cell.iso)}
                  className={cn(
                    "flex h-[38px] items-center justify-center rounded-lg border text-[13.5px] font-bold",
                    date === cell.iso
                      ? "border-[1.5px] border-primary bg-primary-soft text-foreground"
                      : "border-border bg-card text-foreground",
                    cell.disabled && "cursor-not-allowed border-transparent bg-card-muted text-muted-foreground opacity-40",
                  )}
                >
                  {cell.date.getDate()}
                </button>
              ),
            )}
          </div>
        </div>


        <h2 className="mt-5 mb-2 text-[15px] font-bold text-foreground">בחירת סבב חלוקה</h2>
        <RoundSelector value={round} onChange={setRound} />

        {date ? (
          <div className="mt-4 rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
            האספקה תתבצע ביום {formatLongDate(date)}. ניתן לעדכן את ההזמנה עד יום לפני המועד בשעה 14:00.
          </div>
        ) : null}
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          <Button size="lg" className="w-full" disabled={!date} onClick={proceed}>
            המשך לבחירת מוצרים
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
