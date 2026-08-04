import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    refs.current[value]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-[7px] text-[13.5px] font-semibold whitespace-nowrap",
            value === t.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}


export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
}: {
  chips: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold whitespace-nowrap",
            value === c.id
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-transparent text-muted-foreground",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
