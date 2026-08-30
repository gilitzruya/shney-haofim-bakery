import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/api/client";
import { israelLocalToUtcIso, israelPartsFromIso } from "@/lib/cutoff";
import {
  applyRuntimeCutoffExceptions,
  applyRuntimeCutoffRules,
  DEFAULT_CUTOFF_RULES,
  formatTime,
  normalizeCutoffRules,
  type CutoffException,
  type CutoffRule,
} from "@/lib/admin/cutoff-rules";

export const cutoffRulesQueryKey = ["cutoff", "rules"] as const;
export const cutoffExceptionsQueryKey = ["cutoff", "exceptions"] as const;

type CutoffRuleRow = {
  weekday: number;
  enabled: boolean;
  offset_days: number;
  cutoff_time: string;
};

type CutoffExceptionRow = {
  date: string;
  label: string;
  open: boolean;
  cutoff_at: string | null;
};

function toCutoffRule(row: CutoffRuleRow): CutoffRule {
  const [h, m] = row.cutoff_time.split(":");
  return {
    weekday: row.weekday,
    enabled: row.enabled,
    offsetDays: row.offset_days,
    hour: Number(h ?? 12),
    minute: Number(m ?? 0),
  };
}

function toCutoffException(row: CutoffExceptionRow): CutoffException {
  if (!row.open || !row.cutoff_at) return { date: row.date, label: row.label, open: row.open };
  const { date: cutoffDate, time: cutoffTime } = israelPartsFromIso(row.cutoff_at);
  return { date: row.date, label: row.label, open: row.open, cutoffDate, cutoffTime };
}

async function fetchCutoffRules(): Promise<CutoffRule[]> {
  const { data, error } = await supabase
    .from("cutoff_rules")
    .select("weekday, enabled, offset_days, cutoff_time")
    .order("weekday", { ascending: true });
  if (error) throw error;
  return normalizeCutoffRules((data ?? []).map(toCutoffRule));
}

/** כללי הסגירה השבועיים מה-DB. מזין את אינדקס ה-runtime הגלובלי (`lib/admin/cutoff-rules.ts`),
 * שעדיין נצרך סינכרונית מחוץ ל-React (`lib/cutoff.ts`'s `cutoffFor`/`isCutoffPassed`) בכל
 * מסלול שמציג תאריכי אספקה — לא רק במסך הניהול. */
export function useCutoffRules() {
  const query = useQuery({ queryKey: cutoffRulesQueryKey, queryFn: fetchCutoffRules });

  useEffect(() => {
    if (query.data) applyRuntimeCutoffRules(query.data);
  }, [query.data]);

  return { cutoffRules: query.data ?? DEFAULT_CUTOFF_RULES, isLoading: query.isLoading, error: query.error };
}

async function fetchCutoffExceptions(): Promise<CutoffException[]> {
  const { data, error } = await supabase
    .from("cutoff_exceptions")
    .select("date, label, open, cutoff_at")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toCutoffException);
}

export function useCutoffExceptions() {
  const query = useQuery({ queryKey: cutoffExceptionsQueryKey, queryFn: fetchCutoffExceptions });

  useEffect(() => {
    if (query.data) applyRuntimeCutoffExceptions(query.data);
  }, [query.data]);

  return { cutoffExceptions: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

function useInvalidateCutoffRules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cutoffRulesQueryKey });
}

function useInvalidateCutoffExceptions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cutoffExceptionsQueryKey });
}

/* --- admin: writes --- */

export function useUpdateCutoffRule() {
  const invalidate = useInvalidateCutoffRules();
  return useMutation({
    mutationFn: async ({
      weekday,
      patch,
    }: {
      weekday: number;
      patch: Partial<Omit<CutoffRule, "weekday">>;
    }) => {
      const row: { enabled?: boolean; offset_days?: number; cutoff_time?: string } = {};
      if (patch.enabled !== undefined) row.enabled = patch.enabled;
      if (patch.offsetDays !== undefined) row.offset_days = patch.offsetDays;
      if (patch.hour !== undefined && patch.minute !== undefined) {
        row.cutoff_time = `${formatTime(patch.hour, patch.minute)}:00`;
      }
      const { error } = await supabase.from("cutoff_rules").update(row).eq("weekday", weekday);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useResetCutoffRules() {
  const invalidate = useInvalidateCutoffRules();
  return useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_CUTOFF_RULES.map((r) => ({
        weekday: r.weekday,
        enabled: r.enabled,
        offset_days: r.offsetDays,
        cutoff_time: `${formatTime(r.hour, r.minute)}:00`,
      }));
      const { error } = await supabase.from("cutoff_rules").upsert(rows);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveCutoffException() {
  const invalidate = useInvalidateCutoffExceptions();
  return useMutation({
    mutationFn: async (exception: CutoffException) => {
      const row = {
        date: exception.date,
        label: exception.label,
        open: exception.open,
        cutoff_at:
          exception.open && exception.cutoffDate
            ? israelLocalToUtcIso(exception.cutoffDate, exception.cutoffTime ?? "12:00")
            : null,
      };
      const { error } = await supabase.from("cutoff_exceptions").upsert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRemoveCutoffException() {
  const invalidate = useInvalidateCutoffExceptions();
  return useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("cutoff_exceptions").delete().eq("date", date);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
