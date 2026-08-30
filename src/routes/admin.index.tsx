import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Croissant,
  ChevronDown,
  ChevronLeft,
  FileText,
  Info,
  Receipt,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";


import { AdminShell } from "@/components/admin/admin-shell";
import { BakingSheet } from "@/components/admin/baking-sheet";
import { PackingSheet } from "@/components/admin/packing-sheet";
import { TomorrowSummaryCard } from "@/components/admin/tomorrow-summary-card";
import { Section } from "@/components/app/app-shell";
import { Spinner } from "@/components/app/button";
import { Chip } from "@/components/app/status-chip";
import { orderDate, useAdminStalledDrafts, useRecentAdminOrders } from "@/hooks/use-orders";
import { useAdminOrdersForDateWithRecurring, useMaterializeRecurringOccurrence } from "@/hooks/use-recurring";
import { tomorrowIso } from "@/lib/admin/dates";
import { summarizeDay } from "@/lib/admin/selectors";
import { buildDistributionReport, buildProductionReport } from "@/lib/admin/reports";
import { formatDate, formatIsraelTime, formatPrice, formatShortDateNumeric, formatWeekday } from "@/lib/format";
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
  const { issueDocuments, documentsForOrder } = useStore();
  const date = tomorrowIso();
  const { views: tomorrowViews, isLoading: loadingTomorrow } = useAdminOrdersForDateWithRecurring(date);
  const { views: recentViews, isLoading: loadingRecent } = useRecentAdminOrders();
  const { views: stalledDrafts, isLoading: loadingDrafts } = useAdminStalledDrafts();
  const hydrated = !loadingTomorrow && !loadingRecent && !loadingDrafts;
  const materialize = useMaterializeRecurringOccurrence();

  const [issuingDocs, setIssuingDocs] = useState(false);

  const summary = useMemo(() => summarizeDay(tomorrowViews, date), [tomorrowViews, date]);
  const productionGroups = useMemo(() => buildProductionReport(tomorrowViews), [tomorrowViews]);
  const distributionGroups = useMemo(() => buildDistributionReport(tomorrowViews), [tomorrowViews]);

  const [printTarget, setPrintTarget] = useState<PrintTarget>(null);
  const [printNonce, setPrintNonce] = useState(0);

  useEffect(() => {
    if (!printTarget || printNonce === 0) return;
    // ממתינים לרינדור הגיליון לפני פתיחת חלון ההדפסה.
    // לא מסירים את הגיליון אחרי ההדפסה — בחלק מהדפדפנים בנייד
    // אירוע afterprint נורה לפני שנוצר ה-PDF, וההסרה גורמת לדף ריק.
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [printTarget, printNonce]);

  const printReport = (target: Exclude<PrintTarget, null>) => {
    setPrintTarget(target);
    setPrintNonce((n) => n + 1);
  };


  const handleIssueDeliveryNotes = async () => {
    if (issuingDocs) return;
    toast(
      <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Info className="size-4 text-primary" />
        תעודות משלוח בדרך
      </span>,
      {
        description:
          "תעודות המשלוח יופקו אוטומטית בריווחית לאחר חיבור מלא למערכת. עד אז ההזמנה נרשמת כמוכנה למשלוח.",
        duration: 5000,
      },
    );
    const pendingViews = tomorrowViews.filter(
      (v) => v.isVirtual || !documentsForOrder(v.order.id).find((d) => d.type === "delivery_note"),
    );
    if (pendingViews.length === 0) return;
    setIssuingDocs(true);
    try {
      // הזמנה קבועה וירטואלית חייבת רשומת `orders` אמיתית לפני שאפשר להפיק לה תעודה
      // (PRD §4.1) — ממששים כל שורה כזו קודם, ואז מפיקים על ה-id-ים האמיתיים.
      const pendingOrderIds = await Promise.all(
        pendingViews.map((v) => {
          if (!v.isVirtual || !v.order.recurringId) return v.order.id;
          return materialize.mutateAsync({ recurringId: v.order.recurringId, date });
        }),
      );
      await issueDocuments(pendingOrderIds, "delivery_note");
    } finally {
      setIssuingDocs(false);
    }
  };

  const todayIntake = useMemo(
    () => recentViews.map((view) => ({ view, time: formatIsraelTime(view.order.createdAt) })),
    [recentViews],
  );
  const [intakeExpanded, setIntakeExpanded] = useState(false);
  const visibleIntake = intakeExpanded ? todayIntake : todayIntake.slice(0, 3);

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setUpdatedAt(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    );
  }, []);

  return (
    <AdminShell>
      {printTarget === "production" ? <BakingSheet date={date} groups={productionGroups} /> : null}
      {printTarget === "distribution" ? <PackingSheet date={date} groups={distributionGroups} /> : null}

      <Section className="pt-4 pb-10 md:pt-6 print:hidden">
        <TomorrowSummaryCard summary={hydrated ? summary : { date, ordersCount: 0, productsCount: 0, total: 0 }} views={hydrated ? tomorrowViews : []} />

        <div className="mt-3 grid grid-cols-3 gap-3">
          <PrintReportButton
            icon={<Truck className="size-5" />}
            top="הדפסת"
            bottom="דוח חלוקה"
            onClick={() => printReport("distribution")}
          />
          <PrintReportButton
            icon={<FileText className="size-5" />}
            top="הדפסת"
            bottom="דוח אפייה"
            onClick={() => printReport("production")}
          />
          <PrintReportButton
            icon={<Receipt className="size-5" />}
            top="הפקת"
            bottom="תעודות משלוח"
            loading={issuingDocs}
            onClick={handleIssueDeliveryNotes}
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
                      הזמנה ל{formatWeekday(orderDate(view.order))} · {formatShortDateNumeric(orderDate(view.order))}
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


        {hydrated && stalledDrafts.length > 0 ? (
          <div className="mt-3 rounded-[22px] border border-border bg-card p-4">
            <h2 className="text-[16px] font-bold text-primary">דורש טיפול</h2>
            <div className="mt-2">
              <AttentionRow
                icon={<AlertTriangle className="size-[18px] text-destructive" />}
                text={`${stalledDrafts.length} טיוטות עדיין לא אושרו`}
                count={stalledDrafts.length}
              />
            </div>
          </div>
        ) : null}

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
  top,
  bottom,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  top: string;
  bottom: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center rounded-[18px] border border-primary/20 bg-primary-soft px-1 py-3 shadow-sm active:scale-95 transition-transform duration-75 disabled:opacity-60"
    >
      <span className="text-[10px] leading-tight font-semibold text-primary text-center">{top}</span>
      <span className="text-[12px] leading-tight font-bold text-primary text-center">{bottom}</span>
      <span className="mt-3 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        {loading ? <Spinner className="border-primary-foreground/40 border-t-primary-foreground" /> : icon}
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
      className="flex items-center justify-between gap-2 rounded-[18px] border border-primary/20 bg-primary-soft px-3 py-3.5 no-underline shadow-sm"
    >
      <ChevronLeft className="size-4 shrink-0 text-primary" />
      <span className="flex min-w-0 items-center gap-2 text-right">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-heading">{title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {icon}
        </span>
      </span>
    </Link>
  );
}
