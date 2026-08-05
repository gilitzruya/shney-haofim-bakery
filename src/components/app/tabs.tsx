import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // RTL: scrollLeft is 0 at the start (right side) and becomes negative toward the end (left side).
    setCanScrollLeft(el.scrollLeft > -maxScroll + 4);
    setCanScrollRight(el.scrollLeft < -4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Measure after the first paint so scrollWidth/clientWidth are correct.
    const handle = requestAnimationFrame(() => {
      updateScrollState();
      el.addEventListener("scroll", updateScrollState, { passive: true });
      window.addEventListener("resize", updateScrollState);
    });

    return () => {
      cancelAnimationFrame(handle);
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    const tab = refs.current[value];
    if (!container || !tab) return;
    // Scroll only the tab strip horizontally. scrollIntoView would also scroll
    // the window and fight with the page-level smooth scroll to the section.
    const tabRect = tab.getBoundingClientRect();
    const boxRect = container.getBoundingClientRect();
    const delta = tabRect.left + tabRect.width / 2 - (boxRect.left + boxRect.width / 2);
    if (Math.abs(delta) > 2) container.scrollBy({ left: delta, behavior: "smooth" });
  }, [value]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = Math.max(el.clientWidth * 0.6, 160) * direction;
    el.scrollBy({ left: distance, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="גלול קטגוריות שמאלה"
        onClick={() => scrollBy(-1)}
        disabled={!canScrollLeft}
        className={cn(
          "shrink-0 rounded-full border border-border bg-card p-1.5 text-foreground transition-opacity disabled:cursor-default",
          canScrollLeft ? "opacity-100" : "opacity-30",
        )}
      >
        <ChevronRight className="size-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex flex-1 gap-2 overflow-x-auto no-scrollbar min-w-0"
        style={{ scrollbarWidth: "none" }}
      >
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

      <button
        type="button"
        aria-label="גלול קטגוריות ימינה"
        onClick={() => scrollBy(1)}
        disabled={!canScrollRight}
        className={cn(
          "shrink-0 rounded-full border border-border bg-card p-1.5 text-foreground transition-opacity disabled:cursor-default",
          canScrollRight ? "opacity-100" : "opacity-30",
        )}
      >
        <ChevronLeft className="size-4" />
      </button>
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
