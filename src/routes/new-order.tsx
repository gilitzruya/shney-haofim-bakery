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
        <div className="grid grid-cols-4 gap-2">
          {days.map((d) => (
            <button
              key={d.iso}
              type="button"
              disabled={d.disabled}
              onClick={() => setDate(d.iso)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2.5",
                date === d.iso ? "border-[1.5px] border-primary bg-primary-soft" : "border-border bg-card",
                d.disabled && "opacity-40",
              )}
            >
              <span className="text-[10px] text-muted-foreground">
                {WEEKDAY_LABELS[d.date.getDay()]}
              </span>
              <span className="text-[15px] font-bold text-foreground">{d.date.getDate()}</span>
              <span className="text-[9.5px] text-muted-foreground">
                {d.date.toLocaleDateString("he-IL", { month: "short" })}
              </span>
            </button>
          ))}
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
