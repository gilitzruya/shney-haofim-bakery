import { WEEKDAY_LABELS } from "@/data/catalog";
import { cn } from "@/lib/utils";

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

/** בחירת סניף (החלטה 25) — באותו עיצוב כמו כפתורי הסבב. מוצג רק כשללקוח יש סניפים פעילים. */
export function BranchPicker({
  branches,
  value,
  onChange,
}: {
  branches: { id: string; name: string; address: string | null }[];
  value: string | null;
  onChange: (branchId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-semibold text-muted-foreground">סניף</div>
      <div className="grid grid-cols-2 gap-2">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            className={cn(
              "rounded-xl border px-3.5 py-3 text-start text-[13.5px] font-semibold text-foreground",
              value === b.id ? "border-[1.5px] border-primary bg-primary-soft" : "border-border bg-card",
            )}
          >
            <div>{b.name}</div>
            {b.address ? (
              <div className="mt-0.5 text-[11.5px] font-normal text-muted-foreground">{b.address}</div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
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
