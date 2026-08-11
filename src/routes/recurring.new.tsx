import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { DateCalendar, TODAY_ISO } from "@/components/app/date-calendar";
import { FormField, TextInput, WeekdayChips } from "@/components/app/form-controls";
import { WEEKDAY_LABELS, type RoundId } from "@/data/catalog";
import { formatCutoff, isCutoffPassed, upcomingStartOptions } from "@/lib/cutoff";
import { formatLongDate } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/recurring/new")({
  head: () => ({
    meta: [
      { title: "הזמנה קבועה חדשה — מאפיית שני האופים" },
      { name: "description", content: "הגדרת שם, ימי אספקה להזמנה קבועה חדשה." },
      { property: "og:title", content: "הזמנה קבועה חדשה — מאפיית שני האופים" },
      { property: "og:description", content: "צרו הזמנה שתישלח אוטומטית בימים שתבחרו." },
    ],
  }),
  component: NewRecurringPage,
});

function NewRecurringPage() {
  const navigate = useNavigate();
  const { startRecurringCreate, recurring } = useStore();
  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [round, setRound] = useState<RoundId | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);

  const options = useMemo(() => upcomingStartOptions(weekdays, 4), [weekdays]);
  const firstAvailable = options.find((o) => !o.blocked) ?? null;
  const nearestBlocked = options[0]?.blocked ? options[0] : null;

  const conflicts = useMemo(() => {
    const out: { name: string; days: number[] }[] = [];
    recurring.forEach((r) => {
      if (r.status === "cancelled") return;
      if (!round || r.round !== round) return;
      const days = r.weekdays.filter((d) => weekdays.includes(d));
      if (days.length > 0) out.push({ name: r.name, days });
    });
    return out;
  }, [recurring, round, weekdays]);

  const conflictDays = useMemo(
    () => Array.from(new Set(conflicts.flatMap((c) => c.days))).sort(),
    [conflicts],
  );

  useEffect(() => {
    setStartDate(firstAvailable?.iso ?? null);
  }, [firstAvailable?.iso]);

  const missing: string[] = [];
  if (name.trim().length <= 1) missing.push("שם להזמנה הקבועה");
  if (weekdays.length === 0) missing.push("ימי אספקה");
  if (weekdays.length > 0 && round && !startDate) missing.push("תאריך התחלה");

  const valid = missing.length === 0 && conflicts.length === 0;



  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="הזמנה קבועה חדשה" backTo="/recurring" />
      </AppHeader>
      <Section className="pb-28">
        <div className="flex flex-col gap-4">
          <FormField label="שם ההזמנה הקבועה" hint="לדוגמה: אספקת בוקר – חדר אוכל">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="שם ההזמנה" />
          </FormField>

          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted-foreground">ימי אספקה</div>
            <WeekdayChips value={weekdays} onChange={setWeekdays} />
          </div>

          {conflicts.length > 0 ? (
            <div className="flex items-start gap-1.5 rounded-[10px] bg-destructive-bg px-3 py-2.5 text-[12px] font-semibold text-destructive">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                כבר קיימת הזמנה קבועה ({conflicts.map((c) => c.name).join(", ")}) לימים{" "}
                {conflictDays.map((d) => WEEKDAY_LABELS[d]).join(", ")} . לא ניתן ליצור הזמנה קבועה נוספת
                לאותו יום — יש לבחור ימים אחרים, או לערוך את ההזמנה הקבועה הקיימת.
              </span>
            </div>
          ) : null}




          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted-foreground">ממתי להתחיל</div>
            {weekdays.length === 0 || !round ? (
              <div className="rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
                יש לבחור קודם ימי אספקה כדי לקבוע ממתי ההזמנה הקבועה מתחילה.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {nearestBlocked ? (
                  <div className="flex items-start gap-1.5 rounded-[10px] bg-destructive-bg px-3 py-2 text-[11.5px] font-semibold text-destructive">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" />
                    <span>
                      לא ניתן להתחיל ב־{formatLongDate(nearestBlocked.iso)} — מועד הסגירה ({formatCutoff(nearestBlocked.iso)}) כבר חלף.
                    </span>
                  </div>
                ) : null}
                <DateCalendar
                  value={startDate}
                  onSelect={setStartDate}
                  isEnabled={(iso, d) =>
                    iso > TODAY_ISO && weekdays.includes(d.getDay()) && !isCutoffPassed(iso)
                  }
                />
                <div className="text-[11.5px] text-muted-foreground">
                  ניתן לבחור רק את ימי האספקה שנבחרו ושמועד הסגירה שלהם טרם חלף.
                </div>
                {startDate ? (
                  <div className="rounded-[10px] bg-card-muted px-3 py-2 text-[12px] text-muted-foreground">
                    התחלה: <span className="font-semibold text-foreground">{formatLongDate(startDate)}</span> · סגירה:{" "}
                    {formatCutoff(startDate)}
                  </div>
                ) : null}
              </div>
            )}
          </div>


          <div className="rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
            אחרי בחירת המוצרים ההזמנה תישלח אוטומטית למאפייה בכל אחד מימי האספקה שנבחרו, החל מ־
            {startDate ? formatLongDate(startDate) : "מועד ההתחלה שייבחר"}.
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          {missing.length > 0 ? (
            <div className="mb-2 flex items-start gap-1.5 rounded-[10px] bg-card-muted px-3 py-2 text-[11.5px] font-semibold text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>כדי להמשיך יש להשלים: {missing.join(", ")}</span>
            </div>
          ) : conflicts.length > 0 ? (
            <div className="mb-2 flex items-start gap-1.5 rounded-[10px] bg-destructive-bg px-3 py-2 text-[11.5px] font-semibold text-destructive">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>קיימת כבר הזמנה קבועה לאותם ימים — שנו ימים כדי להמשיך.</span>
            </div>
          ) : null}
          <Button
            size="lg"
            className="w-full"
            disabled={!valid}
            onClick={() => {
              startRecurringCreate(name.trim(), weekdays, round!, startDate ?? undefined);
              navigate({ to: "/catalog" });
            }}
          >

            המשך לבחירת מוצרים
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
