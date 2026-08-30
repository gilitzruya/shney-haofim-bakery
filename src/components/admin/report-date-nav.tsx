import { ChevronLeft, ChevronRight } from "lucide-react";

import { shiftIso, tomorrowIso } from "@/lib/admin/dates";
import { formatDate, formatWeekday } from "@/lib/format";

/** בורר יום אספקה משותף למסכי הניהול. */
export function ReportDateNav({
  date,
  onChange,
}: {
  date: string;
  onChange: (iso: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[14px] border border-border bg-card px-2 py-2 print:hidden">
      <button
        type="button"
        aria-label="יום קודם"
        onClick={() => onChange(shiftIso(date, -1))}
        className="flex size-8 items-center justify-center rounded-[10px] border border-border text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
      <div className="text-center">
        <div className="text-[13.5px] font-bold text-heading">
          {formatWeekday(date)}, {formatDate(date)}
        </div>
        <button
          type="button"
          onClick={() => onChange(tomorrowIso())}
          className="text-[11px] font-semibold text-primary"
        >
          חזרה למחר
        </button>
      </div>
      <button
        type="button"
        aria-label="יום הבא"
        onClick={() => onChange(shiftIso(date, 1))}
        className="flex size-8 items-center justify-center rounded-[10px] border border-border text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}
