import { Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { TextInput } from "@/components/app/form-controls";
import { ALL_PRODUCTS } from "@/data/catalog";
import type { Customer } from "@/data/admin-seed";
import { overrideEntries } from "@/lib/admin/pricing";
import { formatPrice, unitLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";

/** ניהול מחירים מיוחדים ללקוח — מוצגות חריגות בלבד. */
export function SpecialPricesPanel({ customer }: { customer: Customer }) {
  const { setCustomerPriceOverride } = useStore();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const entries = overrideEntries(customer);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL_PRODUCTS.filter(
      (p) => p.name.includes(q) && typeof customer.priceOverrides?.[p.id] !== "number",
    ).slice(0, 6);
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
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-2.5">
        <div className="text-[12px] font-semibold text-muted-foreground">הוספת מחיר מיוחד</div>
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר"
            aria-label="חיפוש מוצר"
            className="pe-9"
          />
        </div>
        {results.length ? (
          <div className="flex flex-col gap-1.5">
            {results.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card-muted px-3 py-2"
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
                  }}
                >
                  הוספה
                </Button>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-[12px] text-muted-foreground">לא נמצאו מוצרים מתאימים.</div>
        ) : null}
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          title="אין מחירים מיוחדים"
          description="ללקוח זה חלים מחירי הקטלוג הרגילים. אפשר להוסיף חריגה בחיפוש שלמעלה."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(({ product, price }) => (
            <Card key={product.id} className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-heading">{product.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  מחיר קטלוג {formatPrice(product.price)} ל{unitLabel(product.unit)}
                </div>
              </div>
              <TextInput
                value={drafts[product.id] ?? price.toFixed(2)}
                onChange={(e) => setDraft(product.id, e.target.value)}
                onBlur={(e) => commit(product.id, e.target.value, price)}
                inputMode="decimal"
                aria-label={`מחיר מיוחד ל${product.name}`}
                className="h-9 w-[84px] shrink-0 text-center"
              />
              <button
                type="button"
                aria-label={`הסרת המחיר המיוחד ל${product.name}`}
                onClick={() => setCustomerPriceOverride(customer.id, product.id, null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
