import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ClipboardList, FileText, Truck } from "lucide-react";
import { useMemo } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { TomorrowSummaryCard } from "@/components/admin/tomorrow-summary-card";
import { Section } from "@/components/app/app-shell";
import { tomorrowIso } from "@/lib/admin/dates";
import { ordersForDate, summarizeDay, toOrderViews } from "@/lib/admin/selectors";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "ניהול המאפייה — מאפיית שני האופים" },
      {
        name: "description",
        content: "מסך הניהול היומי של המאפייה: סיכום ההזמנות למחר, דוח ייצור ודוח חלוקה.",
      },
      { property: "og:title", content: "ניהול המאפייה — מאפיית שני האופים" },
      { property: "og:description", content: "סיכום ההזמנות למחר ופעולות תפעוליות יומיות." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHomePage,
});

function AdminHomePage() {
  const { orders, adminOrders, customers, hydrated } = useStore();
  const date = tomorrowIso();

  const summary = useMemo(() => {
    const all = [...orders, ...adminOrders];
    const views = toOrderViews(ordersForDate(all, date), customers);
    return summarizeDay(views, date);
  }, [orders, adminOrders, customers, date]);

  return (
    <AdminShell>
      <Section className="pt-6 pb-10 md:pt-8">
        <TomorrowSummaryCard summary={hydrated ? summary : { date, ordersCount: 0, itemsCount: 0, total: 0 }} />


        <h2 className="mt-8 mb-3 text-[16px] font-bold text-heading">פעולות מהירות</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <ActionTile
            to="/admin/reports/production"
            icon={<FileText className="size-5" />}
            title="הפקת דוח ייצור"
            subtitle="כמויות לייצור ליום האספקה"
          />
          <ActionTile
            to="/admin/reports/distribution"
            icon={<Truck className="size-5" />}
            title="הפקת דוח חלוקה"
            subtitle="אריזה וחלוקה לפי סבב ולקוח"
          />
        </div>
      </Section>
    </AdminShell>
  );
}

function ActionTile({
  to,
  icon,
  title,
  subtitle,
}: {
  to: "/admin/reports/production" | "/admin/reports/distribution";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-card px-4 py-4 no-underline"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-[12px] bg-accent-soft text-accent-foreground">
          {icon}
        </span>
        <span>
          <span className="block text-[15px] font-bold text-heading">{title}</span>
          <span className="block text-[11.5px] text-muted-foreground">{subtitle}</span>
        </span>
      </span>
      <ChevronLeft className="size-4 text-primary" />
    </Link>
  );
}
