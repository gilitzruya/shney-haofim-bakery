import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { FormField, RoundSelector, TextInput, WeekdayChips } from "@/components/app/form-controls";
import { ROUNDS, type RoundId } from "@/data/catalog";
import { formatCutoff, upcomingStartOptions } from "@/lib/cutoff";
import { formatLongDate } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/recurring/new")({
  head: () => ({
    meta: [
      { title: "הזמנה קבועה חדשה — מאפיית שני האופים" },
      { name: "description", content: "הגדרת שם, ימי אספקה וסבב חלוקה להזמנה קבועה חדשה." },
      { property: "og:title", content: "הזמנה קבועה חדשה — מאפיית שני האופים" },
      { property: "og:description", content: "צרו הזמנה שתישלח אוטומטית בימים שתבחרו." },
    ],
  }),
  component: NewRecurringPage,
});

function NewRecurringPage() {
  const navigate = useNavigate();
  const { startRecurringCreate } = useStore();
  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [round, setRound] = useState<RoundId>(ROUNDS[0]!.id);
  const [startDate, setStartDate] = useState<string | null>(null);

  const options = useMemo(() => upcomingStartOptions(weekdays, 4), [weekdays]);
  const firstAvailable = options.find((o) => !o.blocked) ?? null;
  const nearestBlocked = options[0]?.blocked ? options[0] : null;

  useEffect(() => {
    setStartDate(firstAvailable?.iso ?? null);
  }, [firstAvailable?.iso]);

  const valid = name.trim().length > 1 && weekdays.length > 0 && !!startDate;


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

          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted-foreground">סבב חלוקה</div>
            <RoundSelector value={round} onChange={setRound} />
          </div>

          <div className="rounded-xl border border-border bg-card-muted p-3.5 text-[12.5px] text-muted-foreground">
            אחרי בחירת המוצרים ההזמנה תישלח אוטומטית למאפייה בכל אחד מימי האספקה שנבחרו.
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          <Button
            size="lg"
            className="w-full"
            disabled={!valid}
            onClick={() => {
              startRecurringCreate(name.trim(), weekdays, round);
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
