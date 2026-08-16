import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { Section } from "@/components/app/app-shell";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/customers/new")({
  head: () => ({
    meta: [
      { title: "לקוח חדש — ניהול המאפייה" },
      { name: "description", content: "הוספת לקוח חדש למאפייה: פרטי קשר, כתובת אספקה והרשאות סבבים." },
      { property: "og:title", content: "לקוח חדש — ניהול המאפייה" },
      { property: "og:description", content: "הוספת לקוח חדש למאפייה והגדרת הרשאות הסבבים שלו." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewCustomerPage,
});

function NewCustomerPage() {
  const { addCustomer } = useStore();
  const navigate = useNavigate();

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
        <h1 className="mb-4 text-[19px] font-bold text-heading">לקוח חדש</h1>

        <CustomerForm
          initial={toFormValues()}
          submitLabel="שמירת הלקוח"
          onCancel={() => void navigate({ to: "/admin/customers" })}
          onSubmit={(v) => {
            const created = addCustomer({
              code: v.code.trim() || undefined,
              name: v.name,
              address: v.address,
              contacts: [{ name: v.contactName, phone: v.phone, email: v.email }],
              allowedRounds: v.allowedRounds,
            });
            void navigate({ to: "/admin/customers/$customerId", params: { customerId: created.id } });
          }}
        />
      </Section>
    </AdminShell>
  );
}
