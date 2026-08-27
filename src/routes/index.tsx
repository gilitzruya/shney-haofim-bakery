import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, CalendarPlus, ChevronLeft, Tag } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, Section } from "@/components/app/app-shell";
import { Card } from "@/components/app/card";
import { Chip, StatusChip } from "@/components/app/status-chip";
import { formatDate, formatPrice, linesCount, linesTotal, nextOccurrence } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.auth?.role === "admin" ? "/admin" : "/catalog" });
  },

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
      <div className="relative z-10 flex min-h-screen w-full flex-col">
      <AppHeader />

      <Section className="pt-24 pb-10 md:pt-28">
        <Link
          to="/catalog"
          className="relative block overflow-hidden rounded-[26px] bg-primary p-5 no-underline shadow-[0_18px_40px_-18px_rgba(74,31,45,0.55)] md:p-7"
        >
          <div className="flex items-center gap-4 md:gap-6">
            <span className="flex size-[86px] shrink-0 items-center justify-center rounded-full bg-canvas text-primary shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)] md:size-[104px]">
              <CalendarPlus className="size-11 md:size-14" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[24px] leading-tight font-bold text-primary-foreground md:text-[30px]">
                יצירת הזמנה חדשה
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-primary-foreground/85 md:text-[15px]">
                בחרו מועד אספקה והתחילו להזמין
              </p>
              <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-bold text-accent-foreground">
                התחילו עכשיו
                <ChevronLeft className="size-4" />
              </span>
            </div>
          </div>
        </Link>

        <div className="mt-20 mb-3 flex items-center justify-between gap-2 md:mt-24">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-[12px] bg-accent-soft text-heading">
              <CalendarDays className="size-[18px]" />
            </span>
            <h2 className="text-[18px] font-bold text-heading">הזמנות קרובות</h2>
          </div>
          <Link to="/orders" className="text-[12px] font-semibold text-primary no-underline">
            לכל ההזמנות
          </Link>
        </div>

        <div className="flex flex-col gap-3">
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
                      <div className="text-[13.5px] font-semibold text-heading">
                        {formatDate(item.order.date)}
                      </div>
                      <StatusChip status={item.order.status} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      {linesCount(item.order.lines)} מוצרים
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <Tag className="size-[14px]" />
                        </span>
                        <span className="text-[14px] font-bold text-heading">
                          {formatPrice(linesTotal(item.order.lines))}
                        </span>
                      </span>
                      <ChevronLeft className="size-4 text-primary" />
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
                      <div className="text-[13.5px] font-semibold text-heading">
                        {formatDate(item.date)}
                      </div>
                      <Chip tone="accent">קבועה</Chip>
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">{item.rec.name}</div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <Tag className="size-[14px]" />
                        </span>
                        <span className="text-[14px] font-bold text-heading">
                          {formatPrice(linesTotal(item.rec.lines))}
                        </span>
                      </span>
                      <ChevronLeft className="size-4 text-primary" />
                    </div>
                  </Card>
                </Link>
              ),
            )
          )}
        </div>
      </Section>
      </div>
    </AppShell>
  );
}
