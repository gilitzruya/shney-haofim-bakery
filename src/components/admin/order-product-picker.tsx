import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { ProductCard } from "@/components/app/product-card";
import { Tabs } from "@/components/app/tabs";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/store/app-store";

/** בורר מוצרים לצד הניהול — תצוגה זהה לקטלוג של הלקוח. */
export function OrderProductPicker({
  quantities,
  onSetQty,
  onBumpQty,
  onDone,
  total,
}: {
  quantities: Record<string, number>;
  onSetQty: (productId: string, qty: number) => void;
  onBumpQty: (productId: string, delta: number) => void;
  onDone: () => void;
  total: number;
}) {
  const { catalog: CATEGORIES } = useStore();
  const [category, setCategory] = useState(CATEGORIES[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const searching = query.trim().length > 0;
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return CATEGORIES.flatMap((c) => c.products).filter(
      (p) => p.name.includes(q) || (p.sku ?? "").includes(q),
    );
  }, [query, CATEGORIES]);

  const goToCategory = (id: string) => {
    setCategory(id);
    const el = sectionRefs.current[id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };

  const selectedCount = Object.keys(quantities).filter((id) => (quantities[id] ?? 0) > 0).length;

  return (
    <>
      <Section className="pt-4 pb-28">
        <PageTitleBar title="בחירת מוצרים" onBack={onDone} />
        {searching ? null : (
          <div className="mb-2">
            <Tabs
              tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.name }))}
              value={category}
              onChange={goToCategory}
            />
          </div>
        )}
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר"
            aria-label="חיפוש מוצר"
            className="h-[42px] w-full rounded-xl border border-border bg-card pe-9 ps-3.5 text-[13px] text-foreground outline-none focus:border-primary"
          />
        </div>

        <div className="mt-3.5">
          {searching ? (
            searchResults.length === 0 ? (
              <EmptyState title="לא נמצאו מוצרים" description="נסו לחפש בשם אחר או לבחור קטגוריה." />
            ) : (
              searchResults.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={quantities[p.id] ?? 0}
                  onChange={(delta) => onBumpQty(p.id, delta)}
                  onSetQty={(qty) => onSetQty(p.id, qty)}
                />
              ))
            )
          ) : (
            CATEGORIES.map((c) => (
              <section
                key={c.id}
                ref={(el) => {
                  sectionRefs.current[c.id] = el;
                }}
                className="pt-1"
              >
                <h2 className="mb-2 mt-2 text-[14px] font-bold text-heading">{c.name}</h2>
                {c.products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={quantities[p.id] ?? 0}
                    onChange={(delta) => onBumpQty(p.id, delta)}
                    onSetQty={(qty) => onSetQty(p.id, qty)}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-foreground">{selectedCount} מוצרים בהזמנה</div>
            <div className="text-[15px] font-bold text-heading">
              {formatPrice(total)}{" "}
              <span className="text-[10.5px] font-normal text-muted-foreground">(לפני מע״מ)</span>
            </div>
          </div>
          <Button size="lg" onClick={onDone}>
            סיום הוספת מוצרים
          </Button>
        </div>
      </div>
    </>
  );
}
