import { Copy } from "lucide-react";

import { Button } from "@/components/app/button";
import { formatLongDate, linesCount } from "@/lib/format";
import type { OrderLine } from "@/data/seed";

type Props = {
  date: string;
  lines: OrderLine[];
  onConfirm: () => void;
  onDecline: () => void;
};

/** חלון מודאלי קצר: פתיחת הזמנה חדשה — להתחיל מההזמנה הקודמת או מאפס */
export function CopyLastOrderPrompt({ date, lines, onConfirm, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-foreground/45" onClick={onDecline} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="התחלת הזמנה חדשה"
        className="relative w-full max-w-xs rounded-2xl border border-border bg-card p-5 text-center shadow-xl"
      >
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Copy className="size-5" />
        </div>

        <h2 className="mt-3 text-[16px] font-bold text-foreground">הזמנה חדשה</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          להתחיל מההזמנה הקודמת? {formatLongDate(date)} • {linesCount(lines)} מוצרים
        </p>

        <div className="mt-4 flex items-center gap-2.5">
          <Button pill className="flex-1" onClick={onConfirm}>
            כן, העתיקו
          </Button>
          <Button variant="outline" pill className="flex-1" onClick={onDecline}>
            מאפס
          </Button>
        </div>
      </div>
    </div>
  );
}



