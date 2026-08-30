import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { RoundId } from "@/data/catalog";
import { SEED_RECURRING } from "@/data/seed";
import type { OrderLine, RecurringOrder } from "@/data/seed";
import { roundQty } from "@/lib/format";
import { findProduct } from "@/data/catalog";

import { accountingAdapter, type AdminDocument, type DocumentType } from "@/lib/admin/accounting";
import {
  applyRuntimeCutoffExceptions,
  applyRuntimeCutoffRules,
  DEFAULT_CUTOFF_RULES,
  normalizeCutoffRules,
  type CutoffException,
  type CutoffRule,
} from "@/lib/admin/cutoff-rules";

const STORAGE_KEY = "bakery-demo-state:v21";

/** הזמנה קבועה שנוצרה על ידי המאפייה בשם לקוח מסוים. */
export interface AdminRecurringOrder {
  id: string;
  customerId: string;
  name: string;
  /** 0 = ראשון … 5 = שישי */
  weekdays: number[];
  round: RoundId;
  lines: OrderLine[];
  startDate?: string | undefined;
}

/** שני המצבים הנותרים כאן שייכים לבניית/עריכת הזמנה קבועה בלבד — הזמנה חד-פעמית
 * עברה כולה ל-DB בשלב 3 (`useCartOrder`, `src/hooks/use-orders.ts`), וה"עדכון חד-פעמי"
 * הוסר (החלטה 5) כי הוא היה תלוי במערך `orders` שכבר לא קיים כאן. */
export type CartMode = "recurring_create" | "recurring_edit";

export interface CartDraft {
  mode: CartMode;
  /** recurring id when editing an existing recurring order */
  recurringId?: string | undefined;
  round: RoundId;
  /** recurring create/edit form values */
  name?: string | undefined;
  weekdays?: number[] | undefined;
  /** first delivery date for a new recurring order */
  startDate?: string | undefined;
  quantities: Record<string, number>;
}

interface PersistedState {
  recurring: RecurringOrder[];
  draft: CartDraft | null;
  /** admin side: issued accounting documents */
  documents: AdminDocument[];
  /** admin side: recurring orders created on behalf of customers */
  adminRecurring: AdminRecurringOrder[];
  /** admin side: per-weekday ordering cutoff rules */
  cutoffRules: CutoffRule[];
  /** admin side: one-off exceptions (holidays, closed days, early cutoffs) */
  cutoffExceptions: CutoffException[];
}

const emptyDraft = (mode: CartMode): CartDraft => ({
  mode,
  round: "morning",
  quantities: {},
});

const initialState: PersistedState = {
  recurring: SEED_RECURRING,
  draft: null,
  documents: [],
  adminRecurring: [],
  cutoffRules: DEFAULT_CUTOFF_RULES,
  cutoffExceptions: [],
};

function loadState(): PersistedState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      recurring: parsed.recurring ?? SEED_RECURRING,
      draft: parsed.draft ?? null,
      documents: parsed.documents ?? [],
      adminRecurring: parsed.adminRecurring ?? [],
      cutoffRules: normalizeCutoffRules(parsed.cutoffRules),
      cutoffExceptions: parsed.cutoffExceptions ?? [],
    };
  } catch {
    return initialState;
  }
}

export function linesFromQuantities(q: Record<string, number>): OrderLine[] {
  return Object.entries(q)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, qty }));
}

export function quantitiesFromLines(lines: OrderLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  lines.forEach((l) => {
    out[l.productId] = l.qty;
  });
  return out;
}

interface StoreValue extends PersistedState {
  hydrated: boolean;
  /* recurring */
  getRecurring: (id: string) => RecurringOrder | undefined;
  startRecurringCreate: (name: string, weekdays: number[], round: RoundId, startDate?: string) => void;
  startRecurringEdit: (id: string) => void;
  confirmDraft: () => RecurringOrder | null;
  saveRecurringDetails: (id: string, patch: Partial<RecurringOrder>) => void;
  pauseRecurring: (id: string) => void;
  reactivateRecurring: (id: string) => void;
  cancelRecurring: (id: string) => void;
  /* draft / cart (recurring-mode product picker only) */
  draft: CartDraft | null;
  setDraft: (draft: CartDraft | null) => void;
  setQty: (productId: string, qty: number) => void;
  bumpQty: (productId: string, delta: number) => void;
  clearCart: () => void;
  /** discard the in-progress recurring draft */
  discardDraft: () => void;
  /* admin: documents */
  documentsForOrder: (orderId: string) => AdminDocument[];
  issueDocument: (orderId: string, type?: DocumentType) => Promise<void>;
  issueDocuments: (orderIds: string[], type?: DocumentType) => Promise<void>;
  /** הזמנות קבועות שנוצרו בשם לקוח */
  adminRecurring: AdminRecurringOrder[];
  /** יצירת הזמנה קבועה בשם לקוח */
  addAdminRecurring: (rec: Omit<AdminRecurringOrder, "id">) => AdminRecurringOrder;
  /** מחיקת הזמנה קבועה שנוצרה בשם לקוח */
  removeAdminRecurring: (id: string) => void;
  /* admin: cutoff rules */
  updateCutoffRule: (weekday: number, patch: Partial<Omit<CutoffRule, "weekday">>) => void;
  resetCutoffRules: () => void;
  /** הוספה או עדכון של חריגה לתאריך מסוים */
  saveCutoffException: (exception: CutoffException) => void;
  /** מחיקת חריגה לתאריך */
  removeCutoffException: (date: string) => void;

  resetDemoData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    applyRuntimeCutoffRules(loaded.cutoffRules);
    applyRuntimeCutoffExceptions(loaded.cutoffExceptions);
    setState(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — demo continues in memory */
    }
  }, [state, hydrated]);

  const update = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => {
      const next = fn(s);
      if (next.cutoffRules !== s.cutoffRules) applyRuntimeCutoffRules(next.cutoffRules);
      if (next.cutoffExceptions !== s.cutoffExceptions) applyRuntimeCutoffExceptions(next.cutoffExceptions);
      return next;
    });
  }, []);

  /** הפקת מסמכים דרך שכבת החשבונות — יוצרת רשומות "בהפקה" ואז מעדכנת תוצאה. */
  const issueMany = useCallback(
    async (orderIds: string[], type: DocumentType) => {
      if (!orderIds.length) return;
      const createdAt = new Date().toISOString();
      const pending: AdminDocument[] = orderIds.map((orderId, i) => ({
        id: `doc-${Date.now()}-${i}`,
        orderId,
        type,
        status: "pending",
        createdAt,
      }));
      update((s) => ({ ...s, documents: [...pending, ...s.documents] }));

      const adapter = accountingAdapter();
      const results = await Promise.all(
        pending.map(async (doc) => {
          try {
            const res = await adapter.issueDocument({ orderId: doc.orderId, type });
            return { id: doc.id, ...res };
          } catch (err) {
            return {
              id: doc.id,
              status: "error" as const,
              number: undefined,
              error: err instanceof Error ? err.message : "ההפקה נכשלה",
            };
          }
        }),
      );

      update((s) => ({
        ...s,
        documents: s.documents.map((d) => {
          const res = results.find((r) => r.id === d.id);
          return res ? { ...d, status: res.status, number: res.number, error: res.error } : d;
        }),
      }));
    },
    [update],
  );

  const value = useMemo<StoreValue>(() => {
    const getRecurring = (id: string) => state.recurring.find((r) => r.id === id);

    return {
      ...state,
      hydrated,
      getRecurring,

      startRecurringCreate: (name, weekdays, round, startDate) =>
        update((s) => ({
          ...s,
          draft: { ...emptyDraft("recurring_create"), name, weekdays, round, startDate, quantities: {} },
        })),

      startRecurringEdit: (id) =>
        update((s) => {
          const rec = s.recurring.find((r) => r.id === id);
          if (!rec) return s;
          return {
            ...s,
            draft: {
              mode: "recurring_edit",
              recurringId: rec.id,
              name: rec.name,
              weekdays: rec.weekdays,
              round: rec.round,
              quantities: quantitiesFromLines(rec.lines),
            },
          };
        }),

      confirmDraft: () => {
        let result: RecurringOrder | null = null;
        update((s) => {
          const d = s.draft;
          if (!d) return s;
          const lines = linesFromQuantities(d.quantities);

          if (d.mode === "recurring_create") {
            const rec: RecurringOrder = {
              id: `r-${Date.now()}`,
              name: d.name || "הזמנה קבועה חדשה",
              weekdays: d.weekdays ?? [],
              round: d.round,
              status: "active",
              lines,
              startDate: d.startDate,
            };
            result = rec;
            return { ...s, recurring: [rec, ...s.recurring], draft: null };
          }

          if (d.mode === "recurring_edit" && d.recurringId) {
            const recurring = s.recurring.map((r) =>
              r.id === d.recurringId
                ? {
                    ...r,
                    name: d.name ?? r.name,
                    weekdays: d.weekdays ?? r.weekdays,
                    round: d.round,
                    lines,
                    needsAttention: false,
                    attentionText: undefined,
                  }
                : r,
            );
            result = recurring.find((r) => r.id === d.recurringId) ?? null;
            return { ...s, recurring, draft: null };
          }

          return s;
        });
        return result;
      },

      saveRecurringDetails: (id, patch) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      pauseRecurring: (id) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: "paused" } : r)),
        })),

      reactivateRecurring: (id) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: "active" } : r)),
        })),

      cancelRecurring: (id) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)),
        })),

      setDraft: (draft) => update((s) => ({ ...s, draft })),

      setQty: (productId, qty) =>
        update((s) => {
          const draft = s.draft ?? emptyDraft("recurring_create");
          const product = findProduct(productId);
          const next = roundQty(qty, product?.unit ?? "unit");
          const quantities = { ...draft.quantities };
          if (next <= 0) delete quantities[productId];
          else quantities[productId] = next;
          return { ...s, draft: { ...draft, quantities } };
        }),

      bumpQty: (productId, delta) =>
        update((s) => {
          const draft = s.draft ?? emptyDraft("recurring_create");
          const product = findProduct(productId);
          const current = draft.quantities[productId] ?? 0;
          const next = roundQty(current + delta, product?.unit ?? "unit");
          const quantities = { ...draft.quantities };
          if (next <= 0) delete quantities[productId];
          else quantities[productId] = next;
          return { ...s, draft: { ...draft, quantities } };
        }),

      clearCart: () => update((s) => (s.draft ? { ...s, draft: { ...s.draft, quantities: {} } } : s)),

      discardDraft: () => update((s) => ({ ...s, draft: null })),

      documentsForOrder: (orderId) => state.documents.filter((d) => d.orderId === orderId),

      issueDocument: (orderId, type = "delivery_note") => issueMany([orderId], type),

      issueDocuments: (orderIds, type = "delivery_note") => issueMany(orderIds, type),

      adminRecurring: state.adminRecurring,

      addAdminRecurring: (rec) => {
        const created: AdminRecurringOrder = { ...rec, id: `ar-${Date.now()}` };
        update((s) => ({ ...s, adminRecurring: [created, ...s.adminRecurring] }));
        return created;
      },

      removeAdminRecurring: (id) =>
        update((s) => ({ ...s, adminRecurring: s.adminRecurring.filter((r) => r.id !== id) })),

      updateCutoffRule: (weekday, patch) =>
        update((s) => ({
          ...s,
          cutoffRules: normalizeCutoffRules(
            s.cutoffRules.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
          ),
        })),

      saveCutoffException: (exception) =>
        update((s) => ({
          ...s,
          cutoffExceptions: [
            ...s.cutoffExceptions.filter((e) => e.date !== exception.date),
            exception,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      removeCutoffException: (date) =>
        update((s) => ({
          ...s,
          cutoffExceptions: s.cutoffExceptions.filter((e) => e.date !== date),
        })),

      resetCutoffRules: () => update((s) => ({ ...s, cutoffRules: DEFAULT_CUTOFF_RULES })),

      resetDemoData: () => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setState(initialState);
      },
    };
  }, [state, hydrated, update, issueMany]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}
