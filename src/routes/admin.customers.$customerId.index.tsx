import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { Modal } from "@/components/app/modal";
import { Tabs } from "@/components/app/tabs";
import { SpecialPricesPanel } from "@/components/admin/special-prices-panel";
import { roundLabel } from "@/data/catalog";
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

type TabId = "details" | "prices";

function CustomerDetailPage() {
  const { customerId } = useParams({ from: "/admin/customers/$customerId/" });
  const { customers, hydrated, updateCustomer, setCustomerBlocked } = useStore();
  const customer = customers.find((c) => c.id === customerId);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabId>("details");
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

  return (
    <AdminShell>
      <Section className="pt-5 pb-10">
        <Link
          to="/admin/customers"
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary no-underline"
        >
          <ChevronRight className="size-4" />
          חזרה לרשימת הלקוחות
        </Link>

        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-bold text-heading">{customer.name}</h1>
            {customer.blocked ? <Chip tone="error">חסום</Chip> : null}
          </div>
          {customer.code ? (
            <div className="text-[12px] font-semibold text-muted-foreground" dir="ltr">
              קוד לקוח: <span className="text-foreground">{customer.code}</span>
            </div>
          ) : null}
        </div>

        <div className="mb-3">
          <Tabs<TabId>
            tabs={[
              { id: "details", label: "פרטי לקוח" },
              { id: "prices", label: "מחירים מיוחדים" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "prices" ? (
          <SpecialPricesPanel customer={customer} />
        ) : editing ? (
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
          <div className="flex flex-col gap-3">
            <Card className="flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-muted-foreground">פרטי קשר</div>
              {contact ? (
                <>
                  <div className="text-[13.5px] font-semibold text-foreground">{contact.name}</div>
                  <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span dir="ltr">{contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    <Mail className="size-4 shrink-0 text-primary" />
                    <span dir="ltr">{contact.email}</span>
                  </div>
                </>
              ) : (
                <div className="text-[12.5px] text-muted-foreground">לא הוזן איש קשר</div>
              )}
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span>{customer.address || "לא הוזנה כתובת"}</span>
              </div>
            </Card>

            <Card className="flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-muted-foreground">הרשאות סבבים</div>
              <div className="flex flex-wrap gap-1.5">
                {customer.allowedRounds.length ? (
                  customer.allowedRounds.map((r) => <Chip key={r}>{roundLabel(r)}</Chip>)
                ) : (
                  <span className="text-[12.5px] text-muted-foreground">ללא הרשאות סבב</span>
                )}
              </div>
            </Card>

            <div className="flex gap-2.5">
              <Button className="flex-1" onClick={() => setEditing(true)}>
                עריכת פרטים
              </Button>
              <Button
                variant={customer.blocked ? "secondary" : "destructive"}
                className="flex-1 font-semibold"
                onClick={() => (customer.blocked ? setCustomerBlocked(customer.id, false) : setConfirmBlock(true))}
              >
                {customer.blocked ? "שחרור חסימה" : "חסימת לקוח"}
              </Button>
            </div>

            <Link
              to="/admin/customers/$customerId/orders"
              params={{ customerId: customer.id }}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-bold text-heading no-underline"
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                ההזמנות של הלקוח
              </span>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </Link>


            {customer.blocked ? (
              <div className="rounded-[14px] border border-border bg-destructive-bg px-3.5 py-3 text-[12.5px] text-destructive">
                הלקוח חסום — לא ניתן ליצור עבורו הזמנה חדשה.
              </div>
            ) : (
              <Link
                to="/admin/customers/$customerId/new-order"
                params={{ customerId: customer.id }}
                className="flex items-center justify-center rounded-xl border border-primary bg-transparent px-4 py-2.5 text-[13px] font-bold text-primary no-underline"
              >
                יצירת הזמנה בשם הלקוח
              </Link>
            )}
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
