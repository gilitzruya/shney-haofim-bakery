import { CalendarPlus, FilePen, PencilLine, Repeat, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useStore, type CartDraft } from "@/store/app-store";

export interface FlowInfo {
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Describes which flow the current cart draft belongs to. */
export function useFlowInfo(draft: CartDraft | null): FlowInfo | null {
  const { getOrder } = useStore();
  if (!draft) return null;

  if (draft.mode === "recurring_create") {
    return {
      label: "הזמנה קבועה חדשה",
      description: "בחירת המוצרים שיישלחו בכל אחד מימי האספקה הקבועים",
      icon: Repeat,
    };
  }
  if (draft.mode === "recurring_edit") {
    return {
      label: "עדכון הזמנה קבועה",
      description: `שינוי המוצרים בהזמנה הקבועה${draft.name ? ` ״${draft.name}״` : ""} — לכל האספקות הבאות`,
      icon: PencilLine,
    };
  }
  if (draft.mode === "onetime") {
    return {
      label: "עדכון חד־פעמי להזמנה קבועה",
      description: `עדכון חד־פעמי להזמנה קבועה${draft.name ? ` ״${draft.name}״` : ""} — לאספקה הקרובה בלבד. ההזמנה הקבועה לא תשתנה`,
      icon: RotateCcw,
    };
  }
  if (draft.orderId) {
    const order = getOrder(draft.orderId);
    if (order?.status === "draft") {
      return {
        label: "עדכון טיוטה",
        description: "השלמת טיוטת הזמנה שטרם נשלחה למאפייה",
        icon: FilePen,
      };
    }
    return {
      label: "עדכון הזמנה מאושרת",
      description: "שינוי הזמנה שכבר נשלחה למאפייה — יש לאשר מחדש בסיום",
      icon: PencilLine,
    };
  }
  return {
    label: "הזמנה חדשה",
    description: "בחירת מוצרים להזמנה חד־פעמית חדשה",
    icon: CalendarPlus,
  };
}

/** Compact banner shown on catalog + summary so the user knows which flow they are in. */
export function FlowBanner({
  draft,
  className,
  compact = false,
}: {
  draft: CartDraft | null;
  className?: string | undefined;
  compact?: boolean | undefined;
}) {
  const info = useFlowInfo(draft);
  if (!info) return null;
  const Icon = info.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary-soft px-3 py-2.5",
        className,
      )}
    >
      <span className="mt-[1px] flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-card text-primary">
        <Icon className="size-[15px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-foreground">{info.label}</span>
        </div>
        {compact ? null : (
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{info.description}</p>
        )}
      </div>
    </div>
  );
}
