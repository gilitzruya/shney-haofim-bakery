import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

/** מה שנשאר כאן — מסמכי הנהלת חשבונות וכללי שעות סגירה — עדיין localStorage-בלבד עד
 * שלב 5 (WORK_PLAN). הזמנות חד-פעמיות (שלב 3) והזמנות קבועות (שלב 4) כבר ב-Supabase
 * במלואן — ראו `src/hooks/use-orders.ts`/`src/hooks/use-recurring.ts`. */
interface PersistedState {
  /** admin side: issued accounting documents */
  documents: AdminDocument[];
  /** admin side: per-weekday ordering cutoff rules */
  cutoffRules: CutoffRule[];
  /** admin side: one-off exceptions (holidays, closed days, early cutoffs) */
  cutoffExceptions: CutoffException[];
}

const initialState: PersistedState = {
  documents: [],
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
      documents: parsed.documents ?? [],
      cutoffRules: normalizeCutoffRules(parsed.cutoffRules),
      cutoffExceptions: parsed.cutoffExceptions ?? [],
    };
  } catch {
    return initialState;
  }
}

interface StoreValue extends PersistedState {
  hydrated: boolean;
  /* admin: documents */
  documentsForOrder: (orderId: string) => AdminDocument[];
  issueDocument: (orderId: string, type?: DocumentType) => Promise<void>;
  issueDocuments: (orderIds: string[], type?: DocumentType) => Promise<void>;
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
      if (next.cutoffExceptions !== s.cutoffExceptions)
        applyRuntimeCutoffExceptions(next.cutoffExceptions);
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

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      hydrated,

      documentsForOrder: (orderId) => state.documents.filter((d) => d.orderId === orderId),

      issueDocument: (orderId, type = "delivery_note") => issueMany([orderId], type),

      issueDocuments: (orderIds, type = "delivery_note") => issueMany(orderIds, type),

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
    }),
    [state, hydrated, update, issueMany],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}
