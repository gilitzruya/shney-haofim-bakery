import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Copy, Info, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { RoundSelector } from "@/components/app/form-controls";
import { Modal } from "@/components/app/modal";
import { BAKERY_CONTACT, WEEKDAY_LABELS, roundLabel, type RoundId } from "@/data/catalog";
import { formatLongDate, formatPrice, linesCount, linesTotal, parseDate, toIso } from "@/lib/format";
import { formatCutoff, israelNow, isCutoffPassed } from "@/lib/cutoff";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/new-order")({
  head: () => ({
    meta: [
      { title: "הזמנה חדשה — מאפיית שני האופים" },
      { name: "description", content: "בחירת מועד אספקה וסבב חלוקה להזמנה סיטונאית חדשה." },
      { property: "og:title", content: "הזמנה חדשה — מאפיית שני האופים" },
      { property: "og:description", content: "בחרו תאריך אספקה וסבב חלוקה ועברו לקטלוג המוצרים." },
    ],
  }),
  component: NewOrderPage,
});

const now = israelNow();
const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const TODAY_ISO = toIso(TODAY);
const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

/** Full month grid (7 columns), padded with blanks before the 1st. */
function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ iso: string; date: Date; disabled: boolean } | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const isPast = d.getTime() <= TODAY.getTime();
    cells.push({ iso: toIso(d), date: d, disabled: isPast || d.getDay() === 6 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function NewOrderPage() {
  const navigate = useNavigate();
  const { startOrderDraft, editOrder, startOneTimeUpdate, startRecurringEdit, orders, recurring } = useStore();
  const [month, setMonth] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const [date, setDate] = useState<string | null>(null);
  const [round, setRound] = useState<RoundId | null>(null);
  const [blockedOrder, setBlockedOrder] = useState<string | null>(null);
  const [blockedCutoff, setBlockedCutoff] = useState(false);
  const [blockedRecurring, setBlockedRecurring] = useState<string | null>(null);
  const [step, setStep] = useState<"setup" | "start" | "pick">("setup");

  const missing: string[] = [];
  if (!date) missing.push("מועד אספקה");
  if (!round) missing.push("סבב חלוקה");

  const cells = buildMonth(month.year, month.month);

  /** סימונים לכל תאריך: מ׳ מאושרת, ט׳ טיוטה, ק׳ קבועה */
  const markersFor = (iso: string, weekday: number) => {
    const marks: { key: string; label: string; title: string }[] = [];
    const dayOrders = orders.filter((o) => o.date === iso);
    if (dayOrders.some((o) => o.status === "approved" || o.status === "completed"))
      marks.push({ key: "m", label: "מ׳", title: "הזמנה מאושרת" });
    if (dayOrders.some((o) => o.status === "draft" || o.status === "needs_update" || o.status === "reopened"))
      marks.push({ key: "t", label: "ט׳", title: "טיוטה" });
    if (recurring.some((r) => r.status === "active" && r.weekdays.includes(weekday)))
      marks.push({ key: "k", label: "ק׳", title: "הזמנה קבועה" });
    return marks;
  };
  const canGoBack = new Date(month.year, month.month, 1) > new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const shiftMonth = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  /** התנגשות: הזמנה מאושרת או הזמנה קבועה קיימת לאותו יום ואותו סבב */
  const conflictOrder =
    date && round
      ? orders.find(
          (o) =>
            o.date === date &&
            o.round === round &&
            (o.status === "approved" || o.status === "completed" || o.status === "needs_update" || o.status === "reopened"),
        )
      : undefined;
  const conflictRecurring =
    date && round && !conflictOrder
      ? recurring.find(
          (r) => r.status === "active" && r.round === round && r.weekdays.includes(parseDate(date).getDay()),
        )
      : undefined;

  const goCatalog = () => navigate({ to: "/catalog" });

  const proceed = () => {
    if (!date || !round) return;
    if (isCutoffPassed(date)) return setBlockedCutoff(true);
    if (conflictOrder) return setBlockedOrder(conflictOrder.id);
    if (conflictRecurring) return setBlockedRecurring(conflictRecurring.id);
    setStep("start");
  };

  /** הזמנות קודמות עם מוצרים, מדורגות לפי התאמה ליום ולסבב שנבחרו */
  const pastOrders = (() => {
    if (!date) return [] as { order: (typeof orders)[number]; badge?: string; score: number }[];
    const weekday = parseDate(date).getDay();
    return orders
      .filter((o) => o.lines.length > 0 && o.date < date)
      .map((o) => {
        const sameWeekday = parseDate(o.date).getDay() === weekday;
        const sameRound = o.round === round;
        const score = sameWeekday && sameRound ? 3 : sameWeekday ? 2 : sameRound ? 1 : 0;
        const badge = sameWeekday && sameRound ? "אותו יום ואותו סבב" : sameWeekday ? "אותו יום בשבוע" : sameRound ? "אותו סבב" : undefined;
        return { order: o, badge, score };
      })
      .sort((a, b) => b.score - a.score || (a.order.date < b.order.date ? 1 : -1))
      .slice(0, 6);
  })();

  const startFromScratch = () => {
    if (!date || !round) return;
    startOrderDraft(date, round);
    goCatalog();
  };

  const startFromOrder = (id: string) => {
    if (!date || !round) return;
    const source = orders.find((o) => o.id === id);
    if (!source) return;
    startOrderDraft(date, round, source.lines);
    goCatalog();
  };


  if (step !== "setup" && date && round) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="הזמנה חדשה" onBack={() => setStep(step === "pick" ? "start" : "setup")} />
        </AppHeader>
        <Section className="pb-28">
          <div className="mt-4 rounded-xl border border-border bg-card-muted p-3 text-[12.5px] text-muted-foreground">
            {formatLongDate(date)} • {roundLabel(round)}
          </div>

          {step === "start" ? (
            <>
              <h2 className="mt-5 text-[15px] font-bold text-foreground">איך תרצו להתחיל?</h2>
              <p className="mb-3 text-[12.5px] text-muted-foreground">
                תוכלו להתחיל הזמנה חדשה או להשתמש בהזמנה קודמת כבסיס
              </p>

              <div className="rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-foreground">התחלה מהקטלוג</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      התחילו הזמנה ריקה ובחרו מוצרים וכמויות
                    </div>
                  </div>
                  <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <ShoppingCart className="size-[18px]" />
                  </span>
                </div>
                <Button className="mt-3 w-full" pill onClick={startFromScratch}>
                  מעבר לקטלוג
                </Button>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-foreground">העתקת מוצרים מהזמנה קודמת</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      המוצרים והכמויות יועתקו להזמנה החדשה ותוכלו לערוך אותם לפני האישור
                    </div>
                  </div>
                  <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Copy className="size-[18px]" />
                  </span>
                </div>
                <Button
                  variant="outline"
                  pill
                  className="mt-3 w-full"
                  disabled={pastOrders.length === 0}
                  onClick={() => setStep("pick")}
                >
                  {pastOrders.length === 0 ? "אין הזמנות קודמות" : "בחירת הזמנה קודמת"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-5 text-[15px] font-bold text-foreground">בחירת הזמנה קודמת</h2>
              <p className="mb-3 text-[12.5px] text-muted-foreground">
                בחרו הזמנה שתשמש כבסיס להזמנה החדשה
              </p>
              <div className="flex flex-col gap-2.5">
                {pastOrders.map(({ order, badge }, i) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => startFromOrder(order.id)}
                    className="rounded-[14px] border border-border bg-card p-3.5 text-start"
                  >
                    {badge || i === 0 ? (
                      <span className="inline-block rounded-full bg-primary-soft px-2.5 py-1 text-[10.5px] font-bold text-primary">
                        {badge ?? "ההזמנה האחרונה שלך"}
                      </span>
                    ) : null}
                    <div className="mt-1.5 text-[13.5px] font-bold text-foreground">
                      {formatLongDate(order.date)}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {roundLabel(order.round)} • {linesCount(order.lines)} מוצרים •{" "}
                      {formatPrice(linesTotal(order.lines))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנה חדשה" backTo="/" />
      </AppHeader>
      <Section className="pb-28">

        <h2 className="mt-4 mb-2 text-[15px] font-bold text-foreground">בחירת מועד אספקה</h2>

        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoBack}
              aria-label="חודש קודם"
              className={cn(
                "flex size-8 items-center justify-center rounded-lg border border-border",
                !canGoBack && "opacity-30",
              )}
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="text-[13.5px] font-bold text-foreground">
              {HE_MONTHS[month.month]} {month.year}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="חודש הבא"
              className="flex size-8 items-center justify-center rounded-lg border border-border"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-1 text-center text-[10.5px] font-semibold text-muted-foreground">
                {label}
              </div>
            ))}
            {cells.map((cell, i) =>
              cell === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => setDate(cell.iso)}
                  className={cn(
                    "flex h-[44px] items-center justify-center rounded-lg border text-[13.5px] font-bold",
                    date === cell.iso
                      ? "border-[1.5px] border-primary bg-primary-soft text-foreground"
                      : "border-border bg-card text-foreground",
                    cell.disabled && "cursor-not-allowed border-transparent bg-card-muted text-muted-foreground opacity-40",
                    cell.iso === TODAY_ISO &&
                      "relative border-[1.5px] border-dashed !border-primary !opacity-100 !text-primary",
                  )}
                >
                  <span className="flex flex-col items-center leading-none">
                    {cell.date.getDate()}
                    {cell.iso === TODAY_ISO ? (
                      <span className="mt-0.5 text-[8px] font-semibold text-primary">היום</span>
                    ) : null}
                    {(() => {
                      const marks = markersFor(cell.iso, cell.date.getDay());
                      if (marks.length === 0) return null;
                      return (
                        <span className="mt-0.5 flex gap-[2px]">
                          {marks.map((m) => (
                            <span
                              key={m.key}
                              title={m.title}
                              className="text-[8px] font-bold leading-none text-muted-foreground"
                            >
                              {m.label}
                            </span>
                          ))}
                        </span>
                      );
                    })()}
                  </span>
                </button>
              ),
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
            <span>מ׳ — הזמנה מאושרת</span>
            <span>ט׳ — טיוטה</span>
            <span>ק׳ — הזמנה קבועה</span>
          </div>
        </div>


        <h2 className="mt-5 mb-2 text-[15px] font-bold text-foreground">בחירת סבב חלוקה</h2>
        <RoundSelector value={round} onChange={setRound} />

        {date && round && conflictOrder ? (
          <div className="mt-4 rounded-xl border border-primary/35 bg-primary-soft p-3.5 text-[12.5px] text-foreground">
            כבר קיימת הזמנה {conflictOrder.status === "completed" ? "שסופקה" : "מאושרת"} ל{formatLongDate(date)} ב{roundLabel(round)}.
          </div>
        ) : date && round && conflictRecurring ? (
          <div className="mt-4 rounded-xl border border-primary/35 bg-primary-soft p-3.5 text-[12.5px] text-foreground">
            קיימת הזמנה קבועה ({conflictRecurring.name}) ל{formatLongDate(date)} ב{roundLabel(round)}.
          </div>
        ) : date && round && isCutoffPassed(date) ? (
          <div className="mt-4 rounded-xl border border-primary/35 bg-primary-soft p-3.5 text-[12.5px] text-foreground">
            מועד ההזמנות ל{formatLongDate(date)} נסגר ב{formatCutoff(date)}. לא ניתן לפתוח הזמנה חדשה למועד זה — לאישור חריג יש ליצור קשר עם בעל המאפייה.
          </div>
        ) : date && round ? (
          <div className="mt-4 rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
            האספקה תתבצע ביום {formatLongDate(date)}. ניתן לעדכן את ההזמנה עד יום לפני המועד בשעה 12:00.
          </div>
        ) : null}
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          {missing.length > 0 ? (
            <div className="mb-2 flex items-start gap-1.5 rounded-[10px] bg-card-muted px-3 py-2 text-[11.5px] font-semibold text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>כדי להמשיך יש לבחור {missing.join(" ו")}</span>
            </div>
          ) : null}
          <Button size="lg" className="w-full" disabled={missing.length > 0} onClick={proceed}>
            המשך לבחירת מוצרים
          </Button>
        </div>
      </div>

      {/* התנגשות עם הזמנה קיימת */}
      <Modal
        open={Boolean(blockedOrder && conflictOrder && date)}
        title="כבר קיימת הזמנה למועד זה"
        description={
          date && round
            ? `יש כבר הזמנה מאושרת ל${formatLongDate(date)} ב${roundLabel(round)}. לא ניתן ליצור הזמנה נוספת לאותו יום ולאותו סבב.`
            : undefined
        }
        onClose={() => setBlockedOrder(null)}
      >
        {date && !isCutoffPassed(date) ? (
          <Button
            className="w-full"
            onClick={() => {
              if (conflictOrder) {
                editOrder(conflictOrder.id);
                goCatalog();
              }
            }}
          >
            עדכון ההזמנה הקיימת
          </Button>
        ) : (
          <div className="rounded-xl bg-card-muted p-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {date ? `מועד העדכון להזמנה זו נסגר ב${formatCutoff(date)}. ` : ""}לאישור חריג יש לפנות למנהל המאפייה:
            <div className="mt-1.5 font-semibold text-foreground">{BAKERY_CONTACT.name}</div>
            <a href={`tel:${BAKERY_CONTACT.phone}`} className="mt-0.5 block font-semibold text-primary">
              {BAKERY_CONTACT.phone}
            </a>
          </div>
        )}
      </Modal>

      {/* מועד ההזמנות נסגר */}
      <Modal
        open={blockedCutoff}
        title="מועד ההזמנה נסגר"
        description={
          date
            ? `ההזמנות ל${formatLongDate(date)} נסגרו ב${formatCutoff(date)}. לא ניתן לפתוח הזמנה למועד זה במערכת.`
            : undefined
        }
        onClose={() => setBlockedCutoff(false)}
      >
        <div className="rounded-xl bg-card-muted p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          לאישור חריג יש ליצור קשר עם בעל המאפייה:
          <div className="mt-1.5 font-semibold text-foreground">{BAKERY_CONTACT.name}</div>
          <a href={`tel:${BAKERY_CONTACT.phone}`} className="mt-0.5 block font-semibold text-primary">
            {BAKERY_CONTACT.phone}
          </a>
          <a
            href={`https://wa.me/972${BAKERY_CONTACT.whatsapp.replace(/\D/g, "").slice(1)}`}
            className="mt-0.5 block font-semibold text-primary"
          >
            וואטסאפ {BAKERY_CONTACT.whatsapp}
          </a>
        </div>
      </Modal>

      {/* התנגשות עם הזמנה קבועה */}
      <Modal
        open={Boolean(blockedRecurring && conflictRecurring && date)}
        title="קיימת הזמנה קבועה למועד זה"
        description={
          date && round && conflictRecurring
            ? `ההזמנה הקבועה "${conflictRecurring.name}" כבר מסופקת ב${formatLongDate(date)} ב${roundLabel(round)}. מה תרצו לעשות?`
            : undefined
        }
        onClose={() => setBlockedRecurring(null)}
      >
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={Boolean(date && isCutoffPassed(date))}
            onClick={() => {
              if (conflictRecurring && date) {
                startOneTimeUpdate(conflictRecurring.id, date);
                goCatalog();
              }
            }}
          >
            עדכון חד־פעמי לתאריך זה
          </Button>
          <Button
            variant="secondary"
            className="w-full font-semibold"
            onClick={() => {
              if (conflictRecurring) {
                startRecurringEdit(conflictRecurring.id);
                goCatalog();
              }
            }}
          >
            שינוי ההזמנה הקבועה באופן קבוע
          </Button>
          {date && isCutoffPassed(date) ? (
            <div className="rounded-xl bg-card-muted p-3 text-[12px] leading-relaxed text-muted-foreground">
              מועד העדכון לתאריך זה נסגר ב{formatCutoff(date)} — לאישור חריג פנו ל{BAKERY_CONTACT.name},{" "}
              <a href={`tel:${BAKERY_CONTACT.phone}`} className="font-semibold text-primary">
                {BAKERY_CONTACT.phone}
              </a>
            </div>
          ) : null}
        </div>
      </Modal>
    </AppShell>
  );
}
