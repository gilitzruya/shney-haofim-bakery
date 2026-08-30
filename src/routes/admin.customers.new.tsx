import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerForm, toFormValues } from "@/components/admin/customer-form";
import { CustomerInviteModal } from "@/components/admin/customer-invite-modal";
import { SpecialPricesPanel } from "@/components/admin/special-prices-panel";
import { Section } from "@/components/app/app-shell";
import { useAddContact, useCreateCustomer, useGrantContactAccess, useSetCustomerPrice } from "@/hooks/use-customers";
import { toE164 } from "@/lib/phone";

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
  const createCustomer = useCreateCustomer();
  const addContact = useAddContact();
  const grantAccess = useGrantContactAccess();
  const setPrice = useSetCustomerPrice();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [inviteQueue, setInviteQueue] = useState<{ name: string; phone: string }[]>([]);
  const [appUrl] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const setDraftOverride = (productId: string, price: number | null) =>
    setPriceOverrides((prev) => {
      const next = { ...prev };
      if (price === null) delete next[productId];
      else next[productId] = price;
      return next;
    });

  const finishInvites = (id: string) => {
    setCustomerId(null);
    setInviteQueue([]);
    void navigate({ to: "/admin/customers/$customerId", params: { customerId: id } });
  };

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
          onSubmit={async (v) => {
            if (saving) return;
            setSaving(true);
            try {
              const id = await createCustomer.mutateAsync({
                code: v.code.trim() || undefined,
                name: v.name,
                address: v.address || undefined,
                businessId: v.businessId || undefined,
                deliveryNotes: v.deliveryNotes || undefined,
                allowedRounds: v.allowedRounds,
              });

              for (const [productId, price] of Object.entries(priceOverrides)) {
                await setPrice.mutateAsync({ customerId: id, productId, price });
              }

              const toInvite: { name: string; phone: string }[] = [];
              for (const contact of v.contacts) {
                await addContact.mutateAsync({
                  customerId: id,
                  input: {
                    name: contact.name,
                    phone: contact.phone,
                    email: contact.email,
                    isPrimary: contact.isPrimary,
                  },
                });
                if (contact.requestAccess && contact.phone.trim()) {
                  await grantAccess.mutateAsync({ customerId: id, phone: contact.phone });
                  toInvite.push({ name: contact.name || v.name, phone: toE164(contact.phone) });
                }
              }

              setCustomerId(id);
              if (toInvite.length > 0) setInviteQueue(toInvite);
              else finishInvites(id);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "שמירת הלקוח נכשלה");
            } finally {
              setSaving(false);
            }
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
        open={inviteQueue.length > 0}
        customerName={inviteQueue[0]?.name ?? ""}
        phone={inviteQueue[0]?.phone ?? ""}
        appUrl={appUrl}
        onClose={() => {
          const rest = inviteQueue.slice(1);
          if (rest.length > 0) {
            setInviteQueue(rest);
            return;
          }
          if (customerId) finishInvites(customerId);
        }}
      />
    </AdminShell>
  );
}
