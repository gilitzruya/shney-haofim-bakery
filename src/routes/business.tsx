import { createFileRoute } from "@tanstack/react-router";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Card } from "@/components/app/card";
import { useMyCustomer } from "@/hooks/use-customers";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "פרטי העסק — מאפיית שני האופים" },
      { name: "description", content: "פרטי הלקוח העסקי: איש קשר, כתובת אספקה והערות קבועות." },
      { property: "og:title", content: "פרטי העסק — מאפיית שני האופים" },
      { property: "og:description", content: "פרטי העסק וכתובת האספקה." },
    ],
  }),
  component: BusinessPage,
});

/** תצוגה בלבד — רק בעל המאפייה עורך פרטי לקוח/עסק (החלטה 17, PRD §2.7). */
function BusinessPage() {
  const { customer } = useMyCustomer();
  const contact = customer?.contacts[0];

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="פרטי העסק" backTo="/" />
      </AppHeader>
      <Section className="pb-28">
        <Card className="bg-card-muted">
          <div className="text-[13.5px] font-semibold text-foreground">{customer?.name ?? ""}</div>
          {customer?.businessId ? (
            <div className="mt-0.5 text-[12px] text-muted-foreground">ח.פ. {customer.businessId}</div>
          ) : null}
        </Card>

        <div className="mt-4 flex flex-col gap-4">
          <Field label="שם העסק" value={customer?.name} />
          <Field label="ח.פ. / ע.מ." value={customer?.businessId ?? undefined} />
          <Field label="איש קשר" value={contact?.name ?? undefined} />
          <Field label="טלפון" value={contact?.phone ?? undefined} ltr />
          <Field label="דוא״ל" value={contact?.email ?? undefined} ltr />
          <Field label="כתובת לאספקה" value={customer?.address ?? undefined} />
          <Field label="הערות אספקה קבועות" value={customer?.deliveryNotes ?? undefined} />
        </div>

        <div className="mt-5 rounded-xl border border-border bg-card-muted px-3.5 py-3 text-[12.5px] text-muted-foreground">
          לעדכון הפרטים יש לפנות למאפייה — דרך דף יצירת הקשר.
        </div>
      </Section>
    </AppShell>
  );
}

function Field({ label, value, ltr }: { label: string; value: string | undefined; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-semibold text-muted-foreground">{label}</span>
      <span className="text-[14px] text-foreground" dir={ltr ? "ltr" : undefined}>
        {value || "לא הוזן"}
      </span>
    </div>
  );
}
