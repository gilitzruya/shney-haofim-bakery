import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Printer, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminOrderList } from "@/components/admin/order-list";
import { AdminShell } from "@/components/admin/admin-shell";
import { IssueDeliveryNotesDialog } from "@/components/admin/issue-delivery-notes-dialog";
import { PrintDeliveryNotesDialog } from "@/components/admin/print-delivery-notes-dialog";
import { Button } from "@/components/app/button";
import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";
import { ROUNDS, roundLabel } from "@/data/catalog";
import { useAdminOrdersForDateWithRecurring, useMaterializeRecurringOccurrence } from "@/hooks/use-recurring";
import { useDocuments, useIssueDocuments, usePrintDocuments } from "@/hooks/use-documents";
import type { AdminOrderView } from "@/hooks/use-orders";
import { classifyForIssuing } from "@/lib/admin/accounting";
import { shiftIso, tomorrowIso } from "@/lib/admin/dates";
import { summarizeDay } from "@/lib/admin/selectors";
import { errorMessage } from "@/lib/error-message";
import { formatDate, formatPrice, formatWeekday } from "@/lib/format";

export const Route = createFileRoute("/admin/orders/")({
  // התאריך שבו מדפדפים נשמר בכתובת (?date=), כדי שחזרה מפירוט הזמנה תחזיר לאותו יום ולא ל"מחר".
  // בלי date — מחר.
  validateSearch: (search: Record<string, unknown>): { date?: string } =>
    typeof search["date"] === "string" && /^d{4}-d{2}-d{2}$/.test(search["date"]) ? { date: search["date"] } : {},
  head: () => ({
    meta: [
      { title: "הזמנות מחר — ניהול המאפייה" },
      { name: "description", content: "רשימת ההזמנות לאספקה של מחר, כולל פירוט לקוח וסבב." },
      { property: "og:title", content: "הזמנות מחר — ניהול המאפייה" },
      { property: "og:description", content: "רשימת ההזמנות לאספקה של מחר במאפיית שני האופים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const { documents } = useDocuments();
  const issueDocuments = useIssueDocuments();
  const [issuing, setIssuing] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const printDocuments = usePrintDocuments();
  const [confirmPrint, setConfirmPrint] = useState(false);
  const navigate = useNavigate();
  const search = Route.useSearch();
  const date = search.date ?? tomorrowIso();
  // replace — דפדוף בין ימים לא ממלא את היסטוריית הדפדפן.
  const setDate = (next: string) =>
    void navigate({ to: "/admin/orders", search: next === tomorrowIso() ? {} : { date: next }, replace: true });
  const [query, setQuery] = useState("");

  const { views, isLoading } = useAdminOrdersForDateWithRecurring(date);
  const hydrated = !isLoading;
  const materialize = useMaterializeRecurringOccurrence();
  const filtered = useMemo(
    () => views.filter((v) => query.trim() === "" || v.customerName.includes(query.trim()) || !!v.order.branch?.name.includes(query.trim())),
    [views, query],
  );
  const summary = summarizeDay(filtered, date);

  const groups = useMemo(
    () =>
      ROUNDS.map((r) => ({
        id: r.id,
        views: filtered.filter((v) => v.order.round === r.id),
      })).filter((g) => g.views.length > 0),
    [filtered],
  );

  const latestDocFor = (orderId: string) =>
    documents.find((d) => d.orderId === orderId && d.type === "delivery_note");

  /** הזמנות היום (אחרי החיפוש) שנשלחו ושעוד אין להן תעודת משלוח שהופקה בהצלחה (כישלון ← ניסיון
   * חוזר). ההפקה רק אחרי אישור בחלון, שבו אפשר להוריד סימון מהזמנות. */
  const pendingViews = classifyForIssuing(filtered, documents).eligible;
  /** הזמנות עם תעודה שהופקה ולא השתנתה מאז — מה שאפשר להדפיס. בסדר המסך: סבב ואז רשימה. */
  const screenOrder = groups.flatMap((g) => g.views);
  const printableCount = classifyForIssuing(screenOrder, documents).alreadyIssued.length;

  const printSelected = (documentIds: string[]) => {
    setConfirmPrint(false);
    printDocuments
      .print(documentIds)
      .catch((err: unknown) => toast.error(errorMessage(err, "הכנת קובץ ההדפסה נכשלה")));
  };

  const issueTargets = async (selectedViews: AdminOrderView[]) => {
    setConfirmIssue(false);
    if (selectedViews.length === 0) return;
    setIssuing(true);
    try {
      // מופע וירטואלי ממומש קודם — לתעודה חייב להיות order_id אמיתי (PRD §4.2).
      const pendingIds = await Promise.all(
        selectedViews.map((v) => {
          if (!v.isVirtual || !v.order.recurringId) return v.order.id;
          return materialize.mutateAsync({ recurringId: v.order.recurringId, date });
        }),
      );
      const { issued, failed } = await issueDocuments.mutateAsync({ orderIds: pendingIds });
      if (failed === 0) toast.success(`הופקו ${issued} תעודות משלוח בריווחית`);
      else toast.error(`הופקו ${issued} תעודות, ${failed} נכשלו — הפירוט ביומן המסמכים`);
    } catch {
      toast.error("הפקת תעודות המשלוח נכשלה");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <AdminShell>
      <Section className="pt-5 pb-28">
        <h1 className="mb-3 flex items-center gap-2 text-[20px] font-bold text-heading">
          <ClipboardList className="size-[19px] text-primary" />
          הזמנות
        </h1>

        <div className="sticky top-[58px] z-10 -mx-3.5 bg-canvas/95 px-3.5 py-2 backdrop-blur md:-mx-5 md:px-5">
          <div className="overflow-hidden rounded-[16px] border border-primary/20 bg-primary-soft shadow-sm">
            <div className="flex items-center justify-between border-b border-primary/10 px-2 py-2.5">
              <button
                type="button"
                aria-label="יום קודם"
                onClick={() => setDate(shiftIso(date, -1))}
                className="flex size-9 items-center justify-center rounded-[10px] border border-primary/20 text-primary"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-[13.5px] font-bold text-heading">
                  <CalendarDays className="size-4 text-primary" />
                  {formatWeekday(date)}, {formatDate(date)}
                </div>
                {date !== tomorrowIso() ? (
                  <button
                    type="button"
                    onClick={() => setDate(tomorrowIso())}
                    className="text-[11px] font-semibold text-primary"
                  >
                    חזרה למחר
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="יום הבא"
                onClick={() => setDate(shiftIso(date, 1))}
                className="flex size-9 items-center justify-center rounded-[10px] border border-primary/20 text-primary"
              >
                <ChevronLeft className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-primary/10 px-1 py-3 text-center">
              <Metric value={hydrated ? String(summary.ordersCount) : "—"} label="הזמנות" />
              <Metric value={hydrated ? String(summary.productsCount) : "—"} label="מוצרים" />
              <Metric value={hydrated ? formatPrice(summary.total) : "—"} label="סה״כ" />
            </div>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם לקוח"
            aria-label="חיפוש לפי שם לקוח"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" aria-label="ניקוי החיפוש" onClick={() => setQuery("")}>
              <X className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </label>

        <div className="mt-3 flex flex-col gap-4">
          {!hydrated ? null : groups.length === 0 ? (
            <EmptyState
              title="אין הזמנות ליום זה"
              description="אפשר לעבור ליום אחר או לנקות את החיפוש."
            />
          ) : (
            groups.map((group) => (
              <section key={group.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[15px] font-bold text-heading">{roundLabel(group.id)}</h2>
                  <span className="text-[11.5px] text-muted-foreground">
                    {group.views.length} הזמנות
                  </span>
                </div>
                <AdminOrderList views={group.views} documentFor={latestDocFor} />
              </section>
            ))
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 z-20 bg-canvas/95 px-3.5 pb-3 pt-2 backdrop-blur md:px-5">
        {/* במובייל אין מקום לשני כפתורים בשורה: כפתור ההדפסה יורד לשורה משלו. מ-md הכול בשורה אחת. */}
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 md:flex-nowrap md:justify-center">
          <div className="flex items-center gap-4 rounded-[16px] border border-border bg-card px-3.5 py-2 text-center">
            <div>
              <div className="text-[13px] font-bold text-heading">
                {hydrated ? formatPrice(summary.total) : "—"}
              </div>
              <div className="text-[10.5px] text-muted-foreground">סה״כ</div>
            </div>
            <div>
              <div className="text-[13px] font-bold text-heading">{hydrated ? summary.ordersCount : "—"}</div>
              <div className="text-[10.5px] text-muted-foreground">הזמנות</div>
            </div>
          </div>
          <Button
            className="flex-1 md:flex-initial md:w-auto"
            onClick={() => setConfirmIssue(true)}
            loading={issuing}
            disabled={!hydrated || pendingViews.length === 0}
          >
            <FileText className="size-4" />
            {!hydrated
              ? "הפקת תעודות משלוח"
              : pendingViews.length === 0
                ? "כל התעודות הופקו"
                : `הפקת תעודות משלוח (${pendingViews.length})`}
          </Button>
          <Button
            variant="secondary"
            className="basis-full md:basis-auto md:flex-initial md:w-auto"
            onClick={() => setConfirmPrint(true)}
            loading={printDocuments.isPending}
            disabled={!hydrated || printableCount === 0}
          >
            <Printer className="size-4" />
            {hydrated && printableCount > 0 ? `הדפסת תעודות (${printableCount})` : "הדפסת תעודות"}
          </Button>
        </div>
      </div>

      <IssueDeliveryNotesDialog
        open={confirmIssue}
        onOpenChange={setConfirmIssue}
        date={date}
        views={filtered}
        documents={documents}
        onConfirm={(views) => void issueTargets(views)}
      />

      <PrintDeliveryNotesDialog
        open={confirmPrint}
        onOpenChange={setConfirmPrint}
        date={date}
        views={screenOrder}
        documents={documents}
        onConfirm={printSelected}
      />
    </AdminShell>
  );
}


function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1">
      <div className="text-[19px] font-extrabold text-primary md:text-[22px]">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}
