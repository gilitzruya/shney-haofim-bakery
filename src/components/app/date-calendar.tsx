import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

import { WEEKDAY_LABELS } from "@/data/catalog";
import { israelNow } from "@/lib/cutoff";
import { toIso } from "@/lib/format";
import { cn } from "@/lib/utils";

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

const now = israelNow();
const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());
export const TODAY_ISO = toIso(TODAY);

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ iso: string; date: Date } | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ iso: toIso(d), date: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface DateCalendarProps {
  value: string | null;
  onSelect: (iso: string) => void;
  /** true = ניתן לבחירה */
  isEnabled: (iso: string, date: Date) => boolean;
  renderMarks?: ((iso: string, date: Date) => ReactNode) | undefined;
}

/** לוח שנה חודשי (7 עמודות) עם ניווט בין חודשים */
export function DateCalendar({ value, onSelect, isEnabled, renderMarks }: DateCalendarProps) {
  const [month, setMonth] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const cells = buildMonth(month.year, month.month);
  const canGoBack = new Date(month.year, month.month, 1) > new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const shiftMonth = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
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
            (() => {
              const enabled = isEnabled(cell.iso, cell.date);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!enabled}
                  onClick={() => onSelect(cell.iso)}
                  className={cn(
                    "flex h-[44px] items-center justify-center rounded-lg border text-[13.5px] font-bold",
                    value === cell.iso
                      ? "border-[1.5px] border-primary bg-primary-soft text-foreground"
                      : "border-border bg-card text-foreground",
                    !enabled && "cursor-not-allowed border-transparent bg-card-muted text-muted-foreground opacity-40",
                    cell.iso === TODAY_ISO && "relative border-[1.5px] border-dashed !border-primary",
                  )}
                >
                  <span className="flex flex-col items-center leading-none">
                    {cell.date.getDate()}
                    {cell.iso === TODAY_ISO ? (
                      <span className="mt-0.5 text-[8px] font-semibold text-primary">היום</span>
                    ) : null}
                    {renderMarks?.(cell.iso, cell.date)}
                  </span>
                </button>
              );
            })()
          ),
        )}
      </div>
    </div>
  );
}
