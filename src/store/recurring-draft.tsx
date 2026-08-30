import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { RoundId } from "@/data/catalog";

/** מצב ה-wizard של יצירת/עריכת הזמנה קבועה, פרוש על שלושה routes נפרדים (`/recurring/new`
 * → `/catalog` → `/summary`). in-memory בלבד, בכוונה — `recurring_orders` אין לה סטטוס
 * "טיוטה" (בניגוד ל-`orders`), כך שאין ל-wizard הזה שום ייצוג ב-DB לפני שמירה סופית, ואין
 * דרישת PRD ש-wizard כזה ישרוד רענון מלא של הדף. */
export type RecurringDraftMode = "recurring_create" | "recurring_edit";

export interface RecurringDraft {
  mode: RecurringDraftMode;
  /** מזהה ההזמנה הקבועה הנערכת, במצב עריכה. */
  recurringId?: string | undefined;
  round: RoundId;
  name?: string | undefined;
  weekdays?: number[] | undefined;
  startDate?: string | undefined;
  note?: string | undefined;
  quantities: Record<string, number>;
}

interface StartInput {
  recurringId?: string | undefined;
  round: RoundId;
  name?: string | undefined;
  weekdays?: number[] | undefined;
  startDate?: string | undefined;
  note?: string | undefined;
  quantities?: Record<string, number> | undefined;
}

interface RecurringDraftContextValue {
  draft: RecurringDraft | null;
  start: (mode: RecurringDraftMode, input: StartInput) => void;
  setQty: (productId: string, qty: number) => void;
  bumpQty: (productId: string, delta: number) => void;
  clear: () => void;
}

const RecurringDraftContext = createContext<RecurringDraftContextValue | null>(null);

export function RecurringDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RecurringDraft | null>(null);

  const start = useCallback((mode: RecurringDraftMode, input: StartInput) => {
    setDraft({
      mode,
      recurringId: input.recurringId,
      round: input.round,
      name: input.name,
      weekdays: input.weekdays,
      startDate: input.startDate,
      note: input.note,
      quantities: input.quantities ?? {},
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const quantities = { ...prev.quantities };
      if (qty <= 0) delete quantities[productId];
      else quantities[productId] = qty;
      return { ...prev, quantities };
    });
  }, []);

  const bumpQty = useCallback((productId: string, delta: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const current = prev.quantities[productId] ?? 0;
      const next = current + delta;
      const quantities = { ...prev.quantities };
      if (next <= 0) delete quantities[productId];
      else quantities[productId] = next;
      return { ...prev, quantities };
    });
  }, []);

  const clear = useCallback(() => setDraft(null), []);

  const value = useMemo(
    () => ({ draft, start, setQty, bumpQty, clear }),
    [draft, start, setQty, bumpQty, clear],
  );

  return <RecurringDraftContext.Provider value={value}>{children}</RecurringDraftContext.Provider>;
}

export function useRecurringDraft(): RecurringDraftContextValue {
  const ctx = useContext(RecurringDraftContext);
  if (!ctx) throw new Error("useRecurringDraft must be used within RecurringDraftProvider");
  return ctx;
}

/** ממיר `quantities` לרשימת שורות `{productId, qty}` — אותה צורה שה-DB מצפה לה
 * (`recurring_order_lines`), בלי מחיר (הוא תמיד מחושב חי, ראו `use-recurring.ts`). */
export function linesFromQuantities(
  quantities: Record<string, number>,
): { productId: string; qty: number }[] {
  return Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, qty }));
}
