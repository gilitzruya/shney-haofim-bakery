import { Copy, ShoppingBasket } from "lucide-react";

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
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-center shadow-xl"
      >
        <span className="mx-auto inline-flex items-center rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
          הזמנה חדשה
        </span>
        <h2 className="mt-2.5 text-[16px] font-bold text-foreground">נתחיל את ההזמנה החדשה</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          אפשר להתחיל מההזמנה הקודמת שלכם ולחסוך זמן, או לבחור מוצרים מהקטלוג מאפס.
        </p>

        <div className="mt-3 rounded-xl border border-border bg-background p-2.5 text-start">
          <p className="text-[11.5px] font-bold text-muted-foreground">ההזמנה הקודמת</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-foreground">
            {formatLongDate(date)} • {linesCount(lines)} מוצרים • {formatPrice(linesTotal(lines))}
          </p>
        </div>

        <p className="mt-2 text-[12px] text-muted-foreground">
          המוצרים והכמויות יועתקו כטיוטה ותוכלו לשנות הכל. מועד האספקה נבחר בסוף, באישור ההזמנה.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button pill onClick={onConfirm}>
            <Copy className="size-[16px]" />
            העתיקו את ההזמנה הקודמת
          </Button>
          <Button variant="outline" pill onClick={onDecline}>
            <ShoppingBasket className="size-[16px]" />
            אתחיל מאפס
          </Button>
        </div>
      </div>
    </div>
  );
}

