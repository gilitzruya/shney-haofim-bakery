import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState, ErrorState, SkeletonCard } from "@/components/app/card";
import { Chip, StatusChip } from "@/components/app/status-chip";
import { FilterChips, Tabs } from "@/components/app/tabs";
import { Modal } from "@/components/app/modal";
import { ProductCard, ProductPlaceholder } from "@/components/app/product-card";
import { FormField, ProgressSteps, TextInput, WeekdayChips } from "@/components/app/form-controls";
import { allProducts } from "@/data/catalog";
import type { OrderStatus } from "@/data/seed";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "מערכת העיצוב — מאפיית שני האופים" },
      { name: "description", content: "צבעים, טיפוגרפיה ורכיבים משותפים של מערכת ההזמנות." },
      { property: "og:title", content: "מערכת העיצוב — מאפיית שני האופים" },
      { property: "og:description", content: "מדריך הרכיבים והטוקנים של האפליקציה." },
    ],
  }),
  component: DesignSystemPage,
});

const TOKENS = [
  { name: "primary", className: "bg-primary" },
  { name: "primary-soft", className: "bg-primary-soft" },
  { name: "accent", className: "bg-accent" },
  { name: "accent-soft", className: "bg-accent-soft" },
  { name: "canvas", className: "bg-canvas border border-border" },
  { name: "background", className: "bg-background border border-border" },
  { name: "card-muted", className: "bg-card-muted border border-border" },
  { name: "destructive", className: "bg-destructive" },
];

const STATUSES: OrderStatus[] = ["draft", "approved", "needs_update", "reopened", "completed", "cancelled"];

function DesignSystemPage() {
  const [tab, setTab] = useState("a");
  const [filter, setFilter] = useState("all");
  const [qty, setQty] = useState(2);
  const [days, setDays] = useState<number[]>([0, 2]);
  const [modal, setModal] = useState(false);
  const demoProduct = allProducts()[0]!;

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="מערכת העיצוב" backTo="/" />
      </AppHeader>
      <Section className="pb-12">
        <Block title="צבעים">
          <div className="grid grid-cols-4 gap-2">
            {TOKENS.map((t) => (
              <div key={t.name} className="flex flex-col items-center gap-1">
                <div className={`h-12 w-full rounded-[10px] ${t.className}`} />
                <span className="text-[9.5px] text-muted-foreground">{t.name}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="טיפוגרפיה">
          <div className="flex flex-col gap-1">
            <div className="text-[19px] font-bold text-foreground">כותרת מסך · 19px Bold</div>
            <div className="text-[15px] font-bold text-foreground">כותרת מקטע · 15px Bold</div>
            <div className="text-[13.5px] font-semibold text-foreground">כותרת כרטיס · 13.5px Semibold</div>
            <div className="text-[12.5px] text-muted-foreground">טקסט משני · 12.5px Regular</div>
            <div className="text-[11px] text-muted-foreground">טקסט זעיר · 11px Regular</div>
          </div>
        </Block>

        <Block title="כפתורים">
          <div className="flex flex-wrap gap-2">
            <Button>ראשי</Button>
            <Button variant="secondary">משני</Button>
            <Button variant="outline">מסגרת</Button>
            <Button variant="accent">הדגשה</Button>
            <Button variant="destructive">מחיקה</Button>
            <Button disabled>מושבת</Button>
            <Button loading>נשלח…</Button>
          </div>
        </Block>

        <Block title="תגיות סטטוס">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <StatusChip key={s} status={s} />
            ))}
            <Chip tone="error">לא זמין</Chip>
          </div>
        </Block>

        <Block title="ניווט וסינון">
          <Tabs
            tabs={[
              { id: "a", label: "הזמנות פתוחות" },
              { id: "b", label: "היסטוריה" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-2.5">
            <FilterChips
              chips={[
                { id: "all", label: "הכול" },
                { id: "active", label: "פעילות" },
                { id: "paused", label: "מושהות" },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <div className="mt-2.5">
            <ProgressSteps total={3} current={2} />
          </div>
        </Block>

        <Block title="כרטיס מוצר ובורר כמות">
          <ProductCard product={demoProduct} qty={qty} onChange={(d) => setQty(Math.max(0, qty + d))} />
          <div className="flex items-center gap-2.5">
            <ProductPlaceholder />
            <span className="text-[12px] text-muted-foreground">מציין מיקום לתמונת מוצר</span>
          </div>
        </Block>

        <Block title="שדות טופס">
          <FormField label="שם ההזמנה" hint="טקסט עזרה מתחת לשדה">
            <TextInput placeholder="לדוגמה: אספקת בוקר" />
          </FormField>
          <div className="mt-3">
            <div className="mb-2 text-[12px] font-semibold text-muted-foreground">ימי אספקה</div>
            <WeekdayChips value={days} onChange={setDays} />
          </div>
        </Block>

        <Block title="מצבי מסך">
          <div className="flex flex-col gap-2.5">
            <SkeletonCard />
            <EmptyState title="אין נתונים להצגה" description="כאן יופיע תוכן לאחר יצירת הזמנה." />
            <ErrorState title="שגיאה בטעינה" description="לא הצלחנו לטעון את הנתונים." onRetry={() => undefined} />
            <Card variant="attention">כרטיס הדורש תשומת לב</Card>
            <Card variant="muted">כרטיס לא פעיל</Card>
          </div>
        </Block>

        <Block title="חלונית אישור">
          <Button variant="secondary" onClick={() => setModal(true)}>
            פתיחת חלונית
          </Button>
          <Modal
            open={modal}
            title="לאשר את הפעולה?"
            description="זהו טקסט הסבר קצר שמופיע בחלונית האישור."
            confirmLabel="אישור"
            onConfirm={() => setModal(false)}
            onClose={() => setModal(false)}
          />
        </Block>
      </Section>
    </AppShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 text-[15px] font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
