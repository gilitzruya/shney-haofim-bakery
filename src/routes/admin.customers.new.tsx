import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { CustomerInviteModal } from "@/components/admin/customer-invite-modal";
import { SpecialPricesPanel } from "@/components/admin/special-prices-panel";
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
  const [invite, setInvite] = useState<{ customerId: string; name: string; phone: string } | null>(null);
  const [appUrl, setAppUrl] = useState("");
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  const setDraftOverride = (productId: string, price: number | null) =>
    setPriceOverrides((prev) => {
      const next = { ...prev };
      if (price === null) delete next[productId];
      else next[productId] = price;
      return next;
    });

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
              ...(Object.keys(priceOverrides).length ? { priceOverrides } : {}),
            });
            setAppUrl(typeof window === "undefined" ? "" : window.location.origin);
            setInvite({ customerId: created.id, name: created.name, phone: v.phone.trim() });
          }}
          extra={
            <div className="flex flex-col gap-2">
              <div className="text-[12.5px] font-semibold text-muted-foreground">
                אפשר להגדיר כבר עכשיו מחירים מיוחדים ללקוח — הם יישמרו יחד עם פרטי הלקוח.
              </div>
              <SpecialPricesPanel draftOverrides={priceOverrides} onDraftChange={setDraftOverride} />
            </div>
          }
        />
      </Section>

      <CustomerInviteModal
        open={invite !== null}
        customerName={invite?.name ?? ""}
        phone={invite?.phone ?? ""}
        appUrl={appUrl}
        onClose={() => {
          const id = invite?.customerId;
          setInvite(null);
          if (id) void navigate({ to: "/admin/customers/$customerId", params: { customerId: id } });
        }}
      />
    </AdminShell>
  );
}
