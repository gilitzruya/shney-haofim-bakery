import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Croissant,
  ChevronDown,
  ChevronLeft,
  FileText,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { BakingSheet } from "@/components/admin/baking-sheet";
import { PackingSheet } from "@/components/admin/packing-sheet";
import { TomorrowSummaryCard } from "@/components/admin/tomorrow-summary-card";
import { Section } from "@/components/app/app-shell";
import { Chip } from "@/components/app/status-chip";
import { useAllAdminOrderViews } from "@/hooks/use-admin-orders";
import { intakeTime, tomorrowIso } from "@/lib/admin/dates";
import { ordersForDate, summarizeDay } from "@/lib/admin/selectors";
import { buildDistributionReport, buildProductionReport } from "@/lib/admin/reports";
import { formatDate, formatPrice, formatShortDateNumeric, formatWeekday } from "@/lib/format";
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

type PrintTarget = "production" | "distribution" | null;

function AdminHomePage() {
  const { hydrated } = useStore();
  const date = tomorrowIso();
  const views = useAllAdminOrderViews();

  const [pendingPrint, setPendingPrint] = useState<PrintTarget>(null);

  const summary = useMemo(() => {
    const forDate = views.filter((v) => ordersForDate([v.order], date).length > 0);
    return summarizeDay(forDate, date);
  }, [views, date]);

  const tomorrowViews = useMemo(
    () => views.filter((v) => v.order.date === date && v.order.status !== "cancelled" && v.order.status !== "draft"),
    [views, date],
  );
  const productionGroups = useMemo(() => buildProductionReport(tomorrowViews), [tomorrowViews]);
  const distributionGroups = useMemo(() => buildDistributionReport(tomorrowViews), [tomorrowViews]);

  useEffect(() => {
    if (!pendingPrint) return undefined;
    const id = window.setTimeout(() => {
      window.print();
      setPendingPrint(null);
    }, 250);
    return () => window.clearTimeout(id);
  }, [pendingPrint]);

  const todayIntake = useMemo(
    () =>
      views
        .filter((v) => v.order.status !== "cancelled" && v.order.status !== "draft")
        .map((v) => ({ view: v, time: intakeTime(v.order.id) }))
        .sort((a, b) => b.time.localeCompare(a.time)),
    [views],
  );
  const [intakeExpanded, setIntakeExpanded] = useState(false);
  const visibleIntake = intakeExpanded ? todayIntake : todayIntake.slice(0, 3);

  const attention = useMemo(() => {
    const drafts = views.filter((v) => v.order.status === "draft").length;
    const flagged = views.filter((v) => v.order.status === "needs_update").length;
    return { drafts, flagged, missingNotes: 0 };
  }, [views]);

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setUpdatedAt(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    );
  }, []);

  return (
    <AdminShell>
      {pendingPrint === "production" ? <BakingSheet date={date} groups={productionGroups} /> : null}
      {pendingPrint === "distribution" ? <PackingSheet date={date} groups={distributionGroups} /> : null}

      <Section className="pt-4 pb-10 md:pt-6 print:hidden">
        <TomorrowSummaryCard summary={hydrated ? summary : { date, ordersCount: 0, productsCount: 0, total: 0 }} views={tomorrowViews} />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <PrintReportButton
            icon={<Truck className="size-5" />}
            title="הדפסת דוח חלוקה"
            onClick={() => setPendingPrint("distribution")}
          />
          <PrintReportButton
            icon={<FileText className="size-5" />}
            title="הדפסת דוח אפייה / ייצור"
            onClick={() => setPendingPrint("production")}
          />
        </div>

        <div className="mt-3 rounded-[22px] border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-primary">הזמנות שנכנסו היום</h2>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                מתעדכן אוטומטית{updatedAt ? ` • עודכן לאחרונה ${updatedAt}` : ""}
              </div>
            </div>
            <RefreshCw className="size-4 shrink-0 text-primary" />
          </div>

          <div className="mt-3">
            {!hydrated || todayIntake.length === 0 ? (
              <div className="py-3 text-center text-[12.5px] text-muted-foreground">אין הזמנות חדשות היום</div>
            ) : (
              visibleIntake.map(({ view, time }, index) => (
                <Link
                  key={view.order.id}
                  to="/admin/orders/$orderId"
                  params={{ orderId: view.order.id }}
                  className="flex items-center gap-2 border-b border-dashed border-border py-2.5 no-underline last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-foreground">{view.customerName}</span>
                      {index === 0 ? <Chip tone="accent">חדש</Chip> : null}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatWeekday(view.order.date)} · {formatShortDateNumeric(view.order.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{time}</span>
                  <span className="w-[74px] shrink-0 text-end text-[13px] font-bold text-heading tabular-nums">
                    {formatPrice(view.total)}
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-primary" />
                </Link>
              ))
            )}
          </div>

          {hydrated && todayIntake.length > 3 ? (
            <button
              type="button"
              aria-expanded={intakeExpanded}
              onClick={() => setIntakeExpanded((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 py-1 text-[12.5px] font-bold text-primary"
            >
              {intakeExpanded ? "הצגה מצומצמת" : `לכל ההזמנות שנכנסו היום (${todayIntake.length})`}
              <ChevronDown className={`size-4 transition-transform ${intakeExpanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </div>


        <div className="mt-3 rounded-[22px] border border-border bg-card p-4">
          <h2 className="text-[16px] font-bold text-primary">דורש טיפול</h2>
          {hydrated && attention.drafts + attention.flagged + attention.missingNotes === 0 ? (
            <div className="py-3 text-center text-[12.5px] text-muted-foreground">
              אין כרגע משימות שדורשות טיפול 🎉
            </div>
          ) : (
            <div className="mt-2">
              {attention.drafts > 0 ? (
                <AttentionRow
                  icon={<AlertTriangle className="size-[18px] text-destructive" />}
                  text={`${attention.drafts} טיוטות עדיין לא אושרו`}
                  count={attention.drafts}
                />
              ) : null}
              {attention.flagged > 0 ? (
                <AttentionRow
                  icon={<AlertTriangle className="size-[18px] text-accent-foreground" />}
                  text={attention.flagged === 1 ? "הזמנה אחת עם חריגה" : `${attention.flagged} הזמנות עם חריגה`}
                  count={attention.flagged}
                />
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <ShortcutTile to="/admin/customers" icon={<Users className="size-5" />} title="לקוחות" subtitle="ניהול לקוחות" />
          <ShortcutTile to="/admin/products" icon={<Croissant className="size-5" />} title="מוצרים" subtitle="ניהול מוצרים" />
        </div>
      </Section>
    </AdminShell>
  );
}

function PrintReportButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-[18px] border border-border bg-card px-3 py-3.5 text-start"
    >
      <ChevronLeft className="size-4 shrink-0 text-primary" />
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-[12.5px] leading-tight font-bold text-heading">{title}</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
          {icon}
        </span>
      </span>
    </button>
  );
}

function AttentionRow({ icon, text, count }: { icon: React.ReactNode; text: string; count: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-border py-2.5 last:border-b-0">
      <span className="w-8 shrink-0 rounded-full bg-destructive-bg py-[3px] text-center text-[11px] font-bold text-destructive">
        {count}
      </span>
      <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">{text}</span>
      <span className="shrink-0">{icon}</span>
    </div>
  );
}

function ShortcutTile({
  to,
  icon,
  title,
  subtitle,
}: {
  to: "/admin/customers" | "/admin/products";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-[18px] border border-border bg-card px-3 py-3.5 no-underline"
    >
      <ChevronLeft className="size-4 shrink-0 text-primary" />
      <span className="flex min-w-0 items-center gap-2 text-right">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-heading">{title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          {icon}
        </span>
      </span>
    </Link>
  );
}
