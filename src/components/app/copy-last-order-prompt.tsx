import { Check, X } from "lucide-react";

import { Button } from "@/components/app/button";
import { formatLongDate, formatPrice, linesCount, linesTotal } from "@/lib/format";
import type { OrderLine } from "@/data/seed";

type Props = {
  date: string;
  lines: OrderLine[];
  onConfirm: () => void;
  onDecline: () => void;
};

/** חלון מודאלי מעל הקטלוג: פתיחת הזמנה חדשה — להתחיל מההזמנה הקודמת או מאפס */
export function CopyLastOrderPrompt({ date, lines, onConfirm, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-foreground/45" onClick={onDecline} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="התחלת הזמנה חדשה"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-xl"
      >
        <span className="mx-auto inline-flex items-center rounded-full bg-primary/15 px-3.5 py-1.5 text-[14px] font-extrabold text-primary">
          הזמנה חדשה
        </span>


        <h2 className="mt-4 text-[16px] font-bold text-foreground">
          להעתיק מוצרים מההזמנה הקודמת?
        </h2>
        <p className="mt-2 text-[14px] font-normal text-muted-foreground">
          {formatLongDate(date)} • {linesCount(lines)} מוצרים • {formatPrice(linesTotal(lines))}
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          המוצרים והכמויות יועתקו להזמנה החדשה ותוכלו לערוך אותם לפני האישור
        </p>


        <div className="mt-5 flex flex-row-reverse items-center gap-2.5">
          <Button pill className="flex-1" onClick={onConfirm}>
            <Check className="size-[16px]" />
            כן
          </Button>
          <Button variant="outline" pill className="flex-1" onClick={onDecline}>
            <X className="size-[16px]" />
            לא
          </Button>
        </div>
      </div>
    </div>
  );
}


