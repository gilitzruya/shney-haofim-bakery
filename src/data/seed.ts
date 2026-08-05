import { CATEGORIES } from "./catalog";
import type { RoundId } from "./catalog";

export type OrderStatus = "draft" | "approved" | "needs_update" | "reopened" | "completed" | "cancelled";

export interface OrderLine {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  /** ISO date of the delivery day */
  date: string;
  round: RoundId;
  status: OrderStatus;
  lines: OrderLine[];
  /** locked for changes (past cutoff) */
  closed?: boolean | undefined;
  note?: string | undefined;
  createdFrom?: "manual" | "recurring" | undefined;
  cutoffText?: string | undefined;
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
  note?: string | undefined;
  needsAttention?: boolean | undefined;
  attentionText?: string | undefined;
}

export const SEED_ORDERS: Order[] = [];

export const SEED_RECURRING: RecurringOrder[] = [];

/** Product ids that exist in the catalog, used to flag stale recurring lines. */
export const CATALOG_PRODUCT_IDS = new Set(CATEGORIES.flatMap((c) => c.products.map((p) => p.id)));
