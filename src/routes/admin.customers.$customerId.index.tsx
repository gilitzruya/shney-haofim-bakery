import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { CustomerInviteModal } from "@/components/admin/customer-invite-modal";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { Modal } from "@/components/app/modal";
import { SpecialPricesPanel } from "@/components/admin/special-prices-panel";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { roundLabel, WEEKDAY_LABELS } from "@/data/catalog";
import {
  useAddContact,
  useCustomer,
  useGrantContactAccess,
  useRemoveContact,
  useRevokeContactAccess,
  useSetCustomerBlocked,
  useUpdateContact,
  useUpdateCustomer,
} from "@/hooks/use-customers";
import { toE164 } from "@/lib/phone";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/customers/$customerId/")({
  head: () => ({
    meta: [
      { title: "כרטיס לקוח — ניהול המאפייה" },
      { name: "description", content: "פרטי הלקוח, אנשי הקשר, הרשאות הסבבים וסטטוס החסימה." },
      { property: "og:title", content: "כרטיס לקוח — ניהול המאפייה" },
      { property: "og:description", content: "פרטי הלקוח, אנשי הקשר והרשאות הסבבים במאפיית שני האופים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerDetailPage,
});

/** שורת מידע קומפקטית בכרטיס הלקוח. */
function InfoRow({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-muted-foreground">{label}: </span>
        <span className="text-[12.5px] font-semibold text-foreground" dir={ltr ? "ltr" : undefined}>
          {value}
        </span>
      </div>
    </div>
  );
}

function CustomerDetailPage() {
  const { customerId } = useParams({ from: "/admin/customers/$customerId/" });
  const { customer, isLoading } = useCustomer(customerId);
  const hydrated = !isLoading;
  const updateCustomer = useUpdateCustomer();
  const setBlocked = useSetCustomerBlocked();
  const addContact = useAddContact();
  const updateContact = useUpdateContact();
  const removeContact = useRemoveContact();
  const grantAccess = useGrantContactAccess();
  const revokeAccess = useRevokeContactAccess();
  const { adminRecurring, removeAdminRecurring } = useStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [inviteQueue, setInviteQueue] = useState<{ name: string; phone: string }[]>([]);
  const [inviteFor, setInviteFor] = useState<{ name: string; phone: string } | null>(null);
  const [appUrl] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  if (!customer) {
    return (
      <AdminShell>
        <Section className="pt-6 pb-10">
          {hydrated ? (
            <EmptyState
              title="הלקוח לא נמצא"
              description="ייתכן שהלקוח נמחק. אפשר לחזור לרשימת הלקוחות."
              action={
                <Link to="/admin/customers" className="text-[12.5px] font-semibold text-primary no-underline">
                  חזרה לרשימת הלקוחות
                </Link>
              }
            />
          ) : null}
        </Section>
      </AdminShell>
    );
  }

  const contact = customer.contacts[0];
  const recurring = adminRecurring.filter((r) => r.customerId === customer.id);

  const saveForm = async (v: ReturnType<typeof toFormValues>) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        input: {
          code: v.code.trim() || undefined,
          name: v.name,
          address: v.address || undefined,
          businessId: v.businessId || undefined,
          deliveryNotes: v.deliveryNotes || undefined,
          allowedRounds: v.allowedRounds,
        },
      });

      const originalById = new Map(customer.contacts.map((c) => [c.id, c]));
      const keptIds = new Set(v.contacts.map((c) => c.id).filter((id): id is string => !!id));
      const toInvite: { name: string; phone: string }[] = [];

      for (const original of customer.contacts) {
        if (!keptIds.has(original.id)) {
          if (original.hasAccess && original.phone) await revokeAccess.mutateAsync({ customerId: customer.id, phone: original.phone });
          await removeContact.mutateAsync({ customerId: customer.id, contactId: original.id });
        }
      }

      for (const c of v.contacts) {
        const input = { name: c.name, phone: c.phone, email: c.email, isPrimary: c.isPrimary };
        if (c.id) {
          await updateContact.mutateAsync({ customerId: customer.id, contactId: c.id, input });
          const original = originalById.get(c.id);
          if (c.requestAccess && !original?.hasAccess && c.phone.trim()) {
            await grantAccess.mutateAsync({ customerId: customer.id, phone: c.phone });
            toInvite.push({ name: c.name || customer.name, phone: toE164(c.phone) });
          } else if (!c.requestAccess && original?.hasAccess && original.phone) {
            await revokeAccess.mutateAsync({ customerId: customer.id, phone: original.phone });
          }
        } else {
          await addContact.mutateAsync({ customerId: customer.id, input });
          if (c.requestAccess && c.phone.trim()) {
            await grantAccess.mutateAsync({ customerId: customer.id, phone: c.phone });
            toInvite.push({ name: c.name || customer.name, phone: toE164(c.phone) });
          }
        }
      }

      setEditing(false);
      toast.success("פרטי הלקוח נשמרו");
      if (toInvite.length > 0) setInviteQueue(toInvite);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת הלקוח נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <Section className="pt-4 pb-12">
        <Link
          to="/admin/customers"
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground no-underline"
        >
          <ChevronRight className="size-4" />
          חזרה לרשימת הלקוחות
        </Link>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card-muted text-[15px] font-bold text-heading">
            {customer.name.trim().charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-bold text-heading">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
              {customer.code ? <span dir="ltr">קוד לקוח {customer.code}</span> : null}
              {customer.blocked ? <Chip tone="error">חסום</Chip> : null}
            </div>
          </div>
        </div>

        {editing ? (
          <CustomerForm
            initial={toFormValues(customer)}
            submitLabel="שמירת השינויים"
            onCancel={() => setEditing(false)}
            onSubmit={(v) => void saveForm(v)}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-heading">פרטי הלקוח</h2>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground"
                >
                  <Pencil className="size-3.5" />
                  עריכה
                </button>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card">
                <InfoRow icon={<User className="size-3.5" />} label="איש קשר" value={contact?.name || "לא הוזן"} />
                <InfoRow icon={<Phone className="size-3.5" />} label="טלפון" value={contact?.phone || "לא הוזן"} ltr />
                <InfoRow icon={<Mail className="size-3.5" />} label="דוא״ל" value={contact?.email || "לא הוזן"} ltr />
                <InfoRow icon={<MapPin className="size-3.5" />} label="כתובת לאספקה" value={customer.address || "לא הוזנה"} />
                {customer.allowedRounds.includes("noon") ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                    </span>
                    <span className="text-[12.5px] font-semibold text-foreground">מאושר לסבב שני</span>
                  </div>
                ) : null}
              </div>
            </section>

            {customer.contacts.length > 1 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-[13px] font-bold text-heading">אנשי קשר נוספים</h2>
                <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card">
                  {customer.contacts.slice(1).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-foreground">{c.name || "ללא שם"}</div>
                        <div className="text-[11.5px] text-muted-foreground" dir="ltr">
                          {c.phone}
                        </div>
                      </div>
                      {c.hasAccess ? <Chip tone="neutral">יש גישה</Chip> : <Chip tone="muted">בלי גישה</Chip>}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-heading">פעולות בשם הלקוח</h2>
              <p className="-mt-1 text-[11.5px] text-muted-foreground">
                פעולות שאתם מבצעים עבור {customer.name} ממערכת הניהול.
              </p>

              {customer.blocked ? (
                <div className="rounded-[14px] border border-border bg-card-muted px-4 py-3 text-[12.5px] text-muted-foreground">
                  הלקוח חסום — לא ניתן ליצור עבורו הזמנות חדשות.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                {!customer.blocked ? (
                  <>
                    <Link
                      to="/admin/customers/$customerId/new-order"
                      params={{ customerId: customer.id }}
                      search={{ type: "onetime" as const }}
                      className="flex flex-row-reverse items-center justify-between rounded-[14px] border border-border bg-card p-3 no-underline"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Plus className="size-3.5" />
                      </span>
                      <span className="text-start">
                        <span className="block text-[13px] font-bold text-heading">הזמנה חד-פעמית</span>
                        <span className="block text-[11px] text-muted-foreground">יצירה עבור הלקוח</span>
                      </span>
                    </Link>

                    <Link
                      to="/admin/customers/$customerId/new-order"
                      params={{ customerId: customer.id }}
                      search={{ type: "recurring" as const }}
                      className="flex flex-row-reverse items-center justify-between rounded-[14px] border border-border bg-card p-3 no-underline"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <CalendarClock className="size-3.5" />
                      </span>
                      <span className="text-start">
                        <span className="block text-[13px] font-bold text-heading">הזמנה קבועה</span>
                        <span className="block text-[11px] text-muted-foreground">ימים קבועים בשבוע</span>
                      </span>
                    </Link>
                  </>
                ) : null}

                <Link
                  to="/admin/customers/$customerId/orders"
                  params={{ customerId: customer.id }}
                  className="flex flex-row-reverse items-center justify-between rounded-[14px] border border-border bg-card p-3 no-underline"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-muted text-muted-foreground">
                    <ClipboardList className="size-3.5" />
                  </span>
                  <span className="text-start">
                    <span className="block text-[13px] font-bold text-heading">עריכת הזמנה קיימת</span>
                    <span className="block text-[11px] text-muted-foreground">כל ההזמנות של הלקוח</span>
                  </span>
                </Link>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-heading">מחירים מיוחדים</h2>
              <SpecialPricesPanel customerId={customer.id} />
            </section>

            {recurring.length ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-[13px] font-bold text-heading">הזמנות קבועות</h2>
                <div className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
                  {recurring.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold text-foreground">{r.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {r.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ") || "ללא ימים"} · {roundLabel(r.round)} ·{" "}
                          {r.lines.length} פריטים
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="מחיקת הזמנה קבועה"
                        onClick={() => removeAdminRecurring(r.id)}
                        className="text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-heading">ניהול הלקוח</h2>
              <div className="rounded-[14px] border border-border bg-card px-4 py-3.5">
                <div className="text-[12.5px] text-muted-foreground">
                  {customer.blocked
                    ? "הלקוח חסום כרגע ולא יכול לבצע הזמנות."
                    : "חסימה תמנע מהלקוח לבצע הזמנות חדשות. אפשר לשחרר בכל רגע."}
                </div>
                <Button
                  variant="secondary"
                  className="mt-3 w-full md:w-auto font-semibold"
                  onClick={() =>
                    customer.blocked
                      ? setBlocked.mutate({ id: customer.id, blocked: false })
                      : setConfirmBlock(true)
                  }
                >
                  {customer.blocked ? "שחרור חסימת הלקוח" : "חסימת הלקוח"}
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-heading">פרטי התחברות</h2>
              <div className="rounded-[14px] border border-border bg-card px-4 py-3.5">
                <div className="text-[12.5px] text-muted-foreground">
                  שליחת הודעת וואטסאפ לאיש קשר עם קישור לאפליקציה ומספר הטלפון להתחברות.
                </div>
                <button
                  type="button"
                  disabled={!contact?.phone}
                  onClick={() => contact?.phone && setInviteFor({ name: contact.name || customer.name, phone: toE164(contact.phone) })}
                  className="mt-3 inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-[12px] bg-[#25D366] px-3 py-3 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe57] disabled:opacity-50"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <WhatsAppIcon className="size-5" />
                  </span>
                  שליחת פרטי התחברות בוואטסאפ
                </button>
              </div>
            </section>
          </div>
        )}
      </Section>

      <Modal
        open={confirmBlock}
        title="חסימת לקוח"
        description={`לאחר החסימה ${customer.name} לא יוכל לבצע הזמנות חדשות. אפשר לשחרר את החסימה בכל רגע.`}
        confirmLabel="חסימה"
        destructive
        onConfirm={() => {
          setBlocked.mutate({ id: customer.id, blocked: true });
          setConfirmBlock(false);
        }}
        onClose={() => setConfirmBlock(false)}
      />

      <CustomerInviteModal
        open={inviteFor !== null}
        customerName={inviteFor?.name ?? ""}
        phone={inviteFor?.phone ?? ""}
        appUrl={appUrl}
        onClose={() => setInviteFor(null)}
      />

      <CustomerInviteModal
        open={inviteQueue.length > 0}
        customerName={inviteQueue[0]?.name ?? ""}
        phone={inviteQueue[0]?.phone ?? ""}
        appUrl={appUrl}
        onClose={() => setInviteQueue((q) => q.slice(1))}
      />
    </AdminShell>
  );
}
