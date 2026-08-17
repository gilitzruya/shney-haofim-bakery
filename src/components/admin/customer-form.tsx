import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/app/button";
import { FormField, TextInput } from "@/components/app/form-controls";
import type { RoundId } from "@/data/catalog";
import type { Customer } from "@/data/admin-seed";
import { cn } from "@/lib/utils";

export interface CustomerFormValues {
  code: string;
  name: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  allowedRounds: RoundId[];
}

export function toFormValues(customer?: Customer): CustomerFormValues {
  const contact = customer?.contacts[0];
  const rounds = customer?.allowedRounds ?? [];
  return {
    code: customer?.code ?? "",
    name: customer?.name ?? "",
    address: customer?.address ?? "",
    contactName: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    allowedRounds: Array.from(new Set(["morning" as RoundId, ...rounds])),
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
        <FormField label="קוד לקוח">
          <TextInput
            value={values.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="לדוגמה: 1001"
            dir="ltr"
            className="text-right"
          />
        </FormField>
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

      <button
        type="button"
        onClick={() => toggleRound("noon")}
        className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-start transition-colors active:bg-muted"
        aria-pressed={values.allowedRounds.includes("noon")}
      >
        <span
          className={cn(
            "relative flex h-7 w-[3.25rem] shrink-0 items-center rounded-full p-1 transition-colors duration-200",
            values.allowedRounds.includes("noon") ? "bg-primary" : "bg-muted-foreground/40",
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full bg-background shadow transition-transform duration-200 ease-out",
              values.allowedRounds.includes("noon") ? "translate-x-6" : "translate-x-0",
            )}
          >
            {values.allowedRounds.includes("noon") ? (
              <Check className="size-3 text-primary" strokeWidth={3} />
            ) : (
              <X className="size-3 text-muted-foreground" strokeWidth={3} />
            )}
          </span>
        </span>

        <span className="flex flex-col items-end gap-0.5">
          <span className="text-[15px] font-bold text-foreground">סבב שני</span>
          <span
            className={cn(
              "text-[12px] font-semibold",
              values.allowedRounds.includes("noon") ? "text-primary" : "text-muted-foreground",
            )}
          >
            {values.allowedRounds.includes("noon") ? "מאושר" : "לא מאושר"}
          </span>
        </span>
      </button>

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
