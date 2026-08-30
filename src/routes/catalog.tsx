import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBasket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { DateCalendar } from "@/components/app/date-calendar";
import { ProductCard } from "@/components/app/product-card";
import { Tabs } from "@/components/app/tabs";
import { CopyLastOrderPrompt } from "@/components/app/copy-last-order-prompt";

import type { Product } from "@/data/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import { useMyCustomer, useMyPrices } from "@/hooks/use-customers";
import { useAddCartLines, useCartOrder, useMyOrders, useSetCartDateRound, useUpsertCartLine, type Order } from "@/hooks/use-orders";
import { isCutoffPassed, israelNow } from "@/lib/cutoff";
import { priceFor } from "@/lib/admin/pricing";
import { formatPrice, parseDate } from "@/lib/format";
import { linesFromQuantities as draftLinesFromQuantities, useRecurringDraft } from "@/store/recurring-draft";

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

/** מסך הקטלוג משותף היום לזרימת הזמנה חד-פעמית (DB, `useCartOrder`) וגם לבניית הזמנה
 * קבועה (`useRecurringDraft`, wizard in-memory בלבד — ראו src/store/recurring-draft.tsx).
 * כל עוד יש `draft` פעיל — זו זרימת הזמנה קבועה. אחרת, הזמנה חד-פעמית. */
function CatalogPage() {
  const { draft } = useRecurringDraft();
  return draft ? <RecurringCatalogPage /> : <OrderCatalogPage />;
}

/* ---------------------------------------------------------------------- */
/* מצב קבוע — בורר מוצרים גרידא, בלי שאלת העתקה (לא רלוונטית לזרימה הזו). */
/* ---------------------------------------------------------------------- */

function RecurringCatalogPage() {
  const navigate = useNavigate();
  const { draft, bumpQty, setQty } = useRecurringDraft();
  const { categories: CATEGORIES } = useCatalog();
  const myPrices = useMyPrices();
  const [category, setCategory] = useState(CATEGORIES[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lockRef = useRef(false);

  const quantities = useMemo(() => draft?.quantities ?? {}, [draft?.quantities]);
  const selectedCount = Object.keys(quantities).length;

  // מחיר הלקוח בפועל (מיוחד אם קיים) גם כאן — לא רק בהזמנה חד-פעמית (PRD §2.6).
  const pricedCategories = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        products: c.products.map((p): Product => ({ ...p, price: priceFor(p, myPrices) })),
      })),
    [CATEGORIES, myPrices],
  );
  const total = useMemo(() => {
    const priced = pricedCategories.flatMap((c) => c.products);
    return draftLinesFromQuantities(quantities).reduce((sum, l) => {
      const p = priced.find((x) => x.id === l.productId);
      return p ? sum + p.price * l.qty : sum;
    }, 0);
  }, [quantities, pricedCategories]);

  const searching = query.trim().length > 0;
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return pricedCategories.flatMap((c) => c.products).filter((p) => p.name.includes(q));
  }, [query, pricedCategories]);

  useEffect(() => {
    if (searching) return;
    const onScroll = () => {
      if (lockRef.current) return;
      const anchor = headerOffset() + 12;
      let current = pricedCategories[0]?.id ?? "";
      for (const c of pricedCategories) {
        const el = sectionRefs.current[c.id];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= anchor) current = c.id;
      }
      setCategory((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [searching, pricedCategories]);

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
              tabs={pricedCategories.map((c) => ({ id: c.id, label: c.name }))}
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
            pricedCategories.map((c) => (
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
    </AppShell>
  );
}

/* ---------------------------------------------------------------------- */
/* הזמנה חד-פעמית — DB-backed, כולל שאלת ההעתקה לפי החלטה 11.               */
/* ---------------------------------------------------------------------- */

/** בוחר איזו הזמנה קודמת להציע להעתקה, לפי יום השבוע של תאריך היעד (החלטה 11):
 * יעד ביום שישי -> ההזמנה האחרונה ליום שישי; יעד ביום אחר -> האחרונה שאינה שישי;
 * נופל חזרה להזמנה האחרונה בכלל אם אין התאמה לאותה "קטגוריית יום". */
function pickCopyCandidate(orders: Order[], targetIso: string): Order | undefined {
  const candidates = orders.filter((o) => o.status !== "draft" && o.status !== "cancelled" && o.lines.length > 0);
  const targetIsFriday = parseDate(targetIso).getDay() === 5;
  const isFridayOrder = (o: Order) => o.date !== null && parseDate(o.date).getDay() === 5;
  const byDateDesc = (a: Order, b: Order) => (b.date ?? "").localeCompare(a.date ?? "");

  const sameCategory = candidates.filter((o) => isFridayOrder(o) === targetIsFriday).sort(byDateDesc);
  if (sameCategory[0]) return sameCategory[0];
  return candidates.slice().sort(byDateDesc)[0];
}

const DISMISS_KEY = "copyPromptDismissed";

function OrderCatalogPage() {
  const navigate = useNavigate();
  const { copy } = Route.useSearch();
  const { auth } = Route.useRouteContext();
  const { categories: CATEGORIES } = useCatalog();
  const myPrices = useMyPrices();
  const { customer } = useMyCustomer();
  const { cart, isLoading: cartLoading } = useCartOrder();
  const { orders } = useMyOrders();
  const upsertLine = useUpsertCartLine();
  const addLines = useAddCartLines();
  const setDateRound = useSetCartDateRound();

  const [category, setCategory] = useState(CATEGORIES[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lockRef = useRef(false);

  const quantities = useMemo(() => {
    const q: Record<string, number> = {};
    for (const line of cart?.lines ?? []) q[line.productId] = line.qty;
    return q;
  }, [cart]);
  const total = useMemo(
    () => (cart?.lines ?? []).reduce((sum, l) => sum + l.qty * l.unitPrice, 0),
    [cart],
  );
  const selectedCount = Object.keys(quantities).length;

  const lastOrder = useMemo(
    () => orders.filter((o) => o.status !== "cancelled" && o.status !== "draft" && o.lines.length > 0)[0],
    [orders],
  );
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    if (copy === 1) {
      sessionStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
      return;
    }
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, [copy]);
  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const isEmptyCart = selectedCount === 0;
  const [copyStep, setCopyStep] = useState<"ask" | "date" | null>(null);
  const [copyDate, setCopyDate] = useState<string | null>(null);
  const [copyRound, setCopyRound] = useState<"morning" | "noon">("morning");
  const [copying, setCopying] = useState(false);
  const askCopy = !cartLoading && !!lastOrder && !dismissed && (copy === 1 || isEmptyCart) && copyStep === null;
  useEffect(() => {
    if (askCopy) setCopyStep("ask");
  }, [askCopy]);

  const closeCopyFlow = () => {
    dismiss();
    setCopyStep(null);
    if (copy === 1) navigate({ to: "/catalog", search: {}, replace: true });
  };

  const confirmCopyDate = async () => {
    if (!copyDate || !auth?.customerId || copying) return;
    setCopying(true);
    try {
      const candidate = pickCopyCandidate(orders, copyDate);
      const cartId = await addLines.mutateAsync({
        customerId: auth.customerId,
        lines: candidate?.lines ?? [],
      });
      await setDateRound.mutateAsync({ orderId: cartId, date: copyDate, round: copyRound });
      dismiss();
      setCopyStep(null);
      navigate({ to: "/summary", search: { order: cartId } as never, replace: true });
    } finally {
      setCopying(false);
    }
  };

  const searching = query.trim().length > 0;
  const pricedCategories = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        products: c.products.map((p): Product => ({ ...p, price: priceFor(p, myPrices) })),
      })),
    [CATEGORIES, myPrices],
  );
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return pricedCategories.flatMap((c) => c.products).filter((p) => p.name.includes(q));
  }, [query, pricedCategories]);

  useEffect(() => {
    if (!askCopy) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [askCopy]);

  useEffect(() => {
    if (searching || copyStep) return;
    const onScroll = () => {
      if (lockRef.current) return;
      const anchor = headerOffset() + 12;
      let current = pricedCategories[0]?.id ?? "";
      for (const c of pricedCategories) {
        const el = sectionRefs.current[c.id];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= anchor) current = c.id;
      }
      setCategory((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [searching, pricedCategories, copyStep]);

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
    requestAnimationFrame(scrollToSection);
    window.setTimeout(scrollToSection, 120);
    window.setTimeout(() => {
      lockRef.current = false;
    }, 900);
  };

  const changeQty = (product: Product, nextQty: number) => {
    if (!auth?.customerId) return;
    upsertLine.mutate({
      customerId: auth.customerId,
      line: {
        productId: product.id,
        productName: product.name,
        sku: product.sku ?? null,
        unit: product.unit,
        qty: nextQty,
        unitPrice: product.price,
      },
    });
  };

  // לקוח חסום עדיין רואה הכול (היסטוריה, הזמנות קיימות) — רק נקודת הכניסה להזמנה חדשה
  // חסומה, עם הסבר (החלטה 13). זו נקודת הכניסה היחידה להזמנה חדשה בצד הלקוח, אז חוסמים
  // את כל המסך במקום כפתור בודד.
  if (customer?.blocked) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="בחירת מוצרים" backTo="/" />
        </AppHeader>
        <Section className="pb-10">
          <EmptyState
            title="החשבון חסום זמנית"
            description="לא ניתן לפתוח הזמנה חדשה כרגע. לבירור, פנו למאפייה דרך דף יצירת הקשר."
            action={<Button onClick={() => navigate({ to: "/contact" })}>לדף יצירת הקשר</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  if (copyStep === "date") {
    const now = israelNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
    const askRound = !!customer?.allowedRounds.includes("noon");

    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="לאיזה תאריך?" onBack={() => setCopyStep("ask")} />
        </AppHeader>
        <Section className="pb-28">
          <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">בחירת מועד אספקה</h2>
          <DateCalendar
            value={copyDate}
            onSelect={setCopyDate}
            isEnabled={(iso, d) =>
              d.getTime() > today.getTime() && d.getTime() <= maxDate.getTime() && d.getDay() !== 6 && !isCutoffPassed(iso)
            }
          />
          {askRound ? (
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-muted-foreground">סבב אספקה</div>
              <div className="flex gap-2">
                {(["morning", "noon"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCopyRound(r)}
                    className={`flex-1 rounded-xl border px-3.5 py-3 text-[13.5px] font-semibold ${
                      copyRound === r ? "border-[1.5px] border-primary bg-primary-soft text-foreground" : "border-border bg-card text-foreground"
                    }`}
                  >
                    {r === "morning" ? "סבב ראשון" : "סבב שני"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
        <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
          <div className="mx-auto flex max-w-5xl gap-2.5">
            <Button variant="secondary" size="lg" className="font-semibold" onClick={closeCopyFlow}>
              דילוג
            </Button>
            <Button size="lg" className="flex-1" disabled={!copyDate} loading={copying} onClick={() => void confirmCopyDate()}>
              המשך
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="בחירת מוצרים" />
        {searching ? null : (
          <div className="mx-auto w-full max-w-5xl px-3.5 pb-2.5 md:px-5">
            <Tabs
              tabs={pricedCategories.map((c) => ({ id: c.id, label: c.name }))}
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
                  onChange={(delta) => changeQty(p, (quantities[p.id] ?? 0) + delta)}
                  onSetQty={(qty) => changeQty(p, qty)}
                />
              ))
            )
          ) : (
            pricedCategories.map((c) => (
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
                    onChange={(delta) => changeQty(p, (quantities[p.id] ?? 0) + delta)}
                    onSetQty={(qty) => changeQty(p, qty)}
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

      {copyStep === "ask" ? (
        <CopyLastOrderPrompt onConfirm={() => setCopyStep("date")} onDecline={closeCopyFlow} />
      ) : null}
    </AppShell>
  );
}
