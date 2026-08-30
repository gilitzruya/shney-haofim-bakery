import type { RoundId } from "./catalog";

/** הזמנות חד-פעמיות עברו כולן ל-DB (שלב 3, `src/hooks/use-orders.ts`) — מה שנשאר כאן
 * משרת רק את זרימת ההזמנות הקבועות, שעדיין על ה-store הישן עד שלב 4/5. */

export interface OrderLine {
  productId: string;
  qty: number;
}

export type RecurringStatus = "active" | "paused" | "cancelled";

export interface RecurringOrder {
  id: string;
  name: string;
  /** 0 = Sunday … 5 = Friday */
  weekdays: number[];
  round: RoundId;
  status: RecurringStatus;
  lines: OrderLine[];
  /** ISO date of the first delivery of this recurring order */
  startDate?: string | undefined;
  note?: string | undefined;
  needsAttention?: boolean | undefined;
  attentionText?: string | undefined;
}

export const SEED_RECURRING: RecurringOrder[] = [];
