import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { FormField, RoundSelector, TextArea, TextInput, WeekdayChips } from "@/components/app/form-controls";
import { ROUNDS, type RoundId } from "@/data/catalog";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/recurring/$recurringId/edit")({
  head: () => ({
    meta: [
      { title: "עריכת הזמנה קבועה — מאפיית שני האופים" },
      { name: "description", content: "עדכון שם, ימי אספקה, סבב חלוקה והערות בהזמנה קבועה." },
      { property: "og:title", content: "עריכת הזמנה קבועה — מאפיית שני האופים" },
      { property: "og:description", content: "עדכנו את פרטי ההזמנה הקבועה ואת רשימת המוצרים." },
    ],
  }),
  component: EditRecurringPage,
});

function EditRecurringPage() {
  const { recurringId } = useParams({ from: "/recurring/$recurringId/edit" });
  const navigate = useNavigate();
  const { getRecurring, saveRecurringDetails, startRecurringEdit } = useStore();
  const rec = getRecurring(recurringId);

  const [name, setName] = useState(rec?.name ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(rec?.weekdays ?? []);
  const [round, setRound] = useState<RoundId>(rec?.round ?? ROUNDS[0]!.id);
  const [note, setNote] = useState(rec?.note ?? "");

  if (!rec) {
    return (
      <AppShell>
        <AppHeader>
          <PageTitleBar title="עריכת הזמנה קבועה" backTo="/recurring" />
        </AppHeader>
        <Section>
          <EmptyState
            title="ההזמנה הקבועה לא נמצאה"
            action={<Button onClick={() => navigate({ to: "/recurring" })}>לכל ההזמנות הקבועות</Button>}
          />
        </Section>
      </AppShell>
    );
  }

  const save = () => {
    saveRecurringDetails(rec.id, { name: name.trim() || rec.name, weekdays, round, note });
    toast.success("פרטי ההזמנה הקבועה נשמרו");
    navigate({ to: "/recurring/$recurringId", params: { recurringId: rec.id } });
  };

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="עריכת הזמנה קבועה" />
      </AppHeader>
      <Section className="pb-28">
        <div className="flex flex-col gap-4">
          <FormField label="שם ההזמנה הקבועה">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>

          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted-foreground">ימי אספקה</div>
            <WeekdayChips value={weekdays} onChange={setWeekdays} />
          </div>

          <FormField label="הערה למאפייה">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערות אספקה…" />
          </FormField>

          <button
            type="button"
            onClick={() => {
              saveRecurringDetails(rec.id, { name: name.trim() || rec.name, weekdays, round, note });
              startRecurringEdit(rec.id);
              navigate({ to: "/catalog" });
            }}
            className="w-full rounded-xl border border-border bg-card py-2.5 text-[12.5px] font-semibold text-foreground"
          >
            עריכת רשימת המוצרים
          </button>
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto flex max-w-5xl gap-2.5">
          <Button
            variant="secondary"
            size="lg"
            className="font-semibold"
            onClick={() => navigate({ to: "/recurring/$recurringId", params: { recurringId: rec.id } })}
          >
            ביטול
          </Button>
          <Button size="lg" className="flex-1" disabled={weekdays.length === 0} onClick={save}>
            שמירת השינויים
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
