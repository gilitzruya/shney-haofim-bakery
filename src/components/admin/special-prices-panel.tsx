import { ChevronDown, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/app/button";
import { TextInput } from "@/components/app/form-controls";
import { allProducts } from "@/data/catalog";
import type { Customer } from "@/data/admin-seed";
import { overrideEntries } from "@/lib/admin/pricing";
import { formatPrice, unitLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";

const COLLAPSED_COUNT = 3;

/** מחירון מיוחד ללקוח — הצגה, הוספה, עריכה ומחיקה של חריגות מחיר. */
export function SpecialPricesPanel({ customer }: { customer: Customer }) {
  const { setCustomerPriceOverride } = useStore();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const entries = overrideEntries(customer);
  const visible = expanded ? entries : entries.slice(0, COLLAPSED_COUNT);
  const hidden = entries.length - visible.length;

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return allProducts()
      .filter((p) => p.name.includes(q) && typeof customer.priceOverrides?.[p.id] !== "number")
      .slice(0, 6);
  }, [query, customer.priceOverrides]);

  const setDraft = (id: string, value: string) => setDrafts((d) => ({ ...d, [id]: value }));

  const commit = (productId: string, raw: string | undefined, fallback: number) => {
    const parsed = Number(raw);
    if (raw === undefined || raw === "" || Number.isNaN(parsed) || parsed <= 0) {
      setDraft(productId, fallback.toFixed(2));
      return;
    }
    setCustomerPriceOverride(customer.id, productId, Math.round(parsed * 100) / 100);
    setDraft(productId, parsed.toFixed(2));
  };

  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-card">
      {/* כותרת */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Tag className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-heading">מחירון מיוחד</div>
          <div className="text-[11.5px] text-muted-foreground">
            {entries.length ? `${entries.length} מוצרים במחיר חורג` : "כל המוצרים במחיר הקטלוג"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((a) => !a);
            setQuery("");
          }}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold ${
            adding ? "border-border bg-card-muted text-muted-foreground" : "border-primary bg-primary-soft text-primary"
          }`}
        >
          {adding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {adding ? "סגירה" : "הוספה"}
        </button>
      </div>

      {/* הוספת מחיר מיוחד */}
      {adding ? (
        <div className="flex flex-col gap-2 border-t border-border bg-card-muted/60 px-3.5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש מוצר להוספה"
              aria-label="חיפוש מוצר"
              className="pe-9"
              autoFocus
            />
          </div>
          {results.length ? (
            <div className="flex flex-col gap-1.5">
              {results.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-foreground">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      מחיר קטלוג {formatPrice(p.price)} ל{unitLabel(p.unit)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCustomerPriceOverride(customer.id, p.id, p.price);
                      setDraft(p.id, p.price.toFixed(2));
                      setQuery("");
                      setExpanded(true);
                    }}
                  >
                    הוספה
                  </Button>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-[12px] text-muted-foreground">לא נמצאו מוצרים מתאימים.</div>
          ) : (
            <div className="text-[11.5px] text-muted-foreground">חפשו מוצר כדי לקבוע לו מחיר ייעודי ללקוח.</div>
          )}
        </div>
      ) : null}

      {/* רשימת החריגות */}
      {entries.length === 0 ? (
        <div className="border-t border-border px-3.5 py-4 text-center text-[12px] text-muted-foreground">
          אין מחירים מיוחדים ללקוח זה.
        </div>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {visible.map(({ product, price }) => (
            <div key={product.id} className="flex items-center gap-2 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-heading">{product.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  קטלוג {formatPrice(product.price)} ל{unitLabel(product.unit)}
                </div>
              </div>
              <TextInput
                value={drafts[product.id] ?? price.toFixed(2)}
                onChange={(e) => setDraft(product.id, e.target.value)}
                onBlur={(e) => commit(product.id, e.target.value, price)}
                inputMode="decimal"
                aria-label={`מחיר מיוחד ל${product.name}`}
                className="h-8 w-[74px] shrink-0 text-center text-[12.5px]"
              />
              <button
                type="button"
                aria-label={`הסרת המחיר המיוחד ל${product.name}`}
                onClick={() => setCustomerPriceOverride(customer.id, product.id, null)}
                className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-border text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}

          {entries.length > COLLAPSED_COUNT ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex w-full items-center justify-center gap-1 px-3.5 py-2.5 text-[12.5px] font-semibold text-primary"
            >
              {expanded ? "הצגה מצומצמת" : `הצגת ${hidden} מוצרים נוספים`}
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
