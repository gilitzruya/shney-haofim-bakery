import { Check, Copy, X } from "lucide-react";

import { Button } from "@/components/app/button";
import { formatLongDate, formatPrice, linesCount, linesTotal } from "@/lib/format";
import type { OrderLine } from "@/data/seed";

type Props = {
  date: string;
  lines: OrderLine[];
  onConfirm: () => void;
  onDecline: () => void;
};

/** חלון מודאלי מעל הקטלוג: להעתיק מוצרים מההזמנה הקודמת? */
export function CopyLastOrderPrompt({ date, lines, onConfirm, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-foreground/45" onClick={onDecline} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="להעתיק מוצרים מההזמנה הקודמת?"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-center shadow-xl"
      >
        <span className="mx-auto flex size-[44px] items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Copy className="size-[20px]" />
        </span>
        <h2 className="mt-3 text-[15px] font-bold text-foreground">להעתיק מוצרים מההזמנה הקודמת?</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {formatLongDate(date)} • {linesCount(lines)} מוצרים • {formatPrice(linesTotal(lines))}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          המוצרים והכמויות יועתקו להזמנה החדשה ותוכלו לערוך אותם. מועד האספקה נבחר בסוף, באישור ההזמנה
        </p>

        <div className="mt-4 flex gap-2.5">
          <Button className="flex-1" pill onClick={onConfirm}>
            <Check className="size-[16px]" />
            כן
          </Button>
          <Button variant="outline" className="flex-1" pill onClick={onDecline}>
            <X className="size-[16px]" />
            לא
          </Button>
        </div>
      </div>
    </div>
  );
}
