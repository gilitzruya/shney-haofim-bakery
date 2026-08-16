import { useState } from "react";

import { Button } from "@/components/app/button";
import { FormField, TextInput } from "@/components/app/form-controls";
import { ROUNDS } from "@/data/catalog";
import type { RoundId } from "@/data/catalog";
import type { Customer } from "@/data/admin-seed";
import { cn } from "@/lib/utils";

export interface CustomerFormValues {
  name: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  allowedRounds: RoundId[];
}

export function toFormValues(customer?: Customer): CustomerFormValues {
  const contact = customer?.contacts[0];
  return {
    name: customer?.name ?? "",
    address: customer?.address ?? "",
    contactName: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    allowedRounds: customer?.allowedRounds ?? ["morning"],
  };
}

/** טופס פרטי לקוח — עמודה אחת במובייל, שתי עמודות בדסקטופ. */
export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: CustomerFormValues;
  submitLabel: string;
  onSubmit: (values: CustomerFormValues) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const toggleRound = (id: RoundId) =>
    set(
      "allowedRounds",
      values.allowedRounds.includes(id)
        ? values.allowedRounds.filter((r) => r !== id)
        : [...values.allowedRounds, id],
    );

  const submit = () => {
    if (!values.name.trim()) {
      setError("יש להזין שם לקוח");
      return;
    }
    setError(null);
    onSubmit({ ...values, name: values.name.trim() });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 md:grid-cols-2">
        <FormField label="שם הלקוח">
          <TextInput value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="לדוגמה: בית קפה אלמה" />
        </FormField>
        <FormField label="כתובת לאספקה">
          <TextInput value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="רחוב, מספר, עיר" />
        </FormField>
        <FormField label="שם איש קשר">
          <TextInput value={values.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </FormField>
        <FormField label="טלפון">
          <TextInput
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            inputMode="tel"
            dir="ltr"
            className="text-right"
          />
        </FormField>
        <FormField label="דוא״ל">
          <TextInput
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            inputMode="email"
            dir="ltr"
            className="text-right"
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-muted-foreground">הרשאות סבבים</span>
        <div className="flex flex-col gap-2 md:flex-row">
          {ROUNDS.map((r) => {
            const active = values.allowedRounds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRound(r.id)}
                className={cn(
                  "flex flex-1 items-center justify-between rounded-xl border px-3.5 py-3 text-start",
                  active ? "border-[1.5px] border-primary bg-primary-soft" : "border-border bg-card",
                )}
              >
                <span className="text-[13.5px] font-semibold text-foreground">{r.label}</span>
                <span className="text-[12px] text-muted-foreground">{active ? "מאושר" : "לא מאושר"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <div className="text-[12px] font-semibold text-destructive">{error}</div> : null}

      <div className="flex gap-2.5">
        <Button className="flex-1" onClick={submit}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" className="flex-1 font-semibold" onClick={onCancel}>
            ביטול
          </Button>
        ) : null}
      </div>
    </div>
  );
}
