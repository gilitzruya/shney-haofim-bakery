import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, Section } from "@/components/app/app-shell";
import { Card } from "@/components/app/card";
import { Chip, StatusChip } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import { formatDate, formatPrice, linesCount, linesTotal, nextOccurrence } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דף הבית — מאפיית שני האופים" },
      {
        name: "description",
        content: "מרכז ההזמנות הסיטונאיות שלכם: הזמנה חדשה וכל ההזמנות הקרובות במקום אחד.",
      },
      { property: "og:title", content: "דף הבית — מאפיית שני האופים" },
      { property: "og:description", content: "מרכז ההזמנות הסיטונאיות של מאפיית שני האופים." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { orders, recurring } = useStore();
  const upcomingOrders = orders
    .filter((o) => !o.closed && o.status !== "cancelled")
    .map((o) => ({ kind: "order" as const, date: o.date, order: o }));
  const upcomingRecurring = recurring
    .filter((r) => r.status === "active")
    .map((r) => ({ kind: "recurring" as const, date: nextOccurrence(r.weekdays), rec: r }))
    .filter((r): r is { kind: "recurring"; date: string; rec: (typeof recurring)[number] } => Boolean(r.date));
  const upcoming = [...upcomingOrders, ...upcomingRecurring]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

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


        <SectionTitle title="הזמנות קרובות" linkTo="/orders" linkLabel="לכל ההזמנות" />
        <div className="flex flex-col gap-2.5">
          {upcoming.length === 0 ? (
            <Card variant="muted">
              <div className="text-center text-[12.5px] text-muted-foreground">אין הזמנות קרובות כרגע.</div>
            </Card>
          ) : (
            upcoming.map((item) =>
              item.kind === "order" ? (
                <Link
                  key={item.order.id}
                  to="/orders/$orderId"
                  params={{ orderId: item.order.id }}
                  className="no-underline"
                >
                  <Card>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-semibold text-foreground">
                        {formatDate(item.order.date)} · {roundLabel(item.order.round)}
                      </div>
                      <StatusChip status={item.order.status} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>{linesCount(item.order.lines)} מוצרים</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(linesTotal(item.order.lines))}
                      </span>
                    </div>
                  </Card>
                </Link>
              ) : (
                <Link
                  key={item.rec.id}
                  to="/recurring/$recurringId"
                  params={{ recurringId: item.rec.id }}
                  className="no-underline"
                >
                  <Card variant={item.rec.needsAttention ? "attention" : "active"}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-semibold text-foreground">
                        {formatDate(item.date)} · {roundLabel(item.rec.round)}
                      </div>
                      <Chip tone="accent">קבועה</Chip>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>{item.rec.name}</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(linesTotal(item.rec.lines))}
                      </span>
                    </div>
                  </Card>
                </Link>
              ),
            )
          )}
        </div>
      </Section>
    </AppShell>
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
