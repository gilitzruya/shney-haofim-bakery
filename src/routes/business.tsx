import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card } from "@/components/app/card";
import { FormField, TextArea, TextInput } from "@/components/app/form-controls";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "פרטי העסק — מאפיית שני האופים" },
      { name: "description", content: "עדכון פרטי הלקוח העסקי: איש קשר, כתובת אספקה והערות קבועות." },
      { property: "og:title", content: "פרטי העסק — מאפיית שני האופים" },
      { property: "og:description", content: "נהלו את פרטי העסק וכתובת האספקה." },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { business, saveBusiness } = useStore();
  const [form, setForm] = useState(business);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="פרטי העסק" backTo="/" />
      </AppHeader>
      <Section className="pb-28">
        <Card className="bg-card-muted">
          <div className="text-[13.5px] font-semibold text-foreground">{business.name}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">ח.פ. {business.businessId}</div>
        </Card>

        <div className="mt-4 flex flex-col gap-4">
          <FormField label="שם העסק">
            <TextInput value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </FormField>
          <FormField label="ח.פ. / ע.מ.">
            <TextInput value={form.businessId} onChange={(e) => set("businessId")(e.target.value)} inputMode="numeric" />
          </FormField>
          <FormField label="איש קשר">
            <TextInput value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} />
          </FormField>
          <FormField label="טלפון">
            <TextInput value={form.phone} onChange={(e) => set("phone")(e.target.value)} inputMode="tel" dir="ltr" />
          </FormField>
          <FormField label="דוא״ל">
            <TextInput value={form.email} onChange={(e) => set("email")(e.target.value)} inputMode="email" dir="ltr" />
          </FormField>
          <FormField label="כתובת לאספקה">
            <TextInput value={form.address} onChange={(e) => set("address")(e.target.value)} />
          </FormField>
          <FormField label="הערות אספקה קבועות">
            <TextArea value={form.deliveryNotes} onChange={(e) => set("deliveryNotes")(e.target.value)} />
          </FormField>
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-border bg-canvas px-3.5 py-3 md:px-5">
        <div className="mx-auto max-w-5xl">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              saveBusiness(form);
              toast.success("פרטי העסק נשמרו");
            }}
          >
            שמירת הפרטים
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
