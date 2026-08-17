import { ChevronDown, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/app/button";
import { TextInput } from "@/components/app/form-controls";
import { Modal } from "@/components/app/modal";
import { allProducts, catalogCategories, type Product } from "@/data/catalog";
import type { Customer } from "@/data/admin-seed";
import { overrideEntries } from "@/lib/admin/pricing";
import { formatPrice, unitLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";

const COLLAPSED_COUNT = 3;

/** שורת מוצר זמין להוספה למחירון המיוחד. */
function ProductAddRow({ product, onAdd, bare }: { product: Product; onAdd: () => void; bare?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        !bare && "rounded-xl border border-border bg-card px-3 py-2",
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-foreground">{product.name}</div>
        <div className="text-[11px] text-muted-foreground">
          מחיר קטלוג {formatPrice(product.price)} ל{unitLabel(product.unit)}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onAdd}>
        הוספה
      </Button>
    </div>
  );
}

/** מחירון מיוחד ללקוח — הצגה, הוספה, עריכה ומחיקה של חריגות מחיר. */
export function SpecialPricesPanel({ customer }: { customer: Customer }) {
  const { setCustomerPriceOverride } = useStore();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const categories = useMemo(() => catalogCategories(), []);
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

  const setDraft = (id: string, value: string) => {
    setDrafts((d) => ({ ...d, [id]: value }));
    setSavedIds((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  const startAdd = (product: Product) => {
    setPending(product);
    setPendingPrice(product.price.toFixed(2));
  };

  const confirmAdd = () => {
    if (!pending) return;
    const parsed = Number(pendingPrice);
    if (pendingPrice === "" || Number.isNaN(parsed) || parsed <= 0) return;
    const price = Math.round(parsed * 100) / 100;
    setCustomerPriceOverride(customer.id, pending.id, price);
    setDraft(pending.id, price.toFixed(2));
    toast.success(`נוסף מחיר מיוחד ל${pending.name}`, {
      description: `${formatPrice(price)} ל${unitLabel(pending.unit)} (במקום ${formatPrice(pending.price)})`,
    });
    setPending(null);
    setQuery("");
    setAdding(false);
    setExpanded(true);
  };



  const save = (productId: string, raw: string, fallback: number) => {
    const parsed = Number(raw);
    if (raw === "" || Number.isNaN(parsed) || parsed <= 0) {
      setDraft(productId, fallback.toFixed(2));
      return;
    }
    setCustomerPriceOverride(customer.id, productId, Math.round(parsed * 100) / 100);
    setDraft(productId, parsed.toFixed(2));
    setSavedIds((s) => new Set(s).add(productId));
  };

  const resetIfInvalid = (productId: string, raw: string, fallback: number) => {
    const parsed = Number(raw);
    if (raw === "" || Number.isNaN(parsed) || parsed <= 0) {
      setDraft(productId, fallback.toFixed(2));
    }
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
          {query.trim() ? (
            results.length ? (
              <div className="flex flex-col gap-1.5">
                {results.map((p) => (
                  <ProductAddRow key={p.id} product={p} onAdd={() => addProduct(p.id, p.price)} />
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground">לא נמצאו מוצרים מתאימים.</div>
            )
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11.5px] text-muted-foreground">
                חפשו מוצר, או דפדפו בקטגוריות ובחרו מוצר להוספה.
              </div>
              {categories.map((cat) => {
                const open = openCategory === cat.id;
                const items = cat.products.filter(
                  (p) => typeof customer.priceOverrides?.[p.id] !== "number",
                );
                return (
                  <div key={cat.id} className="overflow-hidden rounded-xl border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setOpenCategory(open ? null : cat.id)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-right"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-heading">
                        {cat.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{items.length}</span>
                      <ChevronDown
                        className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
                      />
                    </button>
                    {open ? (
                      items.length ? (
                        <div className="divide-y divide-border border-t border-border">
                          {items.map((p) => (
                            <div key={p.id} className="px-3 py-2">
                              <ProductAddRow product={p} bare onAdd={() => addProduct(p.id, p.price)} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-t border-border px-3 py-2.5 text-[11.5px] text-muted-foreground">
                          לכל המוצרים בקטגוריה כבר יש מחיר מיוחד.
                        </div>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
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
          {visible.map(({ product, price }) => {
            const draftValue = drafts[product.id] ?? price.toFixed(2);
            const isDirty = draftValue !== price.toFixed(2);
            const parsedDraft = Number(draftValue);
            const draftValid = draftValue !== "" && !Number.isNaN(parsedDraft) && parsedDraft > 0;
            const shownSpecial = isDirty && draftValid ? parsedDraft : price;

            return (
              <div key={product.id} className="flex items-center gap-2 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-heading">{product.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]">
                    <span className="text-muted-foreground line-through">{formatPrice(product.price)}</span>
                    <span className="font-bold text-primary">{formatPrice(shownSpecial)}</span>
                    <span className="text-muted-foreground">ל{unitLabel(product.unit)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="relative block">
                      <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted-foreground">
                        ₪
                      </span>
                      <TextInput
                        value={draftValue}
                        onChange={(e) => setDraft(product.id, e.target.value)}
                        onBlur={() => resetIfInvalid(product.id, draftValue, price)}
                        inputMode="decimal"
                        className={cn(
                          "h-9 w-[92px] ps-6 text-center text-[13.5px] font-bold outline-none transition-colors",
                          isDirty
                            ? "border-primary bg-primary-soft/40 text-primary focus:border-primary"
                            : "border-border bg-card text-foreground focus:border-primary",
                        )}
                      />
                    </span>
                    <button
                      type="button"
                      aria-label={`הסרת המחיר המיוחד ל${product.name}`}
                      onClick={() => setCustomerPriceOverride(customer.id, product.id, null)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {isDirty && draftValid ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => save(product.id, draftValue, price)}
                      className="h-7 w-full text-[11px] font-semibold"
                    >
                      שמור
                    </Button>
                  ) : savedIds.has(product.id) ? (
                    <span className="flex h-7 items-center justify-center text-[10px] font-semibold text-success">
                      נשמר
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}


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
