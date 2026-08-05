import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, ClipboardList, Repeat } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, Section } from "@/components/app/app-shell";
import { Card } from "@/components/app/card";
import { Chip, StatusChip } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import { formatDate, formatPrice, linesCount, linesTotal, nextOccurrence, weekdaysLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דף הבית — מאפיית שני האופים" },
      {
        name: "description",
        content: "מרכז ההזמנות הסיטונאיות שלכם: הזמנה חדשה, הזמנות קרובות והזמנות קבועות.",
      },
      { property: "og:title", content: "דף הבית — מאפיית שני האופים" },
      { property: "og:description", content: "מרכז ההזמנות הסיטונאיות של מאפיית שני האופים." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { orders, recurring } = useStore();
  const upcoming = orders
    .filter((o) => !o.closed && o.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const activeRecurring = recurring.filter((r) => r.status === "active");

  return (
    <AppShell>
      <AppHeader />
      <Section className="pb-10">
        <Link
          to="/new-order"
          className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-primary-soft p-4 no-underline"
        >
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-foreground">יצירת הזמנה חדשה</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              בחרו מועד אספקה והתחילו להזמין
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary text-primary-foreground">
            <CalendarPlus className="size-[22px]" />
          </span>
        </Link>


        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <QuickAction to="/orders" icon={<ClipboardList className="size-[18px]" />} label="ההזמנות שלי" />
          <QuickAction to="/recurring" icon={<Repeat className="size-[18px]" />} label="הזמנות קבועות" />
        </div>

        <SectionTitle title="הזמנות קרובות" linkTo="/orders" linkLabel="לכל ההזמנות" />
        <div className="flex flex-col gap-2.5">
          {upcoming.length === 0 ? (
            <Card variant="muted">
              <div className="text-center text-[12.5px] text-muted-foreground">אין הזמנות קרובות כרגע.</div>
            </Card>
          ) : (
            upcoming.map((order) => (
              <Link
                key={order.id}
                to="/orders/$orderId"
                params={{ orderId: order.id }}
                className="no-underline"
              >
                <Card>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13.5px] font-semibold text-foreground">
                      {formatDate(order.date)} · {roundLabel(order.round)}
                    </div>
                    <StatusChip status={order.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>{linesCount(order.lines)} מוצרים</span>
                    <span className="font-semibold text-foreground">{formatPrice(linesTotal(order.lines))}</span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>

        <SectionTitle title="הזמנות קבועות" linkTo="/recurring" linkLabel="ניהול" />
        <div className="flex flex-col gap-2.5">
          {activeRecurring.length === 0 ? (
            <Card variant="muted">
              <div className="text-center text-[12.5px] text-muted-foreground">אין הזמנות קבועות פעילות.</div>
            </Card>
          ) : (
            activeRecurring.slice(0, 2).map((rec) => {
              const next = nextOccurrence(rec.weekdays);
              return (
                <Link
                  key={rec.id}
                  to="/recurring/$recurringId"
                  params={{ recurringId: rec.id }}
                  className="no-underline"
                >
                  <Card variant={rec.needsAttention ? "attention" : "active"}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-semibold text-foreground">{rec.name}</div>
                      <Chip tone="accent">קבועה</Chip>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {weekdaysLabel(rec.weekdays)} · {roundLabel(rec.round)}
                    </div>
                    {next ? (
                      <div className="mt-1 text-[11.5px] text-primary">האספקה הבאה: {formatDate(next)}</div>
                    ) : null}
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </Section>
    </AppShell>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-[14px] border border-border bg-card px-2 py-3 text-center no-underline"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
      <span className="text-[11.5px] font-semibold text-foreground">{label}</span>
    </Link>
  );
}

function SectionTitle({ title, linkTo, linkLabel }: { title: string; linkTo: string; linkLabel: string }) {
  return (
    <div className="mt-5 mb-2.5 flex items-center justify-between">
      <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
      <Link to={linkTo} className="text-[12px] font-semibold text-primary no-underline">
        {linkLabel}
      </Link>
    </div>
  );
}
