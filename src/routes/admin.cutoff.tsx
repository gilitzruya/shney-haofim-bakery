import { createFileRoute } from "@tanstack/react-router";
import { CalendarOff, Check, Clock, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card } from "@/components/app/card";
import { useStore } from "@/store/app-store";
import { TextInput } from "@/components/app/form-controls";
import { formatShortDate } from "@/lib/format";
import {
  describeRule,
  formatTime,
  HE_WEEKDAYS,
  type CutoffException,
  type CutoffRule,
} from "@/lib/admin/cutoff-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cutoff")({
  head: () => ({
    meta: [
      { title: "שעות סגירה להזמנות — ניהול המאפייה" },
      {
        name: "description",
        content: "הגדרת שעת הסגירה לכל יום אספקה — עד מתי לקוחות יכולים להזמין.",
      },
      { property: "og:title", content: "שעות סגירה להזמנות — ניהול המאפייה" },
      {
        property: "og:description",
        content: "הגדרת שעת הסגירה לכל יום אספקה — עד מתי לקוחות יכולים להזמין.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCutoffPage,
});

const OFFSET_LABELS = ["באותו יום", "יום לפני", "יומיים לפני", "3 ימים לפני", "4 ימים לפני"];

function AdminCutoffPage() {
  const { cutoffRules, hydrated, updateCutoffRule, resetCutoffRules } = useStore();
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <h1 className="text-[19px] font-bold text-heading">שעות סגירה להזמנות</h1>
        <p className="mt-1 text-[12.5px] text-black">
          לכל יום אספקה מוגדר מועד סגירה — עד מתי לקוחות יכולים לשלוח או לעדכן הזמנה לאותו יום.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {!hydrated
            ? null
            : cutoffRules.map((rule) => (
                <DayCard
                  key={rule.weekday}
                  rule={rule}
                  editing={editing === rule.weekday}
                  onEdit={() => setEditing(rule.weekday)}
                  onClose={() => setEditing(null)}
                  onSave={(patch) => {
                    updateCutoffRule(rule.weekday, patch);
                    setEditing(null);
                    toast.success(`מועד הסגירה ליום ${HE_WEEKDAYS[rule.weekday]} עודכן`);
                  }}
                />
              ))}
        </div>

        <ExceptionsSection />

        <Button
          variant="secondary"
          className="mt-6 w-full"
          onClick={() => {
            resetCutoffRules();
            setEditing(null);
            toast.success("הכללים אופסו לברירת המחדל");
          }}
        >
          <RotateCcw className="size-4" />
          איפוס לברירת המחדל
        </Button>
      </Section>
    </AdminShell>
  );
}

function DayCard({
  rule,
  editing,
  onEdit,
  onClose,
  onSave,
}: {
  rule: CutoffRule;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSave: (patch: Partial<Omit<CutoffRule, "weekday">>) => void;
}) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const [offsetDays, setOffsetDays] = useState(rule.offsetDays);
  const [time, setTime] = useState(formatTime(rule.hour, rule.minute));

  const startEdit = () => {
    setEnabled(rule.enabled);
    setOffsetDays(rule.offsetDays);
    setTime(formatTime(rule.hour, rule.minute));
    onEdit();
  };

  const save = () => {
    const [h, m] = time.split(":");
    onSave({
      enabled,
      offsetDays,
      hour: Number(h ?? 12),
      minute: Number(m ?? 0),
    });
  };

  if (!editing) {
    return (
      <Card className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-heading">יום {HE_WEEKDAYS[rule.weekday]}</div>
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1.5 text-[12.5px]",
              rule.enabled ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {rule.enabled ? <Clock className="size-3.5" /> : <X className="size-3.5" />}
            {rule.enabled ? `אפשר להזמין עד ${describeRule(rule)}` : "אין אספקה ביום זה"}
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={startEdit}>
          <Pencil className="size-3.5" />
          עריכה
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-bold text-heading">יום {HE_WEEKDAYS[rule.weekday]}</div>
        <button
          type="button"
          aria-label="ביטול"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-muted-foreground">אספקה ביום זה</span>
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setEnabled(v)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                enabled === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
              )}
            >
              {v ? "כן" : "לא"}
            </button>
          ))}
        </div>
      </div>

      {enabled ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted-foreground">סגירת ההזמנות</span>
            <div className="flex flex-wrap gap-2">
              {OFFSET_LABELS.map((label, days) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setOffsetDays(days)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                    offsetDays === days
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-semibold text-muted-foreground">שעת הסגירה</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="שעת סגירה"
              className="rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-semibold text-foreground"
            />
          </div>

          <div className="rounded-xl bg-primary-soft px-3 py-2 text-[12.5px] font-semibold text-primary">
            אפשר להזמין עד{" "}
            {describeRule({
              ...rule,
              enabled: true,
              offsetDays,
              hour: Number(time.split(":")[0] ?? 12),
              minute: Number(time.split(":")[1] ?? 0),
            })}
          </div>
        </>
      ) : null}

      <Button onClick={save}>
        <Check className="size-4" />
        שמירה
      </Button>
    </Card>
  );
}
