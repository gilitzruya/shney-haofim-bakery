import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBasket } from "lucide-react";
import { useMemo, useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { ProductCard } from "@/components/app/product-card";
import { Tabs } from "@/components/app/tabs";
import { ProgressSteps } from "@/components/app/form-controls";
import { CATEGORIES, roundLabel } from "@/data/catalog";
import { formatDate, formatPrice, linesTotal } from "@/lib/format";
import { linesFromQuantities, useStore } from "@/store/app-store";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "קטלוג מוצרים — מאפיית שני האופים" },
      { name: "description", content: "בחירת לחמים, מאפים וחלות להזמנה סיטונאית לפי קטגוריות." },
      { property: "og:title", content: "קטלוג מוצרים — מאפיית שני האופים" },
      { property: "og:description", content: "בחרו מוצרים וכמויות מתוך קטלוג המאפייה." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const navigate = useNavigate();
  const { draft, bumpQty } = useStore();
  const [category, setCategory] = useState(CATEGORIES[0]!.id);
  const [query, setQuery] = useState("");

  const quantities = draft?.quantities ?? {};
  const total = useMemo(() => linesTotal(linesFromQuantities(quantities)), [quantities]);
  const selectedCount = Object.keys(quantities).length;

  const products = useMemo(() => {
    const q = query.trim();
    if (q) return CATEGORIES.flatMap((c) => c.products).filter((p) => p.name.includes(q));
    return CATEGORIES.find((c) => c.id === category)?.products ?? [];
  }, [category, query]);

  const heading =
    draft?.mode === "recurring_create" || draft?.mode === "recurring_edit"
      ? draft.name || "הזמנה קבועה"
      : draft?.date
        ? `${formatDate(draft.date)} · ${roundLabel(draft.round)}`
        : "בחירת מוצרים";

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="בחירת מוצרים" />
      </AppHeader>
      <Section className="pb-28">
        <ProgressSteps total={3} current={2} />
        <div className="mt-3 rounded-xl border border-border bg-card-muted px-3.5 py-2.5 text-[12.5px] font-semibold text-foreground">
          {heading}
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר"
            className="h-[42px] w-full rounded-xl border border-border bg-card pe-9 ps-3.5 text-[13px] text-foreground outline-none focus:border-primary"
          />
        </div>

        {query ? null : (
          <div className="mt-3">
            <Tabs
              tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.name }))}
              value={category}
              onChange={setCategory}
            />
          </div>
        )}

        <div className="mt-3.5">
          {products.length === 0 ? (
            <EmptyState title="לא נמצאו מוצרים" description="נסו לחפש בשם אחר או לבחור קטגוריה." />
          ) : (
            products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                qty={quantities[p.id] ?? 0}
                onChange={(delta) => bumpQty(p.id, delta)}
              />
            ))
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">{selectedCount} מוצרים נבחרו</div>
            <div className="text-[15px] font-bold text-foreground">{formatPrice(total)}</div>
          </div>
          <Button size="lg" disabled={selectedCount === 0} onClick={() => navigate({ to: "/summary" })}>
            <ShoppingBasket className="size-4" />
            סיכום ההזמנה
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
