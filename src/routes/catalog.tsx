import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBasket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { ProductCard } from "@/components/app/product-card";
import { Tabs } from "@/components/app/tabs";
import { CopyLastOrderPrompt } from "@/components/app/copy-last-order-prompt";

import { CATEGORIES } from "@/data/catalog";
import { formatPrice, linesTotal } from "@/lib/format";
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
  validateSearch: (search: Record<string, unknown>): { copy?: 1 } =>
    search["copy"] === 1 || search["copy"] === "1" ? { copy: 1 } : {},

  component: CatalogPage,
});

function headerOffset() {
  if (typeof document === "undefined") return 150;
  const header = document.querySelector("header");
  return header ? Math.round(header.getBoundingClientRect().height) : 150;
}

function CatalogPage() {
  const navigate = useNavigate();
  const { copy } = Route.useSearch();
  const { draft, orders, bumpQty, setQty, startOrderDraft } = useStore();
  const [category, setCategory] = useState(CATEGORIES[0]!.id);
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lockRef = useRef(false);

  const quantities = draft?.quantities ?? {};
  const total = useMemo(() => linesTotal(linesFromQuantities(quantities)), [quantities]);
  const selectedCount = Object.keys(quantities).length;

  /** ההזמנה האחרונה עם מוצרים — לשאלת ההעתקה מעל הקטלוג */
  const lastOrder = useMemo(
    () =>
      orders
        .filter((o) => o.lines.length > 0 && o.status !== "cancelled" && o.status !== "draft")
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [orders],
  );
  /** ההודעה נשאלת פעם אחת לכל סשן — אחרי "לא" לא חוזרים להציג אותה גם אם מאפסים כמויות */
  const DISMISS_KEY = "copyPromptDismissed";
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);
  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const isEmptyNewOrder =
    (!draft || (draft.mode !== "recurring_create" && draft.mode !== "recurring_edit")) && selectedCount === 0;
  const askCopy = !!lastOrder && !dismissed && (copy === 1 || isEmptyNewOrder);

  const closeCopyPrompt = () => {
    dismiss();
    if (copy === 1) navigate({ to: "/catalog", search: {}, replace: true });
  };
  const copyFromLast = () => {
    if (lastOrder) startOrderDraft(draft?.date, draft?.round ?? "morning", lastOrder.lines);
    dismiss();
    navigate({ to: "/summary", replace: true });
  };


  const searching = query.trim().length > 0;
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return CATEGORIES.flatMap((c) => c.products).filter((p) => p.name.includes(q));
  }, [query]);

  // Prevent background scrolling while the copy prompt is open.
  useEffect(() => {
    if (!askCopy) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [askCopy]);

  // Scroll-spy: highlight the category currently in view.
  useEffect(() => {
    if (searching) return;
    const onScroll = () => {
      if (lockRef.current) return;
      const anchor = headerOffset() + 12;
      let current = CATEGORIES[0]!.id;
      for (const c of CATEGORIES) {
        const el = sectionRefs.current[c.id];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= anchor) current = c.id;
      }
      setCategory((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [searching]);

  const goToCategory = (id: string) => {
    setCategory(id);
    const el = sectionRefs.current[id];
    if (!el) return;
    lockRef.current = true;
    const scrollToSection = () => {
      const node = sectionRefs.current[id];
      if (!node) return;
      const top = node.getBoundingClientRect().top + window.scrollY - headerOffset() - 6;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    };
    // Run after the tab strip finishes its own (horizontal) adjustment so the
    // measured header height and section position are final.
    requestAnimationFrame(scrollToSection);
    window.setTimeout(scrollToSection, 120);
    window.setTimeout(() => {
      lockRef.current = false;
    }, 900);
  };

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="בחירת מוצרים" />
        {searching ? null : (
          <div className="mx-auto w-full max-w-5xl px-3.5 pb-2.5 md:px-5">
            <Tabs
              tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.name }))}
              value={category}
              onChange={goToCategory}
            />
          </div>
        )}
        <div className="mx-auto w-full max-w-5xl px-3.5 pb-1 md:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש מוצר"
              className="h-[42px] w-full rounded-xl border border-border bg-card pe-9 ps-3.5 text-[13px] text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>
      </AppHeader>
      <Section className="pb-28">
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
                  onChange={(delta) => bumpQty(p.id, delta)}
                  onSetQty={(qty) => setQty(p.id, qty)}
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
                <h2 className="mb-2 mt-2 text-[14px] font-bold text-foreground">{c.name}</h2>
                {c.products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={quantities[p.id] ?? 0}
                    onChange={(delta) => bumpQty(p.id, delta)}
                    onSetQty={(qty) => setQty(p.id, qty)}
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
            <div className="text-[11px] font-semibold text-foreground">{selectedCount} מוצרים נבחרו</div>
            <div className="text-[15px] font-bold text-foreground">
              {formatPrice(total)} <span className="text-[10.5px] font-normal text-muted-foreground">(לפני מע״מ)</span>
            </div>
          </div>
          <Button size="lg" disabled={selectedCount === 0} onClick={() => navigate({ to: "/summary" })}>
            <ShoppingBasket className="size-4" />
            מעבר לסל ההזמנה
          </Button>
        </div>
      </div>
      {askCopy && lastOrder ? (
        <CopyLastOrderPrompt
          date={lastOrder.date}
          lines={lastOrder.lines}
          onConfirm={copyFromLast}
          onDecline={closeCopyPrompt}
        />
      ) : null}
    </AppShell>
  );
}

