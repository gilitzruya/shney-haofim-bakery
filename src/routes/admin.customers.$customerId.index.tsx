import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  CalendarClock,
  Tag,
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

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { Modal } from "@/components/app/modal";
import { SpecialPricesPanel } from "@/components/admin/special-prices-panel";
import { roundLabel, WEEKDAY_LABELS } from "@/data/catalog";
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
  const { customers, hydrated, updateCustomer, setCustomerBlocked, adminRecurring, removeAdminRecurring } = useStore();
  const customer = customers.find((c) => c.id === customerId);
  const [editing, setEditing] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

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

        {/* כותרת נקייה */}
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
            onSubmit={(v) => {
              updateCustomer(customer.id, {
                code: v.code.trim() || undefined,
                name: v.name,
                address: v.address,
                contacts: [{ name: v.contactName, phone: v.phone, email: v.email }],
                allowedRounds: v.allowedRounds,
              });
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-5">
            {/* פרטי קשר */}
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
              <div className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
                <InfoRow icon={<User className="size-4" />} label="איש קשר" value={contact?.name || "לא הוזן"} />
                <InfoRow icon={<Phone className="size-4" />} label="טלפון" value={contact?.phone || "לא הוזן"} ltr />
                <InfoRow icon={<Mail className="size-4" />} label="דוא״ל" value={contact?.email || "לא הוזן"} ltr />
                <InfoRow icon={<MapPin className="size-4" />} label="כתובת לאספקה" value={customer.address || "לא הוזנה"} />
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 text-muted-foreground">
                    <CalendarClock className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] text-muted-foreground">הרשאות סבבים</div>
                    <div className="text-[13.5px] font-semibold text-foreground">
                      {customer.allowedRounds.length
                        ? customer.allowedRounds.map((r) => roundLabel(r)).join(" · ")
                        : "ללא הרשאות"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* פעולות שבעל המאפייה מבצע עבור הלקוח */}
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

                <button
                  type="button"
                  onClick={() => setShowPrices((s) => !s)}
                  className={`flex flex-row-reverse items-center justify-between rounded-[14px] border p-3 text-start ${
                    showPrices ? "border-primary bg-primary-soft" : "border-border bg-card"
                  }`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    showPrices ? "bg-primary text-primary-foreground" : "bg-card-muted text-muted-foreground"
                  }`}>
                    <Tag className="size-3.5" />
                  </span>
                  <span className="text-start">
                    <span className="block text-[13px] font-bold text-heading">מחירים מיוחדים</span>
                    <span className="block text-[11px] text-muted-foreground">מחירון ייעודי ללקוח</span>
                  </span>
                </button>
              </div>

              {showPrices ? (
                <div className="rounded-[16px] border border-border bg-card p-3">
                  <SpecialPricesPanel customer={customer} />
                </div>
              ) : null}
            </section>


            {/* הזמנות קבועות קיימות */}
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

            {/* ניהול הלקוח */}
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
                  className="mt-3 w-full font-semibold"
                  onClick={() => (customer.blocked ? setCustomerBlocked(customer.id, false) : setConfirmBlock(true))}
                >
                  {customer.blocked ? "שחרור חסימת הלקוח" : "חסימת הלקוח"}
                </Button>
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
          setCustomerBlocked(customer.id, true);
          setConfirmBlock(false);
        }}
        onClose={() => setConfirmBlock(false)}
      />
    </AdminShell>
  );
}
