import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/app/button";
import { FormField, TextInput } from "@/components/app/form-controls";
import type { RoundId } from "@/data/catalog";
import type { Customer } from "@/hooks/use-customers";
import { cn } from "@/lib/utils";

export interface ContactFormValue {
  /** מזהה איש קשר קיים — לא קיים עבור שורה חדשה שטרם נשמרה. */
  id?: string | undefined;
  name: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  /** מצב הטוגל "יש לו גישה" בטופס — לא בהכרח תואם למצב השמור עד לשמירה. */
  requestAccess: boolean;
}

export interface CustomerFormValues {
  code: string;
  name: string;
  address: string;
  businessId: string;
  deliveryNotes: string;
  allowedRounds: RoundId[];
  contacts: ContactFormValue[];
}

function emptyContact(isPrimary: boolean): ContactFormValue {
  return { name: "", phone: "", email: "", isPrimary, requestAccess: false };
}

export function toFormValues(customer?: Customer): CustomerFormValues {
  const rounds = customer?.allowedRounds ?? [];
  return {
    code: customer?.code ?? "",
    name: customer?.name ?? "",
    address: customer?.address ?? "",
    businessId: customer?.businessId ?? "",
    deliveryNotes: customer?.deliveryNotes ?? "",
    allowedRounds: Array.from(new Set(["morning" as RoundId, ...rounds])),
    contacts:
      customer && customer.contacts.length > 0
        ? customer.contacts.map((c) => ({
            id: c.id,
            name: c.name ?? "",
            phone: c.phone ?? "",
            email: c.email ?? "",
            isPrimary: c.isPrimary,
            requestAccess: c.hasAccess,
          }))
        : [emptyContact(true)],
  };
}

/** טופס פרטי לקוח — עמודה אחת במובייל, שתי עמודות בדסקטופ. רשימת אנשי קשר ניתנת
 * להרחבה (החלטה 20) — כל אחד עם טוגל "יש לו גישה" משלו. */
export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  extra,
}: {
  initial: CustomerFormValues;
  submitLabel: string;
  onSubmit: (values: CustomerFormValues) => void;
  onCancel?: (() => void) | undefined;
  /** תוכן נוסף שמוצג לפני כפתורי השמירה (למשל מחירון מיוחד) */
  extra?: ReactNode;
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

  const setContact = (index: number, patch: Partial<ContactFormValue>) =>
    setValues((v) => ({
      ...v,
      contacts: v.contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const addContact = () => setValues((v) => ({ ...v, contacts: [...v.contacts, emptyContact(false)] }));

  const removeContact = (index: number) =>
    setValues((v) => ({ ...v, contacts: v.contacts.filter((_, i) => i !== index) }));

  const submit = () => {
    if (!values.name.trim()) {
      setError("יש להזין שם לקוח");
      return;
    }
    const contacts = values.contacts.filter((c) => c.name.trim() || c.phone.trim() || c.email.trim());
    if (contacts.some((c) => c.requestAccess && !c.phone.trim())) {
      setError("איש קשר עם גישה לאפליקציה חייב מספר טלפון");
      return;
    }
    setError(null);
    onSubmit({ ...values, name: values.name.trim(), contacts });
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
        <FormField label="ח.פ. / ע.מ.">
          <TextInput
            value={values.businessId}
            onChange={(e) => set("businessId", e.target.value)}
            inputMode="numeric"
            dir="ltr"
            className="text-right"
          />
        </FormField>
        <FormField label="הערות אספקה קבועות">
          <TextInput value={values.deliveryNotes} onChange={(e) => set("deliveryNotes", e.target.value)} />
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[15px] font-bold text-foreground">מאושר לסבב שני</span>
          <span
            className={cn(
              "text-[12px] font-semibold",
              values.allowedRounds.includes("noon") ? "text-primary" : "text-muted-foreground",
            )}
          >
            {values.allowedRounds.includes("noon") ? "מאושר" : "לא מאושר"}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              if (!values.allowedRounds.includes("noon")) toggleRound("noon");
            }}
            className={cn(
              "rounded-md px-4 py-1.5 text-[13px] font-bold transition-colors",
              values.allowedRounds.includes("noon")
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            כן
          </button>
          <button
            type="button"
            onClick={() => {
              if (values.allowedRounds.includes("noon")) toggleRound("noon");
            }}
            className={cn(
              "rounded-md px-4 py-1.5 text-[13px] font-bold transition-colors",
              !values.allowedRounds.includes("noon")
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            לא
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-foreground">אנשי קשר</span>
          <button
            type="button"
            onClick={addContact}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-[11.5px] font-bold text-primary"
          >
            <Plus className="size-3.5" />
            הוספת איש קשר
          </button>
        </div>

        {values.contacts.map((contact, index) => (
          <div key={contact.id ?? index} className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground">
                {contact.isPrimary ? "איש קשר ראשי" : `איש קשר נוסף`}
              </span>
              {values.contacts.length > 1 ? (
                <button
                  type="button"
                  aria-label="הסרת איש קשר"
                  onClick={() => removeContact(index)}
                  className="text-muted-foreground"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
            <div className="grid gap-2.5 md:grid-cols-3">
              <FormField label="שם">
                <TextInput value={contact.name} onChange={(e) => setContact(index, { name: e.target.value })} />
              </FormField>
              <FormField label="טלפון">
                <TextInput
                  value={contact.phone}
                  onChange={(e) => setContact(index, { phone: e.target.value })}
                  inputMode="tel"
                  dir="ltr"
                  className="text-right"
                />
              </FormField>
              <FormField label="דוא״ל">
                <TextInput
                  value={contact.email}
                  onChange={(e) => setContact(index, { email: e.target.value })}
                  inputMode="email"
                  dir="ltr"
                  className="text-right"
                />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
              <input
                type="checkbox"
                checked={contact.requestAccess}
                onChange={(e) => setContact(index, { requestAccess: e.target.checked })}
                className="size-4"
              />
              יש לו גישה לאפליקציה
            </label>
          </div>
        ))}
      </div>

      {extra}

      {error ? <div className="text-[12px] font-semibold text-destructive">{error}</div> : null}

      <div className="flex gap-2.5">
        <Button className="flex-1 md:flex-initial md:w-auto" onClick={submit}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" className="flex-1 md:flex-initial md:w-auto font-semibold" onClick={onCancel}>
            ביטול
          </Button>
        ) : null}
      </div>
    </div>
  );
}
