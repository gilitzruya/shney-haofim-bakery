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

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { CustomerInviteModal } from "@/components/admin/customer-invite-modal";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { Modal } from "@/components/app/modal";
import { SpecialPricesPanel } from "@/components/admin/special-prices-panel";
import { roundLabel, WEEKDAY_LABELS } from "@/data/catalog";
import { useStore } from "@/store/app-store";

/** Official WhatsApp logo icon (green speech-bubble with phone). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 5.763h-.004c-1.138 0-2.255-.305-3.227-.883l-.232-.138-2.41.633.642-2.351-.151-.24C5.53 15.631 5 14.333 5 12.986c0-3.36 2.734-6.094 6.103-6.094 1.63 0 3.16.636 4.311 1.79 1.15 1.154 1.784 2.684 1.782 4.314 0 3.36-2.734 6.094-6.094 6.094" />
      <path d="M12.103 6.892c-3.36 0-6.094 2.734-6.094 6.094 0 1.19.344 2.345.992 3.335l.127.202-.538 1.972 2.026-.532.196.116c.92.545 1.98.833 3.067.833h.004c3.36 0 6.094-2.734 6.094-6.094s-2.734-6.094-6.094-6.094m3.747 8.684c-.165.462-.995.884-1.381.944-.37.057-.74.057-1.076-.03-.332-.084-.676-.264-.991-.465-.697-.46-1.225-1.12-1.566-1.909-.201-.467-.344-.965-.367-1.478-.006-.145.06-.284.166-.374.118-.101.284-.124.429-.061.157.069.309.16.45.265.167.126.321.268.475.41.146.134.292.275.416.43.164.211.206.492.105.738-.073.18-.234.317-.359.459.168.143.353.272.549.378.438.239.91.373 1.395.407.202.014.38-.066.505-.232.098-.13.194-.263.278-.402.085-.14.185-.271.32-.358.15-.098.345-.11.507-.035.183.085.357.2.515.332.16.134.308.281.453.432.16.166.25.386.232.609-.018.243-.165.46-.39.588z" />
    </svg>
  );
}

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
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
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

              </div>
            </section>

            {/* מחירון מיוחד ללקוח */}
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-heading">מחירים מיוחדים</h2>
              <SpecialPricesPanel customer={customer} />
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

            {/* שליחת פרטי התחברות בוואטסאפ */}
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-heading">פרטי התחברות</h2>
              <div className="rounded-[14px] border border-border bg-card px-4 py-3.5">
                <div className="text-[12.5px] text-muted-foreground">
                  שליחת הודעת וואטסאפ ללקוח עם שם משתמש, סיסמה זמנית וקישור לאפליקציה.
                </div>
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#25D366] px-3 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1ebe57]"
                >
                  <WhatsAppIcon className="size-4" />
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
          setCustomerBlocked(customer.id, true);
          setConfirmBlock(false);
        }}
        onClose={() => setConfirmBlock(false)}
      />

      <CustomerInviteModal
        open={inviteOpen}
        customerName={customer.name}
        phone={customer.contacts[0]?.phone ?? ""}
        appUrl={appUrl}
        onClose={() => setInviteOpen(false)}
      />
    </AdminShell>
  );
}
