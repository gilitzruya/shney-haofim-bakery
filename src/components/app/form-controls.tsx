import { ROUNDS, WEEKDAY_LABELS } from "@/data/catalog";
import type { RoundId } from "@/data/catalog";
import { cn } from "@/lib/utils";

export function RoundSelector({ value, onChange }: { value: RoundId; onChange: (id: RoundId) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {ROUNDS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            "flex items-center justify-between rounded-xl border px-3.5 py-3 text-start",
            value === r.id ? "border-[1.5px] border-primary bg-primary-soft" : "border-border bg-card",
          )}
        >
          <span className="text-[13.5px] font-semibold text-foreground">{r.label}</span>
          <span className="text-[12px] text-muted-foreground">{r.time}</span>
        </button>
      ))}
    </div>
  );
}

export function WeekdayChips({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));

  return (
    <div className="flex gap-2">
      {WEEKDAY_LABELS.slice(0, 6).map((label, day) => (
        <button
          key={label}
          type="button"
          onClick={() => toggle(day)}
          className={cn(
            "size-[42px] rounded-full border text-[13px] font-bold",
            value.includes(day)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-[42px] w-full rounded-xl border border-border bg-card px-3.5 text-[13px] text-foreground outline-none focus:border-primary",
        props.className,
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[84px] w-full rounded-xl border border-border bg-card p-3.5 text-[13px] text-foreground outline-none focus:border-primary",
        props.className,
      )}
    />
  );
}

export function ProgressSteps({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn("h-1 flex-1 rounded-sm", i < current ? "bg-primary" : "bg-border")}
        />
      ))}
    </div>
  );
}
