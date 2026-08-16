import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { TextInput } from "@/components/app/form-controls";
import { QuantityStepper } from "@/components/app/product-card";
import { Chip } from "@/components/app/status-chip";
import { ALL_PRODUCTS, ROUNDS, findProduct } from "@/data/catalog";
import type { RoundId } from "@/data/catalog";
import { tomorrowIso } from "@/lib/admin/dates";
import { hasOverride, priceFor } from "@/lib/admin/pricing";
import { clampQty, formatDate, formatPrice, formatWeekday, unitLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/customers/$customerId/new-order")({
  head: () => ({
    meta: [
      { title: "הזמנה בשם לקוח — ניהול המאפייה" },
      { name: "description", content: "יצירת הזמנה עבור לקוח של המאפייה לפי הרשאות הסבב והמחירים המיוחדים שלו." },
      { property: "og:title", content: "הזמנה בשם לקוח — ניהול המאפייה" },
      { property: "og:description", content: "יצירת הזמנה עבור לקוח לפי המחירים המיוחדים שלו." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewCustomerOrderPage,
});

function NewCustomerOrderPage() {
  const { customerId } = useParams({ from: "/admin/customers/$customerId/new-order" });
  const { customers, hydrated, addAdminOrder } = useStore();
  const navigate = useNavigate();
  const customer = customers.find((c) => c.id === customerId);

  const [date, setDate] = useState(() => tomorrowIso());
  const [round, setRound] = useState<RoundId | null>(null);
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const allowedRounds = useMemo(
    () => ROUNDS.filter((r) => customer?.allowedRounds.includes(r.id)),
    [customer],
  );
  const activeRound = round ?? allowedRounds[0]?.id ?? null;

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL_PRODUCTS.filter((p) => p.name.includes(q)).slice(0, 8);
  }, [query]);

  const lines = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty })),
    [quantities],
  );

  const total = lines.reduce((sum, l) => {
    const p = findProduct(l.productId);
    return p ? sum + priceFor(customer, p) * l.qty : sum;
  }, 0);

  const setQty = (productId: string, qty: number) =>
    setQuantities((q) => {
      const next = { ...q };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });

  if (!customer) {
    return (
      <AdminShell>
        <Section className="pt-6 pb-10">
          {hydrated ? <EmptyState title="הלקוח לא נמצא" description="אפשר לחזור לרשימת הלקוחות." /> : null}
        </Section>
      </AdminShell>
    );
  }

  const blocked = Boolean(customer.blocked);

  return (
    <AdminShell>
      <Section className="pt-5 pb-10">
        <Link
          to="/admin/customers/$customerId"
          params={{ customerId: customer.id }}
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary no-underline"
        >
          <ChevronRight className="size-4" />
          חזרה לכרטיס הלקוח
        </Link>
        <h1 className="mb-1 text-[19px] font-bold text-heading">הזמנה חדשה</h1>
        <div className="mb-4 text-[12.5px] text-muted-foreground">עבור {customer.name}</div>

        {blocked ? (
          <EmptyState
            title="הלקוח חסום"
            description="לא ניתן ליצור הזמנה ללקוח חסום. יש לשחרר את החסימה בכרטיס הלקוח."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Card className="flex flex-col gap-2.5">
              <div className="text-[12px] font-semibold text-muted-foreground">תאריך אספקה</div>
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="תאריך אספקה" />
              <div className="text-[11.5px] text-muted-foreground">
                {formatWeekday(date)}, {formatDate(date)}
              </div>
            </Card>

            <Card className="flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-muted-foreground">סבב אספקה</div>
              {allowedRounds.length === 0 ? (
                <div className="text-[12.5px] text-destructive">ללקוח אין הרשאת סבב. יש לעדכן בכרטיס הלקוח.</div>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row">
                  {allowedRounds.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRound(r.id)}
                      className={cn(
                        "flex flex-1 items-center justify-between rounded-xl border px-3.5 py-3 text-start",
                        activeRound === r.id
                          ? "border-[1.5px] border-primary bg-primary-soft"
                          : "border-border bg-card",
                      )}
                    >
                      <span className="text-[13.5px] font-semibold text-foreground">{r.label}</span>
                      <span className="text-[12px] text-muted-foreground">{r.time}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="flex flex-col gap-2.5">
              <div className="text-[12px] font-semibold text-muted-foreground">הוספת מוצרים</div>
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
              {results.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card-muted px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-foreground">{p.name}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>
                        {formatPrice(priceFor(customer, p))} ל{unitLabel(p.unit)}
                      </span>
                      {hasOverride(customer, p.id) ? <Chip tone="accent">מחיר מיוחד</Chip> : null}
                    </div>
                  </div>
                  <QuantityStepper
                    product={p}
                    qty={quantities[p.id] ?? 0}
                    compact
                    onChange={(delta) => setQty(p.id, clampQty(p, (quantities[p.id] ?? 0) + delta))}
                    onSetQty={(qty) => setQty(p.id, qty)}
                  />
                </div>
              ))}
              {query.trim() && results.length === 0 ? (
                <div className="text-[12px] text-muted-foreground">לא נמצאו מוצרים מתאימים.</div>
              ) : null}
            </Card>

            <Card className="flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-muted-foreground">פריטים בהזמנה</div>
              {lines.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground">עדיין לא נבחרו מוצרים.</div>
              ) : (
                lines.map((l) => {
                  const p = findProduct(l.productId);
                  if (!p) return null;
                  return (
                    <div key={l.productId} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate font-semibold text-foreground">{p.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {l.qty} × {formatPrice(priceFor(customer, p))}
                      </span>
                    </div>
                  );
                })
              )}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-[13.5px]">
                <span className="font-semibold text-muted-foreground">סה״כ</span>
                <span className="font-bold text-heading">{formatPrice(total)}</span>
              </div>
            </Card>

            <Button
              disabled={lines.length === 0 || !activeRound}
              onClick={() => {
                if (!activeRound) return;
                const created = addAdminOrder({
                  customerId: customer.id,
                  date,
                  round: activeRound,
                  status: "approved",
                  lines,
                  createdFrom: "manual",
                });
                void navigate({ to: "/admin/orders/$orderId", params: { orderId: created.id } });
              }}
            >
              יצירת ההזמנה
            </Button>
          </div>
        )}
      </Section>
    </AdminShell>
  );
}
